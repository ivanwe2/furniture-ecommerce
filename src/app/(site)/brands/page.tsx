import { t } from '@/lib/i18n/bg'
import { Container } from '@/components/ui'
import { Breadcrumbs } from '@/components/catalog/Breadcrumbs'
import { BrandCard } from '@/components/catalog/BrandCard'
import { getBrandsWithCounts } from '@/lib/payload/queries'

export async function generateMetadata() {
  return {
    title: t('brands.title'),
    description: t('brands.lead'),
    alternates: { canonical: '/brands' },
    openGraph: {
      title: `${t('brands.title')} | ${t('seo.siteName')}`,
      description: t('brands.lead'),
      type: 'website',
      url: '/brands',
    },
  }
}

export default async function BrandsPage() {
  const brands = await getBrandsWithCounts()

  return (
    <Container className="py-8 sm:py-10">
      <Breadcrumbs items={[{ name: t('common.home'), href: '/' }, { name: t('brands.title') }]} />

      <header className="mb-8 border-b border-ink/12 pb-6">
        <h1 className="font-display text-3xl font-semibold tracking-[-0.02em] text-ink sm:text-4xl">
          {t('brands.title')}
        </h1>
        <p className="mt-2 max-w-2xl text-ink2">{t('brands.lead')}</p>
      </header>

      {brands.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {brands.map((brand) => (
            <BrandCard key={brand.id} brand={brand} />
          ))}
        </div>
      ) : (
        <div className="border border-ink/14 bg-sand p-10 text-center">
          <p className="text-ink2">{t('brands.empty')}</p>
        </div>
      )}
    </Container>
  )
}
