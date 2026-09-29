import { describe, expect, it } from 'vitest'
import {
  MAX_ROWS,
  normalizeName,
  splitCategoryPath,
  validateImportFile,
  validateImportRecord,
  type ValidatedRow,
} from '@/lib/import/contract'

// One record exactly as the client's sample file writes it.
const sample = {
  sku: '71T3550',
  name: 'Панта Blum CLIP top BLUMOTION 110° ONIX за покрит монтаж',
  category: 'Мебелен обков > Панти > Blum Onix',
  brand: 'Blum',
  price: 3.15,
  currency: 'EUR',
  stock: 482,
  description: 'Професионална мебелна панта.',
  image_url: 'https://www.example.com/img/71t3550.jpg',
}

function keys(row: ValidatedRow) {
  return row.ok ? [] : row.errors.map((e) => e.key)
}

describe('validateImportRecord', () => {
  it('normalises a valid sample record', () => {
    const row = validateImportRecord(sample)
    expect(row.ok).toBe(true)
    if (!row.ok) return
    expect(row.record).toEqual({
      sku: '71T3550',
      name: sample.name,
      categoryPath: ['Мебелен обков', 'Панти', 'Blum Onix'],
      brand: 'Blum',
      priceEurCents: 315,
      stockQty: 482,
      description: 'Професионална мебелна панта.',
      imageUrl: 'https://www.example.com/img/71t3550.jpg',
      unit: 'бр.',
      color: null,
    })
    expect(row.warnings).toEqual([])
  })

  it('needs only sku, name, category and price', () => {
    const row = validateImportRecord({ sku: 'A1', name: 'Н', category: 'Панти', price: '2,50' })
    expect(row.ok).toBe(true)
    if (!row.ok) return
    expect(row.record).toMatchObject({ brand: null, stockQty: null, description: null, imageUrl: null, priceEurCents: 250 })
  })

  it('reports every missing required field at once', () => {
    expect(keys(validateImportRecord({}))).toEqual(['skuMissing', 'nameMissing', 'categoryMissing', 'priceMissing'])
  })

  it('rejects a row that is not an object', () => {
    expect(keys(validateImportRecord('71T3550'))).toEqual(['notObject'])
    expect(keys(validateImportRecord([sample]))).toEqual(['notObject'])
  })

  it('accepts a numeric SKU but warns about lost leading zeros', () => {
    const row = validateImportRecord({ ...sample, sku: 2718 })
    expect(row.ok && row.record.sku).toBe('2718')
    expect(row.warnings.map((w) => w.key)).toEqual(['skuNumeric'])
  })

  it('trims the SKU and rejects control characters and absurd lengths', () => {
    const trimmed = validateImportRecord({ ...sample, sku: '  71T3550 ' })
    expect(trimmed.ok && trimmed.record.sku).toBe('71T3550')
    expect(keys(validateImportRecord({ ...sample, sku: 'A\nB' }))).toEqual(['skuInvalid'])
    expect(keys(validateImportRecord({ ...sample, sku: 'X'.repeat(65) }))).toEqual(['skuInvalid'])
    expect(keys(validateImportRecord({ ...sample, sku: { a: 1 } }))).toEqual(['skuInvalid'])
  })

  it('rejects prices that are missing, zero, negative or not numbers', () => {
    for (const price of [0, -3.15, 'free', '3.15 €', true, null]) {
      const row = validateImportRecord({ ...sample, price })
      expect(row.ok, String(price)).toBe(false)
    }
    expect(keys(validateImportRecord({ ...sample, price: undefined }))).toEqual(['priceMissing'])
  })

  it('rounds a price with more than two decimals and says so', () => {
    const row = validateImportRecord({ ...sample, price: 0.6125 })
    expect(row.ok && row.record.priceEurCents).toBe(61)
    expect(row.warnings).toEqual([{ key: 'priceRounded', params: { value: '0.6125', cents: '61' } }])
  })

  it('accepts EUR in any case and rejects any other currency', () => {
    expect(validateImportRecord({ ...sample, currency: 'eur' }).ok).toBe(true)
    expect(validateImportRecord({ ...sample, currency: undefined }).ok).toBe(true)
    expect(keys(validateImportRecord({ ...sample, currency: 'BGN' }))).toEqual(['currencyInvalid'])
  })

  it('parses stock, clamps negatives to 0 with a warning, and rejects fractions', () => {
    const neg = validateImportRecord({ ...sample, stock: -4 })
    expect(neg.ok && neg.record.stockQty).toBe(0)
    expect(neg.warnings.map((w) => w.key)).toEqual(['stockNegative'])
    const text = validateImportRecord({ ...sample, stock: ' 12 ' })
    expect(text.ok && text.record.stockQty).toBe(12)
    expect(keys(validateImportRecord({ ...sample, stock: 2.5 }))).toEqual(['stockInvalid'])
    expect(keys(validateImportRecord({ ...sample, stock: 'много' }))).toEqual(['stockInvalid'])
    const missing = validateImportRecord({ ...sample, stock: undefined })
    expect(missing.ok && missing.record.stockQty).toBeNull()
  })

  it('splits the category path and enforces the 3-level limit', () => {
    const two = validateImportRecord({ ...sample, category: 'Мебелен обков >  Панти ' })
    expect(two.ok && two.record.categoryPath).toEqual(['Мебелен обков', 'Панти'])
    expect(keys(validateImportRecord({ ...sample, category: 'A > B > C > D' }))).toEqual(['categoryTooDeep'])
    expect(keys(validateImportRecord({ ...sample, category: 'A >  > C' }))).toEqual(['categoryInvalid'])
    expect(keys(validateImportRecord({ ...sample, category: '   ' }))).toEqual(['categoryMissing'])
  })

  it('validates the unit against the select values instead of coercing it', () => {
    const set = validateImportRecord({ ...sample, unit: 'компл.' })
    expect(set.ok && set.record.unit).toBe('компл.')
    expect(keys(validateImportRecord({ ...sample, unit: 'компл' }))).toEqual(['unitInvalid'])
    expect(keys(validateImportRecord({ ...sample, unit: 'кг' }))).toEqual(['unitInvalid'])
  })

  it('drops a bad image link with a warning instead of failing the row', () => {
    for (const image_url of ['not a url', 'ftp://x.com/a.jpg', 'javascript:alert(1)', 'https://user:pw@x.com/a.jpg']) {
      const row = validateImportRecord({ ...sample, image_url })
      expect(row.ok, image_url).toBe(true)
      expect(row.ok && row.record.imageUrl).toBeNull()
      expect(row.warnings.map((w) => w.key)).toEqual(['imageUrlInvalid'])
    }
  })

  it('rejects non-text values in text fields', () => {
    expect(keys(validateImportRecord({ ...sample, brand: 5 }))).toEqual(['fieldType'])
    expect(keys(validateImportRecord({ ...sample, description: ['a'] }))).toEqual(['fieldType'])
  })
})

