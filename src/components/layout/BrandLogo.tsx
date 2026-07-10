import clsx from 'clsx'

/**
 * Настех brand lockup: the circular badge (graphite disc, bold "Н", brass
 * diagonal swoosh, steel rim highlight) + wordmark. A faithful modernization
 * of the original emblem — grey → graphite/steel, red → brass.
 */
export function BrandLogo({ className }: { className?: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 64 64" className="h-9 w-9 shrink-0" aria-hidden="true">
        <defs>
          <clipPath id="nasteh-badge-clip">
            <circle cx="32" cy="32" r="28" />
          </clipPath>
        </defs>
        <circle cx="32" cy="32" r="28" className="fill-graphite" />
        <g clipPath="url(#nasteh-badge-clip)">
          <rect x="-8" y="35" width="80" height="13" rx="6.5" className="fill-brass" transform="rotate(-38 32 32)" />
        </g>
        <path d="M13 21 A28 28 0 0 1 43 10.5" fill="none" className="stroke-steel" strokeWidth="3.4" strokeLinecap="round" />
        <g className="stroke-cream" strokeWidth="6.2" strokeLinecap="round">
          <line x1="22" y1="20" x2="22" y2="44" />
          <line x1="42" y1="20" x2="42" y2="44" />
          <line x1="22" y1="32" x2="42" y2="32" />
        </g>
      </svg>
      <span className="text-xl font-bold tracking-[0.14em] text-brass">НАСТЕХ</span>
    </span>
  )
}
