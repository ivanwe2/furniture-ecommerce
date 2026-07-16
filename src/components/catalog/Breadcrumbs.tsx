import Link from 'next/link'

export interface Crumb {
  name: string
  href?: string
}

/**
 * Editorial breadcrumb trail (redesign R4) — mono/uppercase in the technical
 * label treatment, brass on hover, the current (last) crumb in ink. The final
 * item is the current page and is passed without an `href`.
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-7">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] uppercase tracking-[0.1em] text-steel">
        {items.map((item, i) => (
          <li key={`${item.name}-${i}`} className="flex items-center gap-2">
            {i > 0 && (
              <span aria-hidden="true" className="text-ink/30">
                /
              </span>
            )}
            {item.href ? (
              <Link href={item.href} className="transition-colors hover:text-brass">
                {item.name}
              </Link>
            ) : (
              <span className="text-ink">{item.name}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
