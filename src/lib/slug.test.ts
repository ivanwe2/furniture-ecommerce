import { describe, expect, it } from 'vitest'
import { slugify } from '@/lib/slug'

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
