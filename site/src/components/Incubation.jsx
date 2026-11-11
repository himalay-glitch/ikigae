import { useState } from 'react'
import Display from './Display.jsx'
import { SectionGrid, Reveal, SectionTitle, FeatureCard, Lane, HeadingPanel } from './ui.jsx'
import { IsoIcon, ICONS, DollarSelect } from './IsoIcon.jsx'
import { Chevron } from './icons.jsx'

const SERVICES = [
  { label: <>Fundraise management</>, icon: <DollarSelect /> },
  { label: <>Treasury building</>, icon: <IsoIcon boxes={ICONS.pyramid} label="" /> },
  { label: <>Tokenomics design</>, icon: <IsoIcon boxes={ICONS.coins} label="" /> },
  { label: <>Go-to-market launch</>, icon: <IsoIcon boxes={ICONS.launch} label="" /> },
  { label: <>Legal &amp; compliance</>, icon: <IsoIcon boxes={ICONS.shield} label="" /> },
  { label: <>Community growth</>, icon: <IsoIcon boxes={ICONS.community} label="" /> },
]

export default function Incubation() {
  const [i, setI] = useState(0)
  const max = SERVICES.length - 2
  return (
    <section id="incubation" className="sec sec-incub drop-l" data-section="incubation" aria-labelledby="incub-title">
      <SectionGrid rows={[160, 335, 493, 782]} lines={[215, 506.5, 798]} />
      <Lane id="incubation" drop="l" />

      <Reveal className="in-cohort" y={0}>
        <div className="in-cohort-main">
          <span className="in-cohort-label">Next cohort</span>
          <Display text="Q1 2027" title="Q1 2027" track={12} className="in-cohort-date" />
        </div>
        <ul className="in-cohort-facts">
          <li><span className="in-live" aria-hidden="true" />Applications open</li>
          <li>12 weeks · remote-first</li>
          <li>6–8 teams per cohort</li>
        </ul>
      </Reveal>
      <HeadingPanel id="incub-title" text="INCUBATION" className="in-panel" />

      <SectionTitle className="in-t1" title="End-to-end support" sub="From funding to GTM" />
      <SectionTitle className="in-t2" title="Unique approach" sub="Beyond capital" />

      <div className="in-cards" aria-roledescription="carousel" aria-label="Incubation services">
        <div className="in-cards-track" style={{ transform: `translateX(calc(var(--card) * ${-i}))` }}>
          {SERVICES.map((s, k) => (
            <FeatureCard key={k} index={String(k + 1).padStart(2, '0')} icon={s.icon} label={s.label} />
          ))}
        </div>
      </div>
      <div className="in-arrows">
        <button type="button" aria-label="Previous services" onClick={() => setI((v) => Math.max(0, v - 1))} disabled={i === 0}>
          <Chevron dir="left" />
        </button>
        <button type="button" aria-label="Next services" onClick={() => setI((v) => Math.min(max, v + 1))} disabled={i === max}>
          <Chevron dir="right" />
        </button>
      </div>

      <Reveal className="in-copy" delay={0.1}>
        <p>
          Building in web3 takes more than a cheque. It takes a whole ecosystem to turn an idea
          into an industry leader. With strategic funding, go-to-market support and top-tier
          partners, we set you up for growth that compounds.
        </p>
      </Reveal>
      <Reveal className="in-cta" delay={0.2}>
        <a className="btn btn-block" href="#apply"><span className="btn-label">Apply for incubation</span></a>
      </Reveal>
    </section>
  )
}
