# OVERNIGHT AUTONOMOUS BUILD — kickoff prompt

> Operational note, not part of the doc contract. Paste the fenced block below to
> launch an unsupervised agent. Leave this file untracked or commit it separately —
> don't let it ride in a task commit.

---

````text
Read CLAUDE.md, then PROGRESS.md, then docs/ARCHITECTURE.md, docs/PHASES.md,
docs/CONVENTIONS.md, docs/DATA-MODEL.md, docs/UI-SPEC.md, docs/CLOUDFLARE.md and
docs/REFERENCE.md before doing anything. PROGRESS.md is the source of truth — trust
it over this message wherever they differ. Follow the CLAUDE.md session loop and
commit protocol exactly.

== MODE: autonomous, unsupervised, long-running ==
Ivan is asleep. Work continuously through PHASES.md IN ORDER for as long as you have
budget and unblocked work. DO NOT stop after one task or one phase. You only end when
you genuinely run out of safe, unblocked work (or hit your limits). When a task is
blocked, log it under PROGRESS.md → Blocked and MOVE ON to the next unblocked task —
never halt the whole run because one thing is blocked.

== STATE (all committed; tree clean except wrangler.jsonc) ==
- Frozen baseline (do NOT change any of it — CLAUDE.md rule 2; Payload 4 forbidden):
  next@15.4.11 · payload@3.82.1 (all @payloadcms/* = 3.82.1) · react/react-dom@19.2.1 ·
  @opennextjs/cloudflare@1.20.1 · wrangler@4.107.0 · node 24 · pnpm 11.10.
- Done: Phase-1 tasks 1.1, 1.2, 1.3. Commits 6ddd6c9 (docs+baseline), 60ca85d (tooling).
- Green gate PASSES: `pnpm typecheck` + `pnpm lint` (0 errors) + `pnpm test` (vitest).
  vitest already picks up co-located src/**/*.test.ts.
- `pnpm build` (= next build) compiles + typechecks but its page-data step connects to
  REMOTE D1 and needs Cloudflare auth. NEVER add build (or any credentialed/remote step)
  to CI or to your per-commit gate. Local/CI must never touch remote resources.
- wrangler.jsonc has uncommitted changes (Ivan's real bindings). NEVER stage it. Always
  `git add` your specific files — never `git add -A` / `git add .`.

== SKIP THESE (human-gated — do NOT attempt; log in PROGRESS Blocked and move on) ==
- 1.5 (KV namespace create), 1.7 (deploy + secrets), 1.8 (deployed-URL verification),
  1.9 (depends on 1.8). The exact commands Ivan must run are already in PROGRESS Blocked.
- Anything needing the Cloudflare dashboard/account/credentials, DNS cutover, Resend
  domain verification, Turnstile dashboard keys, or a live deployed URL.
- A phase's final "complete" commit when its acceptance criteria require deployed/visual
  verification you cannot do. Instead do all the phase's code, then commit it as
  "<phase> code-complete — pending Ivan verification" and note the open ACs in PROGRESS.

== WORK ORDER (PHASES.md order; skip the human-gated bits above) ==
1. Finish Phase 1 agent tasks:
   - 1.4 CI (.github/workflows/ci.yml per PHASES 1.4 + REFERENCE §11): node 24, pnpm,
     `--frozen-lockfile`; the two guardrail greps (hex colors in src/app|src/components;
     literal `/cdn-cgi/image/` in src except src/lib/images.ts — which doesn't exist yet
     but write the exclude anyway); then `pnpm typecheck`, `pnpm lint`, `pnpm test`; then
     an `.env.example` key-drift check vs a committed key list. NO `pnpm build` in CI
     (needs CF auth) — say so in a comment. First expand `.env.example` from its single
     PAYLOAD_SECRET to the full ARCHITECTURE §11 key set (4 secrets + NEXT_PUBLIC_* vars;
     no Phase-2 seed vars). Verify the greps + drift check pass locally before committing.
     Commit: ci(phase-1): add CI + guardrail greps + env-drift check
   - 1.6 bg.ts (UI-SPEC §11, CONVENTIONS §6): seed the `bg` object verbatim from UI-SPEC
     §11; add a typed `t()` with dot-path key typing (bad paths = type error); co-located
     vitest test src/lib/i18n/bg.test.ts. House style: no semicolons, single quotes,
     printWidth 100. Commit: feat(phase-1): add bg.ts i18n + typed t() helper
2. Phase 2 — data layer (all LOCAL): collections + hooks + revalidate + migrations
   (`pnpm migrate:local`, regen types) + query layer + seed (`pnpm seed:dev`). Verify via
   typecheck/build + the local Payload API + curl (orders REST create → 403; product read
   → published only). Bulgarian labels everywhere. For the 2.5 category tree "from the live
   site's menu": fetch nasteh.bg's taxonomy if you have web tooling; otherwise build the
   structure with a clearly-marked placeholder tree and flag it for Ivan — do NOT block.
3. Phase 3 — domain logic + tests (pure, fully local, highest certainty; do it thoroughly):
   money.ts (half-up boundary tests), slug.ts (full Cyrillic table), cart store + totals,
   validation schemas, rate-limit core, turnstile helper. Build shared lib helpers to their
   REFERENCE spec when an earlier phase first needs them (e.g. slug.ts for Phase 2 hooks),
   always with vitest coverage.
4. Phase 4 → 9: build to UI-SPEC / DATA-MODEL, in order, as far as you get. See limits below.

== ADMIN RSC BLOCKER (see PROGRESS Blocked) ==
You MAY try the safe, non-dependency fixes: stop dev → `pnpm devsafe` (clears .next/.open-next)
→ `pnpm generate:importmap` → restart → hit /admin and grep the dev-server output for the
RSC error. If it clears, note it and use the admin for Phase-2 verification. If it needs a
DEPENDENCY change or you can't confirm it's fixed, DO NOT change deps — log it and keep
building code that doesn't need admin (verify collections via the local API / curl / typecheck
instead of the admin walkthrough). Don't rabbit-hole.

== VERIFICATION LIMITS (unsupervised) ==
You cannot do real visual/browser QA overnight. For UI work: build precisely to UI-SPEC; run
typecheck/lint/test/build; run the dev server and use any available browser/screenshot tooling
for spot-checks where you can. Where genuine visual verification (375px & 1280px, Lighthouse,
Cyrillic glyph coverage — a hard gate) is impossible headless, build to spec and add a
"NEEDS IVAN VISUAL PASS" line in PROGRESS for that item. Do NOT block on it, and do NOT claim
verification you didn't perform (CLAUDE.md: report outcomes faithfully).

== NON-NEGOTIABLES (these keep an unsupervised run safe — hold them absolutely) ==
- NEVER guess. Ambiguous requirement with user-visible consequences and no clearly-correct
  default → PROGRESS Blocked (problem + options + recommendation) → next unblocked task.
  Guessing is the only unrecoverable mistake.
- Repo GREEN (`pnpm typecheck && pnpm lint && pnpm test`) before EVERY commit. Commit each
  coherent green unit so overnight progress is durable and nothing is lost.
- No new deps, no version bumps, no architectural (🔒) deviation, no Payload 4. Need a dep?
  Log it in Decisions and do something else.
- No remote/destructive Cloudflare ops. Local D1/R2/KV only. Never deploy, never
  migrate:remote, never touch remote data.
- Money = integer euro cents via money.ts; all user-facing strings via bg.ts; image URLs via
  images.ts; server reads via the query layer (getPayload) only. Bulgarian for everything the
  owner/customer sees; English for code, comments, commits, docs.
- One logical change per commit; PROGRESS.md updates ride in the SAME commit; stage specific
  files only; never touch wrangler.jsonc.

== END STATE ==
Whenever you stop, leave the repo green and fully committed, and make PROGRESS.md immaculate:
what you completed (with commit hashes), what's green, what's blocked (with the exact commands
Ivan must run), any "NEEDS IVAN VISUAL PASS" items, and the single next unblocked task. Write
it so a cold agent — or Ivan over coffee — can see the state in one read.
````
