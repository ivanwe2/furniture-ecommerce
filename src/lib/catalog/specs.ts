/**
 * The product page's „Характеристики" table is built from layers, most general
 * first: automatic lines (brand), the product's own lines, the selected
 * variant's lines, automatic variant facts (colour, length, unit) and finally
 * the catalogue number. A later layer replaces an earlier line with the same
 * label (compared ignoring case and spacing) IN PLACE — position and first
 * spelling of the label are kept, only the value changes — so the owner's
 * ordering survives; a new label is appended. Lines with an empty value are dropped.
 */
export type SpecLine = { label: string; value: string }

const key = (label: string) => label.trim().replace(/\s+/g, ' ').toLocaleLowerCase('bg')

export function mergeSpecLayers(...layers: (SpecLine | null | undefined)[][]): SpecLine[] {
  const out: SpecLine[] = []
  for (const layer of layers) {
    for (const line of layer) {
      if (!line) continue
      const label = line.label.trim()
      const value = line.value.trim()
      if (!label || !value) continue
      const at = out.findIndex((existing) => key(existing.label) === key(label))
      // Keep the first spelling of the label; only the value changes.
      if (at >= 0) out[at] = { label: out[at]!.label, value }
      else out.push({ label, value })
    }
  }
  return out
}
