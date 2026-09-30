/**
 * Request/response shapes of the product-import endpoints
 * (POST /api/products/import/*), shared by the server (run.ts) and the admin
 * screen. Pure — safe to import from client components.
 */
import type { Issue } from '@/lib/import/contract'

export const IMAGE_FAILURES = [
  'blocked',
  'notFound',
  'notImage',
  'unsupported',
  'tooLarge',
  'timeout',
  'network',
  'forbiddenHost',
  'httpError',
  // Downloaded fine, but the server could not save it (media folder not
  // writable, disk full…) — see MediaStorage.
  'storeFailed',
] as const
export type ImageFailure = (typeof IMAGE_FAILURES)[number]

export type CategoryStep = { name: string; exists: boolean }

/** Whether the server can write into the media folder (checked on preview). */
export type MediaStorage = { ok: true } | { ok: false; code: string; dir: string }

export type RowChanges = {
  price?: { from: number; to: number }
  stock?: { from: number; to: number }
  image?: true
}

type RowBase = { index: number; warnings: Issue[] }

export type PreviewRow =
  | (RowBase & { status: 'error'; sku: string | null; name: string | null; errors: Issue[] })
  | (RowBase & {
      status: 'create'
      sku: string
      name: string
      categoryPath: CategoryStep[]
      brand: { name: string; exists: boolean } | null
      priceEurCents: number
      stockQty: number
      imageUrl: string | null
    })
  | (RowBase & {
      status: 'update' | 'unchanged'
      sku: string
      name: string
      productId: number
      productName: string
      changes: RowChanges
      imageUrl: string | null
    })

export type PreviewResponse =
  | {
      ok: true
      rows: PreviewRow[]
      unknownKeys: string[]
      newCategories: number
      newBrands: number
      mediaStorage: MediaStorage
    }
  | { ok: false; error: Issue }

export type ApplyRequest = {
  /** The raw record from the file — re-validated on the server. */
  record: unknown
  /** Attach this already-imported media instead of downloading (same image_url earlier in the run). */
  reuseMediaId?: number
  /** This image_url already failed earlier in the run, for this reason; don't try it again. */
  previousFailure?: ImageFailure
}

export type ImageOutcome =
  | { kind: 'none' }
  | { kind: 'kept' }
  | { kind: 'attached'; mediaId: number }
  | { kind: 'failed'; reason: ImageFailure }

export type ApplyResponse =
  | { ok: true; status: 'created' | 'updated' | 'unchanged'; productId: number; image: ImageOutcome }
  | { ok: false; error: Issue }

export type ImageUploadResponse =
  | { ok: true; mediaId: number }
  | { ok: false; error: Issue }
  | { ok: false; reason: ImageFailure }
