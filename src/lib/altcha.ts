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

/**
 * Proof-of-work difficulty. In altcha-lib v2's deriveKey scheme `cost` is the
 * KDF *iteration count* — each brute-force attempt runs `cost` chained SHA-256
 * hashes. The solver tries counters until a derived key lands on the 1-byte
 * default prefix (≈1/256), so a solve costs on average ~256 × cost hashes.
 *
 * Altcha's recommended default difficulty is ~1,000,000 hashes; 4000 hits that
 * (256 × 4000 ≈ 1.0M). The previous 50_000 was ~13× that (≈12.8M) — measured at
 * ~30s single-threaded, the source of the perceived slowness — with no extra
 * bot deterrence to show for it. This keeps the identical SHA-256 PoW and pins
 * difficulty to the standard level; the pre-solve (Altcha.tsx `auto="onload"`)
 * then hides it entirely.
 */
const COST = 4_000

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
