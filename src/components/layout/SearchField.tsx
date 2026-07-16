'use client'

import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import { t } from '@/lib/i18n/bg'
import { Input } from '@/components/ui'

export function SearchField({ className, onSubmit }: { className?: string; onSubmit?: () => void }) {
  const router = useRouter()

  return (
    <form
      className={clsx('flex-1', className)}
      onSubmit={(e) => {
        e.preventDefault()
        const form = e.currentTarget
        const q = (form.elements.namedItem('q') as HTMLInputElement)?.value?.trim()
        if (q) {
          router.push(`/search?q=${encodeURIComponent(q)}`)
          onSubmit?.()
        }
      }}
    >
      <Input
        name="q"
        placeholder={t('search.placeholder')}
        className="w-full border border-ink/15 bg-transparent text-sm placeholder:text-steel focus-visible:border-brass focus-visible:ring-0"
      />
    </form>
  )
}
