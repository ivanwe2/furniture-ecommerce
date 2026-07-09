import './globals.css'
import type { Metadata } from 'next'
import { Playfair_Display, Inter } from 'next/font/google'
import { Container } from '@/components/ui'
import { Header } from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import CookieNotice from '@/components/layout/CookieNotice'
import { CartHydrator } from '@/components/cart/CartHydrator'
import { getCategoryTree } from '@/lib/payload/queries'

const display = Playfair_Display({
  subsets: ['cyrillic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display-src',
  display: 'swap',
})

const body = Inter({
  subsets: ['cyrillic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body-src',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Настех — мебелен обков',
    template: '%s | Настех — мебелен обков',
  },
  description:
    'Онлайн каталог с мебелен обков — ъгли, щифтове, панти, механизми и аксесоари. Плащане при доставка (наложен платеж).',
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const categories = await getCategoryTree()

  return (
    <html lang="bg" className={`${display.variable} ${body.variable}`}>
      <body>
        <div className="flex min-h-screen flex-col">
          <a href="#main" className="skip-link">
            Прескочи към съдържанието
          </a>

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
