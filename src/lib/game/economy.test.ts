import { describe, expect, it } from 'vitest'
import {
  clampReserve,
  freezesAvailable,
  reserveEarnedForStatuses,
  RESERVE_PER_FREEZE,
} from './economy'

describe('reserve economy', () => {
  it('only creates reserve from real habit outcomes', () => {
    expect(reserveEarnedForStatuses({ gym: 'completed', water: 'partial', steps: 'missed' })).toBe(33)
    expect(reserveEarnedForStatuses({ gym: 'missed' })).toBe(0)
    expect(reserveEarnedForStatuses({ gym: 'not_relevant' })).toBe(0)
  })

  it('caps the tank', () => {
    expect(clampReserve(140)).toBe(100)
    expect(clampReserve(-5)).toBe(0)
  })

  it('converts the tank into whole days of chain protection', () => {
    expect(freezesAvailable(0)).toBe(0)
    expect(freezesAvailable(RESERVE_PER_FREEZE - 1)).toBe(0)
    expect(freezesAvailable(RESERVE_PER_FREEZE)).toBe(1)
    expect(freezesAvailable(100)).toBe(3)
  })
})
