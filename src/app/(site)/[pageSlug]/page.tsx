import { notFound } from 'next/navigation'
import { t } from '@/lib/i18n/bg'
import { Container } from '@/components/ui'
import { getPage } from '@/lib/payload/queries'
import { RichText } from '@/components/richtext/RichText'

interface Props {
  params: Promise<{ pageSlug: string }>
}

export async function generateMetadata({ params }: Props) {
  const resolvedParams = await params
  const page = await getPage(resolvedParams.pageSlug)
  if (!page) return { title: t('notFound.title') }
  const siteName = t('seo.siteName')
  return {
    title: `${page.title} | ${siteName}`,
    description: t('seo.pageDesc').replace('{title}', page.title),
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
    <Container className="py-8 sm:py-10">
      <div className="mb-8 border-b border-ink/12 pb-6">
        <div className="mb-2.5 font-mono text-xs uppercase tracking-[0.16em] text-brass-dark">{t('footer.info')}</div>
        <h1 className="font-display text-3xl font-semibold tracking-[-0.02em] text-ink sm:text-4xl">{page.title}</h1>
      </div>
      <div className="max-w-3xl">
        <RichText content={page.content} />
      </div>
    </Container>
  )
}
