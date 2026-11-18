/*
  Tiny isometric line-art renderer for the feature-card icons (matches the reference's
  white extruded shapes with dark outlines). Each box is [x, y, z, w, d, h] in grid units.
*/
const C = Math.cos(Math.PI / 6)
const S = 0.5

const P = (x, y, z) => [(x - y) * C, (x + y) * S - z]

function faces([x, y, z, w, d, h, tone]) {
  // tone 'a' = the accent block in a scene (the one element that carries the meaning)
  const f = tone === 'a' ? ['var(--iso-a1)', 'var(--iso-a2)', 'var(--iso-a3)'] : ['var(--iso-1)', 'var(--iso-2)', 'var(--iso-3)']
  return [
    // left (+y) face
    { pts: [P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)], fill: f[0] },
    // right (+x) face
    { pts: [P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)], fill: f[1] },
    // top
    { pts: [P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)], fill: f[2] },
  ]
}

/* painter's order: anything resting on top of a box draws after it; otherwise front-most last */
function paintOrder(a, b) {
  const eps = 1e-6
  const overlapXY = a[0] < b[0] + b[3] - eps && b[0] < a[0] + a[3] - eps && a[1] < b[1] + b[4] - eps && b[1] < a[1] + a[4] - eps
  if (overlapXY) {
    if (a[2] >= b[2] + b[5] - eps) return 1
    if (b[2] >= a[2] + a[5] - eps) return -1
  }
  return (a[0] + a[3] / 2 + a[1] + a[4] / 2 + a[2]) - (b[0] + b[3] / 2 + b[1] + b[4] / 2 + b[2])
}

/* each box is its own <g> (b0, b1… in spec order, accent = .iso-acc) so scenes can animate per block */
export function IsoIcon({ boxes, label, scene }) {
  const items = boxes.map((b, i) => ({ b, i })).sort((p, q) => paintOrder(p.b, q.b))
  const all = items.flatMap(({ b }) => faces(b)).flatMap((p) => p.pts)
  const xs = all.map((p) => p[0]); const ys = all.map((p) => p[1])
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys)
  const pad = 0.6 // room for blocks that move on hover
  return (
    <svg
      className={`iso ${scene ? `iso-scene-${scene}` : ''}`}
      viewBox={`${minX - pad} ${minY - pad * 2} ${maxX - minX + pad * 2} ${maxY - minY + pad * 3}`}
      role="img"
      aria-label={label}
    >
      {items.map(({ b, i }) => (
        <g key={i} className={`iso-b b${i}${b[6] === 'a' ? ' iso-acc' : ''}`} style={{ '--i': i }}>
          {faces(b).map((p, k) => (
            <polygon key={k} points={p.pts.map((q) => q.join(',')).join(' ')} style={{ fill: p.fill }} />
          ))}
        </g>
      ))}
    </svg>
  )
}

const range = (n) => Array.from({ length: n }, (_, i) => i)

export const ICONS = {
  incubation: [
    [0, 2.2, 0, 6, 1.4, 1.1],
    [2.3, 0, 0.55, 1.4, 5.2, 1.1],
    [2.3, 0.4, 1.65, 1.4, 1.4, 0.8],
  ],
  stairs: [
    ...range(5).map((i) => [0, (4 - i) * 0.85, 0, 2.6, 0.85, (i + 1) * 0.62]),
    [2.6, 0, 0, 0.7, 4.25, 3.1],
  ],
  pyramid: range(5).map((i) => {
    const s = 4.2 - i * 0.8
    return [(4.2 - s) / 2, (4.2 - s) / 2, i * 0.62, s, s, 0.62]
  }),
  coins: range(4).map((i) => [0, 0, i * 0.55, 3, 3, 0.45]).concat([[3.4, 0.6, 0, 2, 2, 0.45], [3.4, 0.6, 0.55, 2, 2, 0.45]]),
  launch: [
    [0, 0, 0, 4.4, 1.2, 1],
    [3.2, 0, 1, 1.2, 1.2, 2.4],
    [2.6, -0.6, 3.4, 2.4, 2.4, 0.5],
  ],
  shield: [
    [0, 0, 0, 3.2, 0.9, 3.6],
    [0.6, 0.9, 0, 2, 0.6, 2.6],
    [1.2, 1.5, 0, 0.8, 0.5, 1.6],
  ],
  community: [
    [0, 0, 0, 1.6, 1.6, 1.6],
    [2.4, 0, 0, 1.6, 1.6, 1.6],
    [1.2, 2.2, 0, 1.6, 1.6, 1.6],
    [1.2, 0.8, 1.6, 1.6, 1.6, 1.6],
  ],
}

