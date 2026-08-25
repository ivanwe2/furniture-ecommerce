# PROGRESS.md — live state

> Agents: read at session start; update BEFORE every commit (same commit).
> Ivan: resolve "Blocked / Decisions needed" between sessions.

## Status

**2026-07-23 — CODE-COMPLETE + DEPS REFRESHED → READY FOR PROD HANDOVER.**
All feature work + the punch-list (#47–#53) done; the Ivan-authorized dependency
refresh is merged to `main` (altcha PoW recalibration #54; deps #55–#58: React
patch + dev tooling, **Payload 3.86**, **Next 16.2.11**, jsdom 29 + dotenv 17 —
held: eslint 10 / TS 7 / graphql 17 / zod 4, see Decisions log 2026-07-22).
Payload 3.86 + Next 16 were **Docker-verified** (admin+Lexical, storefront 200s,
revalidation correctness). Security audit **49→39** advisories (high 15→11) —
all transitive in the Payload/admin + dev-tool trees. Go-live checklist added to
`docs/DEPLOY.md §0`. **In-depth security review done** (`docs/SECURITY-REVIEW.md`):
posture strong (orders server-action-only + `create:false`, DB-recomputed prices,
layered anti-bot, REST access control probed — users/orders 403); 3 defence-in-depth
issues found + fixed this session (email HTML-escaping, JSON-LD `</script>` escaping,
non-spoofable client-IP for rate-limit); residual = accepted-risk/sysadmin (CSP,
HSTS at proxy, transitive dep advisories). **Next:** sysadmin executes the go-live
checklist on the client's infra. Legacy `docs/HANDOFF.md` is a retired CF-era
autonomous-build prompt — ignore for deploy; `docs/DEPLOY.md` is the handover doc.

**Current phase:** **STACK SEPARATION (S1–S7)** — multi-service self-hosted
stack (Ivan, 2026-07-17; Decisions log). Order (small green PRs):
**✅ S1** contract flip (PR #30) → **✅ S2** Turnstile→Altcha (PR #31 — self-hosted
proof-of-work; `altcha-lib` v2 + `altcha` v3 widget; `/altcha` challenge route;
replay store; verified end-to-end) → **✅ S3** sharp `imageSizes`+WebP (PR #32 —
thumb/card/detail/zoom as WebP, og kept jpeg 1200×630; sharp wired into config;
`images.ts` serves variants w/ original fallback; verified variants on disk) →
**✅ S4** SQLite→Postgres (PR #33 — `db-postgres` adapter, fresh PG migration,
`db` = **postgres:18-alpine** container + `pgdata` vol; migrate+seed+boot
verified) → **✅ S5** Redis rate-limit (PR #34 — `ioredis` INCR+EXPIRE window,
in-memory fallback if Redis down; `redis:7-alpine` container; verified
allow/block + TTL) → **✅ S6** Postfix mail relay (PR #35 — `mail` = boky/postfix
send-only + OpenDKIM, `maildata` vol for keys, `RELAYHOST` smarthost option;
app relays no-auth over the internal net; verified handoff + **DKIM-signed**;
DEPLOY §mail DNS docs) → **✅ S7** compose hardening (PR #36 — per-service memory
caps so nothing can OOM the host, `backend` network, daily `pg_dump`+media
`backup` sidecar w/ 14-day retention; DEPLOY.md rewritten; contract docs
de-SQLited/de-Turnstiled). **STACK SEPARATION COMPLETE (S1–S7).**
**Verified the whole stack end-to-end** with `docker compose up --build`: app
migrated-on-start against the `db` container, all routes 200, Redis+mail wired,
backup sidecar wrote a db+media snapshot, DKIM key generated. Postgres 18 needed
the volume at `/var/lib/postgresql` (PG18 convention), not `/…/data`.
**Follow-up (non-blocking):** the secondary reference docs (DATA-MODEL,
CONVENTIONS, REFERENCE, PHASES, UI-SPEC, HANDOFF) still contain historical
SQLite/Turnstile prose — the operative contract (CLAUDE, ARCHITECTURE, DEPLOY,
Decisions log) is current. App-only changes (S2/S3) first, then
infra; the full stack is tested locally with Docker.

**Previous phase — REDESIGN "1A Editorial" COMPLETE (R1–R7, PRs #23–#29)**
(Ivan handoff 2026-07-16 — ARCHITECTURE §8, Decisions log). Phased PRs R1–R7:
**✅ R1** foundation (PR #23 — tokens + Golos/IBM Plex Mono fonts + square
corners) → **✅ R2** shell (PR #24 — promo bar, header + logo + nav + cart chip,
dark 4-col footer) → **✅ R3** homepage (engineering-overlay hero + lazy WebGL
hinge + fallback, category cards + dark catalog CTA, numbered trust band; adds
`three`) → **✅ R4** catalog (PR #26 — editorial ProductCard, category grid +
subcategory chips, product detail + technical items table, brand, search; shared
`Breadcrumbs` + `Pagination`) → **✅ R5** cart/checkout (PR #27 — editorial cart
line items + sticky summary, checkout summary + bordered delivery-method
selector, square success confirmation) → **✅ R6** contact/legal/primitives
(PR #28 — editorial contact spec-sheet + form, legal-page headings, RichText
palette; primitives: mono-uppercase form labels, hairline inputs w/ brass focus,
square mono Badge, brass buttons) → **✅ R7** admin touch-ups (PR #29 —
`custom.scss`: cream bg, brass primary buttons, square corners, Golos/IBM Plex
Mono type stacks; CSS-only, no layout changes). **REDESIGN COMPLETE (R1–R7).**
Logo files (`public/logos/nasteh-*.svg` — vector wordmark; the favicon
`src/app/icon.svg` is the bronze wordmark). Earlier PNGs replaced 2026-07-21.
**Post-S7 admin fixes (2026-07-17, PRs #39–#41) — RESOLVED.** Triggered by the
admin richtext crash Ivan hit on a product page.
- **#39 richtext crash** — root cause was the **seed**, not R7 CSS: it wrote
  product `description` (a richText field) as a **plain string**, and
  `makeContent` (legal pages) emitted a **partial** Lexical node tree — either
  makes the admin editor's `parseEditorState` throw „Cannot read properties of
  undefined (reading 'type')". Fixed `makeContent` to a fully-formed editor
  state; product descriptions go through it (description-less → explicit
  `null`). Re-seeded the running stack to heal the existing rows; verified the
  product edit page opens clean.
- **#40 admin fonts** — R7 only *named* Golos/IBM Plex, so the panel fell back
  to system fonts. New `AdminFonts` provider self-hosts them via next/font
  (same as the storefront); `custom.scss` rewires `--font-body/--font-mono`.
  Verified the running admin computes to Golos Text (`document.fonts` confirms).
- **#41 array labels** — array fields lacked `labels.singular`, so add-buttons
  showed the English field name („Добави Short Spec/Gallery/Item"). Added BG
  singular/plural to all five array fields (rule 14).
Verified visually in the Docker stack (login + product edit, 1280px).
**R3 note:** the old homepage featured-products grid + SEVROLL brand strip are
removed — the 1A design's homepage is hero → categories → trust only. Category
cards render the children of the `mebelen-obkov` root (the shoppable
categories); the dark CTA tile + „Виж всички" link point at that root. Self-hosted Docker migration before this is **CODE-COMPLETE**
(built + verified, PRs #12–#22); its remaining work is execution on the
client's infra (build image, proxy, SMTP) — see the migration note below.
**Migration plan (small green PRs, in order):**
  1. ✅ (PR #12) Docs flip — ARCHITECTURE / CLAUDE / PROGRESS + Decisions log.
  2. ✅ DB seam: D1 → `@payloadcms/db-sqlite` (`DATABASE_URI`), migrate on start.
  3. ✅ Storage+images: dropped `r2Storage` + all Cloudflare context from
     `payload.config.ts`; media on the `media` disk volume (`upload.staticDir`,
     env `MEDIA_DIR`); `images.ts` serves originals via `/api/media/file/`
     (removed `/cdn-cgi/image/` + `NEXT_PUBLIC_MEDIA_HOST`). **imageSizes/sharp
     responsive variants deferred to the redesign** (serving originals for now
     — perf follow-up).
  4. ✅ Rate-limit: KV → in-memory fixed-window counter (`rate-limit.ts` +
     test rewritten; REFERENCE §7 updated). Also de-Cloudflared the IP source
     in `order.ts`/`contact.ts` (`cf-connecting-ip` → `x-forwarded-for` /
     `x-real-ip` from the reverse proxy — the rate-limit key). No more
     `@opennextjs/cloudflare` import in `src/` except `open-next.config.ts`.
  5. ✅ Email: `emails/send.ts` Resend-`fetch` → **nodemailer SMTP**
     (`SMTP_HOST/PORT/USER/PASS`, `EMAIL_FROM`); lazy transport, dev-skips when
     `SMTP_HOST` unset; auth omitted when `SMTP_USER` empty (supports a no-auth
     local relay). nodemailer@9 verified on Node 24 (offline jsonTransport).
     **PR #6 TODO:** add `nodemailer` to `serverExternalPackages` in next.config.
  6. ✅ Container: `Dockerfile` (multi-stage, `node:24-bookworm-slim`,
     `payload migrate && next start`, non-root, volume-friendly ownership),
     `docker-compose.yml` (app + `data`/`media` volumes + healthcheck),
     `.dockerignore`, `.env.example` + `env-keys.txt` overhaul (SMTP/DATABASE_URI/
     MEDIA_DIR in; RESEND/MEDIA_HOST out), `next.config` serverExternalPackages
     `['sharp','nodemailer']`, `sitemap.ts` force-dynamic (so `next build` needs
     no DB). Removed deps `@opennextjs/cloudflare`+`wrangler`; deleted
     `wrangler.jsonc`/`open-next.config.ts`/`cloudflare-env.d.ts`; dropped the CF
     deploy/preview/types scripts + `cloudflare` field; renamed package to
     `nasteh-bg`. Regenerated admin `importMap.js` (dropped stale `storage-r2`
     ref — caught by `next build`). **`pnpm build` verified green locally**
     (all site routes + sitemap dynamic; no build-time DB). Docker image itself
     is UNBUILT here (no daemon) — sysadmin builds on their infra.
  7. ✅ Cutover doc: `docs/DEPLOY.md` (configure/build/run, one-time D1→SQLite
     + R2→disk lift, backups, reverse-proxy + email notes). Doc index + the
     CLOUDFLARE.md banner now point to it.

**MIGRATION CODE-COMPLETE (2026-07-16).** All 7 PRs merged (#12-#18). The repo
targets self-hosted Docker; no Cloudflare anything remains in `src/` or config.
Remaining is **execution on the client's infra (sysadmin/Ivan), not code:**
reverse proxy + TLS, and the SMTP endpoint + SPF/DKIM/DMARC. **No data cutover
is needed** (Ivan, 2026-07-16 — the Cloudflare instance was a throwaway test):
go-live starts fresh (empty DB migrated on first boot; owner enters content via
`/admin`), and needs no Cloudflare access at all. DEPLOY §4 is now reference-only.

The Docker image is now **built and verified end-to-end in-session** (Docker
29.5, PR #19): builds on Linux (sharp included), boots non-root, migrates a
fresh volume (~0.5s), serves `/` `/admin` `/robots.txt` `/sitemap.xml` all 200
with Bulgarian content, restart = idempotent migrate (no re-run), healthcheck
cmd + `docker compose config` valid. Fixes that took: (1) `pnpm-workspace.yaml`
must use `allowBuilds:` (pnpm 11's format — NOT `onlyBuiltDependencies`) so
sharp/esbuild build scripts run; (2) the Dockerfile must COPY that file into
the deps stage; (3) runtime CMD calls `node_modules/.bin/*` directly (no pnpm/
corepack at start → no runtime registry access); (4) `--chown` on COPY instead
of a slow recursive chown. Next dev work: the **REDESIGN** (on the clean
Node/Docker base), and the deferred image `imageSizes`/sharp responsive variants.

_Migration notes:_ the existing D1-generated migration
(`20260709_184644_initial`) applies **unchanged** on libSQL — verified with
`DATABASE_URI=file:./x pnpm migrate:local` (Migrated + Done). Only its import
(`@payloadcms/db-d1-sqlite` → `@payloadcms/db-sqlite`) changed. So a D1 SQL
dump loads into the new file and `payload migrate` is a no-op there (cutover,
PR #7). `.env.example` + `env-keys.txt` (adds `DATABASE_URI`, drops Cloudflare
keys) are updated in PR #6 with the rest of the env overhaul.
**Chosen (Ivan, 2026-07-16):** SQLite on a volume · media on a disk volume ·
in-memory rate limit · Turnstile kept · SMTP from the domain (no Resend). SMTP
endpoint + SPF/DKIM/DMARC are the sysadmin's to provide (not code-blocking).
**Repo state:** green gate (`typecheck` + `lint` 0 errors + `test` 65) passes.
main is **branch-protected** (PR + `verify` CI required); all work goes via
feature branches + squash-merged PRs (Decisions log 2026-07-11/12).

**Interim Cloudflare deploy (2026-07-13) — BEING RETIRED (migration above); kept
for the data lift (D1 export + R2 download) and secret inventory during cutover:**
- URL: https://nasteh-bg.nastehsales.workers.dev · Workers **Paid** plan · account
  `061903067be16a178866adb12584641c`. Custom domain nasteh.bg **not yet wired**.
- CD: **Cloudflare Workers Builds** on push to `main` (build `npx opennextjs-
  cloudflare build`, deploy `npx opennextjs-cloudflare deploy`; non-prod branch
  builds OFF; build caching ON). Build log: Worker → Deployments → build history.
  Local `pnpm deploy` is DEAD on Windows (OpenNext/esbuild vs pnpm symlinks).
- Build vars (dashboard): `PAYLOAD_SECRET`, `NEXT_PUBLIC_SHOW_BGN=true`,
  `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (real), `NEXT_PUBLIC_SITE_URL=`
  `https://nasteh-bg.nastehsales.workers.dev` — INTERIM; switch to https://nasteh.bg
  at domain cutover. It ALSO builds the media URL (see images.ts), not just SEO.
- Runtime secrets (wrangler): `PAYLOAD_SECRET`, `TURNSTILE_SECRET_KEY` (real),
  `ORDER_INBOX_EMAIL=nastehsales@gmail.com`. `RESEND_API_KEY` NOT set → order/
  contact emails only LOG until Resend + domain verification.
- Contact info now editable from the `site-settings` global via `getCompany()`
  (footer/contact/LocalBusiness); emails still use `company.ts` defaults (follow-up).
- Workers Logs ON (`observability`). Rate-limit KV wired + active. Turnstile real.
- Admin: first owner user created (nastehsales@gmail.com).
- Incremental page cache **DEFERRED** (needs R2 + separate D1 tag cache + DO
  queue; do it post-redesign). `nasteh-cache` bucket may be deleted/recreated.
- Legal pages: drafted to EU/BG standard as a Claude artifact (needs lawyer
  review + manual entry as drafts) — NOT yet in the DB. Real product content +
  real categories still to be entered by the owner (seed had only demo data).

**Prior session (2026-07-09 repair):** made the non-functional overnight build
work (styling, checkout, migration, admin RSC); see "2026-07-09 repair" below.
Routes are English (Ivan's decision).

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
| 2026-08-25 | **Hinge scene: real extruded profiles, contact shadows, and framing that is measured rather than hand-tuned.** Round-4 feedback: „не е добре центрирана, няма достатъчно детайл, не изглежда достатъчно реалистично". **Centring — the actual fix:** camera targets and distances were hand-picked constants, so the subject drifted as the door swept 104° and cropped at some aspect ratios. Now the bounds are **measured**: the world box is unioned across nine poses of the sweep, the hardware gets its own box for the close-up, and the camera distance is solved so every box corner projects inside the frustum. **First attempt at that solve was a bounding SPHERE, which was wrong** — a sphere around a long thin hinge is far bigger than the shape inside it, so it pushed the camera back and left the subject small and adrift, exactly the complaint. Replaced by fitting the projected box. The closed-form version of that fit was then also wrong (it cropped the boards), so it is done by projecting the corners and correcting — converges in a few steps, self-corrects at any aspect, and is cached per resize rather than recomputed per frame. **Diagnosing it needed instrumentation, not eyes:** a temporary `console.info` of the boxes/distances is what showed the fit was in fact running (wideD 22.4) and that the margin, not the maths, was the remaining problem — two attempts to measure the rendered pixels first gave 100%×100% "subject fills everything", because a transparent WebGL canvas screenshots with the page showing through it. **Detail:** parts are extruded from 2D profiles instead of assembled from cuboids — the tapering arm, its hollow channel, the stepped mounting plate, the stamped links with rivets, and a cup flange with the screw holes actually punched through it; countersunk screws now have cross recesses. **Realism:** `PCFSoftShadowMap` with the key light casting, so parts shade each other and the arm falls across the door (this, more than any single part, is what stops it reading as primitives); anisotropic brushed steel against black anodised, with a near-black crevice material in the recesses. Also fixed: the SEVROLL cap label rendered **mirrored** — the plane is viewed from the −z side, so it needed flipping in-plane. Verified at 1280 and 375, no console errors. | client feedback | src/components/home/hinge-scene.ts · here |
| 2026-08-25 | **Sign band moved to the top of every page; the header now slides into its place on scroll.** Round-4 client feedback: „логото трябва да е отгоре, и като се скролва да се скрие и на негово място да дойде навбарът". The band was previously a section between the hero and the categories; it now sits directly under the dark info strip, so the two read as one shopfront, and it renders on every route (it is shell furniture, so the component moved `components/home/` → `components/layout/`). **The reveal trigger is an `IntersectionObserver` on a sentinel at the band's base, not a pixel threshold** — the band is 138px tall at desktop and 104px at mobile, so any hard-coded offset would be wrong at one of them, and the observer also costs no per-frame scroll handler. `entry.boundingClientRect.top < 0` is what distinguishes „scrolled up past it" from „still below the fold", which both report `isIntersecting === false`. Fails **open**: no sentinel on the page (any future layout without the band) leaves the bar simply visible, deferred a frame because setting state straight from an effect body cascades renders. **Mobile keeps its header** (the `lg:` gate from the previous round stands): hiding it there would take the burger and the cart off the landing screen, and the band scrolling away already produces the same result. Verified at 320/375/768/1280: band present on `/` and `/brands`, header opacity 0→1 on desktop scroll and pinned at top 0, 1 throughout on mobile, mark margins symmetric at every width (so it is genuinely centred, not just apparently), **no horizontal overflow down to 320px**, no console errors. Banner type size retuned after the font swap — Factor Expanded is far wider than the Montserrat stand-in, and the inherited `8.5vw` had the letters touching both screen edges at 375px. | client feedback | src/components/layout/SignBand.tsx · Header.tsx · (site)/layout.tsx · (site)/page.tsx · here |
| 2026-08-25 | **Wordmark now uses the real typeface from the storefront sign — Factor Expanded, dots stripped.** Round-4 client feedback. **The premise turned out to be wrong, and the evidence changed the task:** Ivan relayed „махни точките между буквите, тези на снимката са просто пирони" (the dots in the photo are just nails). They are not — **every capital in Factor carries a dot at its lower right**, so a lone „H" renders as „H·". Proved by rendering single glyphs: H, A and X each come out dotted with no interpuncts typed. That made „use the exact font" and „remove the dots" mutually exclusive as stated, so it went back to Ivan, who chose to **strip the dots from the font** and use **Factor Expanded** (widest upright — closest to the fascia). `scripts/build-wordmark-font.py` derives the shipped face: it removes the dot contour from each of the six letters, **asserting that exactly one contour matches per glyph and refusing to guess otherwise** (a small-in-both-axes contour at the right-hand end — guarding all three conditions so a legitimate stroke or counter can't be mistaken for the dot), re-balances each advance width (the dot lived inside the old advance, so keeping it would leave a hole after every letter), and subsets to `HACTEX` only — 1.2 KB shipped, and no more of the family redistributed than the mark needs. Served through `next/font/local` from `src/fonts/` (not `public/`, which would double-serve it). Verified it is the real face and not a fallback by measuring: 146px rendered vs 73px for generic sans at the same size/tracking — a screenshot alone cannot tell you a webfont failed, as the earlier Montserrat specimen proved when six candidates all silently rendered in Times. **LICENCE — recorded deliberately:** Iconian's bundled `factor.txt` states the family is „free for all non-commercial uses" and that commercial use requires a licence via iconian.com. This was raised twice; **Ivan instructed to proceed regardless ("no matter the license")**, so it ships. The shipped file is additionally a *modified* derivative. A commercial licence from Iconian is inexpensive and would make this unambiguous — recommended before launch. Montserrat (the OFL stand-in from the previous round) is dropped. | client feedback; Ivan's explicit call on the licence | scripts/build-wordmark-font.py · src/fonts/nasteh-wordmark.woff2 · layout.tsx · globals.css · bg.ts · Wordmark.tsx · here |
| 2026-08-25 | **Wordmark rebuilt from the storefront sign + header now reveals on scroll (client feedback via Ivan).** Client sent a photo of the shop fascia — „НАСТЕХ" drawn with Latin look-alike capitals and interpuncts, hairline weight, wide tracking, light on charcoal — and asked for that mark „само с надпис", because the business-card lockup „мн мн не се вижда". **Licence problem solved rather than ignored:** the sign is set in **Factor (Iconian Fonts), which DaFont licenses personal-use only** — commercial use needs a paid licence, and converting glyphs to SVG outlines does not avoid it (outlines are derivative). Rather than ship an infringing mark or hand-trace one, twelve OFL/Apache faces were rendered as the actual wordmark on a dark fascia and compared against the photo (six geometric/humanist, six techno — Factor is a techno family). **Montserrat ExtraLight (200)** won: widest of the hairline geometrics, pointed A and splayed X like the sign. It self-hosts through `next/font`, exactly as Golos Text and IBM Plex Mono already do — no runtime CDN call (GDPR), no licence to buy, latin subset only since the mark is Latin look-alikes. **A false-negative nearly derailed the comparison:** the first specimen rendered all six candidates identically in Times, because `css2?family=…` returns several `@font-face` blocks and taking the first one grabbed a *Cyrillic* subset with no Latin glyphs. Fixed with `&text=HACTEX·`, and the specimen script now measures rendered widths and shouts if they are all identical — never trust a font specimen by eye. Delivered as: `Wordmark` (real text, not SVG — crisp at any size, no asset pipeline; the decorative glyphs are `aria-hidden` and the element carries `role="img"` + the real name „Настех", so a screen reader never says "H A C T E X"), a `SignBand` on the homepage between hero and categories, and the header/footer marks swapped over. `BrandLogo` is deleted — no callers left; the SVGs stay because the Payload admin references them directly. **Header reveal:** hidden above 140px of scroll **on the homepage only** — every other page is entered by navigation and must offer its nav immediately. It is deliberately NOT `aria-hidden`/`inert`: hiding a focusable region from the a11y tree would strip the nav from screen-reader and keyboard users who may never scroll, so it stays reachable, `onFocusCapture` brings it back on tab, and `pointer-events-none` stops mouse clicks on invisible links. Reveal state is **derived**, not synced — the bar persists across navigations, so a state copy of "is the homepage" would need an effect to fix itself on every route change (and lint rightly rejects setState straight from an effect; the initial scroll read is done in a rAF). Tracking is an inline style, not a Tailwind arbitrary value, because two `tracking-[…]` classes tie on specificity and the winner would depend on stylesheet order. Verified at 1280 and 375: header opacity 0 at the top of `/`, 1 after scrolling, **1 immediately on `/brands`**, no console errors. **The reveal is desktop-only (lg and up), decided in-session by Ivan after seeing it:** on a phone hiding the bar also took the burger menu AND the cart off the landing screen, and there is no room up there for a brand statement anyway. Gated with `lg:` classes rather than `matchMedia`, so there is no viewport guess to hydrate and no flash. Verified: header opacity 0 at the top of `/` at 1280, **1 at the top of `/` at 375**. **Left for the client:** the „Плъзгащи системи SEVROLL" category name wraps to three lines in the nav — better fixed by renaming the category in the admin than by CSS. | client feedback | src/components/layout/Wordmark.tsx · Header.tsx · Footer.tsx · src/components/home/SignBand.tsx · layout.tsx · globals.css · bg.ts · here |
| 2026-08-24 | **Hero WebGL scene rebuilt as a SEVROLL 3D PRO concealed hinge (client feedback via Ivan).** Client: „сегашната анимация е супер, просто не предлагаме такъв тип… може примерно как вратичка се отваря плавно и после кадъра да се измести на пантата". The old scene was a **butt hinge** (two flat leaves, knuckle barrel, bronze pin) — a door hinge, not cabinet hardware — while the hero's own label already read „ПАНТА Ø35", i.e. a 35mm cup hinge. Ivan supplied the exact SKU: „Záves SEVROLL polonaložený 3D PRO čierny s tlmením" (half-overlay, 3-way adjustable, black, soft-close). Rebuilt with the same technology (three.js, still dynamically imported, reduced-motion + no-WebGL fallbacks untouched): Ø35 cup recessed in the door, flange with screw wings, boomerang arm carrying a SEVROLL-labelled cover cap, soft-close damper, cross mounting plate on the carcass. **The part that makes it read as real is the 4-bar linkage** — a concealed hinge is not a fixed pivot; the cup itself travels so the door edge can clear the carcass. Geometry was solved numerically rather than eyeballed (400k-sample search over pivot positions) against three constraints: ~105° of door swing, worst-case transmission angle well away from a toggle, and plausible cup travel. Result: **103.6° swing, 63.9° minimum transmission angle, 22.8mm cup travel.** The first hand-guessed geometry was rejected by that same check — it moved 1.3° for the first 22° of drive then hit a singularity and locked at 77°. Because the kinematics run drive→door but the animation wants to ease the DOOR (soft-close: quick off the stop, long damped settle — the product feature), the linkage is sampled once into a door→drive inverse table. **Camera framing is locked on WIDTH, not height:** the stage canvas measures 0.88 aspect on desktop and 1.03 on mobile, so a fixed vertical FOV cropped the arm off one of them; vertical FOV is now derived per-aspect in `resize`. Also fixed en route: the cover-cap texture repeated the wordmark on all six faces of the rounded box (label is now its own plane). **CI gotcha:** the „no hex colors in components" guardrail greps `src/components` for `#rrggbb`, which catches canvas `fillStyle` strings too — three.js `0x…` literals are fine, CSS-style hex is not. Use `rgb()` in canvas textures (the old scene already did, which is why it never tripped). Verified at 1280 and 375, no console errors. **Open question for the client:** at the stage's 0.42 opacity the black anodised finish reads mid-grey, so "black hinge" is not obvious — raising stage opacity would fix it but changes a treatment the client already liked. | client feedback | src/components/home/hinge-scene.ts · here |
| 2026-08-24 | **Cash-on-delivery messaging pulled off the main pages (client feedback via Ivan).** Client: „да се махне 'плащане при доставка/наложен платеж' от главните страници и да го пише само в количката". Removed from the four places a browsing customer met it: the `PromoBar` (which showed it on EVERY page), the homepage hero lead, the hero stat row, and the trust band's card 02. **Kept deliberately** in `cart.codNote` (the cart summary card — exactly where the client wants it), the checkout form, and the order emails: the payment method must still be unambiguous at the point of ordering and in the confirmation. Also left the `terms` and `delivery-payment` CMS pages alone — those are the legal pages that must describe payment. The two gaps this opened were filled with **„Официален представител"** (Ivan's call), which ties into the new brands surface: trust card 02 became Официален представител / „Оригинален обков от водещи европейски производители…", and the hero stat became Официален представител. `heroLead` was reworded to „Мебелен обков от водещи европейски производители…" so the stat and the lead don't repeat the same phrase verbatim. **Gotcha worth remembering: the homepage hero subtitle is CONTENT, not code** — `site_settings.hero_subtitle` overrides `bg.ts home.heroLead`, and it contained „Плащане при доставка." So editing bg.ts alone changes nothing on a deployed site; the dev DB row was updated here and **production needs the same edit in /admin → Настройки**. `topbar.cod` was dropped from bg.ts entirely rather than left as an orphan key. Verified in the rebuilt stack at 1280 and 375: zero COD strings in the homepage HTML, cart note still present, no console errors. | client feedback | src/components/layout/PromoBar.tsx · bg.ts · (site)/page.tsx · site_settings (content) · here |
| 2026-08-24 | **BUG FIX: admin image uploads over ~10MB failed with a 500 — a regression from the site-lock PR (#63).** Client reported "media upload broken" on production; reproduced locally in the Docker stack (a 24MB JPEG → `HTTP 500 {"errors":[{"message":"Something went wrong."}]}` in 48ms, i.e. rejected before any sharp work). The app log named the cause: `Request body exceeded 10MB for /api/media. Only the first 10MB will be available unless configured` → `Error: Unexpected end of form` → **unhandledRejection**. Cause: **#63 broadened the middleware matcher** from `['/index.php','/controller=:path*']` (which never matched `/api`) to `['/((?!_next/static|_next/image|favicon.ico).*)']` so the site lock could gate every page — which also matched `/api/media`. Next buffers a matched request's body to hand it to middleware, capped by `middlewareClientMaxBodySize` (**10MB default**), so larger uploads arrived **truncated** and Payload's multipart parser died mid-form. Under ~10MB kept working, which is why it looked intermittent. **Fix: exclude `api` from the matcher** rather than raising the cap — `isLockExempt()` already exempts `/api` from the lock, so behaviour is unchanged, and raising the cap would instead hold every upload in memory under the app's 1024M container limit. The exclusion needs the `(?:/|$)` boundary: a bare `api` alternative would also exclude look-alikes like `/apixyz`, silently dropping them out of the lock (caught by the new test, not by review). Verified in the rebuilt stack: the same 24MB upload now returns **201 in 0.7s** with all five sized variants generated. Regression test `src/middleware.test.ts` pins both halves — /api unmatched, storefront + `/apixyz` still matched. **Also relevant on prod:** the sysadmin's nginx needs `client_max_body_size 12m` (DEPLOY §6) or nginx's 1MB default rejects photos with a 413 before the app ever sees them. | production uploads broken | src/middleware.ts · src/middleware.test.ts · DEPLOY §9 · here |
| 2026-08-05 | **Brand filter on category listings (PR 3 of 3).** `?brand=<slug>` chips above a category's grid — „Всички" plus one chip per brand actually present in that category, each with its count from `getBrandsInCategory()`, counted over the SAME descendant id set the listing uses so a chip's number always matches what clicking it shows. Hidden below two brands (one chip filters to the same list). **Hazards honoured:** `brand` joins `sort` in the `unstable_cache` key (otherwise page 2 of "най-евтини, само Blum" serves the plain listing's cached page 2), and an **unknown brand slug returns nothing rather than the unfiltered list** — silently ignoring it would tell the visitor those products are that brand's. **UX flaw caught in testing and fixed:** the controls row was inside the `products.length > 0` branch, so filtering to zero results made the chips vanish and left „изчисти" as the only escape — you could not switch to another brand. Hoisted out, so chips stay available on an empty result. Verified live: chip counts match SQL (Blum 3 / GTV 4 / Hettich 3 within mebelen-obkov), `?brand=nope` → 0 products, `?brand=sevroll` (real brand, none in this category) → dedicated empty message + working clear link + chips still offered, sort chips keep the brand, the active chip toggles the filter off, and switching brand drops a stale `page`. Filtered views are `noindex, follow` with the canonical on the clean URL. | client wanted brand-based access to the catalogue | src/components/catalog/BrandFilterChips.tsx · queries.ts · UI-SPEC §3 · DATA-MODEL §8 |
| 2026-08-05 | **Catalogue sorting (PR 2 of 3).** Sort by name / cheapest / priciest / newest on category + brand listings. **Needed a schema change:** prices live in the `items[]` array and Payload cannot sort on an array subfield, so `minPriceEurCents` is denormalised on Products in the same `beforeValidate` hook that builds `searchText`, indexed, and backfilled by migration `20260805_101500_product_min_price`. The backfill is the point — a bare ALTER leaves every row NULL, and Postgres sorts NULLs LAST ascending but FIRST descending, so "най-скъпи" would have led with priceless products. Verified after migrating the live dev DB: 0 rows with items and a NULL min price, 0 rows where the denormalised value disagrees with `MIN(items)`, and the hook keeps it in sync on edit (9100 → 42 → 9100 as a cheaper item was added and removed). **All three planned hazards closed:** (1) `sort` is now part of the `unstable_cache` key for both listing queries — without it, page 2 of "най-евтини" would serve the cache entry for page 2 of the default order, silently wrong with no error; (2) `Pagination` now takes the page's searchParams and builds hrefs via `listingHref`, so paging keeps the sort instead of dropping it (verified: next href `?page=2&sort=price_desc`, and the descending run continues across the boundary); (3) `?sort=` is never passed to Payload raw — `payloadSort()` whitelists to four known strings, so `?sort=searchText` and friends fall back to the default rather than ordering by an arbitrary column. Sort UI is plain `<Link>` chips, not a `<select>`: a select would need `useSearchParams` (opting the whole subtree into client rendering) and would break without JS. Sorted views are `noindex, follow` with the canonical on the clean URL. | client asked for quick price/name filters | src/lib/catalog/{sort,href}.ts · src/components/catalog/SortLinks.tsx · migration · UI-SPEC §3 · DATA-MODEL §3/§8 |
| 2026-08-05 | **BUG FIX (found while building the above): parent categories listed no products at all.** `getProductsByCategory` claimed in its own comment to "get all descendant category IDs", but the inline collector walked the whole tree pushing only ids whose slug MATCHED — and slugs are unique, so it always returned exactly one id. Products hang off leaves while customers browse from the parent, so `/category/mebelen-obkov` (11 children, 20 products beneath it) rendered an empty grid, contradicting UI-SPEC §3 ("products of all descendants"). Found because sorting appeared to do nothing there — the page had no products to sort. Extracted as `collectSubtreeIds()` in `src/lib/catalog/category-tree.ts` with tests (parent → whole subtree, mid-level → own subtree, leaf → itself, unknown slug → `[]` and never "everything"). Verified live: that page went from 0 to 20 products. | pre-existing, silently wrong | src/lib/catalog/category-tree.ts · queries.ts |
| 2026-08-04 | **Brands surface (PR 1 of 3) — client feedback via Ivan.** Client: put the brands we carry somewhere clickable, with the logo and the product count in brackets, so a customer hunting a specific brand has a way in. Ivan added: brand as a filter, sort by price/name, pagination-or-infinite-scroll. **Research first materially shrank the work** — Brands were already a separate admin collection (not a category, as Ivan hoped) *with* a logo upload; `/brand/[slug]` pages already existed; the product page already showed a clickable brand chip; and **pagination already existed** on category + brand pages. Ivan chose: keep pagination (no infinite scroll — better SEO, works without JS, and infinite scroll would fight the scroll-reset we just shipped), all three brand surfaces, delivered as 3 staged PRs. **This PR = surface only, no schema change:** `getBrandsWithCounts()` (one `payload.count` per brand, cached, tagged `['brands','products']`), `BrandCard`, `/brands` index, homepage strip, nav entries in header/mobile/footer, `productCount()` Bulgarian plural helper + tests. Verified against the stack: counts match the DB exactly (Blum 3 / GTV 4 / Hettich 4 / SEVROLL 2), the logo path renders a sized WebP via images.ts, and **counts revalidate without a restart** (unpublished a Blum product → 3→2 → republished → 3). Also fixed the brand page's logo to go through `images.ts` instead of a raw `.url`. **PR 2 = sorting** (needs a denormalised `minPriceEurCents` + migration/backfill, since prices live in a nested `items[]` array and cannot be sorted on); **PR 3 = brand filter**. Two hazards recorded for those: `unstable_cache` keys must gain every new param or a sorted page 2 serves the unsorted cache entry, and `Pagination` currently drops query params so it must be fixed before filters land. | client wants a brand route into the catalogue | src/lib/payload/queries.ts · src/components/catalog/BrandCard.tsx · UI-SPEC §2/§3b · DATA-MODEL §8 · plan `lazy-growing-flurry.md` |
| 2026-08-04 | **Header logo enlarged `h-7 lg:h-9` → `h-9 lg:h-11`** (28→36px mobile, 36→44px desktop) — client asked for "да се уголеми логото малко". Ivan chose ~20% after comparing rendered previews of current / +15% / +20% in the real header at both breakpoints. Snapped to the Tailwind 4px scale rather than exact percentages (so mobile is actually +29%, desktop +22%) to keep the spacing tokens intact. Verified in the rebuilt image: fits the 64px/84px header bar with no clipping and no horizontal overflow. Footer logo (`h-10`) deliberately left alone — the client's request was about the header. | client feedback | src/components/layout/Header.tsx · here |
| 2026-08-04 | **Scroll reset on forward navigation (`src/components/layout/ScrollReset.tsx`), from client feedback via Ivan.** Client on a real phone: tapping an item low on a listing "директно ме праща най-долу". Reproduced and measured with Playwright at 375px — App Router does **not** scroll to top on these navigations; the old offset is retained and the browser then clamps it to the shorter page's max, landing the visitor in the FOOTER. category→product: scrollY held at 1592 while the document shrank 3169→2003→1934, clamping to 1283 then 1214. Direct URL load was always fine, so it is client-side nav only. Fix is a layout-level client component keyed on `usePathname`, deliberately **not** a blanket scroll-to-top: a `popstate` flag suppresses the reset so back/forward restoration still works (verified: left listing at y=1592 → product y=0 → Back y=1592), and `location.hash` is respected so the `#main` skip link still jumps correctly. Keyed on pathname only, not searchParams — `useSearchParams` in a layout opts the whole subtree into client rendering. Verified across category→product, search→product, home→category, category→subcategory (all land at 0). **Note for future debugging:** the first Playwright run mis-measured (reported home→category as broken); repeating each path 4× showed it was noise — always repeat a scroll measurement before acting on it. | client-reported mobile bug | src/components/layout/ScrollReset.tsx · (site)/layout.tsx · here |
| 2026-07-28 | **`sharp` 0.34.5 → 0.35.3 + a pnpm `overrides` pin (Ivan green-lit the bump in-session).** Minor bump beyond patch level, so logged per rule 2. Reason: GHSA-f88m-g3jw-g9cj — sharp <0.35.0 inherits four libvips CVEs (2026-33327/33328/35590/35591) and sharp is the one runtime-reachable advisory (it decodes every admin image upload). Bumping the direct dependency alone was **not enough**: `next@16.2.11` pulls its own `sharp@0.34.5` for the image optimizer, so the vulnerable copy stayed installed — hence `overrides: {sharp: 0.35.3}` in `pnpm-workspace.yaml` (pnpm 11 reads overrides there, not from the package.json `pnpm` field). Verified: one sharp in the lockfile, libvips 8.18.3, audit high count 6→5 with only build/dev-only advisories left (brace-expansion, fast-uri, postcss), image upload + WebP variant generation re-tested in the Docker stack. Drop the override once next ships >=0.35. | close the only runtime-reachable advisory | package.json · pnpm-workspace.yaml · here |
| 2026-07-28 | **Security audit fixes (Ivan asked for an audit, then green-lit fixing everything).** (1) **Admin cookie now `Secure`** — Payload defaults `cookies.secure:false` and never infers it, so the admin JWT could ride a plain-HTTP request in clear (verified live: `Set-Cookie` had HttpOnly+SameSite=Lax, no Secure). Keyed off `NEXT_PUBLIC_SITE_URL` starting `https://` **rather than NODE_ENV**, because the dev Docker stack runs NODE_ENV=production over http://localhost and a Secure cookie there would lock the admin out of local testing. Paired with HSTS + :80→:443 redirect in DEPLOY §6. (2) **Cart payload now schema-validated** (`src/lib/validation/cart.ts`) — it arrives as a JSON string from localStorage and bypassed zod entirely; `"null"`, `"123"` and `{"length":1}` each crashed the order action (reproduced), and an unbounded array meant one request could drive thousands of sequential DB lookups. Now bounded: ≤50 lines, qty 1–999, ids ≤200 chars. (3) **`.gitignore` really covers `.env*`** — `.env.production`/`.env.backup` were NOT ignored despite CLAUDE rule 10 claiming otherwise (verified with `git check-ignore`); a sysadmin's pre-edit backup is exactly that shape. (4) **Max lengths on every free-text field** — Next's 1 MB action cap is not a validation bound. (5) `poweredByHeader:false`. (6) **Search escapes LIKE wildcards** — Payload maps `contains` to `ILIKE '%'||v||'%'`, so a bare `%` matched the whole catalogue (not injection; the value is bound). (7) Removed unreferenced `test.env` template leftover. **Audited and found correct, no change needed:** server-side price/total recomputation, `create:false` on Orders, live-verified access control (`/api/orders` + `/api/users` → 403, drafts invisible), email HTML escaping + nodemailer CRLF stripping (no header injection), JSON-LD `</script>` escaping, empty-`PAYLOAD_SECRET` fail-closed, login lockout, no secrets in git history. | pre-launch hardening pass | **`docs/SECURITY.md`** (threat model, controls + re-verification commands, full audit record, accepted risks) · src/lib/validation/cart.ts · src/lib/search.ts · Users.ts · .gitignore · DEPLOY §6/§8 · here |
| 2026-07-27 | **Pre-launch site lock — HTTP Basic Auth over the storefront** (Ivan, in-session; client asked for a "в разработка" gate now that the domain is live but the catalogue isn't ready — a confusion layer so stray visitors don't place orders, not a security boundary). Implemented in `src/middleware.ts` + pure `src/lib/site-lock.ts` (11 unit tests). No new dependency. ON iff **both** `SITE_LOCK_USER`/`SITE_LOCK_PASSWORD` are non-empty — deliberately no third on/off flag to drift out of sync. **`/admin` + `/api` exempt** (Payload has its own login; gating them would double-prompt the owner and break admin API calls); **`/robots.txt` exempt** (the compose healthcheck polls it — a 401 there = restart loop). Middleware `matcher` broadened from the 2 legacy-redirect patterns to all non-static paths; safe because the redirect lookups are exact-key map hits whose keys all start `index.php`/`controller=`. **Verified against a real `next start`:** anonymous 401 + `WWW-Authenticate`, wrong creds 401, correct creds pass, `/robots.txt` 200, `/checkout` 401, `/admin` not 401, legacy 301 intact. **Verified runtime (not build-time) env** — the same build locks/unlocks across restarts, so going live is an env edit + `docker compose up -d app`, no rebuild. **Gotcha found in testing:** the realm was Cyrillic → HTTP header values are latin1 ByteStrings → every locked page 500'd. Realm is now ASCII (`bg.siteLock.realm`) with a regression test; browsers no longer display the realm, so no visible-copy loss. **Two-stage gate (Ivan's refinement):** a locked URL answers **503 + the "в разработка" notice with NO `WWW-Authenticate`** (a customer reads an explanation instead of a bare password box; 503 = "temporary, don't index" for crawlers, and a 401 without the header is invalid HTTP). The notice's "Вход за тестване" button re-requests the same path with `?unlock=1`, which answers 401 **with** the header → browser prompts → redirect back to the clean URL, other query params preserved. `?unlock=1` is a hint, not a secret — it yields the prompt, not access. | client wants the live domain gated while content is prepared | src/middleware.ts · src/lib/site-lock.ts · DEPLOY §8 · .env.example |
| 2026-07-22 | **Altcha PoW difficulty recalibrated `cost` 50_000 → 4_000.** In altcha-lib v2's deriveKey scheme `cost` is the KDF iteration count, so a solve costs ~256 × cost SHA-256 hashes. 50_000 ≈ 12.8M hashes (measured ~30s single-threaded) — ~13× above Altcha's ~1M recommended default, with no added deterrence. 4_000 ≈ 1.0M = the standard default. Same SHA-256 PoW, HMAC signing, replay store, and `auto="onload"` pre-solve — no protocol change, no security reduction below the recommended level. Benchmarked with altcha-lib createChallenge+solveChallenge. | fix miscalibrated difficulty (Ivan: speed up only if security holds) | src/lib/altcha.ts · PR (perf/altcha-cost-calibrate) |
| 2026-07-17 | **Postgres pinned to 18 (`postgres:18-alpine`), not 16.** Ivan asked why not latest; 16 was just a conservative default. PG 18 is GA + supported by `@payloadcms/db-postgres` (Drizzle + node-postgres/`pg` 8.x); longer support runway (EOL ~2030). Migration DDL is standard SQL — applied unchanged on 18. Verified: migrate + seed + boot + build all green on PG 18.4. | latest, longer support, no downside for this workload | docker-compose · ARCHITECTURE §2 |
| 2026-07-17 | **FULLY-SEPARATED SELF-HOSTED STACK (Ivan authorized in-session; overrides the single-container design + amends CLAUDE rule 3's "no Redis").** Move from one app container (SQLite embedded + in-memory rate limit + Turnstile) to a multi-service `docker-compose`: **app** + **Postgres** (`db`, `@payloadcms/db-postgres`, `pgdata` vol) + **Redis** (`redis`, `ioredis`, rate-limit store w/ in-memory fallback) + **mail** (Postfix send-only relay, DKIM, `maildata` vol). Also: **Turnstile → self-hosted Altcha** (`altcha-lib` + `altcha` widget; no Cloudflare, no keys); **local image optimization** (Payload `imageSizes` + WebP via sharp). Cloudinary/managed-SaaS still rejected — this is all self-hosted containers on the client's box, which honors "no cloud lock-in". Ivan's reasoning: wants each concern isolated in its own container + future-proofing, self-hosts so has the resources, accepts the extra ops (I recommended the lean+hardened option; Ivan chose full separation with full info). Delivered as small green PRs S1–S7. Deliverability (SPF/DKIM/DMARC/PTR) + optional `RELAYHOST` smarthost are the sysadmin's. | client wants max isolation/future-proofing on own infra | ARCHITECTURE §1–5 · CLAUDE rule 3 · here |
| 2026-07-22 | **DEPENDENCY REFRESH AUTHORIZED (Ivan, in-session) — including majors, `payload` 4.x still excluded (beta, rule 2).** Rationale: now self-hosted, the frozen baseline's Cloudflare-compat driver is gone, so we can adopt newer versions + clear the security-audit backlog (49 advisories, mostly transitive in the Payload/admin + dev-tool trees). Delivered as small, individually-verified PRs by risk tier, NOT a big-bang bump: (1) safe patch/minor within majors [this PR]; (2) `payload`/`@payloadcms/*` 3.82→3.86 — Docker admin verify (3.85.2 once broke `/admin`); (3) `next` 15→16 spike — caching-model review + Docker; (4) dev-side majors (eslint 10, TS 7, @types/node 26, jsdom 29, @vitejs/plugin-react 6, dotenv 17…) one at a time; (5) assess `zod` 3→4 (breaking) + `graphql` 16→17 (Payload-pinned — likely hold). Amends the frozen-baseline rows (2026-07-06/07/08). **Tier 1 done:** react/react-dom 19.2.1→19.2.8, @playwright/test 1.61.1, vitest 4.1.10, tsx 4.23.1, eslint-config-next 16.2.11, @testing-library/react 16.3.2, @types/react 19.2.17, tailwindcss + @tailwindcss/postcss 4.3.3, prettier 3.9.6, vite-tsconfig-paths 6.1.1 — typecheck/lint/test/build green. **Tier 2 done:** `payload` + all `@payloadcms/*` 3.82.1→3.86.0 (types + importMap regenerated, no schema change → no migration). **Docker admin verified** (Playwright: login → dashboard, product edit page + Lexical richtext editor mount, zero console/page errors — the surface 3.85.2 once broke). Audit **49→39** advisories (high 15→11). **Tier 3 done:** `next` 15.4.11→16.2.11 (allowed by @payloadcms/next 3.86 peer `>=16.2.6 <17.0.0` — Payload ships Next-16 support). Only code change: `revalidate.ts` `revalidateTag(t)`→`revalidateTag(t, { expire: 0 })` (Next 16 requires a profile; `{expire:0}` = immediate blocking refetch = the pre-16 single-arg behavior, so admin edits still surface at once rather than after one stale-while-revalidate hit). Next 16 auto-set tsconfig `jsx: react-jsx` + added `.next/dev/types`. **Docker-verified on 16:** all storefront routes 200; admin+Lexical clean; **caching correctness proven** — REST edit of site-settings.heroTitle → afterChange hook → homepage reflects the new value immediately (then restored). **Tier 4 (dev-side majors):** jsdom 28→29, dotenv 16→17 (green). **HELD with reasons:** `eslint` 9→10 — blocked, `eslint-plugin-react@7.37.5` (transitive via eslint-config-next) calls `context.getFilename()` which eslint 10 removed → "getFilename is not a function"; revisit when the plugin ships eslint-10 support. `@vitejs/plugin-react` 4→6 — needs Vite ^8; our vitest 4 bundles Vite 7. `@types/node` 24→26 — keep matching the Node 24 runtime. `@types/three` 0.160→0.185 — keep matching `three@0.160.1` (three itself not bumped; WebGL hinge verified). **Tier 5 (assessed, all HELD):** `graphql` 16→17 — `payload@3.86` peer is `graphql: ^16.8.1` (hard blocker; we don't import graphql directly anyway). `typescript` 6→7 — `tsc --noEmit` passes clean on 7.0.2, but `typescript-eslint@8.65.0` (via eslint-config-next) hard-errors "does not support TS 7.0" (tracking typescript-eslint#10940) → lint/CI break; revisit when it lands. `zod` 3→4 — executable (ours alone, 2 test-covered files) but a breaking `errorMap`→`error` migration on the **checkout/contact** validation path for zero functional gain; hold (rule 7/9 — don't churn the order path without a reason). **Net: 4 dep-refresh PRs #55–#58 (plus altcha #54); the majors worth doing (Payload security, Next 16) done + Docker-verified; the rest held with evidence.** | self-hosting removes the CF-compat freeze; clear the audit backlog + modernize | package.json · here |
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
| 2026-07-11 | **CI was silently broken** — `pnpm/action-setup@v4` failed at the first step on every push ("No pnpm version is specified"), so the gate NEVER ran (typecheck/lint/test/guardrails all skipped). Fixed by pinning `packageManager: pnpm@11.10.0` (the frozen baseline — not a bump). Separately, the CI-only hex guardrail would have failed on the logo/admin SVGs → tokenized them | restore a real green CI before wiring any deploy | package.json · commits 7e8c4fe, 839a0d4 |
| 2026-07-11 | **main is branch-protected (Ivan):** PR required + `verify` CI must pass (strict/up-to-date) + linear history + no force-push/deletion; `enforce_admins` OFF (owner can override) + 0 required approvals (nonzero deadlocks on self-authored PRs). **Agents now work on feature branches + PRs — no direct commits to main** | Ivan directive | GitHub branch protection |
| 2026-07-11 | **Deploy model: manual first, CD later (Ivan).** First production deploy is a hand-run `pnpm deploy` from Ivan's machine under his CF auth; GitHub Actions CD gets wired only after one healthy manual deploy proves the path | Ivan directive | here |
| 2026-07-12 | **CD via Cloudflare Workers Builds** (native Git integration), NOT GitHub Actions — the local manual deploy is dead on Windows: OpenNext's esbuild bundling can't read pnpm symlinks ("Access is denied" on react/react-dom/styled-jsx), and `node-linker=hoisted` via `.npmrc` is ignored by pnpm 11. So builds run on Cloudflare's Linux builders. Workers Builds auto-generates the deploy token (no manual API token). Settings: build cmd `npx opennextjs-cloudflare build`; deploy cmd `npx opennextjs-cloudflare deploy`; root `/`; **non-production branch builds disabled** (only `main` deploys). Build-time vars in the dashboard "Build variables" box (`PAYLOAD_SECRET` + `NEXT_PUBLIC_SHOW_BGN`/`TURNSTILE_SITE_KEY`/`SITE_URL`); runtime secrets via `wrangler secret put` (`PAYLOAD_SECRET`, `TURNSTILE_SECRET_KEY`, `ORDER_INBOX_EMAIL`). Supersedes the 2026-07-11 "manual first" row. Build history: Worker → Deployments → "View build history" | Windows can't build OpenNext; Ivan chose the native option | CLOUDFLARE §9 (pending update) · CF dashboard |
| 2026-07-10 | **SCOPE CHANGE (Ivan authorized in-session):** build Econt + Speedy office/map selectors at checkout — overrides the "no courier API integrations" out-of-scope line in CLAUDE.md. Server-side API calls only (external calls to ee.econt.com + api.speedy.bg), credentials as CF secrets. Needs Ivan's courier accounts/keys (see task list). Ivan to amend CLAUDE.md scope + ARCHITECTURE when confirmed | Ivan directive | here; ARCHITECTURE (pending) |
| 2026-07-16 | **PLATFORM FLIP — off Cloudflare to self-hosted Docker (Ivan authorized in-session).** Client hosts on own infra; sysadmin owns reverse proxy / TLS / DNS / mail. New stack: Next.js standalone in a `node:24-bookworm-slim` container (`output:'standalone'`); **SQLite on a `data` volume** (`@payloadcms/db-sqlite`, `DATABASE_URI`); **media on a `media` disk volume** (Payload default adapter + **sharp** sized variants — sharp runs on Node); **in-memory** rate limit; **SMTP via nodemailer** (env-driven, sends from the domain); **Turnstile KEPT** (free, server-agnostic). Deps removed: `@opennextjs/cloudflare`, `wrangler`, `@payloadcms/db-d1-sqlite`, `@payloadcms/storage-r2`, Resend usage. Deps added: `@payloadcms/db-sqlite`, `nodemailer` (+ `@types/nodemailer` dev), `sharp` (already build-approved in `pnpm.onlyBuiltDependencies`). Rewrote ARCHITECTURE §1/§2/§3/§4/§5/§7/§11/§12 + CLAUDE.md rules 3/10/12 + §7; CLOUDFLARE.md marked LEGACY. Delivered as 7 small green PRs (see Status). SMTP endpoint + SPF/DKIM/DMARC (+PTR if self-hosted MTA) are the sysadmin's to provide — not code-blocking. | client requires self-managed hosting | ARCHITECTURE §1–3,5,7,11,12 · CLAUDE.md · here |

| 2026-07-17 | **R3 adds `three@0.160.1`** (+ `@types/three@0.160.0` dev) — the homepage WebGL hinge, pre-approved in the 2026-07-16 redesign row. Exact-pinned to the handoff's Three.js version; `three` is dynamically imported inside a client island so it stays out of the initial bundle (verified: `/` First Load JS = 110 kB). No native build step (no `allowBuilds` entry needed). | redesign hero (pre-approved) | package.json · here |
| 2026-07-16 | **REDESIGN — "1A Editorial" (Ivan handoff "Nasteh Redesign").** Full storefront visual overhaul: light editorial + engineering-drawing motif, mono-uppercase labels, square corners (radius scale zeroed), brushed-metal WebGL hinge hero. **1A everywhere** (the 1B industrial direction is NOT built). Fonts → **Golos Text** (body + headings) + **IBM Plex Mono** (labels), self-hosted via next/font, cyrillic subset — drops Playfair+Inter; Manrope not used. New palette (ARCHITECTURE §8): cream #F5F1E8, raised #FBF9F3, dark #221E19, ink #211D18, brass #A9803F (+ -dark #8C5E2A for accent text on light, -light #B0824A on dark), bronze #BE8C4C. Logo = stylized **HACTEX** wordmark (`public/logos/*` — Ivan to add the files); text stays Настех. Adds **`three`** (WebGL hinge, lazy, homepage-only) in the homepage PR. Contact stays settings-driven (mock's contact@nasteh.bg not hardcoded). Delivered as phased PRs R1–R7. | client-approved redesign | ARCHITECTURE §8 · here |

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

- [x] (phase-1.5) **Rate-limit KV namespace created + wired (2026-07-12).**
      Prod id `c245cbd850184f1fa01a59d96f55eb48`, preview id
      `306dc8a138db4ffab92e8fe5bf2b04aa`; `kv_namespaces` binding `RATE_LIMIT_KV`
      added to `wrangler.jsonc`, id recorded in CLOUDFLARE §3. Local dev uses a
      LOCAL KV (Ivan chose "no" to remote). This flips the app rate-limiter from
      fail-open to ACTIVE in production once deployed.

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
  **Third guardrail (also invisible locally): "Env key-drift check"** — every key
  in `.env.example` must also be listed in `.github/workflows/env-keys.txt`, or
  CI fails on the LAST step (so everything else looks green first). Adding an env
  key ⇒ regenerate the list in the same commit:
  `grep -oP '^[A-Z_]+(?==)' .env.example | sort > .github/workflows/env-keys.txt`.
  Tripped by the SITE_LOCK_* keys (PR #63).

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

- [ ] **Site lock cleared** — `SITE_LOCK_USER`/`SITE_LOCK_PASSWORD` emptied and
      `docker compose up -d app`; homepage returns 200 anonymously (DEPLOY §8)
- [ ] **Privacy policy covers order metadata** — each order stores the customer's
      IP + user-agent (`Orders.meta`, personal data under GDPR). The policy must
      say so and state a retention period; agree a deletion cadence with the owner
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
