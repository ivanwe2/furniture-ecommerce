# REFERENCE.md — implementation skeletons for high-drift seams

These are AUTHORITATIVE skeletons for the pieces agents most often get
wrong. Copy the structure, fill the gaps, keep names. Where a skeleton and
a template-generated file disagree on wiring (imports, config accessors),
the TEMPLATE wins for wiring and this file wins for behavior — reconcile
and note in PROGRESS if non-obvious. Snippets omit imports where obvious.

---

## 1. `src/lib/money.ts`

```ts
import 'server-only'; // ← NO. money.ts is shared client/server — keep it pure, no env reads at module top for the flag (read lazily, see formatPrice).

export const BGN_PER_EUR = 1.95583; // fixed by law (BGN pegged, then €-adoption conversion rate)

const eurFmt = new Intl.NumberFormat('bg-BG', {
  style: 'currency', currency: 'EUR', minimumFractionDigits: 2,
});
// Intl for BGN post-euro may localize oddly; format manually for "лв.":
const numFmt = new Intl.NumberFormat('bg-BG', {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
});

export function formatEur(cents: number): string {
  assertCents(cents);
  return eurFmt.format(cents / 100); // "31,14 €"
}

/** EUR cents → BGN cents, HALF-UP at the cent. Integer in, integer out. */
export function bgnCentsFromEurCents(eurCents: number): number {
  assertCents(eurCents);
  // Work in integer space to dodge float traps:
  // bgnCents = round(eurCents * 1.95583) = round(eurCents * 195583 / 100000)
  const num = eurCents * 195583;
  const q = Math.floor(num / 100000);
  const rem = num % 100000;
  return rem * 2 >= 100000 ? q + 1 : q; // half-up
}

export function formatBgn(bgnCents: number): string {
  return `${numFmt.format(bgnCents / 100)} лв.`;
}

export function showBgn(): boolean {
  return process.env.NEXT_PUBLIC_SHOW_BGN === 'true'; // NEXT_PUBLIC_ ⇒ inlined client-side too
}

export function formatPrice(eurCents: number): string {
  return showBgn()
    ? `${formatEur(eurCents)} (${formatBgn(bgnCentsFromEurCents(eurCents))})`
    : formatEur(eurCents);
}

function assertCents(v: number): void {
  if (!Number.isInteger(v) || v < 0) throw new Error(`Invalid cents value: ${v}`);
}
```

Test anchors (money.test.ts): `bgnCentsFromEurCents(3114) === 6091` ·
`bgnCentsFromEurCents(100) === 196` (195.583 → half-up) ·
`bgnCentsFromEurCents(0) === 0` · property: monotonic non-decreasing ·
throws on 12.5 and -1.

---

## 2. `src/lib/slug.ts`

```ts
const MAP: Record<string, string> = {
  а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',
  м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',
  ш:'sh',щ:'sht',ъ:'a',ь:'y',ю:'yu',я:'ya',
};

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .split('')
    .map((ch) => MAP[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}
```

Used by all slug `beforeValidate` hooks:
`if (!data.slug && data.name) data.slug = slugify(data.name)`.

---

## 3. Collection skeleton — `src/collections/products.ts`

