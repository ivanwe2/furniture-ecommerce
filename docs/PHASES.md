# PHASES.md — ordered build plan

Rules: phases run in order; a phase completes only when EVERY acceptance
criterion (AC) is ticked in PROGRESS.md and the completion commit exists.
No future-phase work (CLAUDE.md rule 7). Hours are Ivan-estimates for
tracking, not deadlines.

Platform note: there is NO separate spike phase (velocity decision). The
platform-risk checks are Phase 1 acceptance criteria — they gate everything,
cost minutes on top of scaffolding, and if any fails hard the fallback
decision (Hetzner + Node, where sharp works) is made THEN, before any
feature code exists.

---

## PHASE 1 — Foundation & platform verification (~6–9h)

Goal: repo scaffolded from the official Payload-on-Workers template, deployed
once to a real Workers URL, platform assumptions verified, guardrails wired.

Tasks:
1.1 Provision (Ivan, dashboard): Cloudflare account on client Gmail; Workers
    Paid; create the project from the official Payload-on-Workers template
    (D1 + R2 auto-bound). Local: clone, `pnpm i`, confirm `pnpm dev` boots
    app + `/admin`, create first admin user locally.
1.2 Vendor into our layout: apply ARCHITECTURE §12 structure around the
    template (do not fight template-generated `(payload)` internals);
    add docs/, CLAUDE.md, PROGRESS.md, data/, scripts/ stubs.
1.3 Tooling: TS strict + noUncheckedIndexedAccess; ESLint (next/core-web-
    vitals + @typescript-eslint strict) + Prettier; vitest config; pnpm
    scripts: `typecheck lint test build preview deploy seed:dev
    migrate:local migrate:remote` (adopt template names where they exist —
    reconcile and document in CLOUDFLARE.md §6 if names differ).
1.4 CI (GitHub Actions): on push/PR — install, typecheck, lint, test,
    build. Plus two greps that FAIL the build: hex colors in
    src/app|src/components (CONVENTIONS §5); literal `/cdn-cgi/image/`
    outside `src/lib/images.ts` (CLOUDFLARE §7). Plus `.dev.vars.example`
    key-drift check vs a committed key list.
1.5 KV namespace for rate limiting: create, bind as `RATE_LIMIT_KV`,
    document in CLOUDFLARE §3 table (already listed — fill the ID).
1.6 `src/lib/i18n/bg.ts` seeded from UI-SPEC §11 with typed `t()` helper +
    its test.
1.7 First deploy: `pnpm deploy` to the workers.dev URL. Set the four
    secrets (CLOUDFLARE §4).
1.8 **Platform verification (the absorbed spike)** on the DEPLOYED URL:
    a) admin login; create a doc; upload a JPEG → object appears in R2.
    b) R2 access path: enable public access for dev (r2.dev) OR temp
       custom domain; fetch `…/cdn-cgi/image/width=480,format=auto/<key>`
       → resized webp/avif returns. (Zone transformations toggle needs a
       zone — if nasteh.bg is not yet on CF, verify on any zone in the
       account / workers.dev per current CF capability; if genuinely
       unverifiable pre-cutover, log the residual risk in Decisions log
       explicitly.)
    c) tag revalidation: minimal test page reading a doc via
       `unstable_cache` tagged `probe`; edit doc in admin (temporary hook
       revalidates `probe`); page updates within seconds on refresh.
    d) versions frozen: next 16.x / payload 3.85+ (NOT 4-beta) / adapter /
       wrangler exact versions → Decisions log.
1.9 Delete probe artifacts; update PROGRESS.md.

AC:
- [ ] CI green incl. all three custom checks.
- [ ] Deployed URL: admin usable, upload lands in R2.
- [ ] Transformation URL returns correctly resized+converted image (or an
      explicit logged residual-risk entry per 1.8b).
