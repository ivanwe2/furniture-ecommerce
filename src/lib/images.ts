import type { Media } from '@/payload-types'

export type Preset = 'thumb' | 'card' | 'detail' | 'zoom' | 'og'

// Nominal widths per preset — kept for the `srcSet` width descriptors and for
// explicit width/height on <img> (CLS discipline, ARCHITECTURE §5).
const WIDTHS: Record<Preset, number> = {
  thumb: 160,
  card: 480,
  detail: 1024,
  zoom: 1920,
  og: 1200,
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

/** `https://host/api/media/file` — Payload's upload route, served from the media volume. */
function mediaBase(): string {
  const url = new URL(SITE_URL)
  return `${url.protocol}//${url.host}/api/media/file`
}

/**
 * Absolute URL to an uploaded media file, served by the app's own media route
 * (disk-backed via Payload). Absolute (not relative) so the same helper works
 * for OG tags and JSON-LD, which need full URLs.
 *
 * NOTE: this returns the uploaded original for every preset. Responsive sized
 * variants (Payload `upload.imageSizes` + sharp — which runs on Node now) are a
 * redesign-time optimization; see ARCHITECTURE §5.
 */
export function imageUrl(media: Pick<Media, 'filename'>, _preset: Preset): string {
  const key = encodeURIComponent(media.filename ?? '')
  return `${mediaBase()}/${key}`
}

export function imageSrcSet(media: Pick<Media, 'filename'>, presets: Preset[]): string {
  return presets.map((p) => `${imageUrl(media, p)} ${WIDTHS[p]}w`).join(', ')
}
