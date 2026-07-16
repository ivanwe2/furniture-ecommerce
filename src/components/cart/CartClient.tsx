'use client'

import Link from 'next/link'
import { t } from '@/lib/i18n/bg'
import { useCart, type CartLine } from '@/lib/cart/store'
import { computeTotals, type ResolvedLine as TotalsResolvedLine } from '@/lib/cart/totals'
import { Container, Price, Skeleton, Alert } from '@/components/ui'
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
      <Container className="py-16 sm:py-24">
        <div className="flex flex-col items-center justify-center gap-5 text-center">
          <div className="font-mono text-xs uppercase tracking-[0.16em] text-brass-dark">{t('cart.title')}</div>
          <h1 className="font-display text-3xl font-semibold tracking-[-0.02em] text-ink">{t('cart.empty')}</h1>
          <Link
            href="/"
            className="mt-1 inline-flex items-center justify-center gap-2 bg-brass px-6 py-3 text-sm font-semibold text-raised transition hover:brightness-90"
          >
            {t('cart.goShopping')} <span aria-hidden="true">→</span>
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
    <Container className="py-8 sm:py-10">
      <div className="mb-7 flex items-baseline justify-between gap-4 border-b border-ink/12 pb-5">
        <h1 className="font-display text-3xl font-semibold tracking-[-0.02em] text-ink sm:text-4xl">
          {t('cart.title')}
        </h1>
        <span className="font-mono text-xs uppercase tracking-[0.1em] text-steel">
          {result.ok.length} {result.ok.length === 1 ? t('cart.itemSingular') : t('cart.itemPlural')}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px]">
        {/* Line items */}
        <div className="space-y-3">
          {result.ok.map((line) => (
            <CartLineItem key={line.sku} line={line} setQty={setQty} remove={remove} />
          ))}
          {result.stale.map((line) => (
            <StaleLineItem key={line.sku} line={line} remove={remove} />
          ))}
        </div>

        {/* Summary card */}
        <div className="h-fit border border-ink/14 bg-raised p-6 lg:sticky lg:top-24">
          <h2 className="font-mono text-xs uppercase tracking-[0.16em] text-steel">{t('cart.total')}</h2>
          <div className="mt-4 flex items-baseline justify-between border-b border-ink/10 pb-4">
            <span className="text-sm text-steel">
              {result.ok.length} {result.ok.length === 1 ? t('cart.itemSingular') : t('cart.itemPlural')}
            </span>
            <Price eurCents={result.subtotalEurCents} className="font-mono text-xl font-semibold text-ink" />
          </div>
          <p className="mt-4 text-xs leading-relaxed text-steel">{t('cart.codNote')}</p>
          <p className="mt-2 text-xs leading-relaxed text-steel">{t('cart.deliveryNote')}</p>
          {result.ok.length > 0 && (
            <Link
              href="/checkout"
              className="mt-5 flex w-full items-center justify-center gap-2 bg-brass px-5 py-3 text-sm font-semibold text-raised transition hover:brightness-90"
            >
              {t('cart.checkout')} <span aria-hidden="true">→</span>
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
    <div className="flex flex-col gap-3 border border-ink/14 bg-raised p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <Link href={`/product/${line.productSlug}`} className="font-display font-semibold text-ink transition-colors hover:text-brass">
          {line.name}
        </Link>
        <p className="mt-1 font-mono text-xs text-steel">{line.sku} · {line.unit}</p>
      </div>

      <div className="flex items-center gap-4 sm:gap-5">
        <Price eurCents={line.priceEurCents} className="font-mono text-sm text-steel" />

        <QtyStepper value={qty} onChange={handleQtyChange} clamp={clamp} />

        <Price eurCents={lineTotal} className="min-w-[80px] text-right font-mono font-semibold text-ink" />

        <button
          onClick={() => remove(line.sku)}
          className="ml-1 flex h-8 w-8 shrink-0 items-center justify-center border border-ink/15 text-steel transition-colors hover:border-danger hover:text-danger"
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
    <div className="flex flex-col gap-2 border border-ink/14 bg-raised p-4 opacity-70 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <span className="font-display font-semibold text-ink">{line.productSlug}</span>
        <p className="mt-1 font-mono text-xs text-steel">{line.sku} · {line.qty} {t('common.unitDefault')}</p>
      </div>
      <Alert variant="danger" className="max-w-[280px] text-xs">
        {t('cart.stale')}
      </Alert>
      <button
        onClick={() => remove(line.sku)}
        className="ml-1 flex h-8 w-8 shrink-0 items-center justify-center border border-ink/15 text-steel transition-colors hover:border-danger hover:text-danger"
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
  const stepBtn =
    'flex h-8 w-8 items-center justify-center border border-ink/20 text-ink transition-colors hover:border-brass hover:text-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass'

  return (
    <div className="flex items-center">
      <button
        onClick={() => onChange(clamp(value - 1))}
        className={stepBtn}
        aria-label={t('product.qtyDecrease')}
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
        className="h-8 w-11 border-y border-ink/20 bg-transparent text-center font-mono text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-brass focus:ring-inset"
        aria-label={t('product.colQty')}
      />
      <button
        onClick={() => onChange(clamp(value + 1))}
        className={stepBtn}
        aria-label={t('product.qtyIncrease')}
      >
        +
      </button>
    </div>
  )
}

function CartSkeleton() {
  return (
    <Container className="py-8 sm:py-10">
      <Skeleton className="mb-7 h-9 w-40" />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    </Container>
  )
}
