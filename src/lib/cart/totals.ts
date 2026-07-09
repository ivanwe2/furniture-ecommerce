import type { CartLine } from './store'

export type ResolvedLine = {
  productSlug: string
  sku: string
  qty: number
  name: string
  unit: string
  priceEurCents: number
}

export type StaleLine = {
  productSlug: string
  sku: string
  qty: number
}

export type TotalsInput = {
  lines: CartLine[]
  resolution: Map<string, ResolvedLine>
}

export function computeTotals(input: TotalsInput): {
  ok: ResolvedLine[]
  stale: StaleLine[]
  subtotalEurCents: number
} {
  const { lines, resolution } = input
  const ok: ResolvedLine[] = []
  const stale: StaleLine[] = []

  for (const line of lines) {
    const key = `${line.productSlug}:${line.sku}`
    const resolved = resolution.get(key)
    if (!resolved) {
      stale.push(line)
    }
    else {
      ok.push({
        ...resolved,
        qty: clampQty(line.qty),
      })
    }
  }

  const subtotalEurCents = ok.reduce((sum, l) => sum + l.priceEurCents * l.qty, 0)

  return { ok, stale, subtotalEurCents }
}

export function filterStale(lines: CartLine[], resolution: Map<string, ResolvedLine>): StaleLine[] {
  const stale: StaleLine[] = []
  for (const line of lines) {
    const key = `${line.productSlug}:${line.sku}`
    if (!resolution.get(key)) {
      stale.push(line)
    }
  }
  return stale
}

function clampQty(q: number): number {
  return Math.min(999, Math.max(1, Math.trunc(q) || 1))
}
