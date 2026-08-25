'use client'

import { usePathname } from 'next/navigation'
import { Wordmark } from './Wordmark'

/**
 * The storefront sign at the top of the landing page: the wordmark alone on a
 * dark fascia, directly under the info strip so the two read as one shopfront.
 *
 * Landing only. On inner pages the navbar already carries the mark, and a
 * full-width band there would just push the content down — the visitor has
 * arrived by navigation and wants the page, not the shopfront again.
 *
 * Scrolling takes the band away and the sticky header slides into its place;
 * the sentinel below is what tells the header when that moment is, which ties
 * the trigger to the band's real height at each breakpoint rather than to a
 * hard-coded scroll offset. Its ABSENCE is equally meaningful: on a page with
 * no band the header simply stays visible (see Header.tsx).
 */
export function SignBand() {
  const pathname = usePathname()
  if (pathname !== '/') return null

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
