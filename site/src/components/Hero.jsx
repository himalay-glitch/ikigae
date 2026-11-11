import { useEffect, useState } from 'react'
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from 'framer-motion'
import Display from './Display.jsx'
import RobotStage from './RobotStage.jsx'
import LedTicker from './LedTicker.jsx'
import { LogoMark, EcosystemDots } from './icons.jsx'

/*
  Hero — the robot stands centre stage on the pipe hatch; on load its visor says "HI!" in LED
  dots, then its eyes power on. A black dot-matrix sign (the visor's language, carried onto the
  page) runs the headline across the top. Pitch on the left, the robot speaks on the right.
  The robot is drawn by PipeWorld; this component lays out the page around it.
*/
const NAV = [
  ['Our Programs', 'programs'], ['Process', 'process'], ['Portfolio', 'portfolio'],
  ['Reviews', 'reviews'], ['Team', 'team'], ['FAQ', 'faq'],
]
const ease = [0.16, 1, 0.3, 1]

function Button({ children, className = '', ...p }) {
  return (
    <a className={`btn ${className}`} {...p}>
      <span className="btn-label">{children}</span>
    </a>
  )
}

function Nav() {
  return (
    <header className="nav">
      <svg className="nav-frame" viewBox="0 0 1440 76" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 54 L23 74 H1417 L1440 54" fill="none" stroke="#C8C8C8" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="nav-div nd1" aria-hidden="true" />
      <span className="nav-div nd2" aria-hidden="true" />
      <a className="logo" href="/" aria-label="Ikigai Labs home">
        <LogoMark className="logo-mark" />
        <span className="logo-words">
          <span className="logo-top">Ikigai</span>
          <Display text="LABS" className="logo-labs" title="Labs" />
        </span>
      </a>
      <nav className="nav-links" aria-label="Primary">
        {NAV.map(([label, id]) => (
          <a key={id} href={`#${id}`}>{label}</a>
        ))}
      </nav>
      <a className="eco" href="#portfolio">
        <EcosystemDots className="eco-dots" />
        Our Ecosystem
      </a>
      <Button className="btn-nav" href="#apply">Apply now</Button>
    </header>
  )
}

export default function Hero({ standalone = true }) {
  const { scrollY } = useScroll()
  const [ready, setReady] = useState(false)
  const [top, setTop] = useState(true)
  useEffect(() => { const t = setTimeout(() => setReady(true), 2700); return () => clearTimeout(t) }, [])
  // stop talking as soon as the robot heads for the pipe
  useMotionValueEvent(scrollY, 'change', (v) => setTop(v < 30))

  return (
    <section className={`hero ${standalone ? 'is-static' : ''}`} data-section="hero" data-hero>
      <h1 className="sr-only">Backing tomorrow: Ikigai Labs backs the boldest web3 builders</h1>
      <div className="hero-stage">
        <Nav />

        <motion.div className="hero-sign" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease, delay: 0.2 }}>
          <LedTicker />
        </motion.div>

        {standalone && <RobotStage />}

        <motion.div className="hero-pitch" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease, delay: 0.45 }}>
          <p className="hero-tag"><span className="sq" aria-hidden="true" />Ikigai Labs — web3 incubator &amp; fund</p>
          <p className="hero-lede">We back the boldest web3 builders with capital, craft and a network — from first commit to launch.</p>
          <div className="hero-actions">
            <Button href="#apply">Apply for incubation</Button>
            <a className="hero-link" href="#programs">Explore the pipeline <span aria-hidden="true">↓</span></a>
          </div>
        </motion.div>

        {!standalone && (
          <div className="hero-says" aria-live="polite">
            <AnimatePresence>
              {ready && top && (
                <motion.p
                  className="says-bubble"
                  initial={{ opacity: 0, x: 10, scale: 0.96 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -6, scale: 0.96 }}
                  transition={{ duration: 0.4, ease }}
                >
                  Hi! I&rsquo;m your guide. Scroll and I&rsquo;ll take you through the pipeline.
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
      {!standalone && <span className="pipe-hatch" data-pipe="hatch" aria-hidden="true" />}
    </section>
  )
}
