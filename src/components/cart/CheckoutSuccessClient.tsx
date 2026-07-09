'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { t } from '@/lib/i18n/bg'
import { useCart } from '@/lib/cart/store'
import { Container } from '@/components/ui'

export function CheckoutSuccessClient({ orderNumber }: { orderNumber: string }) {
  const clear = useCart((s) => s.clear)

  useEffect(() => {
    clear()
  }, [clear])

  return (
    <Container className="py-16">
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-full bg-ok/15 text-ok"
          aria-hidden="true"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-7 w-7"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-ink">{t('checkout.successTitle')}</h1>

        <p className="text-sm text-steel">
          {t('checkout.orderNumber')}:{' '}
          <span className="font-mono font-semibold text-ink">{orderNumber}</span>
        </p>

        <p className="text-steel">{t('checkout.successBody')}</p>

        <Link
          href="/"
          className="mt-2 inline-flex items-center justify-center rounded bg-brass px-5 py-2.5 text-sm font-medium text-cream hover:bg-brass/90"
        >
          {t('common.home')}
        </Link>
      </div>
    </Container>
  )
}