- [ ] revalidateTag round-trip proven on deployed infra.
- [ ] Versions logged; Payload is NOT 4.x.
- [ ] `pnpm dev`, `preview`, `deploy`, `migrate:local` all function,
      documented in CLOUDFLARE.md.

Commit: `chore(phase-1): complete — foundation & platform verification`

---

## PHASE 2 — Data layer (~10–14h)

Goal: full schema + hooks + query layer + dev seed, verified in admin.

Tasks:
2.1 Collections per DATA-MODEL: categories (2.1a slug hook, 2.1b depth
    guard, 2.1c delete guard), brands, media (mime/size limits, required
    alt, dimension capture — Escalate per DATA-MODEL §6 if template lacks
    it), products (2.1d fields incl. items minRows 1, 2.1e searchText
    builder, 2.1f SKU global-uniqueness hook), orders (2.1g snapshot
    fields, 2.1h orderNumber generator, 2.1i access lockdown), pages,
    users hardening, site-settings global. Bulgarian labels EVERYWHERE
    (owner-facing).
2.2 Revalidation: `lib/payload/revalidate.ts` + hooks on all content
    collections per DATA-MODEL tags table; `SKIP_REVALIDATE` guard.
2.3 Migration(s): `payload migrate:create` → `migrate:local` → commit
    schema+migration together; regenerate payload-types.
2.4 Query layer `lib/payload/queries.ts`: all functions per DATA-MODEL §8,
    each cache-tagged, published-only filters, explicit depth; descendant-
    category resolution from the cached tree.
2.5 `scripts/seed-dev.ts` per DATA-MODEL §10 (real category tree from the
    live old site's menu — enumerate it during this task and commit the
    list as the seed data), sample products incl. the 10-row SEVROLL
    family; local-only guard; idempotent.
2.6 Admin polish: useAsTitle/defaultColumns/filters per DATA-MODEL; verify
    the whole admin reads Bulgarian.

