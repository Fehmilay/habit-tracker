import { describe, expect, it } from 'vitest'
import {
  addDays,
  daysBetween,
  flightCycleProgress,
  isChallengeComplete,
  isHabitDue,
  signedDaysBetween,
} from './date'
import type { Habit } from './types'

const habit: Habit = {
  id: 'focus',
  name: 'Focus',
  icon: 'spark',
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

describe('calendar arithmetic across daylight saving', () => {
  // Germany springs forward on the last Sunday in March: 2026-03-29.
  // Two consecutive local noons around it are 23 and 25 hours apart, which is
  // exactly where naive millisecond arithmetic loses or gains a day.
  it('counts the spring-forward day as one day', () => {
    expect(daysBetween('2026-03-28', '2026-03-29')).toBe(1)
    expect(daysBetween('2026-03-29', '2026-03-30')).toBe(1)
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2)
  })

  it('counts the autumn fall-back day as one day', () => {
    expect(daysBetween('2026-10-24', '2026-10-25')).toBe(1)
    expect(daysBetween('2026-10-25', '2026-10-26')).toBe(1)
  })

  it('stays exact across a whole year', () => {
    expect(daysBetween('2026-01-01', '2027-01-01')).toBe(365)
    expect(daysBetween('2024-01-01', '2025-01-01')).toBe(366)
  })

  it('signs the difference when the end date is earlier', () => {
    expect(signedDaysBetween('2026-03-30', '2026-03-28')).toBe(-2)
    expect(daysBetween('2026-03-30', '2026-03-28')).toBe(0)
  })
})

describe('addDays', () => {
  it('walks across a DST boundary without repeating or skipping a day', () => {
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29')
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30')
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26')
  })

  it('walks across month, year and leap-day boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('round-trips', () => {
    for (const day of ['2026-03-29', '2026-10-25', '2026-01-01', '2026-12-31']) {
      expect(addDays(addDays(day, 17), -17)).toBe(day)
    }
  })
})

describe('isChallengeComplete', () => {
  const base = {
    id: 'x',
    name: 'X',
    icon: 'spark',
    cue: '',
    days: [0, 1, 2, 3, 4, 5, 6],
    impact: 1,
    archived: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  }

  it('is false without a challenge window', () => {
    expect(isChallengeComplete(base, '2027-01-01')).toBe(false)
  })

  it('measures from the day the window was set, not from creation', () => {
    const habit = { ...base, challengeDays: 30, challengeStartedAt: '2026-06-01' }
    expect(isChallengeComplete(habit, '2026-06-20')).toBe(false)
    expect(isChallengeComplete(habit, '2026-07-01')).toBe(true)
    // The whole point: an old habit given a fresh window is not born expired.
    expect(isHabitDue(habit, '2026-06-20')).toBe(true)
  })

  it('falls back to createdAt for habits saved before the field existed', () => {
    expect(isChallengeComplete({ ...base, challengeDays: 7 }, '2026-02-01')).toBe(true)
  })
})
