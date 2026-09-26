/**
 * The JSON product-import contract (DATA-MODEL §9) — pure validation shared by
 * the preview and apply endpoints. It never touches the database: it turns
 * one untrusted file into normalised records plus row-level issues, and the
 * server layer (run.ts) decides what each record means against the DB.
 *
 * Issues are returned as bg.ts keys (`adminImport.issues.*`) with params, so
 * the server stays testable and the admin screen owns the wording
 * (CONVENTIONS §3).
 */
import { eurCentsFromDecimal } from '@/lib/money'

export const UNITS = ['бр.', 'м', 'компл.', 'чифт'] as const
export type Unit = (typeof UNITS)[number]

/** Hard caps: a file of "low hundreds" of products is well inside these. */
export const MAX_ROWS = 2000
export const MAX_FILE_BYTES = 5 * 1024 * 1024
/** Categories are at most 3 levels deep (Categories.ts depth guard). */
export const MAX_CATEGORY_DEPTH = 3

export const KNOWN_KEYS = [
  'sku',
  'name',
  'category',
  'brand',
  'price',
  'currency',
  'stock',
  'description',
  'image_url',
  'unit',
  'color',
] as const

const MAX_LEN = {
  sku: 64,
  name: 300,
  categorySegment: 100,
  brand: 100,
  description: 10_000,
  imageUrl: 2048,
  color: 100,
} as const

export type IssueKey =
  | 'fileNotJson'
  | 'fileNotArray'
  | 'fileEmpty'
  | 'fileTooMany'
  | 'fileTooLarge'
  | 'notObject'
  | 'skuMissing'
  | 'skuInvalid'
  | 'skuNumeric'
  | 'skuDuplicate'
  | 'nameMissing'
  | 'tooLong'
  | 'fieldType'
  | 'categoryMissing'
  | 'categoryInvalid'
  | 'categoryTooDeep'
  | 'priceMissing'
  | 'priceInvalid'
  | 'priceRounded'
  | 'currencyInvalid'
  | 'stockInvalid'
  | 'stockNegative'
  | 'stockMissingNew'
  | 'unitInvalid'
  | 'imageUrlInvalid'
  | 'skuConflict'
  | 'saveFailed'
  | 'network'
  | 'unauthorized'
  | 'generic'

export type Issue = { key: IssueKey; params?: Record<string, string> }

export type ImportRecord = {
  sku: string
  name: string
  /** 1–3 category names, root first. */
  categoryPath: string[]
  brand: string | null
  priceEurCents: number
  /** null = the file did not say; creates use 0, updates leave stock alone. */
  stockQty: number | null
  description: string | null
  imageUrl: string | null
  unit: Unit
  color: string | null
}

export type ValidatedRow =
  | { ok: true; index: number; record: ImportRecord; warnings: Issue[] }
  | { ok: false; index: number; sku: string | null; name: string | null; errors: Issue[]; warnings: Issue[] }

export type ValidatedFile =
  | { ok: true; rows: ValidatedRow[]; unknownKeys: string[] }
  | { ok: false; error: Issue }

const issue = (key: IssueKey, params?: Record<string, string>): Issue =>
  params ? { key, params } : { key }

/**
 * Names compare equal when they differ only in case or whitespace runs —
 * „Панти" in the file must find the existing „Панти " category, not create a
 * second one next to it.
 */
export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('bg')
}

