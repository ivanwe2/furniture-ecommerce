import { describe, it, expect } from 'vitest'
import { jsonLdScript } from './json-ld'

const BS = String.fromCharCode(92) // backslash, without a literal one in source

describe('jsonLdScript', () => {
  it('escapes </script> so it cannot break out of the element', () => {
    const out = jsonLdScript({ name: 'Angle </script><script>alert(1)</script>' })
    expect(out).not.toContain('</script>')
    expect(out).not.toContain('<script>')
    expect(out).toContain(BS + 'u003c') // < escaped
    expect(out).toContain(BS + 'u003e') // > escaped
  })

  it('escapes ampersand', () => {
    expect(jsonLdScript({ a: 'x & y' })).toContain(BS + 'u0026')
  })

  it('stays valid JSON (round-trips) after escaping', () => {
    const value = { name: 'Дръжка <b>&</b>', n: 42 }
    expect(JSON.parse(jsonLdScript(value))).toEqual(value)
  })
})
