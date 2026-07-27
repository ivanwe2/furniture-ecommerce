import 'server-only'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { Category, Product } from '@/payload-types'
import { company as companyDefaults, type CompanyInfo } from '@/lib/company'
import { searchTokens } from '@/lib/search'

async function p() {
  return getPayload({ config })
}

export interface CategoryNode {
  id: number | string
  name: string
  slug: string
  description?: string | null
  sortOrder: number
  image?: { filename?: string | null; alt?: string | null } | null
  parent: { id: number | string; name: string; slug: string } | null
  children: CategoryNode[]
}

// `parent` is an id at depth 0 but a populated object at depth 1 (which we now
// use so the category `image` is populated for the homepage cards).
function parentKey(parent: Category['parent']): string | null {
  if (parent == null) return null
  return typeof parent === 'object' ? String(parent.id) : String(parent)
}

function assembleTree(docs: Category[]): CategoryNode[] {
  const byId = new Map<string, Category & { children: CategoryNode[] }>()
  for (const d of docs) {
    byId.set(String(d.id), { ...d, children: [] })
  }
  const roots: CategoryNode[] = []
  for (const node of byId.values()) {
    const pid = parentKey(node.parent)
    if (!pid || !byId.has(pid)) {
      roots.push(node as CategoryNode)
    } else {
      const parent = byId.get(pid)
      if (parent && Array.isArray(parent.children)) {
        parent.children.push(node as CategoryNode)
      }
    }
  }
  // Sort each level
  const sortLevel = (nodes: CategoryNode[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    for (const n of nodes) sortLevel(n.children)
  }
  sortLevel(roots)
  return roots
}

export const getCategoryTree = unstable_cache(
  async (): Promise<CategoryNode[]> => {
    const payload = await p()
    const { docs } = await payload.find({
      collection: 'categories',
      limit: 500,
      // depth 1 populates `image` (upload) + `parent` so category cards can
      // render their cover image; assembleTree reads parent via parentKey().
      depth: 1,
      sort: 'sortOrder',
    })
    return assembleTree(docs)
  },
  ['category-tree'],
  { tags: ['categories'] },
)

export const getCategoryBySlug = unstable_cache(
  async (slug: string): Promise<Category | null> => {
    const payload = await p()
    const { docs } = await payload.find({
      collection: 'categories',
      depth: 1,
      limit: 1,
      where: { slug: { equals: slug } },
    })
    return docs[0] ?? null
  },
  ['category-by-slug'],
  { tags: ['categories'] },
)

export const getCategoryPath = async (id: number | string): Promise<CategoryNode[]> => {
  const tree = await getCategoryTree()
  const findPath = (nodes: CategoryNode[], targetId: string): CategoryNode[] | null => {
    for (const node of nodes) {
      if (String(node.id) === targetId) return [node]
      const childPath = findPath(node.children, targetId)
      if (childPath) return [node, ...childPath]
    }
    return null
  }
  return findPath(tree, String(id)) ?? []
}

export function getProductsByCategory(categorySlug: string, page: number = 1, limit: number = 24) {
  return unstable_cache(
    async () => {
      const payload = await p()
      // Get all descendant category IDs
      const tree = await getCategoryTree()
      const collectIds = (nodes: CategoryNode[]): string[] => {
        const ids: string[] = []
        for (const n of nodes) {
          if (n.slug === categorySlug) ids.push(String(n.id))
          ids.push(...collectIds(n.children))
        }
        return ids
      }
      const ids = collectIds(tree)
      if (ids.length === 0) return { docs: [] as Product[], totalPages: 0, page }
      const result = await payload.find({
        collection: 'products',
        depth: 1,
        where: {
          and: [
            { status: { equals: 'published' } },
            { category: { in: ids } },
          ],
        },
        sort: 'name',
        limit,
        page,
      })
      return result
    },
    ['products-by-category', categorySlug, String(page), String(limit)],
    { tags: ['products', 'categories'] },
  )()
}

export function getProductBySlug(slug: string) {
  return unstable_cache(
    async () => {
      const payload = await p()
      const { docs } = await payload.find({
        collection: 'products',
        depth: 1,
        limit: 1,
        where: {
          and: [
            { slug: { equals: slug } },
            { status: { equals: 'published' } },
          ],
        },
      })
      return docs[0] ?? null
    },
    ['product', slug],
    { tags: [`product-${slug}`, 'products'] },
  )()
}

export function getFeaturedProducts(limit: number = 8) {
  return unstable_cache(
    async () => {
      const payload = await p()
      const { docs } = await payload.find({
        collection: 'products',
        depth: 1,
        limit,
        where: {
          and: [
            { status: { equals: 'published' } },
            { featured: { equals: true } },
          ],
        },
      })
      return docs
    },
    ['featured-products', String(limit)],
    { tags: ['products'] },
  )()
}

export function getBrandBySlug(slug: string) {
  return unstable_cache(
    async () => {
      const payload = await p()
      const { docs } = await payload.find({
        collection: 'brands',
        depth: 1,
        limit: 1,
        where: { slug: { equals: slug } },
      })
      return docs[0] ?? null
    },
    ['brand', slug],
    { tags: [`brand-${slug}`, 'brands'] },
  )()
}

export function getProductsByBrand(brandSlug: string, page: number = 1, limit: number = 24) {
  return unstable_cache(
    async () => {
      const payload = await p()
      const brand = await getBrandBySlug(brandSlug)
      if (!brand) return { docs: [] as Product[], totalPages: 0, page }
      const result = await payload.find({
        collection: 'products',
        depth: 1,
        where: {
          and: [
            { status: { equals: 'published' } },
            { brand: { equals: brand.id } },
          ],
        },
        sort: 'name',
        limit,
        page,
      })
      return result
    },
    ['products-by-brand', brandSlug, String(page), String(limit)],
    { tags: ['products', 'brands'] },
  )()
}

export function searchProducts(qRaw: string) {
  const tokens = searchTokens(qRaw)
  if (tokens.length === 0) return Promise.resolve([] as Product[])
  return unstable_cache(
    async () => {
      const payload = await p()
      const { docs } = await payload.find({
        collection: 'products',
        depth: 1,
        limit: 30,
        where: {
          and: [
            { status: { equals: 'published' } },
            ...tokens.map((t) => ({ searchText: { contains: t } })),
          ],
        },
      })
      return docs
    },
    ['search', tokens.join(' ')],
    { tags: ['products'] },
  )()
}

export function getPage(slug: string) {
  return unstable_cache(
    async () => {
      const payload = await p()
      const { docs } = await payload.find({
        collection: 'pages',
        depth: 0,
        limit: 1,
        where: {
          and: [
            { slug: { equals: slug } },
            { status: { equals: 'published' } },
          ],
        },
      })
      return docs[0] ?? null
    },
    ['page', slug],
    { tags: [`page-${slug}`, 'pages'] },
  )()
}

export async function getAllPublishedProducts() {
  const payload = await p()
  const { docs } = await payload.find({
    collection: 'products',
    depth: 0,
    limit: 500,
    where: { status: { equals: 'published' } },
  })
  return docs
}

export async function resolveCartLines(lines: { productSlug: string; sku: string; qty: number }[]) {
  const resolution = new Map<string, {
    productSlug: string
    sku: string
    name: string
    unit: string
    priceEurCents: number
    inStock: boolean
    qty: number
  }>()

  for (const line of lines) {
    const product = await getProductBySlug(line.productSlug)
    if (!product || !product.items) continue

    const item = product.items.find((i) => i.sku === line.sku)
    if (!item) continue

    // Reject out-of-stock items (stockQty <= 0)
    if ((item.stockQty ?? 0) <= 0) continue

    resolution.set(`${line.productSlug}:${line.sku}`, {
      productSlug: line.productSlug,
      sku: line.sku,
      name: item.name,
      unit: item.unit ?? 'бр.',
      priceEurCents: item.priceEurCents,
      inStock: true,
      qty: line.qty,
    })
  }

  return resolution
}

export const getSettings = unstable_cache(
  async () => {
    const payload = await p()
    return payload.findGlobal({ slug: 'site-settings' })
  },
  ['settings'],
  { tags: ['settings'] },
)

/** Build a `tel:` href from a display number, normalising BG numbers. */
function telHref(display: string): string {
  const digits = display.replace(/[^\d+]/g, '')
  if (digits.startsWith('+')) return `tel:${digits}`
  if (digits.startsWith('359')) return `tel:+${digits}`
  if (digits.startsWith('0')) return `tel:+359${digits.slice(1)}`
  return `tel:${digits}`
}

/**
 * Store contact details, sourced from the `site-settings` global so the owner
 * can edit them in the admin. Falls back per-field to the `company.ts` defaults
 * when a setting is empty, so the storefront is never left without contact info.
 */
export async function getCompany(): Promise<CompanyInfo> {
  const s = await getSettings()
  const phone = s?.phones?.[0]?.number?.trim() || companyDefaults.phoneDisplay
  const email = s?.email?.trim() || companyDefaults.email
  const hoursLines = String(s?.workingHours ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  return {
    name: s?.companyName?.trim() || companyDefaults.name,
    eik: s?.eik?.trim() || companyDefaults.eik,
    city: s?.city?.trim() || companyDefaults.city,
    addressLine: s?.addressLine?.trim() || companyDefaults.addressLine,
    phoneDisplay: phone,
    phoneHref: telHref(phone),
    email,
    emailHref: `mailto:${email}`,
    workingHours: {
      weekdays: hoursLines[0] ?? companyDefaults.workingHours.weekdays,
      saturday: hoursLines[1] ?? companyDefaults.workingHours.saturday,
    },
  }
}

export function getAllSlugsForSitemap() {
  return unstable_cache(
    async () => {
      const payload = await p()
      const [products, categories, brands, pages] = await Promise.all([
        payload.find({ collection: 'products', depth: 0, limit: 500, where: { status: { equals: 'published' } } }),
        payload.find({ collection: 'categories', depth: 0, limit: 500 }),
        payload.find({ collection: 'brands', depth: 0, limit: 100 }),
        payload.find({ collection: 'pages', depth: 0, limit: 100, where: { status: { equals: 'published' } } }),
      ])
      return {
        products: products.docs.map((p) => p.slug).filter(Boolean),
        categories: categories.docs.map((c) => c.slug).filter(Boolean),
        brands: brands.docs.map((b) => b.slug).filter(Boolean),
        pages: pages.docs.map((pg) => pg.slug).filter(Boolean),
      }
    },
    ['sitemap-slugs'],
    { tags: ['products', 'categories', 'brands', 'pages'] },
  )()
}
