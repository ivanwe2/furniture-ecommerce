import path from 'path'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor, EXPERIMENTAL_TableFeature } from '@payloadcms/richtext-lexical'
import { bg } from '@payloadcms/translations/languages/bg'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'
import { log, type LogLevel } from './lib/log'

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

/**
 * Payload's logger in production → lib/log.ts JSON lines (area "payload").
 * Payload calls `logger.error({ err, msg })`; the old hand-rolled logger did
 * `JSON.stringify({ ...obj })`, and an Error stringifies to `{}` — every
 * production Payload error lost its message and stack. Dev keeps Payload's
 * default pretty logger.
 */
const payloadLog =
  (level: LogLevel) =>
  (objOrMsg: unknown, msg?: string): void => {
    if (typeof objOrMsg === 'string') return log(level, 'payload', objOrMsg)
    const { msg: inner, err, ...rest } = (objOrMsg ?? {}) as { msg?: string; err?: unknown } & Record<string, unknown>
    log(level, 'payload', msg ?? inner ?? (err instanceof Error ? err.message : 'payload'), {
      ...rest,
      ...(err !== undefined ? { err } : {}),
    })
  }

const jsonLogger = {
  level: process.env.PAYLOAD_LOG_LEVEL || 'info',
  trace: payloadLog('debug'),
  debug: payloadLog('debug'),
  info: payloadLog('info'),
  warn: payloadLog('warn'),
  error: payloadLog('error'),
  fatal: payloadLog('error'),
  silent: () => {},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Payload's logger option is typed as a pino instance; this structural stand-in implements the methods it calls
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
  // Nothing uses GraphQL: the storefront reads through the local API and the
  // admin talks REST. Leaving it on only exposes a second public query surface
  // (security audit 2026-11-14); its route files are removed too.
  graphQL: { disable: true },
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
