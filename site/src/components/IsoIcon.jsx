/*
  Tiny isometric line-art renderer for the feature-card icons (matches the reference's
  white extruded shapes with dark outlines). Each box is [x, y, z, w, d, h] in grid units.
*/
const C = Math.cos(Math.PI / 6)
const S = 0.5

const P = (x, y, z) => [(x - y) * C, (x + y) * S - z]

function faces([x, y, z, w, d, h]) {
  return [
    // left (+y) face
    { pts: [P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)], fill: '#ECECEE' },
    // right (+x) face
    { pts: [P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)], fill: '#DEDEE1' },
    // top
    { pts: [P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)], fill: '#FFFFFF' },
  ]
}

export function IsoIcon({ boxes, label }) {
  const sorted = [...boxes].sort((a, b) => (a[0] + a[3] / 2 + a[1] + a[4] / 2 + a[2]) - (b[0] + b[3] / 2 + b[1] + b[4] / 2 + b[2]))
  const polys = sorted.flatMap(faces)
  const all = polys.flatMap((p) => p.pts)
  const xs = all.map((p) => p[0]); const ys = all.map((p) => p[1])
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys)
  const pad = 0.35
  return (
    <svg
      className="iso"
      viewBox={`${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`}
      role="img"
      aria-label={label}
    >
      {polys.map((p, i) => (
        <polygon key={i} points={p.pts.map((q) => q.join(',')).join(' ')} fill={p.fill} />
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
      <rect x="10" y="10" width="80" height="80" fill="none" stroke="#3A3A3A" strokeWidth="1.4" />
      <path
        d="M63 33 H44 a6 6 0 0 0 0 12 H56 a6 6 0 0 1 0 12 H37 M50 26 V33 M50 57 V64"
        fill="none" stroke="#3A3A3A" strokeWidth="6.5" strokeLinecap="square" strokeLinejoin="miter"
      />
      <path
        d="M63 33 H44 a6 6 0 0 0 0 12 H56 a6 6 0 0 1 0 12 H37 M50 26 V33 M50 57 V64"
        fill="none" stroke="#FFFFFF" strokeWidth="3.8" strokeLinecap="square" strokeLinejoin="miter"
      />
      {handles.map(([x, y]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r="4.2" fill="#FFFFFF" stroke="#3A3A3A" strokeWidth="1.4" />
      ))}
    </svg>
  )
}
