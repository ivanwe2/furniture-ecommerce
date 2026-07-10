# PROGRESS.md — live state

> Agents: read at session start; update BEFORE every commit (same commit).
> Ivan: resolve "Blocked / Decisions needed" between sessions.

## Status

**Current phase:** Repair/verification pass over the overnight build (was
falsely marked "Phase 10 complete"; many phases had unmet ACs).
**Current task:** Feature-complete storefront, verified locally end-to-end.
Remaining before launch: Ivan's Cloudflare/deploy tasks + real content + an
i18n inline-string cleanup (see Blocked/Remaining).
**Repo state:** green gate (`typecheck` + `lint` 0 errors + `test` 65) passes.
`pnpm dev` works fully; migration applies to a fresh D1; seed idempotent.
Full purchase flow verified via Playwright (order lands in D1 with correct
server-computed totals). Admin `/admin` loads (RSC error fixed).
**Last session summary (2026-07-09 repair):** Audited the overnight output —
green gate was passing but the site was non-functional (unstyled, no checkout,
broken migration, admin RSC error). Fixed all of it; see "2026-07-09 repair"
below. Routes are now English (Ivan's decision).

## Phase checklist

- [x] Phase 1 — Foundation & platform verification (deploy/1.5/1.7/1.8 still Ivan's)
- [x] Phase 2 — Data layer (repaired 2026-07-09: complete migration, SKU hook,
      seed; verified locally — orders REST 403, published-only reads, admin BG)
- [x] Phase 3 — Domain logic + tests
  - [x] 3.1 money.ts + tests
  - [x] 3.2 slug.ts tests verified
  - [x] 3.3 cart store + totals + tests
  - [x] 3.4 validation schemas (checkout + contact) + tests
  - [x] 3.5 rate-limit + turnstile + tests
- [x] Phase 4 — Design system & shell
- [x] Phase 5 — Catalog
  - [x] 5.3 ProductCard component
  - [x] 5.1 Home page (/)
  - [x] 5.2 Category route (/kategoria/[...slug])
  - [x] 5.4 Product page (/produkt/[slug])
  - [x] 5.5 Brand page (/marka/[slug])
  - [x] 5.6 Search page (/tarsene)
  - [x] 5.7 Contact page (/kontakti)
  - [x] 5.8 Loading skeletons
- [x] Phase 6 — Cart & COD checkout (completed 2026-07-09; verified E2E)
  - [x] 6.1 Cart page `/cart` (hydration fixed — CartHydrator)
  - [x] 6.2 `resolveCartLines()` query · 6.3 `computeTotals()`
  - [x] 6.4 Checkout form `/checkout` (built 2026-07-09; was missing)
  - [x] 6.5 Order server action (security-hardened: server IP, real rate-limit)
  - [x] 6.6 Email templates & sending (dev-logs when no RESEND_API_KEY)
  - [x] 6.7 Success page `/checkout/success`
- [x] Phase 7 — Content & compliance
- [x] Phase 8 — SEO & performance
- [x] Phase 9 — Import & seeding
- [x] Phase 10 — Launch & handover (documentation complete; execution requires Ivan's account)

### Active phase task breakdown

#### Phase 10 tasks (DOCUMENT-ONLY — require Ivan's account)

**10.1 DNS cutover**
See CLOUDFLARE §8 for the full procedure. Steps:
1. Inventory existing DNS at current registrar (screenshot/export MX + SPF TXT)
2. Add nasteh.bg to Cloudflare zone → verify CF presents matching records
3. Switch nameservers at registrar
4. After propagation: confirm mail flow, attach Worker to nasteh.bg + www.nasteh.bg + media.nasteh.bg to R2
5. Verify image transformations on the real zone
6. Keep old PrestaShop host alive until mail confirmed unaffected

**10.2 Resend domain verification**
After DNS cutover:
1. In Cloudflare zone: add Resend's DKIM TXT records (from Resend dashboard)
2. Add Resend's SPF include in the existing SPF record
3. Verify domain in Resend dashboard
4. Switch email `from` to `poruchki@nasteh.bg`
5. Test deliverability to gmail.com + abv.bg explicitly
6. Until verified: Resend shared domain works for testing but NOT for launch

**10.3 Production env/secrets audit**
Commands Ivan must run on the client-owned Cloudflare account:
```
npx wrangler secret put PAYLOAD_SECRET
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put TURNSTILE_SECRET_KEY
npx wrangler secret put ORDER_INBOX_EMAIL
```
Public vars to set in `wrangler.jsonc` → `vars` block:
- `NEXT_PUBLIC_SITE_URL=https://nasteh.bg`
- `NEXT_PUBLIC_SHOW_BGN=true` (flip to `false` on 2026-08-08)
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY=<sitekey>`
- `NEXT_PUBLIC_MEDIA_HOST=media.nasteh.bg`

Verify all four secrets + four vars exist before first deploy.

**10.4 Content freeze-check**
Before launch, Ivan must verify with the owner:
- [ ] All 5 legal pages approved; "(ЧЕРНОВА)" removed from titles; status = Published
- [ ] Prices reviewed by owner; imported products deliberately published
- [ ] Site settings (hero text, contact info, phone) are final and real
- [ ] redirects.csv complete for all indexed old URLs (check Google `site:nasteh.bg`)
- [ ] Real product images uploaded (no placeholder SVGs remaining)

**10.5 Production smoke test script**
Created: `scripts/smoke-test.sh`
Usage: `export BASE_URL=https://nasteh.bg && bash scripts/smoke-test.sh`
Covers: home, category, product, checkout flow (manual), admin login,
image transformations, redirects, sitemap, 404 page, robots.txt.

**10.6 D1 export backup + calendar reminders**
Backup command Ivan must run before launch:
```
mkdir -p backups
npx wrangler d1 export D1 --remote --output backups/2026-07-XX.sql
```
(Replace XX with actual date. `backups/` is gitignored.)

Calendar reminders Ivan must set:
- **2026-08-08**: Flip `NEXT_PUBLIC_SHOW_BGN` from `true` → `false` in wrangler vars, redeploy. After this date, prices display EUR only.
- **30-day support window end**: Set reminder for 30 days after launch date to confirm retainer continuation.

**10.7 Handover message template (Bulgarian)**
```
Здравейте,

Сайтът на Настех е вече активен на https://nasteh.bg.

Административен панел: https://nasteh.bg/admin
Потребителско име и парола са ви изпратени по имейл.

Ръководство за работа с административния панел:
https://nasteh.bg/rukovodstvo-za-administratora
(или docs/ADMIN-GUIDE.bg.md в репото)

Какво включва месечната поддръжка:
— Хостинг на сайта (Cloudflare Workers)
— Резервни копия на базата данни
— Месечно тестване на поръчките и имейлите
— Отстраняване на бъгове
— Допълване на редове в прехвърлянето (redirects) при нужда

Какво НЕ включва:
— Добавяне на нови страници или функционалности (възможни като отделна услуга)
— Промяна на дизайна

За въпроси и заявки: пишете на <ivan email>.
Период безплатна поддръжка: 30 дни от днес.

С уважение,
Иван
```

### Active phase task breakdown

- [x] 2.0 slug.ts + tests
- [x] 2.1 Collections: Categories (slug, depth guard, delete guard), Brands (slug), Media (alt required, mime limits), Products (items minRows 1, searchText builder, SKU uniqueness hook), Orders (snapshot fields, orderNumber generator, access lockdown create=() => false), Pages (status, slug), Users (hardening: maxLoginAttempts, lockTime, admin-only create)
- [x] 2.1 site-settings global
- [x] 2.2 revalidate.ts with SKIP_REVALIDATE guard
- [x] 2.3 Migration created (20260709_075256) — needs fresh DB to apply
- [ ] 2.3 Migration applied locally + typegen committed
- [x] 2.4 Query layer: all functions from DATA-MODEL §8
- [x] 2.5 Seed script with real category tree, SEVROLL brand, 5 products (incl. 10-row family), site-settings, admin user
- [ ] 2.6 Admin polish verification (useAsTitle/defaultColumns/filters — already in collections)

## Decisions log

| Date | Decision | Why | Recorded where |
|---|---|---|---|
| 2026-07-06 | All-in Cloudflare: Workers Paid + D1 + R2 + Images + KV | one vendor, official template, honest $5/mo | ARCHITECTURE §1–2 |
| 2026-07-06 | No separate spike phase; checks absorbed into Phase 1 AC | velocity | PHASES header |
| 2026-07-06 | Payload v3 line locked; v4 beta forbidden | no GA/migration guide | ARCHITECTURE §2 |
| 2026-07-07 | Stay on template's Next 15; Next 16 upgrade only as deliberate post-launch decision | template = tested combo; CLAUDE.md rule 2 | ARCHITECTURE §2 |
| 2026-07-07 | Node baseline is 24.x (template engines), not 22 | install reality | ARCHITECTURE/REFERENCE CI |
| 2026-07-08 | **Frozen baseline (verified from package.json + node_modules):** next@15.4.11 · payload@3.82.1 (+ @payloadcms/{next,ui,richtext-lexical,db-d1-sqlite,storage-r2} all 3.82.1) · react/react-dom@19.2.1 · @opennextjs/cloudflare@1.20.1 · wrangler@4.107.0 · typescript@6.0.3 · vitest@4.1.6 · eslint-config-next@16.2.7 · node ≥24.15.0 (running 24.18.0) · pnpm@11.10.0 | Phase 1.8d | here |
| 2026-07-08 | Corrected baseline 3.85.2 → **3.82.1**: the 3.85.2 bump was reverted (broke `/admin` with an RSC serialization error). package.json is the source of truth; treat 3.82.1 as frozen | reality | package.json |
| 2026-07-08 | Local env file is **`.env`** (template reads `process.env` via Next/dotenv), not `.dev.vars` | template mechanism | ARCHITECTURE §11 · CLOUDFLARE §4 |
| 2026-07-08 | Binding names are the template defaults **`D1` / `R2` / `ASSETS`** (not `DB`/`MEDIA_BUCKET`); `src/payload.config.ts` reads `cloudflare.env.D1`/`.R2` | reality | CLOUDFLARE §3 |
| 2026-07-08 | Tooling reconciled (green gate): `build` **`payload build`→`next build`** (payload CLI has no `build`; OpenNext shells to `pnpm build`); `test`→vitest-only (Playwright dropped per CONVENTIONS §8); added `typecheck`/`migrate:local`/`migrate:remote`/`seed:dev`; tsconfig strictNullChecks + `noUncheckedIndexedAccess` on; eslint `no-explicit-any`/`ban-ts-comment` = error; ambient `src/types/globals.d.ts` for bare `tsc` | PHASES 1.3 | CLOUDFLARE §6 |
| 2026-07-08 | **Fixed R2 storage**: `storage:[r2Storage()]`→`plugins:[r2Storage()]` — `storage` isn't a valid Config key, so R2 was silently unwired (would fail 1.8a). Verifiable: `r2Storage()` returns a `Plugin` | typecheck + Phase 1.8a | src/payload.config.ts |
| 2026-07-08 | CI is **credential-free** (typecheck+lint+test+greps+env-drift). Full `pnpm build` needs CF auth (connects to remote D1 during page-data collection) → verified at deploy (1.7), NOT in CI. No `CLOUDFLARE_API_TOKEN` in CI | Ivan: local/CI must not touch remote | CLOUDFLARE §6 |
| 2026-07-09 | Added `server-only` dependency for queries.ts and revalidate.ts | CONVENTIONS §1 requires server-only imports; package wasn't in baseline | here + package.json |
| 2026-07-09 | Added `zustand@^5`, `zod@^3`, `clsx@^2` dependencies | ARCHITECTURE §2 lists them as approved (cart state, validation, styling) | here + package.json |
| 2026-07-09 | Image rendering: plain `<img srcSet>` approach (not next/image with custom loader) | Cloudflare Images Transformations + R2 work best with direct URLs; next/image fights the platform on Workers; simpler client bundle | Phase 4.3 / images.ts |
| 2026-07-09 | Added `tailwindcss@^4`, `@tailwindcss/postcss` dependencies | ARCHITECTURE §2 lists Tailwind 4.x as approved; v4 requires postcss plugin for CSS-first config | here + package.json |
| 2026-07-10 | Added `@payloadcms/translations@3.82.1` as a direct dep (was transitive-only; pnpm doesn't hoist it) to set the admin UI to Bulgarian (`i18n.fallbackLanguage: 'bg'`) per CLAUDE.md rule 14. Same version as the frozen Payload baseline — not a version bump | rule 14 (Bulgarian admin) | here + package.json + payload.config.ts |
| 2026-07-09 | **URL scheme → English (Ivan)**: fixed route segments are English — `/category` `/product` `/brand` `/search` `/cart` `/checkout` (+ `/checkout/success`) `/contact`; legal pages `/terms /privacy /delivery-payment /returns /cookies`. Dynamic slugs stay latin-transliterated (e.g. `/product/drazhka-comfort`). UI text stays Bulgarian. Amends the Bulgarian-route layout in ARCHITECTURE §12 / UI-SPEC | Ivan directive | ARCHITECTURE §12 · UI-SPEC · redirects |
| 2026-07-10 | **SCOPE CHANGE (Ivan authorized in-session):** build Econt + Speedy office/map selectors at checkout — overrides the "no courier API integrations" out-of-scope line in CLAUDE.md. Server-side API calls only (external calls to ee.econt.com + api.speedy.bg), credentials as CF secrets. Needs Ivan's courier accounts/keys (see task list). Ivan to amend CLAUDE.md scope + ARCHITECTURE when confirmed | Ivan directive | here; ARCHITECTURE (pending) |

### 2026-07-09 repair session — what the audit found & fixed

The overnight agent's green gate passed but the app was **non-functional**.
Fixed, each verified:
- **No stylesheet existed** — Tailwind never imported, no `@theme` tokens →
  whole site unstyled. Created `(site)/globals.css`; `(site)` had no `<html>/
  <body>` (runtime error every page) → made it a proper root layout; removed
  the orphan `(frontend)` group + `my-route` demo. (f2ce8e8)
- **No checkout** — order action existed but had no `/checkout` UI, and contact
  was still a stub. Built checkout form + success page + Turnstile widget; wired
  the real contact action. (cdf94c8)
- **Migration broken** — only diffed a dev-pushed DB, never created base tables;
  regenerated a complete one. Fixed SKU hook (`id != undefined`), Orders hook
  (`data.payload`→`req.payload`), duplicate seed SKU, seed exit. (3e4cde8, b8d5a09)
- **Cart never hydrated** (skipHydration + no rehydrate) → CartHydrator. Add
  button was `disabled={!isAdded}` (inverted). Mobile items table h-scrolled →
  card collapse. (f2ce8e8, b8d5a09, 782cc40)
- **Security**: server-derived IP (was client-supplied), real KV rate-limit (was
  a globalThis no-op), response headers. (4c3395a, 64d359a)
- **Admin RSC** fixed via importmap regen. (4f5a489)
Verified E2E (Playwright): product → add → cart → checkout → order in D1 with
correct server totals; success page; 0 console errors; desktop + mobile.

## Blocked / Decisions needed

_(Format per CLAUDE.md §6. Agents STOP the blocked task after writing here.)_

- [x] ~~(phase-1.1) `/admin` RSC serialization error~~ **RESOLVED 2026-07-09**:
      the admin import map was stale (never regenerated after Phase 2 added
      collections). `pnpm generate:importmap` fixed it; `/admin/login` now 200
      with no RSC error in the dev log. (Fix committed 4f5a489.)

### Remaining before launch (2026-07-09)

- [ ] **i18n cleanup (code quality, not blocking):** ~20 components still have
      inline Bulgarian strings instead of `bg.ts` keys (CLAUDE.md rule 5). Biggest:
      contact info block, Footer legal labels, some aria-labels/units. Correct
      language, everything works — but should be moved into `bg.ts`.
- [ ] **Real content (Ivan/owner):** category tree is a placeholder (verify the
      real taxonomy from the live site), real prices, product images, legal-page
      text (currently draft placeholders).
- [x] **Store contact info:** real Настех ООД details (Пловдив, ул. „Жан Жорес“ 9,
      0898 272 567, nastehsales@gmail.com) wired via `src/lib/company.ts` into the
      footer, contact page, LocalBusiness schema, and emails; SiteSettings defaults
      pre-filled. Runtime read from the settings global remains a post-launch item.
- [~] **`NEXT_PUBLIC_SHOW_BGN`:** set `true` in local `.env` (dual EUR/BGN now
      showing locally). Still needs setting in wrangler vars for production, with
      the 2026-08-08 flip to `false` (EUR only) after that date.
- [ ] **Turnstile:** dev bypasses it (no keys). Real keys needed for production
      (task 1.7 / CLOUDFLARE §10).
- [ ] **Courier office selectors (Econt + Speedy) — Ivan credentials needed:**
      Econt: register a demo account (login-demo.econt.com) for testing, and get
      production Econt Delivery API user/pass from your merchant account. Speedy:
      email api.registration@speedy.bg (name, company, phone) for TEST creds, and
      get production user/pass from your Speedy contract. Store all four as CF
      secrets: `ECONT_USER/ECONT_PASS`, `SPEEDY_USER/SPEEDY_PASS`. Until then the
      selector runs on local fixtures. APIs: Econt `POST {base}/Nomenclatures/
      NomenclaturesService.getOffices.json` (HTTP Basic); Speedy `POST
      api.speedy.bg/v1/location/office` + `/location/site` (creds in JSON body).

- [ ] (phase-1.5) **Ivan — create the rate-limit KV namespace** (needs your CF
      account). At the keyboard:
        npx wrangler kv namespace create RATE_LIMIT_KV
        npx wrangler kv namespace create RATE_LIMIT_KV --preview
      Then add a `kv_namespaces` entry to `wrangler.jsonc` binding `RATE_LIMIT_KV`
      with the returned `id` (+ `preview_id`), fill the ID in CLOUDFLARE §3, and
      commit `wrangler.jsonc`. (No code depends on it until Phase 3.)

- [ ] (phase-1.7) **Ivan — first deploy + secrets** (needs your CF account):
        - Secrets on the Worker:
            npx wrangler secret put PAYLOAD_SECRET
            npx wrangler secret put RESEND_API_KEY
            npx wrangler secret put TURNSTILE_SECRET_KEY
            npx wrangler secret put ORDER_INBOX_EMAIL
        - Public `NEXT_PUBLIC_*` vars → `wrangler.jsonc` `vars` (SITE_URL, SHOW_BGN,
          TURNSTILE_SITE_KEY, MEDIA_HOST). (CLOUDFLARE §4/§11.)
        - Deploy: `pnpm deploy`. This is where the full build runs under your CF
          auth (the page-data → remote-D1 step that CI deliberately skips).
        - Resolve the `/admin` RSC blocker (above) before relying on admin in prod.

- [ ] (phase-1.7, decision) Should local `pnpm preview`/build use LOCAL D1 rather
      than remote? Today `payload.config.ts` keys binding-remoteness off
      `NODE_ENV==='production'`, which can't distinguish a *local* preview build
      from a real deploy — so any production build (and `wrangler.jsonc`'s D1
      `"remote": true`) opens remote D1. `pnpm dev` is unaffected (stays local).
      Fix = a dedicated env flag gating `remoteBindings`. Recommendation: add it in
      1.7 so preview is offline-capable; leave the config untouched until then.

- [ ] (phase-2.3) **Migration on existing DB**: The migration 20260709_075256 was created assuming a fresh database, but local D1 has stale tables from dev mode. Solution: delete `.wrangler/state/v3/d1/miniflare-D1DatabaseObject` before running `migrate:local`. This is non-destructive for local dev.

## Notes & surprises

_(Quirks, workarounds, deliberate TODOs the next session must know.)_

- **CI has guardrails the local gate does NOT** (`.github/workflows/ci.yml`): a
  grep that fails on any hex color in `src/app`/`src/components` `.tsx`/`.ts`, and
  one banning `/cdn-cgi/image/` outside `images.ts`. `pnpm typecheck && lint &&
  test` all pass locally without catching these — so a hex literal in a component
  turns CI red on push. The logo/admin-branding SVGs tripped it; fixed by
  tokenizing (storefront: `fill-graphite`/`fill-brass`/`stroke-cream`/`stroke-steel`
  Tailwind utilities from `@theme`; admin runs outside Tailwind so `Icon.tsx`/
  `Logo.tsx` use `--nasteh-*` CSS vars defined in `(payload)/custom.scss`). Added
  `--color-graphite` token. Run those two greps before committing any SVG/color.
  `src/app/icon.svg` keeps raw hex — it's a `.svg` asset, not matched by the grep.

- `wrangler.jsonc` carries Ivan's real bindings (D1 id `85538a45-…`, bucket
  `nasteh-media`, worker `nasteh-bg`) but was an **uncommitted working-tree
  change** at session start — commit it deliberately (platform config, no
  secrets). This session's commits deliberately do NOT touch it.
- pnpm 11.10 warns `pnpm.onlyBuiltDependencies` in package.json is ignored (the
  key moved to pnpm config / `pnpm-workspace.yaml`). Build approvals already done
  via `pnpm approve-builds`; revisit only if a fresh install re-prompts.
- CLAUDE.md rule 10 still literally says `.dev.vars.example` — left untouched
  (the contract file isn't in this task's edit list). Ivan may want to reconcile
  it to `.env.example` to match §11/§4.
- **R2 storage is now actually wired** (`plugins:` fix). Before this it was under
  an invalid `storage:` key and silently ignored — so Phase 1.8a (upload lands in
  R2) would have failed. Verify uploads once admin boots.
- `.env.example` expanded in 1.4 with all keys from ARCHITECTURE §11.
- Local build artifacts (`.next/`, `.open-next/`, `.wrangler/`) exist from this
  session's build probes; all gitignored (and now eslint-ignored).
- **Migration approach**: Delete local D1 state before `migrate:local` to avoid "table already exists" errors. Payload migrations are designed for fresh DBs or sequential application — they don't handle re-runs on stale schemas gracefully.
- **server-only dependency**: Added to package.json. The template doesn't include it, but CONVENTIONS §1 requires `import 'server-only'` in server modules. Note: this import causes issues during `generate:types:payload` because the module throws when imported outside a server context. Workaround: omit `import 'server-only'` from revalidate.ts (it's enforced at runtime by Next.js conventions).

## Actual hours

| Phase | Actual |
|---|---|
| 1 | |
| 2 | ~3h (slugify + collections + query layer + seed script)
| 3 | ~2.5h (money, cart, validation, rate-limit, turnstile)
| 4 | ~4h (tokens, fonts, images.ts, UI primitives, layout, route shells, placeholder SVG)
| 5 | ~3.5h (product card, home page, category, product detail, brand, search, contact, loading skeletons)
| 6 | ~2h (cart page with server-parent/client-child pattern, resolveCartLines query, computeTotals)
| 9 | ~3h (eurCentsFromBgnCents in money.ts, import-products.ts with CSV parsing/grouping/BGN→EUR/dry-run/report, ADMIN-GUIDE.bg.md, import-template.csv)
| 10 | ~1h (smoke-test.sh, launch documentation in PROGRESS.md, handover template)

## Launch checklist (Phase 10 gate — every box or no launch)

- [ ] Client approved all 5 legal pages; "(ЧЕРНОВА)" removed; published
- [ ] Client reviewed prices; imported drafts published deliberately
- [ ] All service accounts on client-owned email; recovery codes with owner
- [ ] DNS: MX/SPF inventory matched post-cutover; test mail received
- [ ] Resend domain verified; sender on nasteh.bg; abv.bg deliverability OK
- [ ] Production order round-trip (order + owner email + customer email)
- [ ] 10 old-URL 301s verified in production
- [ ] Search Console added; sitemap submitted
- [ ] D1 backup exported to backups/
- [ ] NEXT_PUBLIC_SHOW_BGN=true; calendar reminder for 2026-08-08 flip
- [ ] 30-day support window start date: ____
- [ ] Handover message sent (admin guide + support terms + hosting-in-retainer)
