/**
 * Serialize a value to JSON that is safe to embed inside a
 * `<script type="application/ld+json">` element. `JSON.stringify` alone does not
 * escape `<`, `>` or `&`, so a string containing `</script>` (e.g. a product
 * name) would break out of the element — an XSS sink. Escaping those three as
 * their `\uXXXX` JSON form keeps the JSON valid and makes breakout impossible.
 * (U+2028/U+2029 need no escaping here: an ld+json block is parsed as data, not
 * executed as JS.)
 */
const BS = String.fromCharCode(92) // a single backslash, without a literal one in source

export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, BS + 'u003c')
    .replace(/>/g, BS + 'u003e')
    .replace(/&/g, BS + 'u0026')
}
