import { describe, expect, it } from 'vitest'
import { escapeLikePattern, searchTokens } from './search'

describe('escapeLikePattern', () => {
  it('leaves ordinary text alone', () => {
    expect(escapeLikePattern('панта')).toBe('панта')
    expect(escapeLikePattern('abc-123')).toBe('abc-123')
  })

  it('escapes the LIKE wildcards so they match literally', () => {
    expect(escapeLikePattern('%')).toBe('\\%')
    expect(escapeLikePattern('_')).toBe('\\_')
    expect(escapeLikePattern('50%_off')).toBe('50\\%\\_off')
  })

  it('escapes the backslash itself first, so it cannot eat the next character', () => {
    expect(escapeLikePattern('\\')).toBe('\\\\')
    // Without backslash-first ordering this would become `\\%` — an escaped
    // backslash followed by a LIVE wildcard.
    expect(escapeLikePattern('\\%')).toBe('\\\\\\%')
  })
})

describe('searchTokens', () => {
  it('lowercases and splits on whitespace', () => {
    expect(searchTokens('Панта Ъгъл')).toEqual(['панта', 'ъгъл'])
    expect(searchTokens('  a   b  ')).toEqual(['a', 'b'])
  })

  it('returns no tokens for blank input', () => {
    expect(searchTokens('')).toEqual([])
    expect(searchTokens('    ')).toEqual([])
  })

  it('caps at 5 tokens (each is an extra ILIKE on the query)', () => {
    expect(searchTokens('a b c d e f g')).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g'].slice(0, 5))
  })

  it('escapes a bare % so it no longer matches the whole catalogue', () => {
    expect(searchTokens('%')).toEqual(['\\%'])
    expect(searchTokens('панта %')).toEqual(['панта', '\\%'])
  })
})
