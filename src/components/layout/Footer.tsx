import Link from 'next/link'
import { Container } from '@/components/ui'
import { t } from '@/lib/i18n/bg'
import type { CategoryNode } from '@/lib/payload/queries'

interface FooterProps {
  categories: CategoryNode[]
}

export default function Footer({ categories }: FooterProps) {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-sand mt-auto border-t border-steel/20">
      <Container>
        <div className="grid grid-cols-1 gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
          {/* Company block */}
          <div>
            <h3 className="text-sm font-semibold text-ink">{t('common.home')}</h3>
            <p className="mt-2 text-sm text-steel">
              Настех ООД — мебелен обков
            </p>
            <p className="mt-1 text-sm text-steel">
              г. Пловдив, бул. &quot;Васил Левски&quot; 55
            </p>
            <Link href="tel:+359888000000" className="text-sm text-brass hover:underline">
              +359 888 000 000
            </Link>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-sm font-semibold text-ink">{t('footer.categories')}</h3>
            <ul className="mt-2 space-y-1.5">
              {categories.map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/category/${cat.slug}`}
                    className="text-sm text-steel hover:text-brass transition-colors"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Info */}
          <div>
            <h3 className="text-sm font-semibold text-ink">{t('footer.info')}</h3>
            <ul className="mt-2 space-y-1.5">
              {[
                { href: '/terms', label: 'Общи условия' },
                { href: '/privacy', label: 'Политика за поверителност' },
                { href: '/delivery-payment', label: 'Доставка и плащане' },
                { href: '/returns', label: 'Право на отказ' },
                { href: '/cookies', label: 'Бисквитки' },
                { href: '/contact', label: t('nav.contact') },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-steel hover:text-brass transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Working hours */}
          <div>
            <h3 className="text-sm font-semibold text-ink">{t('footer.workingHours')}</h3>
            <p className="mt-2 text-sm text-steel">
              Пон–Пет: 08:30–17:30
            </p>
            <p className="text-sm text-steel">Съб: 09:00–14:00</p>
          </div>
        </div>

        {/* Bottom line */}
        <div className="border-t border-steel/20 py-4 text-center text-xs text-steel">
          © {year} Настех ООД. {t('common.vatIncluded')}
        </div>
      </Container>
    </footer>
  )
}
