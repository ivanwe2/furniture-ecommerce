'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import type { CategoryNode } from '@/lib/payload/queries'
import { t } from '@/lib/i18n/bg'

interface MegaMenuProps {
  categories: CategoryNode[]
}

export function MegaMenu({ categories }: MegaMenuProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveIndex(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <ul className="flex items-center gap-6" role="menubar">
        {categories.map((cat, i) => (
          <li key={cat.id} role="none">
            <button
              role="menuitem"
              aria-haspopup="true"
              aria-expanded={activeIndex === i}
              className="font-mono text-xs uppercase tracking-[0.13em] text-ink hover:text-brass transition-colors py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
              onMouseEnter={() => setActiveIndex(i)}
              onFocus={() => setActiveIndex(i)}
              onClick={() => setActiveIndex(activeIndex === i ? null : i)}
            >
              {cat.name}
            </button>
          </li>
        ))}
      </ul>

      {activeIndex !== null && categories[activeIndex] && (
        <div
          className="absolute left-0 top-full z-50 w-screen max-w-[800px] border border-ink/12 bg-cream shadow-[0_30px_80px_rgba(34,30,25,0.14)]"
          role="menu"
          onMouseLeave={() => setActiveIndex(null)}
        >
          <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 py-6">
            {categories[activeIndex].children.length > 0 ? (
              <div className="grid grid-cols-2 gap-8">
                {categories[activeIndex].children.map((sub) => (
                  <div key={sub.id}>
                    <Link
                      href={`/category/${sub.slug}`}
                      className="text-sm font-semibold text-ink hover:text-brass"
                      role="menuitem"
                    >
                      {sub.name}
                    </Link>
                    {sub.children.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {sub.children.map((leaf) => (
                          <li key={leaf.id}>
                            <Link
                              href={`/category/${leaf.slug}`}
                              className="text-sm text-steel hover:text-brass transition-colors"
                              role="menuitem"
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
            ) : (
              <Link
                href={`/category/${categories[activeIndex].slug}`}
                className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.1em] text-brass-dark hover:text-brass"
                role="menuitem"
              >
                {t('home.viewAll')} <span aria-hidden="true">→</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
