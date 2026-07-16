'use client'

import Link from 'next/link'
import { t } from '@/lib/i18n/bg'
import { useCart } from '@/lib/cart/store'

export function CartButton() {
  const lines = useCart((s) => s.lines)
  const totalQty = lines.reduce((sum, l) => sum + l.qty, 0)

  return (
    <Link
      href="/cart"
      className="inline-flex items-center gap-2 border border-ink/20 px-3 py-2 text-ink transition-colors hover:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
      aria-label={`${t('cart.title')}: ${totalQty}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 01-8 0" />
      </svg>
      <span className="font-mono text-[11px] uppercase tracking-[0.1em]">
        <span className="hidden sm:inline">{t('cart.title')} </span>
        <span className="hidden text-ink/40 sm:inline">/ </span>
        <span className="tabular-nums">{totalQty}</span>
      </span>
    </Link>
  )
}
