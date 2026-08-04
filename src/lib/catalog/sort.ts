/**
 * Listing sort options.
 *
 * The URL value is NEVER passed to Payload directly. `?sort=` is
 * attacker-controlled and Payload's `sort` takes a field path, so forwarding it
 * raw would let anyone order by — and thereby probe — any column on the
 * collection, including hidden ones. Everything here goes through
 * `payloadSort()`, which only ever returns a value from this map.
 */

export const SORT_KEYS = ['name_asc', 'price_asc', 'price_desc', 'newest'] as const
export type SortKey = (typeof SORT_KEYS)[number]

export const DEFAULT_SORT: SortKey = 'name_asc'

/** URL value → Payload `sort` string. The only source of sort strings. */
const PAYLOAD_SORT: Record<SortKey, string> = {
  name_asc: 'name',
  // `minPriceEurCents` is denormalised in the Products beforeValidate hook —
  // prices live in the items array and cannot be sorted on directly.
  price_asc: 'minPriceEurCents',
  price_desc: '-minPriceEurCents',
  newest: '-createdAt',
}

/** Narrows an unknown URL value to a known key, falling back to the default. */
export function parseSort(raw: string | string[] | undefined): SortKey {
  const value = Array.isArray(raw) ? raw[0] : raw
  return (SORT_KEYS as readonly string[]).includes(value ?? '') ? (value as SortKey) : DEFAULT_SORT
}

/** Payload `sort` string for a key. Unknown input resolves to the default. */
export function payloadSort(raw: string | string[] | undefined): string {
  return PAYLOAD_SORT[parseSort(raw)]
}
