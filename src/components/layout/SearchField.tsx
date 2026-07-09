'use client'

import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import { t } from '@/lib/i18n/bg'
import { Input } from '@/components/ui'

export function SearchField({ className }: { className?: string }) {
  const router = useRouter()

  return (
    <form
      className={clsx('flex-1', className)}
      onSubmit={(e) => {
        e.preventDefault()
        const form = e.currentTarget
        const q = (form.elements.namedItem('q') as HTMLInputElement)?.value?.trim()
        if (q) router.push(`/tarsene?q=${encodeURIComponent(q)}`)
      }}
    >
      <Input
        name="q"
        placeholder={t('search.placeholder')}
        className="w-full bg-sand/50 border-transparent focus-visible:border-brass focus-visible:ring-brass"
      />
    </form>
  )
}
