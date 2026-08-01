import { describe, expect, it } from 'vitest'
import {
  commandedRoll,
  createFlightIntegrationState,
  DEFAULT_FLIGHT_DYNAMICS,
  simulateHeadingChange,
  stepFlightDynamics,
} from './flightDynamics'

/** Peak absolute roll reached across a manoeuvre. */
function peakRoll(samples: Array<{ roll: number }>): number {
  return samples.reduce((peak, sample) => Math.max(peak, Math.abs(sample.roll)), 0)
}

/** First sample at or after a given time. */
function at<T extends { time: number }>(samples: T[], time: number): T | undefined {
  return samples.find((sample) => sample.time >= time - 1e-9)
}

describe('commandedRoll', () => {
  it('banks into the turn, proportionally to the heading error', () => {
    expect(commandedRoll(1)).toBeCloseTo(6, 5)
    expect(commandedRoll(-1)).toBeCloseTo(-6, 5)
  })

  it('never exceeds the bank limit, however large the error', () => {
    expect(commandedRoll(90)).toBe(DEFAULT_FLIGHT_DYNAMICS.maxRollDegrees)
    expect(commandedRoll(-90)).toBe(-DEFAULT_FLIGHT_DYNAMICS.maxRollDegrees)
  })

  it('commands wings level when already on the target heading', () => {
    expect(commandedRoll(0)).toBe(0)
  })
})

describe('stepFlightDynamics', () => {
  it('holds heading and stays level when the target is already met', () => {
    const state = createFlightIntegrationState(0)
    for (let i = 0; i < 120; i += 1) stepFlightDynamics(state, 0, 1 / 60)

    expect(state.currentHeadingDegrees).toBe(0)
    expect(state.currentRollDegrees).toBe(0)
  })

  it('ignores non-finite or zero deltas instead of corrupting the state', () => {
    const state = createFlightIntegrationState(1.5)
    stepFlightDynamics(state, 3, 0)
    stepFlightDynamics(state, 3, Number.NaN)

    expect(state.currentHeadingDegrees).toBe(1.5)
  })

  it('produces the same result at 30fps as at 120fps', () => {
    const slow = simulateHeadingChange(0, 3, 4, 1 / 30)
    const fast = simulateHeadingChange(0, 3, 4, 1 / 120)

    const slowEnd = slow[slow.length - 1]
    const fastEnd = fast[fast.length - 1]

    expect(slowEnd.heading).toBeCloseTo(fastEnd.heading, 2)
    expect(slowEnd.roll).toBeCloseTo(fastEnd.roll, 1)
  })
})

describe('a +3 degree course change', () => {
  const samples = simulateHeadingChange(0, 3, 6)

  it('rolls right before the heading has moved much', () => {
    const early = at(samples, 0.35)
    expect(early).toBeDefined()
    // Bank is already established while the heading has barely started to move.
    expect(early!.roll).toBeGreaterThan(4)
    expect(early!.heading).toBeLessThan(1)
  })

  it('reaches peak bank within roughly 0.8 seconds', () => {
    const window = samples.filter((sample) => sample.time <= 0.85)
    expect(peakRoll(window)).toBeGreaterThan(0.85 * peakRoll(samples))
  })

  it('completes the heading change in about 1.5 seconds', () => {
    const atOnePointFive = at(samples, 1.5)
    expect(atOnePointFive).toBeDefined()
    expect(atOnePointFive!.heading).toBeGreaterThan(2.6)
    expect(atOnePointFive!.heading).toBeLessThanOrEqual(3)
  })

  it('never overshoots the new course', () => {
    for (const sample of samples) expect(sample.heading).toBeLessThanOrEqual(3 + 1e-9)
  })

  it('stays controlled - bank never approaches the limit for so small a change', () => {
    expect(peakRoll(samples)).toBeLessThan(18)
  })

  it('rolls back to wings level once the new heading is established', () => {
    const settled = samples[samples.length - 1]
    expect(settled.heading).toBeCloseTo(3, 3)
    expect(Math.abs(settled.roll)).toBeLessThan(0.05)
  })
})

describe('a +1 degree course change', () => {
  const samples = simulateHeadingChange(0, 1, 6)

  it('still produces a visible bank', () => {
    expect(peakRoll(samples)).toBeGreaterThan(2)
  })

  it('settles on the new heading, wings level', () => {
    const settled = samples[samples.length - 1]
    expect(settled.heading).toBeCloseTo(1, 3)
    expect(Math.abs(settled.roll)).toBeLessThan(0.05)
  })
})

describe('correcting from +3 degrees back to 0', () => {
  const samples = simulateHeadingChange(3, 0, 6)

  it('rolls left, the opposite way to the original turn', () => {
    const early = at(samples, 0.4)
    expect(early).toBeDefined()
    expect(early!.roll).toBeLessThan(-3)
  })

  it('reduces the deviation monotonically', () => {
    for (let i = 1; i < samples.length; i += 1) {
      expect(samples[i].heading).toBeLessThanOrEqual(samples[i - 1].heading + 1e-9)
    }
  })

  it('arrives back exactly on the planned course', () => {
    const settled = samples[samples.length - 1]
    expect(settled.heading).toBeCloseTo(0, 3)
    expect(Math.abs(settled.roll)).toBeLessThan(0.05)
  })
})
