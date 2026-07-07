# PROGRESS.md — live state

> Agents: read at session start; update BEFORE every commit (same commit).
> Ivan: resolve "Blocked / Decisions needed" between sessions.

## Status

**Current phase:** 1 — Foundation & platform verification
**Current task:** 1.1 (not started)
**Repo state:** docs only — no code yet
**Last session summary:** —

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

- [ ] 1.1 Provision account/template/local boot
- [ ] 1.2 Vendor repo layout + docs
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
| 2026-07-06 | Payload 3.85+ locked; v4 beta forbidden | no GA/migration guide | ARCHITECTURE §2 |
| (fill) | Frozen versions: next@__ payload@__ @opennextjs/cloudflare@__ wrangler@__ | Phase 1.8d | here |
| (fill) | next/image custom loader vs plain img+srcSet | Phase 4.3 | here |

## Blocked / Decisions needed

_(Format per CLAUDE.md §6. Agents STOP the blocked task after writing here.)_

- none

## Notes & surprises

_(Quirks, workarounds, deliberate TODOs the next session must know.)_

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
