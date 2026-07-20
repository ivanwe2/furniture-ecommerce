import path from 'path'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor, EXPERIMENTAL_TableFeature } from '@payloadcms/richtext-lexical'
import { bg } from '@payloadcms/translations/languages/bg'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Categories } from './collections/Categories'
import { Brands } from './collections/Brands'
import { Products } from './collections/Products'
import { Orders } from './collections/Orders'
import { Pages } from './collections/Pages'
import { SiteSettings } from './globals/SiteSettings'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const isProduction = process.env.NODE_ENV === 'production'

const createLog =
  (level: string, fn: typeof console.log) => (objOrMsg: object | string, msg?: string) => {
    if (typeof objOrMsg === 'string') {
      fn(JSON.stringify({ level, msg: objOrMsg }))
    } else {
      fn(JSON.stringify({ level, ...objOrMsg, msg: msg ?? (objOrMsg as { msg?: string }).msg }))
    }
  }

const jsonLogger = {
  level: process.env.PAYLOAD_LOG_LEVEL || 'info',
  trace: createLog('trace', console.debug),
  debug: createLog('debug', console.debug),
  info: createLog('info', console.log),
  warn: createLog('warn', console.warn),
  error: createLog('error', console.error),
  fatal: createLog('fatal', console.error),
  silent: () => {},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- payload's PayloadLogger type is not exported in 3.82.1
} as any

export default buildConfig({
  // Image processing for upload.imageSizes (WebP variants) — runs on Node.
  sharp,
  admin: {
    user: Users.slug,
    theme: 'light',
    meta: {
      titleSuffix: ' - Настех',
      // Brand the admin browser tab with the storefront favicon (/icon.svg —
      // the Настех badge) instead of Payload's default logo.
      icons: [{ rel: 'icon', type: 'image/svg+xml', url: '/icon.svg' }],
    },
    components: {
      graphics: {
        Logo: '/components/admin/Logo#Logo',
        Icon: '/components/admin/Icon#Icon',
      },
      // Wraps the whole panel (incl. login) to load the storefront fonts.
      providers: ['/components/admin/AdminFonts#AdminFonts'],
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  i18n: {
    supportedLanguages: { bg },
    fallbackLanguage: 'bg',
  },
  collections: [Users, Media, Categories, Brands, Products, Orders, Pages],
  globals: [SiteSettings],
  editor: lexicalEditor({
    features: ({ defaultFeatures }) => [...defaultFeatures, EXPERIMENTAL_TableFeature()],
  }),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    // Postgres runs in its own `db` container on the internal network. The
    // connection string is env-driven; the adapter manages the pg pool.
    pool: {
      connectionString:
        process.env.DATABASE_URI ?? 'postgres://postgres:postgres@localhost:5432/nasteh',
    },
  }),
  logger: isProduction ? jsonLogger : undefined,
})
