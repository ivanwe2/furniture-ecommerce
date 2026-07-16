import './globals.css'
import type { Metadata } from 'next'
import { Golos_Text, IBM_Plex_Mono } from 'next/font/google'
import { t } from '@/lib/i18n/bg'
import { Container } from '@/components/ui'
import { Header } from '@/components/layout/Header'
import { PromoBar } from '@/components/layout/PromoBar'
import Footer from '@/components/layout/Footer'
import CookieNotice from '@/components/layout/CookieNotice'
import { CartHydrator } from '@/components/cart/CartHydrator'
import { getCategoryTree } from '@/lib/payload/queries'

// Self-hosted via next/font (no runtime Google-Fonts call — GDPR + offline).
// Golos Text covers body + headings (1A); IBM Plex Mono is the label/spec face.
// Both include the cyrillic subset (hard gate — the whole UI is Bulgarian).
const golos = Golos_Text({
  subsets: ['cyrillic', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-golos',
  display: 'swap',
})

const mono = IBM_Plex_Mono({
  subsets: ['cyrillic', 'latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: t('seo.siteName'),
    template: `%s | ${t('seo.siteName')}`,
  },
  description: t('seo.homeDesc'),
}

// Render every storefront page live from the DB. On-demand revalidation
// (revalidateTag in the collection hooks) does NOT work on Cloudflare until the
// OpenNext incremental cache is wired (deferred), so static pages would stay
// frozen at build time and admin edits would never appear. Traffic is tiny, so
// per-request rendering is fine. Revisit when the page cache is added.
export const dynamic = 'force-dynamic'

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const categories = await getCategoryTree()

  return (
    <html lang="bg" className={`${golos.variable} ${mono.variable}`}>
      <body>
        <div className="flex min-h-screen flex-col">
          <a href="#main" className="skip-link">
            {t('common.skipToContent')}
          </a>

          <PromoBar />
          <Header categories={categories} />

          <Container id="main" className="flex-1">
            {children}
          </Container>

          <Footer categories={categories} />
          <CookieNotice />
          <CartHydrator />
        </div>
      </body>
    </html>
  )
}
