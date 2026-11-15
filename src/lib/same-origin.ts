/**
 * Is this request from our own pages? True when its `Origin` header names our
 * host — as the reverse proxy forwards it (X-Forwarded-Host / Host, DEPLOY §6)
 * or as configured (NEXT_PUBLIC_SITE_URL, for a proxy that rewrites Host).
 * A missing or malformed Origin is "no". Used by the admin importer endpoints
 * and the telemetry beacon.
 */
export function isSameOrigin(hdrs: Headers): boolean {
  const origin = hdrs.get('origin')
  if (!origin) return false
  let host: string
  try {
    host = new URL(origin).host
  } catch {
    return false
  }
  let siteHost: string | null = null
  try {
    siteHost = process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL).host : null
  } catch {
    siteHost = null
  }
  return [hdrs.get('x-forwarded-host'), hdrs.get('host'), siteHost].includes(host)
}
