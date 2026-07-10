import { CartClient } from '@/components/cart/CartClient'
import { getAllPublishedProducts } from '@/lib/payload/queries'
import { t } from '@/lib/i18n/bg'

export async function generateMetadata() {
  return {
    robots: { index: false, follow: true },
  }
}

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
        unit: item.unit ?? t('common.unitDefault'),
        priceEurCents: item.priceEurCents,
        inStock: item.inStock !== false,
      })
    }
  }

  return <CartClient resolution={resolution} />
}
