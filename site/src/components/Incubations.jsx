import { motion } from 'framer-motion'
import Display from './Display.jsx'
import { SectionGrid, Reveal, Lane, ease } from './ui.jsx'
import { CALL } from '../lib/site.js'

/* Deliverables (content: ikai.digital) — what every founder receives, with the tags IKAI uses. */
const ITEMS = [
  { name: 'Research report', tag: 'Scan', line: 'Comprehensive market & user insights.', mark: 'scan', phase: 'Validate' },
  { name: 'Brand strategy', tag: 'Position', line: 'Identity, positioning & messaging.', mark: 'position', phase: 'Position' },
  { name: 'UI/UX design', tag: 'UI 01', line: 'Beautiful, functional interfaces.', mark: 'ui', phase: 'Design' },
  { name: 'Interactive prototype', tag: 'Tap to try', line: 'High-fidelity, clickable prototype.', mark: 'tap', phase: 'Design' },
  { name: 'Design system', tag: 'Tokens · 24', line: 'Reusable components & guidelines.', mark: 'tokens', phase: 'Design' },
  { name: 'Go-to-market plan', tag: 'Launch', line: 'Launch strategy & growth roadmap.', mark: 'launch', phase: 'Launch' },
  { name: 'Pitch deck support', tag: '12 slides', line: 'Investor-ready presentation.', mark: 'deck', phase: 'Launch' },
  { name: 'Product roadmap', tag: '12 months', line: '12‑month development timeline.', mark: 'roadmap', phase: 'Launch' },
]
const PHASES = ['Validate', 'Position', 'Design', 'Launch'].map((p) => [p, ITEMS.filter((it) => it.phase === p).length])

/* mini-screens for each deliverable — 120×80 grid, 1.5px non-scaling stroke, one accent each.
   .an-* parts animate while the card is hovered or the robot is overhead (sections.css → hover motion) */
function Mark({ type }) {
  const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', vectorEffect: 'non-scaling-stroke' }
  const a = { ...s, className: 'ic-a' }
  const faint = { ...s, opacity: 0.35 }
  const fillBg = { fill: 'var(--pf-bg)' } // stacked slides hide the ones behind
  switch (type) {
    // radar: the sweep turns, blips ping
    case 'scan': return (
      <svg viewBox="0 0 120 80">
        <path d="M30 40h60M60 10v60" {...faint} />
        <circle cx="60" cy="40" r="30" {...s} /><circle cx="60" cy="40" r="20" {...s} strokeDasharray="2 3" /><circle cx="60" cy="40" r="10" {...s} />
        <g className="an-sweep"><path d="M60 40 84.3 22.4A30 30 0 0 1 90 40Z" className="ic-af" opacity="0.16" /><path d="M60 40 84.3 22.4" {...a} /></g>
        <circle cx="77" cy="31" r="2.4" className="ic-af an-ping" /><circle cx="47" cy="53" r="1.8" fill="currentColor" className="an-ping" style={{ '--i': 2 }} /><circle cx="68" cy="58" r="1.5" fill="currentColor" opacity="0.6" className="an-ping" style={{ '--i': 4 }} />
      </svg>
    )
    // positioning: the two circles slide into alignment
    case 'position': return (
      <svg viewBox="0 0 120 80">
        <path d="M60 20.4A22 22 0 0 1 60 59.6 22 22 0 0 1 60 20.4Z" className="ic-af an-lensfill" opacity="0.18" />
        <circle cx="50" cy="40" r="22" {...s} className="an-slide-r" /><circle cx="70" cy="40" r="22" {...s} className="an-slide-l" />
        <path d="M60 10v6M60 64v6" {...faint} /><circle cx="60" cy="40" r="2.8" className="ic-af an-pulse" />
      </svg>
    )
    // wireframe: blocks build in, the primary button pulses
    case 'ui': return (
      <svg viewBox="0 0 120 80">
        <rect x="14" y="10" width="92" height="60" rx="3" {...s} /><path d="M14 19h92" {...s} />
        {[19, 23, 27].map((x) => <circle key={x} cx={x} cy="14.5" r="1.1" fill="currentColor" />)}
        <g className="an-build" style={{ '--i': 0 }}><rect x="20" y="25" width="18" height="39" rx="1.5" {...s} /><path d="M24 31h10M24 37h7M24 43h9" {...faint} /></g>
        <g className="an-build" style={{ '--i': 1 }}><rect x="44" y="25" width="56" height="20" rx="1.5" {...s} /><path d="M50 31h26" {...s} /></g>
        <rect x="50" y="36" width="16" height="5" rx="2.5" className="ic-af an-pulse" />
        <rect x="44" y="50" width="26" height="14" rx="1.5" {...s} className="an-build" style={{ '--i': 2 }} /><rect x="74" y="50" width="26" height="14" rx="1.5" {...s} className="an-build" style={{ '--i': 3 }} />
      </svg>
    )
    // prototype: the tap ripples out
    case 'tap': return (
      <svg viewBox="0 0 120 80">
        <rect x="42" y="6" width="36" height="68" rx="6" {...s} /><path d="M55 11h10" {...s} />
        <rect x="49" y="30" width="22" height="11" rx="5.5" {...s} />
        <circle cx="65.5" cy="35.5" r="8.5" {...a} opacity="0.4" className="ic-a an-ripple" /><circle cx="65.5" cy="35.5" r="13.5" {...a} opacity="0.18" className="ic-a an-ripple" style={{ '--i': 1 }} />
        <circle cx="65.5" cy="35.5" r="3.6" className="ic-af an-knob" />
        <path d="M50 52h20M50 58h13" {...faint} />
      </svg>
    )
    // design system: the token scale waves
    case 'tokens': return (
      <svg viewBox="0 0 120 80">
        {[0, 1, 2, 3, 4, 5].map((i) => <circle key={`c${i}`} cx={25 + i * 14} cy="20" r="4.2" fill="currentColor" opacity={0.15 + i * 0.17} className="an-wave" style={{ '--i': i }} />)}
        {[0, 1, 2, 3, 4, 5].map((i) => <rect key={`a${i}`} x={21 + i * 14} y="36" width="8" height="8" rx="2" className="ic-af an-wave" opacity={0.18 + i * 0.164} style={{ '--i': i + 1 }} />)}
        {[0, 1, 2, 3, 4, 5].map((i) => <rect key={`o${i}`} x={21 + i * 14} y="56" width="8" height="8" rx={i % 2 ? 4 : 1} {...s} className="an-wave" style={{ '--i': i + 2 }} />)}
      </svg>
    )
    // go-to-market: the growth curve draws, the launch point pings
    case 'launch': return (
      <svg viewBox="0 0 120 80">
        <path d="M16 66h90M16 66V12" {...s} opacity="0.55" /><path d="M16 48h90M16 30h90" {...faint} strokeDasharray="2 3" />
        <path d="M18 62c22-2 34-10 44-20s24-24 40-28" {...s} className="an-draw" />
        <path d="M62 66V42" {...a} strokeDasharray="2 2.5" /><circle cx="62" cy="42" r="3.2" className="ic-af an-ping" />
        <circle cx="102" cy="14" r="2.4" fill="currentColor" className="an-tip" />
      </svg>
    )
    // pitch deck: the slides fan out, the key bar grows
    case 'deck': return (
      <svg viewBox="0 0 120 80">
        <rect x="32" y="8" width="64" height="40" rx="2" {...s} opacity="0.4" className="an-fan" style={{ '--i': 2 }} />
        <rect x="26" y="14" width="64" height="40" rx="2" {...s} {...fillBg} opacity="0.7" className="an-fan" style={{ '--i': 1 }} />
        <rect x="20" y="20" width="64" height="40" rx="2" {...s} {...fillBg} />
        <path d="M27 28h24" {...s} /><path d="M32 53v-7M40 53v-11M48 53v-5" {...s} /><path d="M56 53V38" {...a} className="ic-a an-grow" />
      </svg>
    )
    // roadmap: progress fills to "now", which pulses
    default: return (
      <svg viewBox="0 0 120 80" className="pf-svg">
        <path d="M12 42h96" {...s} opacity="0.5" /><path d="M12 42h45" {...a} className="ic-a an-fill" />
        {[12, 42, 72, 102].map((x, i) => <g key={x}><path d={`M${x} 38v8`} {...s} /><text x={x} y="60" textAnchor="middle" className="pf-svg-t">Q{i + 1}</text></g>)}
        <path d="M27 36.5 32.5 42 27 47.5 21.5 42Z" fill="currentColor" />
        <path d="M57 35.5 63.5 42 57 48.5 50.5 42Z" className="ic-af an-pulse" />
        <path d="M87 36.5 92.5 42 87 47.5 81.5 42Z" {...s} />
      </svg>
    )
  }
}

