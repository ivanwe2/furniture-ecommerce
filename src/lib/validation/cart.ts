import { z } from 'zod'

/**
 * The submitted cart, as a JSON string in the checkout form field.
 *
 * This is attacker-controlled: it comes from localStorage, not from a field the
 * form renders, so it must be parsed with the same suspicion as any other input.
 * Before this schema existed, `JSON.parse` output was used directly and
 * `"null"` / `"123"` / `{"length":1}` each crashed the order action.
 *
 * Bounds matter as much as shapes here: `resolveCartLines` runs one DB lookup
 * per line, so an unbounded array turns a single request into thousands of
 * queries.
 */

/** A real order has a handful of lines; 50 is generous and caps the DB work. */
const MAX_LINES = 50
/** Matches the per-line clamp in `computeTotals`. */
const MAX_QTY = 999
/** Slugs/SKUs are short identifiers — anything longer is not a real one. */
const MAX_ID = 200

export const cartLineSchema = z.object({
  productSlug: z.string().trim().min(1).max(MAX_ID),
  sku: z.string().trim().min(1).max(MAX_ID),
  // Coerced because the value round-trips through JSON and older carts in a
  // returning customer's localStorage may hold a numeric string.
  qty: z.coerce.number().int().min(1).max(MAX_QTY),
})

export const cartLinesSchema = z.array(cartLineSchema).min(1).max(MAX_LINES)

export type ParsedCartLine = z.infer<typeof cartLineSchema>

/**
 * Parse the raw form field into cart lines. Returns `null` for anything that is
 * not a well-formed, in-bounds cart — the caller maps that to `errors.cartStale`.
 */
export function parseCartField(raw: unknown): ParsedCartLine[] | null {
  if (typeof raw !== 'string' || raw === '') return null

  let decoded: unknown
  try {
    decoded = JSON.parse(raw)
  } catch {
    return null
  }

  const parsed = cartLinesSchema.safeParse(decoded)
  return parsed.success ? parsed.data : null
}
