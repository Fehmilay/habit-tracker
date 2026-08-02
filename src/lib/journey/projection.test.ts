import { describe, expect, it } from 'vitest'
import { averageCompletion, crossTrackDistanceKm, projectedGoalValue, recoveryDaysRequired } from './projection'
import type { DailyFlightRecord, Habit } from './types'

describe('journey projection', () => {
  it('keeps the 1 degree example mathematically honest', () => {
    expect(crossTrackDistanceKm(5840, 1)).toBe(102)
    expect(crossTrackDistanceKm(5840, 6)).toBeGreaterThanOrEqual(610)
  })

  it('calculates the number of clean recovery days', () => {
    const habits = [{ impact: 1 }, { impact: 0.5 }] as Habit[]
    expect(recoveryDaysRequired(3, habits)).toBe(2)
  })
})

describe('averageCompletion robustness', () => {
  it('returns a full rate when there is no history', () => {
    expect(averageCompletion([])).toBe(1)
  })

  it('averages the rates it does have', () => {
    const records = [{ completionRate: 1 }, { completionRate: 0.5 }] as DailyFlightRecord[]
    expect(averageCompletion(records)).toBeCloseTo(0.75, 6)
  })

  it('ignores records with a missing rate instead of producing NaN', () => {
    // Reachable via local storage written by an older version of the app.
    const records = [
      { completionRate: 1 },
      {} as unknown as { completionRate: number },
      { completionRate: 0.5 },
    ] as DailyFlightRecord[]

    const average = averageCompletion(records)
    expect(Number.isFinite(average)).toBe(true)
    expect(average).toBeCloseTo(0.75, 6)
  })

  it('falls back to a full rate when every record is malformed', () => {
    const records = [{}, {}] as unknown as DailyFlightRecord[]
    expect(averageCompletion(records)).toBe(1)
  })

  it('keeps projectedGoalValue finite for malformed history', () => {
    const records = [{}] as unknown as DailyFlightRecord[]
    expect(Number.isFinite(projectedGoalValue(36, records))).toBe(true)
  })
})
