import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatLine, log, redact, serializeError, throttled } from '@/lib/log'

describe('formatLine', () => {
  it('writes one JSON object with ts, level, area, msg and fields', () => {
    const entry = JSON.parse(formatLine('info', 'order', 'order placed', { orderNumber: 'NAS-1', lines: 3 }))
    expect(entry).toMatchObject({ level: 'info', area: 'order', msg: 'order placed', orderNumber: 'NAS-1', lines: 3 })
    expect(Number.isNaN(Date.parse(entry.ts))).toBe(false)
  })

  it('serialises errors instead of losing them as {}', () => {
    const err = Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' })
    const entry = JSON.parse(formatLine('error', 'email', 'send failed', { err }))
    expect(entry.err).toMatchObject({ name: 'Error', message: 'connect ECONNREFUSED', code: 'ECONNREFUSED' })
    expect(entry.err.stack).toContain('connect ECONNREFUSED')
  })

  it('redacts email addresses anywhere — message, fields, error text', () => {
    const entry = JSON.parse(
      formatLine('error', 'email', 'bounce for ivan@example.com', {
        nested: { to: 'Client <client.name@abv.bg>' },
        err: new Error('Recipient rejected: someone@gmail.com'),
      }),
    )
    const text = JSON.stringify(entry)
    expect(text).not.toMatch(/@(example\.com|abv\.bg|gmail\.com)/)
    expect(entry.msg).toBe('bounce for <email>')
    expect(entry.nested.to).toBe('Client <<email>>')
  })
})

describe('serializeError / redact', () => {
  it('handles non-Error throwables', () => {
    expect(serializeError('boom')).toEqual({ name: 'NonError', message: 'boom' })
    expect(serializeError({ a: 1 })).toEqual({ name: 'NonError', message: '{"a":1}' })
  })

  it('leaves text without addresses alone', () => {
    expect(redact('SKU 71T3550 @ 3,15 €')).toBe('SKU 71T3550 @ 3,15 €')
  })
})

describe('log', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    delete process.env.LOG_LEVEL
  })

  it('sends warn/error to stderr, info to stdout, and respects LOG_LEVEL', () => {
    const out = vi.spyOn(console, 'log').mockImplementation(() => {})
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    log('info', 'a', 'hello')
    log('error', 'a', 'bad')
    log('debug', 'a', 'hidden')
    expect(out).toHaveBeenCalledTimes(1)
    expect(err).toHaveBeenCalledTimes(1)
    process.env.LOG_LEVEL = 'debug'
    log('debug', 'a', 'shown')
    expect(out).toHaveBeenCalledTimes(2)
  })
})

describe('throttled', () => {
  it('runs once per window per key', () => {
    const once = throttled(60_000)
    const write = vi.fn()
    once('redis', write)
    once('redis', write)
    once('other', write)
    expect(write).toHaveBeenCalledTimes(2)
  })
})
