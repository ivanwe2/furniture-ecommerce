// No `import 'server-only'`: reachable from payload.config.ts via the import
// endpoints (see run.ts for why that matters).
import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { MediaStorage } from '@/lib/import/api'

/**
 * Can the app write into the media folder right now?
 *
 * Payload reports a failed upload write as a generic „Имаше проблем при
 * качването на файла." and keeps the real cause (EACCES, ENOSPC, EROFS…) in the
 * server log only. That hid a production outage: the media volume was not
 * writable by the app's non-root user, so every image save failed while the
 * admin said "not an image". This probe writes and removes an empty file, so
 * the importer can name the actual problem — and where — before it downloads
 * anything.
 */
export async function checkMediaStorage(staticDir: string): Promise<MediaStorage> {
  const dir = path.resolve(staticDir)
  const probe = path.join(dir, `.import-write-check-${randomUUID()}`)
  try {
    await mkdir(dir, { recursive: true })
    await writeFile(probe, '')
    await unlink(probe)
    return { ok: true }
  } catch (err) {
    const code =
      typeof err === 'object' && err !== null && 'code' in err && typeof err.code === 'string' ? err.code : 'UNKNOWN'
    console.error('[import] media folder is not writable', dir, code)
    return { ok: false, code, dir }
  }
}
