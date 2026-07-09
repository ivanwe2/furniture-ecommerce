import 'server-only'

export async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    // Dev ergonomics: no Turnstile configured. Allow in development so the
    // checkout/contact flow is testable offline; NEVER bypass in production
    // (CLOUDFLARE §10 — use the documented test keys for a real local check).
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[turnstile] TURNSTILE_SECRET_KEY unset — bypassing verification in development')
      return true
    }
    return false
  }
  if (!token) return false

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret,
        response: token,
        remoteip: ip,
      }),
    })

    const data = (await res.json()) as { success?: boolean }
    return Boolean(data.success)
  }
  catch {
    return false
  }
}
