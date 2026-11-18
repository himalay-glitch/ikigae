import { motion } from 'framer-motion'
import { SectionGrid, Reveal, SectionTitle, Lane, HeadingPanel, ease } from './ui.jsx'
import { IsoIcon, PHASES } from './IsoIcon.jsx'

/* four phases, built from IKAI's deliverables (ikai.digital) — each can be booked on its own */
const STEPS = [
  { name: 'Validate', when: 'Research', icon: PHASES.validate, scene: 'validate', text: 'Market and user research that shows whether your idea is what customers actually want.' },
  { name: 'Position', when: 'Strategy', icon: PHASES.position, scene: 'position', text: 'Identity, positioning and messaging that set you apart in a crowded market.' },
  { name: 'Design', when: 'UI · Prototype', icon: PHASES.design, scene: 'design', text: 'Beautiful, functional interfaces, a clickable prototype and a reusable design system.' },
  { name: 'Launch', when: 'Go-to-market', icon: PHASES.launch, scene: 'launch', text: 'A launch plan, an investor‑ready pitch deck and a 12‑month product roadmap.' },
]

export default function Process() {
  return (
    <section id="process" className="sec sec-process" data-section="process" aria-labelledby="process-title">
      <SectionGrid rows={[160, 336, 676]} lines={[348.5, 640, 931.5, 1223]} />
      <Lane id="process" drop="r" index="03" label="How it works" />

      <HeadingPanel id="process-title" text="HOW IT WORKS" className="pr-panel" />
      <SectionTitle className="pr-t" title={<>A pipeline,<br />not a guess</>} sub="Four phases · 6–12 weeks" />
      <Reveal className="pr-copy" delay={0.1}>
        <p>We scope a clear timeline up front and work in focused sprints, so you always know what is shipping and when. Guide the robot along the pipe to light each phase up.</p>
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
            <span className="pr-icon"><IsoIcon boxes={s.icon} scene={s.scene} label="" /></span>
            <h3 className="pr-name">{s.name}</h3>
            <p className="pr-text">{s.text}</p>
            <span className="pr-bar" aria-hidden="true" />
          </motion.li>
        ))}
      </ol>
    </section>
  )
}
