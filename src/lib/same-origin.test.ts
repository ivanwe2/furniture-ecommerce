import { afterEach, describe, expect, it, vi } from 'vitest'
import { isSameOrigin } from '@/lib/same-origin'

const h = (init: Record<string, string>) => new Headers(init)

describe('isSameOrigin', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('accepts an Origin matching Host, X-Forwarded-Host or the site URL', () => {
    expect(isSameOrigin(h({ origin: 'http://localhost:3000', host: 'localhost:3000' }))).toBe(true)
    expect(isSameOrigin(h({ origin: 'https://nasteh.bg', host: '127.0.0.1:3000', 'x-forwarded-host': 'nasteh.bg' }))).toBe(true)
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://nasteh.bg')
    expect(isSameOrigin(h({ origin: 'https://nasteh.bg', host: 'app:3000' }))).toBe(true)
  })

  it('rejects other origins, a missing Origin and garbage', () => {
    expect(isSameOrigin(h({ origin: 'https://evil.example', host: 'nasteh.bg' }))).toBe(false)
    expect(isSameOrigin(h({ host: 'nasteh.bg' }))).toBe(false)
    expect(isSameOrigin(h({ origin: 'null', host: 'nasteh.bg' }))).toBe(false)
  })
})
