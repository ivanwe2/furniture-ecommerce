import { describe, expect, it } from 'vitest'
import { parseCartField } from './cart'

const line = (over: Record<string, unknown> = {}) =>
  JSON.stringify([{ productSlug: 'ugli', sku: 'ABC-1', qty: 2, ...over }])

describe('parseCartField — accepts a well-formed cart', () => {
  it('parses lines and coerces a numeric-string qty', () => {
    expect(parseCartField(line())).toEqual([{ productSlug: 'ugli', sku: 'ABC-1', qty: 2 }])
    expect(parseCartField(line({ qty: '3' }))?.[0]?.qty).toBe(3)
  })

  it('drops unknown properties rather than passing them through', () => {
    const parsed = parseCartField(line({ priceEurCents: 1 }))
    expect(parsed?.[0]).not.toHaveProperty('priceEurCents')
  })
})

describe('parseCartField — rejects the inputs that used to crash the action', () => {
  // Each of these previously threw a TypeError inside submitOrder: `null` and
  // `123` on `.length`, `{"length":1}` on iteration.
  it.each([
    ['null', 'null'],
    ['a bare number', '123'],
    ['a length-alike object', '{"length":1}'],
    ['a bare JSON string', '"str"'],
    ['a JSON object', '{"productSlug":"a","sku":"b","qty":1}'],
  ])('rejects %s', (_label, raw) => {
    expect(parseCartField(raw)).toBeNull()
  })
})

describe('parseCartField — rejects malformed and non-string input', () => {
  it.each([
    ['invalid JSON', '{'],
    ['an empty string', ''],
    ['an empty array', '[]'],
  ])('rejects %s', (_label, raw) => {
    expect(parseCartField(raw)).toBeNull()
  })

  it('rejects non-string field values', () => {
    for (const raw of [undefined, null, 42, {}, []]) {
      expect(parseCartField(raw)).toBeNull()
    }
  })
})

describe('parseCartField — enforces bounds', () => {
  it('rejects more than 50 lines (each line costs a DB lookup)', () => {
    const many = (n: number) =>
      JSON.stringify(Array.from({ length: n }, (_, i) => ({ productSlug: `p${i}`, sku: `s${i}`, qty: 1 })))
    expect(parseCartField(many(50))).toHaveLength(50)
    expect(parseCartField(many(51))).toBeNull()
  })

  it('rejects out-of-range and non-integer quantities', () => {
    for (const qty of [0, -1, 1000, 1.5, Number.NaN, Infinity]) {
      expect(parseCartField(line({ qty }))).toBeNull()
    }
    expect(parseCartField(line({ qty: 999 }))?.[0]?.qty).toBe(999)
  })

  it('rejects missing, empty, wrongly-typed, or oversized identifiers', () => {
    expect(parseCartField(line({ productSlug: '' }))).toBeNull()
    expect(parseCartField(line({ sku: '   ' }))).toBeNull()
    expect(parseCartField(line({ productSlug: 42 }))).toBeNull()
    expect(parseCartField(line({ sku: null }))).toBeNull()
    expect(parseCartField(JSON.stringify([{ sku: 'x', qty: 1 }]))).toBeNull()
    expect(parseCartField(line({ productSlug: 'a'.repeat(201) }))).toBeNull()
  })
})
