/**
 * Usage telemetry — the event catalogue and the pure helpers around it
 * (ARCHITECTURE §13, docs/OBSERVABILITY.md). Shared by the beacon route, the
 * server `track()` and the client queue; no Node or browser APIs here.
 *
 * Privacy model (Ivan, 2026-11-14 — "hybrid"):
 * - every event: no cookies, no raw IP, no personal data. Visitors are counted
 *   per day with a salted hash of IP + browser that rotates daily
 *   (`visitor_day`), so nobody can be followed across days;
 * - only after „Приемам": a random visitor id (localStorage) and session id
 *   (sessionStorage) are attached, which makes multi-day journeys visible.
 */
import { z } from 'zod'

const text = (max: number) => z.string().trim().max(max)
const sku = text(64).min(1)
const slug = text(200).min(1)
const path = text(300)
const cents = z.int().min(0).max(1_000_000_000)

/** Events the browser may send to POST /api/t, with their exact props. */
export const CLIENT_EVENTS = {
  page_view: z.object({ path }),
  product_view: z.object({ slug, sku }),
  variant_select: z.object({ slug, sku }),
  gallery_zoom: z.object({ slug }),
  cart_add: z.object({ slug, sku, qty: z.int().min(1).max(999), cents }),
  cart_remove: z.object({ sku }),
  checkout_start: z.object({ lines: z.int().min(0).max(50), cents }),
  inquiry_click: z.object({ sku, kind: z.enum(['availability', 'price']) }),
  phone_click: z.object({ place: text(40) }),
  consent: z.object({ choice: z.enum(['granted', 'denied']) }),
  not_found: z.object({ path }),
  // Logged (Loki), never stored as a usage event.
  client_error: z.object({
    message: text(500),
    source: text(300).optional(),
    line: z.int().min(0).optional(),
    digest: text(100).optional(),
  }),
} as const

export type ClientEventName = keyof typeof CLIENT_EVENTS
export type ClientEventProps<N extends ClientEventName> = z.infer<(typeof CLIENT_EVENTS)[N]>

/** Events the server records itself (typed, not re-validated). */
export type ServerEvents = {
  search: { q: string; results: number }
  order_placed: { lines: number; cents: number; method: string; staff?: boolean }
  order_rejected: { reason: 'validation' | 'captcha' | 'rate_limited' | 'cart_stale'; fields?: string[] }
  contact_sent: { about: boolean }
  admin_change: { collection: string; op: 'create' | 'update' | 'delete'; fields: string[]; user: string }
  admin_login: { user: string }
  import_row: { status: string; image: string }
}

export type EventName = Exclude<ClientEventName, 'client_error'> | keyof ServerEvents
export type EventSource = 'web' | 'server' | 'admin'

/** The beacon body: up to 20 events per request (client.ts batches). */
export const beaconSchema = z.object({
  v: z.uuid().optional(), // visitor id — only with consent
  s: z.uuid().optional(), // session id — only with consent
  r: text(500).optional(), // document.referrer, first beacon of a page load
  e: z
    .array(z.object({ n: z.string().max(40), p: z.unknown(), path: path.optional() }))
    .min(1)
    .max(20),
})

export type BeaconEvent = { name: ClientEventName; props: Record<string, unknown>; path: string | null }

/** Validate each beacon event against the catalogue; unknown or malformed ones are dropped. */
export function parseBeaconEvents(events: z.infer<typeof beaconSchema>['e']): BeaconEvent[] {
  const out: BeaconEvent[] = []
  for (const event of events) {
    if (!Object.hasOwn(CLIENT_EVENTS, event.n)) continue
    const name = event.n as ClientEventName
    const props = CLIENT_EVENTS[name].safeParse(event.p)
    if (!props.success) continue
    out.push({ name, props: props.data as Record<string, unknown>, path: event.path ? normalizePath(event.path) : null })
  }
  return out
}