```ts
import type { CollectionConfig } from 'payload';
import { slugify } from '@/lib/slug';
import { revalidateTags } from '@/lib/payload/revalidate';

export const Products: CollectionConfig = {
  slug: 'products',
  labels: { singular: 'Продукт', plural: 'Продукти' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'category', 'brand', 'status'],
  },
  access: {
    read: ({ req }) => Boolean(req.user) || { status: { equals: 'published' } }, // public sees published only — belt; queries.ts is braces
  },
  fields: [
    { name: 'name', type: 'text', required: true, label: 'Име' },
    { name: 'slug', type: 'text', unique: true, index: true, admin: { position: 'sidebar' } },
    { name: 'status', type: 'select', defaultValue: 'draft', label: 'Статус',
      options: [ { label: 'Чернова', value: 'draft' }, { label: 'Публикуван', value: 'published' } ],
      admin: { position: 'sidebar' } },
    { name: 'category', type: 'relationship', relationTo: 'categories', required: true, label: 'Категория' },
    { name: 'brand', type: 'relationship', relationTo: 'brands', label: 'Марка' },
    { name: 'shortSpec', type: 'array', label: 'Кратки характеристики',
      fields: [{ name: 'text', type: 'text', required: true, label: 'Текст' }] },
    { name: 'description', type: 'richText', label: 'Описание' },
    { name: 'gallery', type: 'array', label: 'Галерия',
      fields: [{ name: 'image', type: 'upload', relationTo: 'media', required: true, label: 'Снимка' }] },
    { name: 'items', type: 'array', label: 'Артикули (SKU)', minRows: 1,
      fields: [
        { name: 'name', type: 'text', required: true, label: 'Наименование' },
        { name: 'sku', type: 'text', required: true, label: 'Продуктов код' },
        { name: 'unit', type: 'select', defaultValue: 'бр.', label: 'Мярка',
          options: ['бр.', 'м', 'компл.', 'чифт'].map((v) => ({ label: v, value: v })) },
        { name: 'lengthMm', type: 'number', label: 'Дължина (мм)' },
        { name: 'color', type: 'text', label: 'Цвят' },
        { name: 'priceEurCents', type: 'number', required: true, min: 1, label: 'Цена (евроцентове)',
          admin: { description: 'Пример: 31,14 € → 3114', step: 1 } },
        { name: 'inStock', type: 'checkbox', defaultValue: true, label: 'В наличност' },
      ] },
    { name: 'featured', type: 'checkbox', defaultValue: false, label: 'Показвай на началната страница' },
    { name: 'searchText', type: 'text', admin: { hidden: true } },
    { name: 'seo', type: 'group', label: 'SEO', fields: [
      { name: 'title', type: 'text' }, { name: 'description', type: 'textarea' } ] },
  ],
  hooks: {
    beforeValidate: [({ data }) => {
      if (!data) return data;
      if (!data.slug && data.name) data.slug = slugify(data.name);
      if (Array.isArray(data.items)) {
        for (const it of data.items) if (typeof it?.sku === 'string') it.sku = it.sku.trim();
      }
      data.searchText = buildSearchText(data); // name + item names + skus + brand name (fetch shallowly if only an ID) — lowercase
      return data;
    }],
    beforeChange: [async ({ data, req, originalDoc }) => {
      // 1) intra-doc duplicate SKU check → throw ValidationError (BG message)
      // 2) cross-doc: req.payload.find({ collection: 'products', depth: 0, overrideAccess: true,
      //      where: { and: [{ 'items.sku': { in: skus } }, { id: { not_equals: originalDoc?.id } }] } })
      //    on hit → throw with: `Продуктов код ${sku} вече съществува в „${other.name}“.`
      return data;
    }],
    afterChange: [async ({ doc, previousDoc }) => {
      await revalidateTags('products', `product-${doc.slug}`);
      if (previousDoc?.slug && previousDoc.slug !== doc.slug)
        await revalidateTags(`product-${previousDoc.slug}`);
    }],
    afterDelete: [async ({ doc }) => revalidateTags('products', `product-${doc.slug}`)],
  },
};
```

`revalidate.ts`:

```ts
import { revalidateTag } from 'next/cache';
export async function revalidateTags(...tags: string[]) {
  if (process.env.SKIP_REVALIDATE === '1') return;
  for (const t of tags) revalidateTag(t);
}
```

---

## 4. Query-layer pattern — `src/lib/payload/queries.ts`

```ts
import 'server-only';
import { unstable_cache } from 'next/cache';
import { getPayload } from 'payload';
import config from '@payload-config';

async function payload() { return getPayload({ config }); }

export const getCategoryTree = unstable_cache(
  async (): Promise<CategoryNode[]> => {
    const p = await payload();
    const { docs } = await p.find({ collection: 'categories', limit: 500, depth: 0,
      sort: 'sortOrder', overrideAccess: false });
    return assembleTree(docs); // pure helper below — parents→children, 3 levels
  },
  ['category-tree'],
  { tags: ['categories'] },
);

export function getProductBySlug(slug: string) {
  return unstable_cache(
    async () => {
      const p = await payload();
      const { docs } = await p.find({ collection: 'products', depth: 1, limit: 1,
        where: { and: [{ slug: { equals: slug } }, { status: { equals: 'published' } }] } });
      return docs[0] ?? null;
    },
    ['product', slug],
    { tags: [`product-${slug}`, 'products'] },
  )();
}

export function searchProducts(qRaw: string) {
  const tokens = qRaw.toLowerCase().trim().split(/\s+/).filter(Boolean).slice(0, 5);
  if (tokens.length === 0) return Promise.resolve([]);
  return unstable_cache(
    async () => {
      const p = await payload();
      const { docs } = await p.find({ collection: 'products', depth: 1, limit: 30,
        where: { and: [
          { status: { equals: 'published' } },
          ...tokens.map((t) => ({ searchText: { contains: t } })),
        ] } });
      return docs;
    },
    ['search', tokens.join(' ')],
    { tags: ['products'] },
  )();
}
```

