/**
 * How badly the aircraft is falling apart.
 *
 * The app's whole point is that drifting off course has consequences, and a
 * number ticking from +2 to +3 does not feel like a consequence. This maps
 * course deviation - plus how often habits have actually been missed lately -
 * onto visible damage: smoke, sparks, fire, a scorched hull.
 *
 * Pure and continuous by design. Continuous because a hard switch at a
 * threshold would pop; pure so the thresholds can be tested without a
 * renderer, and so the same deviation always looks the same.
 */

export type DamageStage = 0 | 1 | 2 | 3

export interface DamageState {
  /** Coarse band, for anything that needs a discrete answer (labels, sound). */
  stage: DamageStage
  /** Continuous 0..1 overall severity. */
  severity: number
  /** Per-effect intensities, each 0..1. */
  smoke: number
  sparks: number
  fire: number
  /** Hull scorching and cracking. */
  scorch: number
}

/** Deviation at which damage starts appearing at all. */
export const DAMAGE_ONSET_DEGREES = 1.2
/** Deviation treated as fully critical. */
export const DAMAGE_CRITICAL_DEGREES = 7

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value
}

/** Smooth 0..1 ramp between two edges. */
function ramp(value: number, from: number, to: number): number {
  if (to <= from) return value >= to ? 1 : 0
  return clamp01((value - from) / (to - from))
}

/**
 * Expand a 0..1 severity into the individual effect intensities.
 *
 * Separate from `damageFromCourse` because the renderer works from a
 * *smoothed* severity: the driver eases `damageFromCourse(...).severity` over
 * time so damage ramps in and out, and the visuals then need the effect
 * breakdown for that eased value. Passing the eased number back through
 * `damageFromCourse` would re-interpret a severity as a degree count and
 * re-apply the miss-rate floor a second time - which set the aircraft on fire
 * at two degrees off course.
 */
export function effectsFromSeverity(severity: number): DamageState {
  const safe = clamp01(Number.isFinite(severity) ? severity : 0)

  const stage: DamageStage =
    safe >= 0.72 ? 3 : safe >= 0.42 ? 2 : safe >= 0.12 ? 1 : 0

  return {
    stage,
    severity: safe,
    // Smoke comes first and stays throughout.
    smoke: ramp(safe, 0.08, 0.55),
    // Sparks join in the middle band.
    sparks: ramp(safe, 0.38, 0.75),
    // Fire only at the top - it has to mean something.
    fire: ramp(safe, 0.66, 0.95),
    scorch: ramp(safe, 0.3, 0.9),
  }
}

/**
 * Damage for a given course deviation and recent miss rate.
 *
 * @param deviationDegrees signed course deviation; only magnitude matters
 * @param recentMissRate   0..1 share of recently rated habits that were missed
 */
export function damageFromCourse(
  deviationDegrees: number,
  recentMissRate = 0,
): DamageState {
  const magnitude = Math.abs(Number.isFinite(deviationDegrees) ? deviationDegrees : 0)
  const misses = clamp01(Number.isFinite(recentMissRate) ? recentMissRate : 0)

  const fromCourse = ramp(magnitude, DAMAGE_ONSET_DEGREES, DAMAGE_CRITICAL_DEGREES)
  // Missed habits add a floor: a player sitting at a small deviation but
  // missing everything should still see the aircraft suffer.
  const severity = clamp01(Math.max(fromCourse, misses * 0.55) * 0.85 + fromCourse * 0.15)

  return effectsFromSeverity(severity)
}

/** Share of the most recent rated habits that were missed. */
export function recentMissRate(
  statusLists: Array<Record<string, string>>,
  windowSize = 5,
): number {
  const recent = statusLists.slice(-windowSize)
  let total = 0
  let missed = 0

  for (const statuses of recent) {
    for (const status of Object.values(statuses)) {
      if (status === 'not_relevant') continue
      total += 1
      if (status === 'missed') missed += 1
    }
  }

  return total === 0 ? 0 : missed / total
}
