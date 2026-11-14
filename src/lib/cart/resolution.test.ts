import { describe, expect, it } from 'vitest'
import { cartResolutionFrom } from './resolution'

describe('cartResolutionFrom', () => {
  const products = [
    {
      slug: 'panta',
      items: [
        { name: 'Стандартна', sku: 'A1', unit: null, priceEurCents: null, stockQty: 5 },
        { name: 'С дюбел', sku: 'A2', unit: 'бр.', priceEurCents: 505, stockQty: 0 },
        { name: 'Покрита', sku: 'A3', unit: 'компл.', priceEurCents: 669, stockQty: 2 },
      ],
    },
    { slug: null, items: [{ name: 'x', sku: 'Z', priceEurCents: 1, stockQty: 1 }] },
  ]

  it('keys lines by slug:sku with the stored price and stock state', () => {
    const r = cartResolutionFrom(products, 'бр.')
    expect(r.get('panta:A2')).toEqual({
      productSlug: 'panta', sku: 'A2', name: 'С дюбел', unit: 'бр.', priceEurCents: 505, inStock: false,
    })
    expect(r.get('panta:A3')?.inStock).toBe(true)
    expect(r.get('panta:A3')?.unit).toBe('компл.')
  })

  it('leaves out price-on-request items, so the cart treats them as unavailable', () => {
    const r = cartResolutionFrom(products, 'бр.')
    expect(r.has('panta:A1')).toBe(false)
  })

  it('skips products without a slug', () => {
    expect(cartResolutionFrom(products, 'бр.').size).toBe(2)
  })
})
