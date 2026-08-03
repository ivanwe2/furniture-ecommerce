'use client'

import Link from 'next/link'
import { MegaMenu } from './MegaMenu'
import { MobileNav } from './MobileNav'
import { SearchField } from './SearchField'
import { CartButton } from './CartButton'
import { BrandLogo } from './BrandLogo'
import { t } from '@/lib/i18n/bg'
import type { CategoryNode } from '@/lib/payload/queries'

interface HeaderProps {
  categories: CategoryNode[]
}

export function Header({ categories }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-ink/12 bg-cream">
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center gap-6 lg:h-[84px]">
          {/* Logo */}
          <Link href="/" className="shrink-0" aria-label="Настех - начало">
            <BrandLogo variant="dark" className="h-9 lg:h-11" />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden flex-1 items-center gap-7 lg:flex">
            <MegaMenu categories={categories} />
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
