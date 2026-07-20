import clsx from 'clsx'

/**
 * Настех brand wordmark — the stylized "HACTEX" bracket-frame lockup (the
 * Cyrillic НАСТЕХ rendered in Latin-lookalike letterforms). `dark` for light
 * backgrounds, `cream` for dark ones. Vector (SVG) so it stays crisp at any
 * size. Set the display height via `className` (e.g. `h-10`); width follows the
 * intrinsic ratio.
 */
export function BrandLogo({
  variant = 'dark',
  className,
}: {
  variant?: 'dark' | 'cream'
  className?: string
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static brand asset; next/image is avoided project-wide (ARCHITECTURE §5)
    <img
      src={`/logos/nasteh-${variant}.svg`}
      alt="Настех"
      width={96}
      height={64}
      className={clsx('block w-auto', className)}
    />
  )
}
