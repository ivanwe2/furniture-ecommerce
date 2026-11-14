import type { CollectionConfig } from 'payload'
import { normalizeSlug } from '@/lib/slug'
import { revalidateTags } from '@/lib/payload/revalidate'

export const Brands: CollectionConfig = {
  slug: 'brands',
  labels: { singular: 'Марка', plural: 'Марки' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug'],
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
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
      label: 'Лого',
    },
    { name: 'description', type: 'textarea', label: 'Описание' },
  ],
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data) return data
        // Always slugified (lib/slug.ts normalizeSlug): a non-ASCII slug 404s.
        const slug = normalizeSlug(data.slug, data.name)
        if (slug) data.slug = slug
        return data
      },
    ],
    afterChange: [
      async () => revalidateTags('brands', 'products'),
    ],
    afterDelete: [
      async () => revalidateTags('brands', 'products'),
    ],
  },
}
