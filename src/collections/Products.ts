import type { CollectionConfig, Where } from 'payload'
import { normalizeSlug } from '@/lib/slug'
import { revalidateTags } from '@/lib/payload/revalidate'
import { importEndpoints } from '@/lib/import/endpoints'
import { bg } from '@/lib/i18n/bg'

export const Products: CollectionConfig = {
  slug: 'products',
  labels: { singular: 'Продукт', plural: 'Продукти' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'category', 'brand', 'status'],
    components: {
      views: {
        // Bulk import from a JSON file (DATA-MODEL §9) at
        // /admin/collections/products/import. A COLLECTION view on purpose:
        // Payload applies its normal login gate to these, whereas root custom
        // views skip it.
        import: {
          Component: '/components/admin/import/ProductImportView#ProductImportView',
          path: '/import',
          exact: true,
          meta: { title: bg.adminImport.title },
        },
        list: { actions: ['/components/admin/import/ImportLink#ImportLink'] },
      },
    },
  },
  endpoints: importEndpoints,
  access: {
    read: ({ req }) => Boolean(req.user) || { status: { equals: 'published' } },
  },
  fields: [
    { name: 'name', type: 'text', required: true, label: 'Име' },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'draft',
      label: 'Статус',
      options: [
        { label: 'Чернова', value: 'draft' },
        { label: 'Публикуван', value: 'published' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      required: true,
      label: 'Категория',
    },
    {
      name: 'brand',
      type: 'relationship',
      relationTo: 'brands',
      label: 'Марка',
    },
    {
      name: 'shortSpec',
      type: 'array',
      label: 'Кратки характеристики',
      labels: { singular: 'характеристика', plural: 'характеристики' },
      fields: [
        { name: 'text', type: 'text', required: true, label: 'Текст' },
      ],
    },
    { name: 'description', type: 'richText', label: 'Описание' },
    {
      // „Характеристики" table on the product page. Марка and Каталожен № are
      // added automatically; a variant's own lines (items[].specs) override a
      // line here with the same label.
      name: 'specs',
      type: 'array',
      label: 'Характеристики',
      labels: { singular: 'характеристика', plural: 'характеристики' },
      admin: {
        description:
          'Показват се в таблица „Характеристики". Марка и каталожен номер се добавят автоматично.',
      },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'label', type: 'text', required: true, label: 'Характеристика', admin: { width: '40%' } },
            { name: 'value', type: 'text', required: true, label: 'Стойност', admin: { width: '60%' } },
          ],
        },
      ],
    },
    {
      name: 'gallery',
      type: 'array',
      label: 'Галерия',
      labels: { singular: 'снимка', plural: 'снимки' },
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
          label: 'Снимка',
        },
      ],
    },
    {
      name: 'items',
      type: 'array',
      label: 'Артикули (SKU)',
      labels: { singular: 'артикул', plural: 'артикули' },
      minRows: 1,
      fields: [
        { name: 'name', type: 'text', required: true, label: 'Наименование' },
        { name: 'sku', type: 'text', required: true, label: 'Продуктов код' },
        {
          name: 'unit',
          type: 'select',
          defaultValue: 'бр.',
          label: 'Мярка',
          options: [
            { label: 'бр.', value: 'бр.' },
            { label: 'м', value: 'м' },
            { label: 'компл.', value: 'компл.' },
            { label: 'чифт', value: 'чифт' },
          ],
        },
        { name: 'lengthMm', type: 'number', label: 'Дължина (мм)' },
        { name: 'color', type: 'text', label: 'Цвят' },
        {
          // Optional: an empty price means „по запитване" — shown, never
          // orderable (lib/availability.ts; the order action refuses it).
          name: 'priceEurCents',
          type: 'number',
          min: 1,
          label: 'Цена (евроцентове)',
          admin: {
            description: 'Пример: 31,14 € → 3114. Празно = „по запитване" (не може да се поръча онлайн).',
            step: 1,
          },
        },
        {
          name: 'stockQty',
          type: 'number',
          defaultValue: 0,
          min: 0,
          label: 'Наличност (брой)',
          admin: {
            step: 1,
            description: 'Брой в наличност. 0 = изчерпан (не може да се поръча).',
          },
        },
        {
          // Shown as the main picture when this variant is selected on the
          // product page; empty = the product's gallery cover.
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          label: 'Снимка на варианта',
        },
        {
          name: 'specs',
          type: 'array',
          label: 'Характеристики на варианта',
          labels: { singular: 'характеристика', plural: 'характеристики' },
          admin: {
            initCollapsed: true,
            description:
              'Само различията на този вариант. Ред със същото име замества характеристиката на продукта.',
          },
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'label', type: 'text', required: true, label: 'Характеристика', admin: { width: '40%' } },
                { name: 'value', type: 'text', required: true, label: 'Стойност', admin: { width: '60%' } },
              ],
            },
          ],
        },
      ],
    },
    {
      // „Подходящи артикули". Empty = the page shows other products from the
      // same category instead. maxDepth 0: the page loads these separately
      // (with their cover images); populating them inside every product read
      // would drag each related product's full document along.
      name: 'related',
      type: 'relationship',
      relationTo: 'products',
      hasMany: true,
      maxRows: 8,
      maxDepth: 0,
      label: 'Подходящи артикули',
      filterOptions: ({ id }) => (id ? { id: { not_equals: id } } : true),
      admin: {
        description: 'Празно = показват се други продукти от същата категория.',
      },
    },
    {
      // Set by the JSON importer for rows that share a `group` key (DATA-MODEL
      // §9): it is how a re-run finds the product to add or update variants
      // on. Never shown — the owner does not edit it.
      name: 'importGroup',
      type: 'text',
      index: true,
      admin: { hidden: true },
    },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      label: 'Показвай на началната страница',
    },
    { name: 'searchText', type: 'text', admin: { hidden: true } },
    // Derived from items[].priceEurCents in beforeValidate — the sort key for
    // price ordering. Indexed because every "cheapest/priciest first" listing
    // orders by it. Hidden: the owner edits item prices, never this.
    { name: 'minPriceEurCents', type: 'number', index: true, admin: { hidden: true } },
    {
      name: 'seo',
      type: 'group',
      label: 'SEO (по желание)',
      admin: {
        description:
          'Не е задължително. Ако оставите полетата празни, заглавието и описанието за търсачки се генерират автоматично от името и описанието на продукта. Попълнете само ако искате различен текст.',
      },
      fields: [
        {
          name: 'title',
          type: 'text',
          label: 'Заглавие за търсачки',
          admin: { description: 'Празно = „Име на продукта | Настех".' },
        },
        {
          name: 'description',
          type: 'textarea',
          label: 'Описание за търсачки',
          admin: { description: 'Празно = автоматично от описанието на продукта.' },
        },
      ],
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, req, originalDoc }) => {
        if (!data) return data
        // Always slugified (lib/slug.ts normalizeSlug): a non-ASCII slug 404s.
        const slug = normalizeSlug(data.slug, data.name)
        if (slug) data.slug = slug
        // Normalize SKUs
        if (Array.isArray(data.items)) {
          for (const it of data.items) {
            if (typeof it?.sku === 'string') it.sku = it.sku.trim()
          }
        }
        // The derived columns below describe the document as it WILL be saved.
        // On update, `data` holds only the fields being changed: the admin form
        // happens to send the whole document, but the local API and REST PATCH
        // send partial data (the product importer updates just `items`, or just
        // `gallery`). Building from `data` alone would drop the name from
        // searchText and null minPriceEurCents on every such save.
        const name: string = data.name ?? originalDoc?.name ?? ''
        const items: { name?: string; sku?: string; priceEurCents?: number | null }[] = Array.isArray(data.items)
          ? data.items
          : Array.isArray(originalDoc?.items)
            ? originalDoc.items
            : []
        const brand = 'brand' in data ? data.brand : originalDoc?.brand

        // Build searchText — resolve brand name if only ID is available
        let brandName = ''
        if (brand && typeof brand === 'object' && !Array.isArray(brand)) {
          if (typeof brand.name === 'string') {
            brandName = brand.name
          } else if (typeof brand.id !== 'undefined') {
            const brandDoc = await req.payload.findByID({
              collection: 'brands',
              id: brand.id,
              depth: 0,
              overrideAccess: true,
            })
            if (brandDoc?.name) brandName = brandDoc.name
          }
        } else if (typeof brand === 'string' || typeof brand === 'number') {
          const brandDoc = await req.payload.findByID({
            collection: 'brands',
            id: brand,
            depth: 0,
            overrideAccess: true,
          })
          if (brandDoc?.name) brandName = brandDoc.name
        }
        const parts = [name]
        for (const it of items) {
          if (it?.name) parts.push(it.name)
          if (it?.sku) parts.push(it.sku)
        }
        if (brandName) parts.push(brandName)
        data.searchText = parts.join(' ').toLowerCase()

        // Denormalise the cheapest item price so listings can sort by price.
        // Prices live in the `items` array and Payload cannot sort on an array
        // subfield, so without this column "най-евтини" is impossible. Kept in
        // step with `items` on every save, exactly like searchText above.
        // Price-on-request items (no price) are left out — `Number(null)` is 0
        // and would make every such product sort as the cheapest. All prices
        // empty → NULL, which sorts last ascending like an unpriced product.
        const prices = items
          .map((it) => it?.priceEurCents)
          .filter((n): n is number => typeof n === 'number' && Number.isFinite(n))
        data.minPriceEurCents = prices.length > 0 ? Math.min(...prices) : null

        return data
      },
    ],
    beforeChange: [
      async ({ data, req, originalDoc }) => {
        // Intra-doc duplicate SKU check
        if (Array.isArray(data.items)) {
          const skuMap = new Map<string, number>()
          for (let i = 0; i < data.items.length; i++) {
            const sku = data.items[i]?.sku
            if (!sku) continue
            if (skuMap.has(sku)) {
              throw new Error(`Дублиращ се продуктов код: ${sku}`)
            }
            skuMap.set(sku, i)
          }
        }
        // Cross-doc SKU uniqueness check
        if (Array.isArray(data.items) && data.items.length > 0) {
          const skus = data.items.map((it: { sku?: string }) => it.sku).filter(Boolean) as string[]
          if (skus.length > 0) {
            // Exclude the current doc only on update — on create there is no
            // id yet, and D1 rejects an `undefined` bind value.
            const and: Where[] = [{ 'items.sku': { in: skus } }]
            if (originalDoc?.id != null) {
              and.push({ id: { not_equals: originalDoc.id } })
            }
            const result = await req.payload.find({
              collection: 'products',
              depth: 0,
              overrideAccess: true,
              where: { and },
            })
            if (result.docs.length > 0) {
              for (const sku of skus) {
                const other = result.docs.find((doc) =>
                  doc.items?.some((item) => item.sku === sku),
                )
                if (other) {
                  throw new Error(
                    `Продуктов код ${sku} вече съществува в „${other.name}".`,
                  )
                }
              }
            }
          }
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc }) => {
        await revalidateTags('products', `product-${doc.slug}`)
        if (previousDoc?.slug && previousDoc.slug !== doc.slug) {
          await revalidateTags(`product-${previousDoc.slug}`)
        }
      },
    ],
    afterDelete: [
      async ({ doc }) => revalidateTags('products', `product-${doc.slug}`),
    ],
  },
}
