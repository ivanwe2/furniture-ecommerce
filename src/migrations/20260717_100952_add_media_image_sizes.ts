import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_site_settings\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`company_name\` text DEFAULT 'Настех ООД' NOT NULL,
  	\`eik\` text,
  	\`address_line\` text DEFAULT 'ул. „Жан Жорес“ 9' NOT NULL,
  	\`city\` text DEFAULT 'Пловдив',
  	\`email\` text DEFAULT 'nastehsales@gmail.com' NOT NULL,
  	\`working_hours\` text DEFAULT 'Пон-Пет: 08:30-17:30
  Съб: 09:00-14:00',
  	\`hero_title\` text,
  	\`hero_subtitle\` text,
  	\`announcement\` text,
  	\`social_facebook\` text,
  	\`updated_at\` text,
  	\`created_at\` text
  );
  `)
  await db.run(sql`INSERT INTO \`__new_site_settings\`("id", "company_name", "eik", "address_line", "city", "email", "working_hours", "hero_title", "hero_subtitle", "announcement", "social_facebook", "updated_at", "created_at") SELECT "id", "company_name", "eik", "address_line", "city", "email", "working_hours", "hero_title", "hero_subtitle", "announcement", "social_facebook", "updated_at", "created_at" FROM \`site_settings\`;`)
  await db.run(sql`DROP TABLE \`site_settings\`;`)
  await db.run(sql`ALTER TABLE \`__new_site_settings\` RENAME TO \`site_settings\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`ALTER TABLE \`media\` ADD \`focal_x\` numeric;`)
  await db.run(sql`ALTER TABLE \`media\` ADD \`focal_y\` numeric;`)
  await db.run(sql`ALTER TABLE \`media\` ADD \`sizes_thumb_url\` text;`)
  await db.run(sql`ALTER TABLE \`media\` ADD \`sizes_thumb_width\` numeric;`)
  await db.run(sql`ALTER TABLE \`media\` ADD \`sizes_thumb_height\` numeric;`)
  await db.run(sql`ALTER TABLE \`media\` ADD \`sizes_thumb_mime_type\` text;`)
  await db.run(sql`ALTER TABLE \`media\` ADD \`sizes_thumb_filesize\` numeric;`)
  await db.run(sql`ALTER TABLE \`media\` ADD \`sizes_thumb_filename\` text;`)
  await db.run(sql`ALTER TABLE \`media\` ADD \`sizes_card_url\` text;`)
  await db.run(sql`ALTER TABLE \`media\` ADD \`sizes_card_width\` numeric;`)
  await db.run(sql`ALTER TABLE \`media\` ADD \`sizes_card_height\` numeric;`)
  await db.run(sql`ALTER TABLE \`media\` ADD \`sizes_card_mime_type\` text;`)
  await db.run(sql`ALTER TABLE \`media\` ADD \`sizes_card_filesize\` numeric;`)
  await db.run(sql`ALTER TABLE \`media\` ADD \`sizes_card_filename\` text;`)
  await db.run(sql`ALTER TABLE \`media\` ADD \`sizes_detail_url\` text;`)
  await db.run(sql`ALTER TABLE \`media\` ADD \`sizes_detail_width\` numeric;`)
  await db.run(sql`ALTER TABLE \`media\` ADD \`sizes_detail_height\` numeric;`)
  await db.run(sql`ALTER TABLE \`media\` ADD \`sizes_detail_mime_type\` text;`)
  await db.run(sql`ALTER TABLE \`media\` ADD \`sizes_detail_filesize\` numeric;`)
  await db.run(sql`ALTER TABLE \`media\` ADD \`sizes_detail_filename\` text;`)
  await db.run(sql`ALTER TABLE \`media\` ADD \`sizes_zoom_url\` text;`)
  await db.run(sql`ALTER TABLE \`media\` ADD \`sizes_zoom_width\` numeric;`)
  await db.run(sql`ALTER TABLE \`media\` ADD \`sizes_zoom_height\` numeric;`)
  await db.run(sql`ALTER TABLE \`media\` ADD \`sizes_zoom_mime_type\` text;`)
  await db.run(sql`ALTER TABLE \`media\` ADD \`sizes_zoom_filesize\` numeric;`)
  await db.run(sql`ALTER TABLE \`media\` ADD \`sizes_zoom_filename\` text;`)
  await db.run(sql`ALTER TABLE \`media\` ADD \`sizes_og_url\` text;`)
  await db.run(sql`ALTER TABLE \`media\` ADD \`sizes_og_width\` numeric;`)
  await db.run(sql`ALTER TABLE \`media\` ADD \`sizes_og_height\` numeric;`)
  await db.run(sql`ALTER TABLE \`media\` ADD \`sizes_og_mime_type\` text;`)
  await db.run(sql`ALTER TABLE \`media\` ADD \`sizes_og_filesize\` numeric;`)
  await db.run(sql`ALTER TABLE \`media\` ADD \`sizes_og_filename\` text;`)
  await db.run(sql`CREATE INDEX \`media_sizes_thumb_sizes_thumb_filename_idx\` ON \`media\` (\`sizes_thumb_filename\`);`)
  await db.run(sql`CREATE INDEX \`media_sizes_card_sizes_card_filename_idx\` ON \`media\` (\`sizes_card_filename\`);`)
  await db.run(sql`CREATE INDEX \`media_sizes_detail_sizes_detail_filename_idx\` ON \`media\` (\`sizes_detail_filename\`);`)
  await db.run(sql`CREATE INDEX \`media_sizes_zoom_sizes_zoom_filename_idx\` ON \`media\` (\`sizes_zoom_filename\`);`)
  await db.run(sql`CREATE INDEX \`media_sizes_og_sizes_og_filename_idx\` ON \`media\` (\`sizes_og_filename\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX \`media_sizes_thumb_sizes_thumb_filename_idx\`;`)
  await db.run(sql`DROP INDEX \`media_sizes_card_sizes_card_filename_idx\`;`)
  await db.run(sql`DROP INDEX \`media_sizes_detail_sizes_detail_filename_idx\`;`)
  await db.run(sql`DROP INDEX \`media_sizes_zoom_sizes_zoom_filename_idx\`;`)
  await db.run(sql`DROP INDEX \`media_sizes_og_sizes_og_filename_idx\`;`)
  await db.run(sql`ALTER TABLE \`media\` DROP COLUMN \`focal_x\`;`)
  await db.run(sql`ALTER TABLE \`media\` DROP COLUMN \`focal_y\`;`)
  await db.run(sql`ALTER TABLE \`media\` DROP COLUMN \`sizes_thumb_url\`;`)
  await db.run(sql`ALTER TABLE \`media\` DROP COLUMN \`sizes_thumb_width\`;`)
  await db.run(sql`ALTER TABLE \`media\` DROP COLUMN \`sizes_thumb_height\`;`)
  await db.run(sql`ALTER TABLE \`media\` DROP COLUMN \`sizes_thumb_mime_type\`;`)
  await db.run(sql`ALTER TABLE \`media\` DROP COLUMN \`sizes_thumb_filesize\`;`)
  await db.run(sql`ALTER TABLE \`media\` DROP COLUMN \`sizes_thumb_filename\`;`)
  await db.run(sql`ALTER TABLE \`media\` DROP COLUMN \`sizes_card_url\`;`)
  await db.run(sql`ALTER TABLE \`media\` DROP COLUMN \`sizes_card_width\`;`)
  await db.run(sql`ALTER TABLE \`media\` DROP COLUMN \`sizes_card_height\`;`)
  await db.run(sql`ALTER TABLE \`media\` DROP COLUMN \`sizes_card_mime_type\`;`)
  await db.run(sql`ALTER TABLE \`media\` DROP COLUMN \`sizes_card_filesize\`;`)
  await db.run(sql`ALTER TABLE \`media\` DROP COLUMN \`sizes_card_filename\`;`)
  await db.run(sql`ALTER TABLE \`media\` DROP COLUMN \`sizes_detail_url\`;`)
  await db.run(sql`ALTER TABLE \`media\` DROP COLUMN \`sizes_detail_width\`;`)
  await db.run(sql`ALTER TABLE \`media\` DROP COLUMN \`sizes_detail_height\`;`)
  await db.run(sql`ALTER TABLE \`media\` DROP COLUMN \`sizes_detail_mime_type\`;`)
  await db.run(sql`ALTER TABLE \`media\` DROP COLUMN \`sizes_detail_filesize\`;`)
  await db.run(sql`ALTER TABLE \`media\` DROP COLUMN \`sizes_detail_filename\`;`)
  await db.run(sql`ALTER TABLE \`media\` DROP COLUMN \`sizes_zoom_url\`;`)
  await db.run(sql`ALTER TABLE \`media\` DROP COLUMN \`sizes_zoom_width\`;`)
  await db.run(sql`ALTER TABLE \`media\` DROP COLUMN \`sizes_zoom_height\`;`)
  await db.run(sql`ALTER TABLE \`media\` DROP COLUMN \`sizes_zoom_mime_type\`;`)
  await db.run(sql`ALTER TABLE \`media\` DROP COLUMN \`sizes_zoom_filesize\`;`)
  await db.run(sql`ALTER TABLE \`media\` DROP COLUMN \`sizes_zoom_filename\`;`)
  await db.run(sql`ALTER TABLE \`media\` DROP COLUMN \`sizes_og_url\`;`)
  await db.run(sql`ALTER TABLE \`media\` DROP COLUMN \`sizes_og_width\`;`)
  await db.run(sql`ALTER TABLE \`media\` DROP COLUMN \`sizes_og_height\`;`)
  await db.run(sql`ALTER TABLE \`media\` DROP COLUMN \`sizes_og_mime_type\`;`)
  await db.run(sql`ALTER TABLE \`media\` DROP COLUMN \`sizes_og_filesize\`;`)
  await db.run(sql`ALTER TABLE \`media\` DROP COLUMN \`sizes_og_filename\`;`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_site_settings\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`company_name\` text DEFAULT 'Настех ООД' NOT NULL,
  	\`eik\` text,
  	\`address_line\` text NOT NULL,
  	\`city\` text DEFAULT 'Пловдив',
  	\`email\` text NOT NULL,
  	\`working_hours\` text,
  	\`hero_title\` text,
  	\`hero_subtitle\` text,
  	\`announcement\` text,
  	\`social_facebook\` text,
  	\`updated_at\` text,
  	\`created_at\` text
  );
  `)
  await db.run(sql`INSERT INTO \`__new_site_settings\`("id", "company_name", "eik", "address_line", "city", "email", "working_hours", "hero_title", "hero_subtitle", "announcement", "social_facebook", "updated_at", "created_at") SELECT "id", "company_name", "eik", "address_line", "city", "email", "working_hours", "hero_title", "hero_subtitle", "announcement", "social_facebook", "updated_at", "created_at" FROM \`site_settings\`;`)
  await db.run(sql`DROP TABLE \`site_settings\`;`)
  await db.run(sql`ALTER TABLE \`__new_site_settings\` RENAME TO \`site_settings\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
}
