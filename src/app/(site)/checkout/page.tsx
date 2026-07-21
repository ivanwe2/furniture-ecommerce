import { CheckoutForm } from '@/components/cart/CheckoutForm'
import { getAllPublishedProducts } from '@/lib/payload/queries'
import { t } from '@/lib/i18n/bg'

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
        unit: item.unit ?? t('common.unitDefault'),
        priceEurCents: item.priceEurCents,
        inStock: (item.stockQty ?? 0) > 0,
      })
    }
  }

  return <CheckoutForm resolution={resolution} />
}
