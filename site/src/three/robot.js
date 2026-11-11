import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { FONT5 } from '../lib/font5.js'

/*
  Shared robot rig: loads the Blender GLB, swaps in tuned materials, adds the visor screen,
  LED eyes (stepped robotic blink) and an expression display, and builds shoulder pivots so
  the arms can gesture. Used by the page-wide PipeWorld scene and the mobile RobotStage.

  The returned `rig` is a Group whose origin sits at the robot's bounding-box centre and whose
  size is normalised to metres; callers scale it.
*/

export const VISOR = { x: 0.00005, y: 0.1, z: 0.1034, w: 0.176, h: 0.142, r: 0.022 }
const EYE = { dx: 0.032, y: 0.096, r: 0.0132 }

const MATS = {
  M_Shell_Main: { color: '#ECEBEF', roughness: 0.34, clearcoat: 0.35, clearcoatRoughness: 0.2 },
  M_Accent: { color: '#D6D4DA', roughness: 0.42 },
  M_Joint_Metal: { color: '#A9A8AE', roughness: 0.3, metalness: 1 },
  M_Rubber: { color: '#2F2E33', roughness: 0.72 },
  M_Details: { color: '#BEBCC2', roughness: 0.38 },
  M_Backpack: { color: '#DCDADF', roughness: 0.45 },
  M_LED_Red: { color: '#FF5A12', emissive: '#FF4A00', emissiveIntensity: 0.6 },
  M_FX_Glow: { color: '#FF6A1A', emissive: '#FF4A00', emissiveIntensity: 0.4 },
  M_FX_Seam: { color: '#CFCDD2', roughness: 0.4 },
  M_Chrome: { color: '#DDE0E4', roughness: 0.12, metalness: 1 },
  M_Deck_Dark: { color: '#2F2E33', roughness: 0.6 },
  M_Visor_Glass: { color: '#100D0E', roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.03 },
  M_Visor_Bezel: { color: '#9A999F', roughness: 0.28, metalness: 1 },
  M_Status_Orange: { color: '#FE5A10', emissive: '#FF4200', emissiveIntensity: 0.38, roughness: 0.35 },
}

