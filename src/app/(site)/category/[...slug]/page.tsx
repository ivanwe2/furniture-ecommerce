import Link from 'next/link'
import { notFound } from 'next/navigation'
import { t } from '@/lib/i18n/bg'
import { Container } from '@/components/ui'
import { ProductCard } from '@/components/catalog/ProductCard'
import { Breadcrumbs } from '@/components/catalog/Breadcrumbs'
import { Pagination } from '@/components/catalog/Pagination'
import { SortLinks } from '@/components/catalog/SortLinks'
import { BrandFilterChips } from '@/components/catalog/BrandFilterChips'
import { payloadSort } from '@/lib/catalog/sort'
import { listingHref } from '@/lib/catalog/href'
import BreadcrumbList from '@/components/seo/BreadcrumbList'
import { getProductsByCategory, getCategoryTree, getBrandsInCategory } from '@/lib/payload/queries'
import type { CategoryNode } from '@/lib/payload/queries'

interface CategoryPageProps {
  params: Promise<{ slug: string[] }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata({ params, searchParams }: CategoryPageProps) {
  const resolvedParams = await params
  const resolvedSearch = await searchParams
  const slugParts = Array.isArray(resolvedParams.slug) ? resolvedParams.slug : [resolvedParams.slug]
  const categorySlug = slugParts[slugParts.length - 1] ?? ''
  const tree = await getCategoryTree()
  const category = await findCategoryBySlug(tree, categorySlug)
  if (!category) return { title: t('category.notFoundTitle') }
  const siteName = t('seo.siteName')
  const ogTitle = `${category.name} | ${siteName}`
  const metaDesc = category.description?.trim() || t('seo.categoryDesc').replace('{name}', category.name)
  return {
    // Bare name — the layout template adds the „| Настех" suffix.
    title: category.name,
    description: metaDesc,
    alternates: { canonical: `/category/${categorySlug}` },
    // A sorted or brand-filtered view is a subset/reordering of the same
    // products — let the canonical above carry the ranking rather than spawning
    // an indexable duplicate for every sort×brand×page combination.
    ...(resolvedSearch.sort || resolvedSearch.brand
      ? { robots: { index: false, follow: true } }
      : {}),
    openGraph: {
      title: ogTitle,
      description: metaDesc,
      type: 'website',
      url: `/category/${categorySlug}`,
    },
  }
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const resolvedParams = await params
  const resolvedSearch = await searchParams
  const slugParts = Array.isArray(resolvedParams.slug) ? resolvedParams.slug : [resolvedParams.slug]
  const categorySlug = slugParts[slugParts.length - 1] ?? ''

  const tree = await getCategoryTree()
  const category = await findCategoryBySlug(tree, categorySlug)

  if (!category) {
    notFound()
  }

  // Build breadcrumbs from the path
  const breadcrumbs = buildBreadcrumbs(tree, category.id)

  // Get products in this category and all descendants
  const activeBrand = Array.isArray(resolvedSearch.brand) ? resolvedSearch.brand[0] : resolvedSearch.brand

  const [{ docs: products, totalPages, page }, brandsInCategory] = await Promise.all([
    getProductsByCategory(
      categorySlug,
      Number(resolvedSearch.page) || 1,
      24,
      payloadSort(resolvedSearch.sort),
      activeBrand,
    ),
    getBrandsInCategory(categorySlug),
  ])

  // Find subcategories (direct children of this category)
  const subcategories = category.children ?? []

  // Build JSON-LD breadcrumbs
  const jsonLdBreadcrumbs = [
    { name: t('common.home'), url: '/' },
    ...breadcrumbs.map((b) => ({ name: b.name, url: `/category/${b.slug}` })),
    { name: category.name, url: `/category/${categorySlug}` },
  ]

  const parentEyebrow = breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1]!.name : t('nav.catalog')

