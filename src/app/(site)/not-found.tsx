'use client'

import { t } from '@/lib/i18n/bg'
import { Input, Button } from '@/components/ui'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-semibold text-ink">{t('notFound.title')}</h1>
        <p className="mt-2 text-sm text-steel">{t('notFound.body')}</p>
        <form
          className="mt-6 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            const form = e.currentTarget
            const q = (form.elements.namedItem('q') as HTMLInputElement)?.value?.trim()
            if (q) window.location.href = `/tarsene?q=${encodeURIComponent(q)}`
          }}
        >
          <Input
            name="q"
            placeholder={t('search.placeholder')}
            className="flex-1 bg-sand/50 border-transparent focus-visible:border-brass"
          />
          <Button type="submit" variant="brass" size="sm">
            {t('common.search')}
          </Button>
        </form>
        <Link href="/" className="mt-6 inline-block text-sm text-brass hover:underline">
          {t('common.home')}
        </Link>
      </div>
    </div>
  )
}