Pattern rules visible above: dynamic-arg functions wrap-and-invoke so the
cache key includes the arg; every fn has tags; published-filter inside;
depth explicit.

---

## 5. `src/lib/images.ts`

```ts
export type Preset = 'thumb' | 'card' | 'detail' | 'zoom' | 'og';

const PRESETS: Record<Preset, string> = {
  thumb:  'width=160,format=auto,quality=80,fit=scale-down',
  card:   'width=480,format=auto,quality=82,fit=scale-down',
  detail: 'width=1024,format=auto,quality=85,fit=scale-down',
  zoom:   'width=1920,format=auto,quality=85,fit=scale-down',
  og:     'width=1200,height=630,format=jpeg,quality=85,fit=cover',
};

const HOST = process.env.NEXT_PUBLIC_MEDIA_HOST; // e.g. media.nasteh.bg

export function imageUrl(media: Pick<Media, 'filename'>, preset: Preset): string {
  const key = encodeURIComponent(media.filename ?? '');
  if (process.env.NODE_ENV === 'development' || !HOST) {
    return `${devMediaBase()}/${key}`; // originals in dev — transformations don't run locally
  }
  return `https://${HOST}/cdn-cgi/image/${PRESETS[preset]}/${key}`;
}

export function imageSrcSet(media: Pick<Media, 'filename'>, presets: Preset[]): string {
  const widths: Record<Preset, number> = { thumb: 160, card: 480, detail: 1024, zoom: 1920, og: 1200 };
  return presets.map((p) => `${imageUrl(media, p)} ${widths[p]}w`).join(', ');
}
```

CI enforces this file is the only `/cdn-cgi/image/` source (Phase 1.4).

---

## 6. Cart store — `src/lib/cart/store.ts`

```ts
'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type CartLine = { productSlug: string; sku: string; qty: number };

type CartState = {
  lines: CartLine[];
  hydrated: boolean;
  add: (l: Omit<CartLine, 'qty'>, qty?: number) => void;
  setQty: (sku: string, qty: number) => void;
  remove: (sku: string) => void;
  clear: () => void;
};

const clamp = (q: number) => Math.min(999, Math.max(1, Math.trunc(q) || 1));

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [], hydrated: false,
      add: (l, qty = 1) => set((s) => {
        const ex = s.lines.find((x) => x.sku === l.sku);
        return ex
          ? { lines: s.lines.map((x) => x.sku === l.sku ? { ...x, qty: clamp(x.qty + qty) } : x) }
          : { lines: [...s.lines, { ...l, qty: clamp(qty) }] };
      }),
      setQty: (sku, qty) => set((s) => ({ lines: s.lines.map((x) => x.sku === sku ? { ...x, qty: clamp(qty) } : x) })),
      remove: (sku) => set((s) => ({ lines: s.lines.filter((x) => x.sku !== sku) })),
      clear: () => set({ lines: [] }),
    }),
    {
      name: 'nasteh-cart-v1',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true, // components call useCart.persist.rehydrate() in an effect; render skeleton until then
      onRehydrateStorage: () => (state) => { if (state) state.hydrated = true; },
    },
  ),
);
```

SSR safety: any component reading `lines` renders the skeleton until
`hydrated === true` (prevents hydration mismatch + flash of empty cart).

---

## 7. Rate limit — `src/lib/rate-limit.ts`

```ts
import 'server-only';

type KVLike = { get(k: string): Promise<string | null>;
                put(k: string, v: string, o?: { expirationTtl?: number }): Promise<void> };

export async function rateLimitWith(kv: KVLike, key: string,
  { windowSec, max }: { windowSec: number; max: number },
): Promise<{ allowed: boolean; retryAfterSec: number }> {
  const bucket = Math.floor(Date.now() / 1000 / windowSec);
  const k = `${key}:${bucket}`;
  const current = Number((await kv.get(k)) ?? '0');
  if (current >= max) return { allowed: false, retryAfterSec: windowSec };
  await kv.put(k, String(current + 1), { expirationTtl: windowSec * 2 });
  return { allowed: true, retryAfterSec: 0 };
}

export async function rateLimit(key: string, opts: { windowSec: number; max: number }) {
  const { env } = await getCloudflareContext(); // template's accessor — adopt its exact import
  return rateLimitWith(env.RATE_LIMIT_KV, key, opts);
}
```

Fixed-window over KV; eventual consistency means it's a soft limit — fine,
Turnstile is the hard gate. `rateLimitWith` is the unit-testable core.

---

## 8. Order action — `src/actions/order.ts` (behavioral contract)

```ts
'use server';
import 'server-only';

