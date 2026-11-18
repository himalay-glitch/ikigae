import { useState } from 'react'
import Display from './Display.jsx'
import { SectionGrid, Reveal, Lane } from './ui.jsx'
import { LogoMark, XLogo, LinkedIn, Instagram } from './icons.jsx'
import { EMAIL, CALL, DELIVERABLES } from '../lib/site.js'

/* CTA + footer (content: ikai.digital) */
const NAV = [
  ['Home', '#top'], ['The Challenge', '#challenge'], ['Deliverables', '#deliverables'],
  ['Founders', '#founders'], ['FAQ', '#faq'], ['Contact', '#contact'],
]

/* what you receive: a slow continuous ticker (two copies, the second hidden from AT) */
function Ticker() {
  return (
    <div className="partners ticker">
      <span className="partners-label">What you receive</span>
      <div className="partners-window">
        <ul className="partners-track">
          {[0, 1].map((k) => DELIVERABLES.map((d) => (
            <li key={`${k}-${d}`} aria-hidden={k === 1 || undefined}><span className="tk-item"><span className="tk-dot" aria-hidden="true" />{d}</span></li>
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
      <section id="contact" className="sec sec-cta" data-section="apply" aria-labelledby="cta-title">
        <SectionGrid rows={[160, 490, 680]} lines={[719, 1050]} />
        <Lane id="apply" drop="end" index="08" label="Let’s talk" />
        <span className="sq cta-sq-tl" aria-hidden="true" />
        <span className="sq cta-sq-tr" aria-hidden="true" />
        <Reveal className="cta-head" y={24}>
          <h2 id="cta-title" className="sr-only">Let’s talk</h2>
          <Display text="LET’S TALK" className="cta-type" />
        </Reveal>
        <Reveal className="cta-copy" delay={0.1}>
          <p className="cta-big">Your idea deserves more than just an idea.</p>
          <p>Let’s transform your vision into a business‑ready product that gets funded and grows.</p>
        </Reveal>
        <Reveal className="cta-actions" delay={0.2}>
          <a className="btn btn-block" href={`mailto:${EMAIL}?subject=Let%E2%80%99s%20build%20it%20together`} data-robot-face="star"><span className="btn-label">Let’s build it together</span></a>
          <a className="btn btn-ghost btn-block" href={CALL}><span className="btn-label">Schedule a call</span></a>
        </Reveal>
        <Ticker />
      </section>

      <footer className="sec sec-footer">
        <SectionGrid rows={[0, 300]} lane={false} lines={[388, 719, 1050]} />
        <div className="ft-brand">
          <LogoMark className="ft-mark" />
          <p>We turn ideas into products.</p>
        </div>
        <nav className="ft-col ft-col-1" aria-label="Navigation">
          <h3>Navigation</h3>
          <ul>{NAV.map(([l, h]) => <li key={l}><a href={h}>{l}</a></li>)}</ul>
        </nav>
        <div className="ft-col ft-col-2">
          <h3>Connect</h3>
          <p className="ft-label">Email</p>
          <a className="ft-email" href={`mailto:${EMAIL}`}>{EMAIL}</a>
          <p className="ft-label">Talk to us</p>
          <a className="ft-email" href={CALL}>Schedule a call</a>
        </div>
        <div className="ft-news">
          <h3>Newsletter</h3>
          <form onSubmit={(e) => { e.preventDefault(); setSent(true) }}>
            <label className="sr-only" htmlFor="ft-email">Email address</label>
            <input id="ft-email" type="email" required placeholder="Email address" />
            <button className="btn" type="submit"><span className="btn-label">{sent ? 'Subscribed' : 'Subscribe'}</span></button>
          </form>
          <div className="ft-social">
            <a href="#" aria-label="IKAI on X"><XLogo /></a>
            <a href="#" aria-label="IKAI on LinkedIn"><LinkedIn /></a>
            <a href="#" aria-label="IKAI on Instagram"><Instagram /></a>
          </div>
        </div>
        <div className="ft-word" aria-hidden="true"><Display text="IKAI" track={160} /></div>
        <div className="ft-bar">
          <span><span className="copy-sym">&copy;</span>&nbsp;2026 IKAI. All rights reserved.</span>
          <span className="ft-bar-links">
            <a href="https://ikai.digital/privacy-policy/">Privacy Policy</a>
            <a href="https://ikai.digital/terms-of-service/">Terms of Service</a>
          </span>
        </div>
      </footer>
    </>
  )
}
