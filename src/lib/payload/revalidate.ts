import { revalidateTag } from 'next/cache'

export async function revalidateTags(...tags: string[]) {
  if (process.env.SKIP_REVALIDATE === '1') return
  // Next 16 requires a revalidation profile. `{ expire: 0 }` = immediate
  // expiry — the next request to a resource with this tag is a blocking
  // refetch. This preserves the pre-16 single-arg behavior we rely on: these
  // calls come from Payload afterChange hooks (route-handler context, akin to
  // an "external system"), so admin edits must surface on the storefront right
  // away rather than after one stale-while-revalidate request (`'max'`).
  for (const t of tags) revalidateTag(t, { expire: 0 })
}
