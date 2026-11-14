import { describe, expect, it } from 'vitest'
import { normalizeSlug, slugify } from '@/lib/slug'

describe('slugify', () => {
  it('transliterates Bulgarian characters', () => {
    expect(slugify('Дръжки')).toBe('drazhki')
    expect(slugify('Панти')).toBe('panti')
    expect(slugify('Механизми')).toBe('mehanizmi')
    expect(slugify('Чекмеджета')).toBe('chekmedzheta')
  })

  it('handles ъ, щ, ю, я, й', () => {
    expect(slugify('Ъгъл')).toBe('agal')
    expect(slugify('Щифт')).toBe('shtift')
    expect(slugify('Южен')).toBe('yuzhen')
    expect(slugify('Ясен')).toBe('yasen')
    expect(slugify('Йоан')).toBe('yoan')
  })

  it('handles soft sign ь', () => {
    expect(slugify('Плъзгаща')).toBe('plazgashta')
  })

  it('lowercases and collapses hyphens', () => {
    expect(slugify('A---B')).toBe('a-b')
  })

  it('trims leading/trailing hyphens', () => {
    expect(slugify('---test---')).toBe('test')
  })

  it('handles spaces and special characters', () => {
    expect(slugify('Hello World!')).toBe('hello-world')
  })

  it('preserves numbers', () => {
    expect(slugify('Item 123')).toBe('item-123')
    expect(slugify('02718')).toBe('02718')
  })

  it('returns empty string for non-alphanumeric input', () => {
    expect(slugify('!!!')).toBe('')
    expect(slugify('   ')).toBe('')
  })
})

describe('normalizeSlug', () => {
  it('keeps a clean slug unchanged', () => {
    expect(normalizeSlug('mebelen-obkov', 'Мебелен обков')).toBe('mebelen-obkov')
  })

  it('transliterates a typed slug that is not clean', () => {
    expect(normalizeSlug('pant-clip-on-amortisьor', 'x')).toBe('pant-clip-on-amortisyor')
    expect(normalizeSlug(' Панти ', 'x')).toBe('panti')
  })

  it('falls back to the name when the slug is empty or unusable', () => {
    expect(normalizeSlug('', 'Газов амортисьор 100N')).toBe('gazov-amortisyor-100n')
    expect(normalizeSlug('—', 'Панта')).toBe('panta')
    expect(normalizeSlug(undefined, 'Панта')).toBe('panta')
  })

  it('returns undefined when neither gives a slug', () => {
    expect(normalizeSlug(undefined, undefined)).toBeUndefined()
    expect(normalizeSlug('!!!', '***')).toBeUndefined()
  })
})
