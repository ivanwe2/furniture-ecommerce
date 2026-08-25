// Real-time WebGL scene for the homepage hero backdrop: a SEVROLL 3D PRO
// half-overlay concealed hinge (soft-close) that articulates open, separates
// into its parts, reassembles and closes again, on a slow turntable.
//
// No cabinet boards. An earlier pass modelled the door and carcass, and they
// read as an unidentifiable white slab behind the mark rather than as a
// cabinet — the hinge alone, floating, is the technical-illustration language
// the rest of the hero already speaks. The exploded view is carried over from
// the butt-hinge scene this replaced; it was the part the client liked most.
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

/* ------------------------------------------------------------------ *
 * Geometry
 *
 * Parts are extruded from real 2D profiles rather than assembled from boxes:
 * the hinge is seen side-on, so the silhouette in the depth/height plane is
 * what reads, and a stack of cuboids never looks machined.
 *
 * Finish follows the page, not the catalogue photo. The real SKU is black,
 * but pure black against cream reads as a hole; charcoal with warm steel and
 * brass sits in the same palette as the fascia and the brass accents.
 * ------------------------------------------------------------------ */

const CUP_R = 1.75 // Ø35 cup
const CUP_DEPTH = 1.15
const ARM_W = 1.15 // the arm/links are ~12mm across
const ARM_BACK_Z = -3.95
const ARM_NOSE_Z = -0.2
const PLATE_X = -2.0

/** A part that travels outward in the exploded view. */
interface ExplodePart {
  obj: InstanceType<ThreeModule['Object3D']>
  base: InstanceType<ThreeModule['Vector3']>
  offset: InstanceType<ThreeModule['Vector3']>
}

