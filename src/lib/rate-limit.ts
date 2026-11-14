import { logger, throttled } from '@/lib/log'
import { getRedis } from '@/lib/redis'

const log = logger('ratelimit')
const once = throttled(60_000)

type Bucket = { count: number; resetAt: number }
type Result = { allowed: boolean; retryAfterSec: number }

/**
 * Pure fixed-window counter over an in-memory store. Exposed for tests and used
 * as the fallback when Redis is unavailable; the window bucket is derived from
 * the wall clock so callers hold no state.
 */
export function rateLimitWith(
  store: Map<string, Bucket>,
  key: string,
  { windowSec, max }: { windowSec: number; max: number },
): Result {
  const bucket = Math.floor(Date.now() / 1000 / windowSec)
  const k = `${key}:${bucket}`
  const current = store.get(k)?.count ?? 0
  if (current >= max) return { allowed: false, retryAfterSec: windowSec }
  store.set(k, { count: current + 1, resetAt: (bucket + 1) * windowSec * 1000 })
  return { allowed: true, retryAfterSec: 0 }
}

// In-memory fallback store (used when REDIS_URL is unset or Redis is down).
const memStore = new Map<string, Bucket>()

function memRateLimit(key: string, opts: { windowSec: number; max: number }): Result {
  if (memStore.size > 5000) {
    const now = Date.now()
    for (const [k, b] of memStore) if (b.resetAt <= now) memStore.delete(k)
  }
  return rateLimitWith(memStore, key, opts)
}

// --- Redis backend ---------------------------------------------------------
// Fixed-window counter shared across app instances. INCR the key; set the TTL
// only on the first hit of the window — atomic in one round-trip via Lua.
const INCR_EXPIRE = "local c = redis.call('INCR', KEYS[1]) if c == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end return c"

/**
 * Server entry point (ARCHITECTURE §7). Uses Redis (shared, own container) as
 * the store; on any Redis error — or when `REDIS_URL` is unset — falls back to
 * the in-memory limiter so a Redis outage never blocks orders. This is the SOFT
 * gate; Altcha is the hard one.
 */
export async function rateLimit(
  key: string,
  opts: { windowSec: number; max: number },
): Promise<Result> {
  const client = getRedis()
  if (client) {
    try {
      const count = Number(await client.eval(INCR_EXPIRE, 1, key, String(opts.windowSec)))
      return count > opts.max
        ? { allowed: false, retryAfterSec: opts.windowSec }
        : { allowed: true, retryAfterSec: 0 }
    } catch (err) {
      // Redis down → fall back to in-memory (never block on a blip).
      once('fallback', () => log.warn('Redis unavailable — using the in-memory limiter', { err }))
    }
  }
  return memRateLimit(key, opts)
}
