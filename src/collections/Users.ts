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
    cookies: {
      // Payload defaults this to `false` and does NOT infer it from NODE_ENV or
      // the request protocol, so without this the admin JWT would ride a plain
      // -HTTP request to the site (e.g. the :80 → :443 redirect hop) in clear.
      //
      // Keyed off the site's own scheme rather than NODE_ENV on purpose: the
      // dev Docker stack runs NODE_ENV=production but is reached over
      // http://localhost:3000, and a `Secure` cookie there would be dropped by
      // the browser — locking the admin out of local testing.
      //
      // NOTE: `NEXT_PUBLIC_*` is inlined at BUILD time (even here, in server
      // code), so this is fixed per image — editing .env and restarting will
      // NOT flip it; a rebuild will. Safe by default: the Dockerfile's build arg
      // defaults to https://nasteh.bg, so a production image is `Secure` unless
      // someone deliberately builds it with an http:// site URL. Verified both
      // ways against the container (DEPLOY §6).
      secure: (process.env.NEXT_PUBLIC_SITE_URL ?? '').startsWith('https://'),
      // Default, set explicitly: it is what blocks cross-site use of the cookie.
      sameSite: 'Lax',
    },
  },
  access: {
    create: ({ req }) => Boolean(req.user), // admin-only registration
  },
  fields: [
    // Email and password added by auth
  ],
  versions: false,
}
