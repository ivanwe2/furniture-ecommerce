import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      label: 'Алтернативен текст',
      admin: {
        description: 'Опишете изображението за SEO и достъпност.',
      },
    },
  ],
  upload: {
    // Uploads land on local disk (the `media` Docker volume in production).
    // Relative paths resolve from cwd — `media` = /app/media in the container.
    staticDir: process.env.MEDIA_DIR || 'media',
    crop: false,
    focalPoint: false,
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
}
