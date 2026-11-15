import Redis from 'ioredis'
import { logger, throttled } from '@/lib/log'

const log = logger('redis')
const once = throttled(60_000)

let client: Redis | null = null
let initialised = false

/**
 * The shared Redis client (the `redis` container), or null when `REDIS_URL`
 * is unset. Callers must treat Redis as optional: rate limiting falls back to
 * memory, telemetry to a per-process salt — a Redis blip never blocks a page
 * or an order. Connection problems are logged at most once a minute.
 */
export function getRedis(): Redis | null {
  if (initialised) return client
  initialised = true
  const url = process.env.REDIS_URL
  if (!url) return null
  client = new Redis(url, {
    // Fail fast when Redis is unreachable so callers fall back rather than
    // blocking a checkout on a Redis blip.
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    connectTimeout: 2000,
    retryStrategy: (times) => Math.min(times * 200, 3000),
  })
  client.on('error', (err) => once('connection', () => log.warn('connection problem — falling back where possible', { err })))
  return client
}

/** For /api/health: 'ok', 'down', or 'off' when Redis is not configured. */
export async function redisStatus(): Promise<'ok' | 'down' | 'off'> {
  const redis = getRedis()
  if (!redis) return 'off'
  try {
    const pong = await Promise.race([
      redis.ping(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500)),
    ])
    return pong === 'PONG' ? 'ok' : 'down'
  } catch {
    return 'down'
  }
}
