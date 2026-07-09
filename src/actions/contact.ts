'use server'
import 'server-only'

import { contactSchema } from '@/lib/validation/contact'
import { verifyTurnstile } from '@/lib/turnstile'
import { rateLimitWith } from '@/lib/rate-limit'
import { sendContactEmail } from '@/emails/send'

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }

export async function submitContact(input: unknown): Promise<ActionResult<unknown>> {
  const record = input as Record<string, unknown>

  // Step 1: Honeypot — fake success if filled
  if (record['website'] != null && String(record['website']).trim() !== '') {
    console.log('[contact] honeypot triggered')
    return { ok: true, data: undefined }
  }

  // Step 2: Zod parse → fieldErrors mapped to bg.ts keys
  const parsed = contactSchema.safeParse(input)
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
      const result = await rateLimitWith(kv as Parameters<typeof rateLimitWith>[0], `rl:contact:${ip}`, { windowSec: 600, max: 5 })
      if (!result.allowed) {
        return { ok: false, error: 'errors.rateLimited' }
      }
    }
  }
  catch (e) {
    console.error('[ratelimit]', e)
  }

  // Step 5: Send owner email — NEVER rethrow
  try {
    await sendContactEmail(data, ip)
  }
  catch (e) {
    console.error('[email]', 'contact', e)
  }

  return { ok: true, data: undefined }
}
