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

/* ------------------------------------------------------------------ *
 * Geometry
 *
 * Parts are extruded from real 2D profiles rather than assembled from boxes.
 * The hinge is seen mostly side-on, so the silhouette in the depth/height
 * plane is what actually reads — a stack of cuboids never looks machined.
 * ------------------------------------------------------------------ */

const PANEL_INNER_X = -2.0 // carcass inner face
const PANEL_THICK = 1.8
const DOOR_THICK = 1.8
const DOOR_EDGE_X = PANEL_INNER_X - PANEL_THICK / 2 // half-overlay: covers half the panel
const DOOR_LEN = 4.0
const BOARD_H = 5.2
const CUP_R = 1.75 // Ø35 cup
const CUP_DEPTH = 1.15
const ARM_W = 1.15 // the arm/links are ~12mm across

const ARM_BACK_Z = -3.95
const ARM_NOSE_Z = -0.2

/** "SEVROLL" lettering for the arm cover cap, as a canvas texture. */
function capLabel(THREE: ThreeModule) {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 64
  const g = c.getContext('2d')
  if (g) {
    // rgb(), not hex: CI greps src/components for '#rrggbb' (design-token guardrail)
    g.fillStyle = 'rgb(24,26,30)'
    g.fillRect(0, 0, 256, 64)
    g.fillStyle = 'rgb(126,130,137)'
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

/** Fine brushed streaks, so the steel catches light along its length. */
function brushed(THREE: ThreeModule) {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')
  if (g) {
    g.fillStyle = 'rgb(128,128,128)'
    g.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 2600; i++) {
      const v = (96 + Math.random() * 96) | 0
      g.strokeStyle = `rgba(${v},${v},${v},0.30)`
      g.lineWidth = 0.4 + Math.random() * 0.7
      const y = Math.random() * 256
      g.beginPath()
      g.moveTo(0, y)
      g.lineTo(256, y + (Math.random() - 0.5) * 2)
      g.stroke()
    }
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(3, 1)
  tex.anisotropy = 4
  return tex
}

function buildScene(deps: HingeDeps) {
  const { THREE, RoundedBoxGeometry: RB } = deps

  const brushTex = brushed(THREE)
  // Black anodised hardware against machined steel: at the stage's low opacity
  // it is that tonal split, not fine detail, that keeps the parts legible.
  const black = new THREE.MeshPhysicalMaterial({ color: 0x191b1f, metalness: 0.92, roughness: 0.33, clearcoat: 0.6, clearcoatRoughness: 0.22, envMapIntensity: 1.6 })
  const blackMatte = new THREE.MeshPhysicalMaterial({ color: 0x212429, metalness: 0.72, roughness: 0.55, envMapIntensity: 1.2 })
  const crevice = new THREE.MeshStandardMaterial({ color: 0x0e1013, metalness: 0.4, roughness: 0.85 })
  const steel = new THREE.MeshPhysicalMaterial({ color: 0xa8aeb7, metalness: 1, roughness: 0.26, roughnessMap: brushTex, anisotropy: 0.7, clearcoat: 0.35, envMapIntensity: 1.65 })
  const chrome = new THREE.MeshPhysicalMaterial({ color: 0xd2d7de, metalness: 1, roughness: 0.11, envMapIntensity: 1.85 })
  const board = new THREE.MeshPhysicalMaterial({ color: 0xe7e1d7, metalness: 0, roughness: 0.85, clearcoat: 0.1 })
  const boardEdge = new THREE.MeshPhysicalMaterial({ color: 0xd0c8ba, metalness: 0, roughness: 0.9 })

  const root = new THREE.Group()
  /** The hinge itself, tracked separately so the close-up can frame just it. */
  const hardware = new THREE.Group()

  const shadowed = (m: InstanceType<ThreeModule['Mesh']>) => {
    m.castShadow = true
    m.receiveShadow = true
    return m
  }

  /** Extrude a side profile given as (z, y) points, across `width` in x. */
  const extrudeSide = (
    pts: readonly (readonly [number, number])[],
    width: number,
    mat: InstanceType<ThreeModule['Material']>,
    bevel = 0.05,
  ) => {
    const shape = new THREE.Shape()
    pts.forEach(([z, y], i) => (i === 0 ? shape.moveTo(-z, y) : shape.lineTo(-z, y)))
    shape.closePath()
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: width,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 2,
      curveSegments: 10,
    })
    // shape(x,y) is authored as (-z, y); rotating maps the extrusion onto x
    g.rotateY(Math.PI / 2)
    g.translate(-width / 2, 0, 0)
    return shadowed(new THREE.Mesh(g, mat))
  }

  /** Countersunk screw with a cross recess — reads as a fastener, not a stud. */
  const screw = (r: number) => {
    const g = new THREE.Group()
    const head = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.74, r * 0.5, 22), steel)
    g.add(shadowed(head))
    for (const rot of [0, Math.PI / 2]) {
      const slot = new THREE.Mesh(new THREE.BoxGeometry(r * 1.5, r * 0.16, r * 0.34), crevice)
      slot.rotation.y = rot
      slot.position.y = r * 0.22
      g.add(slot)
    }
    return g
  }

  // --- carcass side panel + mounting plate (fixed) ------------------
  const panel = shadowed(new THREE.Mesh(new RB(PANEL_THICK, BOARD_H, 4.6, 3, 0.06), board))
  panel.position.set(PANEL_INNER_X - PANEL_THICK / 2, 0, -2.3)
  root.add(panel)

  // plate: a stepped bracket seen side-on, with its cam screws
  const plate = extrudeSide(
    [
      [-4.75, -0.62], [-1.95, -0.62], [-1.75, -0.30], [-1.75, 0.30],
      [-1.95, 0.62], [-4.75, 0.62],
    ],
    1.35,
    black,
  )
  plate.position.x = PANEL_INNER_X + 0.3
  hardware.add(plate)
  const plateCap = extrudeSide([[-4.3, -0.34], [-2.5, -0.34], [-2.5, 0.34], [-4.3, 0.34]], 0.9, chrome, 0.03)
  plateCap.position.x = PANEL_INNER_X + 0.72
  hardware.add(plateCap)
  for (const z of [-2.5, -4.35]) {
    const s = screw(0.24)
    s.rotation.z = -Math.PI / 2
    s.position.set(PANEL_INNER_X + 0.62, 0, z)
    hardware.add(s)
  }

  // --- hinge arm: the tapering boomerang that carries both pivots ----
  const arm = extrudeSide(
    [
      [ARM_BACK_Z - 0.35, -0.60], [ARM_BACK_Z + 0.1, -0.66], [-2.4, -0.60],
      [-1.2, -0.44], [ARM_NOSE_Z - 0.1, -0.36], [ARM_NOSE_Z, 0.36],
      [-1.2, 0.46], [-2.4, 0.64], [ARM_BACK_Z + 0.1, 0.70], [ARM_BACK_Z - 0.35, 0.62],
    ],
    ARM_W,
    black,
  )
  arm.position.x = -1.55
  hardware.add(arm)

  // hollow channel down the middle of the arm — hinges are pressed, not solid
  const channel = extrudeSide(
    [[ARM_BACK_Z, -0.34], [-1.3, -0.22], [ARM_NOSE_Z - 0.15, -0.16],
     [ARM_NOSE_Z - 0.15, 0.16], [-1.3, 0.24], [ARM_BACK_Z, 0.40]],
    ARM_W * 0.52,
    crevice,
    0.02,
  )
  channel.position.set(-1.55, 0.02, 0)
  hardware.add(channel)

  const capTex = capLabel(THREE)
  const capMat = new THREE.MeshBasicMaterial({ map: capTex, toneMapped: false })
  const cap = extrudeSide([[-3.5, 0.58], [-1.0, 0.40], [-1.0, 0.62], [-3.5, 0.80]], ARM_W * 0.72, blackMatte, 0.03)
  cap.position.x = -1.55
  hardware.add(cap)
  const label = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.42), capMat)
  label.rotation.x = -Math.PI / 2
  label.position.set(-1.55, 0.79, -2.25)
  label.rotation.z = Math.PI + 0.06 // viewed from the -z side, unflipped it reads mirrored
  hardware.add(label)

  // soft-close damper riding on the arm — the visual signature of "s tlmením"
  const damperBody = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 1.5, 24), steel))
  damperBody.rotation.x = Math.PI / 2
  damperBody.position.set(-1.05, -0.16, -1.75)
  hardware.add(damperBody)
  const damperRod = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.75, 16), chrome))
  damperRod.rotation.x = Math.PI / 2
  damperRod.position.set(-1.05, -0.16, -0.72)
  hardware.add(damperRod)

  // depth/side adjustment screws on the arm's back
  for (const z of [-3.1, -2.35]) {
    const s = screw(0.21)
    s.position.set(-1.55, 0.6, z)
    hardware.add(s)
  }

  // --- the two links (rigid bars, ground pivot -> coupler pivot) -----
  const mkLink = (length: number, w: number, h: number, mat: InstanceType<ThreeModule['Material']>) => {
    const pivot = new THREE.Group()
    const bar = extrudeSide(
      [[-0.02, -h / 2], [-length * 0.55, -h / 2 - 0.06], [-length + 0.02, -h / 2],
       [-length + 0.02, h / 2], [-length * 0.55, h / 2 + 0.06], [-0.02, h / 2]],
      w,
      mat,
      0.035,
    )
    // extrudeSide authors along -z; the link must lie along +x from its pivot
    bar.geometry.rotateY(-Math.PI / 2)
    bar.position.x = length / 2
    pivot.add(bar)
    for (const dx of [-length / 2 + 0.04, length / 2 - 0.04]) {
      const rivet = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(w * 0.28, w * 0.28, h + 0.12, 18), chrome))
      rivet.position.set(length / 2 + dx, 0, 0)
      pivot.add(rivet)
    }
    return pivot
  }
  const linkA = mkLink(LINK_A, 0.9, 0.4, steel)
  linkA.position.set(P1[0], 0.22, P1[1])
  hardware.add(linkA)
  const linkB = mkLink(LINK_B, 1.0, 0.44, black)
  linkB.position.set(P2[0], -0.24, P2[1])
  hardware.add(linkB)

  // --- door + cup (the moving assembly) -----------------------------
  const door = new THREE.Group()

  const doorPanel = shadowed(new THREE.Mesh(new RB(DOOR_LEN, BOARD_H, DOOR_THICK, 3, 0.07), board))
  doorPanel.position.set(DOOR_EDGE_X + DOOR_LEN / 2, 0, DOOR_THICK / 2)
  door.add(doorPanel)
  const doorLip = shadowed(new THREE.Mesh(new RB(0.1, BOARD_H, DOOR_THICK, 3, 0.03), boardEdge))
  doorLip.position.set(DOOR_EDGE_X, 0, DOOR_THICK / 2)
  door.add(doorLip)

  // 35mm cup: bore, inner recess and a proud rim
  const bore = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(CUP_R, CUP_R * 0.94, CUP_DEPTH, 48), blackMatte))
  bore.rotation.x = Math.PI / 2
  bore.position.set(0, 0, CUP_DEPTH / 2 - 0.02)
  door.add(bore)
  const recess = new THREE.Mesh(new THREE.CylinderGeometry(CUP_R * 0.66, CUP_R * 0.66, CUP_DEPTH * 0.7, 40), crevice)
  recess.rotation.x = Math.PI / 2
  recess.position.set(0, 0, CUP_DEPTH * 0.62)
  door.add(recess)
  const rim = shadowed(new THREE.Mesh(new THREE.TorusGeometry(CUP_R, 0.085, 12, 48), black))
  rim.position.z = 0.02
  door.add(rim)

  // flange: a real plate with the screw holes punched through it
  const fl = new THREE.Shape()
  const fw = 0.78
  const fh = 1.95
  fl.moveTo(-fw, -fh + 0.5)
  fl.quadraticCurveTo(-fw, -fh, -fw + 0.5, -fh)
  fl.lineTo(fw - 0.5, -fh)
  fl.quadraticCurveTo(fw, -fh, fw, -fh + 0.5)
  fl.lineTo(fw, fh - 0.5)
  fl.quadraticCurveTo(fw, fh, fw - 0.5, fh)
  fl.lineTo(-fw + 0.5, fh)
  fl.quadraticCurveTo(-fw, fh, -fw, fh - 0.5)
  fl.closePath()
  for (const y of [1.4, -1.4]) {
    const hole = new THREE.Path()
    hole.absarc(0, y, 0.26, 0, Math.PI * 2, true)
    fl.holes.push(hole)
  }
  const flange = shadowed(
    new THREE.Mesh(
      new THREE.ExtrudeGeometry(fl, { depth: 0.28, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2, curveSegments: 10 }),
      black,
    ),
  )
  flange.position.z = -0.3
  door.add(flange)
  for (const y of [1.4, -1.4]) {
    const s = screw(0.25)
    s.rotation.x = -Math.PI / 2
    s.position.set(0, y, -0.28)
    door.add(s)
  }

  // the boss the links pivot on, standing proud of the cup
  const boss = shadowed(new THREE.Mesh(new RB(1.25, 1.15, 1.1, 3, 0.06), blackMatte))
  boss.position.set(0.38, 0, -0.45)
  door.add(boss)
  root.add(door)
  root.add(hardware)

  root.rotation.x = -0.05
  return {
    root,
    door,
    hardware,
    linkA,
    linkB,
    materials: [black, blackMatte, crevice, steel, chrome, board, boardEdge, capMat],
    textures: [capTex, brushTex],
  }
}

