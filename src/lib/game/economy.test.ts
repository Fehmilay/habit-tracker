import { describe, expect, it } from 'vitest'
import { clampFuel, fuelEarnedForStatuses } from './economy'

describe('habit fuel economy', () => {
  it('only creates fuel from real habit outcomes', () => {
    expect(fuelEarnedForStatuses({ gym: 'completed', water: 'partial', steps: 'missed' })).toBe(33)
    expect(fuelEarnedForStatuses({ gym: 'missed' })).toBe(0)
  })

  it('caps the tank and exposes a stable game cost', () => {
    expect(clampFuel(140)).toBe(100)
    expect(clampFuel(-5)).toBe(0)
  })
})
