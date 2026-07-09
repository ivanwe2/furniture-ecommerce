import { revalidateTag } from 'next/cache'

export async function revalidateTags(...tags: string[]) {
  if (process.env.SKIP_REVALIDATE === '1') return
  for (const t of tags) revalidateTag(t)
}
