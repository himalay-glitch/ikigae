import { motion } from 'framer-motion'
import Display from './Display.jsx'
import { SectionGrid, Reveal, SectionTitle, Lane, HeadingPanel, ease } from './ui.jsx'
import { XLogo, LinkedIn } from './icons.jsx'

/* Placeholder team; swap names, roles and links for the real people. */
const TEAM = [
  { name: 'Aiko Tanaka', role: 'Managing Partner', init: 'AT', focus: 'Fund strategy · L1/L2' },
  { name: 'Ravi Menon', role: 'Head of Incubation', init: 'RM', focus: 'Product · AI' },
  { name: 'Lena Fischer', role: 'Tokenomics Lead', init: 'LF', focus: 'Token design · DeFi' },
  { name: 'Marcus Hale', role: 'Head of Growth', init: 'MH', focus: 'GTM · community' },
]

export default function Team() {
  return (
    <section id="team" className="sec sec-team drop-l" data-section="team" aria-labelledby="team-title">
      <SectionGrid rows={[160, 336, 736]} lines={[215, 506.5, 798, 1089.5]} />
      <Lane id="team" drop="l" />

      <HeadingPanel id="team-title" text="TEAM" className="tm-panel" />
      <SectionTitle className="tm-t" title={<>Operators,<br />not observers</>} sub="Builders backing builders" />
      <Reveal className="tm-copy" delay={0.1}>
        <p>Founders, engineers and growth leads who have shipped products through more than one market cycle.</p>
      </Reveal>

      <ul className="tm-grid">
        {TEAM.map((p, i) => (
          <motion.li
            key={p.name}
            className="tm-card"
            data-port="team"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-8% 0px' }}
            transition={{ duration: 0.8, ease, delay: i * 0.08 }}
          >
            <div className="tm-avatar" aria-hidden="true">
              <Display text={p.init} track={14} className="tm-init" />
              <span className="br br-tl" /><span className="br br-tr" /><span className="br br-bl" /><span className="br br-br" />
            </div>
            <h3 className="tm-name">{p.name}</h3>
            <p className="tm-role">{p.role}</p>
            <p className="tm-focus">{p.focus}</p>
            <span className="tm-links">
              <a href="#team" aria-label={`${p.name} on X`}><XLogo /></a>
              <a href="#team" aria-label={`${p.name} on LinkedIn`}><LinkedIn /></a>
            </span>
          </motion.li>
        ))}
      </ul>
    </section>
  )
}
