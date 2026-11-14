/**
 * Money helpers. Everything is integer euro cents (CLAUDE rule 4). Prices are
 * shown in euro only: the dual EUR/BGN display ended with Bulgaria's mandatory
 * period (2026-08-08) and was retired on 2026-11-14 (Ivan) — no lev code left.
 */
/**
 * Format non-negative integer cents in the Bulgarian style: comma decimal
 * separator, space thousands separator, always two decimals. Deliberately
 * implemented WITHOUT Intl.NumberFormat so the output is byte-identical on the
 * server (Cloudflare Workers) and in the browser - the two runtimes ship
 * different ICU/locale data, and that mismatch caused React hydration errors
 * (#418) on every price.
 */
function formatAmount(cents: number): string {
  const whole = Math.floor(cents / 100)
  const frac = cents % 100
  const wholeStr = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${wholeStr},${String(frac).padStart(2, '0')}`
}

export function formatEur(cents: number): string {
  assertCents(cents)
  return `${formatAmount(cents)} €`
}

/**
 * A decimal euro amount as it appears in an import file (3.15, "17.49",
 * "3,15") → integer cents. Parsed from the decimal STRING, never by float
 * multiplication: 17.49 * 100 is 1748.9999999999998 in JS, and 1.005 * 100 is
 * 100.49999999999999, so Math.round over floats is not half-up.
 *
 * More than two decimals are rounded HALF-UP at the cent and flagged via
 * `rounded`, so an importer can show the owner exactly which prices it
 * changed. Returns null for anything that is not a plain non-negative decimal
 * (negative, exponent notation, NaN/Infinity, stray characters), or above
 * 9 999 999,99 €.
 */
export function eurCentsFromDecimal(
  value: number | string,
): { cents: number; rounded: boolean } | null {
  let text: string
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null
    // String() of a JSON number is its shortest round-trip form: 17.49 → "17.49".
    text = String(value)
  } else {
    // A Bulgarian decimal comma is accepted in text values ("3,15").
    text = value.trim().replace(',', '.')
  }
  const match = /^(\d{1,7})(?:\.(\d+))?$/.exec(text)
  if (!match) return null
  const whole = Number(match[1])
  const fraction = match[2] ?? ''
  const cents = whole * 100 + Number(fraction.slice(0, 2).padEnd(2, '0'))
  const rest = fraction.slice(2)
  const roundUp = rest !== '' && rest.charCodeAt(0) >= 53 // first dropped digit ≥ '5'
  return { cents: roundUp ? cents + 1 : cents, rounded: /[1-9]/.test(rest) }
}

/** Bulgarian standard VAT rate, percent. Catalogue prices include it. */
export const VAT_PERCENT = 20

/**
 * VAT-inclusive cents → the same price without VAT, HALF-UP at the cent:
 * 505 (5,05 € с ДДС) → 421 (4,21 € без ДДС). Integer maths only. Display-only —
 * orders and totals always use the stored VAT-inclusive price.
 */
export function netEurCents(grossCents: number, vatPercent: number = VAT_PERCENT): number {
  assertCents(grossCents)
  const num = grossCents * 100
  const den = 100 + vatPercent
  const q = Math.floor(num / den)
  return (num % den) * 2 >= den ? q + 1 : q
}

/**
 * Machine-readable euro amount for structured data (schema.org `price`):
 * integer cents → "12.34", dot decimal, no grouping, no symbol. Integer maths
 * only — never `(cents / 100).toFixed(2)` (CLAUDE rule 4).
 */
export function eurDecimalString(cents: number): string {
  assertCents(cents)
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`
}

function assertCents(v: number): void {
  if (!Number.isInteger(v) || v < 0) throw new Error(`Invalid cents value: ${v}`)
}
