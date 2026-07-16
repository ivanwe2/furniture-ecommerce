import Link from 'next/link'
import { t } from '@/lib/i18n/bg'

/**
 * Prev / „страница N от M" / next pager (redesign R4). `basePath` carries the
 * leading path (e.g. `/category/panti`); the page number is appended as
 * `?page=`. Renders nothing for a single page; edge buttons show disabled.
 */
export function Pagination({
  basePath,
  page,
  totalPages,
}: {
  basePath: string
  page: number
  totalPages: number
}) {
  if (totalPages <= 1) return null

  const edge = 'border px-4 py-2 transition-colors'
  const active = 'border-ink/20 text-ink hover:border-brass hover:text-brass'
  const disabled = 'border-ink/10 text-ink/25'

  return (
    <nav
      aria-label="Pagination"
      className="mt-10 flex items-center justify-center gap-3 font-mono text-xs uppercase tracking-[0.1em]"
    >
      {page > 1 ? (
        <Link href={`${basePath}?page=${page - 1}`} className={`${edge} ${active}`}>
          ← {t('common.back')}
        </Link>
      ) : (
        <span className={`${edge} ${disabled}`}>← {t('common.back')}</span>
      )}
      <span className="text-steel">
        {t('common.pageOf').replace('{page}', String(page)).replace('{total}', String(totalPages))}
      </span>
      {page < totalPages ? (
        <Link href={`${basePath}?page=${page + 1}`} className={`${edge} ${active}`}>
          {t('common.next')} →
        </Link>
      ) : (
        <span className={`${edge} ${disabled}`}>{t('common.next')} →</span>
      )}
    </nav>
  )
}
