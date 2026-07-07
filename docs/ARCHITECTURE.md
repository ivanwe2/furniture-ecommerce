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

**All-in Cloudflare.** One account (client-owned email), one dashboard, one
bill. Workers **Paid plan ($5/mo)** from day one — buys headroom on CPU
time, bundle size, D1/KV/R2 quotas, and removes the free-tier commercial
ambiguity entirely.

Approved external exceptions: **Resend** (transactional email — Cloudflare
has no outbound transactional email product) and **GitHub** (repo + CI).
Everything else lives in Cloudflare. If a need arises that seems to require
another vendor → Escalation, not adoption.

**Exit seams** (kept clean so a future platform switch is a re-deploy, not a
rewrite): SQL through Payload's adapter only; storage through Payload's
upload plumbing only; image URLs through `src/lib/images.ts` only; rate
limiting through `src/lib/rate-limit.ts` only. Nothing else in `src/` may
import Cloudflare-specific APIs.

## 2. Stack 🔒

| Layer | Choice | Pin | Notes |
|---|---|---|---|
| Hosting | Cloudflare Workers (Paid) | — | via OpenNext adapter, from the **official Payload-on-Workers template** |
| Framework | Next.js App Router | 15.4.x (as shipped by template) | The template is the tested Next+Payload+OpenNext combination — do not hand-upgrade. Next 16 = deliberate post-launch decision via Decisions log. |
| Adapter | `@opennextjs/cloudflare` | latest at scaffold | freeze exact version in Decisions log |
| CMS | Payload | 3.85+ (v3 line) | **Payload 4 beta forbidden** (no GA, no migration guide; revisit post-launch after v4 GA) |
| Database | **Cloudflare D1** (SQLite) | template's adapter (`@payloadcms/db-d1-sqlite` family) | native binding, zero egress, one vendor. SQLite caveats: DATA-MODEL §Search, §Migrations in CLOUDFLARE.md |
| Media storage | Cloudflare R2 | template's storage wiring | originals only — see §5 Images |
| Image sizing | **Cloudflare Image Transformations** | — | `/cdn-cgi/image/…` URLs; sharp does NOT run on Workers (native binary) |
| Rate limiting | Workers KV counter | — | behind `src/lib/rate-limit.ts` seam |
| Anti-bot | Cloudflare Turnstile | — | checkout + contact forms |
| Styling | Tailwind CSS | 4.x | tokens in §8 |
| Cart state | zustand + persist(localStorage) | 5.x | client-only; SSR-safe hydration per CONVENTIONS |
| Validation | zod | 3.x | every boundary |
| Email | Resend | — | React Email or plain HTML templates in `src/emails/` |
| Tests | vitest | 2.x | `src/lib/**` pure logic |
| CI | GitHub Actions | — | typecheck+lint+test+build on push/PR |
| Language | TypeScript strict | 5.x | |
| Package manager | pnpm | 9.x | |

Explicitly rejected (do not reintroduce): Express/separate API server; Neon
or any external Postgres (superseded by D1); Redis/Upstash (see §6);
Cloudinary and all third-party image CDNs (superseded by CF Images); Stripe
and every payment SDK (out of scope); Econt/Speedy APIs (out of scope);
next-intl/i18n routing (single locale); Prisma (Payload owns the DB);
localStorage libraries beyond zustand/persist.

## 3. Runtime & topology

```
Browser ──▶ Cloudflare edge
             ├─ static assets (Workers Assets — no invocation cost)
             ├─ /cdn-cgi/image/*  → Image Transformations → R2 original
             └─ Worker (Next 15 server via OpenNext)
                  ├─ RSC pages  → query layer → Payload local API → D1
                  ├─ /admin/*   → Payload admin (auth: Payload users)
                  ├─ server actions (checkout, contact) → D1 + KV + Resend
                  └─ ISR/tag cache → R2 incremental cache (OpenNext binding)
```

