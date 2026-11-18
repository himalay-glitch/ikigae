import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'framer-motion'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { loadRobot, createBlinker, createEyeDirector } from '../three/robot.js'

/*
  Hero robot — lives inside the rendered pod. The canvas covers the hero exactly like the render
  plate does, and the camera is the Blender render camera (blender/hero_lab/lab_v001.blend):
  Blender (x, y, z) → three (x, z, −y); 1 unit = 1 m. The robot (v012, 18.5 cm, scaled ×6.7) stands on the
  pod's glass hatch, its head follows the cursor, and on scroll it looks down, raises its arms and
  sinks through the hatch into the pipeline (clipped at the platform top). PipeWorld picks the
  journey up in the S-pipe below.

  Eyes (createEyeDirector — stepped, never aimed at the cursor; the head does the looking):
    cursor reaches the robot   → happy ^ ^ with a little head tilt
    hover/focus [data-robot-face] → that face (Apply → star eyes, Explore the pipeline → down chevrons)
    scrolling it down the hatch → down chevrons
    mouse idle for a while      → dozes off (lids droop, head nods); wakes with a surprised pop
    otherwise, every few seconds → a happy blip or a content squint (plus the blinker's own blinks)
  Both eyes always move together; no winks.
*/
const SLEEP_MS = 12000
const NEAR = 0.13 // cursor within this fraction of the frame height of the head = "at the robot"
const faceOf = (t) => (t && t.closest ? t.closest('[data-robot-face]')?.dataset.robotFace : null) ?? null
const CAM = { pos: [-1.04, 1.42, 7.2], fov: 26.8 } // looking straight down −Z
const ROBOT = { scale: 7.6, floor: 0.615, yaw: THREE.MathUtils.degToRad(-22) }
const PLATFORM_TOP = 0.612
const HEAD_BASE = 0.2 // head turned back toward the viewer from the three-quarter body
const YAW_MAX = THREE.MathUtils.degToRad(26)
const PITCH_MAX = THREE.MathUtils.degToRad(12)
const SINK_FROM = 40 // hero units scrolled before it starts to sink
const SINK_SPAN = 230
const GREETING = [{ text: 'HI!', color: '#5B8CFF', scale: 2 }]

