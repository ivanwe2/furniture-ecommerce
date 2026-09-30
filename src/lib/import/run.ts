// No `import 'server-only'`: this module is reachable from payload.config.ts
// (Products → import endpoints), which the Payload CLI loads outside Next —
// `payload migrate` on container start would throw (same reason as
// revalidate.ts; PROGRESS Notes). It is still server-only in practice: no
// client component imports it.
import { buildEditorState, type DefaultNodeTypes } from '@payloadcms/richtext-lexical'
import type { Payload } from 'payload'
import type {
  ApplyRequest,
  ApplyResponse,
  CategoryStep,
  ImageOutcome,
  ImageUploadResponse,
  PreviewResponse,
  PreviewRow,
  RowChanges,
} from '@/lib/import/api'
import {
  normalizeName,
  validateImportFile,
  validateImportRecord,
  type ImportRecord,
  type Issue,
} from '@/lib/import/contract'
import { downloadImage, toStoredImage, type StoredImage } from '@/lib/import/fetch-image'
import { checkMediaStorage } from '@/lib/import/media-storage'
import { slugify } from '@/lib/slug'
import type { Media, Product } from '@/payload-types'

/**
 * The product importer against the database (DATA-MODEL §9). Two passes over
 * the same rules:
 * - previewImport: read-only; says what each row WILL do.
 * - applyImportRecord: does it for ONE row. The admin screen calls it once per
 *   row, so no request outlives the reverse proxy's timeout, and a closed tab
 *   leaves a clean prefix that a re-run completes (the upsert is idempotent).
 *
 * Field ownership (Ivan, 2026-09-24): a NEW SKU creates a complete draft
 * product. An EXISTING SKU only gets its price and stock refreshed, plus a
 * picture if it has none — the name, description, category, photos and
 * publish status belong to the owner once the product exists, so re-running a
 * file never undoes their edits.
 */

/** Where Payload writes uploads (Media.ts `upload.staticDir`, i.e. MEDIA_DIR). */
function mediaDir(payload: Payload): string {
  const { upload } = payload.collections.media.config
  return (upload && upload.staticDir) || 'media'
}

type CategoryRow = { id: number; name: string; slug: string | null; parentId: number | null }

async function loadCategories(payload: Payload): Promise<CategoryRow[]> {
  const { docs } = await payload.find({ collection: 'categories', depth: 0, pagination: false })
  return docs.map((doc) => ({
    id: doc.id,
    name: doc.name,
    slug: doc.slug ?? null,
    parentId: typeof doc.parent === 'object' && doc.parent !== null ? doc.parent.id : (doc.parent ?? null),
  }))
}

/** Walk a name path from the root; stops at the first segment that doesn't exist yet. */
function walkPath(
  categories: CategoryRow[],
  path: string[],
): { steps: CategoryStep[]; lastExistingId: number | null; missingFrom: number } {
  const steps: CategoryStep[] = []
  let parentId: number | null = null
  let missingFrom = -1
  for (const [i, name] of path.entries()) {
    const match =
      missingFrom === -1
        ? categories.find((c) => c.parentId === parentId && normalizeName(c.name) === normalizeName(name))
        : undefined
    if (match) {
      parentId = match.id
      steps.push({ name: match.name, exists: true })
    } else {
      if (missingFrom === -1) missingFrom = i
      steps.push({ name, exists: false })
    }
  }
  return { steps, lastExistingId: parentId, missingFrom }
}

async function loadBrands(payload: Payload) {
  const { docs } = await payload.find({ collection: 'brands', depth: 0, pagination: false })
  return new Map(docs.map((doc) => [normalizeName(doc.name), { id: doc.id, name: doc.name }]))
}

type SkuHit = { product: Product; item: NonNullable<Product['items']>[number] }

async function findBySkus(payload: Payload, skus: string[]): Promise<Map<string, SkuHit[]>> {
  const hits = new Map<string, SkuHit[]>()
  if (skus.length === 0) return hits
  const wanted = new Set(skus)
  const { docs } = await payload.find({
    collection: 'products',
    depth: 0,
    pagination: false,
    where: { 'items.sku': { in: skus } },
  })
  for (const product of docs) {
    for (const item of product.items ?? []) {
      if (!wanted.has(item.sku)) continue
      hits.set(item.sku, [...(hits.get(item.sku) ?? []), { product, item }])
    }
  }
  return hits
}

