import { describe, expect, it } from 'vitest'
import { isHabitDue } from './date'
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
