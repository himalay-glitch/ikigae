import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { loadRobot, createBlinker } from '../three/robot.js'
import { onFrame } from '../lib/scroll.js'

/*
  PipeWorld — one fixed WebGL layer that draws a single S-shaped glass pipe and the robot in
  one scene. World units are page design units (u): x = u from the page's left edge,
  y = −(u from the page top).

  The S is built from DOM markers: it starts at the hatch under the hero robot
  ([data-pipe="hatch"]), drops into the first section's lane band ([data-lane]), runs across it,
  bends down the side named by that lane's data-drop ('r' | 'l'), sweeps back across the next
  section, and so on, ending in a glass dock in the centre of the last lane (data-drop="end").
  Every corner is a filleted elbow, so the pipe is one continuous piece by construction.

  Robot journey:
    hero   — stands big on the hatch, head follows the cursor
    fall   — on scroll it hops, shrinks and drops into the pipe
    pipe   — moves along the S (one path parameter) toward the point of the pipe nearest the
             cursor; each section plays its own gesture + face when the robot settles there
    rise   — scroll back to the top and it climbs out onto the hatch again
*/

const START_X = 719
const R = 44 // tube outer radius
const BEND = 78 // elbow radius (centre line)
const HUB = 62 // junction / dock sphere radius
const HUB_CUT = Math.sqrt(HUB * HUB - R * R)
const DROP_INSET = 79 // drop centre line, measured in from the lane band's ends
const HATCH_H = 28
const PIPE_SCALE = 212 // robot size inside pipes (u per metre)
const HERO_SCALE = 1450 // robot size standing on the hatch in the hero
const HERO_YAW = -0.24
const HERO_PITCH = 0.08
// on load the visor says hi in LED dots, then the eyes power on
const GREETING = [{ text: 'HI!', color: '#FF7A2E', scale: 2 }]
const GREETING_MS = 2200
const FOV = 20
const TAU = Math.PI * 2

const SECTION_ACTS = {
  programs: { gesture: 'wave', face: 'happy' },
  incubation: { gesture: 'charge', face: 'load' },
  process: { gesture: 'hop', face: 'right' },
  portfolio: { gesture: 'spin', face: 'scan' },
  reviews: { gesture: 'nod', face: 'star' },
  team: { gesture: 'cheer', face: 'heart' },
  faq: { gesture: 'tilt', face: 'question' },
  apply: { gesture: 'wave', face: 'happy' },
}

const bump = (k, a = 0.15, b = 0.8) => (k < a ? k / a : k > b ? Math.max(0, (1 - k) / (1 - b)) : 1)
const smooth = (k) => k * k * (3 - 2 * k)
const GESTURES = {
  wave: { dur: 2.0, apply: (k, o) => { const u = smooth(bump(k, 0.14, 0.82)); o.armR = u * 2.55 + Math.sin(k * TAU * 4) * 0.32 * u } },
  cheer: { dur: 1.8, apply: (k, o) => { const u = smooth(bump(k, 0.12, 0.8)); o.armR = o.armL = u * 2.7; o.dy = -Math.abs(Math.sin(k * Math.PI * 3)) * 0.16 * u } },
  hop: { dur: 1.2, apply: (k, o) => { const j = Math.abs(Math.sin(k * Math.PI * 2)); o.dy = -j * 0.22; o.sq = 1 + (1 - j) * 0.05 * Math.sin(k * Math.PI * 2 * 2); o.armR = o.armL = j * 0.9 } },
  spin: { dur: 1.15, apply: (k, o) => { o.yaw = smooth(k) * TAU; o.dy = -Math.sin(k * Math.PI) * 0.08 } },
  nod: { dur: 1.1, apply: (k, o) => { o.pitch = Math.sin(k * Math.PI * 4) * 0.2 * (1 - k) } },
  tilt: { dur: 1.9, apply: (k, o) => { const u = smooth(bump(k, 0.18, 0.75)); o.roll = u * 0.3; o.armL = u * 0.7 } },
  charge: { dur: 2.4, apply: (k, o) => { const u = bump(k, 0.1, 0.85); o.glow = 1 + u * (2.4 + Math.sin(k * 48) * 0.8); o.jx = Math.sin(k * 140) * 0.006 * u } },
}

