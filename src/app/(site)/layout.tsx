import { FontProvider } from '@/components/providers/font-provider'
import { Container } from '@/components/ui'
import { Header } from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { getCategoryTree } from '@/lib/payload/queries'

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const categories = await getCategoryTree()

  return (
    <FontProvider>
      <div className="flex min-h-screen flex-col">
        {/* Skip link */}
        <a href="#main" className="skip-link">
          Прескочи към съдържанието
        </a>

        <Header categories={categories} />

        <Container id="main">
          {children}
        </Container>

        <Footer categories={categories} />
      </div>
    </FontProvider>
  )
}
