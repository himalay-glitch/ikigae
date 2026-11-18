import { motion } from 'framer-motion'
import Display from './Display.jsx'
import HeroRobot from './HeroRobot.jsx'
import ThemeToggle from './ThemeToggle.jsx'
import { LogoMark } from './icons.jsx'
import { CALL } from '../lib/site.js'

/*
  Hero — the first-version look (flat grey, hairline grid, angular display type, mono copy) with
  the Ikigai pod standing in it. Layers, back to front:
    1. grid     — the page's column lines
    2. headline — "BACKING TOMORROW" display marquee framed by orange corner squares; it runs
                  behind the pod
    3. pod      — the capsule cut out of the Cycles render (blender/hero_lab/lab_v001.blend,
                  passes_pod.py), pixel-identical to the lab render, with its contact shadow
    4. robot    — live WebGL (HeroRobot), camera matched to the render camera; it stands on the
                  glass hatch in the pod floor and sinks through it into the pipeline on scroll
    5. glass    — the pod's front glass alone (reflections) with alpha
    6. copy     — nav, tag, intro, CTA
  The S-pipe starts right under the pod ([data-pipe="hatch"] at the pod's x).
*/
const NAV = [
  ['The Challenge', 'challenge'], ['Why IKAI', 'why'], ['Process', 'process'],
  ['Deliverables', 'deliverables'], ['Founders', 'founders'], ['FAQ', 'faq'],
]
const ease = [0.16, 1, 0.3, 1]

function Button({ children, className = '', ...p }) {
  return (
    <a className={`btn ${className}`} {...p}>
      <span className="btn-label">{children}</span>
    </a>
  )
}

function GridLines() {
  return (
    <div className="grid-lines" aria-hidden="true">
      {['v0', 'v1', 'v2', 'v3', 'v4'].map((k, i) => (
        <motion.span key={k} className={`gl gl-v ${k}`} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 1.2, ease, delay: 0.05 * i }} />
      ))}
      {['h1', 'h2', 'h3'].map((k, i) => (
        <motion.span key={k} className={`gl gl-h ${k}`} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1.2, ease, delay: 0.25 + 0.1 * i }} />
      ))}
    </div>
  )
}

function Nav() {
  return (
    <header className="nav">
      <svg className="nav-frame" viewBox="0 0 1440 76" preserveAspectRatio="none" aria-hidden="true">
        <path className="nav-fill" d="M0 0 H1440 V54 L1417 74 H23 L0 54 Z" />
        <path className="nav-stroke" d="M0 54 L23 74 H1417 L1440 54" fill="none" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="nav-div nd1" aria-hidden="true" />
      <span className="nav-div nd2" aria-hidden="true" />
      <a className="logo" href="/" aria-label="IKAI home">
        <LogoMark className="logo-mark" />
        <Display text="IKAI" className="logo-type" title="IKAI" />
      </a>
      <nav className="nav-links" aria-label="Primary">
        {NAV.map(([label, id]) => (
          <a key={id} href={`#${id}`}>{label}</a>
        ))}
      </nav>
      <a className="eco" href={CALL}>
        <span className="eco-dot" aria-hidden="true" />
        Schedule a call
      </a>
      <ThemeToggle className="nav-theme" />
      <Button className="btn-nav" href="#contact" data-robot-face="star">Let’s talk</Button>
    </header>
  )
}

function Headline() {
  const text = 'WE TURN IDEAS INTO PRODUCTS'
  return (
    <div className="headline">
      <motion.div className="marquee" initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1.2, ease, delay: 0.2 }} aria-hidden="true">
        <div className="marquee-track">
          {[0, 1].map((k) => (
            <div className="marquee-set" key={k}>
              <Display text={text} className="headline-type" />
              <span className="marquee-gap" />
              <Display text={text} className="headline-type" />
              <span className="marquee-gap" />
            </div>
          ))}
        </div>
      </motion.div>
      <span className="sq sq-tl" aria-hidden="true" />
      <span className="sq sq-tr" aria-hidden="true" />
      <span className="sq sq-bl" aria-hidden="true" />
      <span className="sq sq-br" aria-hidden="true" />
      <p className="kicker" aria-hidden="true">
        <span>We turn ideas</span>
        <span>Into products.</span>
      </p>
    </div>
  )
}

export default function Hero({ standalone = true }) {
  return (
    <section id="top" className={`hero hero-lab ${standalone ? 'is-static' : ''}`} data-section="hero" data-hero>
      <h1 className="sr-only">IKAI — we turn ideas into products</h1>
      <GridLines />
      <Headline />

      <div className="lab-scene">
        {/* pod, live robot and front glass share one frame so they always line up */}
        <div className="lab-frame">
          <img className="lab-pod" src="/hero/lab-pod.webp" alt="" width="2880" height="1920" fetchpriority="high" />
          <HeroRobot />
          <img className="lab-glass" src="/hero/lab-glass.webp" alt="" width="2880" height="1800" />
        </div>
      </div>

      <div className="hero-stage">
        <Nav />
        <motion.div className="intro" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease, delay: 0.45 }}>
          <p className="hero-tag"><span className="sq" aria-hidden="true" />IKAI — product studio for founders</p>
          <p className="intro-lede">Research, brand strategy, UI/UX design, interactive prototypes, design systems and go-to-market plans that get founders funded.</p>
          <div className="hero-actions">
            {/* data-robot-face: the hero robot's eyes react while these are hovered/focused */}
            <Button href="#contact" data-robot-face="star">Let’s build it together</Button>
            <a className="hero-link" href="#challenge" data-robot-face="down">Explore the pipeline <span aria-hidden="true">↓</span></a>
          </div>
        </motion.div>
      </div>
      {!standalone && <span className="pipe-hatch" data-pipe="hatch" aria-hidden="true" />}
    </section>
  )
}
