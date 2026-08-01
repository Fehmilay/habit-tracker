/**
 * Scene conventions and tuning constants.
 *
 * COORDINATE SYSTEM
 * -----------------
 * Standard Three.js right-handed axes: +X right, +Y up, +Z toward the viewer.
 * The aircraft's nose points along -Z, so:
 *
 *   forward = (0, 0, -1)   up = (0, 1, 0)   starboard = forward x up = (1, 0, 0)
 *
 * That makes +X the right wing, which is why the green navigation light sits on
 * +X and the red one on -X.
 *
 * ROTATION SIGNS
 * --------------
 * A positive rotation about +Y swings the nose from -Z toward -X, i.e. to the
 * left. Heading is measured positive-to-the-right, so `rotation.y = -heading`.
 * Likewise a positive rotation about +Z lifts the right wing, and a right bank
 * drops it, so `rotation.z = -roll`. Euler order is YXZ (yaw, then pitch, then
 * roll) which is the order these rotations physically compose in.
 *
 * WHY THE AIRCRAFT DOES NOT TRANSLATE
 * -----------------------------------
 * The aircraft sits at the origin and only rotates; the world scrolls past it.
 * Two reasons. First, floating-point precision stays perfect over an
 * arbitrarily long flight. Second, and more importantly, it makes the course
 * line read correctly: the line is anchored to the planned heading, so a
 * standing +3 degree deviation shows up as a permanent 3 degree angular offset
 * rather than decaying into a lateral drift that eventually leaves the frame.
 */

/** Reference direction of the planned course, in world space. */
export const PLANNED_COURSE_DIRECTION = { x: 0, y: 0, z: -1 } as const

export interface CameraRig {
  /** Offset behind and above the aircraft, in the camera's own yaw frame. */
  offset: { x: number; y: number; z: number }
  /** Point the camera aims at, also in the camera's yaw frame. */
  lookAt: { x: number; y: number; z: number }
  /**
   * Horizontal field of view on portrait viewports.
   *
   * Framing is specified horizontally rather than vertically because a phone
   * held upright has an aspect ratio near 0.46: a fixed vertical FOV collapses
   * the horizontal one to roughly 25 degrees, which crops the wings straight
   * off the sides of the frame.
   */
  hFovPortrait: number
  /** Vertical field of view once the viewport is landscape or square. */
  vFovLandscape: number
}

/**
 * Camera placement per mode.
 *
 * `chase` is tuned so the aircraft sits in the lower-middle of the frame at
 * roughly 45% of the screen width, with the horizon above it and the course
 * line running out ahead and below.
 */
export const CAMERA_RIGS = {
  // Roughly 20 degrees above the aircraft: high enough that the fuselage reads
  // as a body rather than foreshortening into a disc, low enough that the
  // horizon stays in the upper third instead of sliding off the top.
  chase: {
    offset: { x: 0, y: 11.5, z: 31 },
    lookAt: { x: 0, y: -12.7, z: -66 },
    hFovPortrait: 38,
    vFovLandscape: 42,
  },
  closeup: {
    offset: { x: 0, y: 9.0, z: 24 },
    lookAt: { x: 0, y: -10.5, z: -58 },
    hFovPortrait: 34,
    vFovLandscape: 38,
  },
  wide: {
    offset: { x: 0, y: 17.5, z: 47 },
    lookAt: { x: 0, y: -16.5, z: -84 },
    hFovPortrait: 46,
    vFovLandscape: 50,
  },
} as const satisfies Record<string, CameraRig>

/** Guard against extreme distortion on unusually tall or narrow viewports. */
export const MAX_VERTICAL_FOV = 78

/**
 * Vertical FOV that gives the intended framing at the current aspect ratio.
 *
 * Portrait viewports are driven from the horizontal FOV so the aircraft is the
 * same size on every phone; landscape ones use the vertical value directly.
 */
export function verticalFovForAspect(rig: CameraRig, aspect: number): number {
  if (!Number.isFinite(aspect) || aspect <= 0) return rig.vFovLandscape
  if (aspect >= 1) return rig.vFovLandscape

  const halfHorizontal = (rig.hFovPortrait / 2) * (Math.PI / 180)
  const halfVertical = Math.atan(Math.tan(halfHorizontal) / aspect)
  const degrees = (halfVertical * 2 * 180) / Math.PI

  return Math.min(degrees, MAX_VERTICAL_FOV)
}

export const CAMERA_TUNING = {
  /** Position damping (1/s). Lower is looser and lags further behind. */
  positionLambda: 2.4,
  /** Yaw damping (1/s). Deliberately slower than the aircraft's own turn. */
  yawLambda: 1.8,
  /** Aim-point damping (1/s). */
  lookAtLambda: 3.0,
  /** Rig interpolation when switching camera modes (1/s). */
  rigLambda: 1.6,
  /**
   * How much of the aircraft's bank the camera copies. Zero would feel detached,
   * one causes motion sickness; a quarter reads as sympathetic without tilting
   * the horizon far.
   */
  rollFollow: 0.22,
  /** Hard cap on camera bank, in degrees. */
  maxRollDegrees: 7,
} as const

export const COURSE_LINE = {
  /**
   * Where the ribbon starts, well ahead of the nose. Far enough forward that
   * it emerges clear of the aircraft rather than running underneath it.
   */
  nearZ: -30,
  /** Where it fades out toward the horizon. */
  farZ: -620,
  /** Height below the aircraft, so the fuselage never fully hides it. */
  y: -2.6,
  /** Ribbon width in world units. */
  width: 3.2,
  /** Half-width of the faint target corridor. */
  corridorHalfWidth: 6,
  /** Spacing of the vertical light gates. */
  gateSpacing: 22,
  dashLength: 8,
  dashGap: 7,
} as const

export const AIRCRAFT = {
  /** Uniform scale applied to the modelled geometry. */
  scale: 1,
  /** Fuselage length in world units, nose to tail. */
  length: 9.2,
  /** Tip-to-tip wingspan. */
  span: 9.4,
} as const

export const ENVIRONMENT = {
  skyRadius: 2400,
  fogDensity: 0.00135,
  /** Altitude of the thin cloud deck below the aircraft. */
  cloudDeckY: -95,
  /** Range that individual clouds are recycled through. */
  cloudSpawnZ: -640,
  cloudRecycleZ: 90,
  cloudSpreadX: 300,
} as const
