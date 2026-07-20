/**
 * Custom Payload admin icon — the small brand mark in the nav / app header.
 * The Настех wordmark (same vector lockup as the storefront), matching the
 * login Logo. The admin is forced light, so the dark fill reads on the panel.
 */
export function Icon() {
  // eslint-disable-next-line @next/next/no-img-element -- static brand asset in the Payload admin (outside the Next image pipeline)
  return <img src="/logos/nasteh-dark.svg" alt="Настех" style={{ height: '22px', width: 'auto' }} />
}
