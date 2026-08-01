import { describe, expect, it } from 'vitest'
import { crossTrackDistanceKm, recoveryDaysRequired } from './projection'
import type { Habit } from './types'

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
