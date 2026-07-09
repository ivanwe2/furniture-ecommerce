export const BGN_PER_EUR = 1.95583

const eurFmt = new Intl.NumberFormat('bg-BG', {
  style: 'currency', currency: 'EUR', minimumFractionDigits: 2,
})

const numFmt = new Intl.NumberFormat('bg-BG', {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
})

export function formatEur(cents: number): string {
  assertCents(cents)
  return eurFmt.format(cents / 100)
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
  return `${numFmt.format(bgnCents / 100)} лв.`
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
