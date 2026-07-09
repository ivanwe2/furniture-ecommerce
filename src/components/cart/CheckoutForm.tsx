'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { t, tSafe } from '@/lib/i18n/bg'
import { useCart } from '@/lib/cart/store'
import { computeTotals, type ResolvedLine } from '@/lib/cart/totals'
import { submitOrder } from '@/actions/order'
import { Container, Input, Textarea, Button, Checkbox, Price, Alert, Skeleton, Turnstile } from '@/components/ui'

type ResolutionEntry = ResolvedLine & { inStock: boolean }

interface CheckoutFormProps {
  resolution: Map<string, ResolutionEntry>
}

type Method = 'address' | 'econt' | 'speedy'

export function CheckoutForm({ resolution }: CheckoutFormProps) {
  const lines = useCart((s) => s.lines)
  const hydrated = useCart((s) => s.hydrated)
  const clear = useCart((s) => s.clear)
  const router = useRouter()

  const [isPending, startTransition] = useTransition()
  const [method, setMethod] = useState<Method>('address')
  const [turnstileToken, setTurnstileToken] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [globalError, setGlobalError] = useState('')

  if (!hydrated) {
    return (
      <Container className="py-8">
        <Skeleton className="mb-6 h-7 w-40" />
        <Skeleton className="h-96 w-full max-w-lg" />
      </Container>
    )
  }

  // Resolve cart lines against current DB state (prices are display-only here;
  // the server recomputes authoritative totals in the order action).
  const resolvedMap = new Map<string, ResolvedLine>()
  for (const line of lines) {
    const entry = resolution.get(`${line.productSlug}:${line.sku}`)
    if (entry) {
      resolvedMap.set(`${line.productSlug}:${line.sku}`, {
        productSlug: entry.productSlug,
        sku: entry.sku,
        qty: line.qty,
        name: entry.name,
        unit: entry.unit,
        priceEurCents: entry.priceEurCents,
      })
    }
  }
  const totals = computeTotals({ lines, resolution: resolvedMap })

  if (totals.ok.length === 0) {
    return (
      <Container className="py-16">
        <div className="flex flex-col items-center gap-4 text-center">
          <h1 className="text-xl font-semibold text-ink">{t('checkout.title')}</h1>
          <p className="text-steel">{t('cart.empty')}</p>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded bg-brass px-5 py-2.5 text-sm font-medium text-cream hover:bg-brass/90"
          >
            {t('cart.goShopping')}
          </Link>
        </div>
      </Container>
    )
  }

  const addressLabel = method === 'address' ? t('checkout.addressLabel') : t('checkout.officeLabel')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)

    const input = {
      name: (fd.get('name') as string) ?? '',
      phone: (fd.get('phone') as string) ?? '',
      email: (fd.get('email') as string) ?? '',
      method,
      city: (fd.get('city') as string) ?? '',
      addressOrOffice: (fd.get('addressOrOffice') as string) ?? '',
      note: (fd.get('note') as string) || undefined,
      consent: fd.get('consent') === 'on',
      website: (fd.get('website') as string) ?? '',
      turnstileToken,
      cart: JSON.stringify(totals.ok.map((l) => ({ productSlug: l.productSlug, sku: l.sku, qty: l.qty }))),
    }

    setFieldErrors({})
    setGlobalError('')

    startTransition(async () => {
      const res = await submitOrder(input)
      if (res.ok) {
        clear()
        router.push(`/checkout/success?n=${encodeURIComponent(res.data.orderNumber)}`)
        return
      }
      if (res.fieldErrors) setFieldErrors(res.fieldErrors)
      if (res.error) setGlobalError(res.error)
      // Focus the first field with an error.
      const firstKey = res.fieldErrors ? Object.keys(res.fieldErrors)[0] : undefined
      if (firstKey) {
        const el = form.querySelector<HTMLElement>(`[name="${firstKey}"]`)
        el?.focus()
      }
    })
  }

  return (
    <Container className="py-8">
      <h1 className="mb-6 text-xl font-semibold text-ink">{t('checkout.title')}</h1>

      <div className="mx-auto max-w-lg space-y-6">
        {/* Order summary (collapsed) */}
        <details className="rounded-lg border border-sand bg-cream">
          <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium text-ink">
            <span>{t('cart.total')}</span>
            <Price eurCents={totals.subtotalEurCents} className="font-semibold" />
          </summary>
          <ul className="border-t border-sand px-4 py-3 space-y-2">
            {totals.ok.map((line) => (
              <li key={line.sku} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 flex-1 text-ink">
                  {line.name} <span className="text-steel">× {line.qty}</span>
                </span>
                <Price eurCents={line.priceEurCents * line.qty} className="shrink-0 tabular-nums" />
              </li>
            ))}
          </ul>
          <p className="border-t border-sand px-4 py-2 text-xs text-steel">{t('cart.codNote')}</p>
        </details>

        {totals.stale.length > 0 && (
          <Alert variant="danger">
            {t('errors.cartStale')}{' '}
            <Link href="/cart" className="underline">
              {t('cart.title')}
            </Link>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {globalError && <Alert variant="danger">{tSafe(globalError)}</Alert>}

          <Input
            label={t('checkout.name')}
            name="name"
            required
            autoComplete="name"
            error={fieldErrors['name'] ? tSafe(fieldErrors['name']) : null}
          />
          <Input
            label={t('checkout.phone')}
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            placeholder="+359 888 000 000"
            error={fieldErrors['phone'] ? tSafe(fieldErrors['phone']) : null}
          />
          <Input
            label={t('checkout.email')}
            name="email"
            type="email"
            required
            autoComplete="email"
            error={fieldErrors['email'] ? tSafe(fieldErrors['email']) : null}
          />

          {/* Delivery method */}
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-ink">{t('checkout.method')}</legend>
            {(
              [
                ['address', t('checkout.methodAddress')],
                ['econt', t('checkout.methodEcont')],
                ['speedy', t('checkout.methodSpeedy')],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="radio"
                  name="method"
                  value={value}
                  checked={method === value}
                  onChange={() => setMethod(value)}
                  className="h-4 w-4 border-steel text-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
                />
                {label}
              </label>
            ))}
          </fieldset>

          <Input
            label={t('checkout.city')}
            name="city"
            required
            autoComplete="address-level2"
            error={fieldErrors['city'] ? tSafe(fieldErrors['city']) : null}
          />
          <Input
            label={addressLabel}
            name="addressOrOffice"
            required
            error={fieldErrors['addressOrOffice'] ? tSafe(fieldErrors['addressOrOffice']) : null}
          />
          <Textarea label={t('checkout.note')} name="note" rows={3} />

          {/* Honeypot — off-screen; bots fill it, humans don't (arbitrary -9999px
              offset keeps it in the a11y/layout tree but out of view). */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label htmlFor="website">Website</label>
            <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
          </div>

          <Checkbox name="consent" label={t('checkout.consent')} />
          {fieldErrors['consent'] && (
            <p className="text-xs text-danger" role="alert">
              {tSafe(fieldErrors['consent'])}
            </p>
          )}

          <Turnstile onToken={setTurnstileToken} />

          <Button type="submit" pending={isPending} className="w-full">
            {isPending ? t('checkout.submitting') : t('checkout.submit')}
          </Button>
        </form>
      </div>
    </Container>
  )
}
