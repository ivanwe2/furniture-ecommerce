import { describe, expect, it } from 'vitest'
import { bg } from './i18n/bg'
import { isAuthorized, isLockExempt, readSiteLock, type SiteLock } from './site-lock'

const lock: SiteLock = { user: 'nasteh', password: 's3cret' }
const basic = (user: string, password: string) => `Basic ${btoa(`${user}:${password}`)}`

describe('readSiteLock', () => {
  it('returns the lock when both credentials are set', () => {
    expect(readSiteLock('nasteh', 's3cret')).toEqual(lock)
  })

  it('is off unless BOTH credentials are non-empty', () => {
    expect(readSiteLock(undefined, undefined)).toBeNull()
    expect(readSiteLock('nasteh', undefined)).toBeNull()
    expect(readSiteLock(undefined, 's3cret')).toBeNull()
    expect(readSiteLock('', 's3cret')).toBeNull()
    expect(readSiteLock('nasteh', '')).toBeNull()
  })

  it('treats a whitespace-only user as unset (stray quotes/spaces in .env)', () => {
    expect(readSiteLock('   ', 's3cret')).toBeNull()
  })

  it('does not trim the password — spaces may be intentional', () => {
    expect(readSiteLock(' nasteh ', ' pw ')).toEqual({ user: 'nasteh', password: ' pw ' })
  })
})

describe('WWW-Authenticate realm', () => {
  // Regression guard: a Cyrillic realm throws `Cannot convert argument to a
  // ByteString` when the 401 is constructed, turning every locked page into a 500.
  it('is ASCII — HTTP header values are latin1', () => {
    expect(bg.siteLock.realm).toMatch(/^[\x20-\x7E]+$/)
  })

  it('has no double quote that would break the header syntax', () => {
    expect(bg.siteLock.realm).not.toContain('"')
  })
})

describe('isLockExempt', () => {
  it('exempts the healthcheck target and the Payload admin/API', () => {
    for (const p of ['/robots.txt', '/admin', '/admin/collections/orders', '/api', '/api/users/me']) {
      expect(isLockExempt(p)).toBe(true)
    }
  })

  it('locks storefront paths, including look-alikes', () => {
    for (const p of ['/', '/cart', '/checkout', '/altcha', '/sitemap.xml', '/administrator', '/apixyz']) {
      expect(isLockExempt(p)).toBe(false)
    }
  })
})

describe('isAuthorized', () => {
  it('accepts the exact credentials', () => {
    expect(isAuthorized(basic('nasteh', 's3cret'), lock)).toBe(true)
  })

  it('rejects wrong, missing, or malformed credentials', () => {
    expect(isAuthorized(basic('nasteh', 'wrong'), lock)).toBe(false)
    expect(isAuthorized(basic('wrong', 's3cret'), lock)).toBe(false)
    expect(isAuthorized(null, lock)).toBe(false)
    expect(isAuthorized('', lock)).toBe(false)
    expect(isAuthorized(`Bearer ${btoa('nasteh:s3cret')}`, lock)).toBe(false)
    expect(isAuthorized('Basic !!!not-base64!!!', lock)).toBe(false)
    expect(isAuthorized(`Basic ${btoa('no-colon-here')}`, lock)).toBe(false)
  })

  it('is case-sensitive', () => {
    expect(isAuthorized(basic('Nasteh', 's3cret'), lock)).toBe(false)
    expect(isAuthorized(basic('nasteh', 'S3CRET'), lock)).toBe(false)
  })

  it('splits on the first colon so passwords may contain one', () => {
    const colonLock: SiteLock = { user: 'nasteh', password: 'a:b:c' }
    expect(isAuthorized(basic('nasteh', 'a:b:c'), colonLock)).toBe(true)
  })

  it('rejects a prefix of the password (no truncated compare)', () => {
    expect(isAuthorized(basic('nasteh', 's3cre'), lock)).toBe(false)
    expect(isAuthorized(basic('nasteh', 's3cret1'), lock)).toBe(false)
  })
})
