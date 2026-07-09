import 'server-only'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { Category, Product } from '@/payload-types'

async function p() {
  return getPayload({ config })
}

export interface CategoryNode {
  id: number | string
  name: string
  slug: string
  sortOrder: number
  image?: { filename?: string | null; alt?: string | null } | null
  parent: { id: number | string; name: string; slug: string } | null
  children: CategoryNode[]
}

function assembleTree(docs: Category[]): CategoryNode[] {
  const byId = new Map<string, Category & { children: CategoryNode[] }>()
  for (const d of docs) {
    byId.set(String(d.id), { ...d, children: [] })
  }
  const roots: CategoryNode[] = []
  for (const node of byId.values()) {
    if (!node.parent || !byId.has(String(node.parent))) {
      roots.push(node as CategoryNode)
    } else {
      const parent = byId.get(String(node.parent))
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
      depth: 0,
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
  const tokens = qRaw.toLowerCase().trim().split(/\s+/).filter(Boolean).slice(0, 5)
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

export const getSettings = unstable_cache(
  async () => {
    const payload = await p()
    return payload.findGlobal({ slug: 'site-settings' })
  },
  ['settings'],
  { tags: ['settings'] },
)

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
