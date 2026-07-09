import type { Media } from '@/payload-types'

export type Preset = 'thumb' | 'card' | 'detail' | 'zoom' | 'og'

const PRESETS: Record<Preset, string> = {
  thumb: 'width=160,format=auto,quality=80,fit=scale-down',
  card: 'width=480,format=auto,quality=82,fit=scale-down',
  detail: 'width=1024,format=auto,quality=85,fit=scale-down',
  zoom: 'width=1920,format=auto,quality=85,fit=scale-down',
  og: 'width=1200,height=630,format=jpeg,quality=85,fit=cover',
}

const WIDTHS: Record<Preset, number> = {
  thumb: 160,
  card: 480,
  detail: 1024,
  zoom: 1920,
  og: 1200,
}

const HOST = process.env.NEXT_PUBLIC_MEDIA_HOST

function devMediaBase(): string {
  const url = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000')
  return `${url.protocol}//${url.host}/api/media/file`
}

export function imageUrl(media: Pick<Media, 'filename'>, preset: Preset): string {
  const key = encodeURIComponent(media.filename ?? '')
  if (process.env.NODE_ENV === 'development' || !HOST) {
    return `${devMediaBase()}/${key}`
  }
  return `https://${HOST}/cdn-cgi/image/${PRESETS[preset]}/${key}`
}

export function imageSrcSet(media: Pick<Media, 'filename'>, presets: Preset[]): string {
  return presets.map((p) => `${imageUrl(media, p)} ${WIDTHS[p]}w`).join(', ')
}
