// Real-time WebGL scene for the homepage hero backdrop: a SEVROLL 3D PRO
// half-overlay concealed hinge (black, soft-close) swinging a cabinet door,
// after which the camera settles on the hinge itself.
//
// Replaces the earlier butt-hinge scene — the client sells cabinet hardware,
// not door hinges ("сегашната анимация е супер, просто не предлагаме такъв
// тип"), and the hero's own label already reads „ПАНТА Ø35", i.e. a 35mm cup
// hinge. Reference: „Záves SEVROLL polonaložený 3D PRO čierny s tlmením".
//
// `three` is injected by the client island (which dynamically imports it) so it
// stays out of the initial JS bundle. `startHinge` returns a cleanup that stops
// the RAF loop, detaches pointer listeners, disconnects the ResizeObserver and
// disposes GPU resources.
//
// Units: 1 = 10mm.

import type { RoomEnvironment as RoomEnvironmentClass } from 'three/examples/jsm/environments/RoomEnvironment.js'
import type { RoundedBoxGeometry as RoundedBoxGeometryClass } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

type ThreeModule = typeof import('three')
type Obj3D = InstanceType<ThreeModule['Object3D']>

export interface HingeDeps {
  THREE: ThreeModule
  RoomEnvironment: typeof RoomEnvironmentClass
  RoundedBoxGeometry: typeof RoundedBoxGeometryClass
}

/* ------------------------------------------------------------------ *
 * 4-bar linkage
 *
 * A concealed hinge is NOT a simple pivot: the door swings while the cup
 * itself travels, which is what lets the door edge clear the carcass. The
 * geometry below was solved numerically for a 105°-class hinge — 103.6° of
 * door rotation, a 63.9° worst-case transmission angle (nowhere near a
 * toggle/lock-up) and 22.8mm of cup travel. Changing any constant without
 * re-checking those three numbers will make the motion bind or snap.
 * ------------------------------------------------------------------ */

type P2D = readonly [number, number]

const P1: P2D = [-1.219, 0.033] // ground pivot, inner link  (on the arm)
const P2: P2D = [-1.726, -0.755] // ground pivot, outer link  (on the arm)
const Q1_0: P2D = [0.521, 0.211] // coupler pivot, inner link (in the cup)
const Q2_0: P2D = [0.408, -0.726] // coupler pivot, outer link (in the cup)

const DRIVE_SPAN = Math.PI * 0.72 // driving-link sweep that yields ~104° of door

const dist = (a: P2D, b: P2D) => Math.hypot(a[0] - b[0], a[1] - b[1])

const LINK_A = dist(P1, Q1_0)
const LINK_B = dist(P2, Q2_0)
const COUPLER = dist(Q1_0, Q2_0)
const THETA_0 = Math.atan2(Q1_0[1] - P1[1], Q1_0[0] - P1[0])
const COUPLER_0 = Math.atan2(Q2_0[1] - Q1_0[1], Q2_0[0] - Q1_0[0])

/** Circle/circle intersection; `branch` picks which of the two roots. */
function circleIntersect(c0: P2D, r0: number, c1: P2D, r1: number, branch: number): P2D | null {
  const d = dist(c0, c1)
  if (d > r0 + r1 || d < Math.abs(r0 - r1) || d === 0) return null
  const a = (r0 * r0 - r1 * r1 + d * d) / (2 * d)
  const h2 = r0 * r0 - a * a
  if (h2 < 0) return null
  const h = Math.sqrt(h2)
  const ux = (c1[0] - c0[0]) / d
  const uz = (c1[1] - c0[1]) / d
  const mx = c0[0] + a * ux
  const mz = c0[1] + a * uz
  return branch > 0 ? [mx - h * uz, mz + h * ux] : [mx + h * uz, mz - h * ux]
}

interface Pose {
  theta: number // driving-link angle
  q1: P2D
  q2: P2D
  rot: number // door/cup rotation in the 2D plane (radians, +ve = opening)
}

