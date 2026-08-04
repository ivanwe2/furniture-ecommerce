# DATA-MODEL.md — Payload collections, hooks, queries

Admin locale: `bg` (Payload ships Bulgarian). Every collection/field gets a
Bulgarian `label` (admin is owner-facing). Code identifiers stay English.

## 0. The core modeling insight

Products are **families**; the sellable unit is an **item row** (SKU).
Evidence: the old site's SEVROLL pages embed price tables as images — rows
like `Дръжка Comfort 16 II · бр. · 2700 · Сребро · 02718 · 31.14 лв.` A
simple product = family with one item row. The cart and orders reference
`(product, sku)`, never a bare product. This one decision removes any need
for a separate "variants" system.

## 1. `categories`

| Field | Type | Config | Notes |
|---|---|---|---|
| `name` | text | required, label "Име" | |
| `slug` | text | unique, index, admin.position sidebar | auto from name via `beforeValidate` (lib/slug.ts) if empty; editable |
| `parent` | relationship→categories | label "Родителска категория" | null = top level |
| `description` | textarea | label "Описание" | shown on category page |
| `image` | upload→media | label "Снимка" | category card |
| `sortOrder` | number | default 0, label "Подредба" | menu ordering |

Hooks:
- `beforeValidate`: generate slug; **depth guard** — walk `parent` chain;
  if depth would exceed 3, throw BG validation error
  ("Максимум 3 нива на категории.").
- `beforeDelete`: block deletion if any product references the category or
  any category has it as parent (BG error telling the owner to move them
  first).
- `afterChange`/`afterDelete`: `revalidateTag('categories')` +
  `revalidateTag('products')` (menus, listings, breadcrumbs).

Admin: `useAsTitle: 'name'`, defaultColumns `['name','parent','sortOrder']`.

## 2. `brands`

`name` (text, required) · `slug` (unique) · `logo` (upload→media) ·
`description` (textarea). Exists because SEVROLL is commercially prominent
(dedicated systems line) and earns `/brand/[slug]` landing pages. Hooks:
slug + `revalidateTag('brands')` + `revalidateTag('products')`.

## 3. `products`

| Field | Type | Config | Notes |
|---|---|---|---|
| `name` | text | required, label "Име" | family name |
| `slug` | text | unique, index | auto/editable |
| `status` | select draft/published | default **draft**, label "Статус" (Чернова/Публикуван) | imports land draft |
| `category` | relationship→categories | required, label "Категория" | expected leaf; not hard-enforced |
| `brand` | relationship→brands | optional, label "Марка" | |
| `shortSpec` | array of `{ text: text }` | label "Кратки характеристики" | the bullets ("Максимално натоварване до 50 кг…") |
| `description` | richText (Lexical, template default features) | label "Описание" | |
| `gallery` | array of `{ image: upload→media }` | min 0, label "Галерия" | first = cover; empty gallery renders placeholder (UI-SPEC) |
| `items` | array, **minRows 1**, label "Артикули (SKU)" | see below | THE central field |
| `featured` | checkbox | default false, label "Показвай на началната страница" | |
| `searchText` | text | `admin.hidden: true` | derived — see §Search |
| `seo` | group `{ title, description }` | optional overrides | |

`items` row:

| Field | Type | Config |
|---|---|---|
| `name` | text | required, label "Наименование" |
| `sku` | text | required, label "Продуктов код" |
| `unit` | select `бр.`/`м`/`компл.`/`чифт` | default `бр.`, label "Мярка" |
| `lengthMm` | number | optional, label "Дължина (мм)" |
| `color` | text | optional, label "Цвят" |
| `priceEurCents` | number | required, integer, min 1, label "Цена (евроцентове)"; `admin.description`: "Пример: 31,14 € → 3114" |
| `stockQty` | number | default 0, min 0, label "Наличност (брой)"; availability is derived (`stockQty > 0`), 0 = «Изчерпан» (not orderable) |

Hooks:
- `beforeValidate`: slug; normalize SKUs (trim; preserve leading zeros —
  SKU is TEXT, never number); build `searchText` (§7).