/* flat "dollar in a selection box" (not isometric in the reference either) */
export function DollarSelect({ label = 'Fundraise management' }) {
  const handles = [[10, 10], [50, 10], [90, 10], [10, 50], [90, 50], [10, 90], [50, 90], [90, 90]]
  return (
    <svg className="iso" viewBox="0 0 100 100" role="img" aria-label={label}>
      <rect x="10" y="10" width="80" height="80" fill="none" style={{ stroke: 'var(--iso-stroke)' }} strokeWidth="1.4" />
      <path
        d="M63 33 H44 a6 6 0 0 0 0 12 H56 a6 6 0 0 1 0 12 H37 M50 26 V33 M50 57 V64"
        fill="none" style={{ stroke: 'var(--iso-stroke)' }} strokeWidth="6.5" strokeLinecap="square" strokeLinejoin="miter"
      />
      <path
        d="M63 33 H44 a6 6 0 0 0 0 12 H56 a6 6 0 0 1 0 12 H37 M50 26 V33 M50 57 V64"
        fill="none" style={{ stroke: 'var(--iso-3)' }} strokeWidth="3.8" strokeLinecap="square" strokeLinejoin="miter"
      />
      {handles.map(([x, y]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r="4.2" style={{ fill: 'var(--iso-3)', stroke: 'var(--iso-stroke)' }} strokeWidth="1.4" />
      ))}
    </svg>
  )
}

/* scenes for IKAI's story (Why IKAI) — one accent block carries each line's meaning */
export const STORY = {
  // most ideas die before launch day: the climb stops at a gap; the launch tower is out of reach
  gap: [
    // steps climb away from the viewer (−y), then a clear gap before the tower
    ...range(3).map((i) => [0, 3.2 - i * 1.4, 0, 2, 1.4, 0.75 * (i + 1)]),
    [0, -2.6, 0, 2, 1.4, 4.3, 'a'],
  ],
  // built on instinct, not on evidence: a heavy slab balanced on one thin post
  instinct: [
    [1.45, 1.45, 0, 0.6, 0.6, 3.2],
    [0, 0, 3.2, 3.5, 3.5, 1.35, 'a'],
  ],
  // six months lost to one rebuild: six months as dominoes — the last two have fallen
  rebuild: [
    ...range(4).map((i) => [i * 1.25, 0, 0, 0.45, 2.4, 2.6]),
    [5.2, 0, 0, 2.6, 2.4, 0.42, 'a'], [5.2, 0, 0.42, 2.6, 2.4, 0.42, 'a'],
  ],
  // prove the idea, then build it: the small proven model beside the full-size build
  prove: [
    [0, 1.9, 0, 1.1, 1.1, 1.1, 'a'],
    [2.6, 0, 0, 3, 3, 3],
  ],
}

/* scenes for the four phases (How it works) */
export const PHASES = {
  // validate: of nine candidate ideas, one rises
  validate: [
    ...range(9).filter((i) => i !== 4).map((i) => [(i % 3) * 1.3, Math.floor(i / 3) * 1.3, 0, 1.05, 1.05, 0.35]),
    [1.3, 1.3, 0, 1.05, 1.05, 2, 'a'],
  ],
  // position: a crowded row, one block stands out
  position: [
    ...[0, 1, 3, 4].map((i) => [i * 1.25, 0, 0, 1, 1.4, 1.3]),
    [2.5, 0, 0, 1, 1.4, 3, 'a'],
  ],
  // design: stacked interface layers with a component on top
  design: [
    [0, 0, 0, 4, 3, 0.28], [0, 0, 1.05, 4, 3, 0.28], [0, 0, 2.1, 4, 3, 0.28],
    [0.55, 0.55, 2.38, 1.6, 0.8, 0.5, 'a'],
  ],
  // launch: a tower on its pad with two boosters
  launch: [
    [0, 0, 0, 4, 4, 0.4],
    [0.75, 1.75, 0.4, 0.6, 0.6, 1.5], [1.75, 0.75, 0.4, 0.6, 0.6, 1.5],
    [1.45, 1.45, 0.4, 1.1, 1.1, 3.8, 'a'],
  ],
}
