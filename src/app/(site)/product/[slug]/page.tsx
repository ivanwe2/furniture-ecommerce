import Link from 'next/link'
import { notFound } from 'next/navigation'
import { t } from '@/lib/i18n/bg'
import { Container, Badge } from '@/components/ui'
import { Gallery } from '@/components/catalog/Gallery'
import { ItemsTable } from '@/components/catalog/ItemsTable'
import BreadcrumbList from '@/components/seo/BreadcrumbList'
import ProductJsonLd from '@/components/seo/ProductJsonLd'
import { getProductBySlug } from '@/lib/payload/queries'
import { imageUrl } from '@/lib/images'
import type { Media } from '@/payload-types'

interface ProductPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: ProductPageProps) {
  const resolvedParams = await params
  const product = await getProductBySlug(resolvedParams.slug)
  if (!product) return { title: t('product.notFoundTitle') }
  const siteName = t('seo.siteName')
  const seoTitle = product.seo?.title ?? `${product.name} | ${siteName}`
  const seoDesc = product.seo?.description ?? t('seo.productDesc').replace('{name}', product.name)
  const firstImage = product.gallery?.[0]?.image
  return {
    title: seoTitle,
    description: seoDesc,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      title: seoTitle,
      description: seoDesc,
      type: 'website',
      url: `/product/${product.slug}`,
      images: firstImage && typeof firstImage === 'object' && 'filename' in firstImage
        ? [{ url: imageUrl(firstImage as Media, 'og'), width: 1200, height: 630 }] as const
        : undefined,
    },
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const resolvedParams = await params
  const product = await getProductBySlug(resolvedParams.slug)

  if (!product) {
    notFound()
  }

  // Build breadcrumbs
  const _categoryPath = product.category && typeof product.category === 'object' ? [{ id: (product.category as { id: number }).id, name: (product.category as { name: string }).name, slug: (product.category as { slug?: string | null })?.slug ?? '', children: [] }] : []

  // Extract gallery images
  const galleryImages: (Media | null)[] = (product.gallery ?? []).map((entry) => {
    if (!entry.image) return null
    if (typeof entry.image === 'number') return null
    return entry.image as Media
  })

  // Check if any item is in stock
  const items = product.items ?? []
  const hasInStockItem = items.some((i) => i.inStock !== false)

  // Brand info
  const brandName = typeof product.brand === 'object' && product.brand?.name ? (product.brand as { name: string }).name : undefined
  const brandSlug = typeof product.brand === 'object' && product.brand?.slug ? (product.brand as { slug?: string | null })?.slug : undefined

  // Category info
  const categoryName = typeof product.category === 'object' && product.category?.name ? (product.category as { name: string }).name : undefined
  const categorySlug = typeof product.category === 'object' && product.category?.slug ? (product.category as { slug?: string | null })?.slug : undefined

  // Build JSON-LD breadcrumbs
  const jsonLdBreadcrumbs = [
    { name: t('common.home'), url: '/' },
    ...(categorySlug ? [{ name: categoryName ?? '', url: `/category/${categorySlug}` }] : []),
    { name: product.name, url: `/product/${product.slug}` },
  ]

  // Product structured data (price range + availability)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nasteh.bg'
  const prices = items.map((i) => i.priceEurCents)
  const lowPrice = prices.length > 0 ? Math.min(...prices) : 0
  const highPrice = prices.length > 0 ? Math.max(...prices) : 0
  const firstGalleryImage = galleryImages.find((img): img is Media => img != null)
  const jsonLdImageRaw = firstGalleryImage ? imageUrl(firstGalleryImage, 'og') : null
  const jsonLdImage = jsonLdImageRaw
    ? jsonLdImageRaw.startsWith('http')
      ? jsonLdImageRaw
      : `${siteUrl}${jsonLdImageRaw}`
    : null

  return (
    <>
      <BreadcrumbList items={jsonLdBreadcrumbs} />
      <ProductJsonLd
        name={product.name}
        description={product.seo?.description ?? t('seo.productDesc').replace('{name}', product.name)}
        image={jsonLdImage}
        brandName={brandName}
        categoryName={categoryName}
        lowPriceEurCents={lowPrice}
        highPriceEurCents={highPrice}
        offerCount={items.length}
        inStock={hasInStockItem}
        url={`${siteUrl}/product/${product.slug}`}
      />
      <Container className="py-8">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex items-center gap-2 text-sm text-steel">
          <li>
            <Link href="/" className="hover:text-brass transition-colors">
              {t('common.home')}
            </Link>
          </li>
          {categorySlug && (
            <li className="flex items-center gap-2">
              <span aria-hidden="true">/</span>
              <Link href={`/category/${categorySlug}`} className="hover:text-brass transition-colors">
                {categoryName}
              </Link>
            </li>
          )}
          <li className="flex items-center gap-2">
            <span aria-hidden="true">/</span>
            <span className="text-ink">{product.name}</span>
          </li>
        </ol>
      </nav>

      {/* Product layout: gallery + info */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[55%_45%]">
        {/* Gallery */}
        <Gallery images={galleryImages} productName={product.name} />

        {/* Info block */}
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-ink">{product.name}</h1>

          {/* Brand chip */}
          {brandName && brandSlug ? (
            <Link href={`/brand/${brandSlug}`}>
              <Badge variant="steel" className="hover:opacity-80 transition-opacity">
                {brandName}
              </Badge>
            </Link>
          ) : null}

          {/* Short spec bullets */}
          {product.shortSpec && product.shortSpec.length > 0 && (
            <ul className="space-y-2 text-sm text-ink">
              {product.shortSpec.map((spec) => (
                <li key={spec.id} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brass" />
                  <span>{spec.text}</span>
                </li>
              ))}
            </ul>
          )}

          {/* In-stock summary */}
          {hasInStockItem && (
            <div className="flex items-center gap-2 text-sm">
              <span className="inline-block h-2 w-2 rounded-full bg-ok" />
              <span className="text-ok">{t('product.inStockSummary')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Items table */}
      {items.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-lg font-semibold text-ink">{t('product.itemsTitle')}</h2>
          <ItemsTable items={items} productSlug={product.slug ?? ''} productName={product.name} />
        </section>
      )}

      {/* Description */}
      {product.description && (
        <section className="mt-12">
          <RichTextRenderer content={product.description} />
        </section>
      )}
    </Container>
    </>
  )
}

// Simple rich text renderer for Lexical content
function RichTextRenderer({ content }: { content: Record<string, unknown> }) {
  // For now, render as plain JSON-LD placeholder
  // Full Lexical rendering would need @payloadcms/richtext-react
  return (
    <div className="prose prose-ink max-w-none">
      {/* Rich text will be rendered here once @payloadcms/richtext-react is configured */}
      <pre className="rounded bg-sand p-4 text-xs overflow-auto">{JSON.stringify(content, null, 2)}</pre>
    </div>
  )
}
