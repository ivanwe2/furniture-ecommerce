import { notFound } from 'next/navigation'
import { Container } from '@/components/ui'
import { getPage } from '@/lib/payload/queries'
import PageSlugClient from './client'

interface Props {
  params: Promise<{ pageSlug: string }>
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
