import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { checkMediaStorage } from '@/lib/import/media-storage'

const root = mkdtempSync(path.join(tmpdir(), 'nasteh-media-check-'))
afterAll(() => rmSync(root, { recursive: true, force: true }))

describe('checkMediaStorage', () => {
  it('reports a writable folder as ok and leaves nothing behind', async () => {
    const dir = path.join(root, 'media')
    expect(await checkMediaStorage(dir)).toEqual({ ok: true })
    expect(readdirSync(dir)).toEqual([])
  })

  it('names the OS error and the folder when it cannot write', async () => {
    // A path "inside" a regular file fails with ENOTDIR for any user,
    // including root — unlike a chmod-based setup, this holds in CI too.
    const file = path.join(root, 'not-a-folder')
    writeFileSync(file, '')
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = await checkMediaStorage(path.join(file, 'media'))
    spy.mockRestore()
    expect(result).toEqual({ ok: false, code: 'ENOTDIR', dir: path.join(file, 'media') })
  })
})
