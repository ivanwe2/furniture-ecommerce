export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/kolichka', '/poruchka'],
      },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nasteh.bg'}/sitemap.xml`,
  }
}
