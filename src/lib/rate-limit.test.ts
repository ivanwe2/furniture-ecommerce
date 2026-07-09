import { describe, expect, it, vi } from 'vitest'
import { rateLimitWith } from '@/lib/rate-limit'

describe('rateLimitWith', () => {
  function makeKV() {
    const store = new Map<string, string>()
    return {
      get: async (k: string) => store.get(k) ?? null,
      put: async (k: string, v: string, _o?: { expirationTtl?: number }) => { store.set(k, v) },
    }
  }

  it('allows requests under the limit', async () => {
    const kv = makeKV()
    for (let i = 0; i < 3; i++) {
      const result = await rateLimitWith(kv, 'test', { windowSec: 60, max: 5 })
      expect(result.allowed).toBe(true)
      expect(result.retryAfterSec).toBe(0)
    }
  })

  it('blocks when limit reached', async () => {
    const kv = makeKV()
    for (let i = 0; i < 5; i++) {
      await rateLimitWith(kv, 'test', { windowSec: 60, max: 5 })
    }
    const result = await rateLimitWith(kv, 'test', { windowSec: 60, max: 5 })
    expect(result.allowed).toBe(false)
    expect(result.retryAfterSec).toBe(60)
  })

  it('resets after window expires', async () => {
    const kv = makeKV()
    for (let i = 0; i < 5; i++) {
      await rateLimitWith(kv, 'test', { windowSec: 60, max: 5 })
    }

    // Simulate time advancing past the window
    vi.useFakeTimers()
    vi.advanceTimersByTime(61_000)

    const result = await rateLimitWith(kv, 'test', { windowSec: 60, max: 5 })
    expect(result.allowed).toBe(true)

    vi.useRealTimers()
  })

  it('uses separate keys for different buckets', async () => {
    const kv = makeKV()
    await rateLimitWith(kv, 'test', { windowSec: 60, max: 5 })
    // Exhaust the 'other' bucket (max=2)
    await rateLimitWith(kv, 'other', { windowSec: 60, max: 2 })
    await rateLimitWith(kv, 'other', { windowSec: 60, max: 2 })

    // 'test' still has room, 'other' is at limit
    const r1 = await rateLimitWith(kv, 'test', { windowSec: 60, max: 5 })
    const r2 = await rateLimitWith(kv, 'other', { windowSec: 60, max: 2 })
    expect(r1.allowed).toBe(true)
    expect(r2.allowed).toBe(false)
  })
})
