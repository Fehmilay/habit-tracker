import { addDays, flightCycleProgress, isHabitDue, localDateKey } from '@/lib/journey/date'
import type { DailyFlightRecord, Habit } from '@/lib/journey/types'

export type LandingGrade = 'centerline' | 'safe' | 'hard' | 'alternate'

export interface CycleTruthScore {
  completionRate: number
  trackedDays: number
  checkedInDays: number
}

/**
 * Scores a cycle from real daily check-ins. Game XP and ring scores are
 * intentionally absent. An active day without a check-in counts as missed.
 */
export function cycleTruthScore(
  records: DailyFlightRecord[],
  habits: Habit[],
  journeyStartDate: string,
  cycle: number,
  cycleDays = 30,
): CycleTruthScore {
  const firstOffset = (Math.max(1, cycle) - 1) * cycleDays
  const recordsByDate = new Map(records.map((record) => [record.date, record]))
  let completionTotal = 0
  let trackedDays = 0
  let checkedInDays = 0

  for (let offset = 0; offset < cycleDays; offset += 1) {
    const dateKey = addDays(journeyStartDate, firstOffset + offset)
    const hasActiveHabit = habits.some((habit) => {
      if (dateKey < habit.createdAt.slice(0, 10)) return false
      return isHabitDue(habit, dateKey)
    })
    if (!hasActiveHabit) continue

    trackedDays += 1
    const record = recordsByDate.get(dateKey)
    if (!record) continue
    checkedInDays += 1
    completionTotal += Math.max(0, Math.min(1, record.completionRate))
  }

  return {
    completionRate: trackedDays === 0 ? 0 : completionTotal / trackedDays,
    trackedDays,
    checkedInDays,
  }
}

export function landingGrade(completionRate: number): LandingGrade {
  if (completionRate >= 0.9) return 'centerline'
  if (completionRate >= 0.7) return 'safe'
  if (completionRate >= 0.5) return 'hard'
  return 'alternate'
}

export function landingOffsetPercent(completionRate: number, deviationDegrees: number): number {
  const magnitude = Math.min(42, Math.max(0, (1 - completionRate) * 52))
  return magnitude * (deviationDegrees < 0 ? -1 : 1)
}

export function currentCycle(startDate: string, dateKey = localDateKey()): number {
  return flightCycleProgress(startDate, dateKey).cycle
}
