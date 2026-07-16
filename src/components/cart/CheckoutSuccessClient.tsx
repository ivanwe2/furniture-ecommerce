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
    <Container className="py-16 sm:py-24">
      <div className="mx-auto flex max-w-md flex-col items-center gap-5 text-center">
        <div
          className="flex h-14 w-14 items-center justify-center border border-ok/30 bg-ok/10 text-ok"
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

        <h1 className="font-display text-3xl font-semibold tracking-[-0.02em] text-ink">
          {t('checkout.successTitle')}
        </h1>

        <div className="flex items-center gap-2 border border-ink/14 bg-raised px-4 py-2 font-mono text-xs uppercase tracking-[0.1em]">
          <span className="text-steel">{t('checkout.orderNumber')}</span>
          <span className="font-semibold text-ink">{orderNumber}</span>
        </div>

        <p className="max-w-sm leading-relaxed text-ink2">{t('checkout.successBody')}</p>

        <Link
          href="/"
          className="mt-1 inline-flex items-center justify-center gap-2 bg-brass px-6 py-3 text-sm font-semibold text-raised transition hover:brightness-90"
        >
          {t('common.home')} <span aria-hidden="true">→</span>
        </Link>
      </div>
    </Container>
  )
}
