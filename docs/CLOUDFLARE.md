# CLOUDFLARE.md — platform operations

> ⚠️ **LEGACY / RETIRED (2026-07-16).** The project moved off Cloudflare to a
> self-hosted Docker deploy (Ivan's call — client hosts on their own infra;
> ARCHITECTURE §1/§3, Decisions log 2026-07-16). Nothing here describes the
> current platform. It is kept only as history for the interim `*.workers.dev`
> deploy and for the one-time data lift (D1 export / R2 download) during
> cutover. **Do not follow these commands for new work.** The current
> platform ops live in **`docs/DEPLOY.md`** (incl. the one-time D1→SQLite and
> R2→disk cutover in §4).

Everything Cloudflare-specific lived here. Agents: follow COMMANDS as
written; if a command errors, Escalate (CLAUDE.md §6) — do not improvise
alternative wrangler invocations, and never run destructive ops against
remote resources without explicit instruction.

## 1. Account & plan

- Single Cloudflare account on the **client-owned Gmail** (Ivan has access
  during the build; owner keeps recovery codes).
- **Workers Paid plan ($5/mo)** — activated before first production deploy.
  Rationale: CPU-time headroom for SSR + Payload admin, larger bundle
  ceiling, higher D1/KV/R2 included quotas, zero commercial-use ambiguity.
- The `nasteh.bg` zone lives in this account after DNS cutover (§8).

## 2. Scaffold origin

The repo starts from the **official Payload-on-Workers template**
(Cloudflare × Payload team; the "Deploy to Cloudflare" template that
provisions a Worker + D1 database + R2 bucket, pre-bound). Scaffold via the
dashboard button or its documented CLI equivalent, then vendor the generated
project into our repo layout (ARCHITECTURE §12) in the same Phase 1 commit.

Non-negotiables at scaffold time (Phase 1 acceptance criteria):
- Resolved versions: Next 15.4.x (template-shipped), Payload 3.82.x (template pin;
  NOT 4.0-beta — check `package.json` + lockfile), current `@opennextjs/cloudflare`.
- Keep the template's D1 adapter and R2 wiring exactly as generated. Do not
  swap the DB adapter, do not add `sharp` (it cannot run on Workers).
- Record exact versions of next / payload / adapter / wrangler in
  PROGRESS.md → Decisions log. That's the frozen baseline (CLAUDE.md rule 2).

## 3. Bindings & wrangler.jsonc

Canonical binding names (used in code via `env`/`getCloudflareContext` per
the template's pattern — keep the template's access helper):

| Binding | Type | Name in code | Purpose |
|---|---|---|---|
| D1 | d1_databases | `D1` | Payload database (real: `nasteh-db`, id `85538a45-…`) |
| R2 | r2_buckets | `R2` | media originals (real: `nasteh-media`) |
| R2 | r2_buckets | `NEXT_INC_CACHE_R2_BUCKET` | OpenNext incremental cache (ISR/tags) — commented out until wired (Phase 8) |
| KV | kv_namespaces | `RATE_LIMIT_KV` | rate-limit counters (real id `c245cbd8…`, preview `306dc8a1…`; created 2026-07-12) |
| Assets | assets | `ASSETS` | static assets |

Binding names follow the **template's** defaults (`D1`, `R2`, `ASSETS`) — this
is what `src/payload.config.ts` reads (`cloudflare.env.D1`, `cloudflare.env.R2`).
Earlier drafts of this table said `DB`/`MEDIA_BUCKET`; reconciled to reality
2026-07-08.

`wrangler.jsonc` is committed. It contains binding IDs and public `vars`;
never secrets. When adding a binding: update wrangler.jsonc + this table +
`.env.example` (if a local var is involved) in one commit.

