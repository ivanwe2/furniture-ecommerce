'use client'

import Link from 'next/link'
import { t } from '@/lib/i18n/bg'
import { Container, Input, Textarea, Button } from '@/components/ui'
import { useActionState } from 'react'

interface ContactFormState {
  ok: boolean
  error?: string
}

async function contactAction(_prevState: ContactFormState | undefined, _formData: FormData): Promise<ContactFormState> {
  // Stub action — real implementation lands in Phase 6
  return { ok: true }
}

export default function ContactPageClient() {
  const [state, formAction, isPending] = useActionState(contactAction, { ok: false })

  return (
    <Container className="py-8">
      {/* Breadcrumbs */}
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
            <h2 className="text-lg font-semibold text-ink">Настех ООД</h2>
            <p className="mt-1 text-sm text-steel">г. Пловдив, бул. &quot;Васил Левски&quot; 55</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink">Телефон</h3>
            <a href="tel:+359888000000" className="mt-1 block text-sm text-brass hover:underline">
              +359 888 000 000
            </a>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink">Имейл</h3>
            <a href="mailto:info@nasteh.bg" className="mt-1 block text-sm text-brass hover:underline">
              info@nasteh.bg
            </a>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink">Работно време</h3>
            <p className="mt-1 text-sm text-steel">Пон–Пет: 08:30–17:30</p>
            <p className="text-sm text-steel">Съб: 09:00–14:00</p>
          </div>
          <div>
            <a
              href="https://maps.google.com/?q=Настех+Пловдив"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-brass hover:underline"
            >
              Покажи на картата
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
            </a>
          </div>
        </div>

        {/* Contact form */}
        <form action={formAction} className="space-y-5">
          {state.ok && (
            <div className="rounded-lg bg-ok/10 p-4 text-sm text-ok" role="alert">
              {t('contact.success')}
            </div>
          )}

          <Input
            label={t('checkout.name')}
            name="name"
            required
            placeholder="Име и фамилия"
          />

          <Input
            label={t('checkout.email')}
            name="email"
            type="email"
            required
            placeholder="имейл@example.com"
          />

          <Input
            label={t('checkout.phone')}
            name="phone"
            type="tel"
            placeholder="+359 888 000 000"
          />

          <Textarea
            label={t('contact.message')}
            name="message"
            required
            rows={5}
            placeholder="Вашето съобщение..."
          />

          <Button type="submit" pending={isPending} className="w-full">
            {isPending ? t('checkout.submitting') : t('contact.send')}
          </Button>
        </form>
      </div>
    </Container>
  )
}
