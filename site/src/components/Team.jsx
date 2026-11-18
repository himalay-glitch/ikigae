import { motion } from 'framer-motion'
import { SectionGrid, Reveal, SectionTitle, Lane, HeadingPanel, ease } from './ui.jsx'

/*
  Founders (copy: ikai.digital). DUMMY names and placeholder portraits — swap in the real people
  and their photos when ready.
*/
const FOUNDERS = [
  { name: 'Arjun Mehra', role: 'Product Designer', bio: 'A product designer with a sharp eye for detail, using AI as leverage to craft smoother, more intuitive customer experiences.' },
  { name: 'Nisha Kapoor', role: 'Product Strategy & Design', bio: 'Works closely with every project to define its design direction, fluent in both AI and design.' },
  { name: 'Vikram Desai', role: 'Product Expert', bio: 'Takes ideas from zero to one, shaping products from scratch and scaling them with clarity and purpose.' },
]

/* portrait placeholder: hatched tile, filled head-and-shoulders bust, frame brackets */
function Portrait({ name }) {
  return (
    <div className="tm-photo" role="img" aria-label={`Portrait placeholder for ${name}`}>
      <svg className="tm-ph" viewBox="0 0 120 150" aria-hidden="true">
        <path className="tm-ph-body" d="M8 150c2-26 18.5-41.5 39-46V86h26v18c20.5 4.5 37 20 39 46Z" />
        <circle className="tm-ph-head" cx="60" cy="63" r="25.5" />
      </svg>
      <span className="tm-ph-cap">Photo</span>
      <span className="br br-tl" /><span className="br br-tr" /><span className="br br-bl" /><span className="br br-br" />
    </div>
  )
}

export default function Team() {
  return (
    <section id="founders" className="sec sec-team drop-l" data-section="team" aria-labelledby="founders-title">
      <SectionGrid rows={[160, 336, 836]} lines={[215, 603.7, 992.3]} />
      <Lane id="team" drop="l" index="06" label="Founders" />

      <HeadingPanel id="founders-title" text="FOUNDERS" className="tm-panel" />
      <SectionTitle className="tm-t" title={<>The people<br />behind IKAI</>} sub="Our founders" />
      <Reveal className="tm-copy" delay={0.1}>
        <p>Design, strategy and product, brought together by a team that has built from scratch and knows how to scale.</p>
      </Reveal>

      <ul className="tm-grid">
        {FOUNDERS.map((p, i) => (
          <motion.li
            key={p.name}
            className="tm-card"
            data-port="team"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-8% 0px' }}
            transition={{ duration: 0.8, ease, delay: i * 0.08 }}
          >
            <Portrait name={p.name} />
            <h3 className="tm-name">{p.name}</h3>
            <p className="tm-role">{p.role}</p>
            <p className="tm-bio">{p.bio}</p>
          </motion.li>
        ))}
      </ul>
    </section>
  )
}
