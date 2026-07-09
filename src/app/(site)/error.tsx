'use client'

import { t } from '@/lib/i18n/bg'
import { Button } from '@/components/ui'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-ink">{t('errors.pageTitle')}</h1>
        <p className="mt-2 text-sm text-steel">{t('errors.generic')}</p>
        <Button onClick={reset} variant="brass" size="md" className="mt-4">
          {t('common.retry')}
        </Button>
      </div>
    </div>
  )
}
