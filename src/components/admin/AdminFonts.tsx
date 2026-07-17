import * as React from 'react'
import { Golos_Text, IBM_Plex_Mono } from 'next/font/google'

/**
 * Loads the storefront's typefaces INTO the Payload admin so the panel matches
 * the 1A editorial look instead of falling back to system fonts. next/font
 * self-hosts the cyrillic+latin subsets at build time (no runtime Google-Fonts
 * call — same mechanism as the storefront layout), and exposes them as CSS
 * variables. Registered as an admin provider (payload.config), so this wraps the
 * whole panel including the login screen.
 *
 * The wrapper carries no layout box (display: contents) — it only defines the
 * font vars for its subtree; custom.scss reads them under `.nasteh-admin-fonts`.
 */
const golos = Golos_Text({
  subsets: ['cyrillic', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-golos',
  display: 'swap',
})

const mono = IBM_Plex_Mono({
  subsets: ['cyrillic', 'latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex',
  display: 'swap',
})

export function AdminFonts({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${golos.variable} ${mono.variable} nasteh-admin-fonts`} style={{ display: 'contents' }}>
      {children}
    </div>
  )
}
