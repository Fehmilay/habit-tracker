import { clamp, damp, safeDelta, turbulence } from './flightMath'

/**
 * Visual flight model for the course scene.
 *
 * This is not a flight simulator. It is a coordinated-turn model chosen because
 * it reproduces, from a single heading target, exactly the sequence the brief
 * asks for:
 *
 *   1. the aircraft banks into the turn first,
 *   2. the heading then follows the bank,
 *   3. as the heading error runs out the bank returns to near zero,
 *   4. the new heading stays.
 *
 * The bank angle is commanded proportionally to the remaining heading error,
 * and the turn rate is proportional to the current bank - the same coupling a
 * real aircraft has. Nothing is scripted per animation, so an arbitrary target
 * change produces a plausible manoeuvre without special cases.
 */
export interface FlightDynamicsConfig {
  /** Commanded bank in degrees per degree of remaining heading error. */
  rollPerHeadingError: number
  /** Hard limit on bank angle - keeps the aircraft "controlled" at +3 degrees. */
  maxRollDegrees: number
  /** Heading change in degrees per second per degree of bank. */
  turnRatePerRollDegree: number
  /** Roll response rate (1/s). Higher banks in faster. */
  rollResponse: number
  /** Safety clamp on turn rate so nothing ever looks like a snap. */
  maxTurnRateDegreesPerSecond: number
  /** Heading error below which the manoeuvre counts as settled. */
  headingEpsilonDegrees: number
  /** Nose-down coupling: degrees of pitch per degree of bank. */
  pitchPerRollDegree: number
}

export const DEFAULT_FLIGHT_DYNAMICS: FlightDynamicsConfig = {
  // Tuned together: loop gain (rollPerHeadingError * turnRatePerRollDegree) of
  // 1.2/s against a roll response of 3.0/s gives a damping ratio near 0.83 and
  // reaches ~90% of a heading change in about 1.4s - the "roughly 1.5 seconds"
  // in the brief - with no visible overshoot.
  rollPerHeadingError: 6.0,
  maxRollDegrees: 26,
  turnRatePerRollDegree: 0.2,
  rollResponse: 3.0,
  maxTurnRateDegreesPerSecond: 9,
  headingEpsilonDegrees: 0.01,
  pitchPerRollDegree: 0.035,
}

export interface FlightIntegrationState {
  currentHeadingDegrees: number
  currentRollDegrees: number
  /** Bank the model is currently asking for, before roll lag. */
  targetRollDegrees: number
}

export function createFlightIntegrationState(
  headingDegrees = 0,
): FlightIntegrationState {
  return {
    currentHeadingDegrees: headingDegrees,
    currentRollDegrees: 0,
    targetRollDegrees: 0,
  }
}

/**
 * Commanded bank angle for a given heading error.
 *
 * Exported so the HUD and tests can reason about the intended bank without
 * running the integrator.
 */
export function commandedRoll(
  headingErrorDegrees: number,
  config: FlightDynamicsConfig = DEFAULT_FLIGHT_DYNAMICS,
): number {
  return clamp(
    headingErrorDegrees * config.rollPerHeadingError,
    -config.maxRollDegrees,
    config.maxRollDegrees,
  )
}

/**
 * Advance the flight model by one frame.
 *
 * Mutates and returns `state` - this runs every frame, so allocating a fresh
 * object per call would be needless garbage.
 */
export function stepFlightDynamics(
  state: FlightIntegrationState,
  targetHeadingDegrees: number,
  deltaSeconds: number,
  config: FlightDynamicsConfig = DEFAULT_FLIGHT_DYNAMICS,
): FlightIntegrationState {
  const dt = safeDelta(deltaSeconds)
  if (dt === 0) return state

  const headingError = targetHeadingDegrees - state.currentHeadingDegrees

  state.targetRollDegrees = commandedRoll(headingError, config)

  // Bank lags the command - this is what makes the roll visibly lead the turn.
  state.currentRollDegrees = damp(
    state.currentRollDegrees,
    state.targetRollDegrees,
    config.rollResponse,
    dt,
  )

  // Coordinated turn: heading rate follows bank angle.
  const turnRate = clamp(
    state.currentRollDegrees * config.turnRatePerRollDegree,
    -config.maxTurnRateDegreesPerSecond,
    config.maxTurnRateDegreesPerSecond,
  )

  const nextHeading = state.currentHeadingDegrees + turnRate * dt

  // Snap the last hundredth of a degree so a settled course reads as exactly
  // 0 degrees instead of asymptotically approaching it.
  if (
    Math.abs(targetHeadingDegrees - nextHeading) < config.headingEpsilonDegrees ||
    // Overshoot guard: never step past the target within a single frame.
    Math.sign(targetHeadingDegrees - nextHeading) !== Math.sign(headingError)
  ) {
    state.currentHeadingDegrees = targetHeadingDegrees
  } else {
    state.currentHeadingDegrees = nextHeading
  }

  return state
}

/** Pitch attitude for the current bank, plus a touch of deterministic air. */
export function pitchForState(
  state: FlightIntegrationState,
  time: number,
  ambientMotion = 1,
  config: FlightDynamicsConfig = DEFAULT_FLIGHT_DYNAMICS,
): number {
  const turnPitch = -Math.abs(state.currentRollDegrees) * config.pitchPerRollDegree
  const air = turbulence(time, 1.9) * 0.32 * ambientMotion
  return turnPitch + air
}

/** Gentle vertical breathing, in world units. Never random. */
export function verticalBob(time: number, ambientMotion = 1): number {
  return turbulence(time * 0.55, 0.6) * 0.16 * ambientMotion
}

/**
 * Run the model forward over a fixed timeline. Used by tests and by the docs to
 * verify manoeuvre timing without a browser.
 */
export function simulateHeadingChange(
  fromHeadingDegrees: number,
  toHeadingDegrees: number,
  durationSeconds: number,
  stepSeconds = 1 / 60,
  config: FlightDynamicsConfig = DEFAULT_FLIGHT_DYNAMICS,
): Array<{ time: number; heading: number; roll: number }> {
  const state = createFlightIntegrationState(fromHeadingDegrees)
  const samples: Array<{ time: number; heading: number; roll: number }> = [
    { time: 0, heading: state.currentHeadingDegrees, roll: state.currentRollDegrees },
  ]

  const steps = Math.round(durationSeconds / stepSeconds)
  for (let i = 1; i <= steps; i += 1) {
    stepFlightDynamics(state, toHeadingDegrees, stepSeconds, config)
    samples.push({
      time: i * stepSeconds,
      heading: state.currentHeadingDegrees,
      roll: state.currentRollDegrees,
    })
  }

  return samples
}
