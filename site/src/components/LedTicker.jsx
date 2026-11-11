import { useMemo } from 'react'
import { lineDots } from '../lib/font5.js'

/* A dot-matrix sign in the visor's visual language: lit dots over a faint matrix, scrolling. */
const SEGMENTS = [
  { text: 'Backing tomorrow ', color: '#FFF3EC' }, { text: '* ', color: '#FE6F22' },
  { text: 'Applications open - Q1 2027 ', color: '#FE6F22' }, { text: '* ', color: '#FFF3EC' },
  { text: '13 teams backed ', color: '#FFF3EC' }, { text: '* ', color: '#FE6F22' },
  { text: 'AI / DeFi / DePIN / L1-L2 ', color: '#FE6F22' }, { text: '* ', color: '#FFF3EC' },
]
const PAD = 2 // blank rows above and below the 7-row text

function Strip({ cols, dots, hidden }) {
  const rows = 7 + PAD * 2
  return (
    <svg className="led-strip" viewBox={`0 0 ${cols} ${rows}`} style={{ '--cols': cols }} aria-hidden={hidden || undefined} focusable="false">
      <defs>
        <pattern id="led-off" width="1" height="1" patternUnits="userSpaceOnUse">
          <circle cx="0.5" cy="0.5" r="0.3" fill="rgba(255,214,220,0.09)" />
        </pattern>
      </defs>
      <rect width={cols} height={rows} fill="url(#led-off)" />
      {dots.map((d, i) => (
        <circle key={i} cx={d.c + 0.5} cy={d.r + PAD + 0.5} r="0.38" fill={d.color} />
      ))}
    </svg>
  )
}

export default function LedTicker({ className = '', style }) {
  const line = useMemo(() => lineDots(SEGMENTS), [])
  const label = SEGMENTS.map((s) => s.text).join('').replace(/\*/g, '·')
  return (
    <div className={`led ${className}`} style={style} role="marquee" aria-label={label}>
      <div className="led-track">
        <Strip {...line} />
        <Strip {...line} hidden />
      </div>
    </div>
  )
}
