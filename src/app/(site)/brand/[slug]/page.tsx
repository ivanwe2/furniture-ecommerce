import Link from 'next/link'
import { notFound } from 'next/navigation'
import { t } from '@/lib/i18n/bg'
import { Container } from '@/components/ui'
import { ProductCard } from '@/components/catalog/ProductCard'
import { getBrandBySlug, getProductsByBrand } from '@/lib/payload/queries'

interface BrandPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata({ params }: BrandPageProps) {
  const resolvedParams = await params
  const brand = await getBrandBySlug(resolvedParams.slug)
  if (!brand) return { title: 'Марка не е намерена' }
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
            <span className="text-ink">{brand.name}</span>
          </li>
        </ol>
      </nav>

      {/* Brand info */}
      <div className="mb-8 flex items-center gap-4">
        {brand.logo && typeof brand.logo === 'object' && 'filename' in brand.logo && (brand.logo as { filename?: string | null }).filename ? (
          <img
            src={(brand.logo as { url?: string | null }).url ?? ''}
            alt={(brand.logo as { alt?: string | null }).alt ?? brand.name}
            className="h-12 w-auto object-contain"
          />
        ) : null}
        <div>
          <h1 className="text-2xl font-bold text-ink">{brand.name}</h1>
          {brand.description && (
            <p className="mt-1 text-steel">{brand.description}</p>
          )}
        </div>
      </div>

      {/* Products */}
      {products.length > 0 ? (
        <>
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
                  href={`/brand/${resolvedParams.slug}?page=${(page ?? 1) - 1}`}
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
                  href={`/brand/${resolvedParams.slug}?page=${(page ?? 1) + 1}`}
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
    </Container>
  )
}
