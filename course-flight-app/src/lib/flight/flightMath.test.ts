import { describe, expect, it } from 'vitest'
import {
  clamp,
  damp,
  degToRad,
  lambdaFor,
  radToDeg,
  roundTo,
  safeDelta,
  turbulence,
} from './flightMath'

describe('damp', () => {
  it('moves toward the target without passing it', () => {
    const result = damp(0, 10, 3, 1 / 60)
    expect(result).toBeGreaterThan(0)
    expect(result).toBeLessThan(10)
  })

  it('is frame-rate independent', () => {
    let coarse = 0
    for (let i = 0; i < 30; i += 1) coarse = damp(coarse, 10, 3, 1 / 30)

    let fine = 0
    for (let i = 0; i < 120; i += 1) fine = damp(fine, 10, 3, 1 / 120)

    expect(coarse).toBeCloseTo(fine, 6)
  })

  it('stays put when already at the target', () => {
    expect(damp(5, 5, 3, 1 / 60)).toBe(5)
  })
})

describe('lambdaFor', () => {
  it('reaches the requested fraction in the requested time', () => {
    const lambda = lambdaFor(0.8, 0.9)
    const remaining = Math.exp(-lambda * 0.8)
    expect(1 - remaining).toBeCloseTo(0.9, 6)
  })
})

describe('turbulence', () => {
  it('is deterministic - the same time always gives the same offset', () => {
    expect(turbulence(12.5)).toBe(turbulence(12.5))
  })

  it('stays within a bounded, gentle range', () => {
    for (let t = 0; t < 200; t += 0.13) {
      expect(Math.abs(turbulence(t))).toBeLessThanOrEqual(1)
    }
  })

  it('actually varies over time rather than sitting still', () => {
    const samples = [0, 1, 2, 3, 4, 5].map((t) => turbulence(t))
    const unique = new Set(samples.map((value) => value.toFixed(4)))
    expect(unique.size).toBe(samples.length)
  })
})

describe('safeDelta', () => {
  it('clamps a long stall so the integrator cannot jump', () => {
    expect(safeDelta(4)).toBe(1 / 20)
  })

  it('rejects non-finite and negative deltas', () => {
    expect(safeDelta(Number.NaN)).toBe(0)
    expect(safeDelta(-1)).toBe(0)
  })

  it('passes a normal frame through untouched', () => {
    expect(safeDelta(1 / 60)).toBe(1 / 60)
  })
})

describe('small helpers', () => {
  it('converts between degrees and radians', () => {
    expect(degToRad(180)).toBeCloseTo(Math.PI, 10)
    expect(radToDeg(Math.PI)).toBeCloseTo(180, 10)
  })

  it('clamps to the given range', () => {
    expect(clamp(5, 0, 3)).toBe(3)
    expect(clamp(-5, 0, 3)).toBe(0)
    expect(clamp(1, 0, 3)).toBe(1)
  })

  it('never returns negative zero, which would render as "-0"', () => {
    expect(Object.is(roundTo(-0.01, 1), 0)).toBe(true)
  })
})
