# ARCHITECTURE — LOCKED DECISIONS

Legend: 🔒 locked · 🔁 swappable behind a named seam (the seam is locked, the
implementation may change via Decisions log).

## 0. Product definition

Catalog-first store for furniture fittings. ~60 categories in a 3-level tree
(mirroring the old nasteh.bg PrestaShop taxonomy), a few hundred product
families. A product family's orderable units are **item rows** (SKU + unit +
optional length/color + price). Customers browse, search (incl. by SKU),
fill a cart, and check out with cash-on-delivery — the owner ships via
Econt/Speedy manually using the order email. Owner manages everything
through Payload admin (Bulgarian). Old PrestaShop URLs 301-redirect to new
slugs.

## 1. Platform strategy 🔒

**Self-hosted, containerized.** The client hosts the site on their own
infrastructure; their sysadmin owns the reverse proxy, TLS, DNS, and mail.
We ship a single Docker image — a **Next.js standalone Node server** that
embeds the Payload admin and the storefront — plus a `docker-compose.yml`
describing the full stack. One image, one repo, `docker compose up`.
Persistent state is two Docker volumes: `data` (the SQLite DB file) and
`media` (uploads). The sysadmin's reverse proxy terminates TLS and proxies
to the container on `:3000`.

Rationale for the move off Cloudflare (Ivan, 2026-07-16): the client
requires on-premise/self-managed hosting and their sysadmin operates it.
See Decisions log 2026-07-16.

Approved external dependency: **GitHub** (repo + CI). Order/contact email
leaves the box through whatever authenticated SMTP endpoint the sysadmin
provides for `nasteh.bg` (their own mail server, the domain's mail host, or
a relay) — configured entirely by env, no vendor baked into the code. No
other managed services. If a need arises that seems to require one →
Escalation, not adoption.

**Exit seams** (the same seams that made this migration a re-wire, not a
rewrite — keep them clean): SQL through Payload's adapter only; storage
through Payload's upload plumbing only; image URLs through
`src/lib/images.ts` only; rate limiting through `src/lib/rate-limit.ts`
only; email through `src/emails/send.ts` only. Nothing else in `src/` may
import host-specific APIs (Cloudflare or otherwise).

## 2. Stack 🔒

| Layer | Choice | Pin | Notes |
|---|---|---|---|
| Hosting | **Docker container** — Next.js production server (`next start`) | base `node:24-bookworm-slim` | one image embeds Payload admin + storefront; sysadmin's reverse proxy terminates TLS → proxies to `:3000`. Runtime image keeps prod node_modules + source so `payload migrate` runs on start; `output:'standalone'` deferred (it complicates the in-image migrate step) |
| Framework | Next.js App Router | 15.4.x | Next 16 = deliberate post-launch decision via Decisions log. |
| CMS | Payload | 3.82.x (v3 line) | **Payload 4 beta forbidden** (no GA, no migration guide; revisit post-launch after v4 GA). 3.85.2 upgrade attempted then reverted — broke `/admin` (RSC serialization). |
| Database | **SQLite** on a mounted volume | `@payloadcms/db-sqlite` (libSQL) | `DATABASE_URI=file:/app/data/nasteh.db`. Single writer / single instance — correct for one self-hosted box. Backups = copy the file (or Litestream). Migrated from D1 (same SQLite dialect). Caveats: DATA-MODEL §Search |
| Media storage | **Local disk** on a mounted volume | Payload default disk adapter | originals on the `media` volume; no object store. See §5 |
| Image sizing | **Payload + sharp** (native, at upload) | `sharp` | sharp runs on Node (unlike Workers) → Payload generates sized variants at upload; served via the app's media route. No `/cdn-cgi/image/` |
| Rate limiting | **in-memory fixed-window counter** | — | single instance; behind `src/lib/rate-limit.ts` seam. No KV, no Redis |
| Anti-bot | Cloudflare Turnstile | — | KEPT — a free, server-agnostic API (siteverify over HTTPS); checkout + contact forms |
| Styling | Tailwind CSS | 4.x | tokens in §8 |
| Cart state | zustand + persist(localStorage) | 5.x | client-only; SSR-safe hydration per CONVENTIONS |
| Validation | zod | 3.x | every boundary |
| Email | **SMTP** (nodemailer) | `nodemailer` | env-configured transport → the domain's authenticated SMTP endpoint; sends as `orders@nasteh.bg`. No transactional SaaS. Plain HTML templates in `src/emails/` |
| Tests | vitest | 4.x | `src/lib/**` pure logic |
| CI | GitHub Actions | — | typecheck+lint+test on push/PR |
| Language | TypeScript strict | 6.x | |
| Package manager | pnpm | 11.x | |

