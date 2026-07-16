'use client'

import { useState, useTransition } from 'react'
import type { CompanyInfo } from '@/lib/company'
import { t, tSafe } from '@/lib/i18n/bg'
import { Container, Input, Textarea, Button, Alert, Turnstile } from '@/components/ui'
import { Breadcrumbs } from '@/components/catalog/Breadcrumbs'
import { submitContact } from '@/actions/contact'

export default function ContactPageClient({ company }: { company: CompanyInfo }) {
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
    <Container className="py-8 sm:py-10">
      <Breadcrumbs
        items={[
          { name: t('common.home'), href: '/' },
          { name: t('nav.contact') },
        ]}
      />

      <header className="mb-8 border-b border-ink/12 pb-6">
        <div className="mb-2.5 font-mono text-xs uppercase tracking-[0.16em] text-brass-dark">{t('contact.title')}</div>
        <h1 className="font-display text-3xl font-semibold tracking-[-0.02em] text-ink sm:text-4xl">{company.name}</h1>
      </header>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        {/* Contact info — a technical spec sheet */}
        <dl className="h-fit divide-y divide-ink/10 border border-ink/14 bg-raised">
          <div className="p-5">
            <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-steel">{t('store.centralOffice')}</dt>
            <dd className="mt-1.5 text-sm text-ink">гр. {company.city}, {company.addressLine}</dd>
          </div>
          <div className="p-5">
            <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-steel">{t('store.phone')}</dt>
            <dd className="mt-1.5">
              <a href={company.phoneHref} className="font-mono text-sm text-ink transition-colors hover:text-brass">
                {company.phoneDisplay}
              </a>
            </dd>
          </div>
          <div className="p-5">
            <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-steel">{t('store.email')}</dt>
            <dd className="mt-1.5">
              <a href={company.emailHref} className="text-sm text-brass-dark transition-colors hover:text-brass">
                {company.email}
              </a>
            </dd>
          </div>
          <div className="p-5">
            <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-steel">{t('store.workingHours')}</dt>
            <dd className="mt-1.5 text-sm text-ink2">
              {company.workingHours.weekdays}
              <br />
              {company.workingHours.saturday}
            </dd>
          </div>
        </dl>

        {/* Contact form */}
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {success && (
            <div className="border border-ok/30 bg-ok/10 px-4 py-3 text-sm text-ok" role="alert">
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

          <Button type="submit" pending={isPending} disabled={!turnstileToken} className="w-full">
            {isPending ? t('checkout.submitting') : t('contact.send')}
          </Button>
        </form>
      </div>
    </Container>
  )
}
