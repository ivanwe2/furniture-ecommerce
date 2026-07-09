import { describe, expect, it } from 'vitest'
import type { CartLine } from './store'
import { computeTotals, filterStale } from './totals'

describe('computeTotals', () => {
  const makeResolution = () => {
    const r = new Map<string, ReturnType<typeof computeTotals>['ok'][number]>()
    r.set('prod1:SKU-A', { productSlug: 'prod1', sku: 'SKU-A', qty: 0, name: 'Item A', unit: 'бр.', priceEurCents: 3114 })
    r.set('prod1:SKU-B', { productSlug: 'prod1', sku: 'SKU-B', qty: 0, name: 'Item B', unit: 'компл.', priceEurCents: 5000 })
    return r
  }

  it('computes subtotal correctly', () => {
    const lines: CartLine[] = [
      { productSlug: 'prod1', sku: 'SKU-A', qty: 2 },
      { productSlug: 'prod1', sku: 'SKU-B', qty: 3 },
    ]
    const { ok, stale, subtotalEurCents } = computeTotals({ lines, resolution: makeResolution() })
    expect(ok).toHaveLength(2)
    expect(stale).toHaveLength(0)
    expect(subtotalEurCents).toBe(3114 * 2 + 5000 * 3) // 6228 + 15000 = 21228
  })

  it('filters stale lines when resolution missing', () => {
    const lines: CartLine[] = [
      { productSlug: 'prod1', sku: 'SKU-A', qty: 1 },
      { productSlug: 'prod1', sku: 'SKU-DELETED', qty: 2 },
    ]
    const res = makeResolution()
    const { ok, stale, subtotalEurCents } = computeTotals({ lines, resolution: res })
    expect(ok).toHaveLength(1)
    expect(stale).toHaveLength(1)
    expect(stale[0]!.sku).toBe('SKU-DELETED')
    expect(subtotalEurCents).toBe(3114)
  })

  it('clamps qty in resolved lines', () => {
    const lines: CartLine[] = [
      { productSlug: 'prod1', sku: 'SKU-A', qty: -5 },
    ]
    const { ok } = computeTotals({ lines, resolution: makeResolution() })
    expect(ok[0]!.qty).toBe(1)
  })

  it('returns empty when no lines', () => {
    const { ok, stale, subtotalEurCents } = computeTotals({ lines: [], resolution: new Map() })
    expect(ok).toHaveLength(0)
    expect(stale).toHaveLength(0)
    expect(subtotalEurCents).toBe(0)
  })
})

describe('filterStale', () => {
  it('returns only lines not in resolution', () => {
    const lines: CartLine[] = [
      { productSlug: 'prod1', sku: 'SKU-A', qty: 1 },
      { productSlug: 'prod2', sku: 'SKU-GONE', qty: 3 },
    ]
    const res = new Map<string, ReturnType<typeof computeTotals>['ok'][number]>()
    res.set('prod1:SKU-A', { productSlug: 'prod1', sku: 'SKU-A', qty: 0, name: 'A', unit: 'бр.', priceEurCents: 100 })

    const stale = filterStale(lines, res)
    expect(stale).toHaveLength(1)
    expect(stale[0]!.sku).toBe('SKU-GONE')
  })
})
