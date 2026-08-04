import Link from 'next/link'
import clsx from 'clsx'
import { t } from '@/lib/i18n/bg'
import { listingHref, type ListingParams } from '@/lib/catalog/href'
import { parseSort, SORT_KEYS, type SortKey } from '@/lib/catalog/sort'

const LABEL: Record<SortKey, Parameters<typeof t>[0]> = {
  name_asc: 'sort.nameAsc',
  price_asc: 'sort.priceAsc',
  price_desc: 'sort.priceDesc',
  newest: 'sort.newest',
}

/**
 * Sort control as plain links, not a `<select>`.
 *
 * Deliberate: this keeps the whole listing server-rendered. A JS control would
 * need `useSearchParams`, which opts the entire subtree into client rendering,
 * and would stop working with JS disabled. Links also give each ordering a real
 * URL a customer can share.
 *
 * Changing the sort resets to page 1 — staying on page 7 of a re-ordered list
 * shows an arbitrary slice of it.
 */
export function SortLinks({ basePath, params }: { basePath: string; params: ListingParams }) {
  const activeSort = parseSort(params.sort)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 font-mono text-[11px] uppercase tracking-[0.16em] text-steel">
        {t('sort.label')}
      </span>
      {SORT_KEYS.map((key) => {
        const isActive = key === activeSort
        return (
          <Link
            key={key}
            href={listingHref(basePath, params, { sort: key, page: undefined })}
            aria-current={isActive ? 'true' : undefined}
            className={clsx(
              'border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] transition-colors',
              isActive
                ? 'border-brass bg-brass/10 text-brass-dark'
                : 'border-ink/14 text-steel hover:border-brass hover:text-brass',
            )}
          >
            {t(LABEL[key])}
          </Link>
        )
      })}
    </div>
  )
}
