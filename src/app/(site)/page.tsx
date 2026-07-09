import Link from 'next/link'
import { t } from '@/lib/i18n/bg'
import { Container } from '@/components/ui'
import { ProductCard } from '@/components/catalog/ProductCard'
import { getSettings, getCategoryTree, getFeaturedProducts, getBrandBySlug } from '@/lib/payload/queries'
import { imageUrl, imageSrcSet } from '@/lib/images'
import type { Media } from '@/payload-types'

export async function generateMetadata() {
  const settings = await getSettings()
  const siteName = t('seo.siteName')
  const description = t('seo.homeDesc')
  return {
    title: siteName,
    description,
    alternates: { canonical: '/' },
    openGraph: {
      title: siteName,
      description,
      type: 'website',
      url: '/',
    },
  }
}

export default async function HomePage() {
  const [settings, categories, featured, sevroll] = await Promise.all([
    getSettings(),
    getCategoryTree(),
    getFeaturedProducts(8),
    getBrandBySlug('sevroll'),
  ])

  return (
    <>
      {/* Hero */}
      <section className="bg-cream py-16 sm:py-24">
        <Container>
          <div className="max-w-2xl space-y-6">
            {settings.heroTitle && (
              <h1 className="text-3xl font-bold text-ink sm:text-4xl">{settings.heroTitle}</h1>
            )}
            {settings.heroSubtitle && (
              <p className="text-lg text-steel">{settings.heroSubtitle}</p>
            )}
            <Link
              href="/kategoria/mebelen-obkov"
              className="inline-flex items-center rounded bg-brass px-6 py-3 text-sm font-medium text-cream transition-colors hover:bg-brass/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 ring-offset-cream"
            >
              {t('home.heroCta')}
            </Link>
          </div>
        </Container>
      </section>

      {/* Featured products */}
      {featured.length > 0 && (
        <section className="py-12">
          <Container>
            <h2 className="mb-8 text-xl font-semibold text-ink">{t('home.featured')}</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((product) => (
                <ProductCard key={product.id} product={{
                  name: product.name,
                  slug: product.slug ?? '',
                  items: product.items ?? [],
                  gallery: product.gallery ?? undefined,
                  category: typeof product.category === 'object' ? product.category : undefined,
                }} />
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* Category grid */}
      <section className="py-12">
        <Container>
          <h2 className="mb-8 text-xl font-semibold text-ink">{t('home.categoriesTitle')}</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/kategoria/${cat.slug}`}
                className="group relative overflow-hidden rounded bg-sand aspect-[4/3]"
              >
                {cat.image && typeof cat.image === 'object' && 'filename' in cat.image && cat.image.filename ? (
                  <img
                    src={imageUrl(cat.image as Media, 'card')}
                    srcSet={imageSrcSet(cat.image as Media, ['thumb', 'card'])}
                    alt={cat.image.alt ?? cat.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="h-8 w-8 text-steel/60"
                      aria-hidden="true"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                  </div>
                )}
                <span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-4 text-sm font-medium text-white">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* SEVROLL strip */}
      {sevroll && (
        <section className="py-12">
          <Container>
            <Link
              href="/marka/sevroll"
              className="group flex items-center gap-6 rounded-lg bg-sand p-6 transition-colors hover:bg-sand/80"
            >
              {sevroll.logo && typeof sevroll.logo === 'object' && 'filename' in sevroll.logo && (sevroll.logo as Media).filename ? (
                <img
                  src={imageUrl(sevroll.logo as Media, 'card')}
                  alt={(sevroll.logo as Media).alt ?? sevroll.name}
                  className="h-12 w-auto rounded object-contain"
                />
              ) : null}
              <div>
                <h3 className="text-lg font-semibold text-ink group-hover:text-brass transition-colors">
                  {sevroll.name}
                </h3>
                {sevroll.description && (
                  <p className="mt-1 text-sm text-steel">{sevroll.description}</p>
                )}
              </div>
            </Link>
          </Container>
        </section>
      )}

      {/* Trust block */}
      <section className="py-12">
        <Container>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="flex items-start gap-4 rounded-lg bg-sand p-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="mt-0.5 h-6 w-6 shrink-0 text-brass"
                aria-hidden="true"
              >
                <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
              <p className="text-sm text-ink">{t('home.trust1')}</p>
            </div>
            <div className="flex items-start gap-4 rounded-lg bg-sand p-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="mt-0.5 h-6 w-6 shrink-0 text-brass"
                aria-hidden="true"
              >
                <path d="M9 12l2 2 4-4" />
                <rect x="1" y="4" width="22" height="16" rx="2" />
              </svg>
              <p className="text-sm text-ink">{t('home.trust2')}</p>
            </div>
            <div className="flex items-start gap-4 rounded-lg bg-sand p-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="mt-0.5 h-6 w-6 shrink-0 text-brass"
                aria-hidden="true"
              >
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              <p className="text-sm text-ink">{t('home.trust3')}</p>
            </div>
          </div>
        </Container>
      </section>
    </>
  )
}
