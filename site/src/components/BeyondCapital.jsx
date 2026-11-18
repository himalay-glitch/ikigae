import { motion } from 'framer-motion'
import { SectionGrid, Reveal, Lane, HeadingPanel, ease } from './ui.jsx'

/*
  The Challenge (content: ikai.digital) — why great ideas fail. The robot's lane runs along the
  top; the first row of problem cards light up as it passes (data-port="programs").
*/
const PROBLEMS = [
  { title: 'No market validation', line: 'Is your idea actually what customers want?', icon: 'validate' },
  { title: 'Unclear positioning', line: 'Struggling to differentiate in a crowded market.', icon: 'position' },
  { title: 'Poor user experience', line: 'Building products users don’t enjoy using.', icon: 'ux' },
  { title: 'Weak branding', line: 'Unable to communicate value effectively.', icon: 'brand' },
  { title: 'No MVP roadmap', line: 'Uncertain about what to build first.', icon: 'roadmap' },
  { title: 'Investors don’t get\u00a0it', line: 'Failing to articulate your vision compellingly.', icon: 'pitch' },
]

/* line icons — 48-unit grid, 1.6px non-scaling stroke, one accent element (.ic-a / .ic-af) each.
   .an-* parts animate while the card is hovered or the robot is overhead (sections.css → hover motion) */
function ProblemIcon({ type }) {
  const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', vectorEffect: 'non-scaling-stroke' }
  const a = { ...s, className: 'ic-a' }
  const dash = { strokeDasharray: '2.4 3.2' }
  switch (type) {
    // is it what customers want? — a lens sweeping over a question
    case 'validate': return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <g className="an-lens"><circle cx="20" cy="20" r="12.5" {...s} /><path d="M29.2 29.2 40.5 40.5" {...s} /></g>
        <g className="an-bob"><path d="M16.4 16.9a3.7 3.7 0 1 1 5.2 3.4c-1 .5-1.6 1.1-1.6 2.3v.8" {...a} /><circle cx="20" cy="26.6" r="1.25" className="ic-af" /></g>
      </svg>
    )
    // differentiate in a crowded market — an unsure (dashed) target in a field of dots
    case 'position': return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="24" r="13" {...s} {...dash} className="an-spin" /><path d="M24 4.5v6M24 37.5v6M4.5 24h6M37.5 24h6" {...s} />
        {[[13, 14], [35, 15], [14, 34], [34, 33], [24, 15.5]].map(([x, y], i) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.5" fill="currentColor" opacity="0.55" className="an-jit" style={{ '--i': i }} />)}
        <circle cx="24" cy="24" r="3.2" className="ic-af an-pulse" />
      </svg>
    )
    // products users don't enjoy — a lost cursor wandering a window
    case 'ux': return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <rect x="5" y="8.5" width="38" height="31" rx="3" {...s} /><path d="M5 15.5h38" {...s} />
        {[9.5, 13, 16.5].map((x) => <circle key={x} cx={x} cy="12" r="1" fill="currentColor" />)}
        <path d="M11 34c3-7 9 1 12-4.5S17.5 23 21 19.5" {...s} {...dash} className="an-march" />
        <path d="M26 20.5 35.5 25l-4.2 1.2-1.7 4.1Z" {...a} className="ic-a an-wander" />
      </svg>
    )
    // can't communicate value — a gem whose far side fades out
    case 'brand': return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M24 9H15.5L7 19.5 24 40.5" {...a} className="ic-a an-draw-down" /><path d="M24 9h8.5L41 19.5 24 40.5" {...s} {...dash} className="an-flicker" />
        <path d="M7 19.5h34M19.5 9 24 40.5 28.5 9" {...s} />
      </svg>
    )
    // what to build first? — two steps of a path, then a flag with no clear route to it
    case 'roadmap': return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="9" cy="38" r="2.8" {...s} /><circle cx="21" cy="29" r="2.8" {...s} />
        <path d="M11.3 36.3 18.7 30.7M23.5 27.4C28 24 30 21.5 32.5 17.5" {...s} {...dash} className="an-march" />
        <path d="M35 21V6.5" {...a} /><path d="M35 7h8.5l-2.6 3.2 2.6 3.2H35" {...a} className="ic-a an-flag" />
      </svg>
    )
    // investors don't get it — a pitch met with a question
    default: return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <rect x="4" y="9" width="28" height="20" rx="1.5" {...s} /><path d="M18 29v7.5M12 36.5h12" {...s} />
        {[[10, 4], [15, 7], [20, 5], [25, 9]].map(([x, h], i) => <path key={x} d={`M${x} 24.5v-${h}`} {...s} className="an-bar" style={{ '--i': i }} />)}
        <g className="an-pop">
          <path d="M35.5 5.5h7a2.5 2.5 0 0 1 2.5 2.5v5.5a2.5 2.5 0 0 1-2.5 2.5H40l-3 3v-3h-1.5A2.5 2.5 0 0 1 33 13.5V8a2.5 2.5 0 0 1 2.5-2.5Z" {...a} />
          <path d="M37.6 9.4a1.5 1.5 0 1 1 2.1 1.4c-.4.2-.6.5-.6.9v.3" {...a} /><circle cx="39.1" cy="13.6" r=".7" className="ic-af" />
        </g>
      </svg>
    )
  }
}

export default function BeyondCapital() {
  return (
    <section id="challenge" className="sec sec-beyond" data-section="programs" aria-labelledby="challenge-title">
      <SectionGrid rows={[160, 336, 586, 836]} lines={[445.7, 834.3, 1223]} />
      <Lane id="programs" drop="r" index="01" label="The challenge" />

      <HeadingPanel id="challenge-title" text="THE CHALLENGE" className="bc-panel" />
      <Reveal className="bc-intro" delay={0.1}>
        <h3 className="bc-intro-t"><span className="bullet" aria-hidden="true" />Great ideas fail every day</h3>
        <p>Without the right strategy, design and market positioning, even the most innovative ideas don’t make it. Here’s what founders struggle with.</p>
      </Reveal>

      <ol className="bc-problems">
        {PROBLEMS.map((p, i) => (
          <motion.li
            key={p.title}
            className="bc-problem"
            data-port={i < 3 ? 'programs' : undefined}
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-8% 0px' }}
            transition={{ duration: 0.8, ease, delay: (i % 3) * 0.08 + Math.floor(i / 3) * 0.12 }}
          >
            <span className="bc-p-num">{String(i + 1).padStart(2, '0')}</span>
            <span className="bc-p-icon"><ProblemIcon type={p.icon} /></span>
            <h4 className="bc-p-title">{p.title}</h4>
            <p className="bc-p-line">{p.line}</p>
            <span className="bc-p-bar" aria-hidden="true" />
          </motion.li>
        ))}
      </ol>
    </section>
  )
}
