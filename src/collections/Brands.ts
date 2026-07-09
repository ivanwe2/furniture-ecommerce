import type { CollectionConfig } from 'payload'
import { slugify } from '@/lib/slug'
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
        if (!data.slug && data.name) {
          data.slug = slugify(data.name)
        }
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