One Worker, one repo, one deploy. Bindings (exact names in CLOUDFLARE.md):
D1 database, R2 media bucket, R2 incremental-cache bucket (template-managed),
KV namespace for rate limiting, Turnstile secret, Resend key.

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
- Result: catalog pages are cached at the edge between edits; a product
  edit propagates in seconds; D1 sees near-zero read traffic from browsing.
- Cart is client state. Orders are uncached writes. Admin is uncached.
- Adding any additional cache layer (KV for pages, Redis, in-memory maps
  used across requests) is prohibited — it solves nothing here and creates
  invalidation bugs. KV's one approved job is rate-limit counters.

## 5. Images 🔒

- Admin uploads land as **originals** in R2 via Payload's upload collection
  (`media`). No sharp, no size generation at upload (impossible on Workers).
  Enforce upload sanity in the collection config: images only
  (jpeg/png/webp), max ~10 MB (owner-friendly guardrail).
- R2 media bucket is exposed on `media.nasteh.bg` (custom domain on the
  same CF zone — required for transformations; setup in CLOUDFLARE.md).
- All rendering goes through `src/lib/images.ts`:

```ts
type Preset = 'thumb' | 'card' | 'detail' | 'zoom' | 'og';
// widths:   160      480     1024       1920    1200 (og: fixed 1200×630 crop)
export function imageUrl(media: MediaDoc, preset: Preset): string
// → https://media.nasteh.bg/cdn-cgi/image/width=480,format=auto,quality=82,fit=scale-down/<r2-key>
export function imageSrcSet(media: MediaDoc, presets: Preset[]): string
```

- `format=auto` negotiates webp/avif per browser. `fit=scale-down` never
  upscales.
- `next/image` is used with a custom loader that delegates to `images.ts`
  (single source of truth), or plain `<img srcSet>` where next/image fights
  the platform — pick ONE approach in Phase 4, log it, apply uniformly.
- Quota realism: transformations bill per unique transformation URL per
  month, cached thereafter. ~500 images × 5 presets = 2,500 uniques —
  monitor in dashboard during Phase 10; if a paid overage ever appears it
  is cents, but log it.
- LCP discipline: category/product covers use `card`/`detail` presets with
  explicit width/height (from stored media dimensions) to prevent CLS.

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
  fake-success on trip) → zod parse → Turnstile server-side verify → KV
  rate limit (key `rl:order:<ip>`, window 10 min, max 5; contact: max 3) →
  business logic. Rejections return typed errors with BG messages
  (UI-SPEC §Copy).
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
  (allow all; disallow `/admin`, `/kolichka`, `/poruchka`).
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

- `wrangler.jsonc` (bindings, vars) is committed; secrets are NOT.
- Local: `.dev.vars` (gitignored) mirrors `.dev.vars.example`:

```
PAYLOAD_SECRET=
RESEND_API_KEY=
TURNSTILE_SECRET_KEY=
ORDER_INBOX_EMAIL=
```

- Public (committed as wrangler `vars` / NEXT_PUBLIC): `NEXT_PUBLIC_SITE_URL`,
  `NEXT_PUBLIC_SHOW_BGN`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`,
  `NEXT_PUBLIC_MEDIA_HOST=media.nasteh.bg`.
- Production secrets: `wrangler secret put <NAME>` on the client-owned
  Cloudflare account. Full inventory + who-holds-what: CLOUDFLARE.md §Secrets.

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
│   │   │   ├── kategoria/[...slug]/page.tsx
│   │   │   ├── produkt/[slug]/page.tsx
│   │   │   ├── marka/[slug]/page.tsx
│   │   │   ├── tarsene/page.tsx
│   │   │   ├── kolichka/page.tsx
│   │   │   ├── poruchka/page.tsx  poruchka/uspeshna/page.tsx
│   │   │   ├── kontakti/page.tsx
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
├── wrangler.jsonc  open-next.config.ts  next.config.ts
└── .dev.vars.example
```

Deviating from this layout (new top-level dirs, relocated seams) requires a
Decisions-log entry.
