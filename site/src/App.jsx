import { useCallback, useEffect, useState } from 'react'
import Hero from './components/Hero.jsx'
import PipeWorld from './components/PipeWorld.jsx'
import BeyondCapital from './components/BeyondCapital.jsx'
import Incubation from './components/Incubation.jsx'
import Process from './components/Process.jsx'
import Incubations from './components/Incubations.jsx'
import Reviews from './components/Reviews.jsx'
import Team from './components/Team.jsx'
import Faq from './components/Faq.jsx'
import Footer from './components/Footer.jsx'
import { startScroll, stopScroll } from './lib/scroll.js'

const DESKTOP = '(min-width: 1024px)'

/* the pipe journey runs on desktop; phones/tablets get the standalone hero robot */
function usePipes() {
  const [ok, setOk] = useState(() => typeof window !== 'undefined' && window.matchMedia(DESKTOP).matches)
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP)
    const on = () => setOk(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return ok
}

export default function App() {
  const desktop = usePipes()
  const [failed, setFailed] = useState(false)
  const onFail = useCallback(() => setFailed(true), [])
  const pipes = desktop && !failed

  useEffect(() => {
    startScroll()
    return stopScroll
  }, [])

  return (
    <main className={`page ${pipes ? 'has-pipes' : ''}`}>
      {pipes && <PipeWorld onFail={onFail} />}
      <Hero standalone={!pipes} />
      <BeyondCapital />
      <Incubation />
      <Process />
      <Incubations />
      <Reviews />
      <Team />
      <Faq />
      <Footer />
    </main>
  )
}
