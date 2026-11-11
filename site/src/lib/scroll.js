import Lenis from 'lenis'

/*
  One requestAnimationFrame loop for the whole page. Lenis advances the scroll first, then
  every subscriber (the WebGL pipe scene) renders with the scroll value that the DOM will
  paint in the same frame, so the 3D pipes never lag behind the page grid.
*/
const subs = new Set()
let lenis = null
let raf = 0

export function startScroll() {
  if (lenis) return lenis
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  lenis = new Lenis({
    duration: reduce ? 0 : 1.05,
    smoothWheel: !reduce,
    wheelMultiplier: 0.9,
    anchors: { offset: 0 },
  })
  const loop = (t) => {
    lenis.raf(t)
    subs.forEach((fn) => fn(t))
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)
  return lenis
}

export function stopScroll() {
  cancelAnimationFrame(raf)
  lenis?.destroy()
  lenis = null
}

export function onFrame(fn) {
  subs.add(fn)
  return () => subs.delete(fn)
}

export function getLenis() { return lenis }
