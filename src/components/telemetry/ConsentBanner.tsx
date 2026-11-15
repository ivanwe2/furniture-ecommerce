'use client'

import Link from 'next/link'
import * as React from 'react'
import { t } from '@/lib/i18n/bg'
import { CONSENT_OPEN_EVENT, getConsent, setConsent, type ConsentChoice } from '@/lib/telemetry/client'

/**
 * The consent banner (replaces the informational cookie notice). Anonymous,
 * cookieless statistics run for everyone; this only asks whether the browser
 * may also remember an anonymous id (lib/telemetry/client.ts). „Приемам" and
 * „Отказвам" carry equal weight, as GDPR requires. Reopened from the footer
 * („Настройки за бисквитки") to change the choice at any time.
 */
export function ConsentBanner() {
  // Decided after mount: the server cannot see localStorage (a render-time
  // read caused hydration errors in the old notice).
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only storage, read after hydration on purpose
    setOpen(getConsent() === null)
    const reopen = () => setOpen(true)
    window.addEventListener(CONSENT_OPEN_EVENT, reopen)
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, reopen)
  }, [])

  if (!open) return null

  const choose = (choice: ConsentChoice) => {
    setConsent(choice)
    setOpen(false)
  }
  const button =
    'min-h-11 shrink-0 border px-5 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 ring-offset-sand'

  return (
    <div role="region" aria-label={t('consent.label')} className="fixed inset-x-0 bottom-0 z-50 border-t border-steel/20 bg-sand">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <p className="text-ink">
          {t('consent.text')}{' '}
          <Link href="/cookies" className="text-brass-dark underline hover:opacity-80">
            {t('consent.learnMore')}
          </Link>
        </p>
        <div className="flex gap-3">
          <button type="button" onClick={() => choose('denied')} className={`${button} border-ink text-ink hover:bg-cream`}>
            {t('consent.decline')}
          </button>
          <button type="button" onClick={() => choose('granted')} className={`${button} border-ink bg-ink text-cream hover:bg-ink/85`}>
            {t('consent.accept')}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Footer link that reopens the banner. */
export function ConsentSettingsLink({ className }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(CONSENT_OPEN_EVENT))}>
      {t('consent.settings')}
    </button>
  )
}