export default function HeroRobot() {
  const reduce = useReducedMotion()
  const wrap = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    const el = wrap.current
    let renderer
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true, alpha: true })
    } catch {
      return
    }
    renderer.setClearColor(0x000000, 0)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.NeutralToneMapping
    renderer.localClippingEnabled = true

    // light to match the render: bright white room, window daylight from the left,
    // the pod's cyan ring light overhead and cyan bounce from the glowing platform
    const scene = new THREE.Scene()
    const pmrem = new THREE.PMREMGenerator(renderer)
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environmentIntensity = 0.8
    // crisp white key from the windows (left), soft front fill, a faint cool kiss from the pod's
    // ring light above and the glowing platform below (kept low so the robot stays white)
    const sun = new THREE.DirectionalLight(0xffffff, 2.4)
    sun.position.set(-4, 3.5, 3)
    const front = new THREE.DirectionalLight(0xffffff, 0.9)
    front.position.set(-0.5, 1.6, 5)
    const rimLight = new THREE.DirectionalLight(0xffffff, 1.2)
    rimLight.position.set(3, 2.5, -2)
    const ring = new THREE.PointLight(0xbfe6ff, 2.0, 0, 1.6)
    ring.position.set(0, 2.1, 0)
    const bounce = new THREE.PointLight(0xbfe4ff, 0.8, 0, 1.6)
    bounce.position.set(0, 0.7, 0.5)
    scene.add(sun, front, rimLight, ring, bounce, new THREE.HemisphereLight(0xffffff, 0xd8e6f0, 0.45))

    const camera = new THREE.PerspectiveCamera(CAM.fov, 1.6, 0.05, 100)
    camera.position.fromArray(CAM.pos)
    camera.lookAt(CAM.pos[0], CAM.pos[1], 0)

    const clip = new THREE.Plane(new THREE.Vector3(0, 1, 0), -PLATFORM_TOP) // keeps y ≥ platform top

    // soft contact shadow on the glowing platform (the plate is rendered without the robot)
    const shadowTex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 128
      const g = c.getContext('2d')
      const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64)
      gr.addColorStop(0, 'rgba(20,30,50,0.75)'); gr.addColorStop(0.5, 'rgba(20,30,50,0.35)'); gr.addColorStop(1, 'rgba(20,30,50,0)')
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128)
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
      return t
    })()
    const blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0 }))
    blob.rotation.x = -Math.PI / 2
    blob.position.y = PLATFORM_TOP + 0.003
    scene.add(blob)

    const resize = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      if (!w || !h) return
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(el)
    resize()

    let robot = null
    let blinker = null
    let director = null
    let readyAt = Infinity // eyes take over once the HI! banner and power-on are done
    const fine = window.matchMedia('(pointer: fine)').matches
    let alive = true
    let base = new THREE.Vector3()
    loadRobot().then((rb) => {
      if (!alive) return
      robot = rb
      rb.rig.traverse((o) => { if (o.isMesh) o.material.clippingPlanes = [clip] })
      rb.rig.scale.setScalar(ROBOT.scale)
      rb.rig.rotation.set(0, ROBOT.yaw, 0, 'YXZ')
      // the rig is centred on its bounding box; put the feet on the platform under the
      // Blender robot origin (feet centre), rotating the centre offset with the body
      const c = rb.center.clone().multiplyScalar(ROBOT.scale)
      const off = new THREE.Vector3(c.x, 0, c.z).applyAxisAngle(new THREE.Vector3(0, 1, 0), ROBOT.yaw)
      base = new THREE.Vector3(off.x, ROBOT.floor + (rb.size.y * ROBOT.scale) / 2, off.z)
      rb.rig.position.copy(base)
      scene.add(rb.rig)
      blinker = createBlinker(rb, { reduce })
      if (reduce) blinker.powerOn(0)
      else {
        director = createEyeDirector(rb)
        rb.setBanner(GREETING)
        setTimeout(() => { if (!alive) return; rb.setBanner(null); blinker.powerOn(40); readyAt = performance.now() + 900 }, 2200)
      }
      blinker.start()
    }).catch(() => {})

    // head follows the cursor, relative to the robot's head on screen
    const s = {
      yaw: HEAD_BASE, pitch: 0, vy: 0, vp: 0, ty: HEAD_BASE, tp: 0, pointer: false, arm: 0, va: 0, sink: 0,
      roll: 0, vr: 0, near: false, hoverFace: null, focusFace: null,
      lastMove: performance.now(), nextGesture: 0, blipUntil: 0,
    }
    const headScreen = new THREE.Vector3()
    const onMove = (e) => {
      if (e.pointerType === 'touch' || !robot) return
      const r = el.getBoundingClientRect()
      robot.head.getWorldPosition(headScreen).project(camera)
      const hx = r.left + ((headScreen.x + 1) / 2) * r.width
      const hy = r.top + ((1 - headScreen.y) / 2) * r.height
      const nx = THREE.MathUtils.clamp((e.clientX - hx) / (window.innerWidth * 0.45), -1, 1)
      const ny = THREE.MathUtils.clamp((e.clientY - hy) / (window.innerHeight * 0.6), -1, 1)
      s.ty = HEAD_BASE + nx * YAW_MAX
      s.tp = ny * PITCH_MAX
      s.pointer = true
      s.near = Math.hypot(e.clientX - hx, e.clientY - hy) < r.height * NEAR
      s.lastMove = performance.now()
    }
    const onLeave = () => { s.pointer = false; s.near = false; s.hoverFace = null }
    const onOver = (e) => { if (e.pointerType !== 'touch') s.hoverFace = faceOf(e.target) }
    const onFocusIn = (e) => { s.focusFace = faceOf(e.target) }
    const onFocusOut = () => { s.focusFace = null }
    if (!reduce) {
      window.addEventListener('pointermove', onMove, { passive: true })
      document.documentElement.addEventListener('pointerleave', onLeave)
      document.addEventListener('pointerover', onOver, { passive: true })
      document.addEventListener('focusin', onFocusIn)
      document.addEventListener('focusout', onFocusOut)
    }

    let onScreen = true
    const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting })
    io.observe(el)

    // lights change (theme toggle) → the robot notices: eyes pop wide, wakes up if dozing
    const themeObs = new MutationObserver(() => {
      if (!director || performance.now() < readyAt) return
      s.lastMove = performance.now()
      director.setSleepy(false)
      director.play('surprise')
    })
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    const spring = (pos, vel, goal, w, dt) => {
      const v = vel + ((goal - pos) * w * w - 2 * w * vel) * dt
      return [pos + v * dt, v]
    }
    let raf = 0
    let prev = performance.now()
    const t0 = prev
    const tick = (now) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min(0.033, (now - prev) / 1000)
      prev = now
      if (!robot || !onScreen) return
      const t = (now - t0) / 1000
      // scroll → sink through the hatch
      // desktop: measured on the hero itself (the render frame is scaled/offset inside it);
      // phones: on the frame, so it sinks once the pod reaches the top of the screen
      const r = (el.closest('.hero:not(.is-static)') || el).getBoundingClientRect()
      const U = r.width / 1440
      const scrolled = Math.max(0, -r.top / U)
      const k = THREE.MathUtils.clamp((scrolled - SINK_FROM) / SINK_SPAN, 0, 1)
      s.sink += ((reduce ? k : k * k * (3 - 2 * k)) - s.sink) * Math.min(1, dt * 10)
      // eyes: pick the mood, doze when idle, idle gestures (all stepped, see createEyeDirector)
      if (director && now > readyAt) {
        const cue = s.hoverFace ?? s.focusFace
        const mood = s.sink > 0.02 ? 'down' : cue ?? (s.near || now < s.blipUntil ? 'happy' : null)
        if (mood) s.nextGesture = now + 4500 + Math.random() * 4000 // idle gestures wait after any reaction
        director.setMood(mood)
        director.setSleepy(fine && !mood && now - s.lastMove > SLEEP_MS)
        if (!mood && !director.busy && !director.sleepy) {
          if (!s.nextGesture) s.nextGesture = now + 3500
          else if (now > s.nextGesture) {
            if (Math.random() < 0.55) s.blipUntil = now + 1500
            else director.play('squint')
            s.nextGesture = now + 4500 + Math.random() * 4000
          }
        }
        director.tick(now)
      }
      const dozing = !!director?.sleepy
      let ty = s.ty
      let tp = s.tp
      if (!reduce && !s.pointer) {
        ty = HEAD_BASE + Math.sin(t * 0.4) * YAW_MAX * 0.4
        tp = Math.sin(t * 0.27 + 1.1) * PITCH_MAX * 0.35
      }
      if (dozing) tp += 0.16 + Math.sin(t * 0.9) * 0.025 // head nods forward, slow breathing bob
      if (s.sink > 0.02) { ty = HEAD_BASE * (1 - s.sink); tp = THREE.MathUtils.lerp(tp, 0.35, Math.min(1, s.sink * 2)) }
      const w = s.pointer && !dozing ? 10 : 4
      ;[s.yaw, s.vy] = spring(s.yaw, s.vy, ty, w, dt)
      ;[s.pitch, s.vp] = spring(s.pitch, s.vp, tp, w, dt)
      ;[s.roll, s.vr] = spring(s.roll, s.vr, director?.mood === 'happy' ? 0.14 : 0, 8, dt) // happy head tilt
      ;[s.arm, s.va] = spring(s.arm, s.va, Math.min(1, s.sink * 2.5) * 2.4, 9, dt)
      robot.head.rotation.y = s.yaw
      robot.head.rotation.x = s.pitch
      robot.head.rotation.z = s.roll
      if (robot.arms.R) robot.arms.R.rotation.z = -s.arm
      if (robot.arms.L) robot.arms.L.rotation.z = s.arm
      const H = robot.size.y * ROBOT.scale
      const breathe = reduce ? 0 : Math.sin(t * 1.1) * 0.006 * (1 - s.sink)
      robot.rig.position.set(base.x, base.y + breathe - s.sink * (H + 0.25), base.z)
      robot.rig.visible = s.sink < 0.999
      blob.position.x = base.x
      blob.position.z = base.z + 0.02
      blob.scale.set(robot.size.x * ROBOT.scale * 1.05, robot.size.z * ROBOT.scale * 1.5, 1)
      blob.material.opacity = 0.55 * (1 - Math.min(1, s.sink * 3))
      robot.update(t)
      blinker.tick(now)
      renderer.render(scene, camera)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      themeObs.disconnect()
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
      document.removeEventListener('pointerover', onOver)
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
      blinker?.dispose()
      pmrem.dispose()
      renderer.dispose()
    }
  }, [reduce])

  return (
    <div className="hero-robot" ref={wrap} role="img" aria-label="Ikigai robot mascot inside the glass pod: a white robot with a black visor and glowing cyan eyes">
      <canvas ref={canvasRef} className="hero-robot-canvas" />
    </div>
  )
}
