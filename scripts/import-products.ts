import 'server-only'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { getPayload, type Payload } from 'payload'
import config from '@payload-config'
import { eurCentsFromBgnCents } from '@/lib/money'
import { slugify } from '@/lib/slug'

// ── Types ───────────────────────────────────────────────────────────

const VALID_UNITS = ['бр.', 'м', 'компл.', 'чифт'] as const
type ValidUnit = (typeof VALID_UNITS)[number]

type CsvRow = {
  rowNum: number
  category_slug: string
  brand: string
  product_name: string
  item_name: string
  sku: string
  unit: string
  length_mm: string
  color: string
  price_bgn: string
  price_eur: string
}

type ProductGroup = {
  productName: string
  rows: CsvRow[]
}

type ImportStats = {
  productsCreated: number
  itemsCreated: number
  itemsUpdated: number
  itemsSkipped: number
  brandsCreated: number
  errors: string[]
}

type ItemRow = {
  name: string
  sku: string
  unit?: ValidUnit | null
  lengthMm?: number | null
  color?: string | null
  priceEurCents: number
  inStock?: boolean | null
  id?: string | null
}

type ProductDoc = {
  id: number
  name: string
  items: ItemRow[]
}

// ── CSV parsing ─────────────────────────────────────────────────────

function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '')
  if (lines.length < 2) throw new Error('CSV has no data rows')

  const headerLine = lines[0]
  if (!headerLine) throw new Error('CSV has no header line')
  const header = headerLine.split(',').map((h) => h.trim().toLowerCase())
  const expected = [
    'category_slug',
    'brand',
    'product_name',
    'item_name',
    'sku',
    'unit',
    'length_mm',
    'color',
    'price_bgn',
    'price_eur',
  ]

  for (const col of expected) {
    if (!header.includes(col)) throw new Error(`Missing header column: ${col}`)
  }

  const rows: CsvRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue
    const values = splitCsvLine(line)
    if (values.length !== header.length) {
      rows.push({
        rowNum: i + 1,
        category_slug: '',
        brand: '',
        product_name: '',
        item_name: '',
        sku: '',
        unit: '',
        length_mm: '',
        color: '',
        price_bgn: '',
        price_eur: '',
      })
      continue
    }
    const row: Record<string, string> = {}
    for (let j = 0; j < header.length; j++) {
      const h = header[j]
      if (!h) continue
      const v = values[j]
      if (v !== undefined) row[h] = v.trim()
    }
    rows.push({
      rowNum: i + 1,
      category_slug: row.category_slug ?? '',
      brand: row.brand ?? '',
      product_name: row.product_name ?? '',
      item_name: row.item_name ?? '',
      sku: row.sku ?? '',
      unit: row.unit ?? '',
      length_mm: row.length_mm ?? '',
      color: row.color ?? '',
      price_bgn: row.price_bgn ?? '',
      price_eur: row.price_eur ?? '',
    })
  }
  return rows
}

function splitCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        result.push(current)
        current = ''
      } else {
        current += ch
      }
    }
  }
  result.push(current)
  return result
}

// ── Price resolution ────────────────────────────────────────────────

function resolvePriceEurCents(priceBgn: string, priceEur: string): number {
  if (priceBgn && priceEur) {
    throw new Error('Both price_bgn and price_eur are set — exactly one required')
  }
  if (!priceBgn && !priceEur) {
    throw new Error('Neither price_bgn nor price_eur is set — exactly one required')
  }

  if (priceBgn) {
    const bgnValue = Number(priceBgn)
    if (!Number.isFinite(bgnValue) || bgnValue <= 0) {
      throw new Error(`Invalid BGN price: ${priceBgn}`)
    }
    // Convert BGN to EUR cents: (bgnValue * 100) / BGN_PER_EUR, half-up
    const bgnCents = Math.round(bgnValue * 100)
    return eurCentsFromBgnCents(bgnCents)
  }

  const eurValue = Number(priceEur)
  if (!Number.isFinite(eurValue) || eurValue <= 0) {
    throw new Error(`Invalid EUR price: ${priceEur}`)
  }
  return Math.round(eurValue * 100)
}

// ── Grouping consecutive rows into product families ─────────────────

function groupConsecutiveRows(rows: CsvRow[]): ProductGroup[] {
  const groups: ProductGroup[] = []
  let current: ProductGroup | null = null

  for (const row of rows) {
    if (!current || current.productName !== row.product_name) {
      current = { productName: row.product_name, rows: [row] }
      groups.push(current)
    } else {
      current.rows.push(row)
    }
  }

  return groups
}

// ── Non-consecutive duplicate detection ─────────────────────────────

