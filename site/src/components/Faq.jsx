import { useState } from 'react'
import { SectionGrid, SectionTitle, Lane, HeadingPanel } from './ui.jsx'

const QA = [
  { q: 'Who can apply?', a: 'Teams building in AI, DeFi, DePIN or L1/L2 infrastructure, from pre-seed to Series A. A working prototype helps; a finished product isn’t required.' },
  { q: 'Do you take tokens or equity?', a: 'Either, or both. We structure each deal around what keeps the project healthy over the long run.' },
  { q: 'How long is the program?', a: 'Twelve weeks from kickoff to demo day, and our support carries on well after launch.' },
  { q: 'Do we need to relocate?', a: 'No. The program is remote-first, with optional in-person weeks for workshops and demo day.' },
  { q: 'What does it cost?', a: 'Nothing. There are no program fees; we’re aligned through our investment.' },
  { q: 'What happens after demo day?', a: 'You keep a partner on call, access to the network and help with your next raise.' },
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
      <Lane id="faq" drop="r" />

      <SectionTitle className="fq-t" title="Questions, answered" sub="Still curious? Ask the team" />
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