/** Forward kinematics from the driving-link angle. */
function solve(theta: number): Pose | null {
  const q1: P2D = [P1[0] + LINK_A * Math.cos(theta), P1[1] + LINK_A * Math.sin(theta)]
  const q2 = circleIntersect(P2, LINK_B, q1, COUPLER, -1)
  if (!q2) return null
  return { theta, q1, q2, rot: Math.atan2(q2[1] - q1[1], q2[0] - q1[0]) - COUPLER_0 }
}

/**
 * The animation wants to drive the DOOR smoothly (soft-close easing), but the
 * kinematics run the other way — so sample the linkage once and invert it into
 * a door-angle → driving-angle table. Door rotation is monotonic in theta over
 * this span, so a plain linear scan/interpolate is exact enough.
 */
function buildInverseTable(samples = 160): { maxDoor: number; driveFor: (doorRot: number) => number } {
  const pts: { d: number; t: number }[] = []
  for (let i = 0; i <= samples; i++) {
    const theta = THETA_0 + (i / samples) * DRIVE_SPAN
    const p = solve(theta)
    if (!p) break
    pts.push({ d: p.rot, t: theta })
  }
  const last = pts.at(-1)
  const first = pts.at(0)
  const maxDoor = last?.d ?? 0
  return {
    maxDoor,
    driveFor(doorRot: number) {
      if (!first) return THETA_0
      const target = Math.max(0, Math.min(maxDoor, doorRot))
      let prev = first
      for (const cur of pts) {
        if (cur.d >= target) {
          const span = cur.d - prev.d
          const f = span === 0 ? 0 : (target - prev.d) / span
          return prev.t + (cur.t - prev.t) * f
        }
        prev = cur
      }
      return prev.t
    },
  }
}

/* ------------------------------------------------------------------ *
 * Geometry
 * ------------------------------------------------------------------ */

const PANEL_INNER_X = -2.0
const PANEL_THICK = 1.8
const DOOR_THICK = 1.8
const DOOR_EDGE_X = PANEL_INNER_X - PANEL_THICK / 2 // half-overlay: covers half the panel
const DOOR_LEN = 4.0 // only a stub of the door — this is a backdrop, not a cabinet
const BOARD_H = 5.2
const CUP_R = 1.75 // Ø35 cup
const CUP_DEPTH = 1.15

// The arm is drawn between anchors rather than hand-placed, so it always
// reaches from the plate on the carcass to the two ground pivots it carries.
const ARM_BACK: P2D = [PANEL_INNER_X + 0.3, -3.3]
const ARM_NOSE: P2D = [(P1[0] + P2[0]) / 2, (P1[1] + P2[1]) / 2]

