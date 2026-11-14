import { t } from '@/lib/i18n/bg'
import { getCompany, getItemBySku } from '@/lib/payload/queries'
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

interface ContactPageProps {
  searchParams: Promise<{ about?: string | string[] }>
}

export default async function ContactPage({ searchParams }: ContactPageProps) {
  const query = await searchParams
  const about = (Array.isArray(query.about) ? query.about[0] : query.about)?.trim().slice(0, 64)
  // „Запитване за наличност / цена" on a product page links here with the SKU.
  // Only a real, published SKU is turned into text — never the raw parameter.
  const [company, item] = await Promise.all([getCompany(), about ? getItemBySku(about) : Promise.resolve(null)])
  const initialMessage = item
    ? `${t('contact.aboutSku')}${item.sku} — ${item.productName}${item.itemName && item.itemName !== item.productName ? `, ${item.itemName}` : ''}\n\n`
    : ''
  return (
    <>
      <LocalBusiness
        name={company.name}
        address={company.addressLine}
        city={company.city}
        telephone={company.phoneHref.replace('tel:', '')}
        email={company.email}
      />
      <ContactPageClient company={company} initialMessage={initialMessage} />
    </>
  )
}
