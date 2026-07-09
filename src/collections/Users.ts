import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Потребител', plural: 'Потребители' },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email'],
  },
  auth: {
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000, // 10 minutes
  },
  access: {
    create: ({ req }) => Boolean(req.user), // admin-only registration
  },
  fields: [
    // Email and password added by auth
  ],
  versions: false,
}
