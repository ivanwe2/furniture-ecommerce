import { describe, it, expect } from 'vitest'
import { clientIp } from './request-ip'

const h = (init: Record<string, string>) => new Headers(init)

describe('clientIp', () => {
  it('prefers X-Real-IP (proxy-set, non-spoofable)', () => {
    expect(clientIp(h({ 'x-real-ip': '203.0.113.7', 'x-forwarded-for': '1.2.3.4' }))).toBe('203.0.113.7')
  })

  it('ignores a client-spoofed first XFF hop, taking the last', () => {
    // Attacker sends "X-Forwarded-For: 1.2.3.4"; the proxy appends the real IP.
    expect(clientIp(h({ 'x-forwarded-for': '1.2.3.4, 203.0.113.7' }))).toBe('203.0.113.7')
  })

  it('uses a single XFF value when that is all there is', () => {
    expect(clientIp(h({ 'x-forwarded-for': '203.0.113.7' }))).toBe('203.0.113.7')
  })

  it('falls back to "unknown" when no headers are present', () => {
    expect(clientIp(h({}))).toBe('unknown')
  })
})
