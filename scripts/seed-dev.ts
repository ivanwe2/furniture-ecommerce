import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'

// Refuses to run against a production NODE_ENV unless explicitly allowed — so
// the owner can deliberately seed sample content into the deployed stack with
// `SEED_ALLOW_PROD=1` (see DEPLOY.md), but nothing seeds by accident.
if (process.env.NODE_ENV === 'production' && process.env.SEED_ALLOW_PROD !== '1') {
  console.error('seed-dev.ts: Refusing to run in production. Set SEED_ALLOW_PROD=1 to seed sample content.')
  process.exit(1)
}

const p = await getPayload({ config })

async function upsert(collection: 'categories' | 'brands' | 'products' | 'pages', slugField: string, slug: string, data: Record<string, unknown>) {
  const existing = await p.find({
    collection,
    depth: 0,
    where: { [slugField]: { equals: slug } },
  })
  if (existing.docs.length > 0 && existing.docs[0]?.id != null) {
    return p.update({ collection, id: existing.docs[0].id, data: data as never })
  }
  return p.create({ collection, data: data as never, draft: false })
}

// A minimal but FULLY-FORMED Lexical editor state for one paragraph of plain
// text (empty text → empty paragraph). Every node must carry the fields the
// Lexical editor's parseEditorState expects (format/detail/mode/style/version
// on text; direction/format/indent/version/textFormat on paragraph) — a
// partial node makes the admin RichText field throw "Cannot read properties of
// undefined (reading 'type')". Shape mirrors Payload's own empty-richText value.
function makeContent(text: string) {
  return {
    root: {
      type: 'root',
      direction: null,
      format: '',
      indent: 0,
      version: 1,
      children: [
        {
          type: 'paragraph',
          direction: null,
          format: '',
          indent: 0,
          version: 1,
          textFormat: 0,
          children: text
            ? [
                {
                  type: 'text',
                  text,
                  detail: 0,
                  format: 0,
                  mode: 'normal',
                  style: '',
                  version: 1,
                },
              ]
            : [],
        },
      ],
    },
  }
}

// Categories - real tree from old nasteh.bg
const categories = [
  { name: 'Мебелен обков', slug: 'mebelen-obkov' },
  { name: 'Дръжки', slug: 'drzhki', parent: 'mebelen-obkov' },
  { name: 'Панти', slug: 'panti', parent: 'mebelen-obkov' },
  { name: 'Механизми за чекмеджета', slug: 'mehanizmi-za-chekmedzheta', parent: 'mebelen-obkov' },
  { name: 'Повдигачи', slug: 'povdigachi', parent: 'mebelen-obkov' },
  { name: 'Шарнири за врати', slug: 'sharniri-za-vrati', parent: 'mebelen-obkov' },
  { name: 'Релси', slug: 'relisi', parent: 'mebelen-obkov' },
  { name: 'Подпори и стойки', slug: 'podpori-i-stoyki', parent: 'mebelen-obkov' },
  { name: 'Декоративни елементи', slug: 'dekorativni-elementi', parent: 'mebelen-obkov' },
  { name: 'Разнообразен обков', slug: 'raznoobrazhen-obkov', parent: 'mebelen-obkov' },
  { name: 'Системи за окачване', slug: 'sistemi-za-okachvane', parent: 'mebelen-obkov' },
  { name: 'Видео обков', slug: 'video-obkov', parent: 'mebelen-obkov' },
  { name: 'Механизми за вграждане', slug: 'mehanizmi-za-vgrazhdane' },
  { name: 'Индивидуални проекти', slug: 'individualni-proekti' },
  { name: 'Плъзгащи системи SEVROLL', slug: 'plzgashti-sistemi-sevroll' },
]

console.log('Seeding categories...')
const categoryMap = new Map<string, number>()
for (const cat of categories) {
  const parentRef = cat.parent ? categoryMap.get(cat.parent) : undefined
  const doc = await upsert('categories', 'slug', cat.slug as string, {
    name: cat.name,
    slug: cat.slug,
    sortOrder: 0,
    ...(parentRef && { parent: parentRef }),
  })
  categoryMap.set(cat.slug as string, doc.id)
}

