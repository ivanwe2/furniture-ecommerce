import { getAllSlugsForSitemap } from '@/lib/payload/queries'

// Queries Payload at request time — the DB isn't available during `next build`.
export const dynamic = 'force-dynamic'

export default async function sitemap() {
  const slugs = await getAllSlugsForSitemap()
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nasteh.bg'

  const entries: { url: string; lastModified?: string }[] = []

  // Home
  entries.push({ url: `${baseUrl}/` })

  // Contact
  entries.push({ url: `${baseUrl}/contact` })

  // Categories
  for (const slug of slugs.categories) {
    entries.push({ url: `${baseUrl}/category/${slug}` })
  }

  // Brands
  for (const slug of slugs.brands) {
    entries.push({ url: `${baseUrl}/brand/${slug}` })
  }

  // Products
  for (const slug of slugs.products) {
    entries.push({ url: `${baseUrl}/product/${slug}` })
  }

  // Pages
  for (const slug of slugs.pages) {
    entries.push({ url: `${baseUrl}/${slug}` })
  }

  return entries
}
