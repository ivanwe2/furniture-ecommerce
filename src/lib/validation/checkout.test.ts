import { describe, expect, it } from 'vitest'
import { checkoutSchema } from './checkout'

describe('checkoutSchema', () => {
  const valid = {
    name: 'Иван Петров',
    phone: '+359 88 1234567',
    email: 'ivan@example.com',
    method: 'address' as const,
    city: 'Пловдив',
    addressOrOffice: 'бул. Васил Левски 10, ет. 1',
    note: 'Моля, звънете преди доставка',
    altcha: 'test-altcha-payload',
    consent: true as const,
  }

  it('accepts valid input', () => {
    expect(checkoutSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = checkoutSchema.safeParse({ ...valid, name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects single char name', () => {
    const result = checkoutSchema.safeParse({ ...valid, name: 'И' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid phone (too short)', () => {
    const result = checkoutSchema.safeParse({ ...valid, phone: '+359 123' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid phone (letters)', () => {
    const result = checkoutSchema.safeParse({ ...valid, phone: 'abc-def-ghi-jkl' })
    expect(result.success).toBe(false)
  })

  it('accepts permissive phone formats', () => {
    for (const phone of ['0881234567', '+359881234567', '088 123 4567', '+359 88 123 4567']) {
      const result = checkoutSchema.safeParse({ ...valid, phone })
      expect(result.success, `phone: ${phone}`).toBe(true)
    }
  })

  it('rejects invalid email', () => {
    const result = checkoutSchema.safeParse({ ...valid, email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid method value', () => {
    const result = checkoutSchema.safeParse({ ...valid, method: 'pickup' as 'address' | 'econt' | 'speedy' })
    expect(result.success).toBe(false)
  })

  it('rejects missing consent', () => {
    const result = checkoutSchema.safeParse({ ...valid, consent: false })
    expect(result.success).toBe(false)
  })

  it('rejects empty altcha payload', () => {
    const result = checkoutSchema.safeParse({ ...valid, altcha: '' })
    expect(result.success).toBe(false)
  })
})
