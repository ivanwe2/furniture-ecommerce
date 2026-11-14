import { availabilityOf, hasPrice } from '@/lib/availability'
import type { ResolvedLine } from './totals'

export type CartResolutionEntry = Omit<ResolvedLine, 'qty'> & { inStock: boolean }

type ProductLike = {
  slug?: string | null
  items?:
    | {
        name: string
        sku: string
        unit?: string | null
        priceEurCents?: number | null
        stockQty?: number | null
      }[]
    | null
}

/**
 * The `productSlug:sku` → line lookup the cart and checkout pages render from.
 * Price-on-request items are left out on purpose: they can never be ordered
 * (lib/availability.ts), so a cart line pointing at one — e.g. the owner
 * removed its price after it was added — shows as "no longer available"
 * instead of a line priced at nothing. The order action re-checks all of this
 * server-side (`resolveCartLines`); this map only drives what the page shows.
 */
export function cartResolutionFrom(
  products: ProductLike[],
  defaultUnit: string,
): Map<string, CartResolutionEntry> {
  const resolution = new Map<string, CartResolutionEntry>()
  for (const product of products) {
    if (!product.slug || !product.items) continue
    for (const item of product.items) {
      if (!hasPrice(item)) continue
      resolution.set(`${product.slug}:${item.sku}`, {
        productSlug: product.slug,
        sku: item.sku,
        name: item.name,
        unit: item.unit ?? defaultUnit,
        priceEurCents: item.priceEurCents,
        inStock: availabilityOf(item) === 'inStock',
      })
    }
  }
  return resolution
}
