import { useEffect, useState } from 'react'

/*
  Light / dark switch. The theme lives on <html data-theme>; index.html sets it before first paint
  (saved choice, else the OS preference) so there's no flash. Everything themed reads CSS tokens;
  the WebGL pipes listen for the same attribute.
*/
const KEY = 'ikai-theme'
const META = { light: '#E4E4E4', dark: '#0D0E10' }

export function getTheme() {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

export default function ThemeToggle({ className = '' }) {
  const [theme, setTheme] = useState(() => (typeof document === 'undefined' ? 'light' : getTheme()))

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META[theme])
  }, [theme])

  const next = theme === 'dark' ? 'light' : 'dark'
  const toggle = () => {
    try { localStorage.setItem(KEY, next) } catch { /* private mode: keep it for this visit */ }
    setTheme(next)
  }

  return (
    <button type="button" className={`theme-toggle ${className}`} onClick={toggle} aria-label={`Switch to ${next} mode`} aria-pressed={theme === 'dark'}>
      <svg viewBox="0 0 24 24" aria-hidden="true" className="tt-icon">
        {/* sun rays fold away and the disc becomes a crescent in dark mode */}
        <g className="tt-rays" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <path key={a} d="M12 2.6v2.2" transform={`rotate(${a} 12 12)`} />
          ))}
        </g>
        <mask id="tt-moon">
          <rect width="24" height="24" fill="#fff" />
          <circle className="tt-bite" cx="17" cy="7" r="5.2" fill="#000" />
        </mask>
        <circle className="tt-disc" cx="12" cy="12" r="5" fill="currentColor" mask="url(#tt-moon)" />
      </svg>
    </button>
  )
}
