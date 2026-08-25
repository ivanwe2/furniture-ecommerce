import { Wordmark } from '@/components/layout/Wordmark'

/**
 * The storefront sign, rebuilt at the top of every page: the wordmark alone on
 * a dark fascia, directly under the info strip so the two read as one shopfront.
 *
 * Client feedback — the business-card lockup „мн мн не се вижда", so the mark
 * leaves the header and gets a band where it can actually be read. Scrolling
 * takes the band away and the sticky header slides into its place; the sentinel
 * below is what tells the header when that moment is (see Header.tsx), which
 * keeps the trigger tied to the band's real height at every breakpoint instead
 * of to a hard-coded scroll offset.
 */
export function SignBand() {
  return (
    <section className="bg-dark">
      <div className="flex items-center justify-center px-6 py-9 sm:py-10 lg:py-12">
        <Wordmark
          className="text-on-dark-bright text-[6.2vw] sm:text-[28px] lg:text-[40px]"
          tracking="0.26em"
        />
      </div>
      <div data-banner-end aria-hidden="true" />
    </section>
  )
}