- `beforeChange` (**SKU global uniqueness**): collect this doc's SKUs;
  reject duplicates within the doc; query
  `products where items.sku in [skus] and id != current` — on hit, BG error
  naming the SKU and the other product ("Продуктов код 02718 вече
  съществува в 'Плъзгаща система COMFORT'."). Uses local API with
  `overrideAccess: true`, `depth: 0`.
- `afterChange`: `revalidateTag('products')`,
  `revalidateTag('product-'+slug)`; if slug changed, also previous slug's
  tag (available via `previousDoc`).
- `afterDelete`: same tags.

Admin: `useAsTitle: 'name'`, defaultColumns
`['name','category','brand','status']`, list filters category/brand/status.

## 4. `orders`

| Field | Type | Config |
|---|---|---|
| `orderNumber` | text | unique; generated in `beforeChange` on create: `NAS-YYYYMMDD-XXXX` (XXXX = crypto-random base36 upper; on collision regenerate — uniqueness constraint is the backstop) |
| `status` | select: `нова` / `потвърдена` / `изпратена` / `доставена` / `отказана` | default `нова`, label "Статус" |
| `customer` | group | `name` (req), `phone` (req), `email` (req), `note` (textarea) — labels Име/Телефон/Имейл/Бележка |
| `delivery` | group | `method` select: `адрес` / `офис на Еконт` / `офис на Спиди` (label "Доставка до"); `addressOrOffice` text req (label "Адрес / Офис"); `city` text req (label "Град") |
| `lines` | array | `productId` (text), `productName`, `itemSku`, `itemName`, `unit`, `qty` (int ≥1), `unitPriceEurCents` (int), `lineTotalEurCents` (int) — full SNAPSHOT at order time |
| `totalEurCents` | number | server-computed |
| `meta` | group | `ip` text, `userAgent` text |

Access 🔒: `read/update/delete`: admin only. `create`: **`() => false`** for
the public API surface — orders are created exclusively via
`payload.create({ overrideAccess: true })` inside `src/actions/order.ts`.
Verify with curl in Phase 2 AC (REST create must 403).

No email hooks — emails are sent by the server action AFTER the row is
written, so admin edits never re-trigger emails and email failures never
lose orders (CLAUDE.md rule 9).

Admin: `useAsTitle: 'orderNumber'`, defaultColumns
`['orderNumber','createdAt','status','totalEurCents','customer.name']`,
default sort `-createdAt`.

## 5. `pages`

`title` (req) · `slug` (unique) · `content` (richText) ·
`status` draft/published (default draft). Renders at `/[pageSlug]`.
Hooks: `revalidateTag('pages')`, `revalidateTag('page-'+slug)`.
Seeded (Phase 7) as drafts: `terms`, `privacy`,
`delivery-payment`, `returns`, `cookies`.

## 6. `media` + global `site-settings` + `users`

**media**: upload collection → R2 (template wiring). Fields: `alt` (text,
**required** — BG label "Алтернативен текст", admin.description explains
SEO/accessibility purpose). Restrict `mimeTypes` to
`image/jpeg,image/png,image/webp`; template's file-size guard ~10 MB. NO
`imageSizes`, NO sharp — sizing is delivery-time via Image Transformations
(ARCHITECTURE §5). Store `width`/`height` if the template captures them
(needed for CLS-free rendering; if the template does not capture
dimensions, Escalate in Phase 2 with options — client-side probe on upload
vs. dimension probe endpoint).

**site-settings** (global): `companyName` (default "Настех ООД") · `eik` ·
`addressLine` · `city` (default "Пловдив") · `phones` array · `email` ·
`workingHours` text · `heroTitle`, `heroSubtitle` · `announcement` text
(optional bar) · `social` group (facebook url, optional). Tag `settings`.

**users**: Payload auth collection. Two accounts (owner, Ivan).
`access.create`: admin-only (no public registration). Login lockout:
template/Payload defaults (maxLoginAttempts 5, lockTime 10 min) kept.

## 7. Search over Cyrillic on SQLite ⚠️

SQLite `LIKE` is case-insensitive for **ASCII only** — `LIKE '%комфорт%'`
will NOT match "КОМФОРТ". Do not rely on DB-side case folding, do not add
FTS5, do not add a search service. The catalog is small; solve it with a
derived column:

- `products.searchText` (hidden) is built in `beforeValidate`:
  `toLowerCase(name + ' ' + items[].name.join(' ') + ' ' + items[].sku.join(' ') + ' ' + (brand?.name ?? ''))`
  (brand name resolved via a shallow fetch when brand is set).
- Query: `searchProducts(q)` lowercases `q` in JS, then Payload `where:
  { and: [{ status: published }, { searchText: { contains: qLower } }] }`,
  limit 30. `contains` maps to `LIKE %…%` — both sides now lowercase, so
  Cyrillic matching works.
- Multi-word queries: split on whitespace, `and` of `contains` per token.
- SKU search works for free (SKUs are in searchText verbatim-lowercased;
  they're digits anyway).

## 8. Query layer — `src/lib/payload/queries.ts` 🔒

The ONLY module that touches Payload for public reads. Every function:
wrapped in the tag cache (ARCHITECTURE §4), filters
`status: published` where applicable, `depth` explicitly set (default 1;
never unbounded), returns typed results (Payload generated types).

```ts
getCategoryTree(): Promise<CategoryNode[]>            // tags: [categories] — full 3-level tree, sorted by sortOrder,name
getCategoryBySlug(slug): Promise<Category | null>     // tags: [categories]
getCategoryPath(id): Promise<Category[]>              // breadcrumbs helper (walks parents; served from tree)
getProductsByCategory(categorySlug, page=1, limit=24) // tags: [products] — includes products of DESCENDANT categories; sorted name asc; returns { docs, totalPages, page }
getProductBySlug(slug): Promise<Product | null>       // tags: [product-<slug>]
getFeaturedProducts(limit=8)                          // tags: [products]
getBrandBySlug(slug) / getProductsByBrand(slug, page) // tags: [brands, products]
getBrandsWithCounts(): BrandWithCount[]               // tags: [brands, products]
  // Brands with ≥1 published product + that count. One payload.count per
  // brand (a handful of brands; COUNT stays cheap as products grow). Tagged
  // with BOTH collections so publishing a product refreshes the numbers.
searchProducts(q): Promise<Product[]>                 // tags: [products] — §7 semantics
getPage(slug): Promise<Page | null>                   // tags: [page-<slug>]
getSettings(): Promise<SiteSettings>                  // tags: [settings]
getAllSlugsForSitemap(): { products; categories; brands; pages } // tags: all
```

"Descendant categories" resolution: compute the ID set from the cached tree
(cheap, in-memory), query `category in [ids]`.

`src/lib/payload/revalidate.ts` exports `revalidateTags(...tags)` used by
all collection hooks (single import point; also no-ops safely during
`pnpm seed:dev` / import scripts via env guard `SKIP_REVALIDATE=1`).

## 9. CSV import contract (Phase 9 — `scripts/import-products.ts`)

Header (exact, UTF-8, comma-separated; template file
`data/import-template.csv` ships 3 example rows):

```
category_slug,brand,product_name,item_name,sku,unit,length_mm,color,price_bgn,price_eur
```

Rules:
- Consecutive rows sharing `product_name` (after trim) merge into ONE
  product with multiple item rows. Non-consecutive same names → validation
  error (forces clean source files).
- Price: exactly one of `price_bgn` / `price_eur` per row. BGN → EUR at
  ÷1.95583, **round half-up to cents** (uses lib/money helpers — единствен
  източник на истина). Column exists because supplier lists and the old
  site are still лв-denominated.
- `unit` must be one of the select values; empty → `бр.`.
- `category_slug` must exist (import does NOT create categories — the tree
  is owner-curated); `brand` created on the fly if missing.
- Upsert key: `sku`. Existing SKU → update its row fields + parent product
  price data; new SKU under existing `product_name` → append item row.
  Products created as `status: draft` (owner reviews prices, then
  publishes — launch-gate item).
- Media: import does NOT handle images (owner/Ivan attach via admin).
- Idempotent: re-running the same file yields zero changes.
- Report → `scripts/import-report.txt`: created/updated/skipped counts +
  row-numbered errors; bad rows never abort the run.
- Run LOCAL first, review report, then against remote per CLOUDFLARE §6
  rules (with `SKIP_REVALIDATE=1`, then one manual revalidate pass — the
  script calls `revalidateTags('products','categories','brands')` once at
  the end when run in-app context, or Ivan touches any product in admin).

## 10. Seed script (`pnpm seed:dev`, Phase 2)

Local-only guard (refuses to run when bindings are remote). Creates:
- The REAL category tree lifted from old nasteh.bg: Мебелен обков (13
  subcategories incl. Дръжки, Панти, Механизми за чекмеджета, …), Механизми
  за вграждане (3), Индивидуални проекти, Плъзгащи системи SEVROLL (9
  systems: COMFORT, GEMINI, IDEA, …) — fill the exact leaf list from the
  live site's menu during implementation.
- Brand SEVROLL.
- 5 sample products incl. one SEVROLL family with a 10-row items table
  (realistic data from the price-table screenshot), one single-item product,
  one out-of-stock item row, one draft product.
- Site-settings with real company data (from old site footer/Контакти).
- An admin user from `.env` (`SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`).
Idempotent (upsert by slug/sku).
