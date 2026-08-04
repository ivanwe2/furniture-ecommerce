import { describe, expect, it } from 'vitest'
import { DEFAULT_SORT, parseSort, payloadSort, SORT_KEYS } from './sort'

describe('parseSort', () => {
  it('accepts every advertised key', () => {
    for (const key of SORT_KEYS) expect(parseSort(key)).toBe(key)
  })

  it('falls back to the default for missing or unknown values', () => {
    expect(parseSort(undefined)).toBe(DEFAULT_SORT)
    expect(parseSort('')).toBe(DEFAULT_SORT)
    expect(parseSort('nonsense')).toBe(DEFAULT_SORT)
  })

  it('takes the first value when the param is repeated', () => {
    expect(parseSort(['price_desc', 'name_asc'])).toBe('price_desc')
    expect(parseSort([])).toBe(DEFAULT_SORT)
  })
})

describe('payloadSort — the injection guard', () => {
  it('maps keys to the intended Payload sort strings', () => {
    expect(payloadSort('name_asc')).toBe('name')
    expect(payloadSort('price_asc')).toBe('minPriceEurCents')
    expect(payloadSort('price_desc')).toBe('-minPriceEurCents')
    expect(payloadSort('newest')).toBe('-createdAt')
  })

  it('NEVER returns attacker-supplied input — an arbitrary field is refused', () => {
    // Forwarding `?sort=` raw would let anyone order by any column on the
    // collection, hidden ones included. Each of these must collapse to the safe
    // default rather than appearing in the returned sort string.
    for (const evil of [
      'searchText',
      '-searchText',
      'seo.title',
      'items.priceEurCents',
      '-id',
      'createdAt; DROP TABLE products',
      '__proto__',
      'constructor',
    ]) {
      expect(payloadSort(evil)).toBe(payloadSort(DEFAULT_SORT))
    }
  })

  it('only ever emits one of the four known sort strings', () => {
    const allowed = new Set(['name', 'minPriceEurCents', '-minPriceEurCents', '-createdAt'])
    for (const input of [...SORT_KEYS, 'x', undefined, '', 'toString']) {
      expect(allowed.has(payloadSort(input))).toBe(true)
    }
  })
})