/** Pathname only — never the query string (it can carry search terms or tokens). */
export function normalizePath(raw: string): string {
  const pathOnly = raw.split(/[?#]/, 1)[0] ?? ''
  const withSlash = pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`
  return withSlash.slice(0, 300)
}

const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/g
// A phone number: 9+ digits, allowing spaces/dashes and a leading +. Product
// codes are shorter or mix in letters (79B9550, 02718), so they survive.
const LONG_NUMBER = /\+?\d(?:[\s-]?\d){8,}/g

/** A search query as stored: trimmed, ≤ 100 chars, emails and phone numbers masked. */
export function cleanSearchQuery(q: string): string {
  return q.trim().replace(/\s+/g, ' ').slice(0, 100).replace(EMAIL, '<email>').replace(LONG_NUMBER, '<number>')
}

/** The referring site's host, or null for our own site, an empty or a bad referrer. */
export function referrerHost(referrer: string | null | undefined, siteHost: string): string | null {
  if (!referrer) return null
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, '').toLowerCase()
    return host && host !== siteHost.replace(/^www\./, '').toLowerCase() ? host.slice(0, 100) : null
  } catch {
    return null
  }
}

const BOT = /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python|httpclient|axios|node-fetch|go-http|java\/|okhttp|scrapy|phantomjs|selenium|playwright|puppeteer/i

export type UserAgentInfo = { bot: boolean; device: 'mobile' | 'tablet' | 'desktop'; browser: string }

/** Coarse, privacy-friendly classification — never the full user-agent string. */
export function classifyUserAgent(ua: string): UserAgentInfo {
  const bot = ua.trim() === '' || BOT.test(ua)
  const tablet = /ipad|tablet|(android(?!.*mobile))/i.test(ua)
  const mobile = !tablet && /mobi|iphone|ipod|android/i.test(ua)
  const browser = /edg\//i.test(ua)
    ? 'edge'
    : /opr\/|opera/i.test(ua)
      ? 'opera'
      : /samsungbrowser/i.test(ua)
        ? 'samsung'
        : /firefox|fxios/i.test(ua)
          ? 'firefox'
          : /chrome|crios/i.test(ua)
            ? 'chrome'
            : /safari/i.test(ua)
              ? 'safari'
              : 'other'
  return { bot, device: tablet ? 'tablet' : mobile ? 'mobile' : 'desktop', browser }
}

/** Fields that change on every save and say nothing about what the owner did. */
const NOISE = new Set(['id', 'updatedAt', 'createdAt', 'searchText', 'minPriceEurCents', 'sizes', 'url', 'thumbnailURL'])

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/**
 * A relationship arrives as an id on one side of a save and as the populated
 * document on the other (Payload's afterChange `doc` vs `previousDoc`). Reduce
 * populated documents to their id so an untouched brand/category/image is not
 * reported as changed.
 */
function refsToIds(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(refsToIds)
  if (!isObject(value)) return value
  if ('id' in value && ('updatedAt' in value || 'createdAt' in value)) return value.id
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value)) out[k] = refsToIds(v)
  return out
}

/**
 * Which fields an admin save changed: top-level names, and for arrays of rows
 * the row fields too (`items.stockQty`, `items.priceEurCents`) — that detail is
 * what shows automation candidates ("stock edited 200×/week").
 */
export function changedFields(rawDoc: unknown, rawPrevious: unknown): string[] {
  const doc = refsToIds(rawDoc)
  const previous = refsToIds(rawPrevious)
  if (!isObject(doc)) return []
  const prev = isObject(previous) ? previous : {}
  const out = new Set<string>()
  for (const key of new Set([...Object.keys(doc), ...Object.keys(prev)])) {
    if (NOISE.has(key)) continue
    const a = doc[key]
    const b = prev[key]
    if (JSON.stringify(a) === JSON.stringify(b)) continue
    if (Array.isArray(a) && Array.isArray(b) && a.every(isObject) && b.every(isObject) && a.length === b.length) {
      const sub = new Set<string>()
      a.forEach((row, i) => {
        const before = b[i] as Record<string, unknown>
        for (const k of Object.keys(row)) {
          if (k !== 'id' && JSON.stringify(row[k]) !== JSON.stringify(before[k])) sub.add(`${key}.${k}`)
        }
      })
      if (sub.size > 0) sub.forEach((s) => out.add(s))
      else out.add(key)
    } else {
      out.add(key)
    }
  }
  return [...out].sort().slice(0, 30)
}
