// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { deriveKey } from 'altcha-lib/algorithms/sha'
import { solveChallenge } from 'altcha-lib'
// Not part of altcha-lib's public exports; the test builds a forged solution
// the same way an attacker would.
import { PasswordBuffer } from '../../node_modules/altcha-lib/dist/esm/v2/pow.js'

// `server-only` throws outside a react-server condition.
vi.mock('server-only', () => ({}))

const { altchaChallengeResponse, verifyAltcha } = await import('@/lib/altcha')

type Challenge = { parameters: { nonce: string; salt: string; keyPrefix: string } & Record<string, unknown> }

async function challenge(): Promise<Challenge> {
  const res = await altchaChallengeResponse(new Request('http://localhost/altcha'))
  return (await res.json()) as Challenge
}

const hex = (b: ArrayBuffer | Uint8Array) => Buffer.from(b instanceof Uint8Array ? b : new Uint8Array(b)).toString('hex')
const fromHex = (h: string) => new Uint8Array(Buffer.from(h, 'hex'))
const payload = (c: Challenge, solution: unknown) =>
  Buffer.from(JSON.stringify({ challenge: c, solution })).toString('base64')

describe('verifyAltcha', () => {
  // Regression: altcha-lib < 2.3.2 re-derived the key from the submitted
  // counter but never checked it against the signed keyPrefix, so counter 0
  // plus its derived key "verified" with no proof-of-work at all (found
  // 2026-11-14 via the widget's release notes; our verify passes no key
  // signature secret, which is exactly the vulnerable path).
  it('rejects a counter-0 solution that did no work', async () => {
    const c = await challenge()
    const p = c.parameters
    const { derivedKey } = await deriveKey(
      p as never,
      fromHex(p.salt),
      new PasswordBuffer(fromHex(p.nonce)).setCounter(0),
    )
    expect(hex(derivedKey).startsWith(p.keyPrefix)).toBe(false) // a real solve would not stop at 0
    expect(await verifyAltcha(payload(c, { counter: 0, derivedKey: hex(derivedKey) }))).toBe(false)
  })

  it('accepts an honest solution once, then refuses the replay', async () => {
    const c = await challenge()
    const solution = await solveChallenge({ challenge: c as never, deriveKey })
    const honest = payload(c, solution)
    expect(await verifyAltcha(honest)).toBe(true)
    expect(await verifyAltcha(honest)).toBe(false)
  }, 30_000)

  it('rejects garbage and empty payloads', async () => {
    expect(await verifyAltcha('')).toBe(false)
    expect(await verifyAltcha('not-base64-json')).toBe(false)
  })
})
