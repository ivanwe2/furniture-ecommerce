import clsx from 'clsx'

/**
 * Настех brand lockup: a circular "Н" monogram + wordmark. Keeps the original
 * logo's circular-monogram concept but recolors it to the brand palette —
 * steel/ink mark (was grey) and a brass wordmark (was red).
 */
export function BrandLogo({ className }: { className?: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 44 44" className="h-9 w-9 shrink-0" aria-hidden="true">
        <circle cx="22" cy="22" r="19" fill="none" stroke="#6e7378" strokeWidth="2.6" />
        <path
          d="M16 13.5 V30.5 M28 13.5 V30.5 M16 22 H28"
          stroke="#23211d"
          strokeWidth="3.4"
          strokeLinecap="round"
        />
      </svg>
      <span className="text-xl font-bold tracking-[0.14em] text-brass">НАСТЕХ</span>
    </span>
  )
}
