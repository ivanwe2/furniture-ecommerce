import { describe, expect, it } from 'vitest'
import { isPublicAddress } from '@/lib/import/public-address'

describe('isPublicAddress', () => {
  it('allows ordinary public IPv4 and IPv6', () => {
    for (const ip of ['1.1.1.1', '8.8.8.8', '104.16.0.1', '151.101.1.1', '2606:4700::1111', '2a00:1450:4001::200e']) {
      expect(isPublicAddress(ip), ip).toBe(true)
    }
  })

  it('blocks everything reachable inside the compose network or the LAN', () => {
    for (const ip of [
      '127.0.0.1',
      '127.8.9.10',
      '10.0.0.5',
      '172.16.0.1',
      '172.18.0.3', // a typical compose bridge address (db/redis/mail)
      '172.31.255.255',
      '192.168.1.10',
      '169.254.169.254', // cloud metadata
      '100.64.0.1',
      '0.0.0.0',
      '255.255.255.255',
      '224.0.0.1',
      '198.18.0.1',
      '192.0.2.1',
    ]) {
      expect(isPublicAddress(ip), ip).toBe(false)
    }
  })

  it('blocks private IPv6 ranges', () => {
    for (const ip of ['::1', '::', 'fe80::1', 'fd12:3456::1', 'fc00::1', 'ff02::1', '2001:db8::1', '2002:7f00:1::1']) {
      expect(isPublicAddress(ip), ip).toBe(false)
    }
  })

  it('sees through IPv4 embedded in IPv6', () => {
    expect(isPublicAddress('::ffff:127.0.0.1')).toBe(false)
    expect(isPublicAddress('::ffff:7f00:1')).toBe(false)
    expect(isPublicAddress('::ffff:c0a8:10a')).toBe(false) // 192.168.1.10
    expect(isPublicAddress('64:ff9b::10.0.0.1')).toBe(false)
    expect(isPublicAddress('::ffff:8.8.8.8')).toBe(true)
  })

  it('accepts bracketed IPv6 as written in URLs', () => {
    expect(isPublicAddress('[::1]')).toBe(false)
    expect(isPublicAddress('[2606:4700::1111]')).toBe(true)
  })

  it('never treats a hostname as an address', () => {
    for (const host of ['localhost', 'db', 'example.com', '', '1.2.3', '0x7f.1']) {
      expect(isPublicAddress(host), host).toBe(false)
    }
  })
})