/* ------------------------------------------------------------------ materials */
function glassMaterial({ base = 0.07, tint = '#f4f5f8', rim = 0.5 } = {}) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: { uTint: { value: new THREE.Color(tint) }, uBase: { value: base }, uRim: { value: rim } },
    vertexShader: /* glsl */`
      varying vec3 vN; varying vec3 vV;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = -mv.xyz;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uTint; uniform float uBase; uniform float uRim;
      varying vec3 vN; varying vec3 vV;
      void main() {
        vec3 n = normalize(vN);
        vec3 v = normalize(vV);
        if (!gl_FrontFacing) n = -n;
        float ndv = clamp(abs(dot(n, v)), 0.0, 1.0);
        float f = 1.0 - ndv;
        vec3 L1 = normalize(vec3(-0.55, 0.6, 0.62));
        vec3 L2 = normalize(vec3(0.75, 0.2, 0.62));
        float s1 = pow(max(dot(n, normalize(L1 + v)), 0.0), 90.0);
        float s1b = pow(max(dot(n, normalize(L1 + v)), 0.0), 14.0) * 0.16;
        float s2 = pow(max(dot(n, normalize(L2 + v)), 0.0), 30.0) * 0.5;
        float rim = pow(f, 2.4);
        vec3 col = mix(uTint, vec3(0.50, 0.51, 0.55), rim * 0.85);
        float spec = s1 + s1b + s2;
        col = mix(col, vec3(1.0), clamp(spec * 1.2, 0.0, 1.0));
        float a = uBase + rim * uRim + spec * 0.85;
        if (!gl_FrontFacing) a *= 0.45;
        gl_FragColor = vec4(col, clamp(a, 0.0, 0.92));
      }`,
  })
}

function bubbleMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */`
      varying vec3 vN; varying vec3 vV;
      void main() {
        vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * mat3(instanceMatrix) * normal);
        vV = -mv.xyz;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      varying vec3 vN; varying vec3 vV;
      void main() {
        vec3 n = normalize(vN); vec3 v = normalize(vV);
        float f = 1.0 - clamp(dot(n, v), 0.0, 1.0);
        float s = pow(max(dot(n, normalize(normalize(vec3(-0.5, 0.6, 0.6)) + v)), 0.0), 40.0);
        gl_FragColor = vec4(vec3(1.0), clamp(0.12 + pow(f, 2.0) * 0.75 + s, 0.0, 0.95));
      }`,
  })
}

/* lathe band (ring/collar): CCW profile so normals face outward */
function bandGeo(rIn, rOut, h, bev = 3, seg = 72) {
  const V = THREE.Vector2
  const y0 = -h / 2
  const y1 = h / 2
  const b = Math.min(bev, h / 2 - 0.01, (rOut - rIn) / 2 - 0.01)
  const pts = [new V(rIn, y0)]
  for (let i = 0; i <= 5; i++) { const a = -Math.PI / 2 + (i / 5) * (Math.PI / 2); pts.push(new V(rOut - b + Math.cos(a) * b, y0 + b + Math.sin(a) * b)) }
  for (let i = 0; i <= 5; i++) { const a = (i / 5) * (Math.PI / 2); pts.push(new V(rOut - b + Math.cos(a) * b, y1 - b + Math.sin(a) * b)) }
  pts.push(new V(rIn, y1), new V(rIn, y0))
  return new THREE.LatheGeometry(pts, seg)
}

/* rounded end cap along +y, open (joined to the tube) at y = 0 */
function capGeo(r, len, seg = 72) {
  const V = THREE.Vector2
  const b = r * 0.55
  const pts = [new V(r * 0.96, 0), new V(r, 0), new V(r, len - b)]
  for (let i = 1; i <= 10; i++) { const a = (i / 10) * (Math.PI / 2); pts.push(new V(r - b + Math.cos(a) * b, len - b + Math.sin(a) * b)) }
  pts.push(new V(0, len))
  return new THREE.LatheGeometry(pts, seg)
}

/* ------------------------------------------------------------------ the S path */
const v2 = (x, y) => ({ x, y })
const sub = (a, b) => v2(a.x - b.x, a.y - b.y)
const add = (a, b) => v2(a.x + b.x, a.y + b.y)
const mul = (a, k) => v2(a.x * k, a.y * k)
const nrm = (a) => { const l = Math.hypot(a.x, a.y) || 1; return v2(a.x / l, a.y / l) }

