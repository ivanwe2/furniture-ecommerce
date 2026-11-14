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

// The order action maps each issue's message straight to a bg.ts key
// (fieldErrors), so the MESSAGE per field is part of the contract — pinned
// here so a zod upgrade cannot silently turn them into English defaults
// (zod 3 → 4, 2026-11-14: `errorMap` became `error`).
describe('checkoutSchema error keys', () => {
  const valid = {
    name: 'Иван Петров',
    phone: '+359 88 1234567',
    email: 'ivan@example.com',
    method: 'address',
    city: 'Пловдив',
    addressOrOffice: 'бул. Васил Левски 10',
    altcha: 'payload',
    consent: true,
  }
  const messages = (input: Record<string, unknown>) => {
    const result = checkoutSchema.safeParse(input)
    if (result.success) return {}
    return Object.fromEntries(result.error.issues.map((i) => [String(i.path[0]), i.message]))
  }

  it('maps every failure to its bg.ts key', () => {
    expect(
      messages({ ...valid, name: 'И', email: 'nope', method: 'pigeon', consent: false, altcha: '', city: 'x'.repeat(121) }),
    ).toEqual({
      name: 'errors.required',
      email: 'errors.invalidEmail',
      method: 'errors.required',
      consent: 'errors.consentRequired',
      altcha: 'errors.captcha',
      city: 'errors.tooLong',
    })
  })

  it('keys a bad phone as invalid', () => {
    expect(messages({ ...valid, phone: '0888-ABC-123' }).phone).toBe('errors.invalidPhone')
  })
})
