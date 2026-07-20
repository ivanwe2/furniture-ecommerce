import { t } from '@/lib/i18n/bg'
import { getCompany } from '@/lib/payload/queries'
import LocalBusiness from '@/components/seo/LocalBusiness'
import ContactPageClient from './client'

export async function generateMetadata() {
  const siteName = t('seo.siteName')
  const contactTitle = `${t('nav.contact')} | ${siteName}`
  return {
    // Bare label — the layout template adds the „| Настех" suffix.
    title: t('nav.contact'),
    description: t('seo.contactDesc'),
    alternates: { canonical: '/contact' },
    openGraph: {
      title: contactTitle,
      description: t('seo.contactDesc'),
      type: 'website',
      url: '/contact',
    },
  }
}

export default async function ContactPage() {
  const company = await getCompany()
  return (
    <>
      <LocalBusiness
        name={company.name}
        address={company.addressLine}
        city={company.city}
        telephone={company.phoneHref.replace('tel:', '')}
        email={company.email}
      />
      <ContactPageClient company={company} />
    </>
  )
}
