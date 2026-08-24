import { getCompany } from '@/lib/payload/queries'

/**
 * Dark promo top-bar (redesign 1A). Company identity in the mono/uppercase
 * technical treatment. Scrolls away above the sticky header.
 *
 * Payment terms deliberately do NOT appear here: the client asked for
 * "наложен платеж" to be stated only in the cart/checkout, not on every page.
 */
export async function PromoBar() {
  const company = await getCompany()

  return (
    <div className="bg-dark text-on-dark">
      <div className="mx-auto flex h-9 max-w-screen-xl items-center justify-center gap-3 px-4 font-mono text-[10px] tracking-[0.08em] sm:h-10 sm:justify-between sm:px-6 sm:text-[11px] sm:tracking-[0.1em] lg:px-8">
        <span className="hidden truncate uppercase sm:inline">
          {company.name} · гр. {company.city}, {company.addressLine}
        </span>
        <span className="shrink-0 uppercase">{company.phoneDisplay}</span>
      </div>
    </div>
  )
}
