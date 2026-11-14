'use client'

import clsx from 'clsx'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Gallery, type GalleryImage } from '@/components/catalog/Gallery'
import { Price } from '@/components/ui'
import { availabilityOf } from '@/lib/availability'
import { useCart } from '@/lib/cart/store'
import { mergeSpecLayers, type SpecLine } from '@/lib/catalog/specs'
import { t } from '@/lib/i18n/bg'
import { formatEur, netEurCents } from '@/lib/money'

export type ViewItem = {
  sku: string
  name: string
  unit: string | null
  lengthMm: number | null
  color: string | null
  priceEurCents: number | null
  stockQty: number
  image: GalleryImage | null
  specs: SpecLine[]
}

export interface ProductViewProps {
  productSlug: string
  productName: string
  brand: { name: string; slug: string | null } | null
  gallery: GalleryImage[]
  items: ViewItem[]
  specs: SpecLine[]
  phone: { display: string; href: string }
  /** SiteSettings.restockLeadTime — shown next to „Изчерпан"; null = hidden. */
  leadTime: string | null
  /** Validated against `items` by the page (`?sku=`, else first orderable). */
  initialSku: string
  /** The product description, rendered on the server. */
  description: ReactNode
}

/**
 * The interactive part of the product page (UI-SPEC §4): it owns the selected
 * variant (SKU). Changing it swaps the main picture, catalogue number, price,
 * stock and actions, and the characteristics — and writes `?sku=` into the URL
 * with replaceState (no navigation), so the link can be shared and the cart can
 * link back to the exact variant.
 */
