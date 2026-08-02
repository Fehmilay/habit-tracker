import {
  createFlightIntegrationState,
  type FlightIntegrationState,
} from './flightDynamics'

/**
 * Per-frame flight values, deliberately kept out of React state.
 *
 * Heading, roll and pitch change every single frame. Pushing them through a
 * store would re-render the HUD 60 times a second for values that are only
 * ever read, never diffed. Instead the driver writes into this mutable object
 * and consumers - the aircraft mesh, the camera, the degree readout - read it
 * inside their own frame loop.
 *
 * Discrete state that React genuinely needs to react to (animation phase,
 * camera mode, targets) lives in the Zustand store instead.
 */
export interface FlightRuntime extends FlightIntegrationState {
  /** Pitch attitude in degrees. */
  currentPitchDegrees: number
  /** Vertical offset in world units, from the gentle idle motion. */
  verticalOffset: number
  /** Seconds since the scene started. */
  elapsedSeconds: number
  /** Scales all idle motion; 0 under prefers-reduced-motion. */
  ambientMotion: number
  /**
   * Smoothed 0..1 "pulled back to the globe" amount.
   *
   * Driven by `FlightDriver` off the store's raw `zoomTarget` (itself set
   * directly by the wheel/pinch gesture), the same way heading and roll are
   * driven off `targetHeadingDegrees`. Consumers - the camera, the globe, the
   * chase-view meshes - read this each frame rather than the raw target, so a
   * jumpy gesture never produces a jumpy camera.
   */
  zoomOut: number
}

export function createFlightRuntime(headingDegrees = 0): FlightRuntime {
  return {
    ...createFlightIntegrationState(headingDegrees),
    currentPitchDegrees: 0,
    verticalOffset: 0,
    elapsedSeconds: 0,
    ambientMotion: 1,
    zoomOut: 0,
  }
}

/** The runtime instance shared by the live scene. */
export const flightRuntime: FlightRuntime = createFlightRuntime()

export function resetFlightRuntime(headingDegrees = 0): void {
  Object.assign(flightRuntime, createFlightRuntime(headingDegrees))
}

/**
 * Deviation from the planned course, in degrees.
 *
 * The planned course is the reference direction the course line is drawn along,
 * so deviation is simply how far the nose has wandered off it.
 */
export function deviationDegrees(
  runtime: FlightRuntime,
  plannedHeadingDegrees: number,
): number {
  return runtime.currentHeadingDegrees - plannedHeadingDegrees
}
