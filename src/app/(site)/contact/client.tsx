'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { company } from '@/lib/company'
import { t, tSafe } from '@/lib/i18n/bg'
import { Container, Input, Textarea, Button, Alert, Turnstile } from '@/components/ui'
import { submitContact } from '@/actions/contact'

export default function ContactPageClient() {
  const [isPending, startTransition] = useTransition()
  const [turnstileToken, setTurnstileToken] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [globalError, setGlobalError] = useState('')
  const [success, setSuccess] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)

    const input = {
      name: (fd.get('name') as string) ?? '',
      email: (fd.get('email') as string) ?? '',
      phone: (fd.get('phone') as string) || undefined,
      message: (fd.get('message') as string) ?? '',
      website: (fd.get('website') as string) ?? '',
      turnstileToken,
    }

    setFieldErrors({})
    setGlobalError('')

    startTransition(async () => {
      const res = await submitContact(input)
      if (res.ok) {
        setSuccess(true)
        form.reset()
        return
      }
      if (res.fieldErrors) setFieldErrors(res.fieldErrors)
      if (res.error) setGlobalError(res.error)
    })
  }

  return (
    <Container className="py-8">
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex items-center gap-2 text-sm text-steel">
          <li>
            <Link href="/" className="hover:text-brass transition-colors">
              {t('common.home')}
            </Link>
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden="true">/</span>
            <span className="text-ink">{t('nav.contact')}</span>
          </li>
        </ol>
      </nav>

      <h1 className="mb-8 text-2xl font-bold text-ink">{t('contact.title')}</h1>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Contact info */}
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-ink">{company.name}</h2>
            <p className="mt-1 text-sm text-steel">
              {t('store.centralOffice')}: гр. {company.city}, {company.addressLine}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink">{t('store.phone')}</h3>
            <a href={company.phoneHref} className="mt-1 block text-sm text-brass hover:underline">
              {company.phoneDisplay}
            </a>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink">{t('store.email')}</h3>
            <a href={company.emailHref} className="mt-1 block text-sm text-brass hover:underline">
              {company.email}
            </a>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink">{t('store.workingHours')}</h3>
            <p className="mt-1 text-sm text-steel">{company.workingHours.weekdays}</p>
            <p className="text-sm text-steel">{company.workingHours.saturday}</p>
          </div>
        </div>

        {/* Contact form */}
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {success && (
            <div className="rounded-lg bg-ok/10 p-4 text-sm text-ok" role="alert">
              {t('contact.success')}
            </div>
          )}
          {globalError && <Alert variant="danger">{tSafe(globalError)}</Alert>}

          <Input
            label={t('checkout.name')}
            name="name"
            required
            autoComplete="name"
            error={fieldErrors['name'] ? tSafe(fieldErrors['name']) : null}
          />
          <Input
            label={t('checkout.email')}
            name="email"
            type="email"
            required
            autoComplete="email"
            error={fieldErrors['email'] ? tSafe(fieldErrors['email']) : null}
          />
          <Input
            label={t('checkout.phone')}
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+359 888 000 000"
            error={fieldErrors['phone'] ? tSafe(fieldErrors['phone']) : null}
          />
          <Textarea
            label={t('contact.message')}
            name="message"
            required
            rows={5}
            error={fieldErrors['message'] ? tSafe(fieldErrors['message']) : null}
          />

          {/* Honeypot */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label htmlFor="website">Website</label>
            <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
          </div>

          <Turnstile onToken={setTurnstileToken} />

          <Button type="submit" pending={isPending} className="w-full">
            {isPending ? t('checkout.submitting') : t('contact.send')}
          </Button>
        </form>
      </div>
    </Container>
  )
}
