'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Scrolls to the top on forward navigation.
 *
 * App Router is documented to do this itself, but measurably does not here:
 * clicking a product low on a category listing keeps the old scroll offset, and
 * the browser then clamps it to the shorter page's maximum — landing the visitor
 * pinned to the BOTTOM of the new page. Measured on a 375px viewport, category →
 * product: scrollY stayed at 1592 while the document shrank 3169 → 2003 → 1934,
 * clamping to 1283 then 1214. Reported from a real phone by the client.
 *
 * Two things this deliberately does NOT do:
 *
 *  - **Back/forward is left alone.** A `popstate` sets a flag that suppresses
 *    the next reset, so returning to a long listing keeps your place — which is
 *    the whole point of scroll restoration, and matters most on the phone where
 *    the listing is longest.
 *  - **Hash links are left alone**, otherwise `#main` (the skip link) and any
 *    in-page anchor would jump back to the top instead of to their target.
 *
 * Keyed on pathname only, not searchParams: `useSearchParams` in a layout opts
 * the whole subtree into client rendering, and every case reported involves a
 * pathname change.
 */
export function ScrollReset() {
  const pathname = usePathname()
  const cameFromHistory = useRef(false)
  const isFirstRender = useRef(true)

  useEffect(() => {
    const onPopState = () => {
      cameFromHistory.current = true
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    // The initial render is not a navigation — the browser may be restoring a
    // position on reload, or honouring a hash. Don't override either.
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (cameFromHistory.current) {
      cameFromHistory.current = false
      return
    }
    if (window.location.hash) return

    window.scrollTo(0, 0)
  }, [pathname])

  return null
}
