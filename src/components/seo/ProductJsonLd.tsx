import { jsonLdScript } from '@/lib/json-ld'
import { eurDecimalString } from '@/lib/money'

/**
 * schema.org/Product structured data for a product page: one Offer per priced
 * item row (ARCHITECTURE §9), each with its own SKU, price and availability.
 * Price-on-request items have no price, so they are not offers.
 */
interface ProductJsonLdOffer {
  sku: string
  priceEurCents: number
  inStock: boolean
  url: string
}

interface ProductJsonLdProps {
  name: string
  description: string
  image?: string | null
  brandName?: string
  categoryName?: string
  url: string
  offers: ProductJsonLdOffer[]
}

export default function ProductJsonLd({
  name,
  description,
  image,
  brandName,
  categoryName,
  url,
  offers,
}: ProductJsonLdProps) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    ...(image ? { image: [image] } : {}),
    ...(brandName ? { brand: { '@type': 'Brand', name: brandName } } : {}),
    ...(categoryName ? { category: categoryName } : {}),
    ...(offers.length === 1 ? { sku: offers[0]!.sku } : {}),
    ...(offers.length > 0
      ? {
          offers: offers.map((offer) => ({
            '@type': 'Offer',
            sku: offer.sku,
            price: eurDecimalString(offer.priceEurCents),
            priceCurrency: 'EUR',
            availability: offer.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            itemCondition: 'https://schema.org/NewCondition',
            url: offer.url,
          })),
        }
      : {}),
    url,
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(data) }} />
}
