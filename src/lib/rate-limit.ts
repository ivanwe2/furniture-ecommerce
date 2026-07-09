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
