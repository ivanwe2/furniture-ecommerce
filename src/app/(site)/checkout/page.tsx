import { CheckoutForm } from '@/components/cart/CheckoutForm'
import { getAllPublishedProducts } from '@/lib/payload/queries'

export async function generateMetadata() {
  return {
    robots: { index: false, follow: false },
  }
}

export default async function CheckoutPage() {
  const products = await getAllPublishedProducts()

  const resolution = new Map()
  for (const product of products) {
    if (!product.items) continue
    for (const item of product.items) {
      resolution.set(`${product.slug}:${item.sku}`, {
        productSlug: product.slug,
        sku: item.sku,
        name: item.name,
        unit: item.unit ?? 'бр.',
        priceEurCents: item.priceEurCents,
        inStock: item.inStock !== false,
      })
    }
  }

  return <CheckoutForm resolution={resolution} />
}
