import { t } from '@/lib/i18n/bg'
import LocalBusiness from '@/components/seo/LocalBusiness'
import ContactPageClient from './client'

export async function generateMetadata() {
  const siteName = t('seo.siteName')
  return {
    title: `Контакти | ${siteName}`,
    description: t('seo.contactDesc'),
    alternates: { canonical: '/kontakti' },
    openGraph: {
      title: `Контакти | ${siteName}`,
      description: t('seo.contactDesc'),
      type: 'website',
      url: '/kontakti',
    },
  }
}

export default function ContactPage() {
  return (
    <>
      <LocalBusiness
        name="Настех ООД"
        address='бул. "Васил Левски" 55'
        telephone="+359888000000"
        email="info@nasteh.bg"
      />
      <ContactPageClient />
    </>
  )
}