// Brands
console.log('Seeding brands...')
const brandDefs = [
  { slug: 'sevroll', name: 'SEVROLL' },
  { slug: 'hettich', name: 'Hettich' },
  { slug: 'blum', name: 'Blum' },
  { slug: 'gtv', name: 'GTV' },
]
const brandMap = new Map<string, number>()
for (const b of brandDefs) {
  const doc = await upsert('brands', 'slug', b.slug, { name: b.name, slug: b.slug })
  brandMap.set(b.slug, doc.id)
}

// Products — a sample furniture-fittings catalogue (мебелен обков). Demo
// content: plausible names/SKUs/prices, edit or replace via the admin.
// Prices are integer EUR cents. `unit` ∈ {бр., м, компл., чифт}.
console.log('Seeding products...')

type SeedItem = {
  name: string
  sku: string
  unit: 'бр.' | 'м' | 'компл.' | 'чифт'
  lengthMm?: number
  color?: string
  priceEurCents: number
  inStock?: boolean
}
type SeedProduct = {
  slug: string
  name: string
  cat: string
  brand?: string
  featured?: boolean
  status?: 'published' | 'draft'
  description?: string
  items: SeedItem[]
}

const catalog: SeedProduct[] = [
  // --- Дръжки ---
  {
    slug: 'drzhka-comfort-16', name: 'Дръжка Comfort 16', cat: 'drzhki',
    items: [{ name: 'Дръжка Comfort 16 II - Сребро', sku: '02730', unit: 'бр.', color: 'Сребро', priceEurCents: 158, inStock: true }],
  },
  {
    slug: 'drzhka-profil-gola', name: 'Дръжка профил Gola', cat: 'drzhki', brand: 'gtv', featured: true,
    description: 'Алуминиев профил за бездръжкови фронтове (Gola система).',
    items: [
      { name: 'Профил Gola хоризонтален 3м - Алуминий', sku: 'GOLA-H-3-AL', unit: 'м', lengthMm: 3000, color: 'Алуминий', priceEurCents: 1290, inStock: true },
      { name: 'Профил Gola хоризонтален 3м - Черен', sku: 'GOLA-H-3-BL', unit: 'м', lengthMm: 3000, color: 'Черен мат', priceEurCents: 1450, inStock: true },
      { name: 'Профил Gola вертикален 3м - Алуминий', sku: 'GOLA-V-3-AL', unit: 'м', lengthMm: 3000, color: 'Алуминий', priceEurCents: 1190, inStock: true },
      { name: 'Капачка за профил Gola - чифт', sku: 'GOLA-CAP', unit: 'чифт', color: 'Алуминий', priceEurCents: 180, inStock: true },
    ],
  },
  {
    slug: 'relingova-drzhka-128', name: 'Релинг дръжка 128 мм', cat: 'drzhki', brand: 'gtv',
    items: [
      { name: 'Релинг дръжка 128мм - Инокс', sku: 'REL-128-IX', unit: 'бр.', lengthMm: 128, color: 'Инокс', priceEurCents: 210, inStock: true },
      { name: 'Релинг дръжка 128мм - Черен мат', sku: 'REL-128-BL', unit: 'бр.', lengthMm: 128, color: 'Черен мат', priceEurCents: 240, inStock: true },
      { name: 'Релинг дръжка 160мм - Инокс', sku: 'REL-160-IX', unit: 'бр.', lengthMm: 160, color: 'Инокс', priceEurCents: 245, inStock: true },
    ],
  },
  {
    slug: 'kopche-krug-25', name: 'Копче кръгло Ø25', cat: 'drzhki',
    items: [
      { name: 'Копче кръгло Ø25 - Никел', sku: 'KOP-25-NI', unit: 'бр.', color: 'Никел', priceEurCents: 95, inStock: true },
      { name: 'Копче кръгло Ø25 - Бронз', sku: 'KOP-25-BR', unit: 'бр.', color: 'Бронз', priceEurCents: 110, inStock: true },
    ],
  },
  {
    slug: 'drzhka-nova-kolektsiya', name: 'Дръжка Нова колекция', cat: 'drzhki', status: 'draft',
    items: [{ name: 'Дръжка Нова колекция - Черен мат', sku: 'NK-001', unit: 'бр.', color: 'Черен мат', priceEurCents: 220, inStock: true }],
  },

  // --- Панти ---
  {
    slug: 'pant-clip-on-amortisьor', name: 'Пант Clip-on с амортисьор 110°', cat: 'panti', brand: 'blum', featured: true,
    description: 'Панта с вградено плавно затваряне (Soft-close), ъгъл на отваряне 110°.',
    items: [
      { name: 'Пант Clip-on прав 110° - чифт', sku: 'CLIP-110-P', unit: 'чифт', priceEurCents: 640, inStock: true },
      { name: 'Пант Clip-on полунакладен 110° - чифт', sku: 'CLIP-110-PN', unit: 'чифт', priceEurCents: 660, inStock: true },
      { name: 'Пант Clip-on вътрешен 110° - чифт', sku: 'CLIP-110-V', unit: 'чифт', priceEurCents: 690, inStock: true },
    ],
  },
  {
    slug: 'pant-hettich-170', name: 'Пант Hettich 170°', cat: 'panti', brand: 'hettich',
    items: [{ name: 'Пант Hettich 170° - Сребро', sku: 'HET-170-SR', unit: 'чифт', color: 'Сребро', priceEurCents: 450, inStock: false }],
  },
  {
    slug: 'pant-za-stklo', name: 'Пант за стъклена врата', cat: 'panti',
    items: [
      { name: 'Пант за стъкло 90° - чифт', sku: 'GLASS-90', unit: 'чифт', priceEurCents: 780, inStock: true },
      { name: 'Пант за стъкло 180° - чифт', sku: 'GLASS-180', unit: 'чифт', priceEurCents: 890, inStock: false },
    ],
  },
  {
    slug: 'pant-lula-165', name: 'Пант лула 165°', cat: 'panti', brand: 'gtv',
    items: [{ name: 'Пант лула 165° - чифт', sku: 'LULA-165', unit: 'чифт', priceEurCents: 520, inStock: true }],
  },

  // --- Механизми за чекмеджета ---
  {
    slug: 'mehanizm-tandembox', name: 'Механизъм Tandembox', cat: 'mehanizmi-za-chekmedzheta', brand: 'blum', featured: true,
    description: 'Комплект за двустенно чекмедже с плавно прибиране.',
    items: [
      { name: 'Tandembox 270мм - компл.', sku: 'TB-270', unit: 'компл.', lengthMm: 270, priceEurCents: 1490, inStock: true },
      { name: 'Tandembox 350мм - компл.', sku: 'TB-350', unit: 'компл.', lengthMm: 350, priceEurCents: 1650, inStock: true },
      { name: 'Tandembox 450мм - компл.', sku: 'TB-450', unit: 'компл.', lengthMm: 450, priceEurCents: 1850, inStock: true },
      { name: 'Tandembox 500мм - компл.', sku: 'TB-500', unit: 'компл.', lengthMm: 500, priceEurCents: 1990, inStock: false },
    ],
  },
  {
    slug: 'metaboks-150', name: 'Метабокс H=150', cat: 'mehanizmi-za-chekmedzheta', brand: 'hettich',
    items: [
      { name: 'Метабокс 150/400мм - компл.', sku: 'MB-150-400', unit: 'компл.', lengthMm: 400, priceEurCents: 720, inStock: true },
      { name: 'Метабокс 150/450мм - компл.', sku: 'MB-150-450', unit: 'компл.', lengthMm: 450, priceEurCents: 760, inStock: true },
    ],
  },

  // --- Повдигачи ---
  {
    slug: 'povdigach-aventos-hk', name: 'Повдигач Aventos HK', cat: 'povdigachi', brand: 'blum',
    items: [
      { name: 'Aventos HK малък - компл.', sku: 'AV-HK-S', unit: 'компл.', priceEurCents: 3450, inStock: true },
      { name: 'Aventos HK голям - компл.', sku: 'AV-HK-L', unit: 'компл.', priceEurCents: 3980, inStock: true },
    ],
  },
  {
    slug: 'gazov-amortisьor-100n', name: 'Газов амортисьор 100N', cat: 'povdigachi',
    items: [
      { name: 'Газов амортисьор 100N', sku: 'GAS-100', unit: 'бр.', priceEurCents: 320, inStock: true },
      { name: 'Газов амортисьор 150N', sku: 'GAS-150', unit: 'бр.', priceEurCents: 350, inStock: true },
    ],
  },

  // --- Шарнири за врати ---
  {
    slug: 'panta-vratna-regulируема', name: 'Панта вратна регулируема', cat: 'sharniri-za-vrati',
    items: [
      { name: 'Панта вратна 3D регулируема - Инокс', sku: 'DOOR-3D-IX', unit: 'чифт', color: 'Инокс', priceEurCents: 1250, inStock: true },
      { name: 'Панта вратна 3D регулируема - Бял', sku: 'DOOR-3D-WH', unit: 'чифт', color: 'Бял', priceEurCents: 1180, inStock: true },
    ],
  },

  // --- Релси ---
  {
    slug: 'relsa-rolkova', name: 'Релса ролкова частично изваждане', cat: 'relisi', brand: 'gtv',
    items: [
      { name: 'Релса ролкова 300мм - чифт', sku: 'ROL-300', unit: 'чифт', lengthMm: 300, priceEurCents: 240, inStock: true },
      { name: 'Релса ролкова 400мм - чифт', sku: 'ROL-400', unit: 'чифт', lengthMm: 400, priceEurCents: 280, inStock: true },
      { name: 'Релса ролкова 500мм - чифт', sku: 'ROL-500', unit: 'чифт', lengthMm: 500, priceEurCents: 320, inStock: true },
    ],
  },
  {
    slug: 'relsa-teleskopichna-soft', name: 'Телескопична релса Soft-close', cat: 'relisi', brand: 'hettich', featured: true,
    description: 'Пълно изваждане с плавно прибиране.',
    items: [
      { name: 'Телескопична 400мм пълно изваждане - чифт', sku: 'TEL-400', unit: 'чифт', lengthMm: 400, priceEurCents: 560, inStock: true },
      { name: 'Телескопична 450мм пълно изваждане - чифт', sku: 'TEL-450', unit: 'чифт', lengthMm: 450, priceEurCents: 620, inStock: true },
      { name: 'Телескопична 500мм пълно изваждане - чифт', sku: 'TEL-500', unit: 'чифт', lengthMm: 500, priceEurCents: 680, inStock: true },
    ],
  },

  // --- Подпори и стойки ---
  {
    slug: 'podpora-za-raft', name: 'Подпора за рафт', cat: 'podpori-i-stoyki',
    items: [
      { name: 'Подпора за рафт метал - Никел', sku: 'SHELF-M-NI', unit: 'бр.', color: 'Никел', priceEurCents: 35, inStock: true },
      { name: 'Подпора за рафт с фиксатор', sku: 'SHELF-FIX', unit: 'бр.', priceEurCents: 55, inStock: true },
    ],
  },
  {
    slug: 'podpora-za-kuchka', name: 'Подпора за кухненска врата', cat: 'podpori-i-stoyki',
    items: [{ name: 'Подпора - стандартна', sku: 'PD-001', unit: 'бр.', priceEurCents: 340, inStock: true }],
  },

  // --- Декоративни елементи ---
  {
    slug: 'dekorativna-layna', name: 'Декоративна лайсна алуминий', cat: 'dekorativni-elementi',
    items: [
      { name: 'Декоративна лайсна 2.5м - Алуминий', sku: 'DEC-25-AL', unit: 'м', lengthMm: 2500, color: 'Алуминий', priceEurCents: 690, inStock: true },
      { name: 'Декоративна лайсна 2.5м - Злато', sku: 'DEC-25-GD', unit: 'м', lengthMm: 2500, color: 'Злато', priceEurCents: 850, inStock: false },
    ],
  },

  // --- Системи за окачване ---
  {
    slug: 'okachalka-goren-shkaf', name: 'Окачалка за горен шкаф', cat: 'sistemi-za-okachvane',
    items: [
      { name: 'Окачалка регулируема - чифт', sku: 'HANG-REG', unit: 'чифт', priceEurCents: 190, inStock: true },
      { name: 'Планка окачваща - чифт', sku: 'HANG-PLATE', unit: 'чифт', priceEurCents: 120, inStock: true },
    ],
  },

  // --- Механизми за вграждане ---
  {
    slug: 'koshnica-glov-shkaf', name: 'Кошница за ъглов шкаф', cat: 'mehanizmi-za-vgrazhdane', brand: 'hettich',
    description: 'Изтеглящ механизъм тип „магически ъгъл".',
    items: [
      { name: 'Кошница ъглов шкаф ляв - компл.', sku: 'CORNER-L', unit: 'компл.', priceEurCents: 5900, inStock: true },
      { name: 'Кошница ъглов шкаф десен - компл.', sku: 'CORNER-R', unit: 'компл.', priceEurCents: 5900, inStock: false },
    ],
  },

  // --- Плъзгащи системи SEVROLL ---
  {
    slug: 'plzgashta-sistema-comfort', name: 'Плъзгаща система COMFORT', cat: 'plzgashti-sistemi-sevroll', brand: 'sevroll', featured: true,
    items: [
      { name: 'Дръжка Comfort 16 II - бр.', sku: '02718', unit: 'бр.', lengthMm: 16, color: 'Сребро', priceEurCents: 158, inStock: true },
      { name: 'Дръжка Comfort 16 II - бр.', sku: '02719', unit: 'бр.', lengthMm: 16, color: 'Злато', priceEurCents: 172, inStock: true },
      { name: 'Дръжка Comfort 32 - бр.', sku: '02720', unit: 'бр.', lengthMm: 32, color: 'Сребро', priceEurCents: 195, inStock: true },
      { name: 'Дръжка Comfort 32 - бр.', sku: '02721', unit: 'бр.', lengthMm: 32, color: 'Злато', priceEurCents: 212, inStock: true },
      { name: 'Пант Comfort - чифт', sku: '02722', unit: 'чифт', color: 'Сребро', priceEurCents: 385, inStock: true },
      { name: 'Пант Comfort - чифт', sku: '02723', unit: 'чифт', color: 'Злато', priceEurCents: 420, inStock: true },
      { name: 'Механизъм чекмедже - компл.', sku: '02724', unit: 'компл.', priceEurCents: 1250, inStock: true },
      { name: 'Повдигач Comfort', sku: '02725', unit: 'бр.', priceEurCents: 890, inStock: false },
      { name: 'Релса пълно изваждане 400мм', sku: '02726', unit: 'м', lengthMm: 400, priceEurCents: 560, inStock: true },
      { name: 'Релса пълно изваждане 500мм', sku: '02727', unit: 'м', lengthMm: 500, priceEurCents: 680, inStock: true },
    ],
  },
  {
    slug: 'sevroll-komplekt-kolela', name: 'Комплект колела за плъзгаща врата', cat: 'plzgashti-sistemi-sevroll', brand: 'sevroll',
    items: [
      { name: 'Комплект колела горно/долно - компл.', sku: 'SEV-WHEEL', unit: 'компл.', priceEurCents: 1450, inStock: true },
      { name: 'Водач долен 2м', sku: 'SEV-GUIDE-2', unit: 'м', lengthMm: 2000, priceEurCents: 480, inStock: true },
    ],
  },
]