AC:
- [ ] Owner-persona walkthrough in BG admin: create category (3rd level ok,
      4th rejected with BG message), create product with 3 items, duplicate
      SKU rejected naming the conflicting product, upload image without alt
      rejected, edit price → product page tag revalidates (probe with a
      temp page or Phase 1's method).
- [ ] curl: REST create on orders → 403; REST read products → published
      only, drafts absent.
- [ ] `pnpm seed:dev` twice → second run reports no changes.
- [ ] typegen committed; migrations apply clean on a fresh local DB.

Commit: `feat(phase-2): complete — data layer`

---

## PHASE 3 — Domain logic + tests (~4–6h)

Tasks:
3.1 `lib/money.ts` per ARCHITECTURE §6 exact API; known-answer tests:
    3114¢ → "31,14 €"; BGN: 3114 → 6091¢ ("60,91 лв."); half-up boundaries
    (e.g., a cents value whose ×1.95583 lands on .005); formatPrice under
    both flag states (mock env).
3.2 `lib/slug.ts`: full BG transliteration table (ARCHITECTURE §9),
    collapse/trim hyphens, lowercase; tests incl. "Плъзгаща с-ма ГАРДЕРОБ
    Comfort" → "plzgashta-s-ma-garderob-comfort" style cases and
    ъ/щ/ю/я/й coverage.
3.3 `lib/cart/store.ts` (zustand+persist, storage key `nasteh-cart-v1`,
    skipHydration pattern) + `lib/cart/totals.ts` (pure: lines×prices →
    totals; stale-filtering given a resolution map). Tests for totals and
    reducer logic (add/increment/remove/clear, qty clamp 1..999).
3.4 `lib/validation/checkout.ts` + `contact.ts` (zod, BG-agnostic error
    KEYS per CONVENTIONS §3/§6); accept/reject test tables (phone
    permissiveness per UI-SPEC §7).
3.5 `lib/rate-limit.ts` (KV fixed window, interface
    `rateLimit(key, {windowSec, max}) → {allowed, retryAfterSec}`) — logic
    factored pure over an injected KV-like interface so tests run without
    bindings; `lib/turnstile.ts` verify helper.

AC:
- [ ] `pnpm test` green; money/slug/cart/validation covered per above.
- [ ] No `src/lib` module imports React/components (grep).

Commit: `feat(phase-3): complete — domain logic`

---

## PHASE 4 — Design system & shell (~10–14h)

Tasks:
4.1 Tokens: `@theme` block per ARCHITECTURE §8; contrast-check brass on
    cream (adjust token, not usage, if below AA) — record measured ratios
    in PROGRESS notes.
4.2 Fonts via next/font WITH `cyrillic` subset: pick display + body per
    ARCHITECTURE §8 (verify glyphs against "Ъгъл щифт южен ляв — 1234,56"
    rendered in both); tabular-nums utility class.
4.3 `lib/images.ts` per ARCHITECTURE §5 incl. dev fallback (original URL
    in development), srcSet helper, and the next/image-loader-vs-img
    decision (make it, log it, apply it).
4.4 UI primitives (`components/ui/`): Button (brass/ghost/danger, sizes,
    pending state), Input/Textarea/Select/Radio/Checkbox (label+error
    wiring per CONVENTIONS §9), Badge, Price (consumes money.ts; the ONLY
    price renderer), Container, Skeleton, Alert.
4.5 Layout (`components/layout/`): Header + MegaMenu + MobileNav drawer +
    SearchField + CartButton(badge) per UI-SPEC §1; Footer; announcement
    bar. Wire real `getCategoryTree()` data.
4.6 Route shells: `(site)/layout.tsx` (fonts, header/footer, skip-link),
    error.tsx, not-found.tsx, root loading.tsx per UI-SPEC §9.
4.7 Placeholder SVG asset (no-photo product) per UI-SPEC §4.

AC:
- [ ] Shell renders with seeded data; mega-menu full tree, keyboard
      navigable; drawer focus-trapped, Escape closes.
- [ ] 375px + 1280px pass; zero horizontal overflow.
- [ ] Grep: no hex in components (CI already enforces) — confirm locally.
- [ ] Cyrillic renders in both fonts incl. ъ/щ glyph check; prices show
      tabular figures.
- [ ] Reduced-motion: drawer/menu transitions disabled.

Commit: `feat(phase-4): complete — design system & shell`

---

## PHASE 5 — Catalog (~14–18h)

Tasks:
5.1 Home per UI-SPEC §2 (settings-driven hero; conditional SEVROLL strip).
5.2 Category route per UI-SPEC §3: catch-all resolution, breadcrumbs,
    non-leaf/leaf variants, pagination as links, empty state.
5.3 ProductCard (used by home/category/brand/search).
5.4 Product page per UI-SPEC §4: gallery+lightbox; info block; the
    **ItemsTable** with column auto-hide, steppers, per-row add feedback,
    stock states, mobile card collapse via data-label CSS (same DOM);
    richText renderer with typographic styles; JSON-LD.
5.5 Brand page; Search page per UI-SPEC §5.
5.6 Contact page per UI-SPEC §8 — form UI only wired to a stub action
    returning ok (real action lands Phase 6 with the shared pipeline;
    do NOT ship the stub past Phase 6).
5.7 loading.tsx skeletons for category/product/search.

AC:
- [ ] Full click-path on seed data: home → category L1 → L3 → product →
      lightbox → search "02718" finds the family → brand page.
- [ ] Items table: 10-row SEVROLL family perfect at 375px (cards) and
      desktop (sticky header); no page-level horizontal scroll; 44px
      targets; add feedback works with reduced-motion.
- [ ] Draft product 404s publicly.
- [ ] States checklist (UI-SPEC §12) passes for every new page.
- [ ] `pnpm preview` (production-faithful) — catalog pages serve cached,
      admin edit revalidates affected pages.

Commit: `feat(phase-5): complete — catalog`

---

## PHASE 6 — Cart & COD checkout (~10–14h)

Tasks:
6.1 Cart page per UI-SPEC §6 incl. hydration skeleton and stale-line
    resolution pass.
6.2 Checkout form per UI-SPEC §7 (fields, honeypot, Turnstile widget,
    consent, inline errors, focus management).
6.3 `actions/order.ts` — CONVENTIONS §3 pipeline EXACTLY (honeypot → zod →
    turnstile → rate limit → DB resolve/reject stale → totals from DB →
    create order → emails try/catch → result). `actions/contact.ts`
    sharing turnstile/ratelimit/honeypot helpers; replace 5.6 stub.
6.4 Emails per UI-SPEC §10 (owner, customer, contact) with plain-text
    parts; Resend integration; dev mode logs payloads instead of sending
    when `RESEND_API_KEY` empty.
6.5 Success page; direct-visit redirect.

AC:
- [ ] Happy path on `pnpm preview`: multi-product cart → order in admin
      with correct snapshot/totals → both emails (real send to test
      inboxes) → success page → cart cleared.
- [ ] Tamper test: client price manipulation has zero effect on stored
      totals (demonstrated).
- [ ] Unpublishing a carted product mid-flow → checkout returns cartStale;
      cart page flags the line.
- [ ] Rate limit: 6th rapid order attempt from one IP rejected with BG
      message; Turnstile failure path rendered.
- [ ] Email failure simulation (bad API key): order STILL created; error
      logged `[email]`; user still reaches success.
- [ ] Whole flow keyboard-only at 375px.

Commit: `feat(phase-6): complete — cart & checkout`

---

## PHASE 7 — Content & compliance (~4–6h)

Tasks:
7.1 `[pageSlug]` route (published pages only) + prose styles.
7.2 Seed the five legal pages as DRAFTS with real adapted content (old
    site's Условия/Доставка + standard BG e-shop templates; Право на отказ
    reflects distance-selling 14 days; Поверителност reflects orders-only
    data). Mark visibly "(ЧЕРНОВА — за одобрение)" in title until client
    approval.
7.3 Cookie notice bar (informational, localStorage-dismissed key
    `nasteh-cookie-notice`) linking Бисквитки page.
7.4 Footer legal links live; consent checkbox links resolve.
7.5 Flag verification: `NEXT_PUBLIC_SHOW_BGN=false` locally → EVERY price
    in UI and in emails single-currency (grep audit that all renders go
    through Price/money.ts).

AC:
- [ ] All five pages render; drafts invisible publicly until published.
- [ ] Flag flip verified both states incl. email templates.
- [ ] Launch-gate items added to PROGRESS.md checklist (client approves
      pages; client publishes reviewed prices).

Commit: `feat(phase-7): complete — content & compliance`

---

## PHASE 8 — SEO & performance (~6–9h)

Tasks:
8.1 generateMetadata everywhere per ARCHITECTURE §9 (+ seo group
    overrides); canonicals; OG images via `og` preset.
82  sitemap.ts + robots.ts (disallow /admin, /kolichka, /poruchka).
8.3 JSON-LD: BreadcrumbList (category/product), LocalBusiness (contact).
    (Product JSON-LD shipped in 5.4 — validate now.)
8.4 `middleware.ts` + `data/redirects.csv` loader: exact-match on
    pathname+search for PrestaShop patterns → 301. Populate initial rows
    for the known old URLs (id_product/id_category harvested from the live
    site's sitemap/menu during content entry; at minimum the category URLs
    now, product IDs as catalog is populated).
8.5 Performance pass on preview: LCP images priority+dimensions; font
    display swap; bundle audit (no server-heavy deps in client chunks);
    Lighthouse mobile-throttled on home/category/product(30-row table).
8.6 Meta descriptions BG copy pass (unique per page type template).

AC:
- [ ] Rich Results test: Product, Breadcrumb, LocalBusiness all valid.
- [ ] 10 redirect rows verified on preview (curl -I → 301 + correct
      Location).
- [ ] Lighthouse ≥90 Perf mobile on the three page types; SEO 100; CLS <
      0.1 on product page.
- [ ] sitemap.xml lists only published content; robots correct.

Commit: `feat(phase-8): complete — SEO & performance`

---

## PHASE 9 — Import & seeding (~5–8h + content work)

Tasks:
9.1 `scripts/import-products.ts` per DATA-MODEL §9 (validation, merge,
    BGN→EUR via money.ts, draft creation, SKU upsert, report,
    idempotence); `data/import-template.csv` with 3 documented rows.
9.2 Dry-run mode (`--dry`) printing the would-be changes.
9.3 `docs/ADMIN-GUIDE.bg.md` — owner's guide in Bulgarian with
    screenshots: добавяне на продукт; добавяне на артикул (ред); качване
    на снимки; публикуване; обработка на поръчка (статуси); редакция на
    страница; смяна на текст на началната страница. Write for a
    non-technical reader.
9.4 Import rehearsal: OCR'd CSV from a real supplier table (Ivan + Claude
    produce it in chat) through --dry → local → verify in admin.

