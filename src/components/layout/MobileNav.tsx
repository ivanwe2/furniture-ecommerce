'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import clsx from 'clsx'
import type { CategoryNode } from '@/lib/payload/queries'
import { t } from '@/lib/i18n/bg'
import { Button } from '@/components/ui'

interface MobileNavProps {
  categories: CategoryNode[]
}

function renderCategoryTree(nodes: CategoryNode[], depth: number = 0) {
  return nodes.map((node) => (
    <li key={node.id} className="border-b border-sand last:border-b-0">
      <Link
        href={`/category/${node.slug}`}
        className={clsx(
          'block py-3 text-sm hover:text-brass transition-colors',
          depth === 0 && 'font-medium text-ink',
          depth > 0 && `pl-${depth * 4}`, // dynamic indent per level
          depth > 0 && 'text-steel',
        )}
      >
        {node.name}
      </Link>
      {node.children.length > 0 && (
        <ul>{renderCategoryTree(node.children, depth + 1)}</ul>
      )}
    </li>
  ))
}

export function MobileNav({ categories }: MobileNavProps) {
  const [open, setOpen] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  useEffect(() => {
    if (!open) return
    const firstFocusable = drawerRef.current?.querySelector<HTMLElement>(
      'a, button, [tabindex]:not([tabindex="-1"])'
    )
    firstFocusable?.focus()
  }, [open])

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label={t('nav.menu')}
        className="p-2"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-ink/30"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={drawerRef}
            className="relative w-full max-w-sm bg-cream h-full overflow-y-auto shadow-xl focus:outline-none"
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={t('nav.menu')}
          >
            <div className="flex items-center justify-between p-4 border-b border-sand">
              <span className="text-lg font-medium text-ink">{t('nav.categories')}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                aria-label={t('common.close')}
                className="p-1"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </Button>
            </div>

            <nav className="p-4">
              <ul>{renderCategoryTree(categories)}</ul>
            </nav>

            <div className="p-4 border-t border-sand space-y-3">
              <Link
                href="/contact"
                className="block text-sm font-medium text-ink hover:text-brass py-2"
                onClick={() => setOpen(false)}
              >
                {t('nav.contact')}
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
