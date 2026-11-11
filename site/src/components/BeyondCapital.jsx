import { motion } from 'framer-motion'
import Display from './Display.jsx'
import { SectionGrid, Brackets, Reveal, SectionTitle, FeatureCard, Lane, HeadingPanel, ease } from './ui.jsx'
import { IsoIcon, ICONS } from './IsoIcon.jsx'

const SECTORS = ['AI', 'DeFi', 'DePIN', 'L1/L2']
/* placeholder figures, consistent with the rest of the page */
const FACTS = [['13', 'Teams backed'], ['04', 'Sectors'], ['12', 'Week program']]

function Check() {
  return (
    <svg className="check" viewBox="0 0 20 16" aria-hidden="true">
      <path d="M1.5 8.5 7 13.5 18.5 2" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="square" />
    </svg>
  )
}

export default function BeyondCapital() {
  return (
    <section id="programs" className="sec sec-beyond" data-section="programs" aria-labelledby="beyond-title">
      <SectionGrid rows={[160, 336, 496]} lines={[348.5, 640, 931.5, 1223]} />
      <Lane id="programs" drop="r" />

      <HeadingPanel id="beyond-title" text="BEYOND CAPITAL" className="bc-panel" />
      <dl className="bc-facts">
        {FACTS.map(([n, label], i) => (
          <motion.div
            key={label}
            className="bc-fact"
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10% 0px' }}
            transition={{ duration: 0.8, ease, delay: 0.1 + i * 0.08 }}
          >
            <dt>{label}</dt>
            <dd><Display text={n} title={n} track={10} className="bc-fact-num" /></dd>
          </motion.div>
        ))}
      </dl>

      <SectionTitle className="bc-t1" title={<>Supercharging Web3<br />Builders</>} />
      <SectionTitle className="bc-t2" title="Smart Capital" sub="Our ecosystem support" />

      <ul className="sectors" aria-label="Sectors we back">
        {SECTORS.map((s, i) => (
          <motion.li
            key={s}
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-10% 0px' }}
            transition={{ duration: 0.7, ease, delay: 0.08 * i }}
          >
            <Brackets />
            <span className="sector-label"><Check />{s}</span>
          </motion.li>
        ))}
      </ul>
      <Reveal className="bc-cta" delay={0.2}>
        <a className="btn btn-block" href="#apply"><span className="btn-label">Apply for funding</span></a>
      </Reveal>

      <div className="bc-cards">
        <Reveal delay={0.05}><FeatureCard index="01" icon={<IsoIcon boxes={ICONS.incubation} label="" />} label={<>Incubation &amp; Acceleration Program</>} /></Reveal>
        <Reveal delay={0.15}><FeatureCard index="02" icon={<IsoIcon boxes={ICONS.stairs} label="" />} label={<>Investment &amp; Funding</>} /></Reveal>
      </div>
    </section>
  )
}
