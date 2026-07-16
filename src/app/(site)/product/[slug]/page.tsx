import Link from 'next/link'
import { notFound } from 'next/navigation'
import { t } from '@/lib/i18n/bg'
import { Container } from '@/components/ui'
import { Gallery } from '@/components/catalog/Gallery'
import { ItemsTable } from '@/components/catalog/ItemsTable'
import { Breadcrumbs } from '@/components/catalog/Breadcrumbs'
import BreadcrumbList from '@/components/seo/BreadcrumbList'
import ProductJsonLd from '@/components/seo/ProductJsonLd'
import { RichText } from '@/components/richtext/RichText'
import { getProductBySlug } from '@/lib/payload/queries'
import { imageUrl } from '@/lib/images'
import type { Media } from '@/payload-types'

interface ProductPageProps {
  params: Promise<{ slug: string }>
}

/** Flatten a Lexical rich-text value to a trimmed plain-text excerpt for meta. */
function richTextExcerpt(content: unknown, max = 160): string {
  const parts: string[] = []
  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object') return
    const n = node as { text?: unknown; children?: unknown }
    if (typeof n.text === 'string') parts.push(n.text)
    if (Array.isArray(n.children)) n.children.forEach(walk)
  }
  if (content && typeof content === 'object' && 'root' in content) {
    walk((content as { root: unknown }).root)
  }
  const text = parts.join(' ').replace(/\s+/g, ' ').trim()
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text
}

export async function generateMetadata({ params }: ProductPageProps) {
  const resolvedParams = await params
  const product = await getProductBySlug(resolvedParams.slug)
  if (!product) return { title: t('product.notFoundTitle') }
  const siteName = t('seo.siteName')
  const seoTitle = product.seo?.title ?? `${product.name} | ${siteName}`
  const seoDesc =
    product.seo?.description ??
    (richTextExcerpt(product.description) || t('seo.productDesc').replace('{name}', product.name))
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
      <Container className="py-8 sm:py-10">
        <Breadcrumbs
          items={[
            { name: t('common.home'), href: '/' },
            ...(categorySlug ? [{ name: categoryName ?? '', href: `/category/${categorySlug}` }] : []),
            { name: product.name },
          ]}
        />

        {/* Product layout: gallery + info */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[55%_45%] lg:gap-12">
          {/* Gallery */}
          <Gallery images={galleryImages} productName={product.name} />

          {/* Info block */}
          <div className="space-y-6">
            {brandName && brandSlug ? (
              <Link
                href={`/brand/${brandSlug}`}
                className="inline-flex items-center border border-ink/18 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.1em] text-steel transition-colors hover:border-brass hover:text-brass"
              >
                {brandName}
              </Link>
            ) : null}

            <h1 className="font-display text-3xl font-semibold leading-tight tracking-[-0.02em] text-ink sm:text-4xl">
              {product.name}
            </h1>

            {/* Short spec bullets */}
            {product.shortSpec && product.shortSpec.length > 0 && (
              <ul className="space-y-2.5 text-sm text-ink2">
                {product.shortSpec.map((spec) => (
                  <li key={spec.id} className="flex items-start gap-3">
                    <span className="mt-2 h-1 w-1 shrink-0 bg-brass" />
                    <span>{spec.text}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* In-stock summary */}
            {hasInStockItem && (
              <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.1em]">
                <span className="inline-block h-2 w-2 rounded-full bg-ok" />
                <span className="text-ok">{t('product.inStockSummary')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Items table */}
        {items.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-5 border-b border-ink/12 pb-3 font-mono text-xs uppercase tracking-[0.16em] text-brass-dark">
              {t('product.itemsTitle')}
            </h2>
            <ItemsTable items={items} productSlug={product.slug ?? ''} />
          </section>
        )}

        {/* Description */}
        {product.description && (
          <section className="mt-12 max-w-3xl">
            <RichText content={product.description} />
          </section>
        )}
      </Container>
    </>
  )
}
