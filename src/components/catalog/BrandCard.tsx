import Link from 'next/link'
import { imageUrl, imageSrcSet } from '@/lib/images'
import { productCount } from '@/lib/i18n/plural'
import type { Media } from '@/payload-types'
import type { BrandWithCount } from '@/lib/payload/queries'

/**
 * Brand tile — logo above the name, product count in brackets underneath,
 * exactly as the client described it. Used by the `/brands` index and the
 * homepage strip.
 *
 * Logos are supplier artwork of wildly different proportions, so the image sits
 * in a fixed-height box with `object-contain` — never cropped or stretched.
 * A brand with no logo yet falls back to its name set in the display face, so
 * the grid stays even rather than showing a hole.
 */
export function BrandCard({ brand }: { brand: BrandWithCount }) {
  const logo = brand.logo
  const hasLogo = logo && typeof logo === 'object' && 'filename' in logo && logo.filename

  return (
    <Link
      href={`/brand/${brand.slug}`}
      className="group flex flex-col items-center gap-3 border border-ink/14 bg-raised px-4 py-6 text-center transition-colors hover:border-brass"
    >
      <div className="flex h-14 w-full items-center justify-center">
        {hasLogo ? (
          <img
            src={imageUrl(logo, 'card')}
            srcSet={imageSrcSet(logo, ['thumb', 'card'])}
            alt={(logo as Media).alt ?? brand.name}
            className="max-h-14 w-auto max-w-full object-contain"
          />
        ) : (
          <span className="font-display text-xl font-semibold tracking-[-0.01em] text-ink transition-colors group-hover:text-brass">
            {brand.name}
          </span>
        )}
      </div>

      <div>
        {hasLogo && (
          <div className="text-sm font-medium text-ink transition-colors group-hover:text-brass">
            {brand.name}
          </div>
        )}
        <div className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.1em] text-steel">
          ({productCount(brand.productCount)})
        </div>
      </div>
    </Link>
  )
}
