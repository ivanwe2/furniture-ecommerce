import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Payload 3.86 → 3.93 (security release, audit 2026-11-14). 3.90 added
// `users.reset_password_requested_at` (forgot-password throttling; a password
// reset now also clears a lockout).
//
// The generator also emitted `products.min_price_eur_cents` + its index: the
// hand-written 20260805_101500_product_min_price migration already creates
// them but shipped without a schema snapshot, so the diff could not see them.
// Those statements are removed here; the .json snapshot next to this file now
// includes the column, so the next `migrate:create` diffs correctly.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "users" ADD COLUMN "reset_password_requested_at" timestamp(3) with time zone;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "users" DROP COLUMN "reset_password_requested_at";
  `)
}
