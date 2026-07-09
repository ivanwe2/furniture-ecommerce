'use client'

import * as React from 'react'
import Link from 'next/link'
import { t } from '@/lib/i18n/bg'

const STORAGE_KEY = 'nasteh-cookie-notice'

export default function CookieNotice() {
  const [visible, setVisible] = React.useState(() => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY) === null
    }
    return true
  })

  if (!visible) return null

  const handleDismiss = () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, '1')
    }
    setVisible(false)
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 bg-sand border-t border-steel/20">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 text-sm">
        <p className="text-ink">
          {t('cookie.notice')}
          {' '}
          <Link href="/cookies" className="text-brass underline hover:opacity-80">
            {t('cookie.learnMore')}
          </Link>
        </p>
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 rounded bg-brass px-4 py-1.5 text-sm font-medium text-cream hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
        >
          {t('cookie.dismiss')}
        </button>
      </div>
    </div>
  )
}
