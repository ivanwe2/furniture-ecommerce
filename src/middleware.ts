import { NextResponse, type NextRequest } from 'next/server'
import { REDIRECTS } from '@/lib/redirects'

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl

  // Match PrestaShop-style /index.php URLs
  if (pathname === '/index.php') {
    const idp = searchParams.get('id_product')
    const idc = searchParams.get('id_category')

    // Try product redirect
    if (idp && REDIRECTS.products[idp]) {
      return NextResponse.redirect(new URL(REDIRECTS.products[idp], req.url), 301)
    }

    // Try category redirect
    if (idc && REDIRECTS.categories[idc]) {
      return NextResponse.redirect(new URL(REDIRECTS.categories[idc], req.url), 301)
    }

    // Fallback: redirect old CMS URLs to home (never 404 into the void)
    return NextResponse.redirect(new URL('/', req.url), 301)
  }

  // Exact-path redirects (for non-index.php patterns)
  const fullPath = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`.replace(/^\//, '')
  if (REDIRECTS.exactPaths[fullPath]) {
    return NextResponse.redirect(new URL(REDIRECTS.exactPaths[fullPath], req.url), 301)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/index.php', '/controller=:path*'],
}
