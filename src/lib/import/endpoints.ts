// No `import 'server-only'`: this module is reachable from payload.config.ts
// (Products → import endpoints), which the Payload CLI loads outside Next —
// `payload migrate` on container start would throw (same reason as
// revalidate.ts; PROGRESS Notes). It is still server-only in practice: no
// client component imports it.
import type { Endpoint, PayloadRequest } from 'payload'
import { IMAGE_FAILURES, type ApplyRequest, type ImageFailure } from '@/lib/import/api'
import { MAX_FILE_BYTES, type Issue } from '@/lib/import/contract'
import { MAX_IMAGE_BYTES } from '@/lib/import/fetch-image'
import { applyImportRecord, attachUploadedImage, previewImport } from '@/lib/import/run'

/**
 * POST /api/products/import/{preview,apply,image/:id} — the admin product
 * importer (DATA-MODEL §9, SECURITY.md §2).
 *
 * Why REST endpoints and not server actions (CONVENTIONS §3's mutation
 * pattern): the manual image upload is up to ~15 MB and server actions are
 * capped at 1 MB (raising that cap would also raise it for checkout/contact);
 * /api sits outside the middleware and the site lock; and Payload
 * authenticates the admin session here for free.
 *
 * Each request is admin-only, same-origin, of an exact content type and
 * size-capped BEFORE its body is read. With the session cookie's SameSite=Lax,
 * the JSON/octet-stream content types (which a cross-site form cannot send
 * without a CORS preflight, and no CORS is configured) and the Origin check,
 * a cross-site request cannot drive an import.
 */

const fail = (error: Issue, status: number) => Response.json({ ok: false, error }, { status })

function sameOrigin(req: PayloadRequest): boolean {
  const origin = req.headers.get('origin')
  if (!origin) return false
  let host: string
  try {
    host = new URL(origin).host
  } catch {
    return false
  }
  let siteHost: string | null = null
  try {
    siteHost = process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL).host : null
  } catch {
    siteHost = null
  }
  // The proxy forwards Host (DEPLOY §6); the site URL covers a proxy that
  // doesn't, and the LAN/dev case is covered by Host itself.
  return [req.headers.get('x-forwarded-host'), req.headers.get('host'), siteHost].includes(host)
}

/** Everything that must hold before a body is read — or the response to send instead. */
function guard(req: PayloadRequest, contentType: string, maxBytes: number): Response | null {
  if (!req.user || req.user.collection !== 'users') return fail({ key: 'unauthorized' }, 401)
  if (!sameOrigin(req)) return fail({ key: 'generic' }, 403)
  const type = (req.headers.get('content-type') ?? '').split(';')[0]?.trim().toLowerCase()
  if (type !== contentType) return fail({ key: 'generic' }, 415)
  const length = Number(req.headers.get('content-length'))
  if (!Number.isFinite(length) || length <= 0) return fail({ key: 'generic' }, 411)
  if (length > maxBytes) {
    return fail({ key: 'fileTooLarge', params: { max: String(Math.round(maxBytes / (1024 * 1024))) } }, 413)
  }
  return null
}

async function readJson(req: PayloadRequest): Promise<{ ok: true; body: unknown } | { ok: false }> {
  const text = req.text ? await req.text() : null
  if (text === null) return { ok: false }
  try {
    return { ok: true, body: JSON.parse(text) }
  } catch {
    return { ok: false }
  }
}

function isRecordObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function handle(area: string, run: () => Promise<Response>): Promise<Response> {
  try {
    return await run()
  } catch (err) {
    console.error(`[import] ${area} failed`, err instanceof Error ? err.message : err)
    return fail({ key: 'generic' }, 500)
  }
}

const preview: Endpoint = {
  path: '/import/preview',
  method: 'post',
  handler: (req) =>
    handle('preview', async () => {
      const blocked = guard(req, 'application/json', MAX_FILE_BYTES)
      if (blocked) return blocked
      const parsed = await readJson(req)
      if (!parsed.ok || !isRecordObject(parsed.body)) return fail({ key: 'fileNotJson' }, 400)
      return Response.json(await previewImport(req.payload, parsed.body.records))
    }),
}

const apply: Endpoint = {
  path: '/import/apply',
  method: 'post',
  handler: (req) =>
    handle('apply', async () => {
      // One record plus its description: far below the whole-file cap.
      const blocked = guard(req, 'application/json', 256 * 1024)
      if (blocked) return blocked
      const parsed = await readJson(req)
      if (!parsed.ok || !isRecordObject(parsed.body)) return fail({ key: 'generic' }, 400)
      const { record, reuseMediaId, previousFailure } = parsed.body
      const request: ApplyRequest = { record }
      if (typeof reuseMediaId === 'number' && Number.isSafeInteger(reuseMediaId) && reuseMediaId > 0) {
        request.reuseMediaId = reuseMediaId
      }
      const failure = IMAGE_FAILURES.find((f): f is ImageFailure => f === previousFailure)
      if (failure) request.previousFailure = failure
      return Response.json(await applyImportRecord(req.payload, request))
    }),
}

const image: Endpoint = {
  path: '/import/image/:id',
  method: 'post',
  handler: (req) =>
    handle('image', async () => {
      const blocked = guard(req, 'application/octet-stream', MAX_IMAGE_BYTES)
      if (blocked) return blocked
      const id = Number(req.routeParams?.id)
      if (!Number.isSafeInteger(id) || id <= 0) return fail({ key: 'generic' }, 400)
      const body = req.arrayBuffer ? await req.arrayBuffer() : null
      if (!body || body.byteLength === 0) return fail({ key: 'generic' }, 400)
      return Response.json(await attachUploadedImage(req.payload, id, Buffer.from(body)))
    }),
}

export const importEndpoints: Endpoint[] = [preview, apply, image]
