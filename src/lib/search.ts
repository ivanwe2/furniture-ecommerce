/**
 * Query-string → search tokens for `searchProducts`.
 *
 * Pure and separate from the query layer so it can be tested without booting
 * Payload. Payload maps a `contains` constraint to `ILIKE '%' || value || '%'`
 * (@payloadcms/drizzle `operatorMap`), which makes `%` and `_` in a visitor's
 * query act as SQL wildcards: `%` alone would match every product, and `_`
 * would silently match any character. Not an injection — the value is a bound
 * parameter — but a search box should treat what a user typed as literal text.
 */

/**
 * Escape the LIKE metacharacters so they match literally. Postgres uses
 * backslash as the default LIKE escape character, so the backslash itself must
 * be escaped first or it would consume the following character.
 */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`)
}

/** Lowercased, whitespace-split, escaped, capped at 5 tokens. */
export function searchTokens(qRaw: string): string[] {
  return qRaw
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5)
    .map(escapeLikePattern)
}
