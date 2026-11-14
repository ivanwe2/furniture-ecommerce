import { describe, expect, it } from 'vitest'
import { eurCentsFromDecimal, eurDecimalString, formatEur, netEurCents } from '@/lib/money'

describe('formatEur', () => {
  it('formats with BG locale (comma decimal)', () => {
    const result = formatEur(3114)
    expect(result).toContain('31,14')
    expect(result).toMatch(/\s*€\s*$/)
  })
})

describe('eurCentsFromDecimal', () => {
  it('converts the float values that break naive multiplication', () => {
    // 17.49 * 100 = 1748.9999999999998 and 4.07 * 100 = 407.00000000000006
    expect(eurCentsFromDecimal(17.49)).toEqual({ cents: 1749, rounded: false })
    expect(eurCentsFromDecimal(4.07)).toEqual({ cents: 407, rounded: false })
    expect(eurCentsFromDecimal(0.61)).toEqual({ cents: 61, rounded: false })
  })

  it('handles whole numbers, one decimal and trailing zeros', () => {
    expect(eurCentsFromDecimal(12)).toEqual({ cents: 1200, rounded: false })
    expect(eurCentsFromDecimal(12.5)).toEqual({ cents: 1250, rounded: false })
    expect(eurCentsFromDecimal('1.50')).toEqual({ cents: 150, rounded: false })
    expect(eurCentsFromDecimal('1.500')).toEqual({ cents: 150, rounded: false })
    expect(eurCentsFromDecimal(0)).toEqual({ cents: 0, rounded: false })
  })

  it('accepts text with a decimal comma and surrounding spaces', () => {
    expect(eurCentsFromDecimal('3,15')).toEqual({ cents: 315, rounded: false })
    expect(eurCentsFromDecimal(' 3.15 ')).toEqual({ cents: 315, rounded: false })
  })

  it('rounds half-up at the cent boundary .004 / .005 / .006', () => {
    expect(eurCentsFromDecimal(1.004)).toEqual({ cents: 100, rounded: true })
    expect(eurCentsFromDecimal(1.005)).toEqual({ cents: 101, rounded: true })
    expect(eurCentsFromDecimal(1.006)).toEqual({ cents: 101, rounded: true })
    expect(eurCentsFromDecimal(0.285)).toEqual({ cents: 29, rounded: true })
    expect(eurCentsFromDecimal(2.675)).toEqual({ cents: 268, rounded: true })
    expect(eurCentsFromDecimal(0.995)).toEqual({ cents: 100, rounded: true })
    expect(eurCentsFromDecimal('0.6125')).toEqual({ cents: 61, rounded: true })
  })

  it('rejects anything that is not a plain non-negative decimal', () => {
    for (const bad of [-1, Number.NaN, Number.POSITIVE_INFINITY, 1e21, 1e-7]) {
      expect(eurCentsFromDecimal(bad)).toBeNull()
    }
    for (const bad of ['', 'abc', '-3.15', '1e3', '1.2.3', '3.15 €', '.5', '5.', '1 000', '12345678']) {
      expect(eurCentsFromDecimal(bad)).toBeNull()
    }
  })
})

describe('eurDecimalString', () => {
  it('renders cents as a dot-decimal string with two places', () => {
    expect(eurDecimalString(3114)).toBe('31.14')
    expect(eurDecimalString(505)).toBe('5.05')
    expect(eurDecimalString(14)).toBe('0.14')
    expect(eurDecimalString(0)).toBe('0.00')
    expect(eurDecimalString(123456789)).toBe('1234567.89')
  })

  it('rejects non-integer and negative cents', () => {
    expect(() => eurDecimalString(1.5)).toThrow()
    expect(() => eurDecimalString(-1)).toThrow()
  })
})

describe('netEurCents', () => {
  it('removes 20% VAT, rounding half-up at the cent', () => {
    expect(netEurCents(505)).toBe(421) // 420.83…
    expect(netEurCents(600)).toBe(500) // exact
    expect(netEurCents(3114)).toBe(2595) // 2595.0
    expect(netEurCents(1)).toBe(1) // 0.83 → 1
    expect(netEurCents(3)).toBe(3) // 2.5 → 3 (half-up)
    expect(netEurCents(0)).toBe(0)
  })

  it('accepts another rate', () => {
    expect(netEurCents(1090, 9)).toBe(1000)
  })

  it('rejects non-integer and negative cents', () => {
    expect(() => netEurCents(1.5)).toThrow()
    expect(() => netEurCents(-1)).toThrow()
  })
})
