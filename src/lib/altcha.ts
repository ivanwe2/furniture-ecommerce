import 'server-only'
import { deriveKey } from 'altcha-lib/algorithms/sha'
import { create, CappedMap } from 'altcha-lib/frameworks/nextjs'
import { verify as altchaVerify } from 'altcha-lib/frameworks/shared'

/**
 * Self-hosted Altcha proof-of-work anti-bot (replaces Cloudflare Turnstile).
 * The server issues an HMAC-signed SHA-256 challenge; the browser brute-forces
 * the proof-of-work; the server verifies the solution locally. No external
 * calls, no account, no keys beyond our own `ALTCHA_HMAC_KEY`.
 *
 * Uses altcha-lib v2 (matches the v3 widget's native challenge format). A
 * shared `CappedMap` store gives replay protection (a solved challenge can't be
 * reused). Challenge issuance (`/altcha`) and verification share the same store.
 */

/** Difficulty: the widget brute-forces 0..cost. ~100k solves fast on mobile
 *  while staying costly to farm out at scale. */
const COST = 100_000

/**
 * The HMAC secret. In production it MUST be set (fail closed if not). In
 * development we fall back to a constant so the challenge/verify round-trip
 * works fully offline — real PoW verification, no bypass.
 */
function hmacKey(): string | null {
  const k = process.env.ALTCHA_HMAC_KEY
  if (k) return k
  if (process.env.NODE_ENV === 'production') return null
  return 'nasteh-dev-altcha-hmac-key'
}

// Module-singleton store: anti-replay for solved challenges.
const store = new CappedMap<string, boolean>({ maxSize: 5000 })

let instance: ReturnType<typeof create> | null = null
function altcha() {
  const key = hmacKey()
  if (!key) return null
  if (!instance) {
    instance = create({
      createChallengeParameters: () => ({ algorithm: 'SHA-256', cost: COST }),
      deriveKey,
      hmacSignatureSecret: key,
      store,
    })
  }
  return instance
}

/** GET /altcha — a fresh signed challenge (used by the widget's `challengeurl`). */
export async function altchaChallengeResponse(req: Request): Promise<Response> {
  const a = altcha()
  if (!a) return Response.json({ error: 'ALTCHA_HMAC_KEY is not set' }, { status: 500 })
  return a.challengeHandler(req)
}

/** Verify a submitted solution payload. Fails closed on any error. */
export async function verifyAltcha(payload: string): Promise<boolean> {
  const key = hmacKey()
  if (!key || !payload) return false
  try {
    const res = await altchaVerify(payload, deriveKey, key, undefined, store)
    return !res.error && res.verification?.verified === true
  } catch {
    return false
  }
}
