'use client'

import { useState } from 'react'
import { imageUrl } from '@/lib/images'
import { t } from '@/lib/i18n/bg'
import type { Media } from '@/payload-types'

interface GalleryProps {
  images: (Media | null)[]
  productName: string
}

export function Gallery({ images, productName }: GalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const validImages = images.filter((img): img is Media => img !== null && typeof img === 'object' && 'filename' in img)

  if (validImages.length === 0) {
    return (
      <div className="aspect-[4/3] w-full rounded-lg bg-sand flex items-center justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="h-16 w-16 text-steel/60"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
      </div>
    )
  }

  const mainImage = validImages[currentIndex]

  return (
    <div className="space-y-3">
      {/* Main image */}
      {mainImage && (
        <button
          onClick={() => setLightboxOpen(true)}
          className="aspect-[4/3] w-full overflow-hidden rounded-lg bg-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
          aria-label={t('product.galleryOpen').replace('{name}', productName).replace('{n}', String(currentIndex + 1))}
        >
          <img
            src={imageUrl(mainImage, 'detail')}
            alt={mainImage.alt ?? productName}
            className="h-full w-full object-contain"
          />
        </button>
      )}

      {/* Thumbnails */}
      {validImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {validImages.map((img, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={clsx(
                'h-16 w-16 shrink-0 rounded border-2 overflow-hidden focus-visible:outline-none',
                i === currentIndex ? 'border-brass' : 'border-transparent hover:border-sand',
              )}
            >
              <img
                src={imageUrl(img, 'thumb')}
                alt={img.alt ?? t('product.photoAlt').replace('{n}', String(i + 1))}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={t('product.galleryZoom').replace('{name}', productName)}
        >
          <button
            className="absolute right-4 top-4 text-white hover:text-brass transition-colors"
            onClick={() => setLightboxOpen(false)}
            aria-label={t('common.close')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-8 w-8"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>

          {/* Previous */}
          {validImages.length > 1 && (
            <button
              className="absolute left-4 text-white hover:text-brass transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                setCurrentIndex((prev) => (prev - 1 + validImages.length) % validImages.length)
              }}
              aria-label={t('product.prevPhoto')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-8 w-8"><path d="M15 19l-7-7 7-7" /></svg>
            </button>
          )}

          {/* Image */}
          {validImages[currentIndex] && (
            <img
              src={imageUrl(validImages[currentIndex], 'zoom')}
              alt={validImages[currentIndex].alt ?? productName}
              className="max-h-[90vh] max-w-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          )}

          {/* Next */}
          {validImages.length > 1 && (
            <button
              className="absolute right-4 text-white hover:text-brass transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                setCurrentIndex((prev) => (prev + 1) % validImages.length)
              }}
              aria-label={t('product.nextPhoto')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-8 w-8"><path d="M9 5l7 7-7 7" /></svg>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function clsx(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
