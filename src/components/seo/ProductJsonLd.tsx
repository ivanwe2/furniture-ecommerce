/**
 * schema.org/Product structured data for a product page, enabling price /
 * availability rich results in search. Prices are euro cents → EUR string.
 */
interface ProductJsonLdProps {
  name: string
  description: string
  image?: string | null
  brandName?: string
  categoryName?: string
  lowPriceEurCents: number
  highPriceEurCents: number
  offerCount: number
  inStock: boolean
  url: string
}

export default function ProductJsonLd({
  name,
  description,
  image,
  brandName,
  categoryName,
  lowPriceEurCents,
  highPriceEurCents,
  offerCount,
  inStock,
  url,
}: ProductJsonLdProps) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    ...(image ? { image: [image] } : {}),
    ...(brandName ? { brand: { '@type': 'Brand', name: brandName } } : {}),
    ...(categoryName ? { category: categoryName } : {}),
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'EUR',
      lowPrice: (lowPriceEurCents / 100).toFixed(2),
      highPrice: (highPriceEurCents / 100).toFixed(2),
      offerCount,
      availability: inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
    url,
  }

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  )
}