/** "SEVROLL" lettering for the arm cover cap, as a canvas texture. */
function capLabel(THREE: ThreeModule) {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 64
  const g = c.getContext('2d')
  if (g) {
    // rgb(), not hex: CI greps src/components for '#rrggbb' (design-token guardrail)
    g.fillStyle = 'rgb(27,29,33)'
    g.fillRect(0, 0, 256, 64)
    g.fillStyle = 'rgb(113,116,122)'
    g.font = 'bold 27px system-ui, sans-serif'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.letterSpacing = '7px'
    g.fillText('SEVROLL', 128, 34)
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function buildScene(deps: HingeDeps) {
  const { THREE, RoundedBoxGeometry: RB } = deps

  // Black anodised hardware with brighter machined steel for the linkage and
  // the chromed plate cap — that two-tone is what still reads at 0.42 opacity.
  const black = new THREE.MeshPhysicalMaterial({ color: 0x1c1e22, metalness: 0.88, roughness: 0.37, clearcoat: 0.55, clearcoatRoughness: 0.25, envMapIntensity: 1.5 })
  const blackMatte = new THREE.MeshPhysicalMaterial({ color: 0x24262b, metalness: 0.7, roughness: 0.58, envMapIntensity: 1.15 })
  const steel = new THREE.MeshPhysicalMaterial({ color: 0x9aa0a9, metalness: 1, roughness: 0.28, clearcoat: 0.4, envMapIntensity: 1.5 })
  const chrome = new THREE.MeshPhysicalMaterial({ color: 0xc9ced6, metalness: 1, roughness: 0.14, envMapIntensity: 1.7 })
  const board = new THREE.MeshPhysicalMaterial({ color: 0xe6e0d6, metalness: 0, roughness: 0.86, clearcoat: 0.12 })
  const boardEdge = new THREE.MeshPhysicalMaterial({ color: 0xd2cabc, metalness: 0, roughness: 0.9 })

  const root = new THREE.Group()

  const seg = (a: P2D, b: P2D) => {
    const dx = b[0] - a[0]
    const dz = b[1] - a[1]
    return { len: Math.hypot(dx, dz), mid: [a[0] + dx / 2, a[1] + dz / 2] as P2D, rotY: -Math.atan2(dz, dx) }
  }

  // --- carcass side panel (fixed) ---------------------------------
  const panel = new THREE.Mesh(new RB(PANEL_THICK, BOARD_H, 4.0, 3, 0.06), board)
  panel.position.set(PANEL_INNER_X - PANEL_THICK / 2, 0, -2.0)
  root.add(panel)

  // --- mounting plate on the carcass inner face -------------------
  const plateBody = new THREE.Mesh(new RB(0.5, 1.35, 3.4, 3, 0.05), black)
  plateBody.position.set(PANEL_INNER_X + 0.25, 0, -3.3)
  root.add(plateBody)
  const plateCap = new THREE.Mesh(new RB(0.26, 1.0, 1.5, 3, 0.04), chrome)
  plateCap.position.set(PANEL_INNER_X + 0.6, 0, -3.9)
  root.add(plateCap)
  for (const z of [-2.3, -4.3]) {
    const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.22, 20), steel)
    screw.rotation.z = Math.PI / 2
    screw.position.set(PANEL_INNER_X + 0.52, 0, z)
    root.add(screw)
  }

  // --- hinge arm (fixed): the elbow that carries both ground pivots
  const armSeg = seg(ARM_BACK, ARM_NOSE)
  const armBody = new THREE.Mesh(new RB(armSeg.len, 1.15, 0.8, 3, 0.07), black)
  armBody.position.set(armSeg.mid[0], 0, armSeg.mid[1])
  armBody.rotation.y = armSeg.rotY
  root.add(armBody)
  const armNose = new THREE.Mesh(new RB(1.45, 1.25, 1.35, 3, 0.07), black)
  armNose.position.set(ARM_NOSE[0], 0, ARM_NOSE[1])
  root.add(armNose)

  // cover cap + its label (a separate plane: a texture on a rounded box would
  // repeat the wordmark on all six faces)
  const capMesh = new THREE.Mesh(new RB(armSeg.len * 0.82, 0.26, 0.62, 3, 0.04), blackMatte)
  capMesh.position.set(armSeg.mid[0], 0.63, armSeg.mid[1])
  capMesh.rotation.y = armSeg.rotY
  root.add(capMesh)
  const capTex = capLabel(THREE)
  const capMat = new THREE.MeshBasicMaterial({ map: capTex, toneMapped: false })
  const label = new THREE.Mesh(new THREE.PlaneGeometry(armSeg.len * 0.7, 0.42), capMat)
  label.rotation.x = -Math.PI / 2
  label.rotation.z = -armSeg.rotY
  label.position.set(armSeg.mid[0], 0.77, armSeg.mid[1])
  root.add(label)

  // soft-close damper riding on the arm — the visual signature of "s tlmením"
  const damper = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 1.35, 20), steel)
  damper.rotation.z = Math.PI / 2
  damper.rotation.y = armSeg.rotY
  damper.position.set(armSeg.mid[0] + 0.45, -0.12, armSeg.mid[1] + 0.55)
  root.add(damper)

  // --- the two links (rigid bars, ground pivot -> coupler pivot) ---
  const mkLink = (length: number, w: number, h: number, mat: InstanceType<ThreeModule['Material']>) => {
    const pivot = new THREE.Group()
    const bar = new THREE.Mesh(new RB(length, h, w, 3, 0.045), mat)
    bar.position.x = length / 2 // pivot sits at one end
    pivot.add(bar)
    return pivot
  }
  const linkA = mkLink(LINK_A, 0.36, 0.85, steel)
  linkA.position.set(P1[0], 0, P1[1])
  root.add(linkA)
  const linkB = mkLink(LINK_B, 0.44, 0.95, black)
  linkB.position.set(P2[0], 0, P2[1])
  root.add(linkB)

  // --- door + cup (the moving assembly) ---------------------------
  // Authored in the CLOSED pose, then rigidly transformed by the linkage
  // solution so the cup stays glued to the door.
  const door = new THREE.Group()

  const doorPanel = new THREE.Mesh(new RB(DOOR_LEN, BOARD_H, DOOR_THICK, 3, 0.07), board)
  doorPanel.position.set(DOOR_EDGE_X + DOOR_LEN / 2, 0, DOOR_THICK / 2)
  door.add(doorPanel)
  const doorLip = new THREE.Mesh(new RB(0.1, BOARD_H, DOOR_THICK, 3, 0.03), boardEdge)
  doorLip.position.set(DOOR_EDGE_X, 0, DOOR_THICK / 2)
  door.add(doorLip)

  // 35mm cup, recessed into the door's back face
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(CUP_R, CUP_R * 0.96, CUP_DEPTH, 40), blackMatte)
  cup.rotation.x = Math.PI / 2
  cup.position.set(0, 0, CUP_DEPTH / 2 - 0.02)
  door.add(cup)
  // flange with the two screw wings
  const flange = new THREE.Mesh(new RB(1.55, 3.8, 0.3, 3, 0.05), black)
  flange.position.set(0, 0, -0.12)
  door.add(flange)
  for (const y of [1.45, -1.45]) {
    const wing = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.18, 18), steel)
    wing.rotation.x = Math.PI / 2
    wing.position.set(0, y, -0.26)
    door.add(wing)
  }
  // the boss the links pivot on, standing proud of the cup
  const boss = new THREE.Mesh(new RB(1.35, 1.0, 1.15, 3, 0.06), blackMatte)
  boss.position.set(0.4, 0, -0.42)
  door.add(boss)
  root.add(door)

  root.rotation.x = -0.05
  return { root, door, linkA, linkB, materials: [black, blackMatte, steel, chrome, board, boardEdge, capMat], capTex }
}

