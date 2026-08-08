import type { DailyFlightRecord, Habit } from './types'

export function crossTrackDistanceKm(distanceKm: number, deviationDegrees: number): number {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return 0
  const radians = (Math.abs(deviationDegrees) * Math.PI) / 180
  return Math.round(distanceKm * Math.sin(radians))
}

/**
 * Mean completion rate across the given records.
 *
 * Records with a missing or non-finite rate are skipped rather than summed.
 * This state is reachable in practice: records are persisted to local storage
 * and outlive app versions, so a profile written before `completionRate`
 * existed would otherwise turn every projection in the UI into NaN.
 */
export function averageCompletion(records: DailyFlightRecord[]): number {
  const rates = records
    .map((record) => record.completionRate)
    .filter((rate): rate is number => typeof rate === 'number' && Number.isFinite(rate))

  if (rates.length === 0) return 1
  return rates.reduce((sum, rate) => sum + rate, 0) / rates.length
}

export function projectedGoalValue(targetValue: number, records: DailyFlightRecord[]): number {
  const rate = averageCompletion(records.slice(-30))
  return Math.round(targetValue * rate * 10) / 10
}

/**
 * The 30-day completion percentage, or null before there is anything to
 * average.
 *
 * `averageCompletion` returns 1 for an empty list because it is the neutral
 * element for the projections that multiply by it. Rendering that number
 * directly told every brand new user their goal forecast was 100% - a
 * fabricated confidence, on day one, about a habit they had not done yet.
 */
export function completionPercent(records: DailyFlightRecord[]): number | null {
  const window = records.slice(-30)
  if (window.length === 0) return null
  return Math.round(averageCompletion(window) * 100)
}

export function recoveryDaysRequired(deviationDegrees: number, dueHabits: Habit[]): number {
  if (deviationDegrees <= 0) return 0
  const dailyCorrection = dueHabits.reduce((sum, habit) => sum + habit.impact, 0)
  if (dailyCorrection <= 0) return Number.POSITIVE_INFINITY
  return Math.ceil(deviationDegrees / dailyCorrection)
}

export function repeatedPatternDeviation(
  currentDeviation: number,
  records: DailyFlightRecord[],
  futureDays = 7,
): number {
  const recent = records.slice(-7)
  if (recent.length === 0) return currentDeviation
  const averageAdded = recent.reduce((sum, record) => sum + record.addedDegrees, 0) / recent.length
  const averageRecovered = recent.reduce((sum, record) => sum + record.recoveredDegrees, 0) / recent.length
  return Math.max(0, Math.min(15, currentDeviation + (averageAdded - averageRecovered) * futureDays))
}