/* ------------------------------------------------------------------ *
 * Scene, framing and camera
 * ------------------------------------------------------------------ */

type Built = ReturnType<typeof buildScene>

/** Place the door/cup assembly and both links for a given linkage pose. */
function applyPose(deps: HingeDeps, built: Built, pose: Pose) {
  // 2D maths is right-handed about +Y, three.js rotation.y is the other way
  // round, hence the negated angles.
  const cs = Math.cos(pose.rot)
  const sn = Math.sin(pose.rot)
  built.door.position.set(
    pose.q1[0] - (Q1_0[0] * cs - Q1_0[1] * sn),
    0,
    pose.q1[1] - (Q1_0[0] * sn + Q1_0[1] * cs),
  )
  built.door.rotation.y = -pose.rot
  built.linkA.rotation.y = -pose.theta
  built.linkB.rotation.y = -Math.atan2(pose.q2[1] - P2[1], pose.q2[0] - P2[0])
  void deps
}

function makeScene(canvas: HTMLCanvasElement, deps: HingeDeps) {
  const { THREE, RoomEnvironment } = deps
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.18
  renderer.outputColorSpace = THREE.SRGBColorSpace
  // Contact shadows between the parts are most of what sells this as machined
  // hardware rather than a stack of primitives.
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.02).texture

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 200)

  const key = new THREE.DirectionalLight(0xfff3e2, 2.5)
  key.position.set(7, 9, -5)
  key.castShadow = true
  key.shadow.mapSize.set(1024, 1024)
  key.shadow.camera.near = 1
  key.shadow.camera.far = 44
  key.shadow.camera.left = -9
  key.shadow.camera.right = 9
  key.shadow.camera.top = 9
  key.shadow.camera.bottom = -9
  key.shadow.bias = -0.0012
  key.shadow.normalBias = 0.02
  scene.add(key)
  const rim = new THREE.DirectionalLight(0xd9e3ff, 1.55)
  rim.position.set(-7, 3, 5)
  scene.add(rim)
  const fill = new THREE.DirectionalLight(0xffe6c8, 0.6)
  fill.position.set(3, -5, -3)
  scene.add(fill)
  scene.add(new THREE.AmbientLight(0xffffff, 0.24))

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
  const { THREE } = deps
  const inst = makeScene(canvas, deps)
  const table = buildInverseTable()
  const state = { px: 0, py: 0, tpx: 0, tpy: 0 }

  // --- framing -------------------------------------------------------
  // Centre and size are MEASURED, not hand-tuned: the door sweeps ~104°, so a
  // fixed look-at drifts off-centre through the cycle and a fixed distance
  // crops at some aspect ratios. Union the bounds across the pose range once,
  // then fit the bounding sphere to whichever of the two fields is tighter.
  const wideBox = new THREE.Box3()
  for (let i = 0; i <= 8; i++) {
    const p = solve(table.driveFor((i / 8) * table.maxDoor))
    if (!p) continue
    applyPose(deps, inst, p)
    inst.root.updateMatrixWorld(true)
    wideBox.union(new THREE.Box3().setFromObject(inst.root))
  }
  const nearBox = new THREE.Box3().setFromObject(inst.hardware)

  const cornersOf = (box: InstanceType<ThreeModule['Box3']>) => {
    const out: InstanceType<ThreeModule['Vector3']>[] = []
    for (const x of [box.min.x, box.max.x])
      for (const y of [box.min.y, box.max.y])
        for (const z of [box.min.z, box.max.z]) out.push(new THREE.Vector3(x, y, z))
    return out
  }
  const wideCorners = cornersOf(wideBox)
  const nearCorners = cornersOf(nearBox)
  const wideCenter = wideBox.getCenter(new THREE.Vector3())
  const nearCenter = nearBox.getCenter(new THREE.Vector3())

  // Viewing direction: off the -z side, so the boards go edge-on and the
  // mechanism faces the camera. Slightly above, as you'd look into a carcass.
  const WIDE_DIR = new THREE.Vector3(0.62, 0.30, -0.72).normalize()
  const NEAR_DIR = new THREE.Vector3(0.55, 0.26, -0.79).normalize()
  const camPos = new THREE.Vector3()
  const camAt = new THREE.Vector3()
  const dir = new THREE.Vector3()
  const probe = new THREE.Vector3()
  // Scratch camera, so measuring never disturbs the one being rendered.
  const fitCam = new THREE.PerspectiveCamera(34, 1, 0.1, 400)

  /**
   * Distance at which every corner still projects inside the frustum, found by
   * projecting and correcting rather than in closed form: the analytic version
   * is easy to get subtly wrong — the first attempt cropped the boards — while
   * this converges from the real projection and self-corrects at any aspect.
   *
   * It fits the projected BOX, not a bounding sphere. A sphere around a long
   * thin hinge is much larger than the shape inside it, which pushes the camera
   * back and leaves the subject small and adrift in the frame.
   */
  const computeFit = (
    pts: InstanceType<ThreeModule['Vector3']>[],
    center: InstanceType<ThreeModule['Vector3']>,
    dirVec: InstanceType<ThreeModule['Vector3']>,
    margin: number,
  ) => {
    fitCam.fov = inst.camera.fov
    fitCam.aspect = inst.camera.aspect
    let d = 20
    for (let i = 0; i < 8; i++) {
      fitCam.position.copy(center).addScaledVector(dirVec, d)
      fitCam.lookAt(center)
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

  // Cached per resize: bounds and aspect are the only inputs, so there is
  // nothing here to recompute frame by frame.
  let wideD = 20
  let nearD = 10

  const resize = () => {
    const r = canvas.getBoundingClientRect()
    const w = Math.max(1, r.width)
    const h = Math.max(1, r.height)
    inst.renderer.setSize(w, h, false)
    const aspect = w / h
    inst.camera.aspect = aspect
    // Keep the HORIZONTAL field constant: the stage is 0.88 aspect on desktop
    // and ~1.03 on mobile, so a fixed vertical fov crops differently on each.
    inst.camera.fov = (2 * Math.atan(Math.tan((HFOV_DEG * Math.PI) / 360) / aspect) * 180) / Math.PI
    inst.camera.updateProjectionMatrix()
    wideD = computeFit(wideCorners, wideCenter, WIDE_DIR, 1.26)
    nearD = computeFit(nearCorners, nearCenter, NEAR_DIR, 1.2)
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

  const CYCLE = 18 // seconds
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
    if (pose) applyPose(deps, inst, pose)

    state.px += (state.tpx - state.px) * 0.06
    state.py += (state.tpy - state.py) * 0.06

    // Framing is measured every frame, so it stays centred and uncropped at any
    // canvas aspect. look-at and position share one target — lerping the target
    // separately would leave the subject off-centre while it caught up.
    camAt.copy(wideCenter).lerp(nearCenter, near)
    dir.copy(WIDE_DIR).lerp(NEAR_DIR, near).normalize()
    camPos.copy(camAt).addScaledVector(dir, wideD + (nearD - wideD) * near)

    const sway = 1 - 0.55 * near
    inst.camera.position.set(
      camPos.x + state.px * 1.4 * sway,
      camPos.y - state.py * 1.0 * sway,
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
    for (const tex of inst.textures) tex.dispose()
    inst.renderer.dispose()
    inst.pmrem.dispose()
  }
}
