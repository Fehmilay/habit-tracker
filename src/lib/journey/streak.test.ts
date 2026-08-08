import { describe, expect, it } from 'vitest'
import { computeStreak, dayOutcome, gapDaysBefore, STREAK_MIN_COMPLETION } from './streak'
import type { DailyFlightRecord, Habit } from './types'

function habit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'gym',
    name: 'Gym',
    icon: 'strength',
    cue: 'Trainieren',
    days: [0, 1, 2, 3, 4, 5, 6],
    impact: 1,
    archived: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function record(date: string, completionRate: number): DailyFlightRecord {
  return {
    date,
    statuses: { gym: completionRate >= 1 ? 'completed' : 'partial' },
    previousDeviationDegrees: 0,
    recoveredDegrees: 0,
    addedDegrees: 0,
    finalDeviationDegrees: 0,
    crossTrackKm: 0,
    completionRate,
    events: [],
    completedAt: `${date}T20:00:00.000Z`,
  }
}

const habits = [habit()]

describe('computeStreak', () => {
  it('counts consecutive kept days ending today', () => {
    const streak = computeStreak({
      records: [record('2026-03-01', 1), record('2026-03-02', 1), record('2026-03-03', 1)],
      habits,
      today: '2026-03-03',
    })
    expect(streak.current).toBe(3)
    expect(streak.best).toBe(3)
    expect(streak.atRisk).toBe(false)
  })

  it('carries yesterday forward while today is still open, and flags the risk', () => {
    const streak = computeStreak({
      records: [record('2026-03-01', 1), record('2026-03-02', 1)],
      habits,
      today: '2026-03-03',
    })
    expect(streak.current).toBe(2)
    expect(streak.atRisk).toBe(true)
  })

  it('breaks on a missed active day', () => {
    const streak = computeStreak({
      records: [record('2026-03-01', 1), record('2026-03-03', 1)],
      habits,
      today: '2026-03-03',
    })
    expect(streak.current).toBe(1)
    expect(streak.best).toBe(1)
  })

  it('breaks on a checked-in day that fell below the threshold', () => {
    const streak = computeStreak({
      records: [
        record('2026-03-01', 1),
        record('2026-03-02', STREAK_MIN_COMPLETION - 0.1),
        record('2026-03-03', 1),
      ],
      habits,
      today: '2026-03-03',
    })
    expect(streak.current).toBe(1)
  })

  it('lets a rest day pass through without breaking or extending the chain', () => {
    // Due on weekdays only. 2026-03-07 is a Saturday, 2026-03-08 a Sunday.
    const weekdayOnly = [habit({ days: [0, 1, 2, 3, 4] })]
    const streak = computeStreak({
      records: [record('2026-03-05', 1), record('2026-03-06', 1), record('2026-03-09', 1)],
      habits: weekdayOnly,
      today: '2026-03-09',
    })
    expect(streak.current).toBe(3)
  })

  it('treats a frozen day as survived but not earned', () => {
    const streak = computeStreak({
      records: [record('2026-03-01', 1), record('2026-03-03', 1)],
      habits,
      frozenDates: ['2026-03-02'],
      today: '2026-03-03',
    })
    expect(streak.current).toBe(2)
  })

  it('keeps the all-time best after the current chain breaks', () => {
    const streak = computeStreak({
      records: [
        record('2026-03-01', 1),
        record('2026-03-02', 1),
        record('2026-03-03', 1),
        // 2026-03-04 missed entirely
        record('2026-03-05', 1),
      ],
      habits,
      today: '2026-03-05',
    })
    expect(streak.current).toBe(1)
    expect(streak.best).toBe(3)
  })

  it('counts perfect days separately from kept days', () => {
    const streak = computeStreak({
      records: [record('2026-03-01', 1), record('2026-03-02', 0.6)],
      habits,
      today: '2026-03-02',
    })
    expect(streak.current).toBe(2)
    expect(streak.perfectDays).toBe(1)
  })

  it('returns a zero chain for an empty profile without looping', () => {
    const streak = computeStreak({ records: [], habits, today: '2026-03-03' })
    expect(streak.current).toBe(0)
    expect(streak.best).toBe(0)
    expect(streak.atRisk).toBe(true)
  })

  it('does not count days before the habit existed as failures', () => {
    const late = [habit({ createdAt: '2026-03-02T00:00:00.000Z' })]
    const streak = computeStreak({
      records: [record('2026-03-02', 1), record('2026-03-03', 1)],
      habits: late,
      journeyStartDate: '2026-02-01',
      today: '2026-03-03',
    })
    expect(streak.current).toBe(2)
  })
})

describe('dayOutcome', () => {
  const lookup = {
    habits,
    recordsByDate: new Map([['2026-03-02', record('2026-03-02', 1)]]),
    frozenDates: new Set(['2026-03-01']),
    today: '2026-03-04',
  }

  it('classifies each kind of day', () => {
    expect(dayOutcome('2026-03-02', lookup)).toBe('kept')
    expect(dayOutcome('2026-03-01', lookup)).toBe('frozen')
    expect(dayOutcome('2026-03-03', lookup)).toBe('missed')
    expect(dayOutcome('2026-03-04', lookup)).toBe('pending')
    expect(dayOutcome('2026-03-05', lookup)).toBe('outside')
  })
})

describe('gapDaysBefore', () => {
  it('lists the unanswered active days immediately before a check-in', () => {
    const gaps = gapDaysBefore('2026-03-05', {
      records: [record('2026-03-02', 1)],
      habits,
    })
    expect(gaps).toEqual(['2026-03-04', '2026-03-03'])
  })

  it('stops at the limit rather than reaching back forever', () => {
    const gaps = gapDaysBefore('2026-03-20', { records: [], habits }, 2)
    expect(gaps).toHaveLength(2)
  })

  it('returns nothing when yesterday was already answered', () => {
    const gaps = gapDaysBefore('2026-03-03', {
      records: [record('2026-03-02', 1)],
      habits,
    })
    expect(gaps).toEqual([])
  })
})
