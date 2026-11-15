// No `import 'server-only'`: the admin-change hooks reach this module from
// payload.config.ts, which the Payload CLI loads outside Next (same reason as
// lib/import/run.ts). It is still server-only in practice.
import { createHash, randomBytes } from 'node:crypto'
import { sql } from '@payloadcms/db-postgres'
import { logger, throttled } from '@/lib/log'
import { getRedis } from '@/lib/redis'
import { classifyUserAgent, referrerHost, type EventName, type EventSource } from '@/lib/telemetry/events'

/**
 * Usage telemetry, server side (ARCHITECTURE §13). `track()` never throws and
 * never waits on the database: events are queued in memory and written in
 * batches (every few seconds, or at 50 queued) into `telemetry.events`
 * through the Payload adapter's own drizzle connection (the "SQL only through
 * Payload's adapter" seam). If the write fails the batch is dropped and a
 * warning logged once a minute — statistics are never worth an error page.
 */

const log = logger('telemetry')
const once = throttled(60_000)

/** What the server knows about the request behind an event. */
export type RequestContext = {
  ip: string
  ua: string
  referer?: string | null
  /** An admin session cookie is present — owner browsing is not customer traffic. */
  staff?: boolean
  /** Only with the visitor's consent („Приемам"). */
  visitorId?: string
  sessionId?: string
}

type Row = {
  name: EventName
  source: EventSource
  props: Record<string, unknown>
  path: string | null
  visitorDay: string | null
  visitorId: string | null
  sessionId: string | null
  device: string | null
  browser: string | null
  referrerHost: string | null
}

const FLUSH_MS = 5_000
const FLUSH_AT = 50
const MAX_QUEUE = 5_000

let queue: Row[] = []
let timer: ReturnType<typeof setTimeout> | null = null

function disabled(): boolean {
  return process.env.TELEMETRY_DISABLED === '1' || process.env.NODE_ENV === 'test'
}

function siteHost(): string {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nasteh.bg').hostname
  } catch {
    return 'nasteh.bg'
  }
}

// --- the daily salt -------------------------------------------------------
// visitor_day = hash(salt of the day + IP + browser). The salt lives in Redis
// for 48 h (shared by every app process, survives restarts) and is never
// stored anywhere else, so yesterday's hashes cannot be linked to today's.
let localSalt: { day: string; value: string } | null = null

async function saltFor(day: string): Promise<string> {
  const redis = getRedis()
  if (redis) {
    try {
      const key = `telemetry:salt:${day}`
      await redis.set(key, randomBytes(16).toString('hex'), 'EX', 172_800, 'NX')
      const value = await redis.get(key)
      if (value) return value
    } catch {
      // fall through to the per-process salt
    }
  }
  if (localSalt?.day !== day) localSalt = { day, value: randomBytes(16).toString('hex') }
  return localSalt.value
}

async function visitorDay(ip: string, ua: string): Promise<string | null> {
  if (!ip || ip === 'unknown') return null
  const day = new Date().toISOString().slice(0, 10)
  const salt = await saltFor(day)
  return createHash('sha256').update(`${salt}|${ip}|${ua}`).digest('hex').slice(0, 16)
}

// --- recording ------------------------------------------------------------

/**
 * Record one event. Web/server events need the request context (bots and the
 * owner's own browsing are skipped there); admin events need none.
 */
export function track(
  name: EventName,
  props: Record<string, unknown>,
  opts: { source: EventSource; ctx?: RequestContext; path?: string | null },
): void {
  if (disabled()) return
  void enqueue(name, props, opts).catch((err) => once('enqueue', () => log.warn('event dropped', { err })))
}

async function enqueue(
  name: EventName,
  props: Record<string, unknown>,
  { source, ctx, path }: { source: EventSource; ctx?: RequestContext; path?: string | null },
): Promise<void> {
  const ua = ctx ? classifyUserAgent(ctx.ua) : null
  if (ua?.bot) return
  if (ctx?.staff && name !== 'order_placed') return
  const row: Row = {
    name,
    source,
    props: ctx?.staff ? { ...props, staff: true } : props,
    path: path ?? null,
    visitorDay: ctx ? await visitorDay(ctx.ip, ctx.ua) : null,
    visitorId: ctx?.visitorId ?? null,
    sessionId: ctx?.sessionId ?? null,
    device: ua?.device ?? null,
    browser: ua?.browser ?? null,
    referrerHost: ctx ? referrerHost(ctx.referer, siteHost()) : null,
  }
  if (queue.length >= MAX_QUEUE) return // the database is gone; stop growing
  queue.push(row)
  if (queue.length >= FLUSH_AT) void flush()
  else if (!timer) timer = setTimeout(() => void flush(), FLUSH_MS)
}

type Drizzle = { execute: (query: ReturnType<typeof sql>) => Promise<unknown> }

async function drizzle(): Promise<Drizzle> {
  // Imported lazily: a static import would close the payload.config →
  // collection hooks → this module cycle.
  const [{ getPayload }, { default: config }] = await Promise.all([import('payload'), import('@payload-config')])
  const payload = await getPayload({ config })
  return (payload.db as unknown as { drizzle: Drizzle }).drizzle
}

/** Write everything queued so far (also called on shutdown). */
export async function flush(): Promise<void> {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  if (queue.length === 0) return
  const batch = queue
  queue = []
  try {
    const db = await drizzle()
    const values = batch.map(
      (r) =>
        sql`(${r.name}, ${r.source}, ${JSON.stringify(r.props)}::jsonb, ${r.path}, ${r.visitorDay}, ${r.visitorId}::uuid, ${r.sessionId}::uuid, ${r.device}, ${r.browser}, ${r.referrerHost})`,
    )
    await db.execute(
      sql`INSERT INTO telemetry.events (name, source, props, path, visitor_day, visitor_id, session_id, device, browser, referrer_host) VALUES ${sql.join(values, sql`, `)}`,
    )
  } catch (err) {
    once('flush', () => log.warn('could not write usage events — batch dropped', { events: batch.length, err }))
  }
}

/** Delete events older than 13 months (instrumentation-node.ts, daily). */
export async function purgeOldEvents(): Promise<void> {
  if (disabled()) return
  try {
    const db = await drizzle()
    await db.execute(sql`DELETE FROM telemetry.events WHERE ts < now() - interval '13 months'`)
  } catch (err) {
    log.warn('purge of old usage events failed', { err })
  }
}
