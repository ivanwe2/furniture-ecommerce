// Real-time WebGL cabinet-hinge scene — the homepage hero backdrop (redesign
// R3). Pure setup + animation; `three` itself is injected by the client island
// (which dynamically imports it) so it stays out of the initial JS bundle.
// `startHinge` returns a cleanup that stops the RAF loop, detaches pointer
// listeners, disconnects the ResizeObserver, and disposes GPU resources.
//
// This scene was briefly replaced by a SEVROLL 3D PRO concealed hinge and then
// restored at the client's request ("the previous animation, a bit more
// polished"). The geometry, materials and cycle timing below are deliberately
// the ones they approved; the changes since are fidelity only —
//   * soft shadows, so parts shade each other instead of floating as
//     independently-lit primitives (the single biggest realism win);
//   * a micro-surface bump map over the existing brushed roughness, so
//     highlights break up rather than sitting on perfect planes;
//   * crevice rings between the knuckle segments, so the barrel reads as
//     machined sections rather than one smooth tube;
//   * camera framing that is MEASURED rather than a hand-picked distance.
//
// That last one fixed a real defect, not just a look: the camera sat at a fixed
// z with a fixed vertical fov, so the framing was only ever correct at the
// desktop stage's ~0.88 aspect. On a phone the stage is wider than it is tall
// and the exploded parts — which travel 1.7 out in x and the pin 2.0 up in y —
// left the frame entirely. Horizontal fov is now held constant across aspects
// and the distance is solved per state.

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

/**
 * Procedural micro-surface: fine speckle, directional tooling marks and the
 * occasional deeper scratch. Used as a BUMP map alongside the brushed
 * roughness above — roughness alone varies how sharp a highlight is, but the
 * surface stays geometrically perfect, and mathematically flat metal is most
 * of what makes a render read as a game asset rather than as a photograph.
 */
