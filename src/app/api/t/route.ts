import { logger } from '@/lib/log'
import { rateLimit } from '@/lib/rate-limit'
import { isSameOrigin } from '@/lib/same-origin'
import { beaconSchema, classifyUserAgent, parseBeaconEvents } from '@/lib/telemetry/events'
import { contextFromHeaders } from '@/lib/telemetry/request'
import { track } from '@/lib/telemetry/server'

/**
 * POST /api/t — the storefront's telemetry beacon (lib/telemetry/client.ts,
 * `navigator.sendBeacon`). Same-origin only, ≤ 8 KB, ≤ 20 events, every event
 * validated against the catalogue (lib/telemetry/events.ts), rate-limited per
 * IP. Bots and the owner's own admin session are ignored. Browser errors
 * (`client_error`) become log lines, not usage events. Always answers without
 * a body: the page never waits on it.
 */
export const dynamic = 'force-dynamic'

const log = logger('client')
const MAX_BYTES = 8 * 1024
const empty = (status: number) => new Response(null, { status })

export async function POST(req: Request): Promise<Response> {
  if (!isSameOrigin(req.headers)) return empty(403)
  const declared = Number(req.headers.get('content-length') ?? '0')
  if (declared > MAX_BYTES) return empty(413)
  const text = await req.text()
  if (text.length === 0 || text.length > MAX_BYTES) return empty(text.length === 0 ? 400 : 413)

  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return empty(400)
  }
  const body = beaconSchema.safeParse(json)
  if (!body.success) return empty(400)

  const base = contextFromHeaders(req.headers)
  if (base.staff || classifyUserAgent(base.ua).bot) return empty(204)
  const limit = await rateLimit(`rl:t:${base.ip}`, { windowSec: 60, max: 120 })
  if (!limit.allowed) return empty(429)

  const ctx = { ...base, referer: body.data.r ?? null, visitorId: body.data.v, sessionId: body.data.s }
  for (const event of parseBeaconEvents(body.data.e)) {
    if (event.name === 'client_error') {
      log.warn('browser error', { ...event.props, path: event.path })
      continue
    }
    track(event.name, event.props, { source: 'web', ctx, path: event.path })
  }
  return empty(204)
}
