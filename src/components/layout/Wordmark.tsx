import clsx from 'clsx'
import { t } from '@/lib/i18n/bg'

/**
 * The Настех wordmark, as it appears on the storefront fascia: „НАСТЕХ" drawn
 * with Latin look-alike capitals and interpuncts, hairline weight, wide
 * tracking, light on a dark ground.
 *
 * Real text rather than an SVG, so it stays crisp at any size and needs no
 * asset pipeline. The letters are decorative — a screen reader would say
 * "H A C T E X" — so the visible glyphs are hidden from the a11y tree and the
 * element carries the real name instead.
 *
 * Size it from the caller with a text-* class; `tracking` is em-based so it
 * scales with whatever size is set. The trailing indent balances the final
 * interpunct's trailing space so the mark stays optically centred.
 */
export function Wordmark({ className, tracking = '0.3em' }: { className?: string; tracking?: string }) {
  return (
    <span
      role="img"
      aria-label={t('logo.name')}
      // Tracking as an inline style, not a Tailwind arbitrary value: two
      // `tracking-[…]` classes have equal specificity, so which one wins would
      // depend on stylesheet order rather than on the caller.
      style={{ letterSpacing: tracking, textIndent: tracking }}
      className={clsx('font-wordmark whitespace-nowrap font-extralight leading-none', className)}
    >
      <span aria-hidden="true">{t('logo.wordmark')}</span>
    </span>
  )
}
