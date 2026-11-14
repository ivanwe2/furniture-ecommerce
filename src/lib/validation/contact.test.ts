import { describe, expect, it } from 'vitest'
import { contactSchema } from './contact'

describe('contactSchema', () => {
  const valid = {
    name: 'Иван Петров',
    phone: '+359 88 1234567',
    email: 'ivan@example.com',
    message: 'Здравейте, искам да попитам за наличност на артикул.',
    altcha: 'test-altcha-payload',
  }

  it('accepts valid input with phone', () => {
    expect(contactSchema.safeParse(valid).success).toBe(true)
  })

  it('accepts valid input without phone (optional)', () => {
    const { phone: _p, ...withoutPhone } = valid
    expect(contactSchema.safeParse(withoutPhone).success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = contactSchema.safeParse({ ...valid, name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const result = contactSchema.safeParse({ ...valid, email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('rejects short message', () => {
    const result = contactSchema.safeParse({ ...valid, message: 'Здравей' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid phone when provided', () => {
    const result = contactSchema.safeParse({ ...valid, phone: '+359 12' })
    expect(result.success).toBe(false)
  })

  it('accepts permissive phone formats', () => {
    for (const phone of ['0881234567', '+359881234567', '088 123 4567']) {
      const result = contactSchema.safeParse({ ...valid, phone })
      expect(result.success, `phone: ${phone}`).toBe(true)
    }
  })

  it('rejects empty altcha payload', () => {
    const result = contactSchema.safeParse({ ...valid, altcha: '' })
    expect(result.success).toBe(false)
  })
})

describe('contactSchema error keys', () => {
  it('maps every failure to its bg.ts key (pinned across zod upgrades)', () => {
    const result = contactSchema.safeParse({ name: 'И', email: 'nope', message: 'кратко', altcha: '', phone: 'abc' })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(Object.fromEntries(result.error.issues.map((i) => [String(i.path[0]), i.message]))).toEqual({
      name: 'errors.required',
      email: 'errors.invalidEmail',
      message: 'errors.required',
      altcha: 'errors.captcha',
      phone: 'errors.invalidPhone',
    })
  })
})
