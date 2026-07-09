import type { CollectionConfig } from 'payload'
import { slugify } from '@/lib/slug'
import { revalidateTags } from '@/lib/payload/revalidate'

export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: { singular: 'Страница', plural: 'Страници' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'status'],
  },
  access: {
    read: ({ req }) => Boolean(req.user) || { status: { equals: 'published' } },
  },
  fields: [
    { name: 'title', type: 'text', required: true, label: 'Заглавие' },
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
    { name: 'content', type: 'richText', label: 'Съдържание' },
  ],
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data) return data
        if (!data.slug && data.title) {
          data.slug = slugify(data.title)
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc }) => {
        await revalidateTags('pages', `page-${doc.slug}`)
        if (previousDoc?.slug && previousDoc.slug !== doc.slug) {
          await revalidateTags(`page-${previousDoc.slug}`)
        }
      },
    ],
    afterDelete: [
      async ({ doc }) => revalidateTags('pages', `page-${doc.slug}`),
    ],
  },
}
