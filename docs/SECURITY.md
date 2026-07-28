# SECURITY.md — threat model, controls, and audit record

What this app defends against, how, and how to re-check it. Written after the
pre-launch audit of 2026-07-28 (commit `04794f4`, PR #64).

Read this before changing the order path, the auth config, the query layer, or
anything under `src/actions/`. Deploy-side security (TLS, HSTS, proxy headers,
mail DNS) lives in `docs/DEPLOY.md`; this file says *why* those settings matter.

---

## 1. What we are protecting

The realistic threats, in the order they matter for this business:

| # | Threat | Why it matters here |
|---|---|---|
| T1 | **Order tampering** — a customer paying less than the listed price | Cash on delivery: the courier collects whatever the order says. A forged total is a direct loss. |
| T2 | **Admin account takeover** | Full control of catalogue, prices, and every customer's name/phone/address. |
| T3 | **Spam / junk orders** | Each order triggers a phone call. Junk orders waste the owner's day, not just disk. |
| T4 | **Customer data exposure** | Names, phones, addresses, emails, IPs — GDPR-relevant, and the owner's reputation. |
| T5 | **Resource exhaustion** | One small box runs everything. A cheap request that costs us a lot is a real outage. |

Explicitly **out of scope**, by design: card data (there is none — COD only),
customer accounts (there are none), and payment-provider integrations.

---

## 2. Controls, and how to re-verify each

Everything below was verified against a running stack during the audit, not
inferred from source. The commands re-verify them.

### T1 — Order integrity

- **Prices and totals are recomputed server-side** in `submitOrder`
  (`src/actions/order.ts`) from DB values via `resolveCartLines` +
  `computeTotals`. The client sends only `(productSlug, sku, qty)`; a price in
  the request body is ignored, not trusted.
- **`qty` is clamped** to 1–999 (`clampQty`, NaN-safe) and schema-bounded before
  that (`src/lib/validation/cart.ts`).
- **Orders cannot be created over the API**: `create: () => false` on the Orders
  collection. The only write path is the server action.
- **Out-of-stock and unpublished items are dropped** during resolution; an order
  containing them returns `errors.cartStale` rather than partially succeeding.

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://nasteh.bg/api/orders \
  -H 'Content-Type: application/json' -d '{}'      # expect 403
```

### T2 — Admin authentication

- **Session cookie**: `Secure` + `HttpOnly` + `SameSite=Lax`.
  `Secure` is decided **at image-build time** from `NEXT_PUBLIC_SITE_URL`
  (`https://…` → on) — see `src/collections/Users.ts` for why it is keyed off the
  scheme rather than `NODE_ENV`, and DEPLOY §6 for the operational consequence
  (editing `.env` will not flip it; rebuilding will).
- **Lockout**: 5 failed logins → 10-minute lock (`Users.auth`).
- **Registration is admin-only** (`create: ({ req }) => Boolean(req.user)`).
  There is no public signup and no password-reset email flow in use.
- **Empty `PAYLOAD_SECRET` fails closed** — Payload throws at boot rather than
  signing JWTs with an empty key. Never "temporarily" unset it.

```bash
curl -si https://nasteh.bg/api/users/login -X POST \
  -H 'Content-Type: application/json' -d '{"email":"…","password":"…"}' \
  | grep -i set-cookie     # expect: Secure=true; HttpOnly=true; SameSite=Lax
```

### T3 — Spam and abuse

Layered, cheapest check first, so junk is rejected before it costs us anything:

1. **Honeypot** (`website` field) → fake success, no side effects.
2. **Zod schema** — shape, format, and length bounds.
3. **Altcha proof-of-work** (`src/lib/altcha.ts`, `COST = 4_000` ≈ 1M hashes,
   Altcha's recommended default). Self-hosted, HMAC-signed, with a replay store.
   This is the **hard** gate.
4. **Rate limit** (Redis, in-memory fallback): orders 5 / 10 min / IP, contact
   3 / 10 min / IP. This is the **soft** gate — it degrades rather than blocking
   checkout if Redis is down, which is deliberate.

> The rate limiter keys on `X-Real-IP`, which **the reverse proxy must
> overwrite** with `$remote_addr`. If it is passed through from the client
> instead, a spammer can forge it and the limiter is useless. See DEPLOY §6.

### T4 — Data exposure

- **Collection access is deny-by-default** (Payload's default is
  authenticated-only); only `read` is opened where the storefront needs it.
- **Drafts are invisible to the public**: Products and Pages return
  `{ status: { equals: 'published' } }` for anonymous requests, so unpublished
  legal pages and draft products are not readable over the API.
- **No injection sinks.** Every `dangerouslySetInnerHTML` in the codebase goes
  through `jsonLdScript` (`src/lib/json-ld.ts`), which escapes `<`, `>`, `&` so a
  product name containing `</script>` cannot break out.
- **Email is escaped.** Customer-supplied fields land in the *owner's* inbox, so
  `esc()` in `src/emails/send.ts` escapes them; nodemailer strips CR/LF from
  header values, so the contact form's name-in-subject is not header-injectable.

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://nasteh.bg/api/orders   # 403
curl -s -o /dev/null -w '%{http_code}\n' https://nasteh.bg/api/users    # 403
curl -s 'https://nasteh.bg/api/pages?limit=50' | grep -c '"status":"draft"'  # 0
```

### T5 — Resource exhaustion

- **The cart is bounded**: ≤50 lines, qty ≤999, ids ≤200 chars
  (`src/lib/validation/cart.ts`). This matters more than it looks —
  `resolveCartLines` performs **one DB lookup per line**, so an unbounded array
  turns a single request into thousands of sequential queries.
- **Free-text fields are capped** (name/phone/email 120, address 300, note 2000,
  message 5000). Next's 1 MB server-action limit is a transport cap, not
  validation.
- **Search is capped** at 5 tokens and escapes LIKE wildcards, so `%` no longer
  matches the entire catalogue (`src/lib/search.ts`).
- **Every container has a memory cap** in `docker-compose.yml` so one runaway
  service cannot OOM the host.

---

## 3. Audit record — 2026-07-28

Full-codebase review: every server action, collection access rule, the auth
config, both email and JSON-LD sinks, the query layer, and the dependency tree.

### Fixed (PR #64)

| # | Finding | Severity | Resolution |
|---|---|---|---|
| 1 | Admin cookie lacked `Secure` — Payload defaults it to `false` and never infers it, so the admin JWT could ride a plain-HTTP request in clear | Moderate | `cookies.secure` keyed off the site scheme; HSTS + `:80→:443` documented |
| 2 | Cart payload bypassed validation entirely; `"null"`, `"123"`, `{"length":1}` each crashed the order action, and the array was unbounded | Moderate | `parseCartField` schema + bounds, 20 tests |
| 3 | `.gitignore` did not cover `.env*` — `.env.production` and `.env.backup` were committable despite CLAUDE.md rule 10 | Moderate | `.env*` + `!.env.example`, re-verified with `git check-ignore` |
| 4 | No maximum length on any free-text field | Low/Mod | `.max()` across checkout + contact schemas |
| 5 | `sharp` <0.35 inherits four libvips CVEs (GHSA-f88m-g3jw-g9cj) | Low¹ | 0.35.3 **plus** a pnpm override — `next@16` pulls its own copy |
| 6 | Search treated `%`/`_` as live SQL wildcards; `X-Powered-By` disclosed the stack; `test.env` was a stray template leftover | Minor | escaped; `poweredByHeader: false`; removed |

¹ Reachable only via authenticated admin upload, with mime types restricted.

### Verified correct — no change needed

Recorded so a future audit does not re-derive them: server-side price/total
recomputation; `create: false` on Orders; live-verified access control
(`/api/orders` and `/api/users` → 403, drafts invisible); email HTML escaping and
nodemailer's CRLF stripping; JSON-LD `</script>` escaping; fail-closed empty
`PAYLOAD_SECRET`; login lockout; no secrets anywhere in git history.

### Accepted risks

- **The pre-launch site lock exempts `/api`.** Published catalogue data stays
  readable over REST while the storefront shows "в разработка". Accepted: the
  lock is a confusion layer for customers, not a secrecy boundary, and the thing
  it must prevent — placing an order — *is* blocked, because the order action
  lives on a locked page route. Do not put anything genuinely secret in a
  published collection and rely on the lock to hide it. (DEPLOY §8.)
- **No Content-Security-Policy.** The Payload admin makes a strict CSP a project
  of its own. Deferred deliberately; the other headers
  (`X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`)
  are set in `next.config.ts`.
- **Any admin can modify any other admin.** There is no role system — the site
  has one owner. Revisit only if staff accounts are ever added.
- **Remaining dependency advisories are build- or admin-only**: `postcss`,
  `brace-expansion`, `fast-uri` (build/dev tooling); `dompurify` (via
  `monaco-editor` inside the Payload admin UI, pinned by Payload). None are
  reachable by an anonymous visitor.

---

## 4. Personal data (GDPR)

| Data | Where | Source |
|---|---|---|
| Name, phone, email, delivery address, note | `orders.customer`, `orders.delivery` | Customer at checkout |
| **IP address, user-agent** | `orders.meta` | Captured server-side per order |
| Name, email, phone, message | Owner's inbox only (not stored in the DB) | Contact form |

**Open item:** `orders.meta` stores IP and user-agent — personal data — and the
privacy policy is still the seeded placeholder draft that does not mention it.
Before launch the policy must disclose it and state a retention period, and the
owner must agree a deletion cadence. Tracked in the PROGRESS launch checklist.

Order data has **no automatic expiry** today. Deletion is manual, through the
admin.

---

## 5. Operational requirements (sysadmin)

Security properties this app cannot enforce on its own. All detailed in
`docs/DEPLOY.md`:

- **TLS + HSTS + `:80 → :443` redirect** (§6) — the admin cookie's `Secure` flag
  assumes HTTPS is the only way in.
- **`X-Real-IP` overwritten with `$remote_addr`** (§6) — otherwise rate limiting
  is bypassable by forging the header.
- **`.env` is `chmod 600`, never committed** (§2). Production secrets exist only
  in the host `.env`.
- **Off-host backups** (§5) — the `backup` sidecar writes to a volume on the same
  box; copy them off it.
- **Mail SPF/DKIM/DMARC + PTR** (§7) — so order mail is not spoofable or binned.

---

## 6. Re-running the audit

```bash
pnpm audit                       # dependency advisories
git ls-files | grep -E '\.env'   # only .env.example should appear
for f in .env .env.production .env.backup; do git check-ignore -q $f \
  && echo "$f ignored" || echo "$f NOT IGNORED"; done
grep -rn "dangerouslySetInnerHTML" src/   # each must go through jsonLdScript
grep -rn "overrideAccess" src/            # each must be a deliberate server path
```

Then re-run the per-control checks in §2 against the deployed site.

**When to re-audit:** before launch (done), after any change to the order path
or auth config, after a Payload or Next major bump, and otherwise annually.