Explicitly rejected (do not reintroduce): Express/separate API server; Neon
or any external Postgres SaaS; Redis/Upstash (see §6); Cloudinary and all
third-party image CDNs; Stripe and every payment SDK (out of scope);
Econt/Speedy APIs (out of scope); next-intl/i18n routing (single locale);
Prisma (Payload owns the DB); localStorage libraries beyond zustand/persist.

Removed in the 2026-07-16 self-host move (do not reintroduce without an
Escalation): `@opennextjs/cloudflare`, `wrangler`, `@payloadcms/db-d1-sqlite`,
`@payloadcms/storage-r2`; Cloudflare Workers / D1 / R2 / KV / Image
Transformations / Turnstile-as-infra; **Resend** (superseded by SMTP).

## 3. Runtime & topology

```
Browser ──▶ sysadmin reverse proxy (nginx/Caddy — TLS termination)
             └─ app container :3000  (Next 15 `next start` + Payload)
                  ├─ static assets (served by Next)
                  ├─ /api/media/*  → sized image variants from the `media` volume
                  ├─ RSC pages     → query layer → Payload local API → SQLite (`data` volume)
                  ├─ /admin/*      → Payload admin (auth: Payload users)
                  └─ server actions (checkout, contact) → SQLite + in-memory rate limit + SMTP
```

One container, one repo, one deploy. Persistent state = two Docker volumes:
`data` (SQLite DB file) and `media` (uploads). Configuration is a single
`.env` file the sysadmin manages on the host — no bindings, no cloud secret
store (§11). Schema migrations run on container start
(`payload migrate && next start`).

## 4. Caching 🔒 — and why there is no Redis

Content changes only when the owner edits it (single writer, low frequency).
Therefore:

- Every public read goes through named functions in
  `src/lib/payload/queries.ts`, wrapped in Next's tag-based cache
  (`unstable_cache(fn, keyParts, { tags })` — or the stable equivalent if
  the pinned Next minor has one; check ONCE at Phase 1, log the choice,
  use it uniformly).
- Cache tags: `categories`, `products`, `product-<slug>`, `pages`,
  `page-<slug>`, `settings`, `brands`.
- Payload hooks (`afterChange`, `afterDelete`) revalidate the relevant tags
  (DATA-MODEL §Hooks). Slug changes revalidate BOTH old and new slug tags.
- Result: catalog pages are cached in-process between edits; a product edit
  propagates in seconds; SQLite sees near-zero read traffic from browsing.
- Cart is client state. Orders are uncached writes. Admin is uncached.
- Adding an external cache layer (Redis, a separate KV service) is
  prohibited — it solves nothing on a single-instance deploy and creates
  invalidation bugs.
- NOTE (2026-07-16): the storefront currently runs `export const dynamic =
  'force-dynamic'` (added when the Workers deploy had no incremental-cache
  infra) so CMS edits show live. On a single Node container the tag-cache
  above is straightforward to re-enable; revisit alongside the redesign.

## 5. Images 🔒

- Admin uploads land on the `media` **disk volume** via Payload's upload
  collection (`media`, `upload.staticDir`). Enforce upload sanity in the
  collection config: images only (jpeg/png/webp), max ~10 MB.
- All rendering goes through `src/lib/images.ts`, which returns an absolute
  URL to the app's own media route:

```ts
type Preset = 'thumb' | 'card' | 'detail' | 'zoom' | 'og';
// nominal widths: 160  480  1024  1920  1200
export function imageUrl(media: MediaDoc, preset: Preset): string
// → https://<site>/api/media/file/<filename>  (served by the app from the media volume)
export function imageSrcSet(media: MediaDoc, presets: Preset[]): string
```

- Absolute (not relative) URLs so the one helper serves `<img>`, OG tags, and
  JSON-LD (crawlers need full URLs). The sysadmin's reverse proxy fronts and
  caches the media route.
