import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Product page v2 (Phase 12): variant image + per-variant characteristics,
// product characteristics, related products, the importer's group key, the
// restock lead time setting — and item prices become optional („по запитване").
// Purely additive for existing rows: every current item keeps its price.
// `down` re-adds NOT NULL on prices, so it fails while any item is priced on
// request — set those prices first if you ever need to roll back.

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "products_specs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"value" varchar NOT NULL
  );
  
  CREATE TABLE "products_items_specs" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"value" varchar NOT NULL
  );
  
  CREATE TABLE "products_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"products_id" integer
  );
  
  ALTER TABLE "products_items" ALTER COLUMN "price_eur_cents" DROP NOT NULL;
  ALTER TABLE "products_items" ADD COLUMN "image_id" integer;
  ALTER TABLE "products" ADD COLUMN "import_group" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "restock_lead_time" varchar;
  ALTER TABLE "products_specs" ADD CONSTRAINT "products_specs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_items_specs" ADD CONSTRAINT "products_items_specs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "products_specs_order_idx" ON "products_specs" USING btree ("_order");
  CREATE INDEX "products_specs_parent_id_idx" ON "products_specs" USING btree ("_parent_id");
  CREATE INDEX "products_items_specs_order_idx" ON "products_items_specs" USING btree ("_order");
  CREATE INDEX "products_items_specs_parent_id_idx" ON "products_items_specs" USING btree ("_parent_id");
  CREATE INDEX "products_rels_order_idx" ON "products_rels" USING btree ("order");
  CREATE INDEX "products_rels_parent_idx" ON "products_rels" USING btree ("parent_id");
  CREATE INDEX "products_rels_path_idx" ON "products_rels" USING btree ("path");
  CREATE INDEX "products_rels_products_id_idx" ON "products_rels" USING btree ("products_id");
  ALTER TABLE "products_items" ADD CONSTRAINT "products_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "products_items_image_idx" ON "products_items" USING btree ("image_id");
  CREATE INDEX "products_import_group_idx" ON "products" USING btree ("import_group");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "products_specs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_items_specs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "products_specs" CASCADE;
  DROP TABLE "products_items_specs" CASCADE;
  DROP TABLE "products_rels" CASCADE;
  ALTER TABLE "products_items" DROP CONSTRAINT "products_items_image_id_media_id_fk";
  
  DROP INDEX "products_items_image_idx";
  DROP INDEX "products_import_group_idx";
  ALTER TABLE "products_items" ALTER COLUMN "price_eur_cents" SET NOT NULL;
  ALTER TABLE "products_items" DROP COLUMN "image_id";
  ALTER TABLE "products" DROP COLUMN "import_group";
  ALTER TABLE "site_settings" DROP COLUMN "restock_lead_time";`)
}
