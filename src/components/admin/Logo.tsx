/**
 * Custom Payload admin logo — shown on the login screen and account view.
 * Replaces the default Payload wordmark. Colors use the brand brass plus
 * Payload's theme elevation vars so the subtitle adapts to light/dark.
 */
export function Logo() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px', lineHeight: 1 }}>
      <span style={{ fontSize: '38px', fontWeight: 700, letterSpacing: '0.14em', color: '#8a6d3b' }}>
        НАСТЕХ
      </span>
      <span
        style={{
          fontSize: '12px',
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color: 'var(--theme-elevation-600, #6e7378)',
        }}
      >
        мебелен обков
      </span>
    </div>
  )
}