Public vars (wrangler `vars` block): `NEXT_PUBLIC_SITE_URL`,
`NEXT_PUBLIC_SHOW_BGN`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`,
`NEXT_PUBLIC_MEDIA_HOST`.

## 4. Secrets

| Secret | Used by | Set with |
|---|---|---|
| `PAYLOAD_SECRET` | Payload auth/crypto | `npx wrangler secret put PAYLOAD_SECRET` |
| `RESEND_API_KEY` | order/contact emails | `npx wrangler secret put RESEND_API_KEY` |
| `TURNSTILE_SECRET_KEY` | server-side captcha verify | `npx wrangler secret put TURNSTILE_SECRET_KEY` |
| `ORDER_INBOX_EMAIL` | owner notification target | secret (or var — it's semi-public; keep secret for tidiness) |

Local equivalents in `.env` (gitignored — the template reads `process.env`
via Next/dotenv, not `.dev.vars`). `.env.example` lists every key with empty
values and MUST stay in sync — CI greps for drift (Phase 1 sets this check up).

Secret rotation: rotate in dashboard/CLI → redeploy → verify checkout email
round-trip. `PAYLOAD_SECRET` rotation logs out all admin sessions — warn the
owner first.

## 5. Local development

Two modes (template provides both; keep its package.json scripts):

- `pnpm dev` — Next dev server with local bindings emulation (miniflare):
  local D1 (SQLite file under `.wrangler/state`), local R2, local KV. Use
  for all daily work. Image transformations do NOT run locally —
  `images.ts` must fall back to the original URL when
  `process.env.NODE_ENV === 'development'` (spec'd in DATA-MODEL/images
  notes; verify the fallback in Phase 4).
- `pnpm preview` — full OpenNext build served through wrangler (production-
  faithful). Use before completing any phase that touches routing, caching,
  server actions, or bindings.

Local D1 reset (LOCAL ONLY — never remote): delete `.wrangler/state` and
re-run migrations + `pnpm seed:dev`.

## 6. D1 & migrations

- D1 is SQLite. Consequences for code are documented in DATA-MODEL (§Search
  — Cyrillic case-insensitivity; §Types — booleans as integers handled by
  the adapter; no interactive multi-statement transactions — the adapter
  batches; do NOT hand-write transaction code).
- Schema changes flow through **Payload migrations** (Drizzle-based),
  using the template's scripts. Canonical workflow:

```
# after editing a collection config:
pnpm payload migrate:create   # generates SQL migration in ./migrations
pnpm migrate:local            # applies to local D1 (template script)
# commit collection change + migration file TOGETHER
# production apply happens via the deploy script or:
pnpm migrate:remote           # payload migrate against remote D1 (NODE_ENV=production)
```

- If the template names these scripts differently, adopt ITS names and
  update this file in the same commit (Decisions log entry).

**Script reconciliation (Phase 1.3 — actual names/commands).** The template's
`package.json` scripts were reconciled to the PHASES 1.3 contract:

| Script | Command | Note |
|---|---|---|
| `typecheck` | `tsc --noEmit` | added (template had none); needs `src/types/globals.d.ts` ambient CSS decls to pass bare `tsc` |
| `lint` | `eslint .` | template script kept |
| `test` | `pnpm run test:int` (vitest) | was `test:int && test:e2e`; Playwright/e2e dropped from the gate per CONVENTIONS §8. `vitest.config.mts` include repointed to co-located `src/**/*.test.ts` |
| `build` | `next build` | **was `payload build` — not a valid command in Payload 3.82.1.** OpenNext's `opennextjs-cloudflare build` shells out to `pnpm build`, so it must be `next build` |
| `preview` / `deploy` | `opennextjs-cloudflare …` | template scripts kept |
| `migrate:local` | `payload migrate` | non-production → local D1 (`.wrangler/state`) |
| `migrate:remote` | `NODE_ENV=production PAYLOAD_SECRET=ignore payload migrate` | production → remote D1; run only per §6 rules |
| `seed:dev` | `tsx scripts/seed-dev.ts` | script name reserved; the file lands in Phase 2 |

⚠ **`pnpm build` needs Cloudflare auth.** `next build` compiles + typechecks
cleanly, but "Collecting page data" imports the Payload API route, which inits
Payload and opens the Cloudflare context against **remote** D1 — so a full build
requires `CLOUDFLARE_API_TOKEN` (or an interactive `wrangler login`). This is by
the template's design. CI therefore gates on typecheck+lint+test+greps (no creds
needed); full-build verification happens in the deploy flow (task 1.7). See
PROGRESS → Blocked.
- NEVER edit an applied migration. New change ⇒ new migration.
- NEVER run `migrate:remote` outside a deploy unless PROGRESS.md contains
  an explicit instruction from Ivan.
- Backups: before every production deploy that includes a migration, export
  a snapshot: `npx wrangler d1 export D1 --remote --output backups/<date>.sql`
  (backups/ is gitignored; Ivan archives). D1 also has Time Travel
  point-in-time restore — treat it as second line, not a reason to skip
  exports.

## 7. R2 & Image Transformations

Setup (Phase 1, once):
1. R2 bucket (template-created) holds media originals; keys are Payload
   upload filenames.
2. Attach custom domain **media.nasteh.bg** to the bucket (R2 → bucket →
   Settings → Custom Domains). Requires the zone to be on Cloudflare — until
   DNS cutover (§8) use the bucket's r2.dev URL in dev and STAGE behind
   `NEXT_PUBLIC_MEDIA_HOST`.
3. Zone → Images → Transformations → enable for the zone.
4. Verify: `https://media.nasteh.bg/cdn-cgi/image/width=480,format=auto/<some-key>`
   returns a resized webp/avif. This verification is a Phase 1 acceptance
   criterion (velocity decision: no separate spike — but this ONE check
   happens before any catalog code, because the whole media pipeline sits
   on it).

