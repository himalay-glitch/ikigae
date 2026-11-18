import { useState } from 'react'
import Display from './Display.jsx'
import { SectionGrid, Reveal, SectionTitle, FeatureCard, Lane, HeadingPanel } from './ui.jsx'
import { IsoIcon, STORY as SCENES } from './IsoIcon.jsx'
import { Chevron } from './icons.jsx'
import { CALL } from '../lib/site.js'

/* Why IKAI (content: ikai.digital) — the story of why ideas die, and how an engagement runs. */
const STORY = [
  { label: <>Most ideas die<br />before launch day</>, icon: SCENES.gap, scene: 'gap' },
  { label: <>Built on instinct,<br />not on evidence</>, icon: SCENES.instinct, scene: 'instinct' },
  { label: <>Six months lost<br />to one rebuild</>, icon: SCENES.rebuild, scene: 'rebuild' },
  { label: <>Prove the idea,<br />then build it</>, icon: SCENES.prove, scene: 'prove' },
]

export default function Incubation() {
  const [i, setI] = useState(0)
  const max = STORY.length - 2
  return (
    <section id="why" className="sec sec-incub drop-l" data-section="incubation" aria-labelledby="why-title">
      <SectionGrid rows={[160, 335, 493, 782]} lines={[215, 506.5, 798]} />
      <Lane id="incubation" drop="l" index="02" label="Why IKAI" />

      <Reveal className="in-cohort" y={0}>
        <div className="in-cohort-main">
          <span className="in-cohort-label">Typical engagement · weeks</span>
          <Display text="6-12" title="6 to 12 weeks" track={12} className="in-cohort-date" />
        </div>
        <ul className="in-cohort-facts">
          <li><span className="in-tick" aria-hidden="true" />Focused sprints</li>
          <li><span className="in-tick" aria-hidden="true" />Fixed, transparent proposal</li>
          <li><span className="in-tick" aria-hidden="true" />Pre-seed to Series A</li>
        </ul>
      </Reveal>
      <HeadingPanel id="why-title" text="WHY IKAI" className="in-panel" />

      <SectionTitle className="in-t1" title="Evidence first" sub="Why most ideas never launch" />
      <SectionTitle className="in-t2" title="Start with a single phase" sub="Each one stands on its own" />

      <div className="in-cards" aria-roledescription="carousel" aria-label="Why ideas fail, and how we fix it">
        <div className="in-cards-track" style={{ transform: `translateX(calc(var(--card) * ${-i}))` }}>
          {STORY.map((s, k) => (
            <FeatureCard key={k} index={String(k + 1).padStart(2, '0')} icon={<IsoIcon boxes={s.icon} scene={s.scene} label="" />} label={s.label} />
          ))}
        </div>
      </div>
      <div className="in-arrows">
        <button type="button" aria-label="Previous" onClick={() => setI((v) => Math.max(0, v - 1))} disabled={i === 0}>
          <Chevron dir="left" />
        </button>
        <button type="button" aria-label="Next" onClick={() => setI((v) => Math.min(max, v + 1))} disabled={i === max}>
          <Chevron dir="right" />
        </button>
      </div>

      <Reveal className="in-copy" delay={0.1}>
        <p>
          Not ready to commit to everything? That’s fine. Start with a single phase — validation,
          branding or design — and expand as you see results. Every phase is designed to stand on
          its own, scoped up front and shipped in focused sprints.
        </p>
      </Reveal>
      <Reveal className="in-cta" delay={0.2}>
        <a className="btn btn-block" href={CALL}><span className="btn-label">Schedule a call</span></a>
      </Reveal>
    </section>
  )
}
