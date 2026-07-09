'use server'
import 'server-only'

import { checkoutSchema } from '@/lib/validation/checkout'
import { verifyTurnstile } from '@/lib/turnstile'
import { rateLimitWith } from '@/lib/rate-limit'
import { resolveCartLines } from '@/lib/payload/queries'
import { computeTotals } from '@/lib/cart/totals'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { Order } from '@/payload-types'
import { sendOrderEmails } from '@/emails/send'

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

  // Step 1: Honeypot — fake success if filled
  if (record['website'] != null && String(record['website']).trim() !== '') {
    console.log('[order] honeypot triggered')
    return { ok: true, data: { orderNumber: 'NAS-FAKE' } }
  }

  // Step 2: Zod parse → fieldErrors mapped to bg.ts keys
  const parsed = checkoutSchema.safeParse(input)
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const err of parsed.error.errors) {
      for (const path of err.path) {
        fieldErrors[String(path)] = err.message
      }
    }
    return { ok: false, error: '', fieldErrors }
  }

  const data = parsed.data

  // Step 3: Turnstile verify → errors.captcha
  const ip = (record['ip'] as string) ?? ''
  const turnstileOk = await verifyTurnstile(data.turnstileToken, ip)
  if (!turnstileOk) {
    return { ok: false, error: 'errors.captcha' }
  }

  // Step 4: Rate limit → errors.rateLimited
  try {
    const kv = (globalThis as unknown as Record<string, unknown>)['RATE_LIMIT_KV']
    if (kv) {
      const result = await rateLimitWith(kv as Parameters<typeof rateLimitWith>[0], `rl:order:${ip}`, { windowSec: 600, max: 5 })
      if (!result.allowed) {
        return { ok: false, error: 'errors.rateLimited' }
      }
    }
  }
  catch (e) {
    console.error('[ratelimit]', e)
  }

  // Step 5: Resolve items from DB by (productId, sku); reject unknown/unpublished/out-of-stock
  const rawCart = record['cart']
  if (!rawCart || typeof rawCart !== 'string') {
    return { ok: false, error: 'errors.cartStale' }
  }

  let cartLines: Array<{ productSlug: string; sku: string; qty: number }>
  try {
    cartLines = JSON.parse(rawCart)
  }
  catch {
    return { ok: false, error: 'errors.cartStale' }
  }

  if (cartLines.length === 0) {
    return { ok: false, error: 'errors.cartStale' }
  }

  const resolution = await resolveCartLines(cartLines)
  const totalsResult = computeTotals({ lines: cartLines, resolution })

  if (totalsResult.stale.length > 0 || totalsResult.ok.length === 0) {
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
      userAgent: (record['userAgent'] as string) ?? '',
    },
  }

  const order = await payloadInstance.create({
    collection: 'orders',
    overrideAccess: true,
    data: orderData,
  })

  const orderNumber = (order.orderNumber ?? '') as string

  // Step 8: Send emails — NEVER rethrow
  try {
    await sendOrderEmails(order, data.email)
  }
  catch (e) {
    console.error('[email]', orderNumber, e)
  }

  // Step 9: Return success
  return { ok: true, data: { orderNumber } }
}
