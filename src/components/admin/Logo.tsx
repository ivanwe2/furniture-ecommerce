/**
 * Custom Payload admin logo — shown on the login screen and account view.
 * The Настех wordmark (same vector lockup as the storefront). The admin is
 * forced light (payload.config admin.theme), so the dark fill reads on the
 * cream panel.
 */
export function Logo() {
  // eslint-disable-next-line @next/next/no-img-element -- static brand asset in the Payload admin (outside the Next image pipeline)
  return <img src="/logos/nasteh-dark.svg" alt="Настех" style={{ height: '58px', width: 'auto' }} />
}