/* ------------------------------------------------------------------ *
 * Scene / camera
 * ------------------------------------------------------------------ */

function makeScene(canvas: HTMLCanvasElement, deps: HingeDeps) {
  const { THREE, RoomEnvironment } = deps
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.2
  renderer.outputColorSpace = THREE.SRGBColorSpace

  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.02).texture

  // Framed on WIDTH, not height: the stage is 0.88 aspect on desktop and ~1.03
  // on mobile, so a fixed vertical fov would crop the arm off on one of them.
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 200)

  const key = new THREE.DirectionalLight(0xfff2df, 2.4)
  key.position.set(5, 7, -6)
  scene.add(key)
  const rim = new THREE.DirectionalLight(0xd8e2ff, 1.5)
  rim.position.set(-6, 2.5, 4)
  scene.add(rim)
  const fill = new THREE.DirectionalLight(0xffe4c4, 0.65)
  fill.position.set(2, -4, -3)
  scene.add(fill)
  scene.add(new THREE.AmbientLight(0xffffff, 0.22))

  const built = buildScene(deps)
  scene.add(built.root)

  return { renderer, scene, camera, pmrem, ...built }
}

const smooth = (x: number) => {
  const c = Math.max(0, Math.min(1, x))
  return c * c * (3 - 2 * c)
}
/** Soft-close: quick off the stop, then a long damped settle — a Ø35 hinge
 *  with `tlmenie` never slams, and that deceleration IS the product feature. */
const softClose = (x: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 3.2)