function microSurface(THREE: ThreeModule) {
  const c = document.createElement('canvas')
  c.width = c.height = 512
  const g = c.getContext('2d')
  if (g) {
    g.fillStyle = 'rgb(140,140,140)'
    g.fillRect(0, 0, 512, 512)
    const img = g.getImageData(0, 0, 512, 512)
    for (let i = 0; i < img.data.length; i += 4) {
      const base = img.data[i] ?? 140
      const v = Math.max(0, Math.min(255, base + (Math.random() - 0.5) * 42))
      img.data[i] = v
      img.data[i + 1] = v
      img.data[i + 2] = v
    }
    g.putImageData(img, 0, 0)
    for (let i = 0; i < 900; i++) {
      const v = (110 + Math.random() * 90) | 0
      g.strokeStyle = `rgba(${v},${v},${v},0.2)`
      g.lineWidth = 0.35 + Math.random() * 0.8
      const y = Math.random() * 512
      g.beginPath()
      g.moveTo(0, y)
      g.lineTo(512, y + (Math.random() - 0.5) * 6)
      g.stroke()
    }
    for (let i = 0; i < 24; i++) {
      g.strokeStyle = `rgba(208,208,208,${0.1 + Math.random() * 0.15})`
      g.lineWidth = 0.5 + Math.random() * 0.7
      const x = Math.random() * 512
      const y = Math.random() * 512
      g.beginPath()
      g.moveTo(x, y)
      g.lineTo(x + (Math.random() - 0.5) * 250, y + (Math.random() - 0.5) * 38)
      g.stroke()
    }
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(2.5, 2.5)
  tex.anisotropy = 8
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
  // Shared by every metal below: one canvas, one upload, many materials.
  const micro = microSurface(THREE)

  // metalness 0.88 rather than 1, and this is the one material change that is
  // not cosmetic. The leaves are FLAT, and a flat face at full metalness has no
  // diffuse term at all — it renders purely what it reflects, so whichever leaf
  // happened to catch a bright quadrant of the environment washed out to paper
  // white and vanished against the cream page, worst of all mid-explode. A
  // little albedo gives them a floor to sit on; they still read as polished
  // steel because the reflection is still doing most of the work.
  const steel = new THREE.MeshPhysicalMaterial({ color: 0xd8dbe0, metalness: 0.88, roughness: 0.34, roughnessMap: brush, bumpMap: micro, bumpScale: 0.006, envMapIntensity: 1.42, clearcoat: 0.55, clearcoatRoughness: 0.22 })
  const steelAlt = new THREE.MeshPhysicalMaterial({ color: 0xb9bec6, metalness: 1, roughness: 0.44, roughnessMap: brush2, bumpMap: micro, bumpScale: 0.006, envMapIntensity: 1.4, clearcoat: 0.4, clearcoatRoughness: 0.3 })
  const bronze = new THREE.MeshPhysicalMaterial({ color: 0xbe8c4c, metalness: 1, roughness: 0.36, roughnessMap: brush2, bumpMap: micro, bumpScale: 0.005, envMapIntensity: 1.4, clearcoat: 0.45, clearcoatRoughness: 0.28 })
  const screwMat = new THREE.MeshPhysicalMaterial({ color: 0x787c83, metalness: 1, roughness: 0.38, bumpMap: micro, bumpScale: 0.004, clearcoat: 0.3 })
  const slotMat = new THREE.MeshStandardMaterial({ color: 0x26282c, metalness: 0.6, roughness: 0.75 })
  // Near-black, barely reflective: the shadowed gap where two machined faces
  // meet. Without it the barrel's segments blend into one smooth tube.
  const crevice = new THREE.MeshStandardMaterial({ color: 0x16181b, metalness: 0.3, roughness: 0.92 })

  const LW = 1.7
  const LH = 2.7
  const LT = 0.11
  const plateGeo = new RB(LW, LH, LT, 6, 0.026)
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
  // Slightly under the barrel radius and slightly over its height, so it shows
  // only in the 10% gap the segments already left between them — the sections
  // used to read as one continuous tube because that gap saw straight through
  // to the background.
  const creviceGeo = new THREE.CylinderGeometry(0.158, 0.158, segH, 24)
  for (let i = 0; i < 5; i++) {
    const kg = new THREE.Group()
    kg.add(new THREE.Mesh(creviceGeo, crevice))
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
  // Parts shading each other is what stops an assembly of primitives reading as
  // an assembly of primitives: the barrel drops a shadow across both leaves and
  // each screw head sits in its own. Soft-filtered, because a hard-edged shadow
  // at this scale looks stamped on.
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.02).texture

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100)
  camera.position.set(0, 0, 8.4)

  const key = new THREE.DirectionalLight(0xfff2df, 2.5)
  key.position.set(4, 6, 6)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  key.shadow.radius = 3
  // Metal at grazing angles self-shadow-acne badly without this.
  key.shadow.bias = -0.0006
  // Tightened from the ±5 default onto what the subject actually occupies at
  // full explode (leaves reach 1.7 out, the pin 2.0 up) — a shadow camera any
  // larger just spends the 2048 map on empty space.
  const sc = key.shadow.camera
  sc.left = -4
  sc.right = 4
  sc.top = 4.5
  sc.bottom = -4.5
  sc.near = 0.5
  sc.far = 26
  sc.updateProjectionMatrix()
  scene.add(key)
  const rim = new THREE.DirectionalLight(0xd8e2ff, 1.35)
  rim.position.set(-5, 2, -4)
  scene.add(rim)
  const fill = new THREE.DirectionalLight(0xffe4c4, 0.7)
  fill.position.set(-2, -4, 3)
  scene.add(fill)
  scene.add(new THREE.AmbientLight(0xffffff, 0.2))

  const hinge = buildHinge(deps)
  hinge.group.traverse((o) => {
    const mesh = o as InstanceType<ThreeModule['Mesh']>
    if (mesh.isMesh) {
      mesh.castShadow = true
      mesh.receiveShadow = true
    }
  })
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
  const { THREE } = deps
  const inst = makeScene(canvas, deps)
  const state = { px: 0, py: 0, tpx: 0, tpy: 0 }

  // --- framing -------------------------------------------------------------
  // The approved desktop composition, preserved exactly: camera at z 8.4 with a
  // 32° VERTICAL fov at the desktop stage's ~0.88 aspect. Everything below
  // reproduces that view and then makes it survive two things it did not
  // before — a different aspect ratio, and the explode.
  const BASE_D = 8.4
  // Hold the HORIZONTAL field constant instead of the vertical one. The stage is
  // ~0.88 aspect on desktop but wider than tall on a phone, so a fixed vertical
  // fov framed the two completely differently — the mobile bug.
  const HFOV_DEG = (2 * Math.atan(Math.tan((32 * Math.PI) / 360) * 0.88) * 180) / Math.PI

  const probe = new THREE.Vector3()
  const fitCam = new THREE.PerspectiveCamera(32, 1, 0.1, 100)

  /** World box of the hinge at explode factor `e`, unioned across the sway. */
  const boxFor = (e: number, open: number) => {
    const box = new THREE.Box3()
    for (const p of inst.explode) p.obj.position.copy(p.base).addScaledVector(p.exp, e)
    inst.pivotB.rotation.y = open
    for (const spin of [-0.35, 0, 0.35]) {
      inst.group.rotation.set(-0.12, spin, 0)
      inst.group.updateMatrixWorld(true)
      box.union(new THREE.Box3().setFromObject(inst.group))
    }
    return box
  }
  const cornersOf = (box: InstanceType<ThreeModule['Box3']>) => {
    const out: InstanceType<ThreeModule['Vector3']>[] = []
    for (const x of [box.min.x, box.max.x])
      for (const y of [box.min.y, box.max.y])
        for (const z of [box.min.z, box.max.z]) out.push(new THREE.Vector3(x, y, z))
    return out
  }

  // Two framings: assembled, and fully separated. One box spanning both is the
  // union of the wider moment, which would leave the assembled hinge sitting
  // small inside it for most of the cycle.
  const shapes = [boxFor(0, 0.35), boxFor(1, 0.6)].map(cornersOf)

  /**
   * Smallest distance at which every corner still projects inside the frustum.
   * Found by projecting and correcting rather than in closed form — the
   * analytic version is easy to get subtly wrong, and a bounding SPHERE (the
   * obvious shortcut) is far larger than a long thin hinge, which pushes the
   * camera back and leaves the subject small and adrift.
   */
  const computeFit = (pts: InstanceType<ThreeModule['Vector3']>[], margin: number) => {
    fitCam.fov = inst.camera.fov
    fitCam.aspect = inst.camera.aspect
    let d = BASE_D
    for (let i = 0; i < 8; i++) {
      fitCam.position.set(0, 0, d)
      fitCam.lookAt(0, 0, 0)
      fitCam.updateMatrixWorld(true)
      fitCam.updateProjectionMatrix()
      let m = 0
      for (const pt of pts) {
        probe.copy(pt).project(fitCam)
        m = Math.max(m, Math.abs(probe.x), Math.abs(probe.y))
      }
      if (!(m > 0) || !Number.isFinite(m)) break
      d *= m * margin
    }
    return d
  }

  // Never closer than the approved framing — the fit may only pull BACK, so the
  // assembled hinge keeps the size and position the client signed off on and
  // only the explode, which used to throw parts clean out of frame, opens up.
  const dists = [BASE_D, BASE_D]

  const resize = () => {
    const r = canvas.getBoundingClientRect()
    const w = Math.max(1, r.width)
    const h = Math.max(1, r.height)
    inst.renderer.setSize(w, h, false)
    const aspect = w / h
    inst.camera.aspect = aspect
    inst.camera.fov = (2 * Math.atan(Math.tan((HFOV_DEG * Math.PI) / 360) / aspect) * 180) / Math.PI
    inst.camera.updateProjectionMatrix()
    const margins = [1.04, 1.03]
    for (let i = 0; i < shapes.length; i += 1) {
      const pts = shapes[i]
      const m = margins[i]
      if (pts && m) dists[i] = Math.max(BASE_D, computeFit(pts, m))
    }
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

    // Ease back as the hinge comes apart, so the disassembly stays in frame.
    const dA = dists[0] ?? BASE_D
    const dB = dists[1] ?? BASE_D
    inst.camera.position.z = dA + (dB - dA) * e

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
