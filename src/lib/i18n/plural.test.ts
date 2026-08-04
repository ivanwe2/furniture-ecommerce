import { describe, expect, it } from 'vitest'
import { productCount } from './plural'

describe('productCount — Bulgarian plural', () => {
  it('uses the singular only for exactly 1', () => {
    expect(productCount(1)).toBe('1 продукт')
  })

  it('uses the count form for 0 and for everything above 1', () => {
    expect(productCount(0)).toBe('0 продукта')
    expect(productCount(2)).toBe('2 продукта')
    expect(productCount(5)).toBe('5 продукта')
    expect(productCount(100)).toBe('100 продукта')
  })

  it('keeps the count form for 21 and 101 — Bulgarian does not key off the last digit', () => {
    // The Russian rule would give the singular here; Bulgarian does not.
    expect(productCount(21)).toBe('21 продукта')
    expect(productCount(101)).toBe('101 продукта')
  })

  it('substitutes the number, never leaving the placeholder behind', () => {
    for (const n of [0, 1, 7, 42]) {
      expect(productCount(n)).not.toContain('{count}')
      expect(productCount(n)).toContain(String(n))
    }
  })
})
