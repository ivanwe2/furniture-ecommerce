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
    // Responsive variants generated at upload by sharp (runs on Node). The
    // storefront variants are re-encoded as WebP for bandwidth; `og` keeps the
    // source format at 1200×630 for broad social-crawler compatibility. Names
    // match the `Preset`s in src/lib/images.ts (thumb/card/detail/zoom/og).
    imageSizes: [
      { name: 'thumb', width: 240, formatOptions: { format: 'webp', options: { quality: 74 } } },
      { name: 'card', width: 560, formatOptions: { format: 'webp', options: { quality: 78 } } },
      { name: 'detail', width: 1024, formatOptions: { format: 'webp', options: { quality: 82 } } },
      { name: 'zoom', width: 1920, formatOptions: { format: 'webp', options: { quality: 82 } } },
      { name: 'og', width: 1200, height: 630, position: 'centre' },
    ],
  },
}
