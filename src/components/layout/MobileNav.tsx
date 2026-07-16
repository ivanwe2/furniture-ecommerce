'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import clsx from 'clsx'
import type { CategoryNode } from '@/lib/payload/queries'
import { t } from '@/lib/i18n/bg'
import { Button } from '@/components/ui'
import { SearchField } from './SearchField'

interface MobileNavProps {
  categories: CategoryNode[]
}

/** Indented subtree shown when a top-level category is expanded. */
function renderSubtree(nodes: CategoryNode[], depth: number, onNavigate: () => void) {
  return nodes.map((node) => (
    <li key={node.id}>
      <Link
        href={`/category/${node.slug}`}
        onClick={onNavigate}
        className="block py-2 text-sm text-steel hover:text-brass transition-colors"
        style={{ paddingLeft: `${depth}rem` }}
      >
        {node.name}
      </Link>
      {node.children.length > 0 && (
        <ul>{renderSubtree(node.children, depth + 1, onNavigate)}</ul>
      )}
    </li>
  ))
}

/** Top-level category row: name links to the category, chevron toggles children. */
function CategoryItem({ node, onNavigate }: { node: CategoryNode; onNavigate: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const hasChildren = node.children.length > 0

  return (
    <li className="border-b border-ink/10 last:border-b-0">
      <div className="flex items-center justify-between">
        <Link
          href={`/category/${node.slug}`}
          onClick={onNavigate}
          className="block flex-1 py-3 text-sm font-medium text-ink hover:text-brass transition-colors"
        >
          {node.name}
        </Link>
        {hasChildren && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-label={t('nav.subcategories')}
            className="p-2 text-steel hover:text-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass rounded"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={clsx('h-4 w-4 transition-transform', expanded && 'rotate-180')}
              aria-hidden="true"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        )}
      </div>
      {hasChildren && expanded && (
        <ul className="pb-2">{renderSubtree(node.children, 1, onNavigate)}</ul>
      )}
    </li>
  )
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
            <div className="flex items-center justify-between p-4 border-b border-ink/10">
              <span className="font-mono text-xs uppercase tracking-[0.16em] text-ink">
                {t('nav.categories')}
              </span>
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

            <div className="p-4 pb-0">
              <SearchField onSubmit={() => setOpen(false)} />
            </div>

            <nav className="p-4">
              <ul>
                {categories.map((node) => (
                  <CategoryItem key={node.id} node={node} onNavigate={() => setOpen(false)} />
                ))}
              </ul>
            </nav>

            <div className="p-4 border-t border-ink/10 space-y-3">
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
