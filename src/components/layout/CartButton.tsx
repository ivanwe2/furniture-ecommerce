'use client'

import Link from 'next/link'
import { useCart } from '@/lib/cart/store'
import { Badge } from '@/components/ui'

export function CartButton() {
  const lines = useCart((s) => s.lines)
  const totalQty = lines.reduce((sum, l) => sum + l.qty, 0)

  return (
    <Link href="/kolichka" className="relative inline-flex items-center p-2 text-ink hover:text-brass transition-colors">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6"
        aria-hidden="true"
      >
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 01-8 0" />
      </svg>
      {totalQty > 0 && (
        <Badge className="absolute -right-1.5 -top-1.5 bg-brass text-cream min-w-[20px] h-5 px-1 flex items-center justify-center rounded-full">
          {totalQty}
        </Badge>
      )}
    </Link>
  )
}