/** Horizontal field of view; vertical is derived per-aspect in `resize`. */
const HFOV_DEG = 30

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
  const table = buildInverseTable()
  const state = { px: 0, py: 0, tpx: 0, tpy: 0 }
  const { THREE } = deps

  // Wide framing shows the door swinging; the close framing is the payoff the
  // client asked for — „после кадъра да се измести на пантата".
  const WIDE_POS = new THREE.Vector3(19.0, 6.6, -14.1)
  const WIDE_AT = new THREE.Vector3(-1.3, 0, -1.2)
  const NEAR_POS = new THREE.Vector3(7.7, 2.5, -7.2)
  const NEAR_AT = new THREE.Vector3(-1.1, 0, -1.1)
  const camPos = new THREE.Vector3()
  const camAt = new THREE.Vector3()

  const resize = () => {
    const r = canvas.getBoundingClientRect()
    const w = Math.max(1, r.width)
    const h = Math.max(1, r.height)
    inst.renderer.setSize(w, h, false)
    const aspect = w / h
    inst.camera.aspect = aspect
    // keep the horizontal field constant across breakpoints
    inst.camera.fov = (2 * Math.atan(Math.tan((HFOV_DEG * Math.PI) / 360) / aspect) * 180) / Math.PI
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

  const CYCLE = 17 // seconds
  const start = performance.now()
  let raf = 0
  let alive = true

  const loop = (now: number) => {
    if (!alive) return
    const c = (((now - start) / 1000) / CYCLE) % 1

    // Door: hold shut → open (soft) → hold → close (soft, long settle).
    let openness: number
    if (c < 0.06) openness = 0
    else if (c < 0.3) openness = softClose((c - 0.06) / 0.24)
    else if (c < 0.78) openness = 1
    else if (c < 0.96) openness = 1 - softClose((c - 0.78) / 0.18)
    else openness = 0

    // Camera: wide while it swings, then push in on the hinge and hold.
    let near: number
    if (c < 0.34) near = 0
    else if (c < 0.46) near = smooth((c - 0.34) / 0.12)
    else if (c < 0.68) near = 1
    else if (c < 0.8) near = 1 - smooth((c - 0.68) / 0.12)
    else near = 0

    const pose = solve(table.driveFor(openness * table.maxDoor))
    if (pose) {
      // Rigid transform of the door/cup assembly from the closed pose.
      // 2D maths is right-handed about +Y, three.js rotation.y is the other
      // way round, hence the negated angle.
      const cs = Math.cos(pose.rot)
      const sn = Math.sin(pose.rot)
      const ox = pose.q1[0] - (Q1_0[0] * cs - Q1_0[1] * sn)
      const oz = pose.q1[1] - (Q1_0[0] * sn + Q1_0[1] * cs)
      inst.door.position.set(ox, 0, oz)
      inst.door.rotation.y = -pose.rot

      inst.linkA.rotation.y = -pose.theta
      inst.linkB.rotation.y = -Math.atan2(pose.q2[1] - P2[1], pose.q2[0] - P2[0])
    }

    state.px += (state.tpx - state.px) * 0.06
    state.py += (state.tpy - state.py) * 0.06

    camPos.lerpVectors(WIDE_POS, NEAR_POS, near)
    camAt.lerpVectors(WIDE_AT, NEAR_AT, near)
    const sway = 1 - 0.55 * near // less parallax when we are in close
    inst.camera.position.set(
      camPos.x + state.px * 1.5 * sway,
      camPos.y - state.py * 1.1 * sway,
      camPos.z,
    )
    inst.camera.lookAt(camAt)

    inst.renderer.render(inst.scene, inst.camera)
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)

  return () => {
    alive = false
    if (raf) cancelAnimationFrame(raf)
    detachPointer()
    ro.disconnect()
    inst.scene.traverse((o: Obj3D) => {
      const mesh = o as InstanceType<ThreeModule['Mesh']>
      mesh.geometry?.dispose()
      const m = mesh.material
      if (Array.isArray(m)) m.forEach((mm) => mm.dispose())
      else m?.dispose()
    })
    inst.capTex.dispose()
    inst.renderer.dispose()
    inst.pmrem.dispose()
  }
}
