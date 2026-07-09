import { redirect } from 'next/navigation'
import { CheckoutSuccessClient } from '@/components/cart/CheckoutSuccessClient'

export async function generateMetadata() {
  return {
    robots: { index: false, follow: false },
  }
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ n?: string }>
}) {
  const { n } = await searchParams
  if (!n) redirect('/')
  return <CheckoutSuccessClient orderNumber={n} />
}
