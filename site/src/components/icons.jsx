export const LogoMark = (p) => (
  <svg viewBox="0 0 48 48" {...p} aria-hidden="true">
    <rect x="3" y="3" width="42" height="42" rx="11" fill="#FE6F22" />
    <rect x="10.5" y="10.5" width="27" height="27" rx="5.5" fill="#E4E4E4" />
    <circle cx="19" cy="25" r="3.1" fill="#1B1B1B" />
    <circle cx="29" cy="25" r="3.1" fill="#1B1B1B" />
  </svg>
)

export const EcosystemDots = (p) => (
  <svg viewBox="0 0 12 12" {...p} aria-hidden="true">
    {[[1, 1], [8, 1], [1, 8], [8, 8]].map(([x, y]) => (
      <rect key={`${x}${y}`} x={x} y={y} width="3" height="3" fill="#FE6F22" />
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
    <path fill="currentColor" d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.77L17.75 3Zm-1.08 16.2h1.7L7.4 4.73H5.58L16.67 19.2Z" />
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
    <rect x="2" y="2" width="20" height="20" rx="3" fill="currentColor" />
    <path fill="#F6F6F6" d="M6.3 9.6h2.5V18H6.3V9.6Zm1.3-4a1.4 1.4 0 1 1 0 2.9 1.4 1.4 0 0 1 0-2.9ZM10.4 9.6h2.4v1.2c.4-.7 1.2-1.4 2.6-1.4 2.6 0 3.1 1.7 3.1 4V18H16v-4c0-1 0-2.2-1.3-2.2-1.4 0-1.6 1-1.6 2.1V18h-2.6V9.6Z" />
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
        <rect x="17" y="2" width="6" height="12" fill="#F6F6F6" />
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
        <path d="M20 12 27.5 16.3v8.4L20 29l-7.5-4.3v-8.4Z" fill="#F6F6F6" />
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
