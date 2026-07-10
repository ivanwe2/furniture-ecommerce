import type { CollectionConfig } from 'payload'
import { slugify } from '@/lib/slug'
import { revalidateTags } from '@/lib/payload/revalidate'

export const Categories: CollectionConfig = {
  slug: 'categories',
  labels: { singular: 'Категория', plural: 'Категории' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'parent', 'sortOrder'],
  },
  access: {
    read: () => true,
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
      name: 'parent',
      type: 'relationship',
      relationTo: 'categories',
      label: 'Родителска категория',
    },
    { name: 'description', type: 'textarea', label: 'Описание' },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      label: 'Снимка',
    },
    {
      name: 'sortOrder',
      type: 'number',
      defaultValue: 0,
      label: 'Подредба',
      admin: { position: 'sidebar' },
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, req }) => {
        if (!data) return data
        if (!data.slug && data.name) {
          data.slug = slugify(data.name)
        }
        // Depth guard - walk parent chain, max 3 levels
        if (data.parent) {
          let depth = 1
          let currentId: number | string | null = typeof data.parent === 'object' ? data.parent.id : data.parent
          while (currentId && depth < 4) {
            const cat = await req.payload.findByID({
              collection: 'categories',
              id: currentId,
              depth: 0,
              overrideAccess: true,
            })
            if (!cat || !cat.parent) break
            depth++
            currentId = typeof cat.parent === 'object' ? cat.parent.id : cat.parent
          }
          if (depth >= 3) {
            throw new Error('Максимум 3 нива на категории.')
          }
        }
        return data
      },
    ],
    beforeDelete: [
      async ({ req, id }) => {
        // Block if any product references this category
        const products = await req.payload.find({
          collection: 'products',
          depth: 0,
          overrideAccess: true,
          where: { category: { equals: id } },
        })
        if (products.docs.length > 0) {
          throw new Error('Не може да се изтрие - има продукти в тази категория. Преместете ги първо.')
        }
        // Block if any category has this as parent
        const children = await req.payload.find({
          collection: 'categories',
          depth: 0,
          overrideAccess: true,
          where: { parent: { equals: id } },
        })
        if (children.docs.length > 0) {
          throw new Error('Не може да се изтрие - има подкатегории. Преместете ги първо.')
        }
      },
    ],
    afterChange: [
      async () => revalidateTags('categories', 'products'),
    ],
    afterDelete: [
      async () => revalidateTags('categories', 'products'),
    ],
  },
}
