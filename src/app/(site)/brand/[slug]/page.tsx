import Link from 'next/link'
import { notFound } from 'next/navigation'
import { t } from '@/lib/i18n/bg'
import { Container } from '@/components/ui'
import { ProductCard } from '@/components/catalog/ProductCard'
import { Breadcrumbs } from '@/components/catalog/Breadcrumbs'
import { Pagination } from '@/components/catalog/Pagination'
import { getBrandBySlug, getProductsByBrand } from '@/lib/payload/queries'

interface BrandPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata({ params }: BrandPageProps) {
  const resolvedParams = await params
  const brand = await getBrandBySlug(resolvedParams.slug)
  if (!brand) return { title: t('brand.notFoundTitle') }
  const siteName = t('seo.siteName')
  return {
    title: `${brand.name} | ${siteName}`,
    description: t('seo.brandDesc').replace('{name}', brand.name),
    alternates: { canonical: `/brand/${brand.slug}` },
    openGraph: {
      title: `${brand.name} | ${siteName}`,
      description: t('seo.brandDesc').replace('{name}', brand.name),
      type: 'website',
      url: `/brand/${brand.slug}`,
    },
  }
}

export default async function BrandPage({ params, searchParams }: BrandPageProps) {
  const resolvedParams = await params
  const resolvedSearch = await searchParams
  const brand = await getBrandBySlug(resolvedParams.slug)

  if (!brand) {
    notFound()
  }

  const { docs: products, totalPages, page } = await getProductsByBrand(
    resolvedParams.slug,
    Number(resolvedSearch.page) || 1,
    24,
  )

  return (
    <Container className="py-8 sm:py-10">
      <Breadcrumbs
        items={[
          { name: t('common.home'), href: '/' },
          { name: t('nav.catalog'), href: '/search' },
          { name: brand.name },
        ]}
      />

      {/* Brand info */}
      <header className="mb-8 flex items-center gap-5 border-b border-ink/12 pb-6">
        {brand.logo && typeof brand.logo === 'object' && 'filename' in brand.logo && (brand.logo as { filename?: string | null }).filename ? (
          <img
            src={(brand.logo as { url?: string | null }).url ?? ''}
            alt={(brand.logo as { alt?: string | null }).alt ?? brand.name}
            className="h-14 w-auto border border-ink/12 bg-raised object-contain p-2"
          />
        ) : null}
        <div>
          <div className="mb-1.5 font-mono text-xs uppercase tracking-[0.16em] text-brass-dark">{t('nav.catalog')}</div>
          <h1 className="font-display text-3xl font-semibold tracking-[-0.02em] text-ink sm:text-4xl">{brand.name}</h1>
          {brand.description && <p className="mt-2 max-w-2xl text-ink2">{brand.description}</p>}
        </div>
      </header>

      {/* Products */}
      {products.length > 0 ? (
        <>
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
          <Pagination basePath={`/brand/${resolvedParams.slug}`} page={page ?? 1} totalPages={totalPages} />
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
    </Container>
  )
}
