/**
 * Small, dependency-free math helpers for the flight scene.
 *
 * Everything here is pure and deterministic so the flight behaviour can be
 * unit tested without a renderer.
 */

export const DEG_TO_RAD = Math.PI / 180
export const RAD_TO_DEG = 180 / Math.PI

export function degToRad(degrees: number): number {
  return degrees * DEG_TO_RAD
}

export function radToDeg(radians: number): number {
  return radians * RAD_TO_DEG
}

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value
}

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t
}

/**
 * Frame-rate independent exponential smoothing.
 *
 * `lambda` is the decay rate in 1/seconds: after `1 / lambda` seconds roughly
 * 63% of the remaining distance is covered. Using the exponential form rather
 * than a raw `lerp(current, target, 0.1)` keeps behaviour identical at 30, 60
 * and 120 fps, which the brief requires for the camera.
 */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  if (lambda <= 0) return target
  return target + (current - target) * Math.exp(-lambda * dt)
}

/**
 * Time constant (`lambda`) that reaches `fraction` of the way to the target in
 * `seconds`. Lets call sites express intent as "90% within 0.8s" instead of a
 * magic number.
 */
export function lambdaFor(seconds: number, fraction = 0.9): number {
  if (seconds <= 0) return Number.POSITIVE_INFINITY
  return -Math.log(1 - fraction) / seconds
}

/**
 * Deterministic pseudo-turbulence: a sum of incommensurable sine waves.
 *
 * Deliberately not random. The brief forbids the aircraft drifting about on
 * its own, and a fixed waveform means a given time always produces the same
 * offset, which keeps tests and animation replays reproducible.
 */
export function turbulence(time: number, phase = 0): number {
  return (
    0.62 * Math.sin(time * 0.37 + phase) +
    0.26 * Math.sin(time * 0.91 + phase * 1.7) +
    0.12 * Math.sin(time * 2.13 + phase * 0.4)
  )
}

/** Clamp a frame delta so a stalled tab cannot make the integrator explode. */
export function safeDelta(dt: number, max = 1 / 20): number {
  if (!Number.isFinite(dt) || dt <= 0) return 0
  return Math.min(dt, max)
}

/** Round to a fixed number of decimals, avoiding `-0` in readouts. */
export function roundTo(value: number, decimals = 1): number {
  const factor = 10 ** decimals
  const rounded = Math.round(value * factor) / factor
  return Object.is(rounded, -0) ? 0 : rounded
}
