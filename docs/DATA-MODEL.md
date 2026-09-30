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
| `minPriceEurCents` | number | `admin.hidden: true`, indexed | derived in `beforeValidate` as `MIN(items[].priceEurCents)`. Payload cannot sort on an array subfield, so this is the sort key for price ordering. NULL when a product has no items. |
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
getProductsByCategory(slug, page, limit, sort, brand) // includes DESCENDANT categories
  // via collectSubtreeIds(). BOTH `sort` and `brand` are part of the cache
  // key — omitting either serves a cached page from a different view.
  // An unknown brand slug returns nothing rather than the unfiltered list.
getBrandsInCategory(slug): BrandWithCount[]           // tags: [products, categories, brands]
  // Brands present in that category's subtree, counted over the SAME id set
  // the listing uses, so chip counts always match the filtered result.
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
`pnpm seed:dev` via env guard `SKIP_REVALIDATE=1`).

## 9. JSON product import (admin → Продукти → „Импорт от JSON")

Replaces the Phase-9 CSV script, which never ran (see PROGRESS Decisions log
2026-09-24). Owner-facing: no shell, no sysadmin. Code: `src/lib/import/`
(contract, run, endpoints, fetch-image, public-address) +
`src/components/admin/import/`.

File: UTF-8 JSON **array** of records, ≤ 2000 rows, ≤ 5 MB.

| Key | Required | Rule |
|---|---|---|
| `sku` | yes | text (a number is accepted with a leading-zeros warning); trimmed; ≤ 64 chars; unique within the file |
| `name` | yes | product name AND its single item-row name |
| `category` | yes | name path `"Root > Child > Leaf"`, 1–3 levels. Matched case/whitespace-insensitively from the root; **missing levels are created** |
| `price` | yes | final, VAT-inclusive EUR (number, or text with `.`/`,`). Parsed from the decimal string (`eurCentsFromDecimal`); > 2 decimals rounded half-up with a warning |
| `currency` | no | if present must be `EUR` |
| `stock` | no | whole number; negative → 0 with a warning; missing → 0 on create, untouched on update |
| `brand` | no | matched by name, created if missing |
| `description` | no | plain text → full Lexical state, one paragraph per line |
| `image_url` | no | http(s); a bad link only skips the picture |
| `unit` / `color` | no | unit must be `бр.`/`м`/`компл.`/`чифт` (never coerced) |

Unknown keys are listed in the preview and ignored.

Semantics (Ivan, 2026-09-24):
- **One record = one product with one item row.** No family grouping.
- **Upsert key: `sku`.** New SKU → complete product, `status: draft`.
  Existing SKU → **only that item row's price and stock** change, plus a
  picture if the product has none. Name, description, category, brand,
  gallery and status belong to the owner once the product exists.
- Flow: preview (server-side, read-only) → the browser applies ONE row per
  request (no request outlives the proxy timeout; a closed tab leaves a
  clean prefix and re-running the same file finishes it — idempotent).
  Writes happen inside Next route handlers, so the normal afterChange
  revalidation keeps storefront + checkout prices current.
- Images: downloaded server-side through an SSRF guard (public unicast IPs
  only, DNS checked at connect, ports 80/443, ≤ 4 re-checked redirects, 20 s,
  15 MB, decoded by sharp before storing; AVIF/GIF/TIFF → WebP). **Bot
  protection is never bypassed** — a blocked download is reported on the row
  with a manual „Качи снимка" upload. Rows sharing one `image_url` share one
  media doc within a run.
- Every preview (and every image save) first probes that the media folder is
  writable (`media-storage.ts`); if not, the screen names the OS error
  (EACCES/ENOSPC…) and the folder, and a failed save is reported as
  `storeFailed` — never as „not an image" (DEPLOY §9).
- New categories are visible in the storefront menu immediately (categories
  have no draft state) — the preview says so.

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
