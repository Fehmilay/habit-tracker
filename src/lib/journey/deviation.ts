import type { DeviationEvent, Habit, HabitStatus } from './types'

export const MAX_DEVIATION_DEGREES = 15

export interface DailyDeviationResult {
  previousDeviationDegrees: number
  recoveredDegrees: number
  addedDegrees: number
  finalDeviationDegrees: number
  completionRate: number
  events: DeviationEvent[]
}

export function calculateDailyDeviation(
  previousDeviationDegrees: number,
  habits: Habit[],
  statuses: Record<string, HabitStatus>,
): DailyDeviationResult {
  const previous = Math.max(0, Math.min(MAX_DEVIATION_DEGREES, previousDeviationDegrees))
  let recoverable = previous
  let recovered = 0
  let added = 0
  let earned = 0
  let possible = 0

  const events: DeviationEvent[] = []

  for (const habit of habits) {
    const status = statuses[habit.id]
    if (!status) continue

    let degrees = 0
    if (status !== 'not_relevant') possible += habit.impact

    if (status === 'completed') {
      const correction = Math.min(habit.impact, recoverable)
      recoverable -= correction
      recovered += correction
      earned += habit.impact
      degrees = -correction
    } else if (status === 'partial') {
      const impact = habit.impact * 0.5
      added += impact
      earned += habit.impact * 0.5
      degrees = impact
    } else if (status === 'missed') {
      added += habit.impact
      degrees = habit.impact
    }

    events.push({
      habitId: habit.id,
      label: habit.name,
      icon: habit.icon,
      status,
      degrees: Math.round(degrees * 100) / 100,
    })
  }

  return {
    previousDeviationDegrees: previous,
    recoveredDegrees: Math.round(recovered * 100) / 100,
    addedDegrees: Math.round(added * 100) / 100,
    finalDeviationDegrees: Math.round(Math.min(MAX_DEVIATION_DEGREES, previous - recovered + added) * 100) / 100,
    completionRate: possible === 0 ? 1 : earned / possible,
    events,
  }
}

