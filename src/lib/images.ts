import type { Media } from '@/payload-types'

export type Preset = 'thumb' | 'card' | 'detail' | 'zoom' | 'og'

// Actual widths of the generated variants (Media.upload.imageSizes) — used for
// the `srcSet` width descriptors and explicit <img> sizing (CLS discipline,
// ARCHITECTURE §5). Keep in sync with src/collections/Media.ts.
const WIDTHS: Record<Preset, number> = {
  thumb: 240,
  card: 560,
  detail: 1024,
  zoom: 1920,
  og: 1200,
}

/** Media plus its optional sized variants — product images (depth 1) carry
 *  `sizes`; partial refs (e.g. category thumbnails) may not. */
type ImageInput = Pick<Media, 'filename'> & { sizes?: Media['sizes'] }

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

/** `https://host/api/media/file` — Payload's upload route, served from the media volume. */
function mediaBase(): string {
  const url = new URL(SITE_URL)
  return `${url.protocol}//${url.host}/api/media/file`
}

/**
 * Absolute URL to an uploaded media file, served by the app's own media route
 * (disk-backed via Payload). Returns the WebP sized variant for the preset when
 * present (Payload `upload.imageSizes` + sharp), falling back to the original.
 * Absolute (not relative) so the same helper works for OG tags and JSON-LD.
 */
export function imageUrl(media: ImageInput, preset: Preset): string {
  const variant = media.sizes?.[preset]?.filename
  const key = encodeURIComponent(variant || media.filename || '')
  return `${mediaBase()}/${key}`
}

export function imageSrcSet(media: ImageInput, presets: Preset[]): string {
  return presets.map((p) => `${imageUrl(media, p)} ${WIDTHS[p]}w`).join(', ')
}
