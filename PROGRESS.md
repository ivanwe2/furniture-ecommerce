# PROGRESS.md — live state

> Agents: read at session start; update BEFORE every commit (same commit).
> Ivan: resolve "Blocked / Decisions needed" between sessions.

## Status

**Current phase:** 1 — Foundation & platform verification
**Current task:** 1.3 tooling (in progress) — 1.1/1.2 done; 1.5/1.7/1.8 need Ivan
**Repo state:** scaffolded from official template; frozen baseline recorded
(next 15.4.11 · payload 3.82.1). Docs reconciled to template reality.
**Last session summary:** Aligned docs with reality (`.env`, payload 3.82.1
baseline, `D1`/`R2` binding names); recorded verified frozen baseline; flagged
`/admin` RSC error as a blocker (see below).

## Phase checklist

- [ ] Phase 1 — Foundation & platform verification
- [ ] Phase 2 — Data layer
- [ ] Phase 3 — Domain logic + tests
- [ ] Phase 4 — Design system & shell
- [ ] Phase 5 — Catalog
- [ ] Phase 6 — Cart & COD checkout
- [ ] Phase 7 — Content & compliance
- [ ] Phase 8 — SEO & performance
- [ ] Phase 9 — Import & seeding
- [ ] Phase 10 — Launch & handover

### Active phase task breakdown
(Copy the active phase's task list from docs/PHASES.md here; tick as you go;
record actual hours at phase completion.)

- [x] 1.1 Provision account/template/local boot (⚠ `/admin` login throws an RSC
      serialization error — see Blocked; first-admin creation is gated on it)
- [x] 1.2 Vendor repo layout + docs
- [ ] 1.3 Tooling (TS/ESLint/Prettier/vitest/scripts)
- [ ] 1.4 CI + custom grep checks
- [ ] 1.5 RATE_LIMIT_KV binding
- [ ] 1.6 bg.ts + t() + test
- [ ] 1.7 First deploy + secrets
- [ ] 1.8 Platform verification a/b/c/d
- [ ] 1.9 Cleanup probes

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

## Blocked / Decisions needed

_(Format per CLAUDE.md §6. Agents STOP the blocked task after writing here.)_

- [ ] (phase-1.1) `/admin` login + create-first-user throw an RSC serialization
      error, so the first admin user can't be created locally.
      Evidence: `GET /admin/login 200` then
      `⨯ Error: Functions cannot be passed directly to Client Components … at
      stringify … digest: '895802911'`.
      Diagnosis: NOT a version mismatch — `payload` and every `@payloadcms/*` are
      a consistent 3.82.1, next 15.4.11, react/react-dom 19.2.1, `importMap.js`
      present. This is the template's tested combo, so it points at build/runtime
      state, not deps.
      Options (try in order — all non-destructive, no dependency changes):
        A) Clear stale build cache: stop dev, run `pnpm devsafe`
           (`rm -rf .next .open-next` then `next dev`), reload `/admin`.
        B) Regenerate the admin import map: `pnpm generate:importmap`, restart dev.
        C) If it persists, likely a react 19.2.1 vs next 15.4.11 RSC edge — check
           whether the pristine template lockfile pinned react 19.1.x; realigning
           react/react-dom to next@15.4.11's expected minor is a **dependency
           decision → log it before changing anything**.
      Recommendation: A then B at the keyboard (you can watch `/admin` live); only
      reach for C if both fail. This needs interactive verification, which is part
      of task 1.8 (yours). None of tasks 1.3/1.4/1.6 depend on admin booting, so
      they proceeded.

## Notes & surprises

_(Quirks, workarounds, deliberate TODOs the next session must know.)_

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

## Actual hours

| Phase | Actual |
|---|---|
| 1 | |
| 2 | |

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
