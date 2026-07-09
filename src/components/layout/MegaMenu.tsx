'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import clsx from 'clsx'
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
              className="text-sm font-medium text-ink hover:text-brass transition-colors py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass rounded"
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
          className="absolute left-0 top-full z-50 w-screen max-w-[800px] bg-cream border-t border-sand shadow-lg"
          role="menu"
          onMouseLeave={() => setActiveIndex(null)}
        >
          <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 py-6">
            {categories[activeIndex].children.length > 0 ? (
              <div className="grid grid-cols-2 gap-8">
                {categories[activeIndex].children.map((sub) => (
                  <div key={sub.id}>
                    <Link
                      href={`/kategoria/${sub.slug}`}
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
                              href={`/kategoria/${leaf.slug}`}
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
                href={`/kategoria/${categories[activeIndex].slug}`}
                className="text-sm text-ink hover:text-brass"
                role="menuitem"
              >
                {t('nav.categories')}
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
