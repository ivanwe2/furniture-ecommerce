import { altchaChallengeResponse } from '@/lib/altcha'

// A fresh signed challenge per request — never cached.
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  return altchaChallengeResponse(req)
}
