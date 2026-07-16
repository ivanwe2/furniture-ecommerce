import { describe, expect, it, vi } from 'vitest'
import { rateLimitWith } from '@/lib/rate-limit'

type Bucket = { count: number; resetAt: number }

describe('rateLimitWith', () => {
  const newStore = () => new Map<string, Bucket>()

  it('allows requests under the limit', () => {
    const store = newStore()
    for (let i = 0; i < 3; i++) {
      const result = rateLimitWith(store, 'test', { windowSec: 60, max: 5 })
      expect(result.allowed).toBe(true)
      expect(result.retryAfterSec).toBe(0)
    }
  })

  it('blocks when limit reached', () => {
    const store = newStore()
    for (let i = 0; i < 5; i++) {
      rateLimitWith(store, 'test', { windowSec: 60, max: 5 })
    }
    const result = rateLimitWith(store, 'test', { windowSec: 60, max: 5 })
    expect(result.allowed).toBe(false)
    expect(result.retryAfterSec).toBe(60)
  })

  it('resets after window expires', () => {
    const store = newStore()
    for (let i = 0; i < 5; i++) {
      rateLimitWith(store, 'test', { windowSec: 60, max: 5 })
    }

    // Simulate time advancing past the window
    vi.useFakeTimers()
    vi.advanceTimersByTime(61_000)

    const result = rateLimitWith(store, 'test', { windowSec: 60, max: 5 })
    expect(result.allowed).toBe(true)

    vi.useRealTimers()
  })

  it('uses separate keys for different buckets', () => {
    const store = newStore()
    rateLimitWith(store, 'test', { windowSec: 60, max: 5 })
    // Exhaust the 'other' bucket (max=2)
    rateLimitWith(store, 'other', { windowSec: 60, max: 2 })
    rateLimitWith(store, 'other', { windowSec: 60, max: 2 })

    // 'test' still has room, 'other' is at limit
    const r1 = rateLimitWith(store, 'test', { windowSec: 60, max: 5 })
    const r2 = rateLimitWith(store, 'other', { windowSec: 60, max: 2 })
    expect(r1.allowed).toBe(true)
    expect(r2.allowed).toBe(false)
  })
})
