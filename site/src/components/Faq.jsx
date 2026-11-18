import { useState } from 'react'
import { SectionGrid, SectionTitle, Lane, HeadingPanel } from './ui.jsx'

/* content: ikai.digital */
const QA = [
  { q: 'What stage should my startup be at?', a: 'We work with pre-seed, seed and Series A founders. Whether you have a rough concept or a working prototype, we can help. The earlier you engage, the more impact we can have on your product direction.' },
  { q: 'How long does the engagement typically take?', a: 'Most engagements run 6 to 12 weeks depending on scope. We scope a clear timeline up front and work in focused sprints, so you always know what is shipping and when.' },
  { q: 'What if I’m not ready to fully commit to everything?', a: 'That is fine. You can start with a single phase — validation, branding or design — and expand as you see results. Each phase is designed to stand on its own.' },
  { q: 'Do you help with fundraising?', a: 'Yes. We prepare investor-ready deliverables — pitch decks, product roadmaps and positioning — and many of our founders use them to raise their next round.' },
  { q: 'What’s your typical project cost?', a: 'Cost depends on scope and stage. We put together a transparent, fixed proposal after a short discovery call, with no surprises along the way.' },
  { q: 'Can you build the actual product?', a: 'We design, prototype and hand off production-ready specs and design systems, and we partner with trusted engineering teams to take it all the way to launch.' },
]

function Item({ item, id, open, onToggle }) {
  return (
    <li className={`fq-item ${open ? 'is-open' : ''}`}>
      <h3>
        <button type="button" aria-expanded={open} aria-controls={`${id}-a`} id={`${id}-q`} onClick={onToggle}>
          <span>{item.q}</span>
          <span className="fq-plus" aria-hidden="true" />
        </button>
      </h3>
      <div className="fq-a" id={`${id}-a`} role="region" aria-labelledby={`${id}-q`}>
        <div><p>{item.a}</p></div>
      </div>
    </li>
  )
}

export default function Faq() {
  const [open, setOpen] = useState({ l: 0, r: -1 })
  const cols = [['l', QA.slice(0, 3)], ['r', QA.slice(3)]]
  return (
    <section id="faq" className="sec sec-faq" data-section="faq" aria-labelledby="faq-title">
      <SectionGrid rows={[160, 336]} lines={[640, 1223]} />
      <Lane id="faq" drop="r" index="07" label="Questions" />

      <SectionTitle className="fq-t" title="Frequently asked questions" sub="Everything you need to know about working with us" />
      <HeadingPanel id="faq-title" text="FAQ" className="fq-panel" />

      {cols.map(([side, items]) => (
        <ul key={side} className={`fq-col fq-${side}`} data-port="faq">
          {items.map((item, i) => (
            <Item
              key={item.q}
              item={item}
              id={`faq-${side}${i}`}
              open={open[side] === i}
              onToggle={() => setOpen((o) => ({ ...o, [side]: o[side] === i ? -1 : i }))}
            />
          ))}
        </ul>
      ))}
    </section>
  )
}
