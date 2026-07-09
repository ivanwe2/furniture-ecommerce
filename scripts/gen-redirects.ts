import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const csvPath = resolve(__dirname, '..', 'data', 'redirects.csv')
const outputPath = resolve(__dirname, '..', 'src', 'lib', 'redirects.ts')

const raw = readFileSync(csvPath, 'utf-8')
const lines = raw.split('\n').filter((l) => l.trim() && !l.startsWith('#'))

if (lines.length < 2) {
  console.error('redirects.csv must have a header + at least one data row')
  process.exit(1)
}

const firstLine = lines[0]
if (!firstLine) {
  console.error('redirects.csv is empty')
  process.exit(1)
}
const header = firstLine.trim().split(',').map((h) => h.trim())
const oldColIdx = header.indexOf('old_path_or_query')
const newColIdx = header.indexOf('new_path')

if (oldColIdx < 0 || newColIdx < 0) {
  console.error('redirects.csv must have columns: old_path_or_query, new_path')
  process.exit(1)
}

const products: Record<string, string> = {}
const categories: Record<string, string> = {}
const exactPaths: Record<string, string> = {}

for (let i = 1; i < lines.length; i++) {
  const line = lines[i]
  if (!line) continue
  const parts = line.split(',')
  if (parts.length < 2) continue

  const oldPathPart = parts[oldColIdx]
  const newPathRaw = parts[newColIdx]
  if (!oldPathPart || !newPathRaw) continue

  const oldPath = oldPathPart.trim()
  let newPath = newPathRaw.trim()
  if (!newPath.startsWith('/')) newPath = `/${newPath}`

  // Parse PrestaShop-style query params
  if (oldPath.includes('id_product=')) {
    const match = oldPath.match(/id_product=(\d+)/)
    if (match && match[1]) products[match[1]] = newPath
  } else if (oldPath.includes('id_category=')) {
    const match = oldPath.match(/id_category=(\d+)/)
    if (match && match[1]) categories[match[1]] = newPath
  } else {
    exactPaths[oldPath] = newPath
  }
}

const code = `'use strict'

/**
 * Auto-generated from data/redirects.csv by scripts/gen-redirects.ts.
 * Do not edit manually — re-run pnpm gen:redirects after CSV changes.
 */

export const REDIRECTS = {
  products: ${JSON.stringify(products, null, 2)} as Record<string, string>,
  categories: ${JSON.stringify(categories, null, 2)} as Record<string, string>,
  exactPaths: ${JSON.stringify(exactPaths, null, 2)} as Record<string, string>,
}
`

writeFileSync(outputPath, code, 'utf-8')
console.log(`Generated ${outputPath} with ${Object.keys(products).length} product, ${Object.keys(categories).length} category, and ${Object.keys(exactPaths).length} exact-path redirects`)
