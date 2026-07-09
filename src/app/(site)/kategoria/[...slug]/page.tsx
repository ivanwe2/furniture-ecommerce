import Link from 'next/link'
import { notFound } from 'next/navigation'
import { t } from '@/lib/i18n/bg'
import { Container } from '@/components/ui'
import { ProductCard } from '@/components/catalog/ProductCard'
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
  if (!category) return { title: 'Категория не е намерена' }
  const siteName = t('seo.siteName')
  return {
    title: `${category.name} | ${siteName}`,
    description: t('seo.categoryDesc').replace('{name}', category.name),
    alternates: { canonical: `/kategoria/${categorySlug}` },
    openGraph: {
      title: `${category.name} | ${siteName}`,
      description: t('seo.categoryDesc').replace('{name}', category.name),
      type: 'website',
      url: `/kategoria/${categorySlug}`,
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
    ...breadcrumbs.map((b) => ({ name: b.name, url: `/kategoria/${b.slug}` })),
    { name: category.name, url: `/kategoria/${categorySlug}` },
  ]

  return (
    <>
      <BreadcrumbList items={jsonLdBreadcrumbs} />
      <Container className="py-8">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex items-center gap-2 text-sm text-steel">
          <li>
            <Link href="/" className="hover:text-brass transition-colors">
              {t('common.home')}
            </Link>
          </li>
          {breadcrumbs.map((crumb) => (
            <li key={crumb.id} className="flex items-center gap-2">
              <span aria-hidden="true">/</span>
              <Link href={`/kategoria/${crumb.slug}`} className="hover:text-brass transition-colors">
                {crumb.name}
              </Link>
            </li>
          ))}
        </ol>
      </nav>

      {/* Category heading */}
      <h1 className="text-2xl font-bold text-ink">{category.name}</h1>
      {category.description && (
        <p className="mt-2 text-steel">{category.description}</p>
      )}

      {/* Subcategories (non-leaf) */}
      {subcategories.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-ink">Категории</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {subcategories.map((sub) => (
              <Link
                key={sub.id}
                href={`/kategoria/${sub.slug}`}
                className="group flex items-center gap-3 rounded-lg bg-sand p-4 transition-colors hover:bg-sand/80"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="h-5 w-5 shrink-0 text-brass"
                  aria-hidden="true"
                >
                  <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <span className="text-sm font-medium text-ink group-hover:text-brass transition-colors">
                  {sub.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Products */}
      <section className="mt-8">
        {products.length > 0 ? (
          <>
            <h2 className="mb-4 text-lg font-semibold text-ink">{t('category.allIn')}</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={{
                  name: product.name,
                  slug: product.slug ?? '',
                  items: product.items ?? [],
                  gallery: product.gallery ?? undefined,
                  category: typeof product.category === 'object' ? product.category : undefined,
                }} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-2">
                {(page ?? 1) > 1 && (
                  <Link
                    href={`/kategoria/${categorySlug}?page=${(page ?? 1) - 1}`}
                    className="rounded bg-sand px-3 py-2 text-sm font-medium text-ink hover:bg-sand/80 transition-colors"
                  >
                    {t('common.back')}
                  </Link>
                )}
                <span className="text-sm text-steel">
                  Страница {page ?? 1} от {totalPages}
                </span>
                {(page ?? 1) < totalPages && (
                  <Link
                    href={`/kategoria/${categorySlug}?page=${(page ?? 1) + 1}`}
                    className="rounded bg-sand px-3 py-2 text-sm font-medium text-ink hover:bg-sand/80 transition-colors"
                  >
                    Напред
                  </Link>
                )}
              </nav>
            )}
          </>
        ) : (
          <div className="mt-8 rounded-lg bg-sand p-8 text-center">
            <p className="text-steel">{t('category.empty')}</p>
            <Link href="/" className="mt-2 inline-block text-brass hover:underline">
              {t('common.home')}
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