function changesFor(record: ImportRecord, hit: SkuHit): RowChanges {
  const changes: RowChanges = {}
  if (hit.item.priceEurCents !== record.priceEurCents) {
    changes.price = { from: hit.item.priceEurCents, to: record.priceEurCents }
  }
  const currentStock = hit.item.stockQty ?? 0
  if (record.stockQty !== null && currentStock !== record.stockQty) {
    changes.stock = { from: currentStock, to: record.stockQty }
  }
  if (record.imageUrl && (hit.product.gallery ?? []).length === 0) changes.image = true
  return changes
}

// ── Preview ──────────────────────────────────────────────────────────

export async function previewImport(payload: Payload, input: unknown): Promise<PreviewResponse> {
  const file = validateImportFile(input)
  if (!file.ok) return file

  const valid = file.rows.flatMap((row) => (row.ok ? [row.record] : []))
  const [categories, brands, hits, mediaStorage] = await Promise.all([
    loadCategories(payload),
    loadBrands(payload),
    findBySkus(payload, valid.map((r) => r.sku)),
    checkMediaStorage(mediaDir(payload)),
  ])

  const newCategoryPaths = new Set<string>()
  const newBrands = new Set<string>()

  const rows = file.rows.map((row): PreviewRow => {
    if (!row.ok) {
      return { status: 'error', index: row.index, sku: row.sku, name: row.name, errors: row.errors, warnings: row.warnings }
    }
    const { record } = row
    const found = hits.get(record.sku) ?? []
    if (found.length > 1) {
      return { status: 'error', index: row.index, sku: record.sku, name: record.name, errors: [{ key: 'skuConflict' }], warnings: row.warnings }
    }
    const [hit] = found
    if (hit) {
      const changes = changesFor(record, hit)
      return {
        status: Object.keys(changes).length > 0 ? 'update' : 'unchanged',
        index: row.index,
        sku: record.sku,
        name: record.name,
        productId: hit.product.id,
        productName: hit.product.name,
        changes,
        imageUrl: record.imageUrl,
        warnings: row.warnings,
      }
    }

    const { steps } = walkPath(categories, record.categoryPath)
    steps.forEach((step, i) => {
      if (!step.exists) newCategoryPaths.add(record.categoryPath.slice(0, i + 1).map(normalizeName).join('>'))
    })
    const brand = record.brand ? { name: record.brand, exists: brands.has(normalizeName(record.brand)) } : null
    if (brand && !brand.exists) newBrands.add(normalizeName(brand.name))
    const warnings: Issue[] = record.stockQty === null ? [...row.warnings, { key: 'stockMissingNew' }] : row.warnings

    return {
      status: 'create',
      index: row.index,
      sku: record.sku,
      name: record.name,
      categoryPath: steps,
      brand,
      priceEurCents: record.priceEurCents,
      stockQty: record.stockQty ?? 0,
      imageUrl: record.imageUrl,
      warnings,
    }
  })

  return {
    ok: true,
    rows,
    unknownKeys: file.unknownKeys,
    newCategories: newCategoryPaths.size,
    newBrands: newBrands.size,
    mediaStorage,
  }
}

// ── Apply (one row) ──────────────────────────────────────────────────

/** The first unused slug among `candidates`, then `${candidates[0]}-2`, `-3`, … */
async function freeSlug(
  payload: Payload,
  collection: 'categories' | 'brands' | 'products',
  candidates: string[],
): Promise<string> {
  const usable = candidates.filter((c) => c !== '')
  const root = usable[0] ?? collection
  const all = [...(usable.length > 0 ? usable : [root])]
  for (let n = 2; all.length < 12; n++) all.push(`${root}-${n}`)
  for (const slug of all) {
    const { totalDocs } = await payload.count({ collection, where: { slug: { equals: slug } } })
    if (totalDocs === 0) return slug
  }
  throw new Error(`No free slug for "${root}"`)
}

