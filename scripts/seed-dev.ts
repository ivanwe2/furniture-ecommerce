import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'

// Local-only guard
if (process.env.NODE_ENV === 'production') {
  console.error('seed-dev.ts: Refusing to run in production.')
  process.exit(1)
}

const p = await getPayload({ config })

async function upsert(collection: 'categories' | 'brands' | 'products', slugField: string, slug: string, data: Record<string, unknown>) {
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

// Categories — real tree from old nasteh.bg
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
const sevrollBrand = await upsert('brands', 'slug', 'sevroll', {
  name: 'SEVROLL',
  slug: 'sevroll',
})

// Products
console.log('Seeding products...')
const drzhkiCat = categoryMap.get('drzhki')!
const pantiCat = categoryMap.get('panti')!
const sevrollCat = categoryMap.get('plzgashti-sistemi-sevroll')!

// Single-item product
await upsert('products', 'slug', 'drzhka-comfort-16', {
  name: 'Дръжка Comfort 16',
  slug: 'drzhka-comfort-16',
  status: 'published',
  category: drzhkiCat,
  brand: undefined,
  description: '',
  items: [
    {
      name: 'Дръжка Comfort 16 II — Сребро',
      sku: '02718',
      unit: 'бр.',
      priceEurCents: 158,
      inStock: true,
    },
  ],
  featured: false,
})

// SEVROLL family with 10 rows
await upsert('products', 'slug', 'plzgashta-sistema-comfort', {
  name: 'Плъзгаща система COMFORT',
  slug: 'plzgashta-sistema-comfort',
  status: 'published',
  category: sevrollCat,
  brand: sevrollBrand.id,
  description: '',
  items: [
    { name: 'Дръжка Comfort 16 II — бр.', sku: '02718', unit: 'бр.', lengthMm: 16, color: 'Сребро', priceEurCents: 158, inStock: true },
    { name: 'Дръжка Comfort 16 II — бр.', sku: '02719', unit: 'бр.', lengthMm: 16, color: 'Злато', priceEurCents: 172, inStock: true },
    { name: 'Дръжка Comfort 32 — бр.', sku: '02720', unit: 'бр.', lengthMm: 32, color: 'Сребро', priceEurCents: 195, inStock: true },
    { name: 'Дръжка Comfort 32 — бр.', sku: '02721', unit: 'бр.', lengthMm: 32, color: 'Злато', priceEurCents: 212, inStock: true },
    { name: 'Пант Comfort — чифт', sku: '02722', unit: 'чифт', color: 'Сребро', priceEurCents: 385, inStock: true },
    { name: 'Пант Comfort — чифт', sku: '02723', unit: 'чифт', color: 'Злато', priceEurCents: 420, inStock: true },
    { name: 'Механизъм чекмедже — компл.', sku: '02724', unit: 'компл.', priceEurCents: 1250, inStock: true },
    { name: 'Повдигач Comfort', sku: '02725', unit: 'бр.', priceEurCents: 890, inStock: false },
    { name: 'Релса пълно изваждане 400мм', sku: '02726', unit: 'м', lengthMm: 400, priceEurCents: 560, inStock: true },
    { name: 'Релса пълно изваждане 500мм', sku: '02727', unit: 'м', lengthMm: 500, priceEurCents: 680, inStock: true },
  ],
  featured: true,
})

// Out-of-stock product
await upsert('products', 'slug', 'pant-hettich-170', {
  name: 'Пант Hettich 170°',
  slug: 'pant-hettich-170',
  status: 'published',
  category: pantiCat,
  brand: undefined,
  description: '',
  items: [
    { name: 'Пант Hettich 170° — Сребро', sku: 'HET-170-SR', unit: 'чифт', color: 'Сребро', priceEurCents: 450, inStock: false },
  ],
  featured: false,
})

// Draft product (should not appear publicly)
await upsert('products', 'slug', 'drzhka-nova-kolektsiya', {
  name: 'Дръжка Нова колекция',
  slug: 'drzhka-nova-kolektsiya',
  status: 'draft',
  category: drzhkiCat,
  brand: undefined,
  description: '',
  items: [
    { name: 'Дръжка Нова колекция — Черен мат', sku: 'NK-001', unit: 'бр.', color: 'Черен мат', priceEurCents: 220, inStock: true },
  ],
  featured: false,
})

// Simple product
await upsert('products', 'slug', 'podpora-za-kuchka', {
  name: 'Подпора за кухненска врата',
  slug: 'podpora-za-kuchka',
  status: 'published',
  category: sevrollCat,
  brand: undefined,
  description: '',
  items: [
    { name: 'Подпора — стандартна', sku: 'PD-001', unit: 'бр.', priceEurCents: 340, inStock: true },
  ],
  featured: false,
})

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
      workingHours: 'Пон–Пет: 09:00–18:00\nСъб: 09:00–14:00',
      heroTitle: 'Мебелен обков — качествени решения за вашия дом',
      heroSubtitle: 'Официален представител на водещи марки. Плащане при доставка.',
      social: { facebook: 'https://facebook.com/nastehbg' },
    },
  })
} else {
  // Globals don't have createGlobal — just update (it creates if missing)
  await p.updateGlobal({
    slug: 'site-settings',
    data: {
      companyName: 'Настех ООД',
      eik: '201869034',
      addressLine: 'бул. "Панчо Владигеров" 15, ет. 1',
      city: 'Пловдив',
      phones: [{ number: '+359 32 671 585' }],
      email: 'info@nasteh.bg',
      workingHours: 'Пон–Пет: 09:00–18:00\nСъб: 09:00–14:00',
      heroTitle: 'Мебелен обков — качествени решения за вашия дом',
      heroSubtitle: 'Официален представител на водещи марки. Плащане при доставка.',
      social: { facebook: 'https://facebook.com/nastehbg' },
    },
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
