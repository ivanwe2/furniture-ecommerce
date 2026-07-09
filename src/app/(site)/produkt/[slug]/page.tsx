import Link from 'next/link'
import { notFound } from 'next/navigation'
import { t } from '@/lib/i18n/bg'
import { Container, Badge } from '@/components/ui'
import { Gallery } from '@/components/catalog/Gallery'
import { ItemsTable } from '@/components/catalog/ItemsTable'
import { getProductBySlug, getCategoryPath } from '@/lib/payload/queries'
import type { Product, Media } from '@/payload-types'

interface ProductPageProps {
  params: Promise<{ slug: string }>
}

export default async function ProductPage({ params }: ProductPageProps) {
  const resolvedParams = await params
  const product = await getProductBySlug(resolvedParams.slug)

  if (!product) {
    notFound()
  }

  // Build breadcrumbs
  const categoryPath = product.category && typeof product.category === 'object' ? await getCategoryPath(product.category.id) : []

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
          {categorySlug && (
            <li className="flex items-center gap-2">
              <span aria-hidden="true">/</span>
              <Link href={`/kategoria/${categorySlug}`} className="hover:text-brass transition-colors">
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
            <Link href={`/marka/${brandSlug}`}>
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
