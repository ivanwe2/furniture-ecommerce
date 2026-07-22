# SECURITY-REVIEW.md — pre-production review (2026-07-23)

In-depth security review of the Настех storefront ahead of the production
handover. Scope: the whole application as it runs in the self-hosted Docker
stack — order/checkout path, input validation, anti-bot, rate limiting, admin
auth + access control, secrets, injection (SQLi/XSS/CSRF/open-redirect),
response headers, uploads, transactional email, dependency posture, and
container hardening.

**Method:** source review of the security-relevant seams + **live probing of the
running stack** (public REST API, auth flows) — findings are evidence-backed,
not assumed.

**Overall posture: strong.** The order path and access control are well
designed. Three defence-in-depth issues were found and **fixed** in this review;
a few residual items are accepted risk / sysadmin responsibilities, listed at
the end.

---

## What the app does right (verified)

- **Orders are sacred.** Create is a server action only; `Orders.access.create`
  is `() => false`, so the public REST API cannot create an order (probed:
  `POST /api/orders` → **403**). Prices and totals are recomputed **server-side
  from the DB** (`resolveCartLines` + `computeTotals`), never trusted from the
  client; quantity is clamped to `[1, 999]`. The order row is written **before**
  emails, and email failure is caught and never blocks or rolls back the order.
- **Layered anti-abuse** on both public forms: honeypot → Zod validation →
  **Altcha** proof-of-work (HMAC-signed, fail-closed if the key is unset in prod,
  replay-protected via a shared store) → rate limit.
- **Access control (probed live):** `/api/users` and `/api/orders` return
  **403** unauthenticated — no email/hash/PII leak; create is blocked on
  users/orders/media (all **403**). Catalog endpoints are public by design and
  `products` is filtered to `status=published`.
- **Admin auth:** login lockout (5 attempts / 10 min); user creation is
  admin-only.
- **Uploads:** MIME allow-list `image/{jpeg,png,webp}` — **SVG is excluded**
  (no SVG-borne script).
- **No SQL injection:** all reads go through the parameterised Payload query
  layer; no raw SQL with string interpolation outside static migrations.
- **No open redirect:** middleware redirects only to targets from a static map.
- **Secrets hygiene:** `.env` is gitignored and untracked; `.env.example` is
  keys-only; no hardcoded secrets in source.
- **Headers:** `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy`, `Permissions-Policy`.
- **Container:** non-root app user (uid 1001); db/redis/mail internal-only; app
  published on loopback only; per-service memory caps.

---

## Findings — fixed in this review

### F1 · HTML injection into owner-facing emails — **Medium**
`src/emails/send.ts`. Customer-supplied fields (name, city, address, order note,
contact message) were interpolated **raw** into the HTML email bodies. Because
order/contact notifications land in the **owner's inbox**, an attacker using the
public forms could inject markup/links there (content spoofing / phishing;
scripts are blocked by mail clients, but links and layout are not). Phone/email
were already regex/Zod-constrained and nodemailer blocks CRLF header injection,
so the body was the vector.
**Fix:** added an `esc()` HTML-escaper applied to every user-controlled
interpolation, and made `link()` escape both `href` and label. Text parts were
already safe.

### F2 · JSON-LD `</script>` breakout (stored XSS sink) — **Low**
`src/components/seo/{ProductJsonLd,BreadcrumbList,LocalBusiness}.tsx`. Structured
data was emitted via `dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}`.
`JSON.stringify` does not escape `<`, `>`, `&`, or U+2028/U+2029, so a product
name containing `</script>` would break out of the element. Content is
admin-authored (single trusted author) → low likelihood, but a real sink.
**Fix:** new `jsonLdScript()` helper (`src/lib/json-ld.ts`, unit-tested) escapes
those characters as `\uXXXX`; wired into all three components.

### F3 · Rate-limit key spoofable via `X-Forwarded-For` — **Low**
`src/actions/{order,contact}.ts`. The client IP was taken from the **first**
`X-Forwarded-For` hop. With a proxy that appends (`$proxy_add_x_forwarded_for`,
as in the deploy sketch), the first hop is **client-supplied** — an attacker
could rotate it to get a fresh rate-limit bucket per request. (Altcha PoW is the
hard gate, so impact is limited, hence Low — but it defeats the soft gate.)
**Fix:** new `clientIp()` helper (`src/lib/request-ip.ts`, unit-tested) prefers
proxy-set `X-Real-IP`, else the **last** XFF hop; DEPLOY.md §6 updated to set
`X-Real-IP $remote_addr`.

---

## Accepted risk / recommendations (no code change now)

- **No Content-Security-Policy.** A strict CSP is hard alongside the Payload
  admin and was deliberately deferred (see `next.config.ts`). Recommended as a
  post-launch hardening once admin CSP needs are profiled. `X-Frame-Options:
  DENY` already blocks clickjacking meanwhile.
- **HSTS is the proxy's job.** The reverse proxy terminates TLS; it should send
  `Strict-Transport-Security`. Add it in the nginx/Caddy config.
- **Dependency advisories: 39 (11 high).** All are transitive inside the
  Payload/admin tree (drizzle, undici, sharp, monaco→dompurify) or dev-only
  tooling — the admin is behind authentication and none sit in the public
  storefront runtime path. Not directly exploitable here; clear them by tracking
  Payload 3.x point releases (this review already took Payload 3.82→3.86, which
  dropped the count 49→39). Re-run `pnpm audit` after Payload bumps.
- **SMTP `rejectUnauthorized: false`** applies **only** to the no-auth in-stack
  relay on the isolated internal network (external smarthosts keep strict cert
  validation). Acceptable given the trust boundary; documented in `send.ts`.

---

## Verification

`pnpm typecheck && pnpm lint && pnpm test && pnpm build` green with the fixes;
two new unit test files (`json-ld.test.ts`, `request-ip.test.ts`). Live REST
access-control probes were run against the running stack (results above).
