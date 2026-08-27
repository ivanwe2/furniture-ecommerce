'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import type { CategoryNode } from '@/lib/payload/queries'
import { t } from '@/lib/i18n/bg'

interface MegaMenuProps {
  categories: CategoryNode[]
}

const PANEL_ID = 'megamenu-panel'

/**
 * Top-level category nav with a hover/focus panel of subcategories.
 *
 * The top-level item is a LINK, not a button. It used to be a button that only
 * toggled the panel, so clicking a category never went anywhere — which reads
 * as a broken control — and, because the panel lists only the children, the
 * parent category page had no route into it from the header at all. That page
 * is the useful destination: it shows the subcategory grid AND every product
 * beneath the category, with sorting and brand filters.
 *
 * The mobile drawer already worked this way (name links, chevron expands), so
 * this also makes the two navs behave alike.
 *
 * No `menubar`/`menuitem` roles: that pattern is for application menus and it
 * takes over the arrow keys. This is site navigation — a list of links with a
 * disclosure is both simpler and better behaved for screen readers.
 */
export function MegaMenu({ categories }: MegaMenuProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveIndex(null)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setActiveIndex(null)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const active = activeIndex === null ? null : (categories[activeIndex] ?? null)

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseLeave={() => setActiveIndex(null)}
    >
      <ul className="flex items-center gap-6">
        {categories.map((cat, i) => (
          <li key={cat.id}>
            <Link
              href={`/category/${cat.slug}`}
              // Only categories with children have anything to show.
              onMouseEnter={() => setActiveIndex(cat.children.length > 0 ? i : null)}
              onFocus={() => setActiveIndex(cat.children.length > 0 ? i : null)}
              // Close on navigation rather than in an effect keyed on the path:
              // setting state straight from an effect body cascades renders.
              onClick={() => setActiveIndex(null)}
              aria-expanded={cat.children.length > 0 ? activeIndex === i : undefined}
              aria-controls={cat.children.length > 0 ? PANEL_ID : undefined}
              className="block font-mono text-xs uppercase tracking-[0.13em] text-ink hover:text-brass transition-colors py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
            >
              {cat.name}
            </Link>
          </li>
        ))}
      </ul>

      {active && (
        <div
          id={PANEL_ID}
          className="absolute left-0 top-full z-50 w-screen max-w-[800px] border border-ink/12 bg-cream shadow-[0_30px_80px_rgba(34,30,25,0.14)]"
        >
          <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 py-6">
            {/* The way back to the parent page for anyone who opened the panel
                instead of clicking straight through. */}
            <Link
              href={`/category/${active.slug}`}
              onClick={() => setActiveIndex(null)}
              className="mb-5 inline-flex items-center gap-1.5 border-b border-ink/12 pb-3 font-mono text-xs uppercase tracking-[0.1em] text-brass-dark hover:text-brass"
            >
              {t('home.viewAll')} · {active.name} <span aria-hidden="true">→</span>
            </Link>

            <div className="grid grid-cols-2 gap-8">
              {active.children.map((sub) => (
                <div key={sub.id}>
                  <Link
                    href={`/category/${sub.slug}`}
                    onClick={() => setActiveIndex(null)}
                    className="text-sm font-semibold text-ink hover:text-brass"
                  >
                    {sub.name}
                  </Link>
                  {sub.children.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {sub.children.map((leaf) => (
                        <li key={leaf.id}>
                          <Link
                            href={`/category/${leaf.slug}`}
                            onClick={() => setActiveIndex(null)}
                            className="text-sm text-steel hover:text-brass transition-colors"
                          >
                            {leaf.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
