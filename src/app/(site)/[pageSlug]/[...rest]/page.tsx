import { notFound } from 'next/navigation'

// Any deeper unknown path (/old/shop/url.html) lands here, so it gets the
// storefront's own 404 page (header, search, footer) with a real 404 status —
// instead of Next's bare default, which this app shows because each route
// group has its own root layout.
export default function UnknownPath(): never {
  notFound()
}
