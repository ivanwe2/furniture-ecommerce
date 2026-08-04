import Link from 'next/link'
import clsx from 'clsx'
import { t } from '@/lib/i18n/bg'
import { listingHref, type ListingParams } from '@/lib/catalog/href'
import type { BrandWithCount } from '@/lib/payload/queries'

/**
 * Brand filter for a category listing — „всички" plus one chip per brand
 * actually present here, each with its count.
 *
 * Chips are links, matching SortLinks: the whole listing stays server-rendered
 * and every filtered view has a shareable URL. Clicking the active brand clears
 * the filter (the chip toggles), so there is always a way back without hunting
 * for a separate reset control.
 *
 * Selecting a brand resets to page 1 — a narrower list has fewer pages, and
 * page 7 of it is usually empty.
 */
export function BrandFilterChips({
  basePath,
  params,
  brands,
}: {
  basePath: string
  params: ListingParams
  brands: BrandWithCount[]
}) {
  // Nothing to choose between — one brand filters to the same list.
  if (brands.length < 2) return null

  const activeRaw = Array.isArray(params.brand) ? params.brand[0] : params.brand
  const active = brands.some((b) => b.slug === activeRaw) ? activeRaw : undefined

  const chip = (isActive: boolean) =>
    clsx(
      'border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] transition-colors',
      isActive
        ? 'border-brass bg-brass/10 text-brass-dark'
        : 'border-ink/14 text-steel hover:border-brass hover:text-brass',
    )

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 font-mono text-[11px] uppercase tracking-[0.16em] text-steel">
        {t('filter.brand')}
      </span>

      <Link
        href={listingHref(basePath, params, { brand: undefined, page: undefined })}
        aria-current={active ? undefined : 'true'}
        className={chip(!active)}
      >
        {t('filter.all')}
      </Link>

      {brands.map((brand) => {
        const isActive = brand.slug === active
        return (
          <Link
            key={brand.id}
            // Clicking the active chip clears the filter rather than re-applying it.
            href={listingHref(basePath, params, {
              brand: isActive ? undefined : (brand.slug ?? undefined),
              page: undefined,
            })}
            aria-current={isActive ? 'true' : undefined}
            className={chip(isActive)}
          >
            {brand.name} ({brand.productCount})
          </Link>
        )
      })}
    </div>
  )
}
