'use server'
import 'server-only'

import { headers } from 'next/headers'
import { checkoutSchema } from '@/lib/validation/checkout'
import { parseCartField } from '@/lib/validation/cart'
import { verifyAltcha } from '@/lib/altcha'
import { rateLimit } from '@/lib/rate-limit'
import { clientIp } from '@/lib/request-ip'
import { resolveCartLines } from '@/lib/payload/queries'
import { computeTotals } from '@/lib/cart/totals'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { Order } from '@/payload-types'
import { sendOrderEmails } from '@/emails/send'
import { logger } from '@/lib/log'
import { contextFromHeaders } from '@/lib/telemetry/request'
import { track } from '@/lib/telemetry/server'

const log = logger('order')

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }

async function p() {
  return getPayload({ config })
}

function mapMethod(method: 'address' | 'econt' | 'speedy'): Order['delivery']['method'] {
  if (method === 'address') return 'адрес'
  if (method === 'econt') return 'офис на Еконт'
  return 'офис на Спиди'
}

export async function submitOrder(input: unknown): Promise<ActionResult<{ orderNumber: string }>> {
  const record = input as Record<string, unknown>

  // Server-derived request metadata — never trust client-supplied IP/UA.
  // IP comes from the reverse proxy's X-Forwarded-For (self-hosted; §7).
  const hdrs = await headers()
  const ip = clientIp(hdrs)
  const userAgent = hdrs.get('user-agent') ?? ''
  // Telemetry/logs get no personal data: reasons, counts and the order number only.
  const ctx = contextFromHeaders(hdrs)
  const rejected = (reason: 'validation' | 'captcha' | 'rate_limited' | 'cart_stale', fields?: string[]) => {
    log.info('order rejected', { reason, ...(fields ? { fields } : {}) })
    track('order_rejected', { reason, ...(fields ? { fields } : {}) }, { source: 'server', ctx })
  }

  // Step 1: Honeypot — fake success if filled
  if (record['website'] != null && String(record['website']).trim() !== '') {
    log.info('honeypot triggered — fake success returned')
    return { ok: true, data: { orderNumber: 'NAS-FAKE' } }
  }

  // Step 2: Zod parse → fieldErrors mapped to bg.ts keys
  const parsed = checkoutSchema.safeParse(input)
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const err of parsed.error.issues) {
      for (const path of err.path) {
        fieldErrors[String(path)] = err.message
      }
    }
    rejected('validation', Object.keys(fieldErrors))
    return { ok: false, error: 'errors.generic', fieldErrors }
  }

  const data = parsed.data

  // Step 3: Altcha proof-of-work verify → errors.captcha
  const altchaOk = await verifyAltcha(data.altcha)
  if (!altchaOk) {
    rejected('captcha')
    return { ok: false, error: 'errors.captcha' }
  }

  // Step 4: Rate limit → errors.rateLimited
  const rl = await rateLimit(`rl:order:${ip}`, { windowSec: 600, max: 5 })
  if (!rl.allowed) {
    rejected('rate_limited')
    return { ok: false, error: 'errors.rateLimited' }
  }

  // Step 5: Resolve items from DB by (productId, sku); reject unknown/unpublished/out-of-stock.
  // The cart rides along as a JSON string from localStorage, so it is parsed
  // under the same schema discipline as the form fields — shape AND bounds,
  // since each line costs a DB lookup below.
  const cartLines = parseCartField(record['cart'])
  if (!cartLines) {
    rejected('cart_stale')
    return { ok: false, error: 'errors.cartStale' }
  }

  const resolution = await resolveCartLines(cartLines)
  const totalsResult = computeTotals({ lines: cartLines, resolution })

  if (totalsResult.stale.length > 0 || totalsResult.ok.length === 0) {
    rejected('cart_stale')
    return { ok: false, error: 'errors.cartStale' }
  }

  // Step 6: Compute totals via lib/cart/totals.ts from DB prices
  const subtotalEurCents = totalsResult.subtotalEurCents

  // Step 7: payload.create with overrideAccess
  const payloadInstance = await p()
  const orderData: Omit<Order, 'id' | 'updatedAt' | 'createdAt' | 'collection'> = {
    customer: {
      name: data.name,
      phone: data.phone,
      email: data.email,
      note: data.note ?? null,
    },
    delivery: {
      method: mapMethod(data.method),
      addressOrOffice: data.addressOrOffice,
      city: data.city,
    },
    lines: totalsResult.ok.map((line) => ({
      productId: line.productSlug,
      itemSku: line.sku,
      itemName: line.name,
      unit: line.unit,
      qty: line.qty,
      unitPriceEurCents: line.priceEurCents,
      lineTotalEurCents: line.priceEurCents * line.qty,
    })),
    totalEurCents: subtotalEurCents,
    meta: {
      ip,
      userAgent,
    },
  }

  const order = await payloadInstance.create({
    collection: 'orders',
    overrideAccess: true,
    data: orderData,
  })

  const orderNumber = (order.orderNumber ?? '') as string
  log.info('order placed', { orderNumber, lines: totalsResult.ok.length, cents: subtotalEurCents })
  track(
    'order_placed',
    { lines: totalsResult.ok.length, cents: subtotalEurCents, method: data.method },
    { source: 'server', ctx },
  )

  // Step 8: Send emails — NEVER rethrow
  try {
    await sendOrderEmails(order, data.email)
  }
  catch (err) {
    log.error('order email failed', { orderNumber, err })
  }

  // Step 9: Return success
  return { ok: true, data: { orderNumber } }
}
