import { CartClient } from '@/components/cart/CartClient'
import { getAllPublishedProducts } from '@/lib/payload/queries'

export default async function CartPage() {
  const products = await getAllPublishedProducts()

  const resolution = new Map()
  for (const product of products) {
    if (!product.items) continue
    for (const item of product.items) {
      const key = `${product.slug}:${item.sku}`
      resolution.set(key, {
        productSlug: product.slug,
        sku: item.sku,
        name: item.name,
        unit: item.unit ?? 'бр.',
        priceEurCents: item.priceEurCents,
        inStock: item.inStock !== false,
      })
    }
  }

  return <CartClient resolution={resolution} />
}
