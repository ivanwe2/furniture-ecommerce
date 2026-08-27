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

export function Header({ categories }: HeaderProps) {
  // Re-run per route: the band only exists on the landing page, so navigating
  // away leaves the observer watching a detached node and the bar would stay
  // hidden on a page that has no band at all.
  const pathname = usePathname()
  // The bar is hidden while the sign band is on screen and slides into its place
  // once it scrolls away. The trigger is a sentinel at the band's base rather
  // than a pixel threshold, so it stays correct whatever height the band takes
  // at a given breakpoint — and it costs no scroll handler.
  const [revealed, setRevealed] = useState(false)
  const [tabbedInto, setTabbedInto] = useState(false)

  useEffect(() => {
    const sentinel = document.querySelector('[data-banner-end]')
    // Fail open: no band on the page means the bar must simply be visible.
    // Deferred a frame because setting state straight from an effect body
    // cascades renders (and lint rejects it).
    if (!sentinel) {
      const id = requestAnimationFrame(() => setRevealed(true))
      return () => cancelAnimationFrame(id)
    }

    const evaluate = () => {
      const rect = sentinel.getBoundingClientRect()
      // A page shorter than the viewport can never scroll the band away, so
      // waiting for it would leave that page with NO navigation at all — an
      // empty cart is exactly that. Show the bar when the band is out of
      // reach, as well as when it has actually been scrolled past.
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight
      const sentinelTop = rect.top + window.scrollY
      setRevealed(sentinelTop > maxScroll || rect.top < 0)
    }

    // `top < 0` is what distinguishes "scrolled up past it" from "still below
    // the fold", which both report isIntersecting === false.
    const io = new IntersectionObserver(evaluate, { threshold: 0 })
    io.observe(sentinel)
    // Page height is not fixed — a cart gains rows, an accordion opens — and
    // that changes whether the band is reachable at all.
    const ro = new ResizeObserver(evaluate)
    ro.observe(document.body)
    const id = requestAnimationFrame(evaluate)
    return () => {
      io.disconnect()
      ro.disconnect()
      cancelAnimationFrame(id)
    }
  }, [pathname])

  const showBar = revealed || tabbedInto

  return (
    <header
      // Hidden state keeps the bar in flow and merely lifts it: the space it
      // leaves is cream on cream, so nothing visibly shifts when it slides in.
      // Deliberately NOT aria-hidden/inert: hiding a focusable region from the
      // a11y tree would strip the nav from screen-reader and keyboard users,
      // who may never scroll. It stays reachable, and `onFocusCapture` brings
      // it back into view the moment it is tabbed into; `pointer-events-none`
      // stops a mouse from hitting links it cannot see.
      onFocusCapture={(e) => {
        // Only a KEYBOARD focus pins the bar open. A mouse click on a link in
        // the bar focuses it too, so without the :focus-visible test, clicking
        // the logo to go home left the bar pinned open for the rest of the
        // session — visible at the top of the landing page alongside the band.
        const el = e.target
        if (el instanceof HTMLElement && el.matches(':focus-visible')) setTabbedInto(true)
      }}
      onBlurCapture={(e) => {
        // Moving between links inside the bar keeps it open; focus leaving it
        // releases the pin, so it can hide again on scroll.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setTabbedInto(false)
      }}
      className={clsx(
        'sticky top-0 z-40 border-b border-ink/12 bg-cream',
        'transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none',
        // Every width, not just desktop: the band is the top of the landing page
        // on phones too, and the bar slides in behind it. This only ever applies
        // where a band exists — inner pages have none, so the bar is present the
        // moment they load.
        !showBar && '-translate-y-full opacity-0 pointer-events-none',
      )}
    >
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center gap-6 lg:h-[84px]">
          {/* Logo */}
          <Link href="/" className="shrink-0" aria-label={t('logo.name')}>
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