/* corners → straight segments joined by quarter-circle fillets (screen coords, y down) */
function makePath(corners, r) {
  const segs = []
  let cur = corners[0]
  for (let i = 1; i < corners.length; i++) {
    const C = corners[i]
    const d1 = nrm(sub(C, corners[i - 1]))
    if (i === corners.length - 1) { segs.push({ type: 'line', a: cur, b: C, dir: d1 }); break }
    const d2 = nrm(sub(corners[i + 1], C))
    const p0 = sub(C, mul(d1, r))
    segs.push({ type: 'line', a: cur, b: p0, dir: d1 })
    segs.push({ type: 'arc', c: add(p0, mul(d2, r)), r, d1, d2, a: p0, b: add(C, mul(d2, r)) })
    cur = add(C, mul(d2, r))
  }
  let s = 0
  for (const g of segs) {
    g.len = g.type === 'line' ? Math.hypot(g.b.x - g.a.x, g.b.y - g.a.y) : (g.r * Math.PI) / 2
    g.s0 = s
    s += g.len
    if (g.type === 'line') g.kind = Math.abs(g.dir.x) > 0.5 ? 'lane' : 'drop'
    else g.kind = 'bend'
  }
  return { segs, length: s }
}

function pointOn(g, t) {
  if (g.type === 'line') return { x: g.a.x + g.dir.x * t, y: g.a.y + g.dir.y * t, tx: g.dir.x, ty: g.dir.y }
  const th = t / g.r
  const c = Math.cos(th)
  const sn = Math.sin(th)
  const x = g.c.x - g.d2.x * g.r * c + g.d1.x * g.r * sn
  const y = g.c.y - g.d2.y * g.r * c + g.d1.y * g.r * sn
  const tan = nrm(v2(g.d2.x * sn + g.d1.x * c, g.d2.y * sn + g.d1.y * c))
  return { x, y, tx: tan.x, ty: tan.y }
}

function pointAt(P, s) {
  const S = Math.max(0, Math.min(P.length, s))
  let g = P.segs[P.segs.length - 1]
  for (const seg of P.segs) if (S <= seg.s0 + seg.len) { g = seg; break }
  return { ...pointOn(g, S - g.s0), seg: g }
}

/* closest path parameter to a point (arcs sampled) */
function closestS(P, x, y, lo = -Infinity, hi = Infinity) {
  let best = { s: 0, d: Infinity }
  for (const g of P.segs) {
    if (g.s0 > hi || g.s0 + g.len < lo) continue
    if (g.type === 'line') {
      const t = Math.max(Math.max(0, lo - g.s0), Math.min(Math.min(g.len, hi - g.s0), (x - g.a.x) * g.dir.x + (y - g.a.y) * g.dir.y))
      const d = Math.hypot(x - (g.a.x + g.dir.x * t), y - (g.a.y + g.dir.y * t))
      if (d < best.d) best = { s: g.s0 + t, d }
    } else {
      for (let i = 0; i <= 16; i++) {
        const t = (g.len * i) / 16
        if (g.s0 + t < lo || g.s0 + t > hi) continue
        const p = pointOn(g, t)
        const d = Math.hypot(x - p.x, y - p.y)
        if (d < best.d) best = { s: g.s0 + t, d }
      }
    }
  }
  return best
}

/* ------------------------------------------------------------------ layout */
function readLayout(page) {
  const pr = page.getBoundingClientRect()
  const U = pr.width / 1440
  const box = (el) => {
    const r = el.getBoundingClientRect()
    return { x0: (r.left - pr.left) / U, x1: (r.right - pr.left) / U, y0: (r.top - pr.top) / U, y1: (r.bottom - pr.top) / U }
  }
  const hatchEl = page.querySelector('[data-pipe="hatch"]')
  const laneEls = [...page.querySelectorAll('[data-lane]')]
  if (!hatchEl || !laneEls.length) return null
  const hatch = box(hatchEl).y0
  const lanes = laneEls.map((el) => {
    const b = box(el)
    return { key: el.dataset.lane, drop: el.dataset.drop || 'r', y: (b.y0 + b.y1) / 2, xl: b.x0 + DROP_INSET, xr: b.x1 - DROP_INSET }
  }).sort((a, b) => a.y - b.y)
  const sections = [...page.querySelectorAll('[data-section]')].map((el) => {
    const b = box(el)
    return { key: el.dataset.section, y0: b.y0, y1: b.y1 }
  })
  const ports = [...page.querySelectorAll('[data-port]')].map((el) => {
    const b = box(el)
    return { el, key: el.dataset.port, x0: b.x0, x1: b.x1 }
  })

  // corners of the S: the first lane runs full width (starting from the end opposite its
  // drop), bends down the drop side, sweeps back across the next section, … → centre dock.
  // The hatch pipe from the hero joins the first lane through a glass junction at x = 719.
  const first = lanes[0]
  const corners = [v2(first.drop === 'l' ? first.xr : first.xl, first.y)]
  for (let i = 0; i < lanes.length; i++) {
    const ln = lanes[i]
    if (ln.drop === 'end' || i === lanes.length - 1) { corners.push(v2(START_X, ln.y)); break }
    const sx = ln.drop === 'l' ? ln.xl : ln.xr
    corners.push(v2(sx, ln.y), v2(sx, lanes[i + 1].y))
  }
  const pts = corners.filter((p, i) => i === 0 || Math.hypot(p.x - corners[i - 1].x, p.y - corners[i - 1].y) > 1)
  const path = makePath(pts, BEND)
  const sectionAt = (y) => sections.find((s) => y >= s.y0 && y < s.y1)?.key ?? null
  path.segs.forEach((g) => { g.key = sectionAt((g.a.y + g.b.y) / 2) })

  const junctionS = closestS(path, START_X, first.y).s
  return { hatch, lanes, sections, ports, path, junctionS, sig: JSON.stringify([hatch, lanes, sections.map((s) => [s.y0, s.y1])]) }
}