/** Resolve the category path, creating the missing tail. Returns the leaf id. */
async function ensureCategory(payload: Payload, path: string[]): Promise<number> {
  const categories = await loadCategories(payload)
  const { lastExistingId, missingFrom } = walkPath(categories, path)
  if (missingFrom === -1 && lastExistingId !== null) return lastExistingId

  let parentId = lastExistingId
  let parentSlug = categories.find((c) => c.id === parentId)?.slug ?? ''
  for (const name of path.slice(missingFrom)) {
    // Same-named categories under different parents ("Аксесоари") are
    // disambiguated by the parent's slug.
    const base = slugify(name)
    const slug = await freeSlug(payload, 'categories', [base, parentSlug ? `${parentSlug}-${base}` : ''])
    const created = await payload.create({
      collection: 'categories',
      data: { name, slug, ...(parentId !== null ? { parent: parentId } : {}) },
    })
    parentId = created.id
    parentSlug = created.slug ?? slug
  }
  if (parentId === null) throw new Error('Category path resolved to nothing')
  return parentId
}

async function ensureBrand(payload: Payload, name: string): Promise<number> {
  const existing = (await loadBrands(payload)).get(normalizeName(name))
  if (existing) return existing.id
  const slug = await freeSlug(payload, 'brands', [slugify(name)])
  const created = await payload.create({ collection: 'brands', data: { name, slug } })
  return created.id
}

/** Plain text → a complete Lexical state, one paragraph per line (never a bare string: PROGRESS #39). */
function descriptionState(text: string) {
  const paragraphs = text
    .split(/\r?\n/)
    .map((p) => p.trim())
    .filter((p) => p !== '')
  if (paragraphs.length === 0) return null
  return buildEditorState<DefaultNodeTypes>({
    nodes: paragraphs.map((p) => ({
      type: 'paragraph' as const,
      version: 1,
      direction: 'ltr' as const,
      format: '' as const,
      indent: 0,
      textFormat: 0,
      textStyle: '',
      children: [{ type: 'text' as const, version: 1, text: p, detail: 0, format: 0, mode: 'normal' as const, style: '' }],
    })),
  })
}

async function storeMedia(payload: Payload, image: StoredImage, alt: string, sku: string): Promise<Media> {
  return payload.create({
    collection: 'media',
    data: { alt },
    file: {
      data: image.data,
      mimetype: image.mimetype,
      name: `${slugify(sku) || 'product'}.${image.ext}`,
      size: image.data.length,
    },
  })
}

async function appendToGallery(payload: Payload, productId: number, mediaId: number) {
  const product = await payload.findByID({ collection: 'products', id: productId, depth: 0 })
  const gallery = (product.gallery ?? []).map((g) => ({
    image: typeof g.image === 'object' ? g.image.id : g.image,
    ...(g.id ? { id: g.id } : {}),
  }))
  await payload.update({ collection: 'products', id: productId, data: { gallery: [...gallery, { image: mediaId }] } })
}

/** Give the product a picture if it has none: reuse, download, or report why not. */
async function attachImage(
  payload: Payload,
  product: Product,
  record: ImportRecord,
  request: ApplyRequest,
): Promise<ImageOutcome> {
  if (!record.imageUrl) return { kind: 'none' }
  if ((product.gallery ?? []).length > 0) return { kind: 'kept' }
  if (request.previousFailure) return { kind: 'failed', reason: request.previousFailure }

  // The product is already saved at this point, so nothing below may throw:
  // an image problem is reported on the row, never as a failed product.
  try {
    if (typeof request.reuseMediaId === 'number') {
      const media = await payload.findByID({ collection: 'media', id: request.reuseMediaId, depth: 0, disableErrors: true })
      if (media) {
        await appendToGallery(payload, product.id, media.id)
        return { kind: 'attached', mediaId: media.id }
      }
    }

    // No point downloading what cannot be saved: report the storage problem.
    const storage = await checkMediaStorage(mediaDir(payload))
    if (!storage.ok) return { kind: 'failed', reason: 'storeFailed' }

    const downloaded = await downloadImage(record.imageUrl)
    if (!downloaded.ok) return { kind: 'failed', reason: downloaded.reason }
    const media = await storeMedia(payload, downloaded.image, record.name, record.sku)
    await appendToGallery(payload, product.id, media.id)
    return { kind: 'attached', mediaId: media.id }
  } catch (err) {
    // Not the link's fault: the bytes were a valid image (sharp decoded them
    // in downloadImage) — saving failed. Reporting this as „not an image"
    // once hid a production media-folder permission problem.
    console.error('[import] storing image failed', record.sku, err instanceof Error ? err.message : err)
    return { kind: 'failed', reason: 'storeFailed' }
  }
}

