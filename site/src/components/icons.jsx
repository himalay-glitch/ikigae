export const LogoMark = (p) => (
  <svg viewBox="0 0 48 48" {...p} aria-hidden="true">
    <rect x="3" y="3" width="42" height="42" rx="11" style={{ fill: 'var(--accent)' }} />
    <rect x="10.5" y="10.5" width="27" height="27" rx="5.5" style={{ fill: 'var(--bg)' }} />
    <circle cx="19" cy="25" r="3.1" style={{ fill: 'var(--ink)' }} />
    <circle cx="29" cy="25" r="3.1" style={{ fill: 'var(--ink)' }} />
  </svg>
)

export const EcosystemDots = (p) => (
  <svg viewBox="0 0 12 12" {...p} aria-hidden="true">
    {[[1, 1], [8, 1], [1, 8], [8, 8]].map(([x, y]) => (
      <rect key={`${x}${y}`} x={x} y={y} width="3" height="3" style={{ fill: 'var(--accent)' }} />
    ))}
  </svg>
)

export const Cross = (p) => (
  <svg viewBox="0 0 20 20" {...p} aria-hidden="true">
    <path d="M3 3 L17 17 M17 3 L3 17" stroke="currentColor" strokeWidth="1.2" fill="none" />
  </svg>
)

export const Target = (p) => (
  <svg viewBox="0 0 20 20" {...p} aria-hidden="true">
    <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1" fill="none" />
    <circle cx="10" cy="10" r="2.6" fill="currentColor" />
  </svg>
)

export const XLogo = (p) => (
  <svg viewBox="0 0 24 24" {...p} aria-hidden="true">
    <rect x="2.75" y="2.75" width="18.5" height="18.5" rx="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <path fill="currentColor" d="M15.1 7h1.75l-3.82 4.37L17.5 17h-3.52l-2.75-3.6L8.08 17H6.33l4.08-4.67L6.1 7h3.6l2.5 3.29L15.1 7Zm-.61 9.02h.97L9.13 7.93H8.09l6.4 8.09Z" />
  </svg>
)

export const Telegram = (p) => (
  <svg viewBox="0 0 24 24" {...p} aria-hidden="true">
    <path fill="currentColor" d="M21.6 3.2 2.9 10.4c-1.3.5-1.2 1.3-.2 1.6l4.8 1.5 1.8 5.6c.2.6.4.8.9.8.4 0 .6-.2.9-.4l2.3-2.2 4.8 3.5c.9.5 1.5.2 1.7-.8l3.1-14.7c.3-1.3-.5-1.9-1.4-1.5ZM9.4 13.3l9.3-5.9c.4-.3.8-.1.5.2l-7.8 7-.3 3.4-1.7-4.7Z" />
  </svg>
)

export const Medium = (p) => (
  <svg viewBox="0 0 24 24" {...p} aria-hidden="true">
    <path fill="currentColor" d="M2 5.5h3.4l6.6 13 6-13H22v.6l-1.6 1.5v10.8l1.6 1.5v.6h-6.6v-.6l1.7-1.6V9.5l-5.5 12h-.6L4.8 9.4v8.1l2.1 2.5v.5H2V20l2.1-2.5V7.6L2 6V5.5Z" />
  </svg>
)

export const LinkedIn = (p) => (
  <svg viewBox="0 0 24 24" {...p} aria-hidden="true">
    <rect x="2.75" y="2.75" width="18.5" height="18.5" rx="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <path fill="currentColor" d="M7.4 10.2h2v6.6h-2v-6.6Zm1-3.1a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3ZM10.75 10.2h1.9v.9c.3-.55 1-1.08 2.05-1.08 2.08 0 2.45 1.36 2.45 3.13v3.65h-1.98v-3.2c0-.78-.02-1.76-1.07-1.76-1.08 0-1.25.84-1.25 1.7v3.26h-2.1v-6.6Z" />
  </svg>
)

export const Instagram = (p) => (
  <svg viewBox="0 0 24 24" {...p} aria-hidden="true">
    <rect x="2.75" y="2.75" width="18.5" height="18.5" rx="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="17.4" cy="6.6" r="1.25" fill="currentColor" />
  </svg>
)

export const Chevron = ({ dir = 'right', ...p }) => (
  <svg viewBox="0 0 16 16" {...p} aria-hidden="true">
    <path
      d={dir === 'right' ? 'M5.5 2.5 11 8l-5.5 5.5' : 'M10.5 2.5 5 8l5.5 5.5'}
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
      strokeLinecap="square"
    />
  </svg>
)

/* Placeholder partner marks — fictional names; swap for real partner logos. */
export const PARTNERS = [
  {
    name: 'Nodera',
    icon: (
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <circle cx="20" cy="20" r="15" fill="none" stroke="currentColor" strokeWidth="6" />
        <rect x="17" y="2" width="6" height="12" style={{ fill: 'var(--panel)' }} />
      </svg>
    ),
  },
  {
    name: 'Vantix',
    icon: (
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <path d="M4 6h32L20 36Z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
        <path d="M4 6l16 11L36 6M20 17v19" fill="none" stroke="currentColor" strokeWidth="2.4" />
      </svg>
    ),
  },
  {
    name: 'Hexa',
    caps: true,
    icon: (
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <path d="M20 3 35 11.5v17L20 37 5 28.5v-17Z" fill="currentColor" />
        <path d="M20 12 27.5 16.3v8.4L20 29l-7.5-4.3v-8.4Z" style={{ fill: 'var(--panel)' }} />
        <path d="M20 17.5 23 19.2v3.5L20 24.5 17 22.7v-3.5Z" fill="currentColor" />
      </svg>
    ),
  },
  {
    name: 'Kubit',
    display: true,
  },
  {
    name: 'Lumen',
    icon: (
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <circle cx="20" cy="20" r="7" fill="currentColor" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <rect key={a} x="18.5" y="2" width="3" height="7" fill="currentColor" transform={`rotate(${a} 20 20)`} />
        ))}
      </svg>
    ),
  },
  {
    name: 'Arcway',
    icon: (
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <path d="M5 33a15 15 0 0 1 30 0" fill="none" stroke="currentColor" strokeWidth="5" />
        <path d="M13 33a7 7 0 0 1 14 0" fill="none" stroke="currentColor" strokeWidth="5" />
      </svg>
    ),
  },
]