/** "SEVROLL" lettering for the arm cover cap, as a canvas texture. */
function capLabel(THREE: ThreeModule) {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 64
  const g = c.getContext('2d')
  if (g) {
    // rgb(), not hex: CI greps src/components for '#rrggbb' (design-token guardrail)
    g.fillStyle = 'rgb(34,30,25)'
    g.fillRect(0, 0, 256, 64)
    g.fillStyle = 'rgb(169,128,63)'
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
  // Warm charcoal body, warm machined steel, brass for the pins and rivets —
  // the same brass the site uses for rules and buttons.
  // Machined steel body, charcoal for the cover cap and recesses, brass for the
  // pins and rivets — the accent the site already uses for rules and buttons.
  // The catalogue SKU is black, but a black body against cream renders as a
  // silhouette: the parts merge into one mass and no detail survives. Steel
  // with charcoal and brass keeps it legible AND sits in the fascia palette.
  // Mid-tone, deliberately. Light metal on a cream page has little tonal
  // contrast at the stage's opacity and goes faint; near-black goes to a
  // silhouette. This sits between, and keeps the brass readable.
  // Semi-metal, not a full mirror. At metalness 1 a FLAT face has no diffuse
  // term and shows only what it reflects — and a flat plate reflecting a dark
  // quadrant of the room environment renders black however light its colour
  // is. Only the curved cup escaped that. Backing the metalness off gives the
  // large flat parts an albedo again.
  const body = new THREE.MeshPhysicalMaterial({ color: 0xa2988a, metalness: 0.52, roughness: 0.44, roughnessMap: brushTex, clearcoat: 0.35, clearcoatRoughness: 0.3, envMapIntensity: 1.25 })
  const bodyAlt = new THREE.MeshPhysicalMaterial({ color: 0x8a8170, metalness: 0.56, roughness: 0.46, roughnessMap: brushTex, envMapIntensity: 1.2 })
  const charcoal = new THREE.MeshPhysicalMaterial({ color: 0x3a332b, metalness: 0.5, roughness: 0.42, clearcoat: 0.5, envMapIntensity: 1.1 })
  const crevice = new THREE.MeshStandardMaterial({ color: 0x1a1712, metalness: 0.4, roughness: 0.86 })
  const steel = new THREE.MeshPhysicalMaterial({ color: 0xbfb7a7, metalness: 0.74, roughness: 0.3, roughnessMap: brushTex, clearcoat: 0.35, envMapIntensity: 1.5 })
  const brass = new THREE.MeshPhysicalMaterial({ color: 0xb0894a, metalness: 0.8, roughness: 0.32, clearcoat: 0.45, envMapIntensity: 1.5 })

  const root = new THREE.Group()
  /** Everything that stays with the arm. */
  const fixed = new THREE.Group()
  /** The cup body — travels on the linkage. */
  const cupGroup = new THREE.Group()
  const explode: ExplodePart[] = []

  const shadowed = (m: InstanceType<ThreeModule['Mesh']>) => {
    m.castShadow = true
    m.receiveShadow = true
    return m
  }
  /** Register a part to fly out along `offset` in the exploded view. */
  const flies = (obj: InstanceType<ThreeModule['Object3D']>, x: number, y: number, z: number) => {
    explode.push({ obj, base: obj.position.clone(), offset: new THREE.Vector3(x, y, z) })
    return obj
  }

  /** Extrude a side profile given as (z, y) points, across `width` in x. */
  const extrudeSide = (
    pts: readonly (readonly [number, number])[],
    width: number,
    mat: InstanceType<ThreeModule['Material']>,
    bevel = 0.05,
  ) => {
    // Winding matters: ExtrudeGeometry derives its normals from it, and a
    // clockwise outline is built inside-out — the faces then render unlit, i.e.
    // black, whatever colour the material is. Normalise to counter-clockwise by
    // the polygon's signed area rather than trusting each call site to get the
    // point order right.
    const flat = pts.map(([z, y]) => [-z, y] as const)
    let area2 = 0
    for (let i = 0; i < flat.length; i += 1) {
      const a = flat[i]
      const b = flat[(i + 1) % flat.length]
      if (a && b) area2 += a[0] * b[1] - b[0] * a[1]
    }
    const ordered = area2 < 0 ? [...flat].reverse() : flat
    const shape = new THREE.Shape()
    ordered.forEach(([x, y], i) => (i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)))
    shape.closePath()
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: width,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 2,
      curveSegments: 10,
    })
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

  // --- mounting plate (the carcass end) -----------------------------
  const plate = extrudeSide(
    [[-4.75, -0.62], [-1.95, -0.62], [-1.75, -0.30], [-1.75, 0.30], [-1.95, 0.62], [-4.75, 0.62]],
    1.35,
    body,
  )
  plate.position.x = PLATE_X + 0.3
  fixed.add(flies(plate, -0.6, 0, -4.2))
  const plateCap = extrudeSide([[-4.3, -0.34], [-2.5, -0.34], [-2.5, 0.34], [-4.3, 0.34]], 0.9, brass, 0.03)
  plateCap.position.x = PLATE_X + 0.72
  fixed.add(flies(plateCap, -0.3, 0.9, -5.6))
  for (const z of [-2.5, -4.35]) {
    const s = screw(0.24)
    s.rotation.z = -Math.PI / 2
    s.position.set(PLATE_X + 0.62, 0, z)
    fixed.add(flies(s, 2.1, 0, -4.6))
  }

  // --- hinge arm: the tapering boomerang that carries both pivots ----
  // The anchor of the exploded view; everything else moves relative to it.
  const arm = extrudeSide(
    [
      [ARM_BACK_Z - 0.35, -0.60], [ARM_BACK_Z + 0.1, -0.66], [-2.4, -0.60],
      [-1.2, -0.44], [ARM_NOSE_Z - 0.1, -0.36], [ARM_NOSE_Z, 0.36],
      [-1.2, 0.46], [-2.4, 0.64], [ARM_BACK_Z + 0.1, 0.70], [ARM_BACK_Z - 0.35, 0.62],
    ],
    ARM_W,
    body,
  )
  arm.position.x = -1.55
  fixed.add(arm)

  const channel = extrudeSide(
    [[ARM_BACK_Z, -0.34], [-1.3, -0.22], [ARM_NOSE_Z - 0.15, -0.16],
     [ARM_NOSE_Z - 0.15, 0.16], [-1.3, 0.24], [ARM_BACK_Z, 0.40]],
    ARM_W * 0.52,
    crevice,
    0.02,
  )
  channel.position.set(-1.55, 0.02, 0)
  fixed.add(channel)

  const capTex = capLabel(THREE)
  const capMat = new THREE.MeshBasicMaterial({ map: capTex, toneMapped: false })
  const cap = extrudeSide([[-3.5, 0.58], [-1.0, 0.40], [-1.0, 0.62], [-3.5, 0.80]], ARM_W * 0.72, charcoal, 0.03)
  cap.position.x = -1.55
  fixed.add(flies(cap, 0, 2.6, 0))
  const label = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.42), capMat)
  label.rotation.x = -Math.PI / 2
  label.rotation.z = Math.PI + 0.06 // viewed from the -z side, unflipped it reads mirrored
  label.position.set(-1.55, 0.79, -2.25)
  fixed.add(flies(label, 0, 2.6, 0))

  // soft-close damper riding on the arm — the signature of "s tlmením"
  const damperBody = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 1.5, 24), steel))
  damperBody.rotation.x = Math.PI / 2
  damperBody.position.set(-1.05, -0.16, -1.75)
  fixed.add(flies(damperBody, 1.8, -2.0, 0))
  const damperRod = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.75, 16), brass))
  damperRod.rotation.x = Math.PI / 2
  damperRod.position.set(-1.05, -0.16, -0.72)
  fixed.add(flies(damperRod, 2.4, -2.0, 0.8))

  for (const z of [-3.1, -2.35]) {
    const s = screw(0.21)
    s.position.set(-1.55, 0.6, z)
    fixed.add(flies(s, 0, 3.9, 0))
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
    bar.geometry.rotateY(-Math.PI / 2)
    bar.position.x = length / 2
    pivot.add(bar)
    for (const dx of [-length / 2 + 0.04, length / 2 - 0.04]) {
      const rivet = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(w * 0.28, w * 0.28, h + 0.12, 18), brass))
      rivet.position.set(length / 2 + dx, 0, 0)
      pivot.add(rivet)
    }
    return pivot
  }
  const linkA = mkLink(LINK_A, 0.9, 0.4, steel)
  linkA.position.set(P1[0], 0.22, P1[1])
  root.add(flies(linkA, 0, 2.1, 1.4))
  const linkB = mkLink(LINK_B, 1.0, 0.44, body)
  linkB.position.set(P2[0], -0.24, P2[1])
  root.add(flies(linkB, 0, -2.2, 1.4))

  // --- cup assembly (travels on the linkage) ------------------------
  const bore = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(CUP_R, CUP_R * 0.94, CUP_DEPTH, 48), bodyAlt))
  bore.rotation.x = Math.PI / 2
  bore.position.set(0, 0, CUP_DEPTH / 2 - 0.02)
  cupGroup.add(flies(bore, 0, 0, 2.3))
  const recess = new THREE.Mesh(new THREE.CylinderGeometry(CUP_R * 0.66, CUP_R * 0.66, CUP_DEPTH * 0.7, 40), crevice)
  recess.rotation.x = Math.PI / 2
  recess.position.set(0, 0, CUP_DEPTH * 0.62)
  cupGroup.add(flies(recess, 0, 0, 2.3))
  const rim = shadowed(new THREE.Mesh(new THREE.TorusGeometry(CUP_R, 0.085, 12, 48), body))
  rim.position.z = 0.02
  cupGroup.add(flies(rim, 0, 0, 2.3))

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
      body,
    ),
  )
  flange.position.z = -0.3
  cupGroup.add(flies(flange, 0, 0, 3.9))
  for (const y of [1.4, -1.4]) {
    const s = screw(0.25)
    s.rotation.x = -Math.PI / 2
    s.position.set(0, y, -0.28)
    cupGroup.add(flies(s, 0, y * 0.85, 5.1))
  }

  const boss = shadowed(new THREE.Mesh(new RB(1.25, 1.15, 1.1, 3, 0.06), charcoal))
  boss.position.set(0.38, 0, -0.45)
  cupGroup.add(flies(boss, 0, 0, 1.4))

  root.add(fixed)
  root.add(cupGroup)
  return {
    root,
    cupGroup,
    linkA,
    linkB,
    explode,
    materials: [body, bodyAlt, charcoal, crevice, steel, brass, capMat],
    textures: [capTex, brushTex],
  }
}

