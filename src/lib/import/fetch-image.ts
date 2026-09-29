// No `import 'server-only'`: this module is reachable from payload.config.ts
// (Products → import endpoints), which the Payload CLI loads outside Next —
// `payload migrate` on container start would throw (same reason as
// revalidate.ts; PROGRESS Notes). It is still server-only in practice: no
// client component imports it.
import { lookup as dnsLookup } from 'node:dns'
import { request as httpRequest, type IncomingMessage } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { isIP, type LookupFunction } from 'node:net'
import sharp from 'sharp'
import type { ImageFailure } from '@/lib/import/api'
import { isPublicAddress } from '@/lib/import/public-address'

/**
 * Server-side download of an import file's image_url (SECURITY.md §2 — the
 * importer's only outbound request). Every guard here exists because the URL
 * comes from an uploaded file:
 * - DNS is resolved by `guardedLookup` and the connection is made to the
 *   address that passed the check (no DNS-rebinding window). A hostname that
 *   resolves to ANY non-public address is refused, as are IP literals.
 * - http/https on the default ports only; at most MAX_REDIRECTS hops, each
 *   re-validated.
 * - An overall deadline and a byte cap, enforced while streaming.
 * - The bytes are decoded by sharp before anything is stored: HTML error
 *   pages, SVG and decompression bombs never reach the media volume.
 *
 * It does not — and must not — try to get past bot protection (Cloudflare
 * challenges etc.). Those downloads fail as `blocked`, and the admin screen
 * offers a manual upload for that row instead.
 */

export type StoredImage = {
  data: Buffer
  mimetype: 'image/jpeg' | 'image/png' | 'image/webp'
  ext: 'jpg' | 'png' | 'webp'
}

export type ImageResult = { ok: true; image: StoredImage } | { ok: false; reason: ImageFailure }

/** Same order of magnitude as the admin's own upload cap (~10 MB, DEPLOY §6). */
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024
const MAX_PIXELS = 50_000_000
const TIMEOUT_MS = 20_000
const MAX_REDIRECTS = 4

const HEADERS = {
  // Identifies the importer honestly. The "Mozilla/5.0 (compatible; …)" form
  // is the usual crawler convention and gets past naive UA filters; a
  // browser-impersonating string made no difference on the sample hosts.
  'User-Agent': 'Mozilla/5.0 (compatible; NastehImporter/1.0; +https://nasteh.bg)',
  // No AVIF: Media accepts jpeg/png/webp, and content-negotiating CDNs serve
  // AVIF to anyone who asks for it.
  Accept: 'image/webp,image/png,image/jpeg,image/*;q=0.8,*/*;q=0.5',
  'Accept-Encoding': 'identity',
}

class ForbiddenHostError extends Error {
  constructor() {
    super('Refusing to connect to a non-public address')
  }
}

const guardedLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) {
      callback(err, '', 4)
      return
    }
    if (addresses.length === 0 || !addresses.every((a) => isPublicAddress(a.address))) {
      callback(new ForbiddenHostError(), '', 4)
      return
    }
    if (options.all) {
      callback(null, addresses)
      return
    }
    const [first] = addresses
    if (!first) {
      callback(new ForbiddenHostError(), '', 4)
      return
    }
    callback(null, first.address, first.family)
  })
}

/** Protocol, credentials, port and (for IP literals) address checks — before connecting. */
function checkUrl(url: URL): ImageFailure | null {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return 'forbiddenHost'
  if (url.username || url.password) return 'forbiddenHost'
  if (url.port !== '' && url.port !== '80' && url.port !== '443') return 'forbiddenHost'
  // Node skips the lookup hook for IP literals, so they are checked here.
  const host = url.hostname.startsWith('[') ? url.hostname.slice(1, -1) : url.hostname
  if (isIP(host) !== 0 && !isPublicAddress(host)) return 'forbiddenHost'
  return null
}

function failureForStatus(res: IncomingMessage): ImageFailure {
  const status = res.statusCode ?? 0
  if (res.headers['cf-mitigated'] || status === 401 || status === 403 || status === 429) return 'blocked'
  if (status === 404 || status === 410) return 'notFound'
  return 'httpError'
}

