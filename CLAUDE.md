# NASTEH.BG REBUILD — AGENT OPERATING PROTOCOL

You are one of several AI coding agents (Claude Code, local models) building
an e-commerce catalog for Настех ООД — a furniture-fittings (мебелен обков)
retailer in Plovdiv, Bulgaria. The site: product catalog with SKU-level items
tables, cart, cash-on-delivery checkout (наложен платеж — courier collects
payment), Bulgarian-only UI, Payload admin for the owner.

Explicitly OUT of scope (do not build, scaffold, or "prepare for"):
online card payments, payment provider SDKs, courier API integrations,
customer accounts/login, multi-language, wishlists, reviews, analytics.

This file is the contract. Read it at the start of EVERY session.

---

## 1. Document index — the source of truth

| File | Contains | Read when |
|---|---|---|
| `CLAUDE.md` | This protocol | Every session start |
| `PROGRESS.md` | Live state: current phase/task, decisions, blockers | Session start AND before every commit |
| `docs/ARCHITECTURE.md` | Locked stack + system design + rationale | Session start; before any structural choice |
| `docs/CLOUDFLARE.md` | LEGACY — the retired Cloudflare deploy, kept for history | not for new work — see ARCHITECTURE §1/§3; Docker ops doc lands in the container PR |
| `docs/DATA-MODEL.md` | Payload collections, hooks, query layer, import contract | Before touching any schema, hook, or query |
| `docs/CONVENTIONS.md` | Code style, patterns, testing, error handling | Before writing code in an unfamiliar area |
| `docs/UI-SPEC.md` | Page-by-page specs, components, BG copy, a11y | Before building/altering any UI |
| `docs/PHASES.md` | Ordered tasks + acceptance criteria + commit points | Before starting/resuming any task |
| `docs/REFERENCE.md` | Authoritative code skeletons for high-drift seams | Before implementing anything it covers |

Precedence if documents ever conflict: PHASES < UI-SPEC < DATA-MODEL <
CONVENTIONS < CLOUDFLARE < ARCHITECTURE < CLAUDE.md. Report the conflict in
PROGRESS.md → Blocked either way.

---

## 2. Hard rules — violations are never acceptable

1. **No architectural deviation.** ARCHITECTURE.md decisions marked 🔒 are
   final. If blocked or convinced a decision is wrong: STOP the task, write
   the problem + your proposed alternative + evidence under
   `PROGRESS.md → ## Blocked / Decisions needed`, and move to another
   unblocked task or end the session. Never silently substitute.
2. **Frozen dependency baseline.** Only packages listed in
   ARCHITECTURE.md §Dependencies. New package or ANY version bump beyond
   patch level ⇒ entry in `PROGRESS.md → ## Decisions log` first (one-line
   why). Never move to a new major. **Payload 4.x (beta) is forbidden.**
3. **Self-hosted, no cloud lock-in.** The app runs as a Docker container on
   the client's own infrastructure (ARCHITECTURE §1). Approved external
   dependency: GitHub (code + CI). Order/contact email leaves via a
   sysadmin-provided SMTP endpoint (env-configured). No managed infra
   services — no Cloudflare, no Neon/Upstash, no Vercel, no S3, no
   third-party image CDNs, no Redis. A new external dependency ⇒ Escalation
   (§6), not adoption.
4. **Money is integer euro cents** (`priceEurCents`). Never floats, never
   strings, never BGN stored anywhere. All display through
   `src/lib/money.ts`. A raw `.toFixed(` or hardcoded `€` in a component is
   a defect.
5. **All user-facing strings from `src/lib/i18n/bg.ts`.** No literal
   Bulgarian (or English) UI strings inside components. Add missing keys to
   bg.ts in the same commit that uses them.
6. **TypeScript strict.** No `any`, no `@ts-ignore`. `@ts-expect-error`
   only with a trailing comment naming the upstream issue.
7. **No future-phase work, no speculative abstraction.** Build exactly the
   current task. A helper used once stays inline until a second caller
   exists.
8. **Server reads via the Payload local API** (`getPayload()`) inside the
   query layer (`src/lib/payload/queries.ts`). Components never import
   payload directly, never fetch Payload REST from the server, never query
   D1 directly (except inside the query layer where the pattern requires
   raw SQL — see DATA-MODEL §Search).
