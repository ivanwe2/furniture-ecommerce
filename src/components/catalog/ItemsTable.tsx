'use client'

import { Price } from '@/components/ui'
import { useCart } from '@/lib/cart/store'
import { t } from '@/lib/i18n/bg'
import clsx from 'clsx'
import React, { useState, useCallback } from 'react'

interface ItemRow {
  name: string
  sku: string
  unit?: string | null
  lengthMm?: number | null
  color?: string | null
  priceEurCents: number
  inStock?: boolean | null
}

interface ItemsTableProps {
  items: ItemRow[]
  productSlug: string
  productName: string
}

export function ItemsTable({ items, productSlug, productName }: ItemsTableProps) {
  const add = useCart((s) => s.add)
  const [addedSku, setAddedSku] = useState<string | null>(null)

  // Determine which columns to show
  const hasLength = items.some((i) => i.lengthMm != null && i.lengthMm > 0)
  const hasColor = items.some((i) => i.color != null && i.color.trim() !== '')

  const handleAdd = useCallback(
    (item: ItemRow) => {
      add({ productSlug, sku: item.sku }, 1)
      setAddedSku(item.sku)
      setTimeout(() => setAddedSku(null), 1200)
    },
    [add, productSlug],
  )

  return (
    <div className="overflow-x-auto rounded-lg border border-sand md:overflow-x-auto">
      <table className="items-table w-full text-sm">
        <thead className="sticky top-0 bg-sand">
          <tr>
            <th scope="col" className="px-4 py-3 text-left font-semibold text-ink">{t('product.colName')}</th>
            <th scope="col" className="px-4 py-3 text-left font-semibold text-ink">{t('product.colUnit')}</th>
            {hasLength && <th scope="col" className="px-4 py-3 text-left font-semibold text-ink">{t('product.colLength')}</th>}
            {hasColor && <th scope="col" className="px-4 py-3 text-left font-semibold text-ink">{t('product.colColor')}</th>}
            <th scope="col" className="px-4 py-3 text-left font-semibold text-ink">{t('product.colSku')}</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold text-ink">{t('product.colPrice')}</th>
            <th scope="col" className="px-4 py-3 text-center font-semibold text-ink">{t('product.colQty')}</th>
            <th scope="col" className="px-4 py-3 w-28 font-semibold text-ink"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const isInStock = item.inStock !== false
            const isAdded = addedSku === item.sku

            return (
              <tr
                key={item.sku}
                className={clsx(
                  'border-t border-sand transition-colors',
                  !isInStock && 'opacity-50',
                )}
              >
                <td className="px-4 py-3 text-ink" data-label={t('product.colName')}>{item.name}</td>
                <td className="px-4 py-3 text-steel" data-label={t('product.colUnit')}>{item.unit ?? 'бр.'}</td>
                {hasLength && <td className="px-4 py-3 text-steel tabular-nums" data-label={t('product.colLength')}>{item.lengthMm ?? ''}</td>}
                {hasColor && <td className="px-4 py-3 text-steel" data-label={t('product.colColor')}>{item.color ?? ''}</td>}
                <td className="px-4 py-3 font-mono text-steel" data-label={t('product.colSku')}>{item.sku}</td>
                <td className="px-4 py-3 text-right tabular-nums" data-label={t('product.colPrice')}>
                  {isInStock ? (
                    <span className="inline-flex items-center gap-1">
                      <Price eurCents={item.priceEurCents} />
                    </span>
                  ) : (
                    <span className="text-steel">{t('product.onRequest')}</span>
                  )}
                </td>
                <td className="px-4 py-3" data-label={t('product.colQty')}>
                  {isInStock ? (
                    <QtyStepper
                      sku={item.sku}
                      min={1}
                      max={999}
                    />
                  ) : (
                    <span className="text-xs text-steel">—</span>
                  )}
                </td>
                <td className="actions px-4 py-3">
                  {isInStock ? (
                    <button
                      onClick={() => handleAdd(item)}
                      disabled={isAdded}
                      className={clsx(
                        'inline-flex min-w-[7rem] items-center justify-center rounded px-3 py-1.5 text-xs font-medium transition-colors',
                        isAdded
                          ? 'bg-ok/20 text-ok'
                          : 'bg-brass text-cream hover:bg-brass/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 ring-offset-sand',
                      )}
                    >
                      {isAdded ? (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3.5 w-3.5" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>
                          <span className="ml-1">{t('product.added')}</span>
                        </>
                      ) : (
                        t('common.addToCart')
                      )}
                    </button>
                  ) : (
                    <a
                      href={`/contact?about=${item.sku}`}
                      className="text-xs text-brass hover:underline"
                    >
                      {t('product.onRequest')}
                    </a>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function QtyStepper({ sku, min = 1, max = 999 }: { sku: string; min?: number; max?: number }) {
  const setQtyAction = useCart((s) => s.setQty)
  const lines = useCart((s) => s.lines)
  const currentLine = lines.find((l) => l.sku === sku)
  const [qty, setLocalQty] = useState(currentLine?.qty ?? min)

  const clamp = (q: number) => Math.min(max, Math.max(min, Math.trunc(q) || min))

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = Number(e.target.value)
    const clamped = clamp(raw)
    setLocalQty(clamped)
    setQtyAction(sku, clamped)
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => {
          const clamped = clamp(qty - 1)
          setLocalQty(clamped)
          setQtyAction(sku, clamped)
        }}
        className="h-8 w-8 rounded bg-sand text-ink hover:bg-sand/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass flex items-center justify-center"
        aria-label="Намали количество"
      >
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        value={qty}
        onChange={handleChange}
        className="h-8 w-12 rounded bg-transparent text-center text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-brass"
        aria-label="Количество"
      />
      <button
        onClick={() => {
          const clamped = clamp(qty + 1)
          setLocalQty(clamped)
          setQtyAction(sku, clamped)
        }}
        className="h-8 w-8 rounded bg-sand text-ink hover:bg-sand/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass flex items-center justify-center"
        aria-label="Увеличи количество"
      >
        +
      </button>
    </div>
  )
}
