/*
  Wordmark — the hero's "IKIGAI / LABS" lettering, drawn as SVG to match the reference: wide,
  heavy geometric letters with round G, B and S, flat terminals, and a crossbar-less A that
  carries a small orange triangle. Cap height 100 units, stroke weight 22.
*/
const W = 22 // stroke weight
const GAP = 15
const GLYPHS = {
  I: { w: W, el: <path d={`M0,0 H${W} V100 H0 Z`} /> },
  K: { w: 92, el: <path d="M0,0 H22 V39 L60,0 H91 L44,47 L93,100 H62 L22,58 V100 H0 Z" /> },
  G: {
    w: 96,
    el: <path d="M80,21 A39,39 0 1 0 85,63 V52 H55" fill="none" stroke="currentColor" strokeWidth={W} strokeLinejoin="miter" />,
  },
  A: {
    w: 100,
    el: (
      <>
        <path d="M0,100 L36,0 H64 L100,100 H76 L50,27 L24,100 Z" />
        <path className="wm-accent" d="M37,100 L63,100 L50,65 Z" />
      </>
    ),
  },
  L: { w: 74, el: <path d="M0,0 H22 V78 H74 V100 H0 Z" /> },
  B: {
    w: 86,
    el: (
      <>
        <path d="M0,0 H22 V100 H0 Z" />
        <path d="M11,11 H52 A19.5,19.5 0 0 1 52,50 H11 M11,50 H55 A19.5,19.5 0 0 1 55,89 H11" fill="none" stroke="currentColor" strokeWidth={W} />
      </>
    ),
  },
  S: {
    w: 84,
    el: <path d="M80,22 C70,8 28,6 20,24 C12,42 32,47 50,50 C70,53 90,60 81,78 C72,95 26,95 12,79" fill="none" stroke="currentColor" strokeWidth={W} />,
  },
}

function Line({ text, className }) {
  let x = 0
  const items = [...text].map((ch, i) => {
    const g = GLYPHS[ch]
    const it = <g key={i} transform={`translate(${x} 0)`}>{g.el}</g>
    x += g.w + GAP
    return it
  })
  const width = x - GAP
  return (
    <svg className={className} viewBox={`-2 -2 ${width + 4} 104`} aria-hidden="true" preserveAspectRatio="xMinYMid meet">
      <g fill="currentColor">{items}</g>
    </svg>
  )
}

export default function Wordmark({ className = '' }) {
  return (
    <span className={`wordmark ${className}`} role="img" aria-label="Ikigai Labs">
      <Line text="IKIGAI" className="wm-line" />
      <Line text="LABS" className="wm-line" />
    </span>
  )
}
