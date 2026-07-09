export default function LocalBusiness({
  name,
  address,
  telephone,
  email,
}: {
  name: string
  address: string
  telephone: string
  email: string
}) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Пловдив',
      streetAddress: address,
      addressCountry: 'BG',
    },
    telephone,
    email,
  }

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  )
}
