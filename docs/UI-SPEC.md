# UI-SPEC.md — pages, components, states, copy

Design tokens/type/quality floor: ARCHITECTURE §8. This file specifies
behavior. Anything visual not specified: match permo.it's register (calm,
generous whitespace, product-forward) using our palette; when in doubt,
quieter.

## 1. Global layout

**Announcement bar** (optional; renders only if `settings.announcement`
non-empty): sand bg, ink text, single line, no dismiss (it's owner-managed).

**Header** (sticky, cream bg, hairline steel bottom border):
- Row: logo (left, links home) · primary nav · search field · cart button.
- Primary nav = top-level categories (from `getCategoryTree()`), each
  opening a **mega-menu** panel on hover/focus/click: columns = 2nd-level
  categories with their 3rd-level leaves as links; panel includes the
  category image of the hovered branch when present. Keyboard: arrow keys
  navigate, `Escape` closes, tab order logical. Implementation: server-
  rendered structure; a small client component only for open state.
- Search: input with placeholder `search.placeholder`; submit →
  `/search?q=…`. On mobile: icon expands input inside the drawer.
- Cart button: bag icon + count badge (client; reads zustand; hidden badge
  when 0). Click → `/cart`. No slide-out drawer in v1 (velocity).
- Mobile (<1024px): logo + burger + cart. Burger opens full-height drawer:
  accordion category tree (3 levels), search input, contact phone link.
  Focus-trapped, `Escape`/overlay closes.

**Footer** (sand bg): 4 columns desktop / stacked mobile —
(1) company block from settings: name, ЕИК, address, phone(s) as `tel:`
links, email; (2) Категории: top-level links; (3) Информация: the five
legal pages + Контакти; (4) working hours + Facebook icon if set.
Bottom line: `© {year} Настех ООД` + "Цените са с включено ДДС."

## 2. Home `/`

Order: hero → featured products → category grid → SEVROLL strip → trust
block.
- Hero: settings `heroTitle`/`heroSubtitle`, brass CTA button → top category
  or `/category/mebelen-obkov` (`home.heroCta`). Background: cream with a
  large product photograph (owner-provided via settings later; solid
  composition without image must also look intentional).
- Featured: `getFeaturedProducts(8)` as ProductCard grid (4/2/1 per row).
  Section title `home.featured`.
- Category grid: top-level categories as image cards with name overlay.
- SEVROLL strip: brand logo + one line + link to `/brand/sevroll` (only if
  brand exists — render conditionally).
- Trust block: three quiet items with icons — years in business /
  наложен платеж / lightning contact (copy keys `home.trust1..3`).

## 3. Category `/category/[...slug]`

Catch-all resolves the deepest slug segment; 404 if unknown. Breadcrumbs
from `getCategoryPath`.
- Non-leaf: heading + description + **subcategory cards** grid; below it,
  products of all descendants (grid + pagination) under `category.allIn`.
- Leaf: heading + description + product grid, pagination (24/page, numbered
  `?page=N` links — real links, SSR, no infinite scroll).
- ProductCard: cover (card preset, fixed aspect 4:3, object-cover, cream
  letterbox), name (2-line clamp), category (steel, small), price line:
  single item → formatted price; multiple → `catalog.fromPrice` with min
  item price. Whole card is one `<a>`.
- Empty category: friendly empty state `category.empty` + link home.

## 4. Product `/product/[slug]` — the signature page

Layout desktop: gallery left (55%), info right; items table full-width
below; description after it. Mobile: gallery → info → table → description.

- **Gallery**: main image (detail preset) + thumb row (thumb preset).
  Client lightbox on click (zoom preset), arrow keys + swipe, `Escape`
  closes. No gallery → branded placeholder (steel obков line-art on sand;
  a single SVG asset created in Phase 4).
- **Info block**: h1 name · brand link chip if set · shortSpec bullets ·
  in-stock summary (green dot + `product.inStockSummary` if ANY item in
  stock).
- **Items table** (`components/catalog/items-table.tsx`) — spend the
  polish here:
  - Columns: Наименование · Мярка · Дължина (мм) · Цвят · Код · Цена ·
    Количество · [add]. Hide Дължина/Цвят columns entirely when no row in
    THIS product uses them.
  - `<table>` semantics; sticky `<thead>` (sand bg) within its scroll
    container on desktop; SKU cell in monospace; prices right-aligned
    tabular-nums via `<Price>` component (dual display per money.ts).
  - Qty: stepper (– input +), min 1, max 999, typing allowed, invalid →
    clamps. 44px touch targets.
  - Add button per row (brass, compact): on click → cart store `addItem`,
    button swaps to ✓ + `product.added` for 1.2s (reduced-motion: instant
    swap, no animation), cart badge increments.
  - Out-of-stock row: muted, controls replaced by `product.onRequest`
    linking to `/contact?about=<sku>` (prefills the contact message).
  - **Mobile (<768px)**: rows collapse to stacked cards via CSS (each cell
    gets a `data-label` rendered as inline label) — same DOM, no element
    swap; horizontal page scroll is a defect.
- **Description**: Lexical rich text rendered with the project's
  typographic styles (headings, lists, images through images.ts detail
  preset).
- JSON-LD Product per ARCHITECTURE §9.

## 5. Search `/search`

SSR page reading `?q=`. Heading `search.resultsFor` + query echo (escaped).
Grid of ProductCards from `searchProducts`. Empty → `search.empty` +
suggestion to browse categories (links). No instant-search dropdown in v1.

## 6. Cart `/cart`

Client page (store is the source of truth), hydration-safe (render skeleton
until store hydrated — CONVENTIONS §2).
- Line item: product name (link), item name + SKU, unit price, qty stepper,
  line total, remove (×). Stale lines (product/SKU no longer resolvable —
  checked via a lightweight server component pass that maps current DB
  state in as props on load): flagged `cart.stale`, excluded from totals,
  removable.
- Summary card: items total (dual price), `cart.codNote` ("Плащане при
  доставка (наложен платеж)."), delivery note `cart.deliveryNote`
  ("Доставката се заплаща на куриера по тарифа на Еконт/Спиди."), CTA →
  `/checkout`.
- Empty state: `cart.empty` + CTA home.

## 7. Checkout `/checkout`

Single page, one column (max-w-lg), order summary collapsed at top
(expandable), then the form:
- Fields: name* · phone* (BG format hint, permissive validation: digits,
  spaces, +, min 9 digits) · email* · delivery method* (radio trio: адрес /
  офис на Еконт / офис на Спиди) · city* · addressOrOffice* (label flips by
  method: `checkout.addressLabel` / `checkout.officeLabel`) · note ·
  honeypot (visually-hidden text input named `website`, tabindex -1,
  autocomplete off) · Turnstile widget · consent checkbox* linking Общи
  условия + Поверителност (`checkout.consent` — required, unchecked =
  field error).
- Submit (brass, full-width) `checkout.submit` → pending state
  `checkout.submitting`; server action per CONVENTIONS §3.
- Field errors inline under fields; global errors (captcha, rate limit,
  stale cart) in an alert box above submit; first invalid field focused.
- Success → `/checkout/success?n=NAS-…`: big ✓, `checkout.successTitle`,
  order number prominent, `checkout.successBody` (mentions confirmation
  email + that the owner will call to confirm), CTA home. Direct visits
  without `n` → redirect home.

## 8. Contact `/contact`

Settings-driven info block (address, phones, hours, map LINK to Google Maps
— no embedded map in v1) + message form (name*, phone, email*, message*,
Turnstile, honeypot) → `submitContact` → owner email. `?about=` prefills
message with `contact.aboutSku` + value. Success inline `contact.success`.

## 9. Static pages `/[pageSlug]`, 404, error, loading

- Pages: title + rendered richText, max-w-prose, `pages` published only.
- 404: `notFound.title/body`, search input, top-category links.
- error.tsx: `errors.pageTitle` + retry button (calls `reset()`).
- loading.tsx per route: skeletons mirroring real layout (cards grid for
  listings; gallery+table blocks for product). Skeletons use sand pulse;
  reduced-motion → static sand.

## 10. Emails (Resend; templates in `src/emails/`)

Shared: cream/ink minimal HTML (tables-based, email-safe), logo text
header "НАСТЕХ", footer with company block. Plain-text alternative part
generated alongside HTML for every send.
- **order-owner**: subject `Нова поръчка {orderNumber} — {totalFormatted}`.
  Body: customer block (name, phone as tel link, email), delivery block,
  lines table (name, SKU, qty × unit price = line total), TOTAL (dual),
  note, link `{SITE_URL}/admin/collections/orders?…` to the order. This
  email alone must suffice to ship the order.
- **order-customer**: subject `Потвърждение на поръчка {orderNumber} —
  Настех`. Body: thanks line, order table + total, delivery method echo,
  "Ще се свържем с вас по телефона за потвърждение." + ЗЗП essentials:
  seller identification (company block), payment = наложен платеж, link to
  Право на отказ page. Reply-to: owner inbox.
- **contact-owner**: subject `Запитване от сайта — {name}`; body: fields +
  message.

## 11. Initial `src/lib/i18n/bg.ts` (seed content — extend, never inline)

```ts
export const bg = {
  common: { addToCart: 'Добави', search: 'Търсене', close: 'Затвори',
    back: 'Назад', home: 'Начало', retry: 'Опитай отново',
    priceOnRequest: 'по запитване', vatIncluded: 'Цените са с включено ДДС.' },
  nav: { categories: 'Категории', contact: 'Контакти', menu: 'Меню' },
  home: { featured: 'Акценти', categoriesTitle: 'Категории',
    heroCta: 'Разгледай каталога',
    trust1: 'Дългогодишен опит с мебелен обков',
    trust2: 'Плащане при доставка — наложен платеж',
    trust3: 'Бърза връзка и консултация' },
  catalog: { fromPrice: 'от {price}', inStock: 'в наличност',
    outOfStock: 'изчерпан' },
  category: { allIn: 'Всички продукти в категорията',
    empty: 'Все още няма продукти в тази категория.' },
  product: { itemsTitle: 'Артикули и цени', colName: 'Наименование',
    colUnit: 'Мярка', colLength: 'Дължина (мм)', colColor: 'Цвят',
    colSku: 'Код', colPrice: 'Цена', colQty: 'Количество',
    added: 'Добавено', onRequest: 'по запитване',
    inStockSummary: 'Артикули в наличност' },
  search: { placeholder: 'Търси продукт или код…',
    resultsFor: 'Резултати за', empty: 'Няма намерени продукти.' },
  cart: { title: 'Количка', empty: 'Количката е празна.',
    goShopping: 'Към каталога', total: 'Общо', remove: 'Премахни',
    stale: 'Този артикул вече не е наличен и няма да бъде поръчан.',
    codNote: 'Плащане при доставка (наложен платеж).',
    deliveryNote: 'Доставката се заплаща на куриера по тарифа на Еконт/Спиди.',
    checkout: 'Към поръчка' },
  checkout: { title: 'Поръчка', name: 'Име и фамилия', phone: 'Телефон',
    email: 'Имейл', method: 'Доставка до', methodAddress: 'Адрес',
    methodEcont: 'Офис на Еконт', methodSpeedy: 'Офис на Спиди',
    city: 'Град', addressLabel: 'Адрес за доставка',
    officeLabel: 'Офис (име или адрес)', note: 'Бележка към поръчката',
    consent: 'Съгласен съм с Общите условия и Политиката за поверителност.',
    submit: 'Изпрати поръчката', submitting: 'Изпращане…',
    successTitle: 'Благодарим за поръчката!',
    successBody: 'Изпратихме потвърждение на имейла ви. Ще се свържем с вас по телефона за уточнение на доставката.',
    orderNumber: 'Номер на поръчка' },
  contact: { title: 'Контакти', message: 'Съобщение',
    send: 'Изпрати', success: 'Съобщението е изпратено. Благодарим!',
    aboutSku: 'Запитване относно артикул: ' },
  errors: { generic: 'Възникна грешка. Опитайте отново.',
    required: 'Полето е задължително.',
    invalidEmail: 'Невалиден имейл адрес.',
    invalidPhone: 'Невалиден телефонен номер.',
    captcha: 'Моля, потвърдете, че не сте робот.',
    rateLimited: 'Твърде много опити. Опитайте отново след няколко минути.',
    cartStale: 'Част от артикулите вече не са налични. Прегледайте количката.',
    consentRequired: 'Необходимо е съгласие с условията.',
    pageTitle: 'Нещо се обърка' },
  notFound: { title: 'Страницата не е намерена',
    body: 'Потърсете продукт или разгледайте категориите.' },
  footer: { info: 'Информация', categories: 'Категории',
    workingHours: 'Работно време' },
} as const;
```

## 12. States checklist (every page review)

☐ loading skeleton ☐ empty ☐ error ☐ 375px ☐ 1280px ☐ keyboard pass
☐ long-content overflow (60-char product names, 30-row tables)
☐ reduced-motion.