function detectNonConsecutiveDuplicates(rows: CsvRow[]): string[] {
  const seen = new Map<string, number>()
  const errors: string[] = []

  for (const row of rows) {
    if (!row.product_name) continue
    if (seen.has(row.product_name)) {
      errors.push(
        `Row ${row.rowNum}: product "${row.product_name}" appeared previously at row ${seen.get(row.product_name)!} — non-consecutive duplicates are not allowed`,
      )
    } else {
      seen.set(row.product_name, row.rowNum)
    }
  }

  return errors
}

// ── Main import logic ───────────────────────────────────────────────

async function runImport(csvPath: string, dryRun: boolean): Promise<ImportStats> {
  const stats: ImportStats = {
    productsCreated: 0,
    itemsCreated: 0,
    itemsUpdated: 0,
    itemsSkipped: 0,
    brandsCreated: 0,
    errors: [],
  }

  const p = await getPayload({ config })

  // Build category lookup
  const allCategories = await p.find({
    collection: 'categories',
    depth: 0,
    where: {},
  })
  const categoryMap = new Map<string, number>()
  for (const cat of allCategories.docs) {
    if (cat.slug) categoryMap.set(cat.slug.toLowerCase(), cat.id)
  }

  // Build brand lookup
  const allBrands = await p.find({
    collection: 'brands',
    depth: 0,
    where: {},
  })
  const brandMap = new Map<string, number>()
  for (const brand of allBrands.docs) {
    brandMap.set(brand.name.toLowerCase(), brand.id)
  }

  // Read and parse CSV
  const csvText = readFileSync(csvPath, 'utf-8')
  let rows: CsvRow[]
  try {
    rows = parseCsv(csvText)
  } catch (e) {
    stats.errors.push(`CSV parse error: ${e instanceof Error ? e.message : String(e)}`)
    return stats
  }

  // Check for non-consecutive duplicates before grouping
  const dupErrors = detectNonConsecutiveDuplicates(rows)
  stats.errors.push(...dupErrors)

  const groups = groupConsecutiveRows(rows)

  for (const group of groups) {
    try {
      await processProductGroup(p, group, categoryMap, brandMap, stats, dryRun)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      const firstRow = group.rows[0]
      stats.errors.push(`Row ${firstRow?.rowNum ?? '?'}: ${msg}`)
    }
  }

  return stats
}

async function processProductGroup(
  p: Payload,
  group: ProductGroup,
  categoryMap: Map<string, number>,
  brandMap: Map<string, number>,
  stats: ImportStats,
  dryRun: boolean,
): Promise<void> {
  const { productName, rows } = group
  const firstRow = rows[0]
  if (!firstRow) {
    throw new Error('Group has no rows')
  }
  if (!productName || !firstRow.sku) {
    throw new Error('product_name and sku are required')
  }

  // Validate category
  const catId = categoryMap.get(firstRow.category_slug.toLowerCase())
  if (!catId) {
    throw new Error(`Category "${firstRow.category_slug}" does not exist`)
  }

  // Resolve or create brand
  let brandId: number | null = null
  if (firstRow.brand.trim()) {
    const existingBrandId = brandMap.get(firstRow.brand.toLowerCase())
    if (existingBrandId) {
      brandId = existingBrandId
    } else {
      const newBrand = await p.create({
        collection: 'brands',
        data: {
          name: firstRow.brand.trim(),
          slug: slugify(firstRow.brand.trim()),
        },
        draft: false,
      })
      brandId = newBrand.id
      stats.brandsCreated++
    }
  }

  // Check if product already exists (by name + category)
  const existingProduct = await p.find({
    collection: 'products',
    depth: 0,
    where: {
      and: [
        { name: { equals: productName } },
        { category: { equals: catId } },
      ],
    },
  })

  const productDoc = existingProduct.docs[0] ?? null
  const existingItems = (productDoc as ProductDoc | null)?.items ?? []
  const skuToItemIndex = new Map<string, number>()
  for (let i = 0; i < existingItems.length; i++) {
    const item = existingItems[i]
    if (item?.sku) {
      skuToItemIndex.set(item.sku, i)
    }
  }

  const productSlug = slugify(productName)

  // Process each row in the group
  for (const row of rows) {
    try {
      await processRow(p, row, catId, brandId, productSlug, productName, productDoc as ProductDoc | null, skuToItemIndex, stats, dryRun)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      stats.errors.push(`Row ${row.rowNum}: ${msg}`)
    }
  }
}

