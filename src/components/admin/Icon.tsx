/**
 * Custom Payload admin icon — shown in the admin nav header (small).
 * Brand monogram replacing the default Payload mark.
 */
export function Icon() {
  return (
    <svg viewBox="0 0 44 44" width="26" height="26" aria-hidden="true">
      <circle cx="22" cy="22" r="19" fill="none" stroke="#6e7378" strokeWidth="2.6" />
      <path
        d="M16 13.5 V30.5 M28 13.5 V30.5 M16 22 H28"
        stroke="#8a6d3b"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
    </svg>
  )
}
