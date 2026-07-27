import { NextResponse, type NextRequest } from 'next/server'
import { REDIRECTS } from '@/lib/redirects'
import { bg } from '@/lib/i18n/bg'
import { isAuthorized, isLockExempt, readSiteLock, UNLOCK_PARAM } from '@/lib/site-lock'

// Read as separate literals (not `process.env` as an object) so the Edge bundle
// resolves them; see DEPLOY.md §8 for the build-time vs runtime caveat.
const SITE_LOCK = readSiteLock(process.env.SITE_LOCK_USER, process.env.SITE_LOCK_PASSWORD)

/**
 * The "в разработка" notice. Standalone HTML — middleware runs before the app
 * shell, so there is no Tailwind here; system colors keep it readable in light
 * and dark. The button re-requests the same path with `?unlock=1`, which is
 * what triggers the browser's credential prompt (see UNLOCK_PARAM).
 */
function lockedPage(unlockHref: string): string {
  const { title, body, contact, unlockCta, unlockHint } = bg.siteLock
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
  .dev { margin-top: 2.5rem; padding-top: 1.5rem; border-top: 1px solid GrayText; }
  a.cta { display: inline-block; padding: 0.6rem 1.25rem; border: 1px solid CanvasText;
          border-radius: 0.25rem; color: CanvasText; text-decoration: none;
          font-size: 0.9375rem; }
  a.cta:hover { background: CanvasText; color: Canvas; }
  a.cta:focus-visible { outline: 2px solid Highlight; outline-offset: 2px; }
  .hint { opacity: 0.6; font-size: 0.8125rem; margin-top: 0.75rem; }
</style>
</head>
<body><main>
<h1>${title}</h1>
<p>${body}</p>
<p class="contact">${contact}</p>
<div class="dev">
<a class="cta" href="${unlockHref}" rel="nofollow">${unlockCta}</a>
<p class="hint">${unlockHint}</p>
</div>
</main></body>
</html>`
}

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl

  // Site lock first — nothing behind it should render for an unauthorized visitor.
  if (SITE_LOCK && !isLockExempt(pathname)) {
    const authorized = isAuthorized(req.headers.get('authorization'), SITE_LOCK)
    const wantsPrompt = searchParams.has(UNLOCK_PARAM)

    if (!authorized) {
      const unlockUrl = req.nextUrl.clone()
      unlockUrl.searchParams.set(UNLOCK_PARAM, '1')
      const headers: Record<string, string> = {
        'Content-Type': 'text/html; charset=utf-8',
        // Never let a proxy or the browser cache the gate.
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow',
      }
      // Only the explicit "log in" request carries the challenge header; without
      // it the browser would pop its password box over the notice we want read.
      if (wantsPrompt) {
        headers['WWW-Authenticate'] = `Basic realm="${bg.siteLock.realm}", charset="UTF-8"`
      }
      return new NextResponse(lockedPage(`${unlockUrl.pathname}${unlockUrl.search}`), {
        // 503, not 401, when we are not challenging: a bare 401 is invalid HTTP
        // without WWW-Authenticate, and 503 is what tells crawlers "temporary,
        // don't index, come back later" — exactly a pre-launch holding page.
        status: wantsPrompt ? 401 : 503,
        headers,
      })
    }

    // Authenticated via the button — drop the flag so the address bar is clean.
    if (wantsPrompt) {
      const clean = req.nextUrl.clone()
      clean.searchParams.delete(UNLOCK_PARAM)
      return NextResponse.redirect(clean, 302)
    }
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