AC:
- [ ] 50-row sample: correct families/items; re-run = zero changes; bad
      rows reported with row numbers, run completes.
- [ ] BGN-priced rows convert to expected cents (spot-check against
      money.test known answers).
- [ ] ADMIN-GUIDE covers the seven workflows, readable by the owner.

Commit: `feat(phase-9): complete — import & seeding`

---

## PHASE 10 — Launch & handover (~5–8h + coordination)

Tasks:
10.1 DNS cutover per CLOUDFLARE §8 (inventory → import → verify MX/SPF →
     nameservers → mail test → attach domains → media.nasteh.bg →
     transformations verify on the real zone).
10.2 Resend domain verification; switch sender; deliverability test to
     gmail.com + abv.bg inboxes (abv.bg is common in BG — test it
     explicitly).
10.3 Production env/secrets audit on client-owned account; Ivan delegated
     access; recovery codes with the owner.
10.4 Content freeze-check: prices reviewed & products published by owner;
     legal pages approved & published (drop "(ЧЕРНОВА)"); settings real;
     redirects.csv complete for indexed old URLs (check Google
     `site:nasteh.bg` for stragglers).
10.5 Production smoke (scripted checklist in PROGRESS): real test order
     round-trip incl. both emails; admin login; transformation URL; 10
     redirects; sitemap fetch; 404 page.
10.6 D1 export backup (CLOUDFLARE §6) + calendar reminders: 2026-08-08
     SHOW_BGN flip; 30-day support window end date.
10.7 Handover message to owner (site live, admin guide link, support
     terms, what "included hosting" covers).

AC:
- [ ] PROGRESS.md launch checklist 100% ticked (it is the gate).
- [ ] Production order round-trip verified; mail flow to owner's existing
      address unbroken by DNS move.
- [ ] Old URLs 301 in production; search console property added, sitemap
      submitted.
- [ ] Backup exported; reminders set; handover sent.

Commit: `chore(phase-10): complete — launch`

---

## Hour tracking table (fill actuals in PROGRESS.md)

| Phase | Est. | Actual |
|---|---|---|
| 1 Foundation | 6–9 | |
| 2 Data layer | 10–14 | |
| 3 Domain logic | 4–6 | |
| 4 Design & shell | 10–14 | |
| 5 Catalog | 14–18 | |
| 6 Cart & checkout | 10–14 | |
| 7 Content & compliance | 4–6 | |
| 8 SEO & perf | 6–9 | |
| 9 Import & seeding | 5–8 | |
| 10 Launch | 5–8 | |
| **Total** | **74–106** | |
