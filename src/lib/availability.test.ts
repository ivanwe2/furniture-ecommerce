import { describe, expect, it } from 'vitest'
import { availabilityOf, hasPrice, isOrderable } from '@/lib/availability'

describe('availabilityOf', () => {
  it('priced and in stock → inStock', () => {
    expect(availabilityOf({ priceEurCents: 505, stockQty: 3 })).toBe('inStock')
  })

  it('priced, stock 0 or missing → soldOut', () => {
    expect(availabilityOf({ priceEurCents: 505, stockQty: 0 })).toBe('soldOut')
    expect(availabilityOf({ priceEurCents: 505, stockQty: null })).toBe('soldOut')
    expect(availabilityOf({ priceEurCents: 505 })).toBe('soldOut')
  })

  it('no price → onRequest, even with stock', () => {
    expect(availabilityOf({ priceEurCents: null, stockQty: 10 })).toBe('onRequest')
    expect(availabilityOf({ stockQty: 10 })).toBe('onRequest')
    expect(availabilityOf({ priceEurCents: null, stockQty: 0 })).toBe('onRequest')
  })

  it('treats a zero, negative or fractional price as no price', () => {
    expect(availabilityOf({ priceEurCents: 0, stockQty: 5 })).toBe('onRequest')
    expect(availabilityOf({ priceEurCents: -1, stockQty: 5 })).toBe('onRequest')
    expect(availabilityOf({ priceEurCents: 1.5, stockQty: 5 })).toBe('onRequest')
  })
})

describe('isOrderable / hasPrice', () => {
  it('only inStock is orderable', () => {
    expect(isOrderable({ priceEurCents: 505, stockQty: 1 })).toBe(true)
    expect(isOrderable({ priceEurCents: 505, stockQty: 0 })).toBe(false)
    expect(isOrderable({ priceEurCents: null, stockQty: 9 })).toBe(false)
  })

  it('hasPrice narrows to a number', () => {
    const item: { priceEurCents?: number | null } = { priceEurCents: 120 }
    if (hasPrice(item)) {
      const cents: number = item.priceEurCents
      expect(cents).toBe(120)
    }
    expect(hasPrice({ priceEurCents: null })).toBe(false)
  })
})
