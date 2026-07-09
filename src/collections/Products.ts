import type { CollectionConfig, Where } from 'payload'
import { slugify } from '@/lib/slug'
import { revalidateTags } from '@/lib/payload/revalidate'

export const Products: CollectionConfig = {
  slug: 'products',
  labels: { singular: 'Продукт', plural: 'Продукти' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'category', 'brand', 'status'],
  },
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
      fields: [
        { name: 'text', type: 'text', required: true, label: 'Текст' },
      ],
    },
    { name: 'description', type: 'richText', label: 'Описание' },
    {
      name: 'gallery',
      type: 'array',
      label: 'Галерия',
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
          name: 'priceEurCents',
          type: 'number',
          required: true,
          min: 1,
          label: 'Цена (евроцентове)',
          admin: { description: 'Пример: 31,14 € → 3114', step: 1 },
        },
        {
          name: 'inStock',
          type: 'checkbox',
          defaultValue: true,
          label: 'В наличност',
        },
      ],
    },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      label: 'Показвай на началната страница',
    },
    { name: 'searchText', type: 'text', admin: { hidden: true } },
    {
      name: 'seo',
      type: 'group',
      label: 'SEO',
      fields: [
        { name: 'title', type: 'text' },
        { name: 'description', type: 'textarea' },
      ],
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, req }) => {
        if (!data) return data
        if (!data.slug && data.name) {
          data.slug = slugify(data.name)
        }
        // Normalize SKUs
        if (Array.isArray(data.items)) {
          for (const it of data.items) {
            if (typeof it?.sku === 'string') it.sku = it.sku.trim()
          }
        }
        // Build searchText — resolve brand name if only ID is available
        let brandName = ''
        if (data.brand && typeof data.brand === 'object' && !Array.isArray(data.brand)) {
          if (typeof data.brand.name === 'string') {
            brandName = data.brand.name
          } else if (typeof data.brand.id !== 'undefined') {
            const brandDoc = await req.payload.findByID({
              collection: 'brands',
              id: data.brand.id,
              depth: 0,
              overrideAccess: true,
            })
            if (brandDoc?.name) brandName = brandDoc.name
          }
        } else if (typeof data.brand === 'string' || typeof data.brand === 'number') {
          const brandDoc = await req.payload.findByID({
            collection: 'brands',
            id: data.brand,
            depth: 0,
            overrideAccess: true,
          })
          if (brandDoc?.name) brandName = brandDoc.name
        }
        const parts = [data.name ?? '']
        if (Array.isArray(data.items)) {
          for (const it of data.items) {
            if (it?.name) parts.push(it.name)
            if (it?.sku) parts.push(it.sku)
          }
        }
        if (brandName) parts.push(brandName)
        data.searchText = parts.join(' ').toLowerCase()
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
