import Link from 'next/link'
import { Container } from '@/components/ui'
import { BrandLogo } from './BrandLogo'
import { t } from '@/lib/i18n/bg'
import { getCompany, type CategoryNode } from '@/lib/payload/queries'

interface FooterProps {
  categories: CategoryNode[]
}

const HEAD = 'font-mono text-[11px] uppercase tracking-[0.14em] text-on-dark-muted'
const LINK = 'text-sm text-on-dark transition-colors hover:text-brass-light'

export default async function Footer({ categories }: FooterProps) {
  const year = new Date().getFullYear()
  const company = await getCompany()

  const infoLinks = [
    { href: '/terms', label: t('legal.terms') },
    { href: '/privacy', label: t('legal.privacy') },
    { href: '/delivery-payment', label: t('legal.deliveryPayment') },
    { href: '/returns', label: t('legal.returns') },
    { href: '/cookies', label: t('legal.cookies') },
    { href: '/contact', label: t('nav.contact') },
  ]

  return (
    <footer className="mt-auto bg-dark text-on-dark">
      <Container className="py-14">
        <div className="grid gap-10 border-b border-on-dark-bright/12 pb-11 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1.1fr]">
          {/* Brand + tagline */}
          <div>
            <BrandLogo variant="cream" className="h-10" />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-on-dark-muted">
              {t('footer.tagline')}
            </p>
          </div>

          {/* Categories */}
          <div>
            <h3 className={HEAD}>{t('footer.categories')}</h3>
            <ul className="mt-4 space-y-2.5">
              {categories.map((cat) => (
                <li key={cat.id}>
                  <Link href={`/category/${cat.slug}`} className={LINK}>
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Info */}
          <div>
            <h3 className={HEAD}>{t('footer.info')}</h3>
            <ul className="mt-4 space-y-2.5">
              {infoLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={LINK}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className={HEAD}>{t('footer.contact')}</h3>
            <div className="mt-4 flex flex-col gap-2.5 text-sm">
              <Link
                href={company.phoneHref}
                className="font-semibold text-on-dark-bright transition-colors hover:text-brass-light"
              >
                {company.phoneDisplay}
              </Link>
              <Link href={company.emailHref} className={LINK}>
                {company.email}
              </Link>
              <span className="leading-relaxed text-on-dark-muted">
                гр. {company.city}, {company.addressLine}
              </span>
              <span className="mt-1 font-mono text-[11px] uppercase tracking-[0.08em] text-on-dark-muted">
                {company.workingHours.weekdays} · {company.workingHours.saturday}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col gap-2 pt-6 font-mono text-[11px] uppercase tracking-[0.08em] text-on-dark-muted sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {year} {company.name} · {t('common.vatIncluded')}
          </span>
          <span>NASTEH.BG</span>
        </div>
      </Container>
    </footer>
  )
}
