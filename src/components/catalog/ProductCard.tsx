import Link from 'next/link'
import { Price } from '@/components/ui/Price'
import { imageUrl, imageSrcSet } from '@/lib/images'
import type { Media, Product } from '@/payload-types'

interface ProductCardProps {
  product: Pick<Product, 'name' | 'slug'> & {
    items?: NonNullable<Product['items']>
    gallery?: NonNullable<Product['gallery']>
    category?: number | { name: string }
  }
}

export function ProductCard({ product }: ProductCardProps) {
  const coverImage = (product.gallery?.[0]?.image as Media | null) ?? null
  const items = product.items ?? []
  const hasItems = items.length > 0
  const minPrice = hasItems ? Math.min(...items.map((i) => i.priceEurCents)) : null
  const singleItem = hasItems && items.length === 1

  const categoryName = typeof product.category === 'object' && product.category?.name ? product.category.name : undefined

  return (
    <Link href={`/produkt/${product.slug}`} className="group block">
      {/* Image */}
      <div className="aspect-[4/3] w-full overflow-hidden rounded bg-cream">
        {coverImage && typeof coverImage === 'object' && 'filename' in coverImage && coverImage.filename ? (
          <img
            src={imageUrl(coverImage, 'card')}
            srcSet={imageSrcSet(coverImage, ['thumb', 'card'])}
            alt={(coverImage as Media).alt ?? product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-sand">
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
      </div>

      {/* Info */}
      <div className="mt-3 space-y-1">
        <h3 className="line-clamp-2 text-sm font-medium text-ink transition-colors group-hover:text-brass">
          {product.name}
        </h3>
        {categoryName && (
          <p className="text-xs text-steel">{categoryName}</p>
        )}
        <div className="flex items-baseline gap-2">
          {singleItem ? (
            <Price eurCents={items[0]!.priceEurCents} />
          ) : minPrice !== null ? (
            <span className="text-sm text-ink">
              {'от '}
              <Price eurCents={minPrice} />
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  )
}
