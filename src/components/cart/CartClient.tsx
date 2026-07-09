'use client'

import Link from 'next/link'
import { t } from '@/lib/i18n/bg'
import { useCart, type CartLine } from '@/lib/cart/store'
import { computeTotals, type ResolvedLine as TotalsResolvedLine } from '@/lib/cart/totals'
import { Container, Price, Skeleton, Alert } from '@/components/ui'
import clsx from 'clsx'
import React, { useState, useCallback } from 'react'

interface CartClientProps {
  resolution: Map<string, TotalsResolvedLine & { inStock: boolean }>
}

export function CartClient({ resolution }: CartClientProps) {
  const lines = useCart((s) => s.lines)
  const hydrated = useCart((s) => s.hydrated)
  const setQty = useCart((s) => s.setQty)
  const remove = useCart((s) => s.remove)

  if (!hydrated) {
    return <CartSkeleton />
  }

  if (lines.length === 0) {
    return (
      <Container className="py-16">
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <h1 className="text-xl font-semibold text-ink">{t('cart.title')}</h1>
          <p className="text-steel">{t('cart.empty')}</p>
          <Link href="/" className="mt-2 inline-flex items-center justify-center rounded bg-brass px-5 py-2.5 text-sm font-medium text-cream hover:bg-brass/90">
            {t('cart.goShopping')}
          </Link>
        </div>
      </Container>
    )
  }

  // Build resolution map matching totals.ts format (with qty from cart)
  const resolvedMap = new Map<string, TotalsResolvedLine>()
  for (const line of lines) {
    const key = `${line.productSlug}:${line.sku}`
    const data = resolution.get(key)
    if (data) {
      resolvedMap.set(key, {
        productSlug: data.productSlug,
        sku: data.sku,
        qty: line.qty,
        name: data.name,
        unit: data.unit,
        priceEurCents: data.priceEurCents,
      })
    }
  }

  const result = computeTotals({ lines, resolution: resolvedMap })

  return (
    <Container className="py-8">
      <h1 className="mb-6 text-xl font-semibold text-ink">{t('cart.title')}</h1>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px]">
        {/* Line items */}
        <div className="space-y-4">
          {result.ok.map((line) => (
            <CartLineItem key={line.sku} line={line} setQty={setQty} remove={remove} />
          ))}
          {result.stale.map((line) => (
            <StaleLineItem key={line.sku} line={line} remove={remove} />
          ))}
        </div>

        {/* Summary card */}
        <div className="rounded-lg border border-sand bg-cream p-6 space-y-4">
          <h2 className="text-base font-semibold text-ink">{t('cart.total')}</h2>
          <div className="flex justify-between items-baseline">
            <span className="text-sm text-steel">{result.ok.length} {result.ok.length === 1 ? 'артикул' : 'артикула'}</span>
            <Price eurCents={result.subtotalEurCents} className="text-lg font-semibold" />
          </div>
          <p className="text-xs text-steel">{t('cart.codNote')}</p>
          <p className="text-xs text-steel">{t('cart.deliveryNote')}</p>
          {result.ok.length > 0 && (
            <Link
              href="/checkout"
              className={clsx(
                'block w-full rounded bg-brass px-5 py-2.5 text-center text-sm font-medium text-cream hover:bg-brass/90',
              )}
            >
              {t('cart.checkout')}
            </Link>
          )}
        </div>
      </div>
    </Container>
  )
}

function CartLineItem({ line, setQty, remove }: {
  line: TotalsResolvedLine
  setQty: (sku: string, qty: number) => void
  remove: (sku: string) => void
}) {
  const [qty, setLocalQty] = useState(line.qty)
  const clamp = useCallback((q: number) => Math.min(999, Math.max(1, Math.trunc(q) || 1)), [])

  if (qty !== line.qty) {
    setLocalQty(line.qty)
  }

  const handleQtyChange = useCallback((v: number) => {
    setLocalQty(v)
    setQty(line.sku, v)
  }, [line.sku, setQty])

  const lineTotal = line.priceEurCents * qty

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-sand bg-cream p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <Link href={`/product/${line.productSlug}`} className="font-medium text-ink hover:text-brass transition-colors">
          {line.name}
        </Link>
        <p className="mt-0.5 text-xs font-mono text-steel">{line.sku} · {line.unit}</p>
      </div>

      <div className="flex items-center gap-4 sm:gap-6">
        <Price eurCents={line.priceEurCents} />

        <QtyStepper value={qty} onChange={handleQtyChange} clamp={clamp} />

        <Price eurCents={lineTotal} className="min-w-[80px] text-right" />

        <button
          onClick={() => remove(line.sku)}
          className="ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded bg-sand text-steel hover:text-danger transition-colors"
          aria-label={t('cart.remove')}
        >
          ×
        </button>
      </div>
    </div>
  )
}

function StaleLineItem({ line, remove }: {
  line: CartLine
  remove: (sku: string) => void
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-sand bg-cream p-4 opacity-60 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <span className="font-medium text-ink">{line.productSlug}</span>
        <p className="mt-0.5 text-xs font-mono text-steel">{line.sku} · {line.qty} бр.</p>
      </div>
      <Alert variant="danger" className="text-xs max-w-[280px]">
        {t('cart.stale')}
      </Alert>
      <button
        onClick={() => remove(line.sku)}
        className="ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded bg-sand text-steel hover:text-danger transition-colors"
        aria-label={t('cart.remove')}
      >
        ×
      </button>
    </div>
  )
}

function QtyStepper({ value, onChange, clamp }: {
  value: number
  onChange: (v: number) => void
  clamp: (q: number) => number
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(clamp(value - 1))}
        className="h-8 w-8 rounded bg-sand text-ink hover:bg-sand/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass flex items-center justify-center"
        aria-label="Намали количество"
      >
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          const raw = Number(e.target.value)
          onChange(clamp(raw))
        }}
        className="h-8 w-12 rounded bg-transparent text-center text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-brass"
        aria-label="Количество"
      />
      <button
        onClick={() => onChange(clamp(value + 1))}
        className="h-8 w-8 rounded bg-sand text-ink hover:bg-sand/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass flex items-center justify-center"
        aria-label="Увеличи количество"
      >
        +
      </button>
    </div>
  )
}

function CartSkeleton() {
  return (
    <Container className="py-8">
      <Skeleton className="mb-6 h-7 w-32" />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    </Container>
  )
}
