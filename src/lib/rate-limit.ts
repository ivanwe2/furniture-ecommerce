type KVLike = {
  get(k: string): Promise<string | null>
  put(k: string, v: string, o?: { expirationTtl?: number }): Promise<void>
}

export async function rateLimitWith(
  kv: KVLike,
  key: string,
  { windowSec, max }: { windowSec: number; max: number },
): Promise<{ allowed: boolean; retryAfterSec: number }> {
  const bucket = Math.floor(Date.now() / 1000 / windowSec)
  const k = `${key}:${bucket}`
  const current = Number((await kv.get(k)) ?? '0')
  if (current >= max) return { allowed: false, retryAfterSec: windowSec }
  await kv.put(k, String(current + 1), { expirationTtl: windowSec * 2 })
  return { allowed: true, retryAfterSec: 0 }
}

/**
 * Server entry point: reads the RATE_LIMIT_KV binding via the Cloudflare
 * context and applies the fixed-window limit. Fails OPEN (with a warning) when
 * the binding is absent — the rate limit is a soft gate; Turnstile is the hard
 * one (ARCHITECTURE §7). The dynamic import keeps this module test-safe: the
 * pure `rateLimitWith` above can be imported without pulling in Workers APIs.
 */
export async function rateLimit(
  key: string,
  opts: { windowSec: number; max: number },
): Promise<{ allowed: boolean; retryAfterSec: number }> {
  let kv: KVLike | undefined
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare')
    const { env } = await getCloudflareContext({ async: true })
    kv = (env as unknown as Record<string, KVLike | undefined>).RATE_LIMIT_KV
  } catch {
    // Not inside a Cloudflare context (some build/test paths) — fall through.
  }
  if (!kv) {
    console.warn('[ratelimit] RATE_LIMIT_KV binding missing — soft limit skipped (Turnstile is the hard gate)')
    return { allowed: true, retryAfterSec: 0 }
  }
  return rateLimitWith(kv, key, opts)
}
