'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { trackClient } from '@/lib/telemetry/client'

const MAX_ERRORS_PER_PAGE = 5

/**
 * Mounted once in the storefront layout: a page view per route change, and
 * browser errors reported to the server log (not stored as usage events) —
 * capped per page load so one broken loop cannot flood the beacon.
 */
export function Telemetry() {
  const pathname = usePathname()

  useEffect(() => {
    if (pathname) trackClient('page_view', { path: pathname })
  }, [pathname])

  useEffect(() => {
    let sent = 0
    const report = (message: string, source?: string, line?: number) => {
      if (sent >= MAX_ERRORS_PER_PAGE || !message) return
      sent++
      trackClient('client_error', {
        message: message.slice(0, 500),
        ...(source ? { source: source.split('?', 1)[0]!.slice(0, 300) } : {}),
        ...(typeof line === 'number' ? { line } : {}),
      })
    }
    const onError = (e: ErrorEvent) => report(e.message, e.filename, e.lineno)
    const onRejection = (e: PromiseRejectionEvent) =>
      report(e.reason instanceof Error ? e.reason.message : String(e.reason))
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])

  return null
}
