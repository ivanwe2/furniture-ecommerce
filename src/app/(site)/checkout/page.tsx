import { CheckoutForm } from '@/components/cart/CheckoutForm'
import { getAllPublishedProducts } from '@/lib/payload/queries'
import { cartResolutionFrom } from '@/lib/cart/resolution'
import { t } from '@/lib/i18n/bg'

export async function generateMetadata() {
  return {
    robots: { index: false, follow: false },
  }
}

export default async function CheckoutPage() {
  const products = await getAllPublishedProducts()

  const resolution = cartResolutionFrom(products, t('common.unitDefault'))

  return <CheckoutForm resolution={resolution} />
}
