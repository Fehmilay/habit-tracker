import type { DailyFlightRecord, Habit } from './types'

export function crossTrackDistanceKm(distanceKm: number, deviationDegrees: number): number {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return 0
  const radians = (Math.abs(deviationDegrees) * Math.PI) / 180
  return Math.round(distanceKm * Math.sin(radians))
}

export function averageCompletion(records: DailyFlightRecord[]): number {
  if (records.length === 0) return 1
  return records.reduce((sum, record) => sum + record.completionRate, 0) / records.length
}

export function projectedGoalValue(targetValue: number, records: DailyFlightRecord[]): number {
  const rate = averageCompletion(records.slice(-30))
  return Math.round(targetValue * rate * 10) / 10
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

