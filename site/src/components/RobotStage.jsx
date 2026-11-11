import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { loadRobot, createBlinker } from '../three/robot.js'

/*
  Standalone hero robot (phones/tablets, or if the page-wide PipeWorld can't start).
  Same rig as PipeWorld; the camera reproduces the Blender hero camera (85 mm, lens shift).
*/
const CAM = {
  pos: [0.5034, 0.3, 1.19858],
  fwd: [-0.38717, -0.01745, -0.92184],
  up: [-0.00676, 0.99985, -0.01609],
  yfov: 23.913,
  shiftY: 0.45825,
}
const YAW_MAX = THREE.MathUtils.degToRad(22)
const PITCH_MAX = THREE.MathUtils.degToRad(9)

export default function RobotStage() {
  const reduce = useReducedMotion()
  const stage = useRef(null)
  const canvasRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const el = stage.current
    let renderer
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true, alpha: true })
    } catch {
      setFailed(true)
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
    key.position.set(-0.9, 1.1, 1.2)
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    Object.assign(key.shadow.camera, { left: -0.35, right: 0.35, top: 0.45, bottom: -0.3, near: 0.5, far: 3 })
    key.shadow.bias = -0.0004
    key.shadow.normalBias = 0.0015
    key.shadow.radius = 4
    const fill = new THREE.DirectionalLight(0xf2f2ff, 0.55)
    fill.position.set(1.3, 0.35, 0.8)
    const rim = new THREE.DirectionalLight(0xffffff, 1.4)
    rim.position.set(0.6, 0.9, -1.1)
    scene.add(key, fill, rim, new THREE.HemisphereLight(0xffffff, 0xcfcfd2, 0.35))

    const camera = new THREE.PerspectiveCamera(CAM.yfov, 1, 0.05, 20)
    camera.position.fromArray(CAM.pos)
    camera.up.fromArray(CAM.up)
    camera.lookAt(new THREE.Vector3().fromArray(CAM.pos).add(new THREE.Vector3().fromArray(CAM.fwd)))
    camera.setViewOffset(1000, 1000, 0, CAM.shiftY * 1000, 1000, 1000)

    const resize = () => {
      const w = el.clientWidth
      if (!w) return
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      renderer.setSize(w, w, false)
    }
    const ro = new ResizeObserver(resize)
    ro.observe(el)
    resize()

    const s = { yaw: 0, pitch: 0, vy: 0, vp: 0, ty: 0, tp: 0, pointer: false }
    let robot = null
    let blinker = null
    let alive = true
    loadRobot().then((rb) => {
      if (!alive) return
      robot = rb
      rb.rig.position.copy(rb.center)
      scene.add(rb.rig)
      blinker = createBlinker(rb, { reduce })
      blinker.powerOn(1100)
      blinker.start()
      setReady(true)
    }).catch(() => setFailed(true))

    const onMove = (e) => {
      if (e.pointerType === 'touch') return
      const r = el.getBoundingClientRect()
      const nx = THREE.MathUtils.clamp((e.clientX - (r.left + r.width * 0.45)) / (window.innerWidth * 0.5), -1, 1)
      const ny = THREE.MathUtils.clamp((e.clientY - (r.top + r.height * 0.26)) / (window.innerHeight * 0.6), -1, 1)
      s.ty = nx * YAW_MAX
      s.tp = ny * PITCH_MAX
      s.pointer = true
    }
    const onLeave = () => { s.pointer = false; s.ty = 0; s.tp = 0 }
    if (!reduce) {
      window.addEventListener('pointermove', onMove, { passive: true })
      document.documentElement.addEventListener('pointerleave', onLeave)
    }

    let raf = 0
    let prev = performance.now()
    const t0 = prev
    const tick = (now) => {
      const dt = Math.min(0.033, (now - prev) / 1000)
      prev = now
      if (robot) {
        if (!reduce && !s.pointer) {
          const t = (now - t0) / 1000
          s.ty = Math.sin(t * 0.4) * YAW_MAX * 0.5
          s.tp = Math.sin(t * 0.27 + 1.1) * PITCH_MAX * 0.4
        }
        const w = s.pointer ? 11 : 4
        s.vy += ((s.ty - s.yaw) * w * w - 2 * w * s.vy) * dt
        s.vp += ((s.tp - s.pitch) * w * w - 2 * w * s.vp) * dt
        s.yaw += s.vy * dt
        s.pitch += s.vp * dt
        robot.head.rotation.y = s.yaw
        robot.head.rotation.x = s.pitch
        blinker.tick(now)
        renderer.render(scene, camera)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
      blinker?.dispose()
      pmrem.dispose()
      renderer.dispose()
    }
  }, [reduce])

  return (
    <motion.div
      className="robot-stage"
      ref={stage}
      initial={{ opacity: 0, y: 40 }}
      animate={ready || failed ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
      role="img"
      aria-label="Ikigai robot mascot: a white cube-bodied robot with a black glass visor face"
    >
      <canvas ref={canvasRef} className="robot-canvas" />
      {failed && <img className="robot-poster" src="/hero/robot-poster.webp" alt="" />}
    </motion.div>
  )
}
