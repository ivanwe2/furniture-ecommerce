import Link from 'next/link'
import { t } from '@/lib/i18n/bg'
import { Container } from '@/components/ui'
import { ProductCard } from '@/components/catalog/ProductCard'
import { searchProducts, getCategoryTree } from '@/lib/payload/queries'

interface SearchPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata({ searchParams }: SearchPageProps) {
  const resolvedSearch = await searchParams
  const qRaw = Array.isArray(resolvedSearch.q) ? resolvedSearch.q[0] : (resolvedSearch.q ?? '')
  const q = typeof qRaw === 'string' ? qRaw : ''
  if (q.trim()) {
    return {
      title: `${t('search.resultsFor')} "${q}" | ${t('seo.siteName')}`,
      description: t('seo.searchDesc').replace('{q}', q),
      alternates: { canonical: `/search?q=${encodeURIComponent(q)}` },
      robots: { index: false, follow: true },
    }
  }
  return {
    title: `${t('search.title')} | ${t('seo.siteName')}`,
    description: t('seo.searchDesc').replace('{q}', ''),
    alternates: { canonical: '/search' },
  }
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedSearch = await searchParams
  const qRaw = Array.isArray(resolvedSearch.q) ? resolvedSearch.q[0] : (resolvedSearch.q ?? '')
  const q = typeof qRaw === 'string' ? qRaw : ''

  let products: ReturnType<typeof searchProducts> extends Promise<infer T> ? T : never = []

  if (q.trim()) {
    products = await searchProducts(q)
  }

  const categories = await getCategoryTree()

  return (
    <Container className="py-8">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex items-center gap-2 text-sm text-steel">
          <li>
            <Link href="/" className="hover:text-brass transition-colors">
              {t('common.home')}
            </Link>
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden="true">/</span>
            <span className="text-ink">{t('search.title')}</span>
          </li>
        </ol>
      </nav>

      {/* Heading */}
      {q.trim() ? (
        <h1 className="mb-6 text-xl font-semibold text-ink">
          {t('search.resultsFor')}: &ldquo;{q}&rdquo;
        </h1>
      ) : (
        <h1 className="mb-6 text-xl font-semibold text-ink">{t('search.title')}</h1>
      )}

      {/* Results */}
      {products.length > 0 ? (
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
      ) : (
        <div className="mt-8 rounded-lg bg-sand p-8 text-center">
          {q.trim() ? (
            <p className="text-steel">{t('search.empty')}</p>
          ) : null}
          <p className="mt-2 text-sm text-steel">{t('search.browsePrompt')}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/category/${cat.slug}`}
                className="rounded bg-sand/60 px-3 py-1.5 text-sm font-medium text-ink hover:bg-sand transition-colors"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </Container>
  )
}
