/**
 * Best-effort client IP for rate-limiting keys, resistant to header spoofing.
 *
 * A client can send any `X-Forwarded-For` it likes; with a single reverse proxy
 * that *appends* (`$proxy_add_x_forwarded_for`), the header becomes
 * `<client-supplied…>, <real client IP>` — so the FIRST entry is attacker-
 * controlled and only the LAST hop is trustworthy. We therefore:
 *   1. prefer `X-Real-IP` — the proxy sets it to the actual connecting IP
 *      (`$remote_addr`), which the client cannot forge; then
 *   2. fall back to the LAST `X-Forwarded-For` hop (never the first).
 *
 * Assumes exactly one trusted proxy in front of the app (the documented deploy —
 * see DEPLOY.md §6). Behind N proxies, take the (N+1)-th-from-last instead.
 */
export function clientIp(hdrs: Headers): string {
  const realIp = hdrs.get('x-real-ip')?.trim()
  if (realIp) return realIp

  const xff = hdrs.get('x-forwarded-for')
  if (xff) {
    const parts = xff.split(',').map((s) => s.trim()).filter(Boolean)
    const last = parts.at(-1)
    if (last) return last
  }

  return 'unknown'
}
