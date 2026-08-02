import { describe, expect, it } from 'vitest'
import { calculateDailyDeviation } from './deviation'
import type { Habit } from './types'

const habit = (id: string, impact = 1): Habit => ({
  id,
  name: id,
  icon: 'spark',
  cue: '',
  days: [0, 1, 2, 3, 4, 5, 6],
  impact,
  archived: false,
  createdAt: '2026-01-01T00:00:00.000Z',
})

describe('calculateDailyDeviation', () => {
  it('keeps completed habits on course at zero', () => {
    expect(calculateDailyDeviation(0, [habit('gym')], { gym: 'completed' }).finalDeviationDegrees).toBe(0)
  })

  it('adds missed work after recovering old deviation', () => {
    const result = calculateDailyDeviation(
      3,
      [habit('gym'), habit('steps'), habit('food')],
      { gym: 'completed', steps: 'completed', food: 'missed' },
    )
    expect(result.recoveredDegrees).toBe(2)
    expect(result.addedDegrees).toBe(1)
    expect(result.finalDeviationDegrees).toBe(2)
  })

  it('does not treat missing or irrelevant input as failure', () => {
    const result = calculateDailyDeviation(1, [habit('gym'), habit('rest')], { rest: 'not_relevant' })
    expect(result.finalDeviationDegrees).toBe(1)
    expect(result.addedDegrees).toBe(0)
  })

  it('supports weighted partial completion and caps the result', () => {
    const result = calculateDailyDeviation(14.5, [habit('gym', 2)], { gym: 'partial' })
    expect(result.finalDeviationDegrees).toBe(15)
  })
})

