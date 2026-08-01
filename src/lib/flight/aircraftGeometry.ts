import {
  BufferGeometry,
  ExtrudeGeometry,
  LatheGeometry,
  Matrix4,
  Shape,
  Vector2,
  Vector3,
} from 'three'

/**
 * Procedural geometry for the airliner.
 *
 * The brief allows either a licensed GLB or a stylised aircraft built from
 * Three.js geometry. This project builds it, for three reasons: no third-party
 * asset licence to carry, no runtime fetch that can fail on a slow connection,
 * and full control over the silhouette so the roll and yaw read clearly from
 * directly behind - which is the one camera angle this app ever uses.
 *
 * Everything is authored nose-along-minus-Z (see sceneConfig for the axis
 * conventions) so the meshes need no corrective rotation at assembly time.
 */

/** Fuselage length, nose to tail. */
export const FUSELAGE_LENGTH = 9.2
/**
 * Maximum fuselage radius.
 *
 * A fineness ratio near 8:1. Chunkier proportions foreshorten into a near-circle
 * from directly astern - which is the only angle this app ever views the
 * aircraft from - and stop reading as a fuselage at all.
 */
export const FUSELAGE_RADIUS = 0.58
/** Z of the tail after the lathe is rotated and shifted into place. */
export const TAIL_Z = 4.0
/** Z of the nose tip. */
export const NOSE_Z = TAIL_Z - FUSELAGE_LENGTH

/**
 * Fuselage cross-section: `[radiusFraction, axialPosition]`, tail at 0 and nose
 * at 9.2, with the radius given as a fraction of `FUSELAGE_RADIUS`.
 *
 * A pointed nose, a long constant-radius cabin and a slim tapering tail cone -
 * the proportions that make a shape read as an airliner rather than a tube.
 */
const FUSELAGE_PROFILE: Array<[number, number]> = [
  [0.07, 0.0],
  [0.24, 0.3],
  [0.44, 0.75],
  [0.65, 1.3],
  [0.82, 1.9],
  [0.93, 2.45],
  [0.99, 3.0],
  [1.0, 3.4],
  [1.0, 6.6],
  [0.99, 7.05],
  [0.95, 7.45],
  [0.875, 7.85],
  [0.76, 8.25],
  [0.6, 8.6],
  [0.4, 8.9],
  [0.21, 9.1],
  [0.0, 9.2],
]

/** Where the tail cone starts lifting, and how hard. */
const UPSWEEP_START_Z = 0.8
const UPSWEEP_STRENGTH = 0.072

/** Hull radius at a given Z, used to sit windows flush against the skin. */
export function fuselageRadiusAtZ(z: number): number {
  const axial = TAIL_Z - z
  if (axial <= 0) return FUSELAGE_PROFILE[0][0] * FUSELAGE_RADIUS
  if (axial >= FUSELAGE_LENGTH) return 0

  for (let i = 1; i < FUSELAGE_PROFILE.length; i += 1) {
    const [prevFraction, prevAxial] = FUSELAGE_PROFILE[i - 1]
    const [fraction, axialPos] = FUSELAGE_PROFILE[i]
    if (axial <= axialPos) {
      const span = axialPos - prevAxial
      const t = span === 0 ? 0 : (axial - prevAxial) / span
      return (prevFraction + (fraction - prevFraction) * t) * FUSELAGE_RADIUS
    }
  }
  return 0
}

/** Vertical lift of the tail cone at a given Z. */
export function fuselageUpsweepAtZ(z: number): number {
  if (z <= UPSWEEP_START_Z) return 0
  const d = z - UPSWEEP_START_Z
  return d * d * UPSWEEP_STRENGTH
}

/**
 * Revolved fuselage with a lifted tail cone.
 *
 * `LatheGeometry` revolves around +Y, so the result is rotated a quarter turn
 * to put the axis along -Z, then the tail vertices are raised to give the
 * upswept rear end every modern airliner has.
 */
