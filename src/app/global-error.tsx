'use client'

import { useEffect } from 'react'
import { t } from '@/lib/i18n/bg'
import { trackClient } from '@/lib/telemetry/client'

/**
 * Last-resort error page: replaces a root layout that itself crashed, so it
 * brings its own <html>/<body> and no site chrome. Reports the error like
 * (site)/error.tsx does.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    trackClient('client_error', {
      message: error.message.slice(0, 500) || 'root layout error',
      ...(error.digest ? { digest: error.digest.slice(0, 100) } : {}),
    })
  }, [error])

  return (
    <html lang="bg">
      <body style={{ fontFamily: 'system-ui, sans-serif', display: 'grid', placeItems: 'center', minHeight: '100vh', margin: 0 }}>
        <div style={{ textAlign: 'center', padding: 16 }}>
          <h1 style={{ fontSize: 24 }}>{t('errors.pageTitle')}</h1>
          <p>{t('errors.generic')}</p>
          <button type="button" onClick={reset} style={{ marginTop: 12, padding: '10px 20px', cursor: 'pointer' }}>
            {t('common.retry')}
          </button>
        </div>
      </body>
    </html>
  )
}
