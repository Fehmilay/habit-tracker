import { describe, expect, it } from 'vitest'
import { daysOnCourse, monthGrid, rollingWeek } from './history'
import type { DailyFlightRecord, Habit } from './types'

const habit: Habit = {
  id: 'gym',
  name: 'Gym',
  icon: 'strength',
  cue: 'Trainieren',
  days: [0, 1, 2, 3, 4, 5, 6],
  impact: 1,
  archived: false,
  createdAt: '2026-01-01T00:00:00.000Z',
}

function record(
  date: string,
  completionRate: number,
  statuses: DailyFlightRecord['statuses'] = {},
  finalDeviationDegrees = 0,
): DailyFlightRecord {
  return {
    date,
    statuses,
    previousDeviationDegrees: 0,
    recoveredDegrees: 0,
    addedDegrees: 0,
    finalDeviationDegrees,
    crossTrackKm: 0,
    completionRate,
    events: [],
    completedAt: `${date}T20:00:00.000Z`,
  }
}

describe('monthGrid', () => {
  it('produces one cell per calendar day', () => {
    const grid = monthGrid({ records: [], habits: [habit], today: '2026-03-15' }, 2026, 2)
    expect(grid.cells).toHaveLength(31)
    expect(grid.label).toBe('März 2026')
  })

  it('lines the first of the month up on the right weekday', () => {
    // 1 March 2026 is a Sunday, i.e. Monday-index 6.
    const grid = monthGrid({ records: [], habits: [habit], today: '2026-03-15' }, 2026, 2)
    expect(grid.leadingBlanks).toBe(6)
  })

  it('marks future days as outside and today as pending', () => {
    const grid = monthGrid({ records: [], habits: [habit], today: '2026-03-15' }, 2026, 2)
    expect(grid.cells[14].outcome).toBe('pending')
    expect(grid.cells[14].isToday).toBe(true)
    expect(grid.cells[20].outcome).toBe('outside')
    expect(grid.cells[20].isFuture).toBe(true)
  })

  it('flags a flawless day', () => {
    const grid = monthGrid(
      { records: [record('2026-03-02', 1)], habits: [habit], today: '2026-03-15' },
      2026,
      2,
    )
    expect(grid.cells[1].outcome).toBe('kept')
    expect(grid.cells[1].perfect).toBe(true)
  })

  it('handles February in a non-leap year', () => {
    const grid = monthGrid({ records: [], habits: [habit], today: '2026-03-15' }, 2026, 1)
    expect(grid.cells).toHaveLength(28)
  })
})

describe('rollingWeek', () => {
  it('summarises the last seven days, not the calendar week', () => {
    const week = rollingWeek({
      records: [
        record('2026-03-09', 1),
        record('2026-03-10', 1),
        record('2026-03-11', 0.4),
      ],
      habits: [habit],
      today: '2026-03-12',
    })
    expect(week.startDate).toBe('2026-03-06')
    expect(week.activeDays).toBe(7)
    expect(week.keptDays).toBe(2)
    expect(week.perfectDays).toBe(2)
  })

  it('names the habits that failed most often', () => {
    const other = { ...habit, id: 'water', name: 'Wasser' }
    const week = rollingWeek({
      records: [
        record('2026-03-10', 0.5, { gym: 'missed', water: 'completed' }),
        record('2026-03-11', 0.5, { gym: 'missed', water: 'completed' }),
      ],
      habits: [habit, other],
      today: '2026-03-12',
    })
    expect(week.weakestHabitIds).toEqual(['gym'])
  })

  it('treats a week with nothing due as fully complete', () => {
    const weekend = { ...habit, days: [] as number[], archived: true }
    const week = rollingWeek({ records: [], habits: [weekend], today: '2026-03-12' })
    expect(week.activeDays).toBe(0)
    expect(week.completionRate).toBe(1)
  })
})

describe('daysOnCourse', () => {
  it('counts only days that ended dead straight', () => {
    expect(
      daysOnCourse([
        record('2026-03-01', 1, {}, 0),
        record('2026-03-02', 1, {}, 1.5),
        record('2026-03-03', 1, {}, 0),
      ]),
    ).toBe(2)
  })
})
