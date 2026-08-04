/**
 * Builds a listing URL that KEEPS the params already in the address bar.
 *
 * The pager used to hardcode `${basePath}?page=N`, which was harmless while
 * `page` was the only param — and silently destructive the moment sorting and
 * brand filtering existed, because going to page 2 would drop the sort and the
 * filter and quietly show a different list.
 *
 * Passing `undefined` (or an empty string) for a key removes it, which is how a
 * filter chip toggles itself off and how changing sort resets to page 1.
 */
export type ListingParams = Record<string, string | string[] | undefined>

export function listingHref(
  basePath: string,
  current: ListingParams,
  overrides: Record<string, string | number | undefined> = {},
): string {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(current)) {
    if (key in overrides) continue // the override decides, including removal
    const first = Array.isArray(value) ? value[0] : value
    if (first !== undefined && first !== '') params.set(key, first)
  }

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined || value === '') continue
    params.set(key, String(value))
  }

  // Stable ordering so the same view always has the same URL — otherwise the
  // cache key and any canonical tag would vary by param insertion order.
  params.sort()

  const qs = params.toString()
  return qs ? `${basePath}?${qs}` : basePath
}