9. **Orders are sacred.** Order create path: server action only. Prices and
   totals recomputed server-side from the DB. The order row is written
   BEFORE emails are attempted; email failure never rolls back or blocks
   the order.
10. **Never commit secrets.** `.env` and `.env*` are gitignored;
    `.env.example` stays current (keys only, no values). Production secrets
    live only in the host `.env` the sysadmin manages, readable by the
    container. If you ever see a secret value in a file you are about to
    commit — stop, remove, report.
11. **Repo stays green.** Never commit with failing
    `pnpm typecheck && pnpm lint && pnpm test && pnpm build`.
12. **No destructive data ops** against production data — the host's SQLite
    `data` volume or the `media` volume (drop, delete-all, overwrite) —
    without an explicit instruction from Ivan recorded in the session. Local
    dev resources are fair game.
13. **UI work is verified visually** at 375px and 1280px before its commit
    (dev server or preview). "It compiles" is not verification.
14. **Bulgarian admin, Bulgarian site.** Collection/field labels, admin UI
    locale, emails, error messages — everything the owner or a customer
    sees is Bulgarian. Code, comments, commits, docs — English.

---

## 3. Session loop (mandatory)

```
START
 1. Read PROGRESS.md → identify current phase + next unchecked task.
 2. Read the phase section in docs/PHASES.md + any docs it references.
 3. State (one line, in your output): "Resuming Phase N, task N.M — <name>".
WORK
 4. Implement the smallest coherent unit that leaves the repo green.
 5. Verify per Definition of Done (§5).
COMMIT
 6. Update PROGRESS.md (tick tasks; add notes/surprises; refresh "Next up").
 7. Commit (format §4) — PROGRESS.md changes ride in the SAME commit.
 8. More budget/time? → return to 4. Otherwise:
END
 9. Ensure PROGRESS.md "Next up" is accurate enough that a DIFFERENT agent
    with zero chat history can resume cold.
```

Never leave the repo mid-refactor at session end. If a unit cannot be
finished, revert it and describe the attempt in PROGRESS.md → Notes.

---

## 4. Commits

```
<type>(phase-<n>): <imperative, ≤72 chars>

<body: what & why — optional but expected for non-trivial changes>
```

Types: `feat` `fix` `chore` `docs` `refactor` `test`.

- One logical change per commit. Schema change + its migration = one commit.
  Schema change + unrelated UI tweak = two commits.
- Phase completion: verify EVERY acceptance criterion in PHASES.md, tick
  them in PROGRESS.md, then a final `feat(phase-<n>): complete — <name>`
  commit. Record actual hours in PROGRESS.md.
- Never rewrite published history. Never force-push.

---

## 5. Definition of Done — any task

- [ ] Acceptance criteria met (PHASES.md).
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm build` green.
- [ ] New pure logic in `src/lib/**` has vitest coverage (CONVENTIONS §Testing).
- [ ] UI: renders correctly at 375px and 1280px; keyboard reachable;
      no console errors/warnings on affected pages.
- [ ] Strings via bg.ts; prices via money.ts; images via images.ts.
- [ ] PROGRESS.md updated.

---

## 6. Escalation — when context is missing or reality disagrees

Encountering ANY of: a referenced file/decision that doesn't exist; a
platform behavior contradicting these docs; a dependency conflict; an
ambiguous requirement with user-visible consequences —

→ Write it under `PROGRESS.md → ## Blocked / Decisions needed` in this shape:

```
- [ ] (phase-N.M) <one-line problem>
      Evidence: <error / doc link / observed behavior>
      Options: A) <...> B) <...>  Recommendation: <A|B + one sentence>
```

Then continue with a different unblocked task if one exists; otherwise end
the session. **Guessing is the only unrecoverable mistake.** Ivan clears
blockers between sessions and may amend the docs — amended docs win over
your memory of them.

---

## 7. Working with the platform (Docker / self-hosted)

The app is a single container: a Next.js standalone server embedding Payload,
SQLite on the `data` volume, uploads on the `media` volume, config from a
host `.env`. Build and run via `docker compose`; the sysadmin owns the
reverse proxy, TLS, DNS, and mail. Schema changes apply on container start
(`payload migrate`). Never run destructive commands against the host's
volumes without an explicit instruction (rule 12). If a documented step
fails, that's an Escalation (§6), not an invitation to improvise. (`docs/
CLOUDFLARE.md` is retired — historical reference only.)
