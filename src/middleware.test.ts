import { describe, expect, it } from 'vitest'
import { config } from './middleware'

/**
 * The matcher is load-bearing beyond routing: any path it matches has its
 * request body buffered for middleware and capped by Next's
 * `middlewareClientMaxBodySize` (10MB default). When /api/media was matched,
 * uploads over that cap arrived truncated and Payload's multipart parser threw
 * "Unexpected end of form" — every product photo above ~10MB failed with a 500.
 */
describe('middleware matcher', () => {
  const pattern = new RegExp(`^${config.matcher[0]}$`)

  it('does not match Payload API routes (keeps upload bodies unbuffered)', () => {
    for (const p of ['/api', '/api/media', '/api/media/file/x.webp', '/api/users/login']) {
      expect(pattern.test(p), p).toBe(false)
    }
  })

  it('still matches storefront paths the site lock must gate', () => {
    for (const p of ['/', '/cart', '/checkout', '/category/drazhki', '/brands', '/index.php']) {
      expect(pattern.test(p), p).toBe(true)
    }
  })

  it('does not match framework plumbing under /_next', () => {
    // webpack-hmr is the one that bit: matching the Fast Refresh websocket
    // broke its handshake, and the dev client bootstraps HMR before it
    // hydrates — so nothing on the site was interactive under `pnpm dev`.
    for (const p of ['/_next/static/chunk.js', '/_next/image', '/_next/webpack-hmr', '/_next', '/favicon.ico']) {
      expect(pattern.test(p), p).toBe(false)
    }
  })

  it('does not exclude storefront paths that merely start with the same letters', () => {
    for (const p of ['/apixyz', '/api-docs', '/_nextdoor']) {
      expect(pattern.test(p), p).toBe(true)
    }
  })
})
