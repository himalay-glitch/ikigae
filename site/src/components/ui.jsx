import { motion } from 'framer-motion'
import { Target } from './icons.jsx'
import Display from './Display.jsx'

export const ease = [0.16, 1, 0.3, 1]

/* section grid: frame lines run full height; inner column lines (x in u) start below the
   section's pipe lane */
export function SectionGrid({ rows = [], lane = true, lines = [] }) {
  return (
    <div className={`grid-lines ${lane ? 'has-lane' : ''}`} aria-hidden="true">
      {['v0', 'v4'].map((k) => <span key={k} className={`gl gl-v gl-v-full ${k}`} />)}
      {lines.map((x) => <span key={x} className="gl gl-v gl-x" style={{ left: `calc(var(--u) * ${x})` }} />)}
      {rows.map((y) => (
        <motion.span
          key={y}
          className="gl gl-h"
          style={{ top: `calc(var(--u) * ${y})` }}
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, margin: '-10% 0px' }}
          transition={{ duration: 1.1, ease }}
        />
      ))}
    </div>
  )
}

export function Brackets({ tone = 'light' }) {
  return (
    <span className={`brk brk-${tone}`} aria-hidden="true">
      <i /><i /><i /><i />
    </span>
  )
}

export function TargetBox({ className = '' }) {
  return (
    <span className={`target-box ${className}`} aria-hidden="true"><Target /></span>
  )
}

export function Reveal({ children, className = '', delay = 0, y = 18, as = 'div', ...rest }) {
  const M = motion[as]
  return (
    <M
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-12% 0px' }}
      transition={{ duration: 0.9, ease, delay }}
      {...rest}
    >
      {children}
    </M>
  )
}

export function SectionTitle({ title, sub, className = '' }) {
  return (
    <Reveal className={`sec-title ${className}`}>
      <h3><span className="bullet" aria-hidden="true" />{title}</h3>
      {sub && <p>{sub}</p>}
    </Reveal>
  )
}

export function FeatureCard({ index, icon, label, className = '' }) {
  return (
    <article className={`fcard ${className}`}>
      <span className="fcard-dot" aria-hidden="true" />
      <span className="fcard-num">{index}</span>
      <div className="fcard-tile">{icon}</div>
      <h4 className="fcard-label">{label}</h4>
    </article>
  )
}

/* the horizontal pipe band at the top of a section; PipeWorld draws the glass tube here.
   `drop` = the side where the S-pipe turns down to the next section ('r' | 'l' | 'end') */
export function Lane({ id, drop, label }) {
  return (
    <div className="lane" data-lane={id} data-drop={drop} aria-hidden="true">
      {label && <span className="lane-label">{label}</span>}
    </div>
  )
}

/* section heading in the glyph display font, inside a panel */
export function HeadingPanel({ text, className = '', id, track = 12 }) {
  return (
    <Reveal className={`panel heading-panel ${className}`} y={0}>
      <h2 id={id} className="sr-only">{text.charAt(0) + text.slice(1).toLowerCase()}</h2>
      <Display text={text} track={track} className="sec-heading" />
    </Reveal>
  )
}
