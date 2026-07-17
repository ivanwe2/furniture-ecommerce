'use client'

import React, { useEffect, useRef } from 'react'

/**
 * Self-hosted Altcha widget (replaces Cloudflare Turnstile). The `altcha`
 * package registers the `<altcha-widget>` custom element; it fetches a
 * challenge from `/altcha`, solves the proof-of-work in the browser, and emits
 * `statechange` with the base64 solution payload on success. No external calls.
 *
 * `onVerified` receives the payload string when solved, or '' when reset/expired
 * — mirroring the old Turnstile `onToken` contract so forms stay simple.
 */

// The custom element isn't in JSX.IntrinsicElements; alias the tag string to a
// typed component so we get checked props without `any`/ts-expect-error. At
// runtime this is still the string 'altcha-widget', so React renders the
// custom element and forwards `ref`/attributes to it.
const AltchaWidget = 'altcha-widget' as unknown as React.FC<{
  ref?: React.Ref<HTMLElement>
  challenge?: string
  style?: React.CSSProperties
}>

export function Altcha({ onVerified }: { onVerified: (payload: string) => void }) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    // Registers the custom element in the browser (side-effect import).
    void import('altcha')

    const el = ref.current
    if (!el) return

    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { state?: string; payload?: string } | undefined
      if (detail?.state === 'verified' && detail.payload) onVerified(detail.payload)
      else onVerified('')
    }
    el.addEventListener('statechange', handler as EventListener)
    return () => el.removeEventListener('statechange', handler as EventListener)
  }, [onVerified])

  // Square, palette-matched theming (Altcha reads these CSS custom props).
  const style = {
    display: 'block',
    maxWidth: '360px',
    '--altcha-border-radius': '0px',
    '--altcha-color-base': 'var(--color-raised)',
    '--altcha-color-border': 'color-mix(in srgb, var(--color-ink) 20%, transparent)',
    '--altcha-color-text': 'var(--color-ink)',
    '--altcha-color-border-focus': 'var(--color-brass)',
    '--altcha-color-checkbox-check': 'var(--color-brass)',
  } as React.CSSProperties

  // v3 attribute is `challenge` (a URL to fetch, or inline JSON) — not `challengeurl`.
  return <AltchaWidget ref={ref} challenge="/altcha" style={style} />
}
