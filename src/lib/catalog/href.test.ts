import { describe, expect, it } from 'vitest'
import { listingHref } from './href'

describe('listingHref — preserves the current view', () => {
  it('returns the bare path when there is nothing to carry', () => {
    expect(listingHref('/category/panti', {})).toBe('/category/panti')
  })

  it('KEEPS existing params when only page changes — the pager bug', () => {
    // The old pager built `${basePath}?page=2` and silently dropped sort/brand.
    const href = listingHref('/category/panti', { sort: 'price_asc', brand: 'blum' }, { page: 2 })
    expect(href).toContain('sort=price_asc')
    expect(href).toContain('brand=blum')
    expect(href).toContain('page=2')
  })

  it('overrides an existing value rather than duplicating it', () => {
    const href = listingHref('/category/panti', { page: '3' }, { page: 1 })
    expect(href).toBe('/category/panti?page=1')
    expect(href.match(/page=/g)).toHaveLength(1)
  })

  it('removes a param when the override is undefined or empty', () => {
    expect(listingHref('/category/panti', { brand: 'blum' }, { brand: undefined })).toBe(
      '/category/panti',
    )
    expect(listingHref('/category/panti', { brand: 'blum' }, { brand: '' })).toBe('/category/panti')
  })

  it('drops empty incoming values instead of emitting bare keys', () => {
    expect(listingHref('/x', { sort: '', brand: undefined })).toBe('/x')
  })

  it('takes the first value of a repeated param', () => {
    expect(listingHref('/x', { sort: ['price_asc', 'newest'] })).toBe('/x?sort=price_asc')
  })

  it('URL-encodes values (Cyrillic brand slugs, spaces)', () => {
    const href = listingHref('/search', { q: 'панта 35' })
    expect(href).toContain('q=%D0%BF%D0%B0%D0%BD%D1%82%D0%B0+35')
    expect(new URL(href, 'https://x').searchParams.get('q')).toBe('панта 35')
  })

  it('orders params stably so the same view always has one URL', () => {
    const a = listingHref('/x', { sort: 'newest', brand: 'blum' }, { page: 2 })
    const b = listingHref('/x', { brand: 'blum', sort: 'newest' }, { page: 2 })
    expect(a).toBe(b)
  })
})