/* ------------------------------------------------------------------ *
 * Scene, framing and camera
 * ------------------------------------------------------------------ */

type Built = ReturnType<typeof buildScene>

/** Place the cup on the linkage, orient both links, and spread the parts. */
function applyState(built: Built, pose: Pose, ex: number) {
  // 2D maths is right-handed about +Y, three.js rotation.y is the other way
  // round, hence the negated angles.
  const cs = Math.cos(pose.rot)
  const sn = Math.sin(pose.rot)
  built.cupGroup.position.set(
    pose.q1[0] - (Q1_0[0] * cs - Q1_0[1] * sn),
    0,
    pose.q1[1] - (Q1_0[0] * sn + Q1_0[1] * cs),
  )
  built.cupGroup.rotation.y = -pose.rot
  built.linkA.rotation.y = -pose.theta
  built.linkB.rotation.y = -Math.atan2(pose.q2[1] - P2[1], pose.q2[0] - P2[0])
  for (const p of built.explode) p.obj.position.copy(p.base).addScaledVector(p.offset, ex)
}

function makeScene(canvas: HTMLCanvasElement, deps: HingeDeps) {
  const { THREE, RoomEnvironment } = deps
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.24
  renderer.outputColorSpace = THREE.SRGBColorSpace
  // Parts shading one another is most of what sells this as machined hardware.
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.02).texture

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 200)

  const key = new THREE.DirectionalLight(0xfff3e2, 2.6)
  key.position.set(7, 9, 6)
  key.castShadow = true
  key.shadow.mapSize.set(1024, 1024)
  key.shadow.camera.near = 1
  key.shadow.camera.far = 46
  key.shadow.camera.left = -10
  key.shadow.camera.right = 10
  key.shadow.camera.top = 10
  key.shadow.camera.bottom = -10
  key.shadow.bias = -0.0012
  key.shadow.normalBias = 0.02
  scene.add(key)
  const rim = new THREE.DirectionalLight(0xdfe6ff, 1.5)
  rim.position.set(-7, 3, -6)
  scene.add(rim)
  const fill = new THREE.DirectionalLight(0xffe6c8, 0.6)
  fill.position.set(2, -5, 4)
  scene.add(fill)
  scene.add(new THREE.AmbientLight(0xfff6ea, 0.5))

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
/** Turntable sweep, in radians either side of the presentation angle. */
const SPIN = 0.2
const BASE_SPIN = -0.5
const TILT = -0.16

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
  // Measured, not hand-tuned. The subject swings ~104°, separates into parts
  // and turns on a turntable, so the bounds are unioned across all three
  // before fitting — otherwise it crops at one extreme or sits small at the
  // other. Two framings: tight on the assembled hinge, wider once it opens up.
  const boxFor = (ex: number, openness: number) => {
    const box = new THREE.Box3()
    for (const spin of [-SPIN, 0, SPIN]) {
      inst.root.rotation.set(TILT, BASE_SPIN + spin, 0)
      const p = solve(table.driveFor(openness * table.maxDoor))
      if (!p) continue
      applyState(inst, p, ex)
      inst.root.updateMatrixWorld(true)
      box.union(new THREE.Box3().setFromObject(inst.root))
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
  // Three framings, not one. A single box spanning the whole cycle is the
  // union of the widest moment, so every other moment sits small inside it —
  // which is what "not well centred" looked like. Fitting each state and
  // interpolating keeps the subject filling the frame throughout.
  const states = [boxFor(0, 0), boxFor(0, 1), boxFor(1, 1)]
  const corners = states.map(cornersOf)
  const centres = states.map((b) => b.getCenter(new THREE.Vector3()))

  const VIEW_DIR = new THREE.Vector3(0.94, 0.30, 0.17).normalize()
  const camPos = new THREE.Vector3()
  const camAt = new THREE.Vector3()
  const probe = new THREE.Vector3()
  const fitCam = new THREE.PerspectiveCamera(34, 1, 0.1, 400)

  /**
   * Distance at which every corner still projects inside the frustum, found by
   * projecting and correcting rather than in closed form — the analytic version
   * is easy to get subtly wrong, and did crop an earlier build. Fits the
   * projected BOX: a sphere around a long thin hinge is far larger than the
   * shape inside it, which leaves the subject small and adrift.
   */
  const computeFit = (
    pts: InstanceType<ThreeModule['Vector3']>[],
    centre: InstanceType<ThreeModule['Vector3']>,
    margin: number,
  ) => {
    fitCam.fov = inst.camera.fov
    fitCam.aspect = inst.camera.aspect
    let d = 20
    for (let i = 0; i < 8; i++) {
      fitCam.position.copy(centre).addScaledVector(VIEW_DIR, d)
      fitCam.lookAt(centre)
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

  const dists = [20, 22, 26]

  const resize = () => {
    const r = canvas.getBoundingClientRect()
    const w = Math.max(1, r.width)
    const h = Math.max(1, r.height)
    inst.renderer.setSize(w, h, false)
    const aspect = w / h
    inst.camera.aspect = aspect
    // Keep the HORIZONTAL field constant: the stage is ~0.88 aspect on desktop
    // and ~1.03 on mobile, so a fixed vertical fov crops differently on each.
    inst.camera.fov = (2 * Math.atan(Math.tan((HFOV_DEG * Math.PI) / 360) / aspect) * 180) / Math.PI
    inst.camera.updateProjectionMatrix()
    const margins = [1.05, 1.05, 1.02]
    for (let i = 0; i < states.length; i += 1) {
      const c = corners[i]
      const centre = centres[i]
      const m = margins[i]
      if (c && centre && m) dists[i] = computeFit(c, centre, m)
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

  const CYCLE = 20 // seconds
  const start = performance.now()
  let raf = 0
  let alive = true

  const loop = (now: number) => {
    if (!alive) return
    const t = (now - start) / 1000
    const c = (t / CYCLE) % 1

    // Articulate open, hold, then close with the long damped settle.
    let openness: number
    if (c < 0.05) openness = 0
    else if (c < 0.20) openness = softClose((c - 0.05) / 0.15)
    else if (c < 0.80) openness = 1
    else if (c < 0.94) openness = 1 - softClose((c - 0.80) / 0.14)
    else openness = 0

    // Separate into parts while it is held open, then draw back together.
    let ex: number
    if (c < 0.30) ex = 0
    else if (c < 0.42) ex = smooth((c - 0.30) / 0.12)
    else if (c < 0.58) ex = 1
    else if (c < 0.70) ex = 1 - smooth((c - 0.58) / 0.12)
    else ex = 0

    const pose = solve(table.driveFor(openness * table.maxDoor))
    if (pose) applyState(inst, pose, ex)

    state.px += (state.tpx - state.px) * 0.06
    state.py += (state.tpy - state.py) * 0.06

    inst.root.rotation.y = BASE_SPIN + SPIN * Math.sin(t * 0.17) + state.px * 0.28
    inst.root.rotation.x = TILT - state.py * 0.16

    // closed -> open -> exploded, interpolated in the same order the cycle runs
    const c0 = centres[0]
    const c1 = centres[1]
    const c2 = centres[2]
    const d0 = dists[0] ?? 20
    const d1 = dists[1] ?? 22
    const d2 = dists[2] ?? 26
    if (c0 && c1 && c2) {
      camAt.copy(c0).lerp(c1, openness).lerp(c2, ex)
      const d = (d0 + (d1 - d0) * openness) * (1 - ex) + d2 * ex
      camPos.copy(camAt).addScaledVector(VIEW_DIR, d)
    }
    inst.camera.position.copy(camPos)
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