function saveFailed(err: unknown): ApplyResponse {
  const message = err instanceof Error ? err.message : String(err)
  return { ok: false, error: { key: 'saveFailed', params: { message } } }
}

export async function applyImportRecord(payload: Payload, request: ApplyRequest): Promise<ApplyResponse> {
  const row = validateImportRecord(request.record)
  if (!row.ok) return { ok: false, error: row.errors[0] ?? { key: 'generic' } }
  const { record } = row

  const found = (await findBySkus(payload, [record.sku])).get(record.sku) ?? []
  if (found.length > 1) return { ok: false, error: { key: 'skuConflict' } }
  const [hit] = found

  // Existing SKU: refresh price/stock on that one item row, nothing else.
  if (hit) {
    const changes = changesFor(record, hit)
    let product = hit.product
    try {
      if (changes.price || changes.stock) {
        const items = (product.items ?? []).map((item) =>
          item.sku === record.sku
            ? {
                ...item,
                priceEurCents: record.priceEurCents,
                ...(record.stockQty !== null ? { stockQty: record.stockQty } : {}),
              }
            : item,
        )
        product = await payload.update({ collection: 'products', id: product.id, data: { items } })
      }
    } catch (err) {
      return saveFailed(err)
    }
    const image = await attachImage(payload, product, record, request)
    const changed = Boolean(changes.price || changes.stock || image.kind === 'attached')
    return { ok: true, status: changed ? 'updated' : 'unchanged', productId: product.id, image }
  }

  // New SKU: a complete draft product, then (best effort) its picture.
  let product: Product
  try {
    const [categoryId, brandId] = await Promise.all([
      ensureCategory(payload, record.categoryPath),
      record.brand ? ensureBrand(payload, record.brand) : Promise.resolve(null),
    ])
    // Two products may share a name; the SKU makes the second URL unique.
    const base = slugify(record.name)
    const slug = await freeSlug(payload, 'products', [base, `${base}-${slugify(record.sku)}`])
    product = await payload.create({
      collection: 'products',
      data: {
        name: record.name,
        slug,
        status: 'draft',
        category: categoryId,
        ...(brandId !== null ? { brand: brandId } : {}),
        description: record.description ? descriptionState(record.description) : null,
        items: [
          {
            name: record.name,
            sku: record.sku,
            unit: record.unit,
            color: record.color,
            priceEurCents: record.priceEurCents,
            stockQty: record.stockQty ?? 0,
          },
        ],
      },
    })
  } catch (err) {
    return saveFailed(err)
  }
  const image = await attachImage(payload, product, record, request)
  return { ok: true, status: 'created', productId: product.id, image }
}

// ── Manual image (for rows whose download failed) ───────────────────

export async function attachUploadedImage(
  payload: Payload,
  productId: number,
  data: Buffer,
): Promise<ImageUploadResponse> {
  const product = await payload.findByID({ collection: 'products', id: productId, depth: 0, disableErrors: true })
  if (!product) return { ok: false, error: { key: 'generic' } }
  const storage = await checkMediaStorage(mediaDir(payload))
  if (!storage.ok) return { ok: false, error: { key: 'mediaNotWritable', params: { code: storage.code } } }
  const stored = await toStoredImage(data)
  if (!stored.ok) return stored
  const sku = product.items?.[0]?.sku ?? String(product.id)
  try {
    const media = await storeMedia(payload, stored.image, product.name, sku)
    await appendToGallery(payload, product.id, media.id)
    return { ok: true, mediaId: media.id }
  } catch (err) {
    return { ok: false, error: { key: 'saveFailed', params: { message: err instanceof Error ? err.message : String(err) } } }
  }
}
