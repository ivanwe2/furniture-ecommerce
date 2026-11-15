'use server'
import 'server-only'

import { headers } from 'next/headers'
import { contactSchema } from '@/lib/validation/contact'
import { verifyAltcha } from '@/lib/altcha'
import { rateLimit } from '@/lib/rate-limit'
import { clientIp } from '@/lib/request-ip'
import { sendContactEmail } from '@/emails/send'
import { logger } from '@/lib/log'
import { t } from '@/lib/i18n/bg'
import { contextFromHeaders } from '@/lib/telemetry/request'
import { track } from '@/lib/telemetry/server'

const log = logger('contact')

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }

export async function submitContact(input: unknown): Promise<ActionResult<unknown>> {
  const record = input as Record<string, unknown>

  // Server-derived IP — never trust client-supplied values.
  // IP comes from the reverse proxy's X-Forwarded-For (self-hosted; §7).
  const hdrs = await headers()
  const ip = clientIp(hdrs)

  // Step 1: Honeypot — fake success if filled
  if (record['website'] != null && String(record['website']).trim() !== '') {
    log.info('honeypot triggered — fake success returned')
    return { ok: true, data: undefined }
  }

  // Step 2: Zod parse → fieldErrors mapped to bg.ts keys
  const parsed = contactSchema.safeParse(input)
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const err of parsed.error.issues) {
      for (const path of err.path) {
        fieldErrors[String(path)] = err.message
      }
    }
    log.info('contact rejected', { reason: 'validation', fields: Object.keys(fieldErrors) })
    return { ok: false, error: 'errors.generic', fieldErrors }
  }

  const data = parsed.data

  // Step 3: Altcha proof-of-work verify → errors.captcha
  const altchaOk = await verifyAltcha(data.altcha)
  if (!altchaOk) {
    log.info('contact rejected', { reason: 'captcha' })
    return { ok: false, error: 'errors.captcha' }
  }

  // Step 4: Rate limit → errors.rateLimited (contact: max 3 per ARCHITECTURE §7)
  const rl = await rateLimit(`rl:contact:${ip}`, { windowSec: 600, max: 3 })
  if (!rl.allowed) {
    log.info('contact rejected', { reason: 'rate_limited' })
    return { ok: false, error: 'errors.rateLimited' }
  }

  // Step 5: Send owner email — NEVER rethrow
  // Came from a product page's inquiry-button prefill (contact.aboutSku).
  const about = data.message.startsWith(t('contact.aboutSku'))
  track('contact_sent', { about }, { source: 'server', ctx: contextFromHeaders(hdrs) })
  try {
    await sendContactEmail(data, ip)
    log.info('contact message sent', { about })
  }
  catch (err) {
    log.error('contact email failed', { err })
  }

  return { ok: true, data: undefined }
}
