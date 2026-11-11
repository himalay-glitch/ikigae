import { motion } from 'framer-motion'
import Display from './Display.jsx'
import { SectionGrid, Reveal, Lane, ease } from './ui.jsx'

/* Placeholder portfolio — fictional teams; swap for the real incubated projects. */
const PROJECTS = [
  { name: 'Sentra', tag: 'AI', line: 'Autonomous agents for on-chain research.', mark: 'ring' },
  { name: 'Fluxbridge', tag: 'Infra', line: 'Intent-based cross-chain liquidity.', mark: 'bridge' },
  { name: 'Gridmesh', tag: 'DePIN', line: 'Community-owned energy telemetry.', mark: 'grid' },
  { name: 'Orbitra', tag: 'L1/L2', line: 'A rollup tuned for real-time apps.', mark: 'orbit' },
  { name: 'Vaultline', tag: 'DeFi', line: 'Risk-scored vaults for treasuries.', mark: 'vault' },
  { name: 'Nimbus', tag: 'AI', line: 'Private inference with verifiable outputs.', mark: 'cloud' },
  { name: 'Pixelpay', tag: 'Payments', line: 'Stablecoin checkout for creators.', mark: 'pixel' },
  { name: 'Quanta', tag: 'DeFi', line: 'Structured yield, explained simply.', mark: 'quanta' },
]

/* placeholder split of the 13 projects by sector */
const SPLIT = [['AI', 4], ['DeFi', 3], ['DePIN', 2], ['L1/L2', 2], ['Infra', 1], ['Payments', 1]]

function Mark({ type }) {
  const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 6 }
  switch (type) {
    case 'ring': return <svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="22" {...s} /><circle cx="32" cy="32" r="7" fill="currentColor" /></svg>
    case 'bridge': return <svg viewBox="0 0 64 64"><path d="M6 44 Q32 8 58 44" {...s} /><path d="M6 44 H58 M20 44 V30 M32 44 V24 M44 44 V30" {...s} strokeWidth="4" /></svg>
    case 'grid': return <svg viewBox="0 0 64 64">{[0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => <rect key={`${r}${c}`} x={8 + c * 18} y={8 + r * 18} width="12" height="12" fill={(r + c) % 2 ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="3" />))}</svg>
    case 'orbit': return <svg viewBox="0 0 64 64"><ellipse cx="32" cy="32" rx="26" ry="10" {...s} strokeWidth="4" transform="rotate(-25 32 32)" /><circle cx="32" cy="32" r="9" fill="currentColor" /></svg>
    case 'vault': return <svg viewBox="0 0 64 64"><rect x="8" y="8" width="48" height="48" rx="8" {...s} /><circle cx="32" cy="32" r="10" {...s} strokeWidth="4" /><path d="M32 22 V16 M32 48 V42 M22 32 H16 M48 32 H42" {...s} strokeWidth="4" /></svg>
    case 'cloud': return <svg viewBox="0 0 64 64"><path d="M18 46 H48 a10 10 0 0 0 0-20 a14 14 0 0 0-27-3 a11 11 0 0 0-3 23 Z" {...s} strokeWidth="5" strokeLinejoin="round" /></svg>
    case 'pixel': return <svg viewBox="0 0 64 64"><path d="M10 10 H34 V22 H46 V34 H34 V54 H22 V34 H10 Z" fill="currentColor" /><rect x="44" y="44" width="10" height="10" fill="currentColor" /></svg>
    default: return <svg viewBox="0 0 64 64"><path d="M32 6 L56 20 V44 L32 58 L8 44 V20 Z" {...s} strokeLinejoin="round" /><path d="M32 6 V58 M8 20 L56 44 M56 20 L8 44" {...s} strokeWidth="2.5" /></svg>
  }
}

export default function Incubations() {
  return (
    <section className="sec sec-portfolio drop-l" id="portfolio" data-section="portfolio" aria-labelledby="portfolio-title">
      <SectionGrid rows={[160, 360, 740, 1120]} lines={[215, 506.5, 798, 1089.5]} />
      <Lane id="portfolio" drop="l" />

      <Reveal className="panel pf-panel">
        <h2 id="portfolio-title"><span className="bullet" aria-hidden="true" />Our Incubations</h2>
        <p>Thirteen teams and counting — from AI agents to DePIN networks, each backed from first commit to launch.</p>
      </Reveal>

      <Reveal className="pf-count" delay={0.1}>
        <span className="pf-count-label">All Projects</span>
        <Display text="13" className="pf-count-num" title="13" track={10} />
        <ul className="pf-split" aria-label="Projects by sector">
          {SPLIT.map(([k, n]) => (
            <li key={k}><span>{k}</span><span className="pf-split-bar" style={{ '--n': n }} /><span>{String(n).padStart(2, '0')}</span></li>
          ))}
        </ul>
      </Reveal>
      <a className="pf-arrow" href="#portfolio" aria-label="See all projects">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 8h11M8.5 3.5 13 8l-4.5 4.5" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
      </a>

      <ul className="pf-grid">
        {PROJECTS.map((p, i) => (
          <motion.li
            key={p.name}
            className="pf-card"
            data-port={i < 4 ? 'portfolio' : undefined}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-8% 0px' }}
            transition={{ duration: 0.8, ease, delay: (i % 4) * 0.08 }}
          >
            <a href="#portfolio">
              <span className="pf-index">{String(i + 1).padStart(2, '0')}</span>
              <span className="pf-tag">{p.tag}</span>
              <span className="pf-mark"><Mark type={p.mark} /></span>
              <span className="pf-name">{p.name}</span>
              <span className="pf-line">{p.line}</span>
              <span className="pf-go" aria-hidden="true">
                <svg viewBox="0 0 16 16"><path d="M2 8h11M8.5 3.5 13 8l-4.5 4.5" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
              </span>
            </a>
          </motion.li>
        ))}
      </ul>

      <div className="pf-more">
        <a className="pf-more-link" href="#portfolio">View all 13 projects</a>
      </div>
    </section>
  )
}
