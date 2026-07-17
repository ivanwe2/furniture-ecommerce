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

**Self-hosted, containerized — a fully separated multi-service stack.** The
client hosts the site on their own infrastructure; their sysadmin owns the
reverse proxy, TLS, and DNS. We ship a `docker-compose.yml` describing the
whole stack, each concern in its own container:

- **app** — a Next.js production Node server that embeds the Payload admin +
  storefront (`:3000`, loopback-published behind the sysadmin's proxy).
- **db** — PostgreSQL (persistent volume `pgdata`).
- **redis** — Redis for the rate-limit store (and future shared cache).
- **mail** — a send-only Postfix relay that signs with DKIM and delivers the
  order/contact notifications for `nasteh.bg`.

Persistent state = named volumes: `pgdata` (Postgres), `media` (uploads),
`maildata` (mail spool/keys). Everything runs on an internal Docker network;
only the app's `:3000` is exposed (to the reverse proxy). `docker compose up`.

Rationale for the move off Cloudflare (Ivan, 2026-07-16): the client requires
on-premise/self-managed hosting. Rationale for the fully-separated stack over
the earlier single-container / SQLite / in-memory design (Ivan, 2026-07-17):
the client wants each concern in its own container for isolation and
future-proofing, accepts the extra ops, and self-hosts so has the resources.
See Decisions log 2026-07-16 + 2026-07-17.

Approved external dependency: **GitHub** (repo + CI). Order/contact email is
generated and delivered inside the stack by the **mail** relay (DKIM-signed);
its DNS (SPF/DKIM/DMARC + PTR/reverse-DNS on the host IP) is the sysadmin's to
publish for deliverability, and a `RELAYHOST` smarthost is supported via env
for hosts where direct outbound `:25` is blocked. No managed cloud services;
self-hosted service containers are the design, not an exception. If a need
arises that seems to require a *managed / SaaS* dependency → Escalation.

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
| Database | **PostgreSQL 18** in the `db` container | `postgres:18-alpine` · `@payloadcms/db-postgres` | `DATABASE_URI=postgres://…@db:5432/nasteh`. Own container + `pgdata` volume. Migrations are Postgres-dialect (the old SQLite/D1 migration was regenerated). Backups = `pg_dump` (§ backups). Swapped from SQLite 2026-07-17 |
| Media storage | **Local disk** on a mounted volume | Payload default disk adapter | originals + sized variants on the `media` volume; no object store. See §5 |
| Image sizing | **Payload + sharp** (native, at upload) | `sharp` | sharp runs on Node → Payload generates responsive sized variants **as WebP** at upload; served via the app's media route. No `/cdn-cgi/image/`, no image CDN |
| Rate limiting | **Redis** fixed-window counter | `ioredis` + `redis` container | behind `src/lib/rate-limit.ts` seam; `REDIS_URL=redis://redis:6379`. In-memory fallback if Redis is unreachable so a Redis blip never blocks orders |
| Anti-bot | **Altcha** (self-hosted proof-of-work) | `altcha-lib` + `altcha` widget | replaces Turnstile — server issues an HMAC challenge, the browser solves a PoW, the server verifies locally. No external calls, no keys/account. Checkout + contact forms |
| Styling | Tailwind CSS | 4.x | tokens in §8 |
| Cart state | zustand + persist(localStorage) | 5.x | client-only; SSR-safe hydration per CONVENTIONS |
| Validation | zod | 3.x | every boundary |
| Email | **SMTP** (nodemailer) → in-stack **mail** relay | `nodemailer` + Postfix `mail` container | app talks SMTP to the `mail` service on the internal network (`SMTP_HOST=mail`, no auth); Postfix signs DKIM and delivers directly (or via `RELAYHOST`). Sends as `orders@nasteh.bg`. No transactional SaaS. Templates in `src/emails/` |
| Tests | vitest | 4.x | `src/lib/**` pure logic |
| CI | GitHub Actions | — | typecheck+lint+test on push/PR |
| Language | TypeScript strict | 6.x | |
| Package manager | pnpm | 11.x | |

Explicitly rejected (do not reintroduce): Express/separate API server; Neon /
Upstash / any **managed** DB-or-cache SaaS (self-hosted Postgres + Redis
*containers* are the design — §1); Cloudinary and all third-party image CDNs;
Stripe and every payment SDK (out of scope); Econt/Speedy APIs (out of scope);
next-intl/i18n routing (single locale); Prisma (Payload owns the DB);
localStorage libraries beyond zustand/persist.

Removed off Cloudflare (2026-07-16) — do not reintroduce: `@opennextjs/
cloudflare`, `wrangler`, `@payloadcms/db-d1-sqlite`, `@payloadcms/storage-r2`;
Cloudflare Workers / D1 / R2 / KV / Image Transformations; **Resend**
(superseded by SMTP). Removed in the 2026-07-17 multi-service move:
`@payloadcms/db-sqlite` (→ `db-postgres`); **Cloudflare Turnstile** + its keys
(→ self-hosted Altcha); the in-memory-only rate limiter (→ Redis, with
in-memory only as a fallback).

## 3. Runtime & topology

```
Browser ─▶ sysadmin reverse proxy (nginx/Caddy — TLS termination)
            └─ app :3000  (Next 15 `next start` + Payload)
                 ├─ static assets (served by Next)
                 ├─ /api/media/*  → WebP sized variants from the `media` volume
                 ├─ RSC pages     → query layer → Payload local API ─┐
                 ├─ /admin/*      → Payload admin (Payload users)    │
                 ├─ /api/altcha   → Altcha challenge (HMAC)          │
                 └─ server actions (checkout, contact):             │
                      Altcha verify · rate limit ─▶ redis:6379      │
                      order write ────────────────────────────────▶ db:5432 (Postgres)
                      email ─▶ mail:587 (Postfix → DKIM → deliver)  │
   internal docker network ────────────────────────────────────────┘
```

Multi-service `docker-compose` on an internal network. Persistent state =
three Docker volumes (`pgdata` = Postgres, `media` = uploads, `maildata` =
mail spool/DKIM keys); only `app:3000` is exposed (to the reverse proxy).
Configuration is a single `.env` file the sysadmin manages on the host — no
bindings, no cloud secret store (§11). The app waits for Postgres to be
healthy, then runs schema migrations on start (`payload migrate &&
next start`).

## 4. Caching 🔒 — content cache is in-process; Redis is for rate limiting

Content changes only when the owner edits it (single writer, low frequency),
so **page/content caching stays in-process (Next's tag cache), not Redis** —
Redis in this stack backs the *rate-limit* store (§2), not the content cache.
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
  propagates in seconds; Postgres sees near-zero read traffic from browsing.
- Cart is client state. Orders are uncached writes. Admin is uncached.
- Redis is present (own container) but is **not** the content cache — it is
  the rate-limit store only (`src/lib/rate-limit.ts`). Routing the Next tag
  cache through Redis would only matter with multiple app replicas; until
  then it stays in-process to avoid invalidation bugs.
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
  fake-success on trip) → zod parse → Altcha proof-of-work verify →
  Redis rate limit (key `rl:order:<ip>`, window 10 min, max 5; contact:
  max 3) → business logic. Rejections return typed errors with BG messages
  (UI-SPEC §Copy). The limiter is Redis-backed (shared) with an in-memory
  fallback, so a Redis blip fails open rather than blocking orders — Altcha is
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

## 8. Design system 🔒 — redesign 1A (Editorial), from 2026-07-16

Direction (Ivan handoff "Nasteh Redesign"): **editorial / airy** — light warm
surfaces, an engineering-drawing motif (faint grids, ruler ticks, bronze
dimension callouts), mono-uppercase technical labels, and a brushed-metal 3D
cabinet hinge as the hero centerpiece. **Square corners everywhere** (zero
border-radius; genuine circles like status dots excepted). Ground it in the
обков world — hinges, steel, brass, engineering drawings — NOT the generic
warm-cream + terracotta AI default. **"1A everywhere"**: the editorial
treatment applies to every storefront page (the darker "industrial" 1B
direction is NOT built). Logo is the stylized **HACTEX** wordmark
(`public/logos/*`); text content stays Настех / NASTEH.BG.

Tokens (Tailwind v4 `@theme` in `(site)/globals.css`):

```
surfaces   --color-cream #F5F1E8 (page) · --color-raised #FBF9F3 (cards)
           --color-sand #EBE3D3 (warm panels) · --color-dark #221E19
text/light --color-ink #211D18 · --color-ink2 #5C5548 · --color-steel #6E665A
text/dark  --color-on-dark #C9BFA9 · -bright #EFE9DC · -muted #A79E8B
accent     --color-brass #A9803F (brand) · -dark #8C5E2A (accent text on light)
           -light #B0824A (on dark) · --color-bronze #BE8C4C (callouts/3D)
semantic   --color-ok #3E6B4F · --color-danger #8C3B2E
hatch      --color-hatch-1 #EAE2D2 · --color-hatch-2 #E2D8C4 (image placeholders)
```
The radius scale is zeroed in `@theme` so every `rounded-*` renders square.
Hairlines: `rgba(34,30,25,0.12–0.28)` on light; `rgba(239,233,220,0.12–0.34)`
on dark. Card/frame shadow: `0 30px 80px rgba(34,30,25,0.14)` — no other shadows.

Type (self-hosted via `next/font/google`, `cyrillic` subset — hard gate, the
whole UI is Bulgarian):
- **Golos Text** (400–700) — body AND headings. Headings weight 600 with
  negative tracking (−0.02 to −0.03em).
- **IBM Plex Mono** (400–600) — the signature device: ALL eyebrows, nav,
  badges, stat rows, footer column heads, prices and spec values are mono +
  UPPERCASE, letter-spacing 0.06–0.2em. `font-variant-numeric: tabular-nums`
  on every price and items-table cell.
- Manrope (the 1B display face) is intentionally NOT used.

Signature elements: (1) the **mono-uppercase technical label** treatment, used
throughout; (2) the **WebGL hinge hero** (Three.js, brushed-metal PBR,
assemble/explode + open/close loop) over an engineering overlay — lazy-loaded,
homepage only, with a reduced-motion / no-WebGL static fallback; (3) the
**items/price table** on product pages (generous rows, monospace SKU,
tabular-nums, square). Spend boldness there; keep everything else quiet.

Quality floor (non-negotiable): responsive to 375px; visible focus rings;
`prefers-reduced-motion` respected (incl. the hinge → static fallback); WCAG AA
contrast (accent *text* on light uses `brass-dark`, not `brass`); touch targets
≥44px in the table and cart controls.

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
PAYLOAD_SECRET=
DATABASE_URI=postgres://nasteh:<pw>@db:5432/nasteh
POSTGRES_USER=nasteh                # db container init (must match DATABASE_URI)
POSTGRES_PASSWORD=
POSTGRES_DB=nasteh
REDIS_URL=redis://redis:6379        # rate-limit store
MEDIA_DIR=/app/media
NEXT_PUBLIC_SITE_URL=https://nasteh.bg
NEXT_PUBLIC_SHOW_BGN=true           # flip to false on 2026-08-08 (§6)
ALTCHA_HMAC_KEY=                    # self-hosted anti-bot (no external service)
# Email — the app relays through the in-stack `mail` service:
SMTP_HOST=mail
SMTP_PORT=587
SMTP_USER=                          # empty = no-auth internal relay
SMTP_PASS=
EMAIL_FROM=Настех <orders@nasteh.bg>
ORDER_INBOX_EMAIL=
MAIL_HOSTNAME=mail.nasteh.bg        # mail relay HELO + DKIM
MAIL_SENDER_DOMAINS=nasteh.bg
RELAYHOST=                          # optional smarthost; empty = direct delivery
RELAYHOST_USERNAME=
RELAYHOST_PASSWORD=
```
(`.env.example` is authoritative; keep this in sync.)

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
