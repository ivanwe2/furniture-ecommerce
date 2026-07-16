import Link from 'next/link'
import { Price } from '@/components/ui/Price'
import { imageUrl, imageSrcSet } from '@/lib/images'
import { t } from '@/lib/i18n/bg'
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

  const categoryName =
    typeof product.category === 'object' && product.category?.name ? product.category.name : undefined
  const hasImage = coverImage && typeof coverImage === 'object' && 'filename' in coverImage && coverImage.filename

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group flex flex-col border border-ink/14 bg-raised transition-colors hover:border-brass"
    >
      {/* Image / placeholder */}
      <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-ink/10">
        {hasImage ? (
          <img
            src={imageUrl(coverImage, 'card')}
            srcSet={imageSrcSet(coverImage, ['thumb', 'card'])}
            alt={(coverImage as Media).alt ?? product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="hatch absolute inset-0">
            <span className="absolute bottom-3 left-4 font-mono text-[10px] tracking-[0.12em] text-steel">
              {t('home.productShot')}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col p-4">
        {categoryName && (
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-steel">{categoryName}</span>
        )}
        <h3 className="mt-1 line-clamp-2 font-display text-[15px] font-semibold leading-snug text-ink transition-colors group-hover:text-brass">
          {product.name}
        </h3>
        <div className="mt-auto pt-3 font-mono text-sm">
          {singleItem ? (
            <Price eurCents={items[0]!.priceEurCents} className="text-ink" />
          ) : minPrice !== null ? (
            <span className="text-ink">
              <span className="text-steel">{t('catalog.from')} </span>
              <Price eurCents={minPrice} className="text-ink" />
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  )
}
