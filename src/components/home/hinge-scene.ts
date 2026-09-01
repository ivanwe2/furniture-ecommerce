// Real-time WebGL cabinet-hinge scene — the homepage hero backdrop (redesign
// R3). Ported from the design handoff's Three.js prototype (`_buildHinge` /
// `_makeScene` / `_frame`). Pure setup + animation; `three` itself is injected
// by the client island (which dynamically imports it) so it stays out of the
// initial JS bundle. `startHinge` returns a cleanup that stops the RAF loop,
// detaches pointer listeners, disconnects the ResizeObserver, and disposes GPU
// resources.

import type { RoomEnvironment as RoomEnvironmentClass } from 'three/examples/jsm/environments/RoomEnvironment.js'
import type { RoundedBoxGeometry as RoundedBoxGeometryClass } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

type ThreeModule = typeof import('three')
type Obj3D = InstanceType<ThreeModule['Object3D']>
type Vec3 = InstanceType<ThreeModule['Vector3']>

export interface HingeDeps {
  THREE: ThreeModule
  RoomEnvironment: typeof RoomEnvironmentClass
  RoundedBoxGeometry: typeof RoundedBoxGeometryClass
}

interface ExplodePart {
  obj: Obj3D
  base: Vec3
  exp: Vec3
}

/** Procedural brushed-metal roughness map: grey base + faint horizontal streaks. */
function brushedTexture(THREE: ThreeModule) {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 512
  const g = c.getContext('2d')
  if (g) {
    g.fillStyle = 'rgb(138,138,138)'
    g.fillRect(0, 0, 512, 512)
    for (let i = 0; i < 4200; i++) {
      const v = (90 + Math.random() * 110) | 0
      g.strokeStyle = `rgba(${v},${v},${v},0.35)`
      g.lineWidth = 0.5 + Math.random()
      const y = Math.random() * 512
      g.beginPath()
      g.moveTo(0, y)
      g.lineTo(512, y + (Math.random() - 0.5) * 3)
      g.stroke()
    }
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.anisotropy = 4
  return tex
}

/** Build the hinge group: two leaves, a chamfered knuckle barrel, bronze pin,
 *  countersunk screws — each tagged with a per-part explode offset vector. */
function buildHinge(deps: HingeDeps) {
  const { THREE, RoundedBoxGeometry: RB } = deps
  const group = new THREE.Group()
  const brush = brushedTexture(THREE)
  const brush2 = brush.clone()
  brush2.needsUpdate = true
  brush2.repeat.set(2, 2)

  const steel = new THREE.MeshPhysicalMaterial({ color: 0xd8dbe0, metalness: 1, roughness: 0.34, roughnessMap: brush, envMapIntensity: 1.55, clearcoat: 0.55, clearcoatRoughness: 0.22 })
  const steelAlt = new THREE.MeshPhysicalMaterial({ color: 0xb9bec6, metalness: 1, roughness: 0.44, roughnessMap: brush2, envMapIntensity: 1.4, clearcoat: 0.4, clearcoatRoughness: 0.3 })
  const bronze = new THREE.MeshPhysicalMaterial({ color: 0xbe8c4c, metalness: 1, roughness: 0.36, roughnessMap: brush2, envMapIntensity: 1.4, clearcoat: 0.45, clearcoatRoughness: 0.28 })
  const screwMat = new THREE.MeshPhysicalMaterial({ color: 0x787c83, metalness: 1, roughness: 0.38, clearcoat: 0.3 })
  const slotMat = new THREE.MeshStandardMaterial({ color: 0x26282c, metalness: 0.6, roughness: 0.75 })

  const LW = 1.7
  const LH = 2.7
  const LT = 0.11
  const plateGeo = new RB(LW, LH, LT, 4, 0.03)
  const recessGeo = new THREE.CylinderGeometry(0.155, 0.155, 0.03, 28)
  const bevelGeo = new THREE.CylinderGeometry(0.115, 0.15, 0.04, 28)
  const headGeo = new THREE.CylinderGeometry(0.112, 0.116, 0.05, 28)
  const slotGeo = new THREE.BoxGeometry(0.17, 0.022, 0.05)

  const explode: ExplodePart[] = []

  const mkScrew = (x: number, y: number, dir: number) => {
    const s = new THREE.Group()
    const recess = new THREE.Mesh(recessGeo, slotMat)
    recess.rotation.x = Math.PI / 2
    const bevel = new THREE.Mesh(bevelGeo, screwMat)
    bevel.rotation.x = Math.PI / 2
    bevel.position.z = 0.025
    const head = new THREE.Mesh(headGeo, screwMat)
    head.rotation.x = Math.PI / 2
    head.position.z = 0.05
    const s1 = new THREE.Mesh(slotGeo, slotMat)
    s1.position.z = 0.078
    const s2 = new THREE.Mesh(slotGeo, slotMat)
    s2.position.z = 0.078
    s2.rotation.z = Math.PI / 2
    s.add(recess, bevel, head, s1, s2)
    s.position.set(x, y, LT / 2 + 0.005)
    explode.push({ obj: s, base: s.position.clone(), exp: new THREE.Vector3(dir * 0.35, 0, 1.15) })
    return s
  }

  // fixed leaf
  const leafA = new THREE.Group()
  leafA.add(new THREE.Mesh(plateGeo, steel))
  ;[0.9, 0, -0.9].forEach((y) => leafA.add(mkScrew(-LW / 2 + 0.34, y, -1)))
  leafA.position.x = -(LW / 2 + 0.14)
  explode.push({ obj: leafA, base: leafA.position.clone(), exp: new THREE.Vector3(-1.7, 0, 0) })
  group.add(leafA)

  // moving leaf on a pivot
  const pivotB = new THREE.Group()
  const leafB = new THREE.Group()
  leafB.add(new THREE.Mesh(plateGeo, steel))
  ;[0.9, 0, -0.9].forEach((y) => leafB.add(mkScrew(LW / 2 - 0.34, y, 1)))
  leafB.position.x = LW / 2 + 0.14
  pivotB.add(leafB)
  explode.push({ obj: pivotB, base: pivotB.position.clone(), exp: new THREE.Vector3(1.7, 0, 0) })
  group.add(pivotB)

  // knuckle segments (machined barrel with chamfered ends)
  const segH = LH / 5
  const knGeo = new THREE.CylinderGeometry(0.17, 0.17, segH * 0.9, 36)
  const chamGeo = new THREE.CylinderGeometry(0.175, 0.16, 0.03, 36)
  for (let i = 0; i < 5; i++) {
    const kg = new THREE.Group()
    kg.add(new THREE.Mesh(knGeo, i % 2 === 0 ? steel : steelAlt))
    const top = new THREE.Mesh(chamGeo, steelAlt)
    top.position.y = segH * 0.45
    kg.add(top)
    const bot = new THREE.Mesh(chamGeo, steelAlt)
    bot.position.y = -segH * 0.45
    bot.rotation.x = Math.PI
    kg.add(bot)
    kg.position.y = LH / 2 - segH / 2 - i * segH
    explode.push({ obj: kg, base: kg.position.clone(), exp: new THREE.Vector3(0, (i % 2 ? -1 : 1) * 0.22, 0.25) })
    group.add(kg)
  }

  // bronze pin with chamfered cap
  const pin = new THREE.Group()
  pin.add(new THREE.Mesh(new THREE.CylinderGeometry(0.076, 0.076, LH + 0.4, 28), bronze))
  const pinCap = new THREE.Mesh(new THREE.CylinderGeometry(0.098, 0.076, 0.08, 28), bronze)
  pinCap.position.y = (LH + 0.4) / 2 + 0.02
  pin.add(pinCap)
  explode.push({ obj: pin, base: pin.position.clone(), exp: new THREE.Vector3(0, 2.0, 0) })
  group.add(pin)

  group.rotation.x = -0.12
  return { group, pivotB, explode }
}

function makeScene(canvas: HTMLCanvasElement, deps: HingeDeps) {
  const { THREE, RoomEnvironment } = deps
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.24
  renderer.outputColorSpace = THREE.SRGBColorSpace

  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.02).texture

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100)
  camera.position.set(0, 0, 8.4)

  const key = new THREE.DirectionalLight(0xfff2df, 2.5)
  key.position.set(4, 6, 6)
  scene.add(key)
  const rim = new THREE.DirectionalLight(0xd8e2ff, 1.35)
  rim.position.set(-5, 2, -4)
  scene.add(rim)
  const fill = new THREE.DirectionalLight(0xffe4c4, 0.7)
  fill.position.set(-2, -4, 3)
  scene.add(fill)
  scene.add(new THREE.AmbientLight(0xffffff, 0.2))

  const hinge = buildHinge(deps)
  scene.add(hinge.group)

  return { renderer, scene, camera, pmrem, ...hinge }
}

