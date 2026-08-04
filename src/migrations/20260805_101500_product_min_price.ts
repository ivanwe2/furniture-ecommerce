import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Denormalised cheapest item price, so listings can sort by price. Prices live
// in the `products_items` array table and Payload cannot sort on an array
// subfield, so without this column price ordering is impossible.
//
// The BACKFILL is the point of this migration, not the column: a bare ALTER
// leaves every existing product NULL, and Postgres sorts NULLs last ascending
// but FIRST descending — so "most expensive" would have led with the products
// that have no price at all. Products with no items stay NULL by design; the
// hook writes NULL for them too, so the column and the hook agree.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "products" ADD COLUMN "min_price_eur_cents" numeric;

    UPDATE "products" p
    SET "min_price_eur_cents" = s.min_price
    FROM (
      SELECT "_parent_id" AS parent_id, MIN("price_eur_cents") AS min_price
      FROM "products_items"
      GROUP BY "_parent_id"
    ) s
    WHERE p."id" = s.parent_id;

    CREATE INDEX "products_min_price_eur_cents_idx" ON "products" USING btree ("min_price_eur_cents");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "products_min_price_eur_cents_idx";
    ALTER TABLE "products" DROP COLUMN "min_price_eur_cents";
  `)
}
