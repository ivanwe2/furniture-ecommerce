import { describe, expect, it } from 'vitest';
import { bg, t } from './bg';

describe('bg.ts i18n', () => {
  it('exports all top-level namespaces', () => {
    const expected = [
      'common', 'nav', 'home', 'catalog', 'category',
      'product', 'search', 'cart', 'checkout', 'contact',
      'errors', 'notFound', 'footer',
    ];
    for (const key of expected) {
      expect(Object.keys(bg)).toContain(key);
    }
  });

  it('resolves simple keys', () => {
    expect(t('common.addToCart')).toBe('Добави');
    expect(t('nav.categories')).toBe('Категории');
    expect(t('home.featured')).toBe('Акценти');
  });

  it('resolves deep keys', () => {
    expect(t('checkout.successTitle')).toBe('Благодарим за поръчката!');
    expect(t('errors.rateLimited')).toContain('Твърде много опити');
    expect(t('product.colSku')).toBe('Код');
  });

  it('throws on non-string leaf', () => {
    // @ts-expect-error — intentionally passing an invalid key to test runtime safety
    expect(() => t('common')).toThrow(TypeError);
  });
});