  return (
    <>
      <BreadcrumbList items={jsonLdBreadcrumbs} />
      <Container className="py-8 sm:py-10">
        <Breadcrumbs
          items={[
            { name: t('common.home'), href: '/' },
            ...breadcrumbs.map((crumb) => ({ name: crumb.name, href: `/category/${crumb.slug}` })),
            { name: category.name },
          ]}
        />

        {/* Category heading */}
        <header className="border-b border-ink/12 pb-6">
          <div className="mb-2.5 font-mono text-xs uppercase tracking-[0.16em] text-brass-dark">{parentEyebrow}</div>
          <h1 className="font-display text-3xl font-semibold tracking-[-0.02em] text-ink sm:text-4xl">
            {category.name}
          </h1>
          {category.description && <p className="mt-3 max-w-2xl text-ink2">{category.description}</p>}
        </header>

        {/* Subcategories (non-leaf) */}
        {subcategories.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.16em] text-steel">
              {t('nav.subcategories')}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {subcategories.map((sub) => (
                <Link
                  key={sub.id}
                  href={`/category/${sub.slug}`}
                  className="group flex items-center justify-between gap-3 border border-ink/14 bg-raised px-4 py-3.5 transition-colors hover:border-brass"
                >
                  <span className="text-sm font-medium text-ink transition-colors group-hover:text-brass">
                    {sub.name}
                  </span>
                  <span aria-hidden="true" className="font-mono text-steel transition-colors group-hover:text-brass">
                    →
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Products */}
        <section className="mt-10">
          {/* Controls sit OUTSIDE the results branch on purpose: when a filter
              matches nothing, the visitor still needs the chips to pick another
              brand. Inside the branch they vanished, leaving "clear" as the only
              way out. */}
          {(products.length > 0 || brandsInCategory.length > 0) && (
            <div className="mb-5 space-y-3 border-b border-ink/12 pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="font-mono text-xs uppercase tracking-[0.16em] text-steel">
                  {t('category.allIn')}
                </h2>
                <SortLinks basePath={`/category/${categorySlug}`} params={resolvedSearch} />
              </div>
              <BrandFilterChips
                basePath={`/category/${categorySlug}`}
                params={resolvedSearch}
                brands={brandsInCategory}
              />
            </div>
          )}
          {products.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={{
                      name: product.name,
                      slug: product.slug ?? '',
                      items: product.items ?? [],
                      gallery: product.gallery ?? undefined,
                      category: typeof product.category === 'object' ? product.category : undefined,
                    }}
                  />
                ))}
              </div>
              <Pagination
                basePath={`/category/${categorySlug}`}
                page={page ?? 1}
                totalPages={totalPages}
                params={resolvedSearch}
              />
            </>
          ) : (
            <div className="border border-ink/14 bg-sand p-10 text-center">
              <p className="text-ink2">
                {activeBrand ? t('filter.emptyForBrand') : t('category.empty')}
              </p>
              {/* A filtered-to-nothing listing needs a way back to the full one,
                  otherwise the only escape is editing the URL. */}
              <Link
                href={
                  activeBrand
                    ? listingHref(`/category/${categorySlug}`, resolvedSearch, {
                        brand: undefined,
                        page: undefined,
                      })
                    : '/'
                }
                className="mt-3 inline-block font-mono text-xs uppercase tracking-[0.1em] text-brass-dark hover:text-brass"
              >
                {activeBrand ? t('filter.clear') : t('common.home')} →
              </Link>
            </div>
          )}
        </section>
      </Container>
    </>
  )
}

function findCategoryBySlug(nodes: CategoryNode[], slug: string): CategoryNode | null {
  for (const node of nodes) {
    if (node.slug === slug) return node
    const found = findCategoryBySlug(node.children, slug)
    if (found) return found
  }
  return null
}

function buildBreadcrumbs(tree: CategoryNode[], targetId: string | number): CategoryNode[] {
  const findPath = (nodes: CategoryNode[], id: string): CategoryNode[] | null => {
    for (const node of nodes) {
      if (String(node.id) === id) return [node]
      const childPath = findPath(node.children, id)
      if (childPath) return [node, ...childPath]
    }
    return null
  }
  const path = findPath(tree, String(targetId))
  // Return all except the last (the current category)
  return path?.slice(0, -1) ?? []
}
