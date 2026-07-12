export const BGN_PER_EUR = 1.95583

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

/** EUR cents → BGN cents, HALF-UP at the cent. Integer in, integer out. */
export function bgnCentsFromEurCents(eurCents: number): number {
  assertCents(eurCents)
  const num = eurCents * 195583
  const q = Math.floor(num / 100000)
  const rem = num % 100000
  return rem * 2 >= 100000 ? q + 1 : q
}

/** BGN cents → EUR cents, HALF-UP at the cent. Integer in, integer out. */
export function eurCentsFromBgnCents(bgnCents: number): number {
  assertCents(bgnCents)
  // bgnCents / 1.95583 = bgnCents * 100000 / 195583
  const num = bgnCents * 100000
  const q = Math.floor(num / 195583)
  const rem = num % 195583
  return rem * 2 >= 195583 ? q + 1 : q
}

export function formatBgn(bgnCents: number): string {
  assertCents(bgnCents)
  return `${formatAmount(bgnCents)} лв.`
}

export function showBgn(): boolean {
  return process.env.NEXT_PUBLIC_SHOW_BGN === 'true'
}

export function formatPrice(eurCents: number): string {
  return showBgn()
    ? `${formatEur(eurCents)} (${formatBgn(bgnCentsFromEurCents(eurCents))})`
    : formatEur(eurCents)
}

function assertCents(v: number): void {
  if (!Number.isInteger(v) || v < 0) throw new Error(`Invalid cents value: ${v}`)
}