export function createFuselageGeometry(radialSegments = 24): BufferGeometry {
  const points = FUSELAGE_PROFILE.map(
    ([fraction, axial]) => new Vector2(fraction * FUSELAGE_RADIUS, axial),
  )
  const geometry: BufferGeometry = new LatheGeometry(points, radialSegments)

  geometry.rotateX(-Math.PI / 2) // +Y axis becomes -Z, i.e. forward
  geometry.translate(0, 0, TAIL_Z)

  const position = geometry.attributes.position
  for (let i = 0; i < position.count; i += 1) {
    const z = position.getZ(i)
    const lift = fuselageUpsweepAtZ(z)
    if (lift !== 0) position.setY(i, position.getY(i) + lift)
  }
  position.needsUpdate = true
  geometry.computeVertexNormals()

  return geometry
}

/**
 * Planform outline of a lifting surface.
 *
 * Points are `[spanwise, chordwise]` with +span outboard to starboard and
 * +chord toward the nose.
 */
export type Planform = Array<[number, number]>

/**
 * Wing planform.
 *
 * Root chord is deliberately about 18% of the fuselage length, matching a real
 * narrowbody. An earlier, chunkier version at nearly 40% made the two wings
 * merge into a single delta slab when seen from astern - the swept leading and
 * trailing edges closed up into one kite shape and the aircraft stopped reading
 * as an airliner.
 */
export const WING_PLANFORM: Planform = [
  [0.45, 0.75],
  [1.6, 0.35],
  [4.7, -1.35],
  [4.7, -1.85],
  [1.6, -1.15],
  [0.45, -0.95],
]

export const STABILISER_PLANFORM: Planform = [
  [0.22, 0.5],
  [1.8, -0.45],
  [1.8, -0.72],
  [0.22, -0.5],
]

export const FIN_PLANFORM: Planform = [
  [0.0, 0.85],
  [2.1, -0.55],
  [2.1, -1.15],
  [0.0, -0.95],
]

/** Winglet, positioned to sit on the wing's tip chord. */
export const WINGLET_PLANFORM: Planform = [
  [0.0, -1.35],
  [0.7, -1.5],
  [0.7, -1.78],
  [0.0, -1.85],
]

/**
 * Extrude a planform into a thin lifting surface.
 *
 * The bevel does double duty: it rounds the leading and trailing edges so the
 * surface catches light like an aerofoil instead of reading as a flat card.
 * The result lies in the XZ plane with thickness along Y.
 */
export function createLiftingSurfaceGeometry(
  planform: Planform,
  thickness = 0.2,
  bevel = 0.055,
): BufferGeometry {
  const shape = new Shape()
  const [first, ...rest] = planform
  shape.moveTo(first[0], first[1])
  for (const [x, y] of rest) shape.lineTo(x, y)
  shape.closePath()

  const geometry: BufferGeometry = new ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: 0,
    bevelSegments: 2,
    steps: 1,
    curveSegments: 4,
  })

  geometry.translate(0, 0, -thickness / 2)
  geometry.rotateX(-Math.PI / 2) // thickness to +Y, chord to -Z
  geometry.computeVertexNormals()

  return geometry
}

/**
 * Mirror a geometry across X for the port-side surfaces.
 *
 * Scaling by -1 inverts triangle winding, so the index order is flipped too -
 * otherwise the mirrored wing would be back-face culled and appear inside out.
 */
export function mirrorGeometryX(source: BufferGeometry): BufferGeometry {
  const geometry = source.clone()
  geometry.scale(-1, 1, 1)

  const index = geometry.getIndex()
  if (index) {
    const array = index.array as Uint16Array | Uint32Array
    for (let i = 0; i < array.length; i += 3) {
      const swap = array[i]
      array[i] = array[i + 2]
      array[i + 2] = swap
    }
    index.needsUpdate = true
  }

  geometry.computeVertexNormals()
  return geometry
}

export interface WindowRowOptions {
  /** Z range the row spans. */
  fromZ: number
  toZ: number
  spacing: number
  /** Angle above the fuselage centreline, in radians. */
  elevation: number
  /** Push the window slightly proud of the skin to avoid z-fighting. */
  surfaceOffset?: number
}