function buildPipes(L, mats) {
  const g = new THREE.Group()
  g.name = 'Pipes'
  const P = L.path
  const stops = [] // path positions of opaque fittings (the robot shouldn't park behind them)
  const W = (y) => -y
  const band = (geo, mat, x, y, dir) => {
    const m = new THREE.Mesh(geo, mat)
    // lathe bands are built along +y: rotate for horizontal runs
    if (Math.abs(dir.x) > 0.5) m.rotation.z = Math.PI / 2
    m.position.set(x, W(y), 0)
    g.add(m)
    return m
  }
  const collarGeo = bandGeo(R * 0.97, R * 1.15, 26, 4)
  const collarRing = bandGeo(R * 1.1, R * 1.19, 7, 2)
  const coupling = (s) => {
    const p = pointAt(P, s)
    band(collarGeo, mats.white, p.x, p.y, v2(p.tx, p.ty))
    band(collarRing, mats.orange, p.x, p.y, v2(p.tx, p.ty))
    stops.push(s)
  }

  // hatch on top (the hero robot stands on it) and the short pipe down to the first lane
  const J = pointAt(P, L.junctionS)
  band(bandGeo(R * 0.97, R * 1.24, HATCH_H, 5), mats.white, START_X, L.hatch + HATCH_H / 2, v2(0, 1))
  band(bandGeo(R * 1.18, R * 1.29, 8, 2.5), mats.orange, START_X, L.hatch + 4, v2(0, 1))
  const stubA = L.hatch + HATCH_H
  const stubB = J.y - HUB_CUT
  if (stubB - stubA > 1) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(R, R, stubB - stubA, 64, 1, true), mats.glass)
    m.position.set(START_X, W((stubA + stubB) / 2), 0)
    m.renderOrder = 5
    g.add(m)
    if (J.y - HUB - 16 - stubA > 30) {
      band(collarGeo, mats.white, START_X, J.y - HUB - 16, v2(0, 1))
      band(collarRing, mats.orange, START_X, J.y - HUB - 16, v2(0, 1))
    }
  }
  const hub = new THREE.Mesh(new THREE.SphereGeometry(HUB, 64, 40), mats.glass)
  hub.position.set(J.x, W(J.y), 0)
  hub.renderOrder = 6
  g.add(hub)

  // start cap on the first lane's outer end
  const s0 = pointAt(P, 0)
  const cap = new THREE.Mesh(capGeo(R * 1.12, 36), mats.white)
  cap.rotation.z = s0.tx > 0 ? Math.PI / 2 : -Math.PI / 2
  cap.position.set(s0.x, W(s0.y), 0)
  g.add(cap)
  band(collarRing, mats.orange, s0.x + s0.tx * 4, s0.y, v2(1, 0))
  stops.push(10)

  // glass along the path, cut where the junction sphere and the end dock sit
  const cuts = [[L.junctionS - HUB_CUT, L.junctionS + HUB_CUT], [P.length - HUB_CUT, Infinity]]
  const pieces = (a, b) => {
    let out = [[a, b]]
    for (const [c0, c1] of cuts) out = out.flatMap(([x, y]) => (c1 <= x || c0 >= y ? [[x, y]] : [[x, Math.min(y, c0)], [Math.max(x, c1), y]].filter(([u, w]) => w - u > 0.5)))
    return out
  }
  const sEnd = P.length - HUB_CUT
  P.segs.forEach((seg) => {
    if (seg.type === 'line') {
      for (const [a, b] of pieces(seg.s0, seg.s0 + seg.len)) {
        const pa = pointAt(P, a)
        const pb = pointAt(P, b)
        const m = new THREE.Mesh(new THREE.CylinderGeometry(R, R, b - a, 64, 1, true), mats.glass)
        if (seg.kind === 'lane') m.rotation.z = Math.PI / 2
        m.position.set((pa.x + pb.x) / 2, W((pa.y + pb.y) / 2), 0)
        m.renderOrder = 5
        g.add(m)
      }
    } else {
      // quarter torus: three.js draws the arc CCW from +x in world space (y up)
      const ws = v2(seg.a.x - seg.c.x, -(seg.a.y - seg.c.y))
      const we = v2(seg.b.x - seg.c.x, -(seg.b.y - seg.c.y))
      const ccw = ws.x * we.y - ws.y * we.x > 0
      const m = new THREE.Mesh(new THREE.TorusGeometry(seg.r, R, 48, 40, Math.PI / 2), mats.glass)
      m.rotation.z = Math.atan2(ccw ? ws.y : we.y, ccw ? ws.x : we.x)
      m.position.set(seg.c.x, W(seg.c.y), 0)
      m.renderOrder = 5
      g.add(m)
      coupling(seg.s0)
      if (seg.s0 + seg.len < sEnd - 20) coupling(seg.s0 + seg.len)
    }
  })
  // couplings: either side of the junction, then spread along the long straights
  const Jd = HUB + 16
  coupling(L.junctionS - Jd)
  coupling(L.junctionS + Jd)
  P.segs.forEach((seg) => {
    if (seg.type !== 'line') return
    const a = seg.s0
    const b = Math.min(seg.s0 + seg.len, sEnd)
    const n = seg.kind === 'lane' ? 1 : 0 // one fitting mid-lane; drops stay clean
    for (let k = 1; k <= n; k++) {
      const sk = a + ((b - a) * k) / (n + 1)
      if (stops.every((q) => Math.abs(q - sk) > 160) && Math.abs(sk - L.junctionS) > HUB + 140) coupling(sk)
    }
  })

  // end dock: glass sphere with a collar where the pipe meets it
  const end = pointAt(P, P.length)
  const dock = new THREE.Mesh(new THREE.SphereGeometry(HUB, 64, 40), mats.glass)
  dock.position.set(end.x, W(end.y), 0)
  dock.renderOrder = 6
  g.add(dock)
  coupling(P.length - HUB - 16)
  stops.sort((a, b) => a - b)
  return { group: g, stops }
}

