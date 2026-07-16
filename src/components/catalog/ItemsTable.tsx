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
}

export function ItemsTable({ items, productSlug }: ItemsTableProps) {
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

  const th = 'px-4 py-3 font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-steel'

  return (
    <div className="overflow-x-auto border border-ink/14">
      <table className="items-table w-full text-sm">
        <thead className="border-b border-ink/14 bg-sand">
          <tr>
            <th scope="col" className={`${th} text-left`}>{t('product.colName')}</th>
            <th scope="col" className={`${th} text-left`}>{t('product.colUnit')}</th>
            {hasLength && <th scope="col" className={`${th} text-left`}>{t('product.colLength')}</th>}
            {hasColor && <th scope="col" className={`${th} text-left`}>{t('product.colColor')}</th>}
            <th scope="col" className={`${th} text-left`}>{t('product.colSku')}</th>
            <th scope="col" className={`${th} text-right`}>{t('product.colPrice')}</th>
            <th scope="col" className={`${th} text-center`}>{t('product.colQty')}</th>
            <th scope="col" className={`${th} w-28`}></th>
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
                  'border-t border-ink/10 transition-colors hover:bg-sand/40',
                  !isInStock && 'opacity-55',
                )}
              >
                <td className="px-4 py-3 font-medium text-ink" data-label={t('product.colName')}>{item.name}</td>
                <td className="px-4 py-3 text-steel" data-label={t('product.colUnit')}>{item.unit ?? t('common.unitDefault')}</td>
                {hasLength && <td className="px-4 py-3 font-mono tabular-nums text-steel" data-label={t('product.colLength')}>{item.lengthMm ?? ''}</td>}
                {hasColor && <td className="px-4 py-3 text-steel" data-label={t('product.colColor')}>{item.color ?? ''}</td>}
                <td className="px-4 py-3 font-mono text-steel" data-label={t('product.colSku')}>{item.sku}</td>
                <td className="px-4 py-3 text-right font-mono tabular-nums" data-label={t('product.colPrice')}>
                  {isInStock ? (
                    <Price eurCents={item.priceEurCents} className="text-ink" />
                  ) : (
                    <span className="font-sans text-steel">{t('product.onRequest')}</span>
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
                    <span className="text-xs text-steel">-</span>
                  )}
                </td>
                <td className="actions px-4 py-3">
                  {isInStock ? (
                    <button
                      onClick={() => handleAdd(item)}
                      disabled={isAdded}
                      className={clsx(
                        'inline-flex min-w-[7rem] items-center justify-center px-3 py-2 font-mono text-[11px] uppercase tracking-[0.08em] transition',
                        isAdded
                          ? 'bg-ok/15 text-ok'
                          : 'bg-brass text-raised hover:brightness-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 ring-offset-raised',
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
                      className="font-mono text-[11px] uppercase tracking-[0.08em] text-brass-dark hover:text-brass"
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

  const stepBtn =
    'flex h-8 w-8 items-center justify-center border border-ink/20 text-ink transition-colors hover:border-brass hover:text-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass'

  return (
    <div className="flex items-center">
      <button
        onClick={() => {
          const clamped = clamp(qty - 1)
          setLocalQty(clamped)
          setQtyAction(sku, clamped)
        }}
        className={stepBtn}
        aria-label={t('product.qtyDecrease')}
      >
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        value={qty}
        onChange={handleChange}
        className="h-8 w-11 border-y border-ink/20 bg-transparent text-center font-mono text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-brass focus:ring-inset"
        aria-label={t('product.colQty')}
      />
      <button
        onClick={() => {
          const clamped = clamp(qty + 1)
          setLocalQty(clamped)
          setQtyAction(sku, clamped)
        }}
        className={stepBtn}
        aria-label={t('product.qtyIncrease')}
      >
        +
      </button>
    </div>
  )
}