function failureForError(err: unknown): ImageFailure {
  if (err instanceof ForbiddenHostError) return 'forbiddenHost'
  if (err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError')) return 'timeout'
  if (err instanceof Error && 'code' in err && err.code === 'ETIMEDOUT') return 'timeout'
  return 'network'
}

type Fetched = { ok: true; data: Buffer } | { ok: false; reason: ImageFailure }

function fetchOnce(url: URL, signal: AbortSignal): Promise<Fetched | { redirect: URL }> {
  return new Promise((resolve) => {
    const request = url.protocol === 'https:' ? httpsRequest : httpRequest
    const req = request(url, { method: 'GET', headers: HEADERS, lookup: guardedLookup, agent: false, signal }, (res) => {
      const status = res.statusCode ?? 0
      if (status >= 300 && status < 400 && res.headers.location) {
        res.resume()
        try {
          resolve({ redirect: new URL(res.headers.location, url) })
        } catch {
          resolve({ ok: false, reason: 'httpError' })
        }
        return
      }
      if (status !== 200) {
        res.resume()
        resolve({ ok: false, reason: failureForStatus(res) })
        return
      }
      const declared = Number(res.headers['content-length'] ?? 0)
      if (declared > MAX_IMAGE_BYTES) {
        res.destroy()
        resolve({ ok: false, reason: 'tooLarge' })
        return
      }
      const chunks: Buffer[] = []
      let size = 0
      res.on('data', (chunk: Buffer) => {
        size += chunk.length
        if (size > MAX_IMAGE_BYTES) {
          res.destroy()
          resolve({ ok: false, reason: 'tooLarge' })
          return
        }
        chunks.push(chunk)
      })
      res.on('end', () => resolve({ ok: true, data: Buffer.concat(chunks) }))
      res.on('error', (err) => resolve({ ok: false, reason: failureForError(err) }))
      // A stream torn down without 'end' or 'error' must still settle (a
      // no-op after either of those has resolved the promise).
      res.on('close', () => resolve({ ok: false, reason: signal.aborted ? 'timeout' : 'network' }))
    })
    req.on('error', (err) => resolve({ ok: false, reason: failureForError(err) }))
    req.end()
  })
}

/**
 * Decode untrusted bytes and hand back something the Media collection accepts
 * (jpeg/png/webp). Other raster formats (AVIF, GIF, TIFF) are re-encoded as
 * WebP; SVG and non-images are refused. Shared with the manual-upload path.
 */
export async function toStoredImage(data: Buffer): Promise<ImageResult> {
  const meta = await sharp(data)
    .metadata()
    .catch(() => null)
  if (!meta) return { ok: false, reason: 'notImage' }
  const { width = 0, height = 0 } = meta
  if (width < 1 || height < 1) return { ok: false, reason: 'notImage' }
  if (width * height > MAX_PIXELS) return { ok: false, reason: 'tooLarge' }

  switch (meta.format) {
    case 'jpeg':
      return { ok: true, image: { data, mimetype: 'image/jpeg', ext: 'jpg' } }
    case 'png':
      return { ok: true, image: { data, mimetype: 'image/png', ext: 'png' } }
    case 'webp':
      return { ok: true, image: { data, mimetype: 'image/webp', ext: 'webp' } }
    case 'heif':
    case 'gif':
    case 'tiff':
      try {
        const webp = await sharp(data, { limitInputPixels: MAX_PIXELS }).rotate().webp({ quality: 88 }).toBuffer()
        return { ok: true, image: { data: webp, mimetype: 'image/webp', ext: 'webp' } }
      } catch {
        return { ok: false, reason: 'notImage' }
      }
    default:
      return { ok: false, reason: 'unsupported' }
  }
}

export async function downloadImage(rawUrl: string): Promise<ImageResult> {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return { ok: false, reason: 'httpError' }
  }
  const signal = AbortSignal.timeout(TIMEOUT_MS)

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const refused = checkUrl(url)
    if (refused) return { ok: false, reason: refused }
    const result = await fetchOnce(url, signal)
    if ('redirect' in result) {
      url = result.redirect
      continue
    }
    if (!result.ok) return result
    return toStoredImage(result.data)
  }
  return { ok: false, reason: 'httpError' }
}