/** "Мебелен обков > Панти > Blum Onix" → ['Мебелен обков', 'Панти', 'Blum Onix']. */
export function splitCategoryPath(path: string): string[] {
  return path.split('>').map((segment) => segment.trim().replace(/\s+/g, ' '))
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// Control characters would survive into slugs, search text and the admin UI.
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/

/** A present-but-optional text field: undefined/null/'' → null. */
function optionalText(
  raw: Record<string, unknown>,
  key: string,
  max: number,
  errors: Issue[],
): string | null {
  const value = raw[key]
  if (value === undefined || value === null) return null
  if (typeof value !== 'string') {
    errors.push(issue('fieldType', { field: key }))
    return null
  }
  const text = value.trim()
  if (text === '') return null
  if (text.length > max) {
    errors.push(issue('tooLong', { field: key }))
    return null
  }
  return text
}

function validateRecord(raw: unknown, index: number): ValidatedRow {
  const errors: Issue[] = []
  const warnings: Issue[] = []

  if (!isPlainObject(raw)) {
    return { ok: false, index, sku: null, name: null, errors: [issue('notObject')], warnings }
  }

  // sku — text. A numeric SKU is accepted, but any leading zeros were already
  // lost when the file was written, so the owner is told to check.
  let sku: string | null = null
  const rawSku = raw.sku
  if (typeof rawSku === 'number' && Number.isSafeInteger(rawSku) && rawSku >= 0) {
    sku = String(rawSku)
    warnings.push(issue('skuNumeric'))
  } else if (typeof rawSku === 'string') {
    sku = rawSku.trim()
  } else if (rawSku !== undefined && rawSku !== null) {
    errors.push(issue('skuInvalid'))
  }
  if (sku === '' || sku === null) {
    if (errors.length === 0) errors.push(issue('skuMissing'))
    sku = null
  } else if (sku.length > MAX_LEN.sku || CONTROL_CHARS.test(sku)) {
    errors.push(issue('skuInvalid'))
  }

  // name
  let name: string | null = null
  if (typeof raw.name === 'string' && raw.name.trim() !== '') {
    name = raw.name.trim().replace(/\s+/g, ' ')
    if (name.length > MAX_LEN.name) errors.push(issue('tooLong', { field: 'name' }))
  } else if (raw.name !== undefined && raw.name !== null && typeof raw.name !== 'string') {
    errors.push(issue('fieldType', { field: 'name' }))
  } else {
    errors.push(issue('nameMissing'))
  }

  // category — a "Root > Child > Leaf" name path, created on import if missing.
  let categoryPath: string[] = []
  if (typeof raw.category === 'string' && raw.category.trim() !== '') {
    categoryPath = splitCategoryPath(raw.category)
    if (categoryPath.some((segment) => segment === '')) {
      errors.push(issue('categoryInvalid'))
    } else if (categoryPath.length > MAX_CATEGORY_DEPTH) {
      errors.push(issue('categoryTooDeep'))
    } else if (categoryPath.some((segment) => segment.length > MAX_LEN.categorySegment)) {
      errors.push(issue('tooLong', { field: 'category' }))
    }
  } else if (raw.category !== undefined && raw.category !== null && typeof raw.category !== 'string') {
    errors.push(issue('fieldType', { field: 'category' }))
  } else {
    errors.push(issue('categoryMissing'))
  }

  const brand = optionalText(raw, 'brand', MAX_LEN.brand, errors)

  // price — euro, VAT-inclusive final price (Ivan, 2026-09-24).
  let priceEurCents = 0
  const rawPrice = raw.price
  if (rawPrice === undefined || rawPrice === null || rawPrice === '') {
    errors.push(issue('priceMissing'))
  } else if (typeof rawPrice !== 'number' && typeof rawPrice !== 'string') {
    errors.push(issue('priceInvalid', { value: JSON.stringify(rawPrice) }))
  } else {
    const parsed = eurCentsFromDecimal(rawPrice)
    if (!parsed || parsed.cents < 1) {
      errors.push(issue('priceInvalid', { value: String(rawPrice) }))
    } else {
      priceEurCents = parsed.cents
      if (parsed.rounded) {
        warnings.push(issue('priceRounded', { value: String(rawPrice), cents: String(parsed.cents) }))
      }
    }
  }

  // currency — optional, but when present it must be euro: the catalogue
  // stores euro cents only (CLAUDE rule 4), so anything else is an error, not
  // something to convert.
  if (raw.currency !== undefined && raw.currency !== null && raw.currency !== '') {
    const currency = typeof raw.currency === 'string' ? raw.currency.trim().toUpperCase() : ''
    if (currency !== 'EUR') errors.push(issue('currencyInvalid', { value: String(raw.currency) }))
  }

  // stock — whole pieces. Negative stock is common in stock programs; the
  // field is min 0, so it is clamped rather than failing the whole row.
  let stockQty: number | null = null
  const rawStock = raw.stock
  if (rawStock !== undefined && rawStock !== null && rawStock !== '') {
    const n = typeof rawStock === 'string' && /^-?\d+$/.test(rawStock.trim()) ? Number(rawStock.trim()) : rawStock
    if (typeof n !== 'number' || !Number.isSafeInteger(n) || n > 1_000_000) {
      errors.push(issue('stockInvalid', { value: String(rawStock) }))
    } else if (n < 0) {
      warnings.push(issue('stockNegative', { value: String(n) }))
      stockQty = 0
    } else {
      stockQty = n
    }
  }

  const description = optionalText(raw, 'description', MAX_LEN.description, errors)

  // image_url — optional and never fatal: a bad link skips the picture, not
  // the product.
  let imageUrl: string | null = null
  const rawUrl = optionalText(raw, 'image_url', MAX_LEN.imageUrl, errors)
  if (rawUrl) {
    let url: URL | null = null
    try {
      url = new URL(rawUrl)
    } catch {
      url = null
    }
    if (url && (url.protocol === 'http:' || url.protocol === 'https:') && !url.username && !url.password) {
      imageUrl = url.href
    } else {
      warnings.push(issue('imageUrlInvalid'))
    }
  }

  // unit — optional; must be one of the select values when given. Never
  // coerced: a set priced as "компл" shown per piece is a pricing error.
  let unit: Unit = 'бр.'
  const rawUnit = optionalText(raw, 'unit', 20, errors)
  if (rawUnit !== null) {
    const match = UNITS.find((u) => u === rawUnit)
    if (match) unit = match
    else errors.push(issue('unitInvalid', { value: rawUnit }))
  }

  const color = optionalText(raw, 'color', MAX_LEN.color, errors)

  if (errors.length > 0 || sku === null || name === null) {
    return { ok: false, index, sku, name, errors, warnings }
  }
  return {
    ok: true,
    index,
    record: { sku, name, categoryPath, brand, priceEurCents, stockQty, description, imageUrl, unit, color },
    warnings,
  }
}

/**
 * Validate a whole parsed file. File-level problems (not an array, empty, too
 * many rows) reject the file; everything else is reported per row so one bad
 * row never blocks the rest.
 */
export function validateImportFile(input: unknown): ValidatedFile {
  if (!Array.isArray(input)) return { ok: false, error: issue('fileNotArray') }
  if (input.length === 0) return { ok: false, error: issue('fileEmpty') }
  if (input.length > MAX_ROWS) {
    return { ok: false, error: issue('fileTooMany', { max: String(MAX_ROWS) }) }
  }

  const known = new Set<string>(KNOWN_KEYS)
  const unknownKeys = new Set<string>()
  const firstRowBySku = new Map<string, number>()

  const rows = input.map((raw, index) => {
    if (isPlainObject(raw)) {
      for (const key of Object.keys(raw)) if (!known.has(key)) unknownKeys.add(key)
    }
    const row = validateRecord(raw, index)
    const sku = row.ok ? row.record.sku : row.sku
    if (sku === null) return row
    const first = firstRowBySku.get(sku)
    if (first === undefined) {
      firstRowBySku.set(sku, index)
      return row
    }
    // A repeated SKU would silently overwrite the first row's price and stock.
    const duplicate = issue('skuDuplicate', { row: String(first + 1) })
    return row.ok
      ? { ok: false as const, index, sku, name: row.record.name, errors: [duplicate], warnings: row.warnings }
      : { ...row, errors: [...row.errors, duplicate] }
  })

  return { ok: true, rows, unknownKeys: [...unknownKeys].sort() }
}

/** Validate a single record (the apply endpoint re-validates every row it is sent). */
export function validateImportRecord(raw: unknown): ValidatedRow {
  return validateRecord(raw, 0)
}
