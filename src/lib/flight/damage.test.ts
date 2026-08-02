import { describe, expect, it } from 'vitest'
import {
  DAMAGE_CRITICAL_DEGREES,
  DAMAGE_ONSET_DEGREES,
  damageFromCourse,
  effectsFromSeverity,
  recentMissRate,
} from './damage'

describe('damageFromCourse', () => {
  it('leaves the aircraft pristine while on course', () => {
    const damage = damageFromCourse(0)
    expect(damage.stage).toBe(0)
    expect(damage.severity).toBe(0)
    expect(damage.smoke).toBe(0)
    expect(damage.fire).toBe(0)
  })

  it('stays pristine just below the onset threshold', () => {
    expect(damageFromCourse(DAMAGE_ONSET_DEGREES - 0.01).stage).toBe(0)
  })

  it('treats left and right drift identically', () => {
    expect(damageFromCourse(-4)).toEqual(damageFromCourse(4))
  })

  it('escalates monotonically with deviation', () => {
    let previous = -1
    for (let degrees = 0; degrees <= 12; degrees += 0.25) {
      const { severity } = damageFromCourse(degrees)
      expect(severity).toBeGreaterThanOrEqual(previous)
      previous = severity
    }
  })

  it('reaches full severity and fire at the critical deviation', () => {
    const damage = damageFromCourse(DAMAGE_CRITICAL_DEGREES)
    expect(damage.severity).toBeCloseTo(1, 5)
    expect(damage.stage).toBe(3)
    expect(damage.fire).toBeGreaterThan(0.9)
  })

  it('smokes before it sparks, and sparks before it burns', () => {
    const mild = damageFromCourse(2.5)
    expect(mild.smoke).toBeGreaterThan(0)
    expect(mild.fire).toBe(0)

    const bad = damageFromCourse(5)
    expect(bad.sparks).toBeGreaterThan(0)
    expect(bad.smoke).toBeGreaterThanOrEqual(bad.sparks)
  })

  it('keeps every intensity within 0..1', () => {
    for (const degrees of [0, 1, 3, 7, 20, -20, 1000]) {
      const damage = damageFromCourse(degrees, 1)
      for (const value of [damage.severity, damage.smoke, damage.sparks, damage.fire, damage.scorch]) {
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(1)
      }
    }
  })

  it('damages the aircraft for missed habits even when nearly on course', () => {
    const clean = damageFromCourse(0.5, 0)
    const missing = damageFromCourse(0.5, 1)
    expect(missing.severity).toBeGreaterThan(clean.severity)
    expect(missing.smoke).toBeGreaterThan(0)
  })

  it('survives non-finite input instead of producing NaN', () => {
    const damage = damageFromCourse(Number.NaN, Number.NaN)
    expect(Number.isFinite(damage.severity)).toBe(true)
    expect(damage.stage).toBe(0)
  })
})

describe('recentMissRate', () => {
  it('is zero with no history', () => {
    expect(recentMissRate([])).toBe(0)
  })

  it('is zero when nothing was missed', () => {
    expect(recentMissRate([{ a: 'completed', b: 'partial' }])).toBe(0)
  })

  it('is one when everything was missed', () => {
    expect(recentMissRate([{ a: 'missed', b: 'missed' }])).toBe(1)
  })

  it('ignores habits marked not relevant', () => {
    expect(recentMissRate([{ a: 'missed', b: 'not_relevant' }])).toBe(1)
  })

  it('only considers the most recent days', () => {
    const history = [
      { a: 'missed' },
      { a: 'missed' },
      { a: 'completed' },
      { a: 'completed' },
    ]
    expect(recentMissRate(history, 2)).toBe(0)
  })
})

describe('effectsFromSeverity', () => {
  it('agrees with damageFromCourse for the same severity', () => {
    const fromCourse = damageFromCourse(4)
    expect(effectsFromSeverity(fromCourse.severity)).toEqual(fromCourse)
  })

  it('does not set the aircraft on fire at a mild deviation', () => {
    // Regression: the renderer used to feed the smoothed severity back into
    // damageFromCourse as if it were degrees, and re-apply the miss rate on
    // top, which lit the engines at roughly 2 degrees off course.
    const mild = damageFromCourse(2.5, 1)
    expect(effectsFromSeverity(mild.severity).fire).toBe(0)
  })

  it('clamps out-of-range and non-finite input', () => {
    expect(effectsFromSeverity(-3).severity).toBe(0)
    expect(effectsFromSeverity(9).severity).toBe(1)
    expect(effectsFromSeverity(Number.NaN).severity).toBe(0)
  })
})
