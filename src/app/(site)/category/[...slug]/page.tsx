import Link from 'next/link'
import { notFound } from 'next/navigation'
import { t } from '@/lib/i18n/bg'
import { Container } from '@/components/ui'
import { ProductCard } from '@/components/catalog/ProductCard'
import { Breadcrumbs } from '@/components/catalog/Breadcrumbs'
import { Pagination } from '@/components/catalog/Pagination'
import BreadcrumbList from '@/components/seo/BreadcrumbList'
import { getProductsByCategory, getCategoryTree } from '@/lib/payload/queries'
import type { CategoryNode } from '@/lib/payload/queries'

interface CategoryPageProps {
  params: Promise<{ slug: string[] }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata({ params }: CategoryPageProps) {
  const resolvedParams = await params
  const slugParts = Array.isArray(resolvedParams.slug) ? resolvedParams.slug : [resolvedParams.slug]
  const categorySlug = slugParts[slugParts.length - 1] ?? ''
  const tree = await getCategoryTree()
  const category = await findCategoryBySlug(tree, categorySlug)
  if (!category) return { title: t('category.notFoundTitle') }
  const siteName = t('seo.siteName')
  const metaTitle = `${category.name} | ${siteName}`
  const metaDesc = category.description?.trim() || t('seo.categoryDesc').replace('{name}', category.name)
  return {
    title: metaTitle,
    description: metaDesc,
    alternates: { canonical: `/category/${categorySlug}` },
    openGraph: {
      title: metaTitle,
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
  const { docs: products, totalPages, page } = await getProductsByCategory(categorySlug, Number(resolvedSearch.page) || 1, 24)

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
          {products.length > 0 ? (
            <>
              <h2 className="mb-5 border-b border-ink/12 pb-3 font-mono text-xs uppercase tracking-[0.16em] text-steel">
                {t('category.allIn')}
              </h2>
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
              <Pagination basePath={`/category/${categorySlug}`} page={page ?? 1} totalPages={totalPages} />
            </>
          ) : (
            <div className="border border-ink/14 bg-sand p-10 text-center">
              <p className="text-ink2">{t('category.empty')}</p>
              <Link
                href="/"
                className="mt-3 inline-block font-mono text-xs uppercase tracking-[0.1em] text-brass-dark hover:text-brass"
              >
                {t('common.home')} →
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