for (const prod of catalog) {
  const categoryId = categoryMap.get(prod.cat)
  if (!categoryId) {
    console.warn(`  skip ${prod.slug}: unknown category ${prod.cat}`)
    continue
  }
  await upsert('products', 'slug', prod.slug, {
    name: prod.name,
    slug: prod.slug,
    status: prod.status ?? 'published',
    category: categoryId,
    ...(prod.brand ? { brand: brandMap.get(prod.brand) } : {}),
    description: prod.description ? makeContent(prod.description) : null,
    items: prod.items.map((i) => ({ inStock: true, ...i })),
    featured: prod.featured ?? false,
  })
}
console.log(`Seeded ${catalog.length} products across ${categoryMap.size} categories.`)

// Site settings
console.log('Seeding site-settings...')
const existingSettings = await p.findGlobal({ slug: 'site-settings' })
if (existingSettings) {
  await p.updateGlobal({
    slug: 'site-settings',
    data: {
      companyName: 'Настех ООД',
      eik: '201869034',
      addressLine: 'бул. "Панчо Владигеров" 15, ет. 1',
      city: 'Пловдив',
      phones: [{ number: '+359 32 671 585' }],
      email: 'info@nasteh.bg',
      workingHours: 'Пон-Пет: 09:00-18:00\nСъб: 09:00-14:00',
      heroTitle: 'Мебелен обков - качествени решения за вашия дом',
      heroSubtitle: 'Официален представител на водещи марки. Плащане при доставка.',
      social: { facebook: 'https://facebook.com/nastehbg' },
    },
  })
} else {
  // Globals don't have createGlobal - just update (it creates if missing)
  await p.updateGlobal({
    slug: 'site-settings',
    data: {
      companyName: 'Настех ООД',
      eik: '201869034',
      addressLine: 'бул. "Панчо Владигеров" 15, ет. 1',
      city: 'Пловдив',
      phones: [{ number: '+359 32 671 585' }],
      email: 'info@nasteh.bg',
      workingHours: 'Пон-Пет: 09:00-18:00\nСъб: 09:00-14:00',
      heroTitle: 'Мебелен обков - качествени решения за вашия дом',
      heroSubtitle: 'Официален представител на водещи марки. Плащане при доставка.',
      social: { facebook: 'https://facebook.com/nastehbg' },
    },
  })
}