Rules:
- All transformation URLs are built by `src/lib/images.ts` ONLY
  (presets/params in ARCHITECTURE §5). No literal `/cdn-cgi/image/`
  anywhere else — CI greps for this (Phase 1).
- Never enable a Worker route on `media.nasteh.bg/*` (breaks/loops
  transformations).
- Quota watch: transformations bill per unique transformation per month;
  our preset discipline keeps uniques ≈ images × 5. Check the dashboard
  during Phase 10 and note the number.

## 8. Domain & DNS cutover (Phase 10 — coordinate with owner)

Current state: nasteh.bg registered at a BG registrar (identify via whois —
likely SuperHosting/ICN/Jump), mail possibly on the same host, plus the
existing gmail. Procedure:
1. Inventory existing DNS records at the current host — **screenshot/export
   everything, especially MX and TXT (SPF)**.
2. Add site to Cloudflare (free zone plan is fine; Workers Paid is
   account-level) → Cloudflare presents found records → manually verify MX
   + SPF TXT records match the inventory BEFORE proceeding.
3. Switch nameservers at the registrar to the assigned Cloudflare pair.
4. After propagation: confirm mail flow (send test email to the client's
   existing address), then attach the Worker to `nasteh.bg` +
   `www.nasteh.bg` (Workers → routes/custom domains per template docs) and
   `media.nasteh.bg` to R2 (§7).
5. Resend domain verification: add Resend's DKIM/SPF records in the CF
   zone; verify; switch email `from` to `poruchki@nasteh.bg` (or as owner
   prefers). Until verified, Resend's shared domain works for testing but
   NOT for launch (deliverability + ЗЗП seriousness).
6. Old PrestaShop host: keep hosting account alive (mail may live there!)
   unless confirmed otherwise; only the DNS pointing changes. Coordinate
   any hosting cancellation with the owner AFTER mail is confirmed
   unaffected.

## 9. Deploy

- `pnpm deploy` (template script: OpenNext build + wrangler deploy +
  remote migrations if wired). Production deploys happen from `main` only,
  green CI only.
- Post-deploy smoke (scripted in Phase 10, manual before that): home,
  category, product, add-to-cart, full checkout round-trip on a test order,
  admin login, image transformation URL, one redirect from the 301 map.
- Rollback: Workers dashboard → deployments → rollback to previous version.
  NOTE: rollback does NOT revert D1 migrations — if a bad deploy included a
  migration, restore from the §6 export (Escalate first; never improvise a
  down-migration against production).
- Preview deploys: `pnpm preview` locally; optional `wrangler versions
  upload` preview URLs for sharing with the owner (nice-to-have, not
  required).

## 10. Turnstile

- Create widget in dashboard (Turnstile → Add site → nasteh.bg +
  localhost). Mode: Managed. Copy sitekey → `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
  var; secret → `TURNSTILE_SECRET_KEY` secret.
- Server verify: POST `https://challenges.cloudflare.com/turnstile/v0/siteverify`
  with secret + token + remoteip; reject on `success: false` with BG error
  (UI-SPEC copy key `errors.captcha`). Implementation lives in
  `src/lib/turnstile.ts`, called only from server actions.
- Local dev: use Cloudflare's documented test sitekey/secret pair (always
  passes) via `.env` so the form flow is testable offline.

## 11. Observability

- `wrangler tail` for live logs during debugging.
- Workers dashboard: errors, CPU time, invocations — glance during Phase 10
  smoke and the first post-launch week.
- Log discipline: order numbers yes, customer personal data no (CLAUDE.md
  rule / ARCHITECTURE §7). `console.error` with a stable prefix
  (`[order]`, `[email]`, `[import]`) so tail-filtering works.
- Optional (Decisions log if adopted): Sentry free tier via its Workers-
  compatible SDK. Not required for launch.

## 12. Cost model (for Ivan's client conversation)

| Item | Monthly |
|---|---|
| Workers Paid (incl. generous D1/KV/R2/requests allowances) | $5 |
| R2 storage at catalog scale (<10 GB) | ~$0 (within included) |
| Image transformations (≈2.5k uniques) | $0 within free allotment; cents if exceeded |
| Turnstile, DNS | $0 |
| Resend (≤3k emails/mo tier) | $0 |
| Domain renewal (registrar, yearly) | ~€15–30/yr |

Positioning: hosting is **included in the monthly support retainer** from
day one. Do not present it as free-forever, do not invent later policy
changes — the retainer honestly covers infra + Ivan's availability.
