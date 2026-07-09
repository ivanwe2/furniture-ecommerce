'use client'

import Link from 'next/link'
import { MegaMenu } from './MegaMenu'
import { MobileNav } from './MobileNav'
import { SearchField } from './SearchField'
import { CartButton } from './CartButton'
import type { CategoryNode } from '@/lib/payload/queries'

interface HeaderProps {
  categories: CategoryNode[]
}

export function Header({ categories }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-cream border-b border-sand">
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center gap-4 lg:gap-8">
          {/* Logo */}
          <Link href="/" className="shrink-0">
            <span className="text-xl font-bold text-ink tracking-tight">НАСТЕХ</span>
          </Link>

          {/* Desktop nav + search + cart */}
          <div className="hidden lg:flex flex-1 items-center gap-6">
            <MegaMenu categories={categories} />
            <SearchField />
            <CartButton />
          </div>

          {/* Mobile: burger + cart */}
          <div className="flex lg:hidden ml-auto items-center gap-2">
            <CartButton />
            <MobileNav categories={categories} />
          </div>
        </div>
      </div>
    </header>
  )
}
