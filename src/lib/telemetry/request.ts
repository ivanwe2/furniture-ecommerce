import 'server-only'
import { headers } from 'next/headers'
import { clientIp } from '@/lib/request-ip'
import type { RequestContext } from '@/lib/telemetry/server'

/** True when the request carries a Payload admin session cookie. */
export function hasStaffCookie(hdrs: Headers): boolean {
  return /(?:^|;\s*)payload-token=/.test(hdrs.get('cookie') ?? '')
}

/** The telemetry view of a request: IP and browser for the daily hash, referrer, staff flag. */
export function contextFromHeaders(hdrs: Headers): RequestContext {
  return {
    ip: clientIp(hdrs),
    ua: hdrs.get('user-agent') ?? '',
    referer: hdrs.get('referer'),
    staff: hasStaffCookie(hdrs),
  }
}

/** Same, for server components and server actions. */
export async function requestContext(): Promise<RequestContext> {
  return contextFromHeaders(await headers())
}