const WORLD_UP = new Vector3(0, 1, 0)
const FALLBACK_RIGHT = new Vector3(1, 0, 0)

/**
 * Orientation matrix for a flat quad lying on the hull with the given outward
 * normal, kept upright rather than rolled around that normal.
 *
 * Built as an explicit basis instead of chained `setFromUnitVectors` calls:
 * quaternion-from-vectors leaves the roll about the normal undefined, which
 * makes windows on the two sides of the hull disagree about which way is up.
 */
function surfaceMatrix(
  position: Vector3,
  normal: Vector3,
  width: number,
  height: number,
): Matrix4 {
  const forward = normal.clone().normalize()

  let right = new Vector3().crossVectors(WORLD_UP, forward)
  if (right.lengthSq() < 1e-6) right = FALLBACK_RIGHT.clone()
  right.normalize()

  const up = new Vector3().crossVectors(forward, right).normalize()

  return new Matrix4()
    .makeBasis(right.multiplyScalar(width), up.multiplyScalar(height), forward)
    .setPosition(position)
}

/**
 * Instance matrices for a row of cabin windows on both sides of the hull.
 *
 * Each window is placed against the local hull radius, so the row follows the
 * fuselage taper and the tail upsweep instead of floating off the skin.
 */
export function createCabinWindowMatrices(options: WindowRowOptions): Matrix4[] {
  const { fromZ, toZ, spacing, elevation, surfaceOffset = 0.012 } = options
  const matrices: Matrix4[] = []

  for (let z = fromZ; z <= toZ; z += spacing) {
    const radius = fuselageRadiusAtZ(z) + surfaceOffset
    if (radius <= 0.45) continue
    const lift = fuselageUpsweepAtZ(z)

    for (const side of [-1, 1] as const) {
      const normal = new Vector3(side * Math.cos(elevation), Math.sin(elevation), 0)
      const position = new Vector3(
        side * radius * Math.cos(elevation),
        radius * Math.sin(elevation) + lift,
        z,
      )
      matrices.push(surfaceMatrix(position, normal, 1, 1))
    }
  }

  return matrices
}

/** Instance matrices for the flight-deck glazing, two panes per side. */
export function createCockpitWindowMatrices(): Matrix4[] {
  const panes: Array<{ z: number; elevation: number; yaw: number; width: number }> = [
    { z: -4.05, elevation: 0.62, yaw: 0.38, width: 0.9 },
    { z: -3.6, elevation: 0.52, yaw: 0.14, width: 1.2 },
  ]

  const matrices: Matrix4[] = []

  for (const pane of panes) {
    const radius = fuselageRadiusAtZ(pane.z) + 0.014
    for (const side of [-1, 1] as const) {
      const normal = new Vector3(
        side * Math.cos(pane.elevation),
        Math.sin(pane.elevation),
        -Math.sin(pane.yaw),
      )
      const position = new Vector3(
        side * radius * Math.cos(pane.elevation),
        radius * Math.sin(pane.elevation),
        pane.z,
      )
      matrices.push(surfaceMatrix(position, normal, pane.width, 1))
    }
  }

  return matrices
}

/**
 * Engine mounting points: about 40% of the way out along the wing and slung
 * forward of the leading edge, as on any underwing turbofan installation.
 */
export const ENGINE_POSITIONS: Array<[number, number, number]> = [
  [-1.9, -0.62, -1.6],
  [1.9, -0.62, -1.6],
]

/** Nacelle radius, kept near 60% of the fuselage radius like a real turbofan. */
export const NACELLE_RADIUS = 0.35

/** Navigation light positions: port red, starboard green, tail white. */
export const NAV_LIGHTS = {
  port: [-4.72, 0.17, 1.1] as [number, number, number],
  starboard: [4.72, 0.17, 1.1] as [number, number, number],
  tail: [0, 0.74, 3.95] as [number, number, number],
  beacon: [0, 0.62, -0.4] as [number, number, number],
} as const
