import { t } from '@/lib/i18n/bg'
import { getCompany } from '@/lib/payload/queries'

/**
 * Dark promo top-bar (redesign 1A). Company identity + COD reassurance in the
 * mono/uppercase technical treatment. Scrolls away above the sticky header.
 */
export async function PromoBar() {
  const company = await getCompany()

  return (
    <div className="bg-dark text-on-dark">
      <div className="mx-auto flex h-9 max-w-screen-xl items-center justify-center gap-3 px-4 font-mono text-[10px] tracking-[0.08em] sm:h-10 sm:justify-between sm:px-6 sm:text-[11px] sm:tracking-[0.1em] lg:px-8">
        <span className="hidden truncate uppercase sm:inline">
          {company.name} · гр. {company.city}, {company.addressLine}
        </span>
        <span className="shrink-0 uppercase">
          {company.phoneDisplay}
          <span className="mx-2 text-on-dark-muted">·</span>
          {t('topbar.cod')}
        </span>
      </div>
    </div>
  )
}