/**
 * Start the hinge animation on `canvas`. `stage`, when present, is the element
 * whose pointer position drives the parallax sway (the hero container).
 * Returns a cleanup function; call it on unmount.
 */
export function startHinge(
  canvas: HTMLCanvasElement,
  deps: HingeDeps,
  stage: HTMLElement | null,
): () => void {
  const inst = makeScene(canvas, deps)
  const state = { px: 0, py: 0, tpx: 0, tpy: 0 }

  const resize = () => {
    const r = canvas.getBoundingClientRect()
    const w = Math.max(1, r.width)
    const h = Math.max(1, r.height)
    inst.renderer.setSize(w, h, false)
    inst.camera.aspect = w / h
    inst.camera.updateProjectionMatrix()
  }
  resize()
  const ro = new ResizeObserver(resize)
  ro.observe(canvas)

  let detachPointer = () => {}
  if (stage) {
    const s = stage
    const onMove = (ev: PointerEvent) => {
      const r = s.getBoundingClientRect()
      state.tpx = ((ev.clientX - r.left) / r.width) * 2 - 1
      state.tpy = ((ev.clientY - r.top) / r.height) * 2 - 1
    }
    const onLeave = () => {
      state.tpx = 0
      state.tpy = 0
    }
    s.addEventListener('pointermove', onMove)
    s.addEventListener('pointerleave', onLeave)
    detachPointer = () => {
      s.removeEventListener('pointermove', onMove)
      s.removeEventListener('pointerleave', onLeave)
    }
  }

  const smooth = (x: number) => {
    const c = Math.max(0, Math.min(1, x))
    return c * c * (3 - 2 * c)
  }

  const start = performance.now()
  let raf = 0
  let alive = true
  const loop = (now: number) => {
    if (!alive) return
    const t = (now - start) / 1000
    const cyc = (t * 0.085) % 1
    let e: number
    if (cyc < 0.16) e = 0
    else if (cyc < 0.4) e = smooth((cyc - 0.16) / 0.24)
    else if (cyc < 0.62) e = 1
    else if (cyc < 0.86) e = 1 - smooth((cyc - 0.62) / 0.24)
    else e = 0

    for (const p of inst.explode) p.obj.position.copy(p.base).addScaledVector(p.exp, e)
    const baseOpen = 0.13 + 0.22 * (0.5 + 0.5 * Math.sin(t * 0.9))
    inst.pivotB.rotation.y = baseOpen * (1 - e) + 0.6 * e

    state.px += (state.tpx - state.px) * 0.07
    state.py += (state.tpy - state.py) * 0.07
    inst.group.rotation.y = 0.35 * Math.sin(t * 0.24) + state.px * 0.6
    inst.group.rotation.x = -0.12 - state.py * 0.4

    inst.renderer.render(inst.scene, inst.camera)
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)

  return () => {
    alive = false
    if (raf) cancelAnimationFrame(raf)
    detachPointer()
    ro.disconnect()
    inst.scene.traverse((o) => {
      const mesh = o as InstanceType<ThreeModule['Mesh']>
      mesh.geometry?.dispose()
      const m = mesh.material
      if (Array.isArray(m)) m.forEach((mm) => mm.dispose())
      else m?.dispose()
    })
    inst.renderer.dispose()
    inst.pmrem.dispose()
  }
}
