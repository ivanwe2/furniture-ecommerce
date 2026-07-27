/**
 * Pre-launch site lock — HTTP Basic Auth in front of the whole storefront.
 *
 * The site is live on its real domain while content is still being prepared, so
 * a stray visitor must not mistake it for an open shop and place an order. Basic
 * Auth is deliberate: no new dependency, no session/cookie state, and the
 * browser's own prompt is enough friction for a shared team password.
 *
 * The lock is ON iff BOTH credentials are non-empty — there is no separate
 * on/off flag to drift out of sync with them. To go live: empty
 * `SITE_LOCK_USER` / `SITE_LOCK_PASSWORD` and restart (see DEPLOY.md §8).
 *
 * Credentials must be ASCII: Basic Auth transports them base64-encoded as
 * latin1, so non-ASCII bytes would not round-trip through `atob` here.
 */

export type SiteLock = { user: string; password: string }

/**
 * Query flag that asks for the browser's credential prompt.
 *
 * Without it a locked page answers 503 + the "в разработка" notice and NO
 * `WWW-Authenticate` — so a customer reads an explanation instead of a bare
 * password box. The notice's button links to `?unlock=1`, which answers 401
 * *with* the header, and only then does the browser prompt.
 *
 * It is a hint, not a secret: knowing it gets you the prompt, not past it.
 */
export const UNLOCK_PARAM = 'unlock'

/** `null` when the lock is off (either credential missing/empty). */
export function readSiteLock(user: string | undefined, password: string | undefined): SiteLock | null {
  const u = user?.trim() ?? ''
  const p = password ?? ''
  if (!u || !p) return null
  return { user: u, password: p }
}

/**
 * Paths that stay reachable while locked:
 *   /robots.txt — the container healthcheck polls it (a 401 = restart loop);
 *   /admin, /api — Payload has its own login, and locking them would prompt the
 *     owner twice per session (and break the admin's own API calls).
 */
export function isLockExempt(pathname: string): boolean {
  return (
    pathname === '/robots.txt' ||
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname === '/api' ||
    pathname.startsWith('/api/')
  )
}

/** Length-independent compare, so a wrong guess leaks no timing signal. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** Validates an `Authorization: Basic <base64>` header against the lock. */
export function isAuthorized(authHeader: string | null, lock: SiteLock): boolean {
  if (!authHeader?.startsWith('Basic ')) return false

  let decoded: string
  try {
    decoded = atob(authHeader.slice('Basic '.length).trim())
  } catch {
    return false // not valid base64
  }

  // Only the FIRST colon separates user from password — passwords may contain one.
  const sep = decoded.indexOf(':')
  if (sep === -1) return false

  return (
    safeEqual(decoded.slice(0, sep), lock.user) && safeEqual(decoded.slice(sep + 1), lock.password)
  )
}
