import { describe, expect, it } from 'vitest'
import { flightCycleProgress, isHabitDue } from './date'
import type { Habit } from './types'

const habit: Habit = {
  id: 'focus',
  name: 'Focus',
  icon: '✦',
  cue: '25 Minuten',
  days: [0, 1, 2, 3, 4, 5, 6],
  impact: 1,
  archived: false,
  createdAt: '2026-08-01T10:00:00.000Z',
}

describe('limited habit flights', () => {
  it('automatically ends after the selected number of days', () => {
    const limited = { ...habit, challengeDays: 7 }
    expect(isHabitDue(limited, '2026-08-07')).toBe(true)
    expect(isHabitDue(limited, '2026-08-08')).toBe(false)
  })

  it('keeps unlimited habits active', () => {
    expect(isHabitDue(habit, '2027-08-01')).toBe(true)
  })
})

describe('flightCycleProgress', () => {
  it('counts a persistent 30-day flight from the journey start', () => {
    expect(flightCycleProgress('2026-08-01', '2026-08-01')).toEqual({ cycle: 1, day: 1, remainingDays: 29, progress: 1 / 30 })
    expect(flightCycleProgress('2026-08-01', '2026-08-30')).toEqual({ cycle: 1, day: 30, remainingDays: 0, progress: 1 })
  })

  it('starts the next cycle automatically without resetting history', () => {
    expect(flightCycleProgress('2026-08-01', '2026-08-31')).toEqual({ cycle: 2, day: 1, remainingDays: 29, progress: 1 / 30 })
  })
})