/* ------------------------------------------------------------------ component */
export default function PipeWorld({ onFail }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const page = document.querySelector('.page')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let renderer
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
    } catch {
      onFail?.()
      return
    }
    renderer.setClearColor(0x000000, 0)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.NeutralToneMapping
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap

    const scene = new THREE.Scene()
    const pmrem = new THREE.PMREMGenerator(renderer)
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environmentIntensity = 0.75

    const key = new THREE.DirectionalLight(0xfff6ef, 2.4)
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    key.shadow.bias = -0.0004
    key.shadow.radius = 4
    scene.add(key, key.target)
    const fill = new THREE.DirectionalLight(0xf2f2ff, 0.55)
    fill.position.set(1.3, 0.35, 0.8)
    const rim = new THREE.DirectionalLight(0xffffff, 1.4)
    rim.position.set(0.6, 0.9, -1.1)
    scene.add(fill, rim, new THREE.HemisphereLight(0xffffff, 0xcfcfd2, 0.35))

    const camera = new THREE.PerspectiveCamera(FOV, 1, 50, 12000)

    const mats = {
      glass: glassMaterial(),
      white: new THREE.MeshPhysicalMaterial({ color: '#ECEBEF', roughness: 0.34, clearcoat: 0.35, clearcoatRoughness: 0.2 }),
      orange: new THREE.MeshPhysicalMaterial({ color: '#FE6F22', roughness: 0.36, clearcoat: 0.3, emissive: '#FF4A00', emissiveIntensity: 0.12 }),
    }

    // ---------------------------------------------------------------- layout + pipes
    let L = null
    let pipes = null
    let bubbles = null
    const bubbleData = []
    const BUBBLES = reduce ? 0 : 170
    const rebuild = () => {
      const next = readLayout(page)
      if (!next) return
      if (L && next.sig === L.sig) { L.ports = next.ports; return }
      L = next
      if (pipes) {
        scene.remove(pipes)
        pipes.traverse((o) => o.geometry?.dispose())
      }
      const built = buildPipes(L, mats)
      pipes = built.group
      L.stops = built.stops
      scene.add(pipes)
      if (!bubbles && BUBBLES) {
        bubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), bubbleMaterial(), BUBBLES)
        bubbles.renderOrder = 4
        bubbles.frustumCulled = false
        scene.add(bubbles)
        for (let i = 0; i < BUBBLES; i++) {
          bubbleData.push({ u: Math.random(), r: 2.5 + Math.random() * 5.5, sp: 30 + Math.random() * 50, ph: Math.random() * TAU, ox: (Math.random() - 0.5) * 2, oz: (Math.random() - 0.5) * 2 })
        }
      }
    }

    // ---------------------------------------------------------------- viewport
    const view = { w: 1, h: 1, U: 1, Hu: 900 }
    const resize = () => {
      view.w = window.innerWidth
      view.h = window.innerHeight
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      renderer.setSize(view.w, view.h, false)
      camera.aspect = view.w / view.h
      camera.updateProjectionMatrix()
      rebuild()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(page)
    window.addEventListener('resize', resize)
    resize()
    document.fonts?.ready.then(() => rebuild())

    // ---------------------------------------------------------------- pointer
    const ptr = { x: 0, y: 0, on: false }
    const onMove = (e) => {
      if (e.pointerType === 'touch') return
      ptr.x = e.clientX; ptr.y = e.clientY; ptr.on = true
    }
    const onLeave = () => { ptr.on = false }
    window.addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    window.addEventListener('blur', onLeave)

    // ---------------------------------------------------------------- robot
    let robot = null
    let blinker = null
    let alive = true
    loadRobot().then((rb) => {
      if (!alive) return
      robot = rb
      scene.add(rb.rig)
      blinker = createBlinker(rb, { reduce })
      if (reduce) blinker.powerOn(0)
      else {
        rb.setBanner(GREETING)
        setTimeout(() => { if (!alive) return; rb.setBanner(null); blinker.powerOn(40) }, GREETING_MS)
      }
      blinker.start()
    }).catch(() => {})

    const st = {
      mode: 'hero', t: 0, s: 0, v: 0, goal: null, heroE: 1,
      fallFrom: null,
      x: START_X, y: 0, tx: 0, ty: 1, seg: null, scale: HERO_SCALE,
      lookY: 0, lookP: 0, vLY: 0, vLP: 0,
      roll: 0, vRoll: 0, arm: 0, vArm: 0, yawM: 0,
      section: null, settle: 0, idle: 0, gesture: null, exprUntil: 0, lastAct: {},
      portEl: null,
    }
    const halfH = () => (robot ? robot.size.y / 2 : 0.13)
    const heroY = () => L.hatch - halfH() * HERO_SCALE
    // the junction under the hatch: where the fall lands, where it parks, where the climb starts
    const topS = () => L.junctionS
    const entryS = () => 36 + 50 // can roam the whole first lane, up to its end cap
    const endS = () => L.path.length
    const clearOf = (s) => {
      for (const k of L.stops) if (Math.abs(s - k) < 46) return s < k ? k - 46 : k + 46
      return s
    }
    const clampS = (s) => Math.max(entryS(), Math.min(endS(), s))

    const springStep = (pos, vel, goal, w, vmax, dt) => {
      let v = vel + ((goal - pos) * w * w - 2 * w * vel) * dt
      v = Math.max(-vmax, Math.min(vmax, v))
      return [pos + v * dt, v]
    }

    const sectionAt = (yy) => L.sections.find((s) => yy >= s.y0 && yy < s.y1)?.key ?? null

    const playAct = (k, now) => {
      const act = SECTION_ACTS[k]
      if (!act || reduce || !robot) return
      st.gesture = { name: act.gesture, t: now }
      robot.setExpression(act.face)
      st.exprUntil = now + (GESTURES[act.gesture].dur + 1.8) * 1000
      st.lastAct[k] = now
    }

    let prev = performance.now()
    const tick = () => {
      const now = performance.now()
      const dt = Math.min(0.033, (now - prev) / 1000)
      prev = now
      if (!L) return
      const P = L.path

      // camera follows the page scroll (same frame as Lenis)
      const pr = page.getBoundingClientRect()
      view.U = pr.width / 1440
      view.Hu = view.h / view.U
      const scrollU = -pr.top / view.U
      const camX = (view.w / 2 - pr.left) / view.U
      const camY = -(scrollU + view.Hu / 2)
      const dist = (view.Hu / 2) / Math.tan(THREE.MathUtils.degToRad(FOV / 2))
      camera.position.set(camX, camY, dist)
      camera.lookAt(camX, camY, 0)

      // bubbles drift back up the pipe
      if (bubbles) {
        const m = new THREE.Matrix4()
        const a = topS()
        const span = Math.max(1, P.length - HUB - a)
        bubbleData.forEach((b, i) => {
          b.u -= (b.sp * dt) / span
          if (b.u < 0) b.u += 1
          const p = pointAt(P, a + b.u * span)
          const rr = R * 0.62
          const off = b.ox * rr + Math.sin(now / 900 + b.ph) * 4
          m.makeScale(b.r, b.r, b.r).setPosition(p.x - p.ty * off, -(p.y + p.tx * off), b.oz * rr * 0.6)
          bubbles.setMatrixAt(i, m)
        })
        bubbles.instanceMatrix.needsUpdate = true
      }

      if (robot) {
        const t = now / 1000
        const cursor = ptr.on ? { x: (ptr.x - pr.left) / view.U, y: (ptr.y - pr.top) / view.U } : null
        const Hs = halfH()
        const top = pointAt(P, topS())

        // ---- mode transitions
        const pastHero = scrollU
        if (st.mode === 'hero') {
          st.x = START_X; st.y = heroY(); st.scale = HERO_SCALE; st.heroE = 1
          if (pastHero > 40) {
            if (reduce) { st.mode = 'pipe'; st.s = entryS(); st.v = 0 }
            else { st.mode = 'fall'; st.t = now; st.fallFrom = st.y }
          }
        } else if (st.mode === 'fall') {
          const k = Math.min(1, (now - st.t) / 900)
          const hop = 0.2
          const peak = st.fallFrom - 0.12 * Hs * HERO_SCALE
          if (k < hop) {
            st.y = st.fallFrom + (peak - st.fallFrom) * Math.sin((k / hop) * Math.PI / 2)
            st.scale = HERO_SCALE
          } else {
            const q = (k - hop) / (1 - hop)
            st.y = peak + (top.y - peak) * q * q
            st.scale = HERO_SCALE + (PIPE_SCALE - HERO_SCALE) * smooth(Math.min(1, q * 1.15))
          }
          st.x = START_X
          if (k >= 1) {
            st.mode = 'pipe'; st.s = topS()
            st.v = Math.min(1800, (2 * (top.y - peak)) / (0.9 * (1 - hop)))
          }
        } else if (st.mode === 'rise') {
          const k = Math.min(1, (now - st.t) / 640)
          const e = 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2) // ease-out-back
          st.y = top.y + (heroY() - top.y) * e
          st.scale = PIPE_SCALE + (HERO_SCALE - PIPE_SCALE) * smooth(k)
          st.x = START_X
          if (k >= 1) st.mode = 'hero'
        }

        // ---- travel along the S
        if (st.mode === 'pipe') {
          st.scale = PIPE_SCALE
          let goal
          if (st.goal == null) st.goal = st.s
          if (pastHero < 24) { goal = topS(); st.goal = topS() }
          else {
            const cx = cursor ? cursor.x : st.x
            const cy = cursor ? cursor.y : scrollU + view.Hu * 0.55
            // nearest point on the pipe; jumping to a far part of the S must win clearly
            // (hysteresis), otherwise keep tracking within the robot's own stretch of pipe
            const best = closestS(P, cx, cy)
            const local = closestS(P, cx, cy, st.goal - 500, st.goal + 500)
            st.goal = best.d < local.d - 70 ? best.s : local.s
            goal = clearOf(clampS(st.goal))
          }
          ;[st.s, st.v] = springStep(st.s, st.v, goal, reduce ? 30 : 5.6, 2400, dt)
          const p = pointAt(P, st.s)
          st.x = p.x; st.y = p.y; st.tx = p.tx; st.ty = p.ty; st.seg = p.seg

          if (pastHero < 24 && Math.abs(st.s - topS()) < 8 && Math.abs(st.v) < 140) {
            st.mode = reduce ? 'hero' : 'rise'
            st.t = now
          }

          // ---- section acts: play when the robot settles somewhere new (or idles a while)
          const sec = sectionAt(st.y)
          if (Math.abs(st.v) < 50) st.settle += dt; else { st.settle = 0; st.idle = 0 }
          if (sec !== st.section) { st.section = sec; st.idle = 0 }
          if (st.settle > 0.35 && !st.gesture && sec) {
            const last = st.lastAct[sec] || 0
            st.idle += dt
            if (now - last > 9000 || (st.idle > 7 && now - last > 7000)) { playAct(sec, now); st.idle = 0 }
          }
        }

        // ---- gesture offsets
        const o = { dy: 0, yaw: 0, pitch: 0, roll: 0, armL: 0, armR: 0, glow: 1, sq: 1, jx: 0 }
        if (st.gesture) {
          const G = GESTURES[st.gesture.name]
          const k = (now - st.gesture.t) / (G.dur * 1000)
          if (k >= 1 || st.mode !== 'pipe') st.gesture = null
          else G.apply(k, o)
        }
        const piping = st.mode === 'pipe'
        const vx = piping ? st.v * st.tx : 0
        const vy = piping ? st.v * st.ty : st.mode === 'fall' ? 1400 : 0
        if (robot.expression && robot.expression !== 'banner' && now > st.exprUntil) robot.setExpression(null)
        if (piping && st.section === 'process' && Math.abs(vx) > 260 && !st.gesture) {
          robot.setExpression(vx > 0 ? 'right' : 'left')
          st.exprUntil = now + 500
        }

        // ---- motion feel: lean into horizontal runs, arms up when dropping fast
        const rollT = -Math.max(-1, Math.min(1, vx / 900)) * 0.3 + Math.sin(t * 8) * 0.07 * Math.min(1, Math.max(0, vy) / 900)
        ;[st.roll, st.vRoll] = springStep(st.roll, st.vRoll, rollT, 9, 50, dt)
        const armT = Math.max(0, Math.min(1, (vy - 250) / 900)) * 2.3
        ;[st.arm, st.vArm] = springStep(st.arm, st.vArm, armT, 10, 60, dt)
        st.yawM += (Math.max(-1, Math.min(1, vx / 1400)) * 0.35 - st.yawM) * Math.min(1, dt * 8)

        // ---- head follows the cursor (one smooth critically damped spring)
        let ty = 0
        let tp = 0
        if (cursor && !reduce) {
          const nx = (cursor.x - st.x) / 720
          const ny = (cursor.y - (st.y - Hs * st.scale * 0.4)) / (view.Hu * 0.6)
          const hz = st.mode === 'hero' ? st.heroE : 1
          ty = Math.max(-1, Math.min(1, nx)) * THREE.MathUtils.degToRad(st.mode === 'hero' ? 5 + 17 * hz : 28)
          tp = Math.max(-1, Math.min(1, ny)) * THREE.MathUtils.degToRad(st.mode === 'hero' ? 2.5 + 6.5 * hz : 14)
        } else if (!reduce) {
          ty = Math.sin(t * 0.4) * 0.19
          tp = Math.sin(t * 0.27 + 1.1) * 0.06
        }
        ;[st.lookY, st.vLY] = springStep(st.lookY, st.vLY, ty, 11, 20, dt)
        ;[st.lookP, st.vLP] = springStep(st.lookP, st.vLP, tp, 11, 20, dt)

        // ---- apply pose
        const heroBlend = st.mode === 'hero' ? st.heroE : piping ? 0
          : Math.max(0, Math.min(1, (st.scale - PIPE_SCALE) / (HERO_SCALE - PIPE_SCALE)))
        const s = st.scale
        robot.rig.position.set(st.x + o.jx * s, -(st.y + o.dy * Hs * 2 * s), 0)
        robot.rig.scale.set(s, s * o.sq, s)
        robot.rig.rotation.set(HERO_PITCH * heroBlend + o.pitch, HERO_YAW * heroBlend + st.yawM + o.yaw, st.roll + o.roll, 'YXZ')
        robot.head.rotation.y = st.lookY
        robot.head.rotation.x = st.lookP
        if (robot.arms.R) robot.arms.R.rotation.z = -(st.arm + o.armR)
        if (robot.arms.L) robot.arms.L.rotation.z = st.arm + o.armL
        robot.setGlow(o.glow)
        robot.update(t)
        blinker.tick(now)

        // key light + shadow frustum follow the robot
        const ext = 0.32 * s
        key.position.set(st.x - 0.9 * s, -st.y + 1.1 * s, 1.2 * s)
        key.target.position.set(st.x, -st.y, 0)
        Object.assign(key.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 0.2 * s, far: 3.4 * s })
        key.shadow.camera.updateProjectionMatrix()
        key.shadow.normalBias = 0.0015 * s

        // ---- ports: highlight the element under the robot while it runs along a lane
        let portEl = null
        if (piping && st.seg?.kind === 'lane' && L.ports.length) {
          portEl = L.ports.find((pp) => pp.key === st.seg.key && st.x >= pp.x0 && st.x < pp.x1)?.el ?? null
        }
        if (portEl !== st.portEl) {
          st.portEl?.classList.remove('is-robot')
          portEl?.classList.add('is-robot')
          st.portEl = portEl
        }
      }

      renderer.render(scene, camera)
    }
    const off = onFrame(tick)

    return () => {
      alive = false
      off()
      st.portEl?.classList.remove('is-robot')
      ro.disconnect()
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('blur', onLeave)
      blinker?.dispose()
      pmrem.dispose()
      renderer.dispose()
    }
  }, [onFail])

  return <canvas ref={canvasRef} className="pipe-world" aria-hidden="true" />
}