// Legal pages as DRAFTS (Phase 7.2)
console.log('Seeding legal pages (drafts)...')
const legalPages = [
  {
    slug: 'terms',
    title: 'Общи условия (ЧЕРНОВА - за одобрение)',
    content: makeContent(
      'Настоящите общи условия уреждат отношенията между Настех ООД и клиентите при поръчки на продукти чрез интернет магазина. Поръчката се счита за сключена след потвърждение от продавача. Плащането е наложен платеж при доставка. Продавачът си запазва правото да откаже поръчка без мотивация.',
    ),
  },
  {
    slug: 'privacy',
    title: 'Политика за поверителност (ЧЕРНОВА - за одобрение)',
    content: makeContent(
      'Настех ООД обработва лични данни на клиентите само с цел изпълнение на поръчка и доставка. Данните не се предават на трети страни, освен на куриерската фирма за необходимата доставка. Клиентът може да упражни правата си по ЗЗЛД чрез имейл до info@nasteh.bg.',
    ),
  },
  {
    slug: 'delivery-payment',
    title: 'Доставка и плащане (ЧЕРНОВА - за одобрение)',
    content: makeContent(
      'Доставката се извършва до адрес или офис на куриерска фирма (Еконт / Спиди). Плащането е наложен платеж - сумата се заплаща при получаване на пратката. Цените са с включено ДДС и са в български левове, като ще бъдат конвертирани в евро към края на 2026 г.',
    ),
  },
  {
    slug: 'returns',
    title: 'Право на отказ - 14 дни (ЧЕРНОВА - за одобрение)',
    content: makeContent(
      'Клиентът има право да откаже договора в срок от 14 дни от получаването на стоката, без да посочва причина. За упражняване на правото на отказ се изисква писмено уведомление до Настех ООД. Стоката трябва да бъде върната в оригиналното си състояние.',
    ),
  },
  {
    slug: 'cookies',
    title: 'Бисквитки (ЧЕРНОВА - за одобрение)',
    content: makeContent(
      'Този сайт използва бисквитки само с техническа цел - запазване на съдържанието на количката между преглежданията. Не се използват проследяващи или маркетингови бисквитки. Данните от количката се съхраняват локално във вашия браузър.',
    ),
  },
]

for (const page of legalPages) {
  await upsert('pages', 'slug', page.slug, {
    title: page.title,
    slug: page.slug,
    status: 'draft',
    content: page.content,
  })
}

// Admin user (from env)
console.log('Seeding admin user...')
const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@nasteh.bg'
const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'password123'
const existingUsers = await p.find({
  collection: 'users',
  where: { email: { equals: adminEmail } },
})
if (existingUsers.docs.length === 0) {
  await p.create({
    collection: 'users',
    data: { email: adminEmail, password: adminPassword },
  })
  console.log(`Admin user created: ${adminEmail}`)
} else {
  console.log(`Admin user already exists: ${adminEmail}`)
}

console.log('Seed complete!')

// The Cloudflare platform proxy keeps an open handle; exit explicitly so the
// script terminates instead of hanging after the work is done.
process.exit(0)
