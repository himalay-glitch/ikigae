/*
  Display lettering — a custom geometric face drawn to match the reference headline:
  open "3"-style B, crossbar-less A, chamfered C/G/N/O, slab I. Glyphs live on a
  100-unit cap height; horizontal strokes 15, vertical strokes 17. A thin round-join
  stroke in the fill colour softens every corner the way the reference type does.
  Each glyph is a list of [path, evenOdd?] entries.
*/
const G = {
  A: { w: 88, p: [['M0,100 L25,0 H63 L88,100 H71 L53,15 H35 L17,100 Z']] },
  B: { w: 80, p: [['M0,0 H72 L80,8 V41 L75,50 L80,59 V88 L68,100 H0 V85 H63 V57.5 H0 V42.5 H63 V15 H0 Z']] },
  C: { w: 76, p: [['M14,0 H76 V15 H20 L17,18 V82 L20,85 H76 V100 H14 L0,86 V14 Z']] },
  D: { w: 86, p: [['M0,0 H72 L86,14 V86 L72,100 H0 V85 H66 L69,82 V18 L66,15 H0 Z']] },
  E: { w: 76, p: [['M14,0 H76 V15 H20 L17,18 V42.5 H66 V57.5 H17 V82 L20,85 H76 V100 H14 L0,86 V14 Z']] },
  H: { w: 86, p: [['M0,0 H17 V42.5 H69 V0 H86 V100 H69 V57.5 H17 V100 H0 Z']] },
  G: { w: 86, p: [['M14,0 H86 V15 H20 L17,18 V82 L20,85 H69 V60 L77,52 H80 L86,58 V92 L78,100 H14 L0,86 V14 Z']] },
  I: { w: 76, p: [['M0,0 H76 V15 H0 Z'], ['M29.5,0 H46.5 V100 H29.5 Z'], ['M0,85 H76 V100 H0 Z']] },
  K: { w: 84, p: [['M0,0 H17 V100 H0 Z'], ['M17,40 L61,0 H84 L38,47 H17 Z'], ['M17,53 H38 L84,100 H61 L17,60 Z']] },
  L: { w: 72, p: [['M0,0 H17 V85 H72 V100 H0 Z']] },
  M: { w: 112, p: [['M0,100 L24,0 H42 L56,46 L70,0 H88 L112,100 H95 L79,24 L64,74 H48 L33,24 L17,100 Z']] },
  N: { w: 86, p: [['M0,14 L14,0 H80 L86,6 V100 H69 V15 H20 L17,18 V100 H0 Z']] },
  O: { w: 88, p: [['M14,0 H88 V86 L74,100 H0 V14 Z M20,15 L17,18 V85 H66 L71,80 V15 Z', true]] },
  P: { w: 82, p: [['M0,0 H74 L82,8 V52 L74,60 H17 V100 H0 Z M17,15 V45 H65 V15 Z', true]] },
  R: { w: 84, p: [['M0,0 H76 L84,8 V47 L76,55 H56 L84,100 H64 L38,55 H17 V100 H0 Z M17,15 V40 H67 V15 Z', true]] },
  S: { w: 80, p: [['M14,0 H80 V15 H20 L17,18 V42.5 H66 L80,56 V86 L66,100 H0 V85 H60 L63,82 V57.5 H14 L0,44 V14 Z']] },
  T: { w: 92, p: [['M0,0 H92 V15 H0 Z'], ['M37.5,0 H54.5 V100 H37.5 Z']] },
  U: { w: 86, p: [['M0,0 H17 V82 L20,85 H69 V0 H86 V86 L72,100 H14 L0,86 Z']] },
  W: { w: 112, p: [['M0,0 H17 L33,76 L48,26 H64 L79,76 L95,0 H112 L88,100 H70 L56,54 L42,100 H24 Z']] },
  F: { w: 76, p: [['M14,0 H76 V15 H20 L17,18 V42.5 H66 V57.5 H17 V100 H0 V14 Z']] },
  J: { w: 69, p: [['M52,0 H69 V86 L55,100 H0 V85 H49 L52,82 Z']] },
  Q: { w: 92, p: [['M14,0 H88 V86 L74,100 H0 V14 Z M20,15 L17,18 V85 H66 L71,80 V15 Z', true], ['M50,66 H68 L92,100 H74 Z']] },
  V: { w: 88, p: [['M0,0 L25,100 H63 L88,0 H71 L53,85 H35 L17,0 Z']] },
  X: { w: 88, p: [['M0,0 H20 L44,38 L68,0 H88 L54,50 L88,100 H68 L44,62 L20,100 H0 L34,50 Z']] },
  Z: { w: 80, p: [['M0,0 H80 V15 L24,85 H80 V100 H0 V85 L56,15 H0 Z']] },
  0: { w: 80, p: [['M14,0 H80 V86 L66,100 H0 V14 Z M20,15 L17,18 V85 H58 L63,80 V15 Z', true]] },
  2: { w: 80, p: [['M0,0 H66 L80,14 V57.5 H17 V85 H80 V100 H0 V42.5 H63 V18 L60,15 H0 Z']] },
  4: { w: 80, p: [['M0,0 H17 V50 H55 V0 H72 V50 H80 V65 H72 V100 H55 V65 H0 Z']] },
  5: { w: 80, p: [['M0,0 H80 V15 H17 V42.5 H66 L80,56 V86 L66,100 H0 V85 H60 L63,82 V57.5 H0 Z']] },
  6: { w: 80, p: [['M14,0 H80 V15 H20 L17,18 V42.5 H66 L80,56 V86 L66,100 H0 V14 Z M17,57.5 V85 H60 L63,82 V57.5 Z', true]] },
  7: { w: 80, p: [['M0,0 H80 V15 L40,100 H21 L60,15 H0 Z']] },
  8: { w: 80, p: [['M8,0 H72 L80,8 V41 L75,50 L80,59 V88 L68,100 H12 L0,88 V59 L5,50 L0,41 V8 Z M17,15 V42.5 H63 V15 Z M17,57.5 V85 H63 V57.5 Z', true]] },
  9: { w: 80, p: [['M14,0 H80 V86 L66,100 H0 V85 H63 V57.5 H14 L0,44 V14 Z M17,15 V42.5 H63 V15 Z', true]] },
  1: { w: 58, p: [['M4,16 L20,0 H37 V85 H56 V100 H4 V85 H20 V18 H4 Z']] },
  3: { w: 80, p: [['M0,0 H72 L80,8 V41 L75,50 L80,59 V88 L68,100 H0 V85 H63 V57.5 H14 V42.5 H63 V15 H0 Z']] },
  Y: { w: 88, p: [['M0,0 H19 L44,40 L69,0 H88 L52.5,55 V100 H35.5 V55 Z']] },
}

const TRACK = 24
const SPACE = 52

export function layout(text, track = TRACK) {
  let x = 0
  const items = []
  for (const ch of text.toUpperCase()) {
    if (ch === ' ') { x += SPACE; continue }
    const g = G[ch]
    if (!g) { x += SPACE; continue }
    items.push({ g, x })
    x += g.w + track
  }
  return { items, width: Math.max(0, x - track) }
}

export default function Display({ text, className = '', title, track }) {
  const { items, width } = layout(text, track)
  return (
    <svg
      className={`display ${className}`}
      viewBox={`-2 -2 ${width + 4} 104`}
      role="img"
      aria-label={title ?? text}
      preserveAspectRatio="xMinYMid meet"
    >
      {items.map(({ g, x }, i) => (
        <g key={i} transform={`translate(${x} 0)`}>
          {g.p.map(([d, eo], j) => (
            <path key={j} d={d} fillRule={eo ? 'evenodd' : 'nonzero'} />
          ))}
        </g>
      ))}
    </svg>
  )
}