export default function Incubations() {
  return (
    <section className="sec sec-portfolio drop-l" id="deliverables" data-section="portfolio" aria-labelledby="deliverables-title">
      <SectionGrid rows={[160, 360, 740, 1120]} lines={[215, 506.5, 798, 1089.5]} />
      <Lane id="portfolio" drop="l" index="04" label="Deliverables" />

      <Reveal className="panel pf-panel">
        <h2 id="deliverables-title"><span className="bullet" aria-hidden="true" />What you receive</h2>
        <p>Complete deliverables that set your product up for success — from the first research insight to the deck you raise with.</p>
      </Reveal>

      <Reveal className="pf-count" delay={0.1}>
        <span className="pf-count-label">Deliverables</span>
        <Display text="08" className="pf-count-num" title="8" track={10} />
        <ul className="pf-split" aria-label="Deliverables by phase">
          {PHASES.map(([k, n]) => (
            <li key={k}><span>{k}</span><span className="pf-split-bar" style={{ '--n': n }} /><span>{String(n).padStart(2, '0')}</span></li>
          ))}
        </ul>
      </Reveal>

      <ul className="pf-grid">
        {ITEMS.map((p, i) => (
          <motion.li
            key={p.name}
            className="pf-card"
            data-port={i < 4 ? 'portfolio' : undefined}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-8% 0px' }}
            transition={{ duration: 0.8, ease, delay: (i % 4) * 0.08 }}
          >
            <div className="pf-in">
              <span className="pf-index">{String(i + 1).padStart(2, '0')}</span>
              <span className="pf-tag">{p.tag}</span>
              <span className="pf-tile" aria-hidden="true"><Mark type={p.mark} /></span>
              <h3 className="pf-name">{p.name}</h3>
              <p className="pf-line">{p.line}</p>
            </div>
          </motion.li>
        ))}
      </ul>

      <div className="pf-more">
        <a className="pf-more-link" href={CALL}>Get all eight — schedule a call</a>
      </div>
    </section>
  )
}
