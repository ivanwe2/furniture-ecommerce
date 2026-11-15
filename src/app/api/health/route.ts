import { sql } from '@payloadcms/db-postgres'
import { getPayload } from 'payload'
import config from '@payload-config'
import { redisStatus } from '@/lib/redis'

/**
 * GET /api/health — liveness + dependencies, for the container healthcheck
 * (docker-compose.yml), the auto-deploy rollback decision and the uptime probe
 * in the observability stack. 200 while the database answers (Redis down is
 * "degraded", not down: the site works without it); 503 when it does not.
 * Reports the running version (APP_VERSION = git SHA, set at build).
 */
export const dynamic = 'force-dynamic'

type Drizzle = { execute: (query: ReturnType<typeof sql>) => Promise<unknown> }

async function dbStatus(): Promise<'ok' | 'down'> {
  try {
    const payload = await getPayload({ config })
    const db = (payload.db as unknown as { drizzle: Drizzle }).drizzle
    await Promise.race([
      db.execute(sql`select 1`),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
    ])
    return 'ok'
  } catch {
    return 'down'
  }
}

export async function GET(): Promise<Response> {
  const [db, redis] = await Promise.all([dbStatus(), redisStatus()])
  const status = db === 'down' ? 'down' : redis === 'down' ? 'degraded' : 'ok'
  return Response.json(
    { status, db, redis, version: process.env.APP_VERSION ?? 'dev' },
    { status: db === 'down' ? 503 : 200, headers: { 'cache-control': 'no-store' } },
  )
}