export function ProductView(props: ProductViewProps) {
  const { items, productName } = props
  const [sku, setSku] = useState(props.initialSku)
  const selected = items.find((i) => i.sku === sku) ?? items[0]!

  const select = useCallback((next: string) => {
    setSku(next)
    const url = new URL(window.location.href)
    url.searchParams.set('sku', next)
    window.history.replaceState(window.history.state, '', url)
  }, [])

  // The selected variant's own picture leads; the product gallery follows.
  const images = useMemo(() => {
    const own = selected.image
    if (!own) return props.gallery
    return [own, ...props.gallery.filter((img) => img.key !== own.key)]
  }, [selected.image, props.gallery])

  const specs = useMemo(() => {
    const auto: SpecLine[] = [
      { label: t('product.specColor'), value: selected.color ?? '' },
      {
        label: t('product.specLength'),
        value: selected.lengthMm ? t('product.lengthValue').replace('{n}', String(selected.lengthMm)) : '',
      },
      { label: t('product.specUnit'), value: selected.unit && selected.unit !== 'бр.' ? selected.unit : '' },
    ]
    return mergeSpecLayers(
      [props.brand ? { label: t('product.specBrand'), value: props.brand.name } : null],
      props.specs,
      selected.specs,
      auto,
      [{ label: t('product.catalogNo'), value: selected.sku }],
    )
  }, [selected, props.brand, props.specs])

  return (
    <>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-14">
        {/* Remount per variant: the view restarts at the variant's picture. */}
        <Gallery key={selected.sku} images={images} productName={productName} />

        <div className="min-w-0">
          {props.brand ? (
            props.brand.slug ? (
              <Link
                href={`/brand/${props.brand.slug}`}
                className="inline-flex items-center border border-ink/18 px-3 py-1 font-mono text-xs uppercase tracking-[0.12em] text-steel transition-colors hover:border-brass hover:text-brass"
              >
                {props.brand.name}
              </Link>
            ) : (
              <span className="inline-flex items-center border border-ink/18 px-3 py-1 font-mono text-xs uppercase tracking-[0.12em] text-steel">
                {props.brand.name}
              </span>
            )
          ) : null}

          <h1 className="mt-4 font-display text-3xl font-semibold leading-tight tracking-[-0.02em] text-ink sm:text-[2.5rem]">
            {productName}
          </h1>
          <p className="mt-3 font-mono text-sm uppercase tracking-[0.1em] text-steel">
            {t('product.catalogNo')} <span className="text-ink2">{selected.sku}</span>
          </p>

          <PriceBlock item={selected} />
          <StockLine item={selected} leadTime={props.leadTime} />
          <Actions
            key={selected.sku}
            item={selected}
            productSlug={props.productSlug}
            phone={props.phone}
          />

          {props.description ? <div className="mt-8 text-[15px] leading-relaxed text-ink2">{props.description}</div> : null}
        </div>
      </div>

      {items.length > 1 && <VariantTable items={items} selectedSku={selected.sku} onSelect={select} />}

      {specs.length > 0 && (
        <section aria-labelledby="specs-title" className="mt-14 lg:max-w-[calc(50%-1.75rem)]">
          <h2 id="specs-title" className="mb-4 font-mono text-sm uppercase tracking-[0.16em] text-ink2">
            {t('product.specsTitle')}
          </h2>
          <dl className="border-t border-ink/14">
            {specs.map((line) => (
              <div key={line.label} className="flex items-baseline justify-between gap-6 border-b border-ink/14 py-3 text-[15px]">
                <dt className="text-ink2">{line.label}</dt>
                <dd className="text-right text-ink">{line.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </>
  )
}

function PriceBlock({ item }: { item: ViewItem }) {
  if (item.priceEurCents === null) {
    return (
      <p className="mt-6 font-display text-3xl font-semibold tracking-[-0.01em] text-ink">{t('product.onRequest')}</p>
    )
  }
  return (
    <div className="mt-6">
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <Price eurCents={item.priceEurCents} className="font-display text-3xl font-semibold tracking-[-0.01em] text-ink" />
        <span className="text-sm text-steel">{t('product.vatIncluded')}</span>
      </p>
      <p className="mt-1 text-sm tabular-nums text-steel">
        {formatEur(netEurCents(item.priceEurCents))} {t('product.vatExcluded')}
      </p>
    </div>
  )
}

/** Physical stock, independent of price: a price-on-request item can be in stock. */
function StockLine({ item, leadTime }: { item: ViewItem; leadTime: string | null }) {
  const inStock = item.stockQty > 0
  return (
    <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
      <span
        className={clsx(
          'inline-flex items-center border px-3 py-1 text-sm',
          inStock ? 'border-ok/50 text-ok' : 'border-danger/50 text-danger',
        )}
      >
        {inStock ? t('product.inStock') : t('product.soldOut')}
      </span>
      {!inStock && leadTime ? (
        <span className="text-sm text-ink2">{t('product.leadTime').replace('{time}', leadTime)}</span>
      ) : null}
    </div>
  )
}

const primaryBtn =
  'inline-flex min-h-12 items-center justify-center gap-2 bg-ink px-6 py-3 text-sm font-semibold text-cream transition hover:bg-ink/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 ring-offset-cream'
const secondaryBtn =
  'inline-flex min-h-12 items-center justify-center border border-ink px-6 py-3 text-sm font-medium text-ink transition hover:bg-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 ring-offset-cream'

/** Re-mounted per variant (React `key`), so the quantity resets to 1. */
function Actions({
  item,
  productSlug,
  phone,
}: {
  item: ViewItem
  productSlug: string
  phone: { display: string; href: string }
}) {
  const availability = availabilityOf(item)
  const callUs = (
    <a href={phone.href} className={secondaryBtn}>
      {t('product.callUs').replace('{phone}', phone.display)}
    </a>
  )

  if (availability !== 'inStock') {
    const label = availability === 'onRequest' ? t('product.requestPrice') : t('product.requestAvailability')
    return (
      <div className="mt-7 flex flex-wrap gap-3">
        <Link href={`/contact?about=${encodeURIComponent(item.sku)}`} className={primaryBtn}>
          {label}
        </Link>
        {callUs}
      </div>
    )
  }

  return (
    <div className="mt-7 flex flex-wrap items-center gap-3">
      <AddToCart sku={item.sku} productSlug={productSlug} />
      {callUs}
    </div>
  )
}

function AddToCart({ sku, productSlug }: { sku: string; productSlug: string }) {
  const add = useCart((s) => s.add)
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const clamp = (n: number) => Math.min(999, Math.max(1, Math.trunc(n) || 1))
  const step =
    'flex h-12 w-11 items-center justify-center border border-ink/25 text-lg text-ink transition-colors hover:border-brass hover:text-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass'

  return (
    <>
      <div className="flex items-center" role="group" aria-label={t('product.colQty')}>
        <button type="button" className={step} onClick={() => setQty((q) => clamp(q - 1))} aria-label={t('product.qtyDecrease')}>
          −
        </button>
        <input
          type="text"
          inputMode="numeric"
          value={qty}
          onChange={(e) => setQty(clamp(Number(e.target.value)))}
          className="h-12 w-14 border-y border-ink/25 bg-transparent text-center font-mono text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brass"
          aria-label={t('product.colQty')}
        />
        <button type="button" className={step} onClick={() => setQty((q) => clamp(q + 1))} aria-label={t('product.qtyIncrease')}>
          +
        </button>
      </div>
      <button
        type="button"
        className={clsx(primaryBtn, added && 'bg-ok hover:bg-ok')}
        onClick={() => {
          add({ productSlug, sku }, qty)
          setAdded(true)
          if (timer.current) clearTimeout(timer.current)
          timer.current = setTimeout(() => setAdded(false), 1200)
        }}
        aria-live="polite"
      >
        {added ? (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4" aria-hidden="true">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            {t('product.added')}
          </>
        ) : (
          t('product.addToCart')
        )}
      </button>
    </>
  )
}

/**
 * „Изберете вариант": a native radio group laid out as a table — arrow keys
 * move the selection, the whole row is clickable, and on phones the rows
 * collapse to cards (.variant-table in globals.css).
 */
function VariantTable({
  items,
  selectedSku,
  onSelect,
}: {
  items: ViewItem[]
  selectedSku: string
  onSelect: (sku: string) => void
}) {
  const th = 'px-4 py-3.5 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-steel'
  return (
    <section aria-labelledby="variants-title" className="mt-14">
      <h2 id="variants-title" className="mb-4 font-mono text-sm uppercase tracking-[0.16em] text-ink2">
        {t('product.chooseVariant')}
      </h2>
      <div className="border border-ink/14">
        <table className="variant-table w-full text-sm">
          <thead className="border-b border-ink/14 bg-sand">
            <tr>
              <th scope="col" className={`${th} text-left`}>{t('product.colVariant')}</th>
              <th scope="col" className={`${th} text-left`}>{t('product.catalogNo')}</th>
              <th scope="col" className={`${th} text-right`}>{t('product.colPrice')}</th>
              <th scope="col" className={`${th} text-right`}>{t('product.colAvailability')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const isSelected = item.sku === selectedSku
              const inStock = item.stockQty > 0
              const id = `variant-${item.sku}`
              return (
                <tr
                  key={item.sku}
                  onClick={() => onSelect(item.sku)}
                  className={clsx(
                    'cursor-pointer border-t border-ink/10 transition-colors first:border-t-0',
                    isSelected ? 'bg-sand' : 'bg-raised hover:bg-sand/40',
                  )}
                >
                  <td className="variant-name px-4 py-4">
                    <label htmlFor={id} className="flex cursor-pointer items-center gap-3 text-[15px] text-ink">
                      <input
                        id={id}
                        type="radio"
                        name="variant"
                        value={item.sku}
                        checked={isSelected}
                        onChange={() => onSelect(item.sku)}
                        className="h-5 w-5 shrink-0 cursor-pointer accent-ink"
                      />
                      <span>{item.name}</span>
                    </label>
                  </td>
                  <td className="px-4 py-4 font-mono text-[13px] text-steel" data-label={t('product.catalogNo')}>
                    {item.sku}
                  </td>
                  <td className="px-4 py-4 text-right font-semibold text-ink" data-label={t('product.colPrice')}>
                    {item.priceEurCents === null ? (
                      t('product.onRequest')
                    ) : (
                      <Price eurCents={item.priceEurCents} className="font-semibold" />
                    )}
                  </td>
                  <td
                    className={clsx('px-4 py-4 text-right', inStock ? 'text-ok' : 'text-danger')}
                    data-label={t('product.colAvailability')}
                  >
                    {inStock ? t('product.inStock') : t('product.soldOut')}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
