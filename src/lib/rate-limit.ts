type Bucket = { count: number; resetAt: number }

/**
 * Pure fixed-window counter over an in-memory store. Exposed for tests; the
 * window bucket is derived from the wall clock so callers hold no state.
 */
export function rateLimitWith(
  store: Map<string, Bucket>,
  key: string,
  { windowSec, max }: { windowSec: number; max: number },
): { allowed: boolean; retryAfterSec: number } {
  const bucket = Math.floor(Date.now() / 1000 / windowSec)
  const k = `${key}:${bucket}`
  const current = store.get(k)?.count ?? 0
  if (current >= max) return { allowed: false, retryAfterSec: windowSec }
  store.set(k, { count: current + 1, resetAt: (bucket + 1) * windowSec * 1000 })
  return { allowed: true, retryAfterSec: 0 }
}

/**
 * Server entry point: a single-instance in-memory fixed-window limit
 * (ARCHITECTURE §7). We run one container, so an in-process Map IS the whole
 * rate-limit surface — no KV, no Redis. This is the SOFT gate; Turnstile is the
 * hard one. The counter lives in module state for the process lifetime.
 */
const store = new Map<string, Bucket>()

export async function rateLimit(
  key: string,
  opts: { windowSec: number; max: number },
): Promise<{ allowed: boolean; retryAfterSec: number }> {
  // Opportunistic sweep so the Map can't grow unbounded across many IPs/buckets.
  if (store.size > 5000) {
    const now = Date.now()
    for (const [k, b] of store) if (b.resetAt <= now) store.delete(k)
  }
  return rateLimitWith(store, key, opts)
}
