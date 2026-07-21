import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Inventory: replace the per-SKU boolean `in_stock` with a numeric `stock_qty`.
// Availability is derived (stock_qty > 0). Existing in-stock rows are backfilled
// to a nominal 10 so nothing silently goes out of stock; the owner sets real
// numbers afterwards.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "products_items" ADD COLUMN "stock_qty" numeric DEFAULT 0;
  UPDATE "products_items" SET "stock_qty" = CASE WHEN "in_stock" THEN 10 ELSE 0 END;
  ALTER TABLE "products_items" DROP COLUMN "in_stock";`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "products_items" ADD COLUMN "in_stock" boolean DEFAULT true;
  UPDATE "products_items" SET "in_stock" = ("stock_qty" > 0);
  ALTER TABLE "products_items" DROP COLUMN "stock_qty";`)
}