// stepped, display-like blink: discrete heights, no easing
export const BLINK = [1, 0.64, 0.3, 0.12, 0.12, 0.12, 0.3, 0.64, 1]
export const POWER_ON = [0, 0.12, 0.12, 0, 0.12, 0.46, 0.78, 1]
export const STEP_MS = 34

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function gridTexture() {
  const W = 1024
  const H = Math.round((W * VISOR.h) / VISOR.w)
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const ctx = c.getContext('2d')
  roundedRect(ctx, 0, 0, W, H, (VISOR.r / VISOR.w) * W)
  ctx.clip()
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, 'rgba(66,24,30,0.34)')
  g.addColorStop(1, 'rgba(40,14,18,0.22)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  const cell = W / 9
  ctx.strokeStyle = 'rgba(255,214,220,0.11)'
  ctx.lineWidth = 2
  for (let x = (W % cell) / 2; x <= W; x += cell) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
  for (let y = (H % cell) / 2; y <= H; y += cell) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

function eyeTexture() {
  const S = 256
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')
  ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2); ctx.closePath()
  ctx.fillStyle = '#fff'; ctx.fill()
  ctx.save(); ctx.clip()
  ctx.fillStyle = 'rgba(60,24,30,0.12)'
  for (let y = 0; y < S; y += 14) ctx.fillRect(0, y + 10, S, 4)
  ctx.restore()
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function glowTexture() {
  const S = 256
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
  g.addColorStop(0, 'rgba(255,240,236,0.9)')
  g.addColorStop(0.35, 'rgba(255,214,205,0.35)')
  g.addColorStop(1, 'rgba(255,200,190,0)')
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/* ------------------------------------------------------------------ expression display
   A canvas the size of the visor. Static faces draw once; animated ones (scan, load) redraw
   each frame while active. Coordinates mirror the LED eye positions. */
const FW = 1024
const FH = Math.round((FW * VISOR.h) / VISOR.w)
const EX = (EYE.dx / VISOR.w) * FW
const EY = FH / 2 + ((VISOR.y - EYE.y) / VISOR.h) * FH
const ER = (EYE.r / VISOR.w) * FW

function star(ctx, x, y, r) {
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 ? r * 0.45 : r
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
  }
  ctx.closePath(); ctx.fill()
}
function heart(ctx, x, y, r) {
  ctx.beginPath()
  ctx.moveTo(x, y + r * 0.9)
  ctx.bezierCurveTo(x - r * 1.5, y - r * 0.1, x - r * 0.75, y - r * 1.15, x, y - r * 0.4)
  ctx.bezierCurveTo(x + r * 0.75, y - r * 1.15, x + r * 1.5, y - r * 0.1, x, y + r * 0.9)
  ctx.fill()
}

const FACES = {
  happy(ctx) {
    ctx.lineWidth = ER * 0.62; ctx.lineCap = 'round'
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.arc(FW / 2 + s * EX, EY + ER * 0.55, ER * 1.05, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke()
    }
  },
  star(ctx) { for (const s of [-1, 1]) star(ctx, FW / 2 + s * EX, EY, ER * 1.45) },
  heart(ctx) { for (const s of [-1, 1]) heart(ctx, FW / 2 + s * EX, EY, ER * 1.15) },
  question(ctx) {
    ctx.font = `700 ${ER * 3}px 'Inter Variable', Inter, system-ui, sans-serif`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.beginPath(); ctx.arc(FW / 2 - EX, EY, ER, 0, Math.PI * 2); ctx.fill()
    ctx.fillText('?', FW / 2 + EX, EY + ER * 0.1)
  },
  right(ctx) { FACES._chev(ctx, 1) },
  left(ctx) { FACES._chev(ctx, -1) },
  _chev(ctx, d) {
    ctx.lineWidth = ER * 0.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    for (const s of [-1, 1]) {
      const x = FW / 2 + s * EX
      ctx.beginPath(); ctx.moveTo(x - d * ER * 0.55, EY - ER); ctx.lineTo(x + d * ER * 0.55, EY); ctx.lineTo(x - d * ER * 0.55, EY + ER); ctx.stroke()
    }
  },
  load(ctx, t) {
    const w = EX * 2 + ER * 2.4
    const x0 = FW / 2 - w / 2
    const h = ER * 1.1
    ctx.lineWidth = ER * 0.22
    roundedRect(ctx, x0, EY - h / 2, w, h, h / 2); ctx.stroke()
    const p = Math.min(1, (t % 2.2) / 1.8)
    const pad = ER * 0.3
    const fw = Math.max(h - pad * 2, (w - pad * 2) * p)
    roundedRect(ctx, x0 + pad, EY - h / 2 + pad, fw, h - pad * 2, (h - pad * 2) / 2); ctx.fill()
  },
  scan(ctx, t) {
    for (const s of [-1, 1]) {
      roundedRect(ctx, FW / 2 + s * EX - ER, EY - ER * 0.28, ER * 2, ER * 0.56, ER * 0.28); ctx.fill()
    }
    const y = FH * 0.2 + ((Math.sin(t * 3.2) + 1) / 2) * FH * 0.6
    ctx.globalAlpha = 0.55
    ctx.fillRect(FW * 0.12, y - 2, FW * 0.76, 4)
    ctx.globalAlpha = 1
  },
}
const ANIMATED = new Set(['load', 'scan'])


/* ------------------------------------------------------------------ LED banner
   The visor doubles as a dot-matrix display: a 5×7 pixel font, lit dots glow, the rest of
   the matrix stays faintly visible. Text types in column by column. */
const LED_COLS = 53
const LED_ROWS = Math.round(LED_COLS * (VISOR.h / VISOR.w))
const LED_PITCH = FW / LED_COLS

/* lines: [{ text, color }] → list of lit dots { c, r, color } centred on the matrix */
function bannerDots(lines) {
  // each font pixel can be drawn as a k×k block of LEDs (scale) for short, bold words
  const out = []
  const blockH = lines.reduce((h, l) => h + 7 * (l.scale || 1), 0) + (lines.length - 1) * 3
  let r0 = Math.round((LED_ROWS - blockH) / 2)
  for (const { text, color, scale = 1 } of lines) {
    const w = (text.length * 6 - 1) * scale
    const c0 = Math.round((LED_COLS - w) / 2)
    ;[...text.toUpperCase()].forEach((ch, i) => {
      const rows = (FONT5[ch] || FONT5[' ']).split('|')
      rows.forEach((row, ry) => [...row].forEach((v, cx) => {
        if (v !== '#') return
        for (let a = 0; a < scale; a++) for (let b = 0; b < scale; b++) {
          out.push({ c: c0 + (i * 6 + cx) * scale + a, r: r0 + ry * scale + b, color })
        }
      }))
    })
    r0 += 7 * scale + 3
  }
  return out
}

let ledBase = null
function ledBaseCanvas() {
  if (ledBase) return ledBase
  ledBase = document.createElement('canvas')
  ledBase.width = FW; ledBase.height = FH
  const ctx = ledBase.getContext('2d')
  roundedRect(ctx, 0, 0, FW, FH, (VISOR.r / VISOR.w) * FW)
  ctx.clip()
  ctx.fillStyle = 'rgba(255,214,220,0.07)'
  for (let r = 0; r < LED_ROWS; r++) for (let c = 0; c < LED_COLS; c++) {
    ctx.beginPath(); ctx.arc((c + 0.5) * LED_PITCH, (r + 0.5) * LED_PITCH + (FH - LED_ROWS * LED_PITCH) / 2, LED_PITCH * 0.3, 0, Math.PI * 2); ctx.fill()
  }
  return ledBase
}

function drawBanner(ctx, dots, k) {
  ctx.drawImage(ledBaseCanvas(), 0, 0)
  const oy = (FH - LED_ROWS * LED_PITCH) / 2
  for (const d of dots) {
    // type-in sweep with a little flicker at the leading edge
    const reveal = k * (LED_COLS + 8) - d.c
    if (reveal < 0) continue
    if (reveal < 3 && Math.random() < 0.35) continue
    ctx.fillStyle = d.color
    ctx.shadowColor = d.color
    ctx.shadowBlur = LED_PITCH * 0.7
    ctx.beginPath(); ctx.arc((d.c + 0.5) * LED_PITCH, (d.r + 0.5) * LED_PITCH + oy, LED_PITCH * 0.36, 0, Math.PI * 2); ctx.fill()
  }
}

/* ------------------------------------------------------------------ loader */
export function loadRobot({ onError } = {}) {
  return new Promise((resolve, reject) => {
    const draco = new DRACOLoader().setDecoderPath('/draco/')
    const loader = new GLTFLoader().setDRACOLoader(draco)
    loader.load('/models/robot.glb', (gltf) => {
      draco.dispose()
      resolve(buildRig(gltf.scene))
    }, undefined, (e) => { draco.dispose(); onError?.(e); reject(e) })
  })
}

function buildRig(root) {
  root.traverse((o) => {
    if (!o.isMesh) return
    o.castShadow = true
    o.receiveShadow = true
    const spec = MATS[o.material?.name]
    if (spec) {
      const m = new THREE.MeshPhysicalMaterial({
        color: spec.color,
        roughness: spec.roughness ?? 0.4,
        metalness: spec.metalness ?? 0,
        clearcoat: spec.clearcoat ?? 0,
        clearcoatRoughness: spec.clearcoatRoughness ?? 0.1,
        emissive: spec.emissive ?? '#000000',
        emissiveIntensity: spec.emissiveIntensity ?? 0,
      })
      m.name = o.material.name
      o.material.dispose()
      o.material = m
    }
  })
  const stage = root.getObjectByName('Stage')
  if (stage) stage.parent.remove(stage)

  const head = root.getObjectByName('Head')
  head.rotation.order = 'YXZ'

  // glow materials, so callers can pulse them
  const glowMats = []
  root.traverse((o) => {
    if (o.isMesh && (o.material.name === 'M_FX_Glow' || o.material.name === 'M_LED_Red')) {
      if (!glowMats.includes(o.material)) glowMats.push(o.material)
    }
  })
  glowMats.forEach((m) => { m.userData.base = m.emissiveIntensity })

  // shoulder pivots: re-parent each arm chain under a group at the shoulder ball
  root.updateMatrixWorld(true)
  const arms = {}
  for (const side of ['L', 'R']) {
    const ball = root.getObjectByName(`GLB_RB_Shoulder_Ball_${side}`)
    if (!ball) continue
    const c = new THREE.Box3().setFromObject(ball).getCenter(new THREE.Vector3())
    const pivot = new THREE.Group()
    pivot.name = `ArmPivot_${side}`
    pivot.position.copy(head.worldToLocal(c.clone()))
    head.add(pivot)
    pivot.updateMatrixWorld(true)
    const re = new RegExp(`^GLB_(RB_(Shoulder_Ball|Arm_Upper|Arm_Fore|Arm_Collar|Finger\\d_[AB]|Thumb_[AB])|FX_(Band_Elbow|Ring_Palm|Ring_Collar))_${side}$`)
    const parts = head.children.filter((o) => re.test(o.name))
    parts.forEach((p) => pivot.attach(p))
    arms[side] = pivot
  }

  // normalise: centre the robot on its bounding box (metres)
  const box = new THREE.Box3().setFromObject(root)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  root.position.sub(center)
  const rig = new THREE.Group()
  rig.name = 'RobotRig'
  rig.add(root)

  // visor screen + eyes on the head so they turn with it
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(VISOR.w, VISOR.h),
    new THREE.MeshBasicMaterial({ map: gridTexture(), transparent: true, depthWrite: false }),
  )
  screen.position.set(VISOR.x, VISOR.y, VISOR.z)
  screen.renderOrder = 1
  head.add(screen)

  const eyeMat = new THREE.MeshBasicMaterial({ map: eyeTexture(), transparent: true, depthWrite: false, toneMapped: false })
  const glowMat = new THREE.MeshBasicMaterial({
    map: glowTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.55, toneMapped: false,
  })
  const eyes = []
  for (const sx of [-1, 1]) {
    const g = new THREE.Group()
    g.position.set(VISOR.x + sx * EYE.dx, EYE.y, VISOR.z + 0.0004)
    const disc = new THREE.Mesh(new THREE.PlaneGeometry(EYE.r * 2, EYE.r * 2), eyeMat)
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(EYE.r * 5.2, EYE.r * 5.2), glowMat)
    glow.position.z = -0.0002
    glow.renderOrder = 2
    disc.renderOrder = 3
    g.add(glow, disc)
    g.scale.set(1, 0.0001, 1)
    head.add(g)
    eyes.push(g)
  }

  // expression display
  const fc = document.createElement('canvas')
  fc.width = FW; fc.height = FH
  const fctx = fc.getContext('2d')
  const faceTex = new THREE.CanvasTexture(fc)
  faceTex.colorSpace = THREE.SRGBColorSpace
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(VISOR.w, VISOR.h),
    new THREE.MeshBasicMaterial({ map: faceTex, transparent: true, depthWrite: false, toneMapped: false }),
  )
  face.position.set(VISOR.x, VISOR.y, VISOR.z + 0.0006)
  face.renderOrder = 4
  face.visible = false
  head.add(face)

  let expr = null
  let eyeOpen = 0
  let banner = null // { dots, t0 }
  const drawFace = (t) => {
    fctx.clearRect(0, 0, FW, FH)
    if (!expr) return
    if (expr === 'banner') {
      fctx.save()
      drawBanner(fctx, banner.dots, Math.min(1, (t - banner.t0) / 1.1))
      fctx.restore()
      faceTex.needsUpdate = true
      return
    }
    fctx.save()
    fctx.fillStyle = '#fff'
    fctx.strokeStyle = '#fff'
    fctx.shadowColor = 'rgba(255,214,205,0.9)'
    fctx.shadowBlur = ER * 0.9
    FACES[expr](fctx, t)
    fctx.restore()
    faceTex.needsUpdate = true
  }

  const api = {
    rig, root, head, arms, eyes, size, center, glowMats,
    get expression() { return expr },
    /* LED text on the visor (null clears it); lines = [{ text, color }] */
    setBanner(lines) {
      if (!lines) { if (expr === 'banner') { expr = null; face.visible = false; eyes.forEach((e) => { e.visible = true }); drawFace(0) } return }
      banner = { dots: bannerDots(lines), t0: performance.now() / 1000 }
      expr = 'banner'
      face.visible = true
      eyes.forEach((e) => { e.visible = false })
      drawFace(banner.t0)
    },
    setExpression(name) {
      const n = name && FACES[name] ? name : null
      if (n === expr) return
      expr = n
      face.visible = !!n
      eyes.forEach((e) => { e.visible = !n })
      drawFace(performance.now() / 1000)
    },
    setEyeOpen(v) { eyeOpen = v; for (const e of eyes) e.scale.y = Math.max(0.0001, v) },
    get eyeOpen() { return eyeOpen },
    /* per-frame: animated faces; returns true when something changed */
    update(t) {
      if (expr === 'banner') { if (t - banner.t0 < 1.3) { drawFace(t); return true } return false }
      if (expr && ANIMATED.has(expr)) { drawFace(t); return true }
      return false
    },
    setGlow(k) { glowMats.forEach((m) => { m.emissiveIntensity = m.userData.base * k }) },
  }
  return api
}

/* stepped blink sequencer */
export function createBlinker(robot, { reduce = false } = {}) {
  let anim = null
  let timer = 0
  let alive = true
  const run = (seq) => { anim = { seq, t: performance.now() } }
  const schedule = () => {
    timer = setTimeout(() => {
      if (!alive) return
      if (!anim) {
        run(BLINK)
        if (Math.random() < 0.22) setTimeout(() => alive && !anim && run(BLINK), BLINK.length * STEP_MS + 120)
      }
      schedule()
    }, 2800 + Math.random() * 3200)
  }
  return {
    powerOn(delay = 1100) { setTimeout(() => alive && run(reduce ? [1] : POWER_ON), delay) },
    start() { if (!reduce) schedule() },
    blink() { if (!anim) run(BLINK) },
    /* returns true when the eyes changed this frame */
    tick(now) {
      if (!anim) return false
      const i = Math.floor((now - anim.t) / STEP_MS)
      robot.setEyeOpen(anim.seq[Math.min(i, anim.seq.length - 1)])
      if (i >= anim.seq.length - 1) anim = null
      return true
    },
    dispose() { alive = false; clearTimeout(timer) },
  }
}