describe('validateImportFile', () => {
  it('rejects files that are not a non-empty array within the row cap', () => {
    expect(validateImportFile({ products: [] })).toEqual({ ok: false, error: { key: 'fileNotArray' } })
    expect(validateImportFile([])).toEqual({ ok: false, error: { key: 'fileEmpty' } })
    const tooMany = validateImportFile(Array.from({ length: MAX_ROWS + 1 }, () => sample))
    expect(tooMany.ok).toBe(false)
  })

  it('flags a repeated SKU on the later row only, naming the first row', () => {
    const result = validateImportFile([sample, { ...sample, sku: 'OTHER' }, { ...sample, price: 9 }])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rows.map((r) => r.ok)).toEqual([true, true, false])
    const third = result.rows[2]
    expect(third && !third.ok && third.errors).toEqual([{ key: 'skuDuplicate', params: { row: '1' } }])
  })

  it('lists unknown keys once, sorted', () => {
    const result = validateImportFile([{ ...sample, weight: 1, ean: 'x' }, { ...sample, sku: 'B', weight: 2 }])
    expect(result.ok && result.unknownKeys).toEqual(['ean', 'weight'])
  })
})

describe('names', () => {
  it('matches names regardless of case and whitespace runs', () => {
    expect(normalizeName('  Мебелен   обков ')).toBe(normalizeName('мебелен обков'))
    expect(normalizeName('BLUM Onix')).toBe('blum onix')
  })

  it('splits a path on ">"', () => {
    expect(splitCategoryPath('A>B >  C')).toEqual(['A', 'B', 'C'])
  })
})
