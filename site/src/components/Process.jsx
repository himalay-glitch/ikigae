import { motion } from 'framer-motion'
import { SectionGrid, Reveal, SectionTitle, Lane, HeadingPanel, ease } from './ui.jsx'
import { IsoIcon, ICONS } from './IsoIcon.jsx'

const STEPS = [
  { name: 'Apply', when: 'Week 0', icon: ICONS.community, text: 'Send a deck and a demo. A partner reads every application and replies within two weeks.' },
  { name: 'Diligence', when: 'Weeks 1–2', icon: ICONS.shield, text: 'We pressure-test the tech, token design and market with you — no black-box committee.' },
  { name: 'Build', when: 'Weeks 3–10', icon: ICONS.pyramid, text: 'Eight weeks of hands-on work with operators on product, tokenomics, legal and hiring.' },
  { name: 'Launch', when: 'Weeks 11–12', icon: ICONS.launch, text: 'Go-to-market, listings and a demo day in front of our partner network.' },
]

export default function Process() {
  return (
    <section id="process" className="sec sec-process" data-section="process" aria-labelledby="process-title">
      <SectionGrid rows={[160, 336, 676]} lines={[348.5, 640, 931.5, 1223]} />
      <Lane id="process" drop="r" />

      <HeadingPanel id="process-title" text="HOW IT WORKS" className="pr-panel" />
      <SectionTitle className="pr-t" title={<>A pipeline,<br />not a pitch deck</>} sub="Four stages · twelve weeks" />
      <Reveal className="pr-copy" delay={0.1}>
        <p>Every team moves through the same four stations. Guide the robot along the pipe to light each one up.</p>
      </Reveal>

      <ol className="pr-steps">
        {STEPS.map((s, i) => (
          <motion.li
            key={s.name}
            className="pr-step"
            data-port="process"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-8% 0px' }}
            transition={{ duration: 0.8, ease, delay: i * 0.08 }}
          >
            <span className="pr-num">{String(i + 1).padStart(2, '0')}</span>
            <span className="pr-when">{s.when}</span>
            <span className="pr-icon"><IsoIcon boxes={s.icon} label="" /></span>
            <h3 className="pr-name">{s.name}</h3>
            <p className="pr-text">{s.text}</p>
            <span className="pr-bar" aria-hidden="true" />
          </motion.li>
        ))}
      </ol>
    </section>
  )
}
