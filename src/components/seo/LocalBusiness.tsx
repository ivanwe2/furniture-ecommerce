export default function LocalBusiness({
  name,
  address,
  city,
  telephone,
  email,
}: {
  name: string
  address: string
  city: string
  telephone: string
  email: string
}) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name,
    address: {
      '@type': 'PostalAddress',
      addressLocality: city,
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
