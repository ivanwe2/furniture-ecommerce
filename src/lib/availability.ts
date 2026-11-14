/**
 * Whether an item row can be ordered, and what the storefront calls it. The one
 * place this rule lives — the product page, cart, checkout and the order path
 * (`resolveCartLines`) all ask here, so they can never disagree (Phase 12).
 *
 * - `onRequest` — no price („по запитване"). Never orderable, whatever the stock.
 * - `soldOut`   — priced, stock 0 („Изчерпан").
 * - `inStock`   — priced and stock > 0. The only orderable state.
 */
export type Availability = 'inStock' | 'soldOut' | 'onRequest'

export type ItemAvailabilityInput = {
  priceEurCents?: number | null
  stockQty?: number | null
}

export function hasPrice<T extends ItemAvailabilityInput>(
  item: T,
): item is T & { priceEurCents: number } {
  return typeof item.priceEurCents === 'number' && Number.isInteger(item.priceEurCents) && item.priceEurCents > 0
}

export function availabilityOf(item: ItemAvailabilityInput): Availability {
  if (!hasPrice(item)) return 'onRequest'
  return (item.stockQty ?? 0) > 0 ? 'inStock' : 'soldOut'
}

export function isOrderable<T extends ItemAvailabilityInput>(
  item: T,
): item is T & { priceEurCents: number } {
  return availabilityOf(item) === 'inStock'
}
