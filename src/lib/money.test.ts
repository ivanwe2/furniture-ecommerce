import { describe, expect, it } from 'vitest'
import {
  BGN_PER_EUR,
  bgnCentsFromEurCents,
  eurCentsFromBgnCents,
  formatBgn,
  formatEur,
  formatPrice,
  showBgn,
} from '@/lib/money'

describe('BGN_PER_EUR', () => {
  it('is the fixed legal rate', () => {
    expect(BGN_PER_EUR).toBe(1.95583)
  })
})

describe('bgnCentsFromEurCents', () => {
  it('converts known values: 3114 → 6090 (3114 × 1.95583 = 6090.45462)', () => {
    expect(bgnCentsFromEurCents(3114)).toBe(6090)
  })

  it('rounds half-up at boundary: 100 → 196 (195.583 rounds up)', () => {
    expect(bgnCentsFromEurCents(100)).toBe(196)
  })

  it('handles zero', () => {
    expect(bgnCentsFromEurCents(0)).toBe(0)
  })

  it('is monotonic non-decreasing', () => {
    let prev = 0
    for (let c = 0; c <= 100000; c += Math.floor(Math.random() * 500) + 1) {
      const cur = bgnCentsFromEurCents(c)
      expect(cur).toBeGreaterThanOrEqual(prev)
      prev = cur
    }
    // Deterministic sweep on a small range for full coverage
    prev = 0
    for (let c = 0; c <= 1000; c++) {
      const cur = bgnCentsFromEurCents(c)
      expect(cur).toBeGreaterThanOrEqual(prev)
      prev = cur
    }
  })

  it('throws on non-integer input', () => {
    expect(() => bgnCentsFromEurCents(12.5)).toThrow()
  })

  it('throws on negative input', () => {
    expect(() => bgnCentsFromEurCents(-1)).toThrow()
  })
})

describe('eurCentsFromBgnCents', () => {
  it('converts known values: 6091 BGN → 3114 EUR (6091 / 1.95583 = 3114.28…)', () => {
    expect(eurCentsFromBgnCents(6091)).toBe(3114)
  })

  it('converts exact: 3114 × 1.95583 = 6090.45462 → round to 6090 BGN, back to 3114 EUR', () => {
    const bgn = bgnCentsFromEurCents(3114)
    const eur = eurCentsFromBgnCents(bgn)
    expect(eur).toBe(3114)
  })

  it('rounds half-up at boundary', () => {
    // 196 BGN / 1.95583 = 100.21… → 100 EUR
    expect(eurCentsFromBgnCents(196)).toBe(100)
  })

  it('handles zero', () => {
    expect(eurCentsFromBgnCents(0)).toBe(0)
  })

  it('throws on non-integer input', () => {
    expect(() => eurCentsFromBgnCents(12.5)).toThrow()
  })

  it('throws on negative input', () => {
    expect(() => eurCentsFromBgnCents(-1)).toThrow()
  })
})

describe('formatEur', () => {
  it('formats with BG locale (comma decimal)', () => {
    const result = formatEur(3114)
    expect(result).toContain('31,14')
    expect(result).toMatch(/\s*€\s*$/)
  })
})

describe('formatBgn', () => {
  it('formats with лв. suffix and comma decimal', () => {
    const result = formatBgn(6091)
    expect(result).toContain('60,91')
    expect(result).toMatch(/\s*лв\.\s*$/)
  })
})

describe('showBgn', () => {
  it('returns false when env not set', () => {
    const prev = process.env.NEXT_PUBLIC_SHOW_BGN
    delete process.env.NEXT_PUBLIC_SHOW_BGN
    expect(showBgn()).toBe(false)
    if (prev !== undefined) process.env.NEXT_PUBLIC_SHOW_BGN = prev
  })

  it('returns true when env is "true"', () => {
    const prev = process.env.NEXT_PUBLIC_SHOW_BGN
    process.env.NEXT_PUBLIC_SHOW_BGN = 'true'
    expect(showBgn()).toBe(true)
    if (prev !== undefined) {
      process.env.NEXT_PUBLIC_SHOW_BGN = prev
    }
    else {
      delete process.env.NEXT_PUBLIC_SHOW_BGN
    }
  })
})

describe('formatPrice', () => {
  it('shows only EUR when SHOW_BGN is false', () => {
    const prev = process.env.NEXT_PUBLIC_SHOW_BGN
    delete process.env.NEXT_PUBLIC_SHOW_BGN
    const result = formatPrice(3114)
    expect(result).toContain('31,14')
    expect(result).not.toContain('лв.')
    if (prev !== undefined) process.env.NEXT_PUBLIC_SHOW_BGN = prev
  })

  it('shows dual price when SHOW_BGN is true', () => {
    const prev = process.env.NEXT_PUBLIC_SHOW_BGN
    process.env.NEXT_PUBLIC_SHOW_BGN = 'true'
    const result = formatPrice(3114)
    expect(result).toContain('31,14')
    expect(result).toContain('60,90')
    expect(result).toContain('лв.')
    if (prev !== undefined) {
      process.env.NEXT_PUBLIC_SHOW_BGN = prev
    }
    else {
      delete process.env.NEXT_PUBLIC_SHOW_BGN
    }
  })
})
