'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
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

/** How far down the homepage the bar waits before sliding in. */
const REVEAL_AT = 140

export function Header({ categories }: HeaderProps) {
  const pathname = usePathname()
  // Client feedback: „да се махне отгоре" — the mark should not sit over the
  // hero. Only the homepage hides the bar; every other page is entered by
  // navigation and must offer its nav immediately. (And only from lg up — see
  // the class list below.)
  const hidesAtTop = pathname === '/'
  const [scrolledPast, setScrolledPast] = useState(false)
  const [tabbedInto, setTabbedInto] = useState(false)
  // Derived, not synced: the bar persists across navigations, so a state copy
  // of "is the homepage" would need an effect to correct itself on every route
  // change (and setting state straight from an effect cascades renders).
  const revealed = !hidesAtTop || scrolledPast || tabbedInto

  useEffect(() => {
    if (!hidesAtTop) return
    const read = () => setScrolledPast(window.scrollY > REVEAL_AT)
    // rAF rather than a direct call: a reload part-way down the page must not
    // start hidden, but reading it synchronously here would be a render cascade.
    const id = requestAnimationFrame(read)
    window.addEventListener('scroll', read, { passive: true })
    return () => {
      cancelAnimationFrame(id)
      window.removeEventListener('scroll', read)
    }
  }, [hidesAtTop])

  return (
    <header
      // Hidden state keeps the bar in flow and merely lifts it: the space it
      // leaves is cream on cream, so nothing visibly shifts when it slides in.
      // Deliberately NOT aria-hidden/inert: hiding a focusable region from the
      // a11y tree would strip the nav from screen-reader and keyboard users,
      // who may never scroll. It stays reachable, and `onFocusCapture` brings
      // it back into view the moment it is tabbed into; `pointer-events-none`
      // stops a mouse from hitting links it cannot see.
      onFocusCapture={() => setTabbedInto(true)}
      className={clsx(
        'sticky top-0 z-40 border-b border-ink/12 bg-cream',
        'transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none',
        // Desktop only. Below lg the bar always stays put: on a phone hiding it
        // would also take the burger menu and the cart off the landing screen,
        // and there is no room up there for the brand statement anyway. Gated in
        // CSS rather than by matchMedia so there is no viewport guess to hydrate.
        !revealed && 'lg:-translate-y-full lg:opacity-0 lg:pointer-events-none',
      )}
    >
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center gap-6 lg:h-[84px]">
          {/* Logo */}
          <Link href="/" className="shrink-0" aria-label={t('logo.name')}>
            <Wordmark className="text-ink text-[13px] lg:text-[15px]" tracking="0.14em" />
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
