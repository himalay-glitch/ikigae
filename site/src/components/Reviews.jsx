import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SectionGrid, SectionTitle, Lane, HeadingPanel, ease } from './ui.jsx'
import { Chevron } from './icons.jsx'

/* Placeholder testimonials from the fictional portfolio teams; replace with real quotes. */
const QUOTES = [
  { q: 'They read our token model line by line and found two problems we’d missed. That alone was worth the program.', name: 'Maya Okafor', role: 'Co-founder', team: 'Sentra' },
  { q: 'Most funds send a term sheet and disappear. This team sat in our stand-ups for eight weeks.', name: 'Daniel Reyes', role: 'CEO', team: 'Fluxbridge' },
  { q: 'The go-to-market playbook turned a quiet waitlist into a real community before mainnet.', name: 'Priya Nair', role: 'Founder', team: 'Gridmesh' },
  { q: 'Honest feedback, fast decisions and introductions that actually turned into partnerships.', name: 'Tomás Lindqvist', role: 'CTO', team: 'Orbitra' },
]

function Quote({ item }) {
  return (
    <figure className="rv-card" data-port="reviews">
      <svg className="rv-mark" viewBox="0 0 40 30" aria-hidden="true">
        <path d="M0 30V17Q0 4 13 0l2 5Q7 8 7 15h7v15Zm22 0V17Q22 4 35 0l2 5q-8 3-8 10h7v15Z" fill="currentColor" />
      </svg>
      <blockquote><p>{item.q}</p></blockquote>
      <figcaption>
        <span className="rv-avatar" aria-hidden="true">{item.name.split(' ').map((w) => w[0]).join('')}</span>
        <span className="rv-who">
          <span className="rv-name">{item.name}</span>
          <span className="rv-role">{item.role}, {item.team}</span>
        </span>
      </figcaption>
    </figure>
  )
}

export default function Reviews() {
  const [page, setPage] = useState(0)
  const pages = Math.ceil(QUOTES.length / 2)
  const shown = QUOTES.slice(page * 2, page * 2 + 2)
  return (
    <section id="reviews" className="sec sec-reviews" data-section="reviews" aria-labelledby="reviews-title">
      <SectionGrid rows={[160, 336, 716]} lines={[640, 1223]} />
      <Lane id="reviews" drop="r" />

      <SectionTitle className="rv-t" title="Founders on the pipeline" sub="In their words" />
      <HeadingPanel id="reviews-title" text="REVIEWS" className="rv-panel" />

      <div className="rv-slots" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={page}
            className="rv-page"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.45, ease }}
          >
            {shown.map((item) => <Quote key={item.name} item={item} />)}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="rv-nav">
        <span className="rv-count">{String(page + 1).padStart(2, '0')} / {String(pages).padStart(2, '0')}</span>
        <button type="button" aria-label="Previous reviews" onClick={() => setPage((p) => (p - 1 + pages) % pages)}><Chevron dir="left" /></button>
        <button type="button" aria-label="Next reviews" onClick={() => setPage((p) => (p + 1) % pages)}><Chevron dir="right" /></button>
      </div>
    </section>
  )
}
