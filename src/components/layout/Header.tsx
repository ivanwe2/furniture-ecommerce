'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import clsx from 'clsx'
import { MegaMenu } from './MegaMenu'
import { MobileNav } from './MobileNav'
import { SearchField } from './SearchField'
import { CartButton } from './CartButton'
import { Wordmark } from './Wordmark'
import { t } from '@/lib/i18n/bg'
import type { CategoryNode } from '@/lib/payload/queries'

interface HeaderProps {
  categories: CategoryNode[]
}

/**
 * Sticky navigation bar, visible from the first paint on every page.
 *
 * It briefly hid behind a full-width sign band on the landing page; the client
 * found the band obtrusive ("много натрапчиво ми седи") and asked for the bar
 * back as it was. The BAR is therefore never hidden — only its wordmark is,
 * and only on the landing page, where the hero carries a large one and the two
 * would otherwise sit on screen together. Hiding the mark rather than the whole
 * bar is deliberate: with the band gone the hero starts at the top of the page,
 * so hiding the bar would open the landing page with no menu and no cart at all.
 */
export function Header({ categories }: HeaderProps) {
  const pathname = usePathname()
  // Derived, never synced. The hero mark only exists on `/`, so a navigation to
  // any other route must show the bar's mark immediately — deriving that from
  // the pathname means there is no state to fix up on route change, and no
  // frame on load where both marks are visible before an effect hides one.
  const isLanding = pathname === '/'
  const [scrolledPast, setScrolledPast] = useState(false)
  const showMark = !isLanding || scrolledPast

  useEffect(() => {
    if (!isLanding) return
    const sentinel = document.querySelector('[data-hero-mark-end]')
    // Fail open: no hero mark on the page means ours must simply show.
    // Deferred a frame because setting state straight from an effect body
    // cascades renders (and lint rejects it).
    if (!sentinel) {
      const id = requestAnimationFrame(() => setScrolledPast(true))
      return () => cancelAnimationFrame(id)
    }

    const evaluate = () => {
      const rect = sentinel.getBoundingClientRect()
      // A page that cannot scroll far enough to pass the hero mark would
      // otherwise never show ours at all.
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight
      const sentinelTop = rect.top + window.scrollY
      setScrolledPast(sentinelTop > maxScroll || rect.top < 0)
    }

    // `top < 0` is what distinguishes "scrolled up past it" from "still below
    // the fold", which both report isIntersecting === false.
    const io = new IntersectionObserver(evaluate, { threshold: 0 })
    io.observe(sentinel)
    // Page height is not fixed, and that changes whether the mark is reachable.
    const ro = new ResizeObserver(evaluate)
    ro.observe(document.body)
    const id = requestAnimationFrame(evaluate)
    return () => {
      io.disconnect()
      ro.disconnect()
      cancelAnimationFrame(id)
    }
  }, [isLanding])

  return (
    <header className="sticky top-0 z-40 border-b border-ink/12 bg-cream">
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center gap-6 lg:h-[84px]">
          {/* Logo. While hidden it keeps its space, so the nav beside it does
              not shift when the mark fades in. It is also taken out of the tab
              order and the a11y tree rather than left as an invisible target:
              the only time it is hidden is at the top of the landing page,
              where a "go home" link is redundant anyway. */}
          <Link
            href="/"
            className={clsx(
              'shrink-0 transition-opacity duration-300 ease-out motion-reduce:transition-none',
              !showMark && 'opacity-0 pointer-events-none',
            )}
            aria-label={t('logo.name')}
            aria-hidden={!showMark}
            tabIndex={showMark ? undefined : -1}
          >
            <Wordmark className="text-ink text-[13px] lg:text-[15px]" tracking="0.14em" stroke="0.35px" />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden flex-1 items-center gap-7 lg:flex">
            <MegaMenu categories={categories} />
            <Link
              href="/brands"
              className="font-mono text-xs uppercase tracking-[0.13em] text-ink transition-colors hover:text-brass"
            >
              {t('nav.brands')}
            </Link>
            <Link
              href="/contact"
              className="font-mono text-xs uppercase tracking-[0.13em] text-ink transition-colors hover:text-brass"
            >
              {t('nav.contact')}
            </Link>
          </nav>

          {/* Desktop search + cart */}
          <div className="ml-auto hidden items-center gap-5 lg:flex">
            <SearchField className="w-56 xl:w-64" />
            <CartButton />
          </div>

          {/* Mobile: cart + burger */}
          <div className="ml-auto flex items-center gap-3 lg:hidden">
            <CartButton />
            <MobileNav categories={categories} />
          </div>
        </div>
      </div>
    </header>
  )
}
