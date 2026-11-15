// No `import 'server-only'`: payload.config.ts imports this (Payload CLI).
import type { CollectionConfig, GlobalConfig } from 'payload'
import { changedFields } from '@/lib/telemetry/events'
import { track } from '@/lib/telemetry/server'

/**
 * Admin usage telemetry: which collections and fields the owner edits, how
 * often, and when they log in — the data for "what should we automate next"
 * (e.g. stock edited by hand every day → a stock sync). Only saves made by a
 * logged-in admin count: seed scripts, the importer and the order action run
 * without `req.user` and are skipped (the importer records its own events).
 */
export function withAdminTelemetry(collection: CollectionConfig): CollectionConfig {
  const slug = collection.slug
  const hooks = collection.hooks ?? {}
  return {
    ...collection,
    hooks: {
      ...hooks,
      afterChange: [
        ...(hooks.afterChange ?? []),
        ({ doc, previousDoc, operation, req }) => {
          if (req.user) {
            track(
              'admin_change',
              {
                collection: slug,
                op: operation,
                fields: operation === 'create' ? [] : changedFields(doc, previousDoc),
                user: String(req.user.id),
              },
              { source: 'admin' },
            )
          }
          return doc
        },
      ],
      afterDelete: [
        ...(hooks.afterDelete ?? []),
        ({ doc, req }) => {
          if (req.user) track('admin_change', { collection: slug, op: 'delete', fields: [], user: String(req.user.id) }, { source: 'admin' })
          return doc
        },
      ],
      ...(collection.auth
        ? {
            afterLogin: [
              ...(hooks.afterLogin ?? []),
              ({ user }) => {
                track('admin_login', { user: String(user.id) }, { source: 'admin' })
              },
            ],
          }
        : {}),
    },
  }
}

export function withAdminTelemetryGlobal(global: GlobalConfig): GlobalConfig {
  const hooks = global.hooks ?? {}
  return {
    ...global,
    hooks: {
      ...hooks,
      afterChange: [
        ...(hooks.afterChange ?? []),
        ({ doc, previousDoc, req }) => {
          if (req.user) {
            track(
              'admin_change',
              { collection: global.slug, op: 'update', fields: changedFields(doc, previousDoc), user: String(req.user.id) },
              { source: 'admin' },
            )
          }
          return doc
        },
      ],
    },
  }
}
