/**
 * Usage telemetry, browser side (ARCHITECTURE §13). Components call
 * `trackClient(name, props)`; events are queued and sent in batches to
 * POST /api/t with `navigator.sendBeacon` (on a short timer and when the page
 * is hidden), so tracking never delays a click or a navigation.
 *
 * Consent ("hybrid", Ivan 2026-11-14): nothing here sets a cookie. Without a
 * choice, or after „Отказвам", events carry no identifier at all. After
 * „Приемам" a random visitor id (localStorage) and session id
 * (sessionStorage) ride along. Storing the choice itself is strictly
 * necessary and needs no consent.
 */
import type { ClientEventName, ClientEventProps } from '@/lib/telemetry/events'

export type ConsentChoice = 'granted' | 'denied'

const CONSENT_KEY = 'nasteh-consent'
const VISITOR_KEY = 'nasteh-vid'
const SESSION_KEY = 'nasteh-sid'
export const CONSENT_OPEN_EVENT = 'nasteh:consent-open'

type Queued = { n: ClientEventName; p: unknown; path: string }

const queue: Queued[] = []
let timer: ReturnType<typeof setTimeout> | null = null
let referrerSent = false
let listening = false

function storage(kind: 'local' | 'session'): Storage | null {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

export function getConsent(): ConsentChoice | null {
  if (typeof window === 'undefined') return null
  const value = storage('local')?.getItem(CONSENT_KEY)
  return value === 'granted' || value === 'denied' ? value : null
}

function ids(): { v?: string; s?: string } {
  if (getConsent() !== 'granted') return {}
  const local = storage('local')
  const session = storage('session')
  let v = local?.getItem(VISITOR_KEY) ?? undefined
  if (!v && local) {
    v = crypto.randomUUID()
    local.setItem(VISITOR_KEY, v)
  }
  let s = session?.getItem(SESSION_KEY) ?? undefined
  if (!s && session) {
    s = crypto.randomUUID()
    session.setItem(SESSION_KEY, s)
  }
  return { ...(v ? { v } : {}), ...(s ? { s } : {}) }
}

export function setConsent(choice: ConsentChoice): void {
  storage('local')?.setItem(CONSENT_KEY, choice)
  if (choice === 'denied') {
    storage('local')?.removeItem(VISITOR_KEY)
    storage('session')?.removeItem(SESSION_KEY)
  }
  trackClient('consent', { choice })
}

export function trackClient<N extends ClientEventName>(name: N, props: ClientEventProps<N>): void {
  if (typeof window === 'undefined') return
  listen()
  queue.push({ n: name, p: props, path: window.location.pathname })
  if (queue.length >= 20) flush()
  else if (!timer) timer = setTimeout(flush, 3000)
}

function flush(): void {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  while (queue.length > 0) {
    const batch = queue.splice(0, 20)
    const body = JSON.stringify({
      ...ids(),
      ...(!referrerSent && document.referrer ? { r: document.referrer.slice(0, 500) } : {}),
      e: batch,
    })
    referrerSent = true
    // text/plain keeps sendBeacon a "simple" request (no preflight).
    const sent = navigator.sendBeacon?.('/api/t', new Blob([body], { type: 'text/plain' }))
    if (!sent) {
      void fetch('/api/t', { method: 'POST', body, keepalive: true, headers: { 'content-type': 'text/plain' } }).catch(() => {})
    }
  }
}

function listen(): void {
  if (listening) return
  listening = true
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
  })
  window.addEventListener('pagehide', flush)
}
