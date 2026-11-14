import { describe, expect, it } from 'vitest'
import {
  beaconSchema,
  changedFields,
  classifyUserAgent,
  cleanSearchQuery,
  normalizePath,
  parseBeaconEvents,
  referrerHost,
} from './events'

describe('parseBeaconEvents', () => {
  it('keeps known events with valid props and drops the rest', () => {
    const body = beaconSchema.parse({
      e: [
        { n: 'page_view', p: { path: '/product/x' }, path: '/product/x?utm=1' },
        { n: 'cart_add', p: { slug: 'x', sku: 'A1', qty: 2, cents: 505 } },
        { n: 'cart_add', p: { slug: 'x', sku: 'A1', qty: 0, cents: 505 } }, // qty 0
        { n: 'steal_cookies', p: {} }, // unknown
        { n: 'toString', p: {} }, // prototype key
        { n: 'inquiry_click', p: { sku: 'A1', kind: 'price', extra: 'ignored' } },
      ],
    })
    const events = parseBeaconEvents(body.e)
    expect(events.map((e) => e.name)).toEqual(['page_view', 'cart_add', 'inquiry_click'])
    expect(events[0]?.path).toBe('/product/x')
    expect(events[2]?.props).toEqual({ sku: 'A1', kind: 'price' }) // unknown keys stripped
  })

  it('rejects oversized batches and non-uuid ids at the schema', () => {
    expect(beaconSchema.safeParse({ e: Array.from({ length: 21 }, () => ({ n: 'page_view', p: { path: '/' } })) }).success).toBe(false)
    expect(beaconSchema.safeParse({ v: 'not-a-uuid', e: [{ n: 'page_view', p: { path: '/' } }] }).success).toBe(false)
  })
})

describe('cleanSearchQuery', () => {
  it('masks emails and phone numbers but keeps product codes', () => {
    expect(cleanSearchQuery('  панта   79B9550 ')).toBe('панта 79B9550')
    expect(cleanSearchQuery('02718')).toBe('02718')
    expect(cleanSearchQuery('ivan@example.com панта')).toBe('<email> панта')
    expect(cleanSearchQuery('звънете 0888 123 456')).toBe('звънете <number>')
    expect(cleanSearchQuery('+359888123456')).toBe('<number>')
  })

  it('caps the length', () => {
    expect(cleanSearchQuery('a'.repeat(300))).toHaveLength(100)
  })
})

describe('normalizePath / referrerHost', () => {
  it('keeps the pathname only', () => {
    expect(normalizePath('/search?q=ivan@example.com#x')).toBe('/search')
    expect(normalizePath('product/x')).toBe('/product/x')
  })

  it('reports external referrer hosts only', () => {
    expect(referrerHost('https://www.google.com/search?q=x', 'nasteh.bg')).toBe('google.com')
    expect(referrerHost('https://nasteh.bg/category/x', 'nasteh.bg')).toBeNull()
    expect(referrerHost('https://www.nasteh.bg/', 'nasteh.bg')).toBeNull()
    expect(referrerHost('not a url', 'nasteh.bg')).toBeNull()
    expect(referrerHost('', 'nasteh.bg')).toBeNull()
  })
})

describe('classifyUserAgent', () => {
  it('classifies common browsers and devices coarsely', () => {
    const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
    const desktop = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
    const ipad = 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/604.1'
    expect(classifyUserAgent(iphone)).toEqual({ bot: false, device: 'mobile', browser: 'safari' })
    expect(classifyUserAgent(desktop)).toEqual({ bot: false, device: 'desktop', browser: 'chrome' })
    expect(classifyUserAgent(ipad).device).toBe('tablet')
  })

  it('flags bots, tools and empty user agents', () => {
    expect(classifyUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)').bot).toBe(true)
    expect(classifyUserAgent('curl/8.5.0').bot).toBe(true)
    expect(classifyUserAgent('Mozilla/5.0 HeadlessChrome/141.0').bot).toBe(true)
    expect(classifyUserAgent('').bot).toBe(true)
  })
})

describe('changedFields', () => {
  it('names changed top-level fields and ignores save noise', () => {
    expect(
      changedFields(
        { name: 'Нова', status: 'published', updatedAt: '2', searchText: 'x' },
        { name: 'Стара', status: 'published', updatedAt: '1', searchText: 'y' },
      ),
    ).toEqual(['name'])
  })

  it('names the row fields that changed inside arrays', () => {
    const before = { items: [{ id: 'a', sku: 'A1', stockQty: 3, priceEurCents: 505 }, { id: 'b', sku: 'B1', stockQty: 0, priceEurCents: 669 }] }
    const after = { items: [{ id: 'a', sku: 'A1', stockQty: 5, priceEurCents: 505 }, { id: 'b', sku: 'B1', stockQty: 0, priceEurCents: 700 }] }
    expect(changedFields(after, before)).toEqual(['items.priceEurCents', 'items.stockQty'])
  })

  it('falls back to the array name when rows were added or removed', () => {
    expect(changedFields({ items: [{ sku: 'A' }, { sku: 'B' }] }, { items: [{ sku: 'A' }] })).toEqual(['items'])
  })
})
