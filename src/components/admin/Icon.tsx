/**
 * Custom Payload admin icon - the Настех badge (graphite disc, bold "Н",
 * brass diagonal swoosh), matching the storefront logo.
 */
export function Icon() {
  return (
    <svg viewBox="0 0 64 64" width="26" height="26" aria-hidden="true">
      <defs>
        <clipPath id="nasteh-admin-badge">
          <circle cx="32" cy="32" r="30" />
        </clipPath>
      </defs>
      <circle cx="32" cy="32" r="30" fill="#35332d" />
      <g clipPath="url(#nasteh-admin-badge)">
        <rect x="-8" y="36" width="80" height="13.5" rx="6.5" fill="#8a6d3b" transform="rotate(-38 32 32)" />
      </g>
      <g stroke="#f4f0e6" strokeWidth="6.4" strokeLinecap="round">
        <line x1="22" y1="19" x2="22" y2="45" />
        <line x1="42" y1="19" x2="42" y2="45" />
        <line x1="22" y1="32" x2="42" y2="32" />
      </g>
    </svg>
  )
}
