import type { Instrumentation } from 'next'
import { log } from '@/lib/log'

/**
 * Next.js instrumentation hook (ARCHITECTURE §13).
 * - register(): Node-only setup (tracing, process-level error logging, the
 *   telemetry retention job) — see instrumentation-node.ts.
 * - onRequestError(): every error thrown while rendering a page, running a
 *   server action or a route handler, as one structured log line with the
 *   route — the errors error.tsx shows the visitor as „Нещо се обърка".
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') await import('./instrumentation-node')
}

export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  log('error', 'request', 'unhandled error', {
    err,
    method: request.method,
    // The query string can carry search terms; the route pattern is enough.
    path: request.path.split('?', 1)[0],
    route: context.routePath,
    routeType: context.routeType,
    renderSource: 'renderSource' in context ? context.renderSource : undefined,
    digest: typeof (err as { digest?: unknown })?.digest === 'string' ? (err as { digest: string }).digest : undefined,
  })
}
