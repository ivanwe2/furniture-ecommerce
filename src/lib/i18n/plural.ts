import { bg } from './bg'

/**
 * Bulgarian count label for products: "1 продукт" but "2 продукта".
 *
 * Bulgarian nouns take the singular after 1 and the count form after anything
 * else — including 0 ("0 продукта") and, unlike Russian, 21/101 ("21 продукта"),
 * because the rule keys off the numeral being exactly one rather than off its
 * last digit. So a plain `n === 1` test is correct here, not an approximation.
 */
export function productCount(n: number): string {
  const template = n === 1 ? bg.brands.countOne : bg.brands.countMany
  return template.replace('{count}', String(n))
}
