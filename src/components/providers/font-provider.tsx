'use client'

import { Playfair_Display, Inter } from 'next/font/google'
import clsx from 'clsx'

const display = Playfair_Display({
  subsets: ['cyrillic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
})

const body = Inter({
  subsets: ['cyrillic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
})

export function FontProvider({ children }: { children: React.ReactNode }) {
  return (
    <div className={clsx(display.variable, body.variable)}>
      {children}
    </div>
  )
}
