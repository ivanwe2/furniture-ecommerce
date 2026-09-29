/**
 * SSRF guard for the product importer's image downloads (SECURITY.md §2).
 *
 * The importer fetches image_url values from an uploaded file on the server,
 * inside the compose network — where `db:5432`, `redis:6379`, `mail:25`, the
 * app itself and the sysadmin's LAN are all one hop away. Only globally
 * routable unicast addresses may be contacted; everything reserved, private,
 * loopback, link-local, CGNAT, multicast or documentation-only is refused,
 * for IPv4, IPv6, and IPv4 embedded in IPv6.
 */
import { BlockList, isIP } from 'node:net'

const blocked = new BlockList()

for (const [network, prefix] of [
  ['0.0.0.0', 8], // "this network"
  ['10.0.0.0', 8], // private
  ['100.64.0.0', 10], // carrier-grade NAT
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local (incl. cloud metadata 169.254.169.254)
  ['172.16.0.0', 12], // private (Docker's default bridge ranges live here)
  ['192.0.0.0', 24], // IETF protocol assignments
  ['192.0.2.0', 24], // TEST-NET-1
  ['192.88.99.0', 24], // 6to4 relay anycast (deprecated)
  ['192.168.0.0', 16], // private
  ['198.18.0.0', 15], // benchmarking
  ['198.51.100.0', 24], // TEST-NET-2
  ['203.0.113.0', 24], // TEST-NET-3
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved + broadcast
] as const) {
  blocked.addSubnet(network, prefix, 'ipv4')
}

for (const [network, prefix] of [
  ['::', 128], // unspecified
  ['::1', 128], // loopback
  ['64:ff9b:1::', 48], // local-use NAT64
  ['100::', 64], // discard-only
  ['2001::', 23], // IETF protocol assignments (incl. Teredo 2001::/32)
  ['2001:db8::', 32], // documentation
  ['2002::', 16], // 6to4 — embeds an arbitrary IPv4
  ['fc00::', 7], // unique local
  ['fe80::', 10], // link-local
  ['fec0::', 10], // site-local (deprecated)
  ['ff00::', 8], // multicast
] as const) {
  blocked.addSubnet(network, prefix, 'ipv6')
}

/** The IPv4 inside ::ffff:a.b.c.d / ::a.b.c.d / 64:ff9b::a.b.c.d, if any. */
function embeddedIPv4(address: string): string | null {
  const lower = address.toLowerCase()
  const dotted = /^(?:::ffff:|::|64:ff9b::)(\d{1,3}(?:\.\d{1,3}){3})$/.exec(lower)
  if (dotted?.[1]) return dotted[1]
  // The same prefixes written in hex: ::ffff:7f00:1 → 127.0.0.1
  const hex = /^(?:::ffff:|64:ff9b::)([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(lower)
  if (hex?.[1] && hex[2]) {
    const high = parseInt(hex[1], 16)
    const low = parseInt(hex[2], 16)
    return `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`
  }
  return null
}

/** True only for a globally routable unicast IP literal. Hostnames are false. */
export function isPublicAddress(address: string): boolean {
  const bare = address.startsWith('[') && address.endsWith(']') ? address.slice(1, -1) : address
  const version = isIP(bare)
  if (version === 4) return !blocked.check(bare, 'ipv4')
  if (version === 6) {
    const v4 = embeddedIPv4(bare)
    if (v4 !== null) return isIP(v4) === 4 && !blocked.check(v4, 'ipv4')
    return !blocked.check(bare, 'ipv6')
  }
  return false
}
