import { t } from '@/lib/i18n/bg'
import { company } from '@/lib/company'
import LocalBusiness from '@/components/seo/LocalBusiness'
import ContactPageClient from './client'

export async function generateMetadata() {
  const siteName = t('seo.siteName')
  const contactTitle = `${t('nav.contact')} | ${siteName}`
  return {
    title: contactTitle,
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

export default function ContactPage() {
  return (
    <>
      <LocalBusiness
        name={company.name}
        address={company.addressLine}
        telephone={company.phoneHref.replace('tel:', '')}
        email={company.email}
      />
      <ContactPageClient />
    </>
  )
}
