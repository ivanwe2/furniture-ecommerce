import { CartClient } from '@/components/cart/CartClient'
import { getAllPublishedProducts } from '@/lib/payload/queries'
import { cartResolutionFrom } from '@/lib/cart/resolution'
import { t } from '@/lib/i18n/bg'

export async function generateMetadata() {
  return {
    robots: { index: false, follow: true },
  }
}

export default async function CartPage() {
  const products = await getAllPublishedProducts()

  const resolution = cartResolutionFrom(products, t('common.unitDefault'))

  return <CartClient resolution={resolution} />
}
