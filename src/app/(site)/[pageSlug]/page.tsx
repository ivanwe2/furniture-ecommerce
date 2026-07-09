import { notFound } from 'next/navigation'
import { t } from '@/lib/i18n/bg'
import { Container } from '@/components/ui'
import { getPage } from '@/lib/payload/queries'
import PageSlugClient from './client'

interface Props {
  params: Promise<{ pageSlug: string }>
}

export async function generateMetadata({ params }: Props) {
  const resolvedParams = await params
  const page = await getPage(resolvedParams.pageSlug)
  if (!page) return { title: 'Страница не е намерена' }
  const siteName = t('seo.siteName')
  return {
    title: `${page.title} | ${siteName}`,
    description: `${page.title} — информация от Настех.`,
    alternates: { canonical: `/${page.slug ?? resolvedParams.pageSlug}` },
    openGraph: {
      title: `${page.title} | ${siteName}`,
      type: 'website',
      url: `/${page.slug}`,
    },
  }
}

export default async function PageSlug({ params }: Props) {
  const resolvedParams = await params
  const page = await getPage(resolvedParams.pageSlug)

  if (!page) {
    notFound()
  }

  return (
    <Container className="py-8">
      <h1 className="mb-6 text-2xl font-bold text-ink">{page.title}</h1>
      <div className="prose prose-ink max-w-none">
        <PageSlugClient content={page.content ?? null} />
      </div>
    </Container>
  )
}
