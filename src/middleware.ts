import { NextResponse, type NextRequest } from 'next/server'
import { REDIRECTS } from '@/lib/redirects'
import { bg } from '@/lib/i18n/bg'
import { isAuthorized, isLockExempt, readSiteLock } from '@/lib/site-lock'

// Read as separate literals (not `process.env` as an object) so the Edge bundle
// resolves them; see DEPLOY.md §8 for the build-time vs runtime caveat.
const SITE_LOCK = readSiteLock(process.env.SITE_LOCK_USER, process.env.SITE_LOCK_PASSWORD)

/**
 * The "в разработка" page a visitor sees only if they dismiss the browser's
 * credential prompt. Standalone HTML — middleware runs before the app shell, so
 * there is no Tailwind here; system colors keep it readable in light and dark.
 */
function lockedPage(): string {
  const { title, body, contact } = bg.siteLock
  return `<!doctype html>
<html lang="bg">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${title}</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center;
         padding: 1.5rem; background: Canvas; color: CanvasText;
         font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
  main { max-width: 32rem; text-align: center; }
  h1 { font-size: 1.5rem; margin: 0 0 0.75rem; }
  p { margin: 0 0 0.5rem; line-height: 1.6; }
  .contact { opacity: 0.7; font-size: 0.875rem; }
</style>
</head>
<body><main>
<h1>${title}</h1>
<p>${body}</p>
<p class="contact">${contact}</p>
</main></body>
</html>`
}

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl

  // Site lock first — nothing behind it should render for an unauthorized visitor.
  if (SITE_LOCK && !isLockExempt(pathname) && !isAuthorized(req.headers.get('authorization'), SITE_LOCK)) {
    return new NextResponse(lockedPage(), {
      status: 401,
      headers: {
        'WWW-Authenticate': `Basic realm="${bg.siteLock.realm}", charset="UTF-8"`,
        'Content-Type': 'text/html; charset=utf-8',
        // Never let a proxy or the browser cache the challenge.
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    })
  }

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
  // Broadened from the two legacy-redirect patterns so the site lock can gate
  // every page. The redirect lookups below are exact-key map hits (all keys
  // start `index.php`/`controller=`), so the wider matcher adds no new
  // redirects. Static assets are skipped — they carry no content worth gating.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