- **Current state (2026-07-16):** `imageUrl` returns the uploaded **original**
  for every preset — no external transformer, no `/cdn-cgi/image/`. Responsive
  sized variants (`upload.imageSizes` + **sharp**, which runs on Node now, so
  it's easy) are a **redesign-time optimization**, deferred so the storage
  cutover stays small and the redesign owns image rendering.
- `next/image` stays avoided in favor of plain `<img srcSet>` (Decisions log
  2026-07-09).
- LCP discipline: covers carry explicit width/height (from stored media
  dimensions) to prevent CLS.

## 6. Money 🔒

- Storage: `priceEurCents: integer`, VAT-inclusive retail. EUR only. BGN is
  NEVER stored.
- `src/lib/money.ts` is the only formatter:

```ts
export const BGN_PER_EUR = 1.95583; // fixed by law — never a config value
export function formatEur(cents: number): string        // "31,14 €"
export function bgnCentsFromEurCents(c: number): number // round HALF-UP
export function formatBgn(cents: number): string        // "60,91 лв."
export function formatPrice(cents: number): string
// SHOW_BGN=true  → "31,14 € (60,91 лв.)"
// SHOW_BGN=false → "31,14 €"
```

- `NEXT_PUBLIC_SHOW_BGN` env flag (string 'true'/'false'). Bulgaria's
  mandatory dual display ends **2026-08-08** — decommission = flip the flag
  and redeploy. No migration, no code change.
- Formatting: `Intl.NumberFormat('bg-BG', …)` — comma decimal separator,
  space thousands.
- Totals: `lineTotal = unitPriceEurCents × qty` (integers); order total =
  sum of line totals. Computed server-side from DB prices at order time and
  snapshotted onto the order. Client-supplied prices are display-only and
  never trusted.
- Tests must cover half-up rounding at boundary values (see PHASES 3).

## 7. Security 🔒

- **Checkout & contact server actions**, in order: honeypot check (silent
  fake-success on trip) → zod parse → Turnstile server-side verify →
  in-memory rate limit (key `rl:order:<ip>`, window 10 min, max 5; contact:
  max 3) → business logic. Rejections return typed errors with BG messages
  (UI-SPEC §Copy). The counter is per-instance; on a single container that
  is the whole surface. Fails open only if the limiter errors — Turnstile is
  the hard gate.
- Payload access control: `users` = owner + Ivan only, no public
  registration. Public read: products (published only), categories, brands,
  pages, media, settings. `orders`: NO public access of any kind via
  REST/GraphQL; created exclusively through the local API inside the server
  action; read/update admin-only.
- Draft products: excluded from all public queries at the query-layer level
  (`where: { status: { equals: 'published' } }`) — not per-page.
- Headers via next.config: `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`,
  minimal `Permissions-Policy`. No CSP in v1 (Payload admin makes strict
  CSP a project of its own — post-launch item).
- Order emails must not leak into logs; log order numbers, never full
  customer payloads.
- GDPR posture: personal data lives only in `orders`; privacy policy page
  reflects that; no analytics/marketing cookies in v1 → cookie bar is
  informational (UI-SPEC).

## 8. Design system 🔒

Client brief: light beige / cream, elegant (permo.it register). Ground it in
the обков world — aluminium, steel, brass, wood — NOT the generic warm-cream
+ terracotta AI default.

Tokens (Tailwind v4 `@theme`):

```css
--color-cream:  #F6F3EC;  /* page background */
--color-sand:   #EAE4D6;  /* panels, table header, footer bg */
--color-ink:    #23211D;  /* primary text */
--color-steel:  #6E7378;  /* secondary text, borders, metal accents */
--color-brass:  #8A6D3B;  /* interactive accent (AA on cream — verified in Phase 4) */
--color-ok:     #3E6B4F;  /* success, in-stock */
--color-danger: #8C3B2E;  /* errors, destructive */
```

Type: display face for h1/h2 only — a characterful serif/semi-serif WITH
FULL CYRILLIC (verify glyph coverage before adopting; this is a hard gate);
body/UI — clean grotesk with Cyrillic; `font-variant-numeric: tabular-nums`
on every price and every items-table cell. Load via `next/font` with
`cyrillic` subset explicitly included.

Signature element: the **items/price table** on product pages. Spend all
boldness there (generous rows, sticky header, monospace SKU, satisfying
qty steppers, row-level add feedback); keep everything else quiet. Full
interaction spec in UI-SPEC §Product.

Quality floor (non-negotiable): responsive to 375px; visible focus rings;
`prefers-reduced-motion` respected; WCAG AA contrast; touch targets ≥44px
in the table and cart controls.

## 9. SEO 🔒

- `generateMetadata` on every route: BG titles ("<Продукт> | Настех —
  мебелен обков"), descriptions, canonicals, OG image (product cover via
  `og` preset).
- `sitemap.ts` (published products, categories, brands, pages) + `robots.ts`
  (allow all; disallow `/admin`, `/cart`, `/checkout`).
- JSON-LD: `Product` with `offers` per item row (price in EUR, availability
  from `inStock`), `BreadcrumbList` on category/product, `LocalBusiness`
  (from settings) on the contact page.
- **301 map from PrestaShop URLs.** `data/redirects.csv`
  (`old_path_or_query,new_path`) → loaded by `middleware.ts` (query-string
  URLs like `/index.php?id_product=36` can't use next.config redirects —
  middleware matches on pathname+searchParams). Populated during content
  entry; spot-check gate in Phase 10.
- Slugs: `src/lib/slug.ts` transliterates Bulgarian Cyrillic
  (ъ→a, ж→zh, ч→ch, ш→sh, щ→sht, ю→yu, я→ya, ц→ts, х→h …), lowercase,
  hyphenated, unique-validated per collection.

## 10. Compliance (BG) 🔒

- Five legal pages via the `pages` collection: Общи условия · Политика за
  поверителност · Доставка и плащане · Право на отказ (14 дни) · Бисквитки.
  Ivan drafts (adapting the old site's Условия/Доставка pages + standard
  templates); pages stay `draft` until the client approves — a Phase 10
  launch-gate checkbox.
- Distance-selling obligations (ЗЗП): order confirmation email must include
  seller identification, order contents with prices, delivery method, and
  reference to the right of withdrawal. Baked into the email template spec
  (UI-SPEC §Emails).
- Footer: company name, ЕИК, address, phone, email (from settings global) —
  legally required identification, not decoration.
- Dual EUR/BGN display until 2026-08-08 (§6).

## 11. Environments & secrets

- No `wrangler.jsonc`, no cloud secret store. Configuration is a single
  `.env` file (gitignored) mirrored by `.env.example`. In production the
  sysadmin owns the host `.env`, readable only by the container.
- `.env` (and `.env.example`) keys:

```
NODE_ENV=production
PAYLOAD_SECRET=
DATABASE_URI=file:/app/data/nasteh.db
NEXT_PUBLIC_SITE_URL=https://nasteh.bg
NEXT_PUBLIC_SHOW_BGN=true          # flip to false on 2026-08-08 (§6)
# Email — authenticated SMTP endpoint for the domain (sysadmin-provided):
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=Настех <orders@nasteh.bg>
ORDER_INBOX_EMAIL=
# Anti-bot (Turnstile — kept):
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
```

- `NEXT_PUBLIC_*` are build-time (compiled into the client bundle); the rest
  are read at runtime by the Node server. The image is built once; the
  sysadmin supplies the `.env` at `docker compose up`.
- Deliverability (SMTP) is the sysadmin's to arrange for `nasteh.bg`: SPF,
  DKIM, DMARC (+ PTR / unblocked port 25 if they run their own MTA). The app
  is a plain SMTP client — it works against whatever endpoint they point it
  at. No `NEXT_PUBLIC_MEDIA_HOST` (media is served by the app).

## 12. Repository layout 🔒

```
├── CLAUDE.md  PROGRESS.md
├── docs/                      # this documentation set
├── data/
│   ├── import-template.csv    # 3 example rows, header contract
│   └── redirects.csv          # old PrestaShop → new paths
├── scripts/
│   ├── import-products.ts     # Phase 9
│   └── seed-dev.ts            # Phase 2
├── src/
│   ├── app/
│   │   ├── (site)/
│   │   │   ├── layout.tsx  page.tsx  not-found.tsx  error.tsx
│   │   │   ├── category/[...slug]/page.tsx
│   │   │   ├── product/[slug]/page.tsx
│   │   │   ├── brand/[slug]/page.tsx
│   │   │   ├── search/page.tsx
│   │   │   ├── cart/page.tsx
│   │   │   ├── checkout/page.tsx  checkout/success/page.tsx
│   │   │   ├── contact/page.tsx
│   │   │   └── [pageSlug]/page.tsx        # legal/static pages
│   │   └── (payload)/                     # template-generated admin+api
│   ├── collections/           # one file per collection + globals/
│   ├── components/
│   │   ├── ui/                # primitives (Button, Input, Price, …)
│   │   ├── layout/            # Header, Footer, MegaMenu, MobileNav
│   │   ├── catalog/           # ProductCard, ItemsTable, Gallery, …
│   │   └── cart/              # CartSheet/badge, CheckoutForm, …
│   ├── lib/
│   │   ├── money.ts  slug.ts  images.ts  rate-limit.ts
│   │   ├── i18n/bg.ts
│   │   ├── cart/store.ts  cart/totals.ts
│   │   ├── payload/queries.ts  payload/revalidate.ts
│   │   └── validation/checkout.ts  validation/contact.ts
│   ├── actions/order.ts  actions/contact.ts
│   ├── emails/order-owner.tsx  order-customer.tsx  contact-owner.tsx
│   └── middleware.ts          # redirect map
├── Dockerfile  docker-compose.yml  .dockerignore
├── next.config.ts
└── .env.example
```

Deviating from this layout (new top-level dirs, relocated seams) requires a
Decisions-log entry.
