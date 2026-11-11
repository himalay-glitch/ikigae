import { useState } from 'react'
import Display from './Display.jsx'
import { SectionGrid, Reveal, Lane } from './ui.jsx'
import { LogoMark, XLogo, Telegram, Medium, LinkedIn, PARTNERS } from './icons.jsx'

const COLS = [
  { title: 'Programs', links: ['Incubation', 'Acceleration', 'Investment', 'Apply'] },
  { title: 'Company', links: ['Portfolio', 'Team', 'Media', 'Reviews', 'Blog'] },
]

function PartnerMark({ p }) {
  if (p.display) return <Display text={p.name} className="pm-display" title={p.name} />
  return (
    <span className="pm">
      <span className="pm-icon">{p.icon}</span>
      <span className={`pm-name ${p.caps ? 'pm-caps' : ''}`}>{p.name}</span>
    </span>
  )
}

/* partners: a slow continuous marquee (two copies of the list, the second hidden from AT) */
function Partners() {
  return (
    <div className="partners">
      <span className="partners-label">Backed alongside</span>
      <div className="partners-window">
        <ul className="partners-track">
          {[0, 1].map((k) => PARTNERS.map((p) => (
            <li key={`${k}-${p.name}`} aria-hidden={k === 1 || undefined}><PartnerMark p={p} /></li>
          )))}
        </ul>
      </div>
    </div>
  )
}

export default function Footer() {
  const [sent, setSent] = useState(false)
  return (
    <>
      <section id="apply" className="sec sec-cta" data-section="apply" aria-labelledby="cta-title">
        <SectionGrid rows={[160, 490, 680]} lines={[719, 1050]} />
        <Lane id="apply" drop="end" />
        <span className="sq cta-sq-tl" aria-hidden="true" />
        <span className="sq cta-sq-tr" aria-hidden="true" />
        <Reveal className="cta-head" y={24}>
          <h2 id="cta-title" className="sr-only">Build with us</h2>
          <Display text="BUILD WITH US" className="cta-type" />
        </Reveal>
        <Reveal className="cta-copy" delay={0.1}>
          <p>Applications for the next cohort are open. Tell us what you&rsquo;re building — we reply to every founder within two weeks.</p>
        </Reveal>
        <Reveal className="cta-actions" delay={0.2}>
          <a className="btn btn-block" href="#apply"><span className="btn-label">Apply now</span></a>
          <a className="btn btn-ghost btn-block" href="mailto:hello@example.com"><span className="btn-label">Talk to the team</span></a>
        </Reveal>
        <Partners />
      </section>

      <footer className="sec sec-footer">
        <SectionGrid rows={[0, 300]} lane={false} lines={[388, 719, 1050]} />
        <div className="ft-brand">
          <LogoMark className="ft-mark" />
          <p>Ikigai Labs backs the boldest web3 builders with capital, craft and a network that opens doors.</p>
        </div>
        {COLS.map((c, i) => (
          <nav key={c.title} className={`ft-col ft-col-${i + 1}`} aria-label={c.title}>
            <h3>{c.title}</h3>
            <ul>{c.links.map((l) => <li key={l}><a href={`#${l.toLowerCase()}`}>{l}</a></li>)}</ul>
          </nav>
        ))}
        <div className="ft-news">
          <h3>Stay in the loop</h3>
          <form onSubmit={(e) => { e.preventDefault(); setSent(true) }}>
            <label className="sr-only" htmlFor="ft-email">Email address</label>
            <input id="ft-email" type="email" required placeholder="you@company.com" />
            <button className="btn" type="submit"><span className="btn-label">{sent ? 'Subscribed' : 'Join'}</span></button>
          </form>
          <div className="ft-social">
            <a href="#" aria-label="X (Twitter)"><XLogo /></a>
            <a href="#" aria-label="Telegram"><Telegram /></a>
            <a href="#" aria-label="Medium"><Medium /></a>
            <a href="#" aria-label="LinkedIn"><LinkedIn /></a>
          </div>
        </div>
        <div className="ft-word" aria-hidden="true"><Display text="IKIGAI LABS" /></div>
        <div className="ft-bar">
          <span><span className="copy-sym">&copy;</span>&nbsp;2026 Ikigai Labs</span>
          <span className="ft-bar-links"><a href="#privacy">Privacy</a><a href="#terms">Terms</a></span>
        </div>
      </footer>
    </>
  )
}