async function processRow(
  p: Payload,
  row: CsvRow,
  catId: number,
  brandId: number | null,
  productSlug: string,
  productName: string,
  existingProduct: ProductDoc | null,
  skuToItemIndex: Map<string, number>,
  stats: ImportStats,
  dryRun: boolean,
): Promise<void> {
  const sku = row.sku.trim()
  if (!sku) {
    throw new Error('SKU is required')
  }

  // Resolve price
  let eurCents: number
  try {
    eurCents = resolvePriceEurCents(row.price_bgn, row.price_eur)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(`Price error: ${msg}`)
  }

  // Resolve unit
  const rawUnit = row.unit.trim() || 'бр.'
  const unit: ValidUnit = (VALID_UNITS as unknown as string[]).includes(rawUnit) ? (rawUnit as ValidUnit) : 'бр.'

  // Build item data
  const itemData: ItemRow = {
    name: row.item_name.trim() || `${productName} — ${sku}`,
    sku,
    unit,
    lengthMm: row.length_mm ? Number(row.length_mm) : null,
    color: row.color.trim() || null,
    priceEurCents: eurCents,
    inStock: true,
  }

  // Check if SKU already exists
  const existingIndex = skuToItemIndex.get(sku)
  if (existingIndex !== undefined && existingProduct) {
    // Update existing item row
    const existingItems = existingProduct.items
    const existingItem = existingItems[existingIndex]
    if (!existingItem) {
      throw new Error(`Existing item not found at index ${existingIndex}`)
    }
    if (
      existingItem.name === itemData.name &&
      existingItem.unit === itemData.unit &&
      existingItem.lengthMm === itemData.lengthMm &&
      existingItem.color === itemData.color &&
      existingItem.priceEurCents === itemData.priceEurCents
    ) {
      stats.itemsSkipped++
      return
    }
    if (!dryRun) {
      const prodItems = existingProduct.items
      const updatedItems = [...prodItems]
      updatedItems[existingIndex] = { ...updatedItems[existingIndex], ...itemData }
      await p.update({
        collection: 'products',
        id: existingProduct.id,
        data: { items: updatedItems },
        draft: false,
      })
    }
    stats.itemsUpdated++
    return
  }

  // New SKU — add to product or create new product
  if (existingProduct) {
    const existingProd = existingProduct
    // Add item to existing product
    if (!dryRun) {
      await p.update({
        collection: 'products',
        id: existingProd.id,
        data: { items: [...existingProd.items, itemData] },
        draft: false,
      })
    }
    stats.itemsCreated++
  } else {
    // Create new product
    if (!dryRun) {
      await p.create({
        collection: 'products',
        data: {
          name: productName,
          slug: productSlug,
          status: 'draft',
          category: catId,
          brand: brandId ?? undefined,
          items: [itemData],
        },
        draft: false,
      })
    }
    stats.productsCreated++
    stats.itemsCreated++
  }
}

// ── Report generation ───────────────────────────────────────────────

function generateReport(stats: ImportStats, dryRun: boolean): string {
  const lines = [
    '=== Nasteh BG Import Report ===',
    `Date: ${new Date().toISOString()}`,
    `Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`,
    '',
    '--- Summary ---',
    `Products created: ${stats.productsCreated}`,
    `Items created: ${stats.itemsCreated}`,
    `Items updated: ${stats.itemsUpdated}`,
    `Items skipped: ${stats.itemsSkipped}`,
    `Brands created: ${stats.brandsCreated}`,
    '',
  ]

  if (stats.errors.length > 0) {
    lines.push('--- Errors ---')
    for (const error of stats.errors) {
      lines.push(`  ${error}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

// ── CLI entry ───────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  if (args.length < 1) {
    console.error('Usage: pnpm import-products <csv-path> [--dry]')
    process.exit(1)
  }

  const csvPath = args[0]
  if (!csvPath) {
    console.error('Error: CSV path is required')
    process.exit(1)
  }

  let dryRun = false

  for (let i = 1; i < args.length; i++) {
    const arg = args[i]
    if (!arg) continue
    if (arg === '--dry') {
      dryRun = true
    } else {
      console.error(`Unknown argument: ${arg}`)
      process.exit(1)
    }
  }

  const absolutePath = resolve(csvPath)
  if (!absolutePath.endsWith('.csv')) {
    console.error('Error: file must have .csv extension')
    process.exit(1)
  }

  console.log(`[import] Starting ${dryRun ? 'DRY RUN' : 'LIVE'} import from ${absolutePath}`)

  const stats = await runImport(absolutePath, dryRun)
  const report = generateReport(stats, dryRun)

  // Write report
  const reportPath = resolve(__dirname, 'import-report.txt')
  writeFileSync(reportPath, report, 'utf-8')
  console.log(`[import] Report written to ${reportPath}`)

  // Print summary
  if (stats.errors.length > 0) {
    console.error('[import] Errors encountered:')
    for (const error of stats.errors) {
      console.error(`  - ${error}`)
    }
  }

  console.log(`[import] Done — ${stats.productsCreated} products, ${stats.itemsCreated} items created, ${stats.itemsUpdated} updated`)
}

main().catch((e) => {
  console.error('[import] Fatal error:', e)
  process.exit(1)
})
