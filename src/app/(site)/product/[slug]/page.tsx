import { notFound } from 'next/navigation'
import { t } from '@/lib/i18n/bg'
import { Container } from '@/components/ui'
import type { GalleryImage } from '@/components/catalog/Gallery'
import { ProductView, type ViewItem } from '@/components/catalog/ProductView'
import { ProductCard } from '@/components/catalog/ProductCard'
import { Breadcrumbs } from '@/components/catalog/Breadcrumbs'
import BreadcrumbList from '@/components/seo/BreadcrumbList'
import ProductJsonLd from '@/components/seo/ProductJsonLd'
import { RichText } from '@/components/richtext/RichText'
import { getCategoryPath, getCompany, getProductBySlug, getRelatedProducts, getSettings } from '@/lib/payload/queries'
import { availabilityOf, hasPrice, isOrderable } from '@/lib/availability'
import { imageUrl } from '@/lib/images'
import type { Media, Product } from '@/payload-types'

interface ProductPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ sku?: string | string[] }>
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

function asMedia(value: unknown): Media | null {
  return value && typeof value === 'object' && 'filename' in value && (value as Media).filename
    ? (value as Media)
    : null
}

function toGalleryImage(media: Media, alt: string): GalleryImage {
  return {
    key: String(media.id),
    detail: imageUrl(media, 'detail'),
    thumb: imageUrl(media, 'thumb'),
    zoom: imageUrl(media, 'zoom'),
    alt: media.alt || alt,
  }
}

function toViewItem(item: NonNullable<Product['items']>[number], productName: string): ViewItem {
  const image = asMedia(item.image)
  return {
    sku: item.sku,
    name: item.name,
    unit: item.unit ?? null,
    lengthMm: item.lengthMm ?? null,
    color: item.color ?? null,
    priceEurCents: hasPrice(item) ? item.priceEurCents : null,
    stockQty: item.stockQty ?? 0,
    image: image ? toGalleryImage(image, `${productName} — ${item.name}`) : null,
    specs: (item.specs ?? []).map((s) => ({ label: s.label, value: s.value })),
  }
}

export async function generateMetadata({ params }: ProductPageProps) {
  const resolvedParams = await params
  const product = await getProductBySlug(resolvedParams.slug)
  if (!product) return { title: t('product.notFoundTitle') }
  const siteName = t('seo.siteName')
  // Full title for OpenGraph (the layout title template isn't applied there);
  // the browser-tab title below lets the template add the „| Настех" suffix.
  const ogTitle = product.seo?.title ?? `${product.name} | ${siteName}`
  const seoDesc =
    product.seo?.description ??
    (richTextExcerpt(product.description) || t('seo.productDesc').replace('{name}', product.name))
  const firstImage = asMedia(product.gallery?.[0]?.image)
  return {
    // Custom SEO title used verbatim (absolute); otherwise the name + template.
    title: product.seo?.title ? { absolute: product.seo.title } : product.name,
    description: seoDesc,
    // Canonical without `?sku=` — every variant is the same page.
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      title: ogTitle,
      description: seoDesc,
      type: 'website',
      url: `/product/${product.slug}`,
      images: firstImage ? ([{ url: imageUrl(firstImage, 'og'), width: 1200, height: 630 }] as const) : undefined,
    },
  }
}

export default async function ProductPage({ params, searchParams }: ProductPageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams])
  const product = await getProductBySlug(slug)
  if (!product) notFound()

  const category = typeof product.category === 'object' ? product.category : null
  const brand =
    product.brand && typeof product.brand === 'object'
      ? { name: product.brand.name, slug: product.brand.slug ?? null }
      : null

  const [categoryPath, company, settings, related] = await Promise.all([
    category ? getCategoryPath(category.id) : Promise.resolve([]),
    getCompany(),
    getSettings(),
    getRelatedProducts(product),
  ])

  const rawItems = product.items ?? []
  const items = rawItems.map((item) => toViewItem(item, product.name))
  if (items.length === 0) notFound()

  // `?sku=` deep link (cart, shared links) → that variant; otherwise the first
  // one a customer can actually order, else simply the first.
  const requested = Array.isArray(query.sku) ? query.sku[0] : query.sku
  const initialSku =
    items.find((i) => i.sku === requested)?.sku ?? rawItems.find(isOrderable)?.sku ?? items[0]!.sku

  const gallery = (product.gallery ?? [])
    .map((entry) => asMedia(entry.image))
    .filter((m): m is Media => m !== null)
    .map((m) => toGalleryImage(m, product.name))

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nasteh.bg'
  const pageUrl = `${siteUrl}/product/${product.slug}`
  const coverMedia = asMedia(product.gallery?.[0]?.image) ?? rawItems.map((i) => asMedia(i.image)).find(Boolean) ?? null
  const ogImage = coverMedia ? imageUrl(coverMedia, 'og') : null

  const jsonLdBreadcrumbs = [
    { name: t('common.home'), url: '/' },
    ...categoryPath.map((c) => ({ name: c.name, url: `/category/${c.slug}` })),
    { name: product.name, url: `/product/${product.slug}` },
  ]

  return (
    <>
      <BreadcrumbList items={jsonLdBreadcrumbs} />
      <ProductJsonLd
        name={product.name}
        description={
          product.seo?.description ??
          (richTextExcerpt(product.description) || t('seo.productDesc').replace('{name}', product.name))
        }
        image={ogImage ? (ogImage.startsWith('http') ? ogImage : `${siteUrl}${ogImage}`) : null}
        brandName={brand?.name}
        categoryName={category?.name}
        url={pageUrl}
        offers={rawItems.filter(hasPrice).map((item) => ({
          sku: item.sku,
          priceEurCents: item.priceEurCents,
          inStock: availabilityOf(item) === 'inStock',
          url: `${pageUrl}?sku=${encodeURIComponent(item.sku)}`,
        }))}
      />
      <Container className="py-8 sm:py-10">
        {categoryPath.length > 0 && (
          <Breadcrumbs items={categoryPath.map((c) => ({ name: c.name, href: `/category/${c.slug}` }))} />
        )}

        <ProductView
          productSlug={product.slug ?? slug}
          productName={product.name}
          brand={brand}
          gallery={gallery}
          items={items}
          specs={(product.specs ?? []).map((s) => ({ label: s.label, value: s.value }))}
          phone={{ display: company.phoneDisplay, href: company.phoneHref }}
          leadTime={settings?.restockLeadTime?.trim() || null}
          initialSku={initialSku}
          description={product.description ? <RichText content={product.description} /> : null}
        />

        {related.length > 0 && (
          <section aria-labelledby="related-title" className="mt-16">
            <h2 id="related-title" className="mb-5 font-mono text-sm uppercase tracking-[0.16em] text-ink2">
              {t('product.relatedTitle')}
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
              {related.map((p) => (
                <ProductCard
                  key={p.id}
                  product={{
                    name: p.name,
                    slug: p.slug ?? '',
                    items: p.items ?? [],
                    gallery: p.gallery ?? undefined,
                    category: typeof p.category === 'object' ? p.category : undefined,
                  }}
                />
              ))}
            </div>
          </section>
        )}
      </Container>
    </>
  )
}
