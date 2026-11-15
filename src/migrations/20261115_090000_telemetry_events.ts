import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Usage telemetry (Phase 13, ARCHITECTURE §13). Its own schema, outside
// Payload's: Payload never reads it, its migrations and dev push only manage
// `public`, and Grafana's read-only role is granted this schema and nothing
// else (docker-compose.observability.yml → telemetry-db-init) — so the
// dashboards can never read orders or customers.
//
// Written by lib/telemetry/server.ts (batched INSERTs through the Payload
// adapter's drizzle connection); rows older than 13 months are purged daily.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE SCHEMA IF NOT EXISTS telemetry;

    CREATE TABLE IF NOT EXISTS telemetry.events (
      id            bigserial PRIMARY KEY,
      ts            timestamptz NOT NULL DEFAULT now(),
      name          text        NOT NULL,
      source        text        NOT NULL DEFAULT 'web',
      props         jsonb       NOT NULL DEFAULT '{}'::jsonb,
      path          text,
      visitor_day   text,
      visitor_id    uuid,
      session_id    uuid,
      device        text,
      browser       text,
      referrer_host text
    );

    CREATE INDEX IF NOT EXISTS events_ts_idx ON telemetry.events (ts);
    CREATE INDEX IF NOT EXISTS events_name_ts_idx ON telemetry.events (name, ts);
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP SCHEMA IF EXISTS telemetry CASCADE;`)
}
