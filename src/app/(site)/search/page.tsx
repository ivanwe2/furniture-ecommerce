import Link from 'next/link'
import { t } from '@/lib/i18n/bg'
import { Container } from '@/components/ui'
import { ProductCard } from '@/components/catalog/ProductCard'
import { Breadcrumbs } from '@/components/catalog/Breadcrumbs'
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
      title: `${t('search.resultsFor')} "${q}"`,
      description: t('seo.searchDesc').replace('{q}', q),
      alternates: { canonical: `/search?q=${encodeURIComponent(q)}` },
      robots: { index: false, follow: true },
    }
  }
  return {
    title: t('search.title'),
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
    <Container className="py-8 sm:py-10">
      <Breadcrumbs
        items={[
          { name: t('common.home'), href: '/' },
          { name: t('search.title') },
        ]}
      />

      {/* Heading */}
      <header className="mb-8 border-b border-ink/12 pb-6">
        <div className="mb-2.5 font-mono text-xs uppercase tracking-[0.16em] text-brass-dark">{t('search.title')}</div>
        <h1 className="font-display text-3xl font-semibold tracking-[-0.02em] text-ink sm:text-4xl">
          {q.trim() ? (
            <>
              {t('search.resultsFor')}: <span className="text-brass">{`„${q}"`}</span>
            </>
          ) : (
            t('search.title')
          )}
        </h1>
      </header>

      {/* Results */}
      {products.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
        <div className="border border-ink/14 bg-sand p-10 text-center">
          {q.trim() ? <p className="text-ink2">{t('search.empty')}</p> : null}
          <p className="mt-2 font-mono text-xs uppercase tracking-[0.12em] text-steel">{t('search.browsePrompt')}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2.5">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/category/${cat.slug}`}
                className="border border-ink/18 bg-raised px-3.5 py-1.5 text-sm font-medium text-ink transition-colors hover:border-brass hover:text-brass"
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
