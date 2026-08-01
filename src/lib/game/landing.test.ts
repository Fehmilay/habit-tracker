import { describe, expect, it } from 'vitest'
import { cycleTruthScore, landingGrade, landingOffsetPercent } from './landing'
import type { DailyFlightRecord, Habit } from '@/lib/journey/types'

const habit: Habit = {
  id: 'read',
  name: 'Read',
  icon: 'R',
  cue: 'Read 10 pages',
  days: [0, 1, 2, 3, 4, 5, 6],
  impact: 1,
  archived: false,
  createdAt: '2026-08-01T00:00:00.000Z',
}

function record(day: number, completionRate = 1): DailyFlightRecord {
  const date = new Date('2026-08-01T12:00:00')
  date.setDate(date.getDate() + day)
  const dateKey = date.toISOString().slice(0, 10)
  return {
    date: dateKey,
    statuses: { read: 'completed' },
    previousDeviationDegrees: 0,
    recoveredDegrees: 0,
    addedDegrees: 0,
    finalDeviationDegrees: 0,
    crossTrackKm: 0,
    completionRate,
    events: [],
    completedAt: `${dateKey}T20:00:00.000Z`,
  }
}

describe('30-day landing truth score', () => {
  it('counts missing active check-in days as missed', () => {
    const records = Array.from({ length: 15 }, (_, day) => record(day))
    expect(cycleTruthScore(records, [habit], '2026-08-01', 1)).toEqual({
      completionRate: 0.5,
      trackedDays: 30,
      checkedInDays: 15,
    })
  })

  it('ignores records outside the selected cycle', () => {
    const records = [record(0), record(30)]
    expect(cycleTruthScore(records, [habit], '2026-08-01', 1).completionRate).toBeCloseTo(1 / 30)
    expect(cycleTruthScore(records, [habit], '2026-08-01', 2).completionRate).toBeCloseTo(1 / 30)
  })

  it('grades and positions the runway from completion, not game points', () => {
    expect(landingGrade(0.94)).toBe('centerline')
    expect(landingGrade(0.76)).toBe('safe')
    expect(landingGrade(0.55)).toBe('hard')
    expect(landingGrade(0.2)).toBe('alternate')
    expect(landingOffsetPercent(1, 8)).toBe(0)
    expect(landingOffsetPercent(0.5, 8)).toBe(26)
  })
})