export async function submitOrder(input: unknown): Promise<ActionResult<{ orderNumber: string }>> {
  const hdrs = await headers();
  const ip = hdrs.get('cf-connecting-ip') ?? 'unknown';

  // 1 honeypot
  const raw = input as Record<string, unknown>;
  if (typeof raw?.website === 'string' && raw.website.length > 0) {
    console.error('[order] honeypot tripped');
    return { ok: true, data: { orderNumber: fakeOrderNumber() } };
  }
  // 2 zod
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'errors.generic', fieldErrors: mapZod(parsed.error) };
  // 3 turnstile
  if (!(await verifyTurnstile(parsed.data.turnstileToken, ip)))
    return { ok: false, error: 'errors.captcha' };
  // 4 rate limit
  const rl = await rateLimit(`rl:order:${ip}`, { windowSec: 600, max: 5 });
  if (!rl.allowed) return { ok: false, error: 'errors.rateLimited' };
  // 5 resolve lines against DB (published products, matching sku, inStock)
  const resolved = await resolveCartLines(parsed.data.lines); // ← queries.ts helper, NOT cached (freshness)
  if (resolved.stale.length > 0) return { ok: false, error: 'errors.cartStale' };
  // 6 totals from DB prices only
  const { lines, totalEurCents } = buildOrderLines(resolved.ok); // pure, tested
  // 7 create — point of no return
  const p = await getPayload({ config });
  const order = await p.create({ collection: 'orders', overrideAccess: true, data: {
    status: 'нова',
    customer: parsed.data.customer, delivery: parsed.data.delivery,
    lines, totalEurCents, meta: { ip, userAgent: hdrs.get('user-agent') ?? '' },
  }});
  // 8 emails — best effort
  try { await sendOrderEmails(order); }
  catch (e) { console.error('[email]', order.orderNumber, e); }
  // 9
  return { ok: true, data: { orderNumber: order.orderNumber } };
}
```

Numbered steps map 1:1 to CONVENTIONS §3 — do not reorder; do not move
email before create; do not throw past step 7.

---

## 9. Redirect middleware — `src/middleware.ts`

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { REDIRECTS } from '@/lib/redirects'; // generated at build from data/redirects.csv (small script or inline import via raw loader)

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  if (pathname === '/index.php') {
    const idp = searchParams.get('id_product');
    const idc = searchParams.get('id_category');
    const target = (idp && REDIRECTS.products[idp]) || (idc && REDIRECTS.categories[idc]);
    if (target) return NextResponse.redirect(new URL(target, req.url), 301);
    return NextResponse.redirect(new URL('/', req.url), 301); // old CMS URLs never 404 into the void
  }
  return NextResponse.next();
}

export const config = { matcher: ['/index.php'] }; // tight matcher — zero overhead elsewhere
```

CSV → `REDIRECTS` happens in a tiny prebuild script (`scripts/gen-redirects.ts`,
runs in the build pipeline) so middleware stays dependency-free and edge-cheap.

---

## 10. Items table mobile collapse (CSS technique, Phase 5.4)

Same DOM, two renderings — no element swap, semantics preserved:

```css
/* ≥768px: normal table with sticky thead (position: sticky; top: var(--header-h)) */
/* <768px: */
@media (max-width: 767px) {
  .items-table thead { position: absolute; clip-path: inset(50%); } /* visually hidden, still announced */
  .items-table tr { display: block; border: 1px solid var(--color-sand);
    border-radius: 8px; margin-bottom: 12px; padding: 8px 12px; }
  .items-table td { display: flex; justify-content: space-between; gap: 12px;
    padding: 6px 0; border: 0; }
  .items-table td::before { content: attr(data-label); color: var(--color-steel); }
  .items-table td.actions::before { content: none; }
}
```

Each `<td>` gets `data-label={t('product.colPrice')}` etc. from the same
bg.ts keys as the `<th>`s — one source for both renderings.

---

## 11. GitHub Actions — `.github/workflows/ci.yml`

```yaml
name: CI
on: { push: { branches: [main] }, pull_request: {} }
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 24, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - name: Guardrail greps
        run: |
          ! grep -rEn '#[0-9a-fA-F]{3,8}\b' src/app src/components --include='*.tsx' --include='*.ts' || (echo 'Hex color outside tokens' && exit 1)
          ! grep -rn 'cdn-cgi/image' src --exclude=lib/images.ts || (echo '/cdn-cgi/image/ outside images.ts' && exit 1)
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm build
```

(Adjust grep exclude syntax to the actual layout at implementation; the
INTENT — two guardrails failing CI — is the locked part.)
