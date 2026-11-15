'use client'

import clsx from 'clsx'
import { useEffect, useRef, useState } from 'react'
import { t } from '@/lib/i18n/bg'

/** One picture, already resolved to URLs on the server (lib/images.ts). */
export type GalleryImage = {
  /** Stable identity (the media id) — used to de-duplicate. */
  key: string
  detail: string
  thumb: string
  zoom: string
  alt: string
}

interface GalleryProps {
  images: GalleryImage[]
  productName: string
  /** Called when the lightbox opens (telemetry). */
  onZoom?: () => void
}

/**
 * Product pictures: main image, thumbnails, and a lightbox (Esc closes, ←/→
 * page, body scroll locked while open). The product page re-mounts it (React
 * `key`) whenever the selected variant changes, so the view starts again at
 * the first picture — that variant's own picture when it has one.
 */
export function Gallery({ images, productName, onZoom }: GalleryProps) {
  const [current, setCurrent] = useState(0)
  const [open, setOpen] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  const count = images.length

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
      else if (e.key === 'ArrowLeft') setCurrent((i) => (i - 1 + count) % count)
      else if (e.key === 'ArrowRight') setCurrent((i) => (i + 1) % count)
    }
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    closeRef.current?.focus()
    return () => {
      document.body.style.overflow = overflow
      document.removeEventListener('keydown', onKey)
    }
  }, [open, count])

  if (count === 0) {
    return (
      <div className="hatch relative aspect-[5/4] w-full border border-ink/12">
        <span className="absolute bottom-4 left-5 font-mono text-[11px] uppercase tracking-[0.12em] text-steel">
          {t('home.productShot')}
        </span>
      </div>
    )
  }

  const main = images[Math.min(current, count - 1)]!

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => {
          setOpen(true)
          onZoom?.()
        }}
        className="block aspect-[5/4] w-full overflow-hidden border border-ink/12 bg-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
        aria-label={t('product.galleryOpen').replace('{name}', productName).replace('{n}', String(current + 1))}
      >
        <img src={main.detail} alt={main.alt} className="h-full w-full object-contain" />
      </button>

      {count > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={img.key}
              type="button"
              onClick={() => setCurrent(i)}
              aria-current={i === current ? 'true' : undefined}
              className={clsx(
                'h-16 w-16 shrink-0 overflow-hidden border bg-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass',
                i === current ? 'border-brass' : 'border-ink/15 hover:border-ink/40',
              )}
            >
              <img
                src={img.thumb}
                alt={t('product.photoAlt').replace('{n}', String(i + 1))}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={t('product.galleryZoom').replace('{name}', productName)}
        >
          <button
            ref={closeRef}
            type="button"
            className="absolute right-4 top-4 text-white transition-colors hover:text-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
            onClick={() => setOpen(false)}
            aria-label={t('common.close')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-8 w-8" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          {count > 1 && (
            <button
              type="button"
              className="absolute left-4 text-white transition-colors hover:text-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
              onClick={(e) => {
                e.stopPropagation()
                setCurrent((i) => (i - 1 + count) % count)
              }}
              aria-label={t('product.prevPhoto')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-8 w-8" aria-hidden="true">
                <path d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          <img
            src={main.zoom}
            alt={main.alt}
            className="max-h-[90vh] max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {count > 1 && (
            <button
              type="button"
              className="absolute right-4 text-white transition-colors hover:text-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
              onClick={(e) => {
                e.stopPropagation()
                setCurrent((i) => (i + 1) % count)
              }}
              aria-label={t('product.nextPhoto')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-8 w-8" aria-hidden="true">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
