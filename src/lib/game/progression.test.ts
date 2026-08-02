import { describe, expect, it } from 'vitest'
import {
  AIRCRAFT_SKINS,
  experienceForLevel,
  experienceForRing,
  levelForExperience,
  levelProgress,
  MAX_COMBO_MULTIPLIER,
  skinUnlockedAtLevel,
  unlockedSkins,
  XP_PER_RING,
} from './progression'

describe('experienceForLevel', () => {
  it('starts level 1 at zero', () => {
    expect(experienceForLevel(1)).toBe(0)
    expect(experienceForLevel(0)).toBe(0)
  })

  it('increases monotonically', () => {
    for (let level = 1; level < 40; level += 1) {
      expect(experienceForLevel(level + 1)).toBeGreaterThan(experienceForLevel(level))
    }
  })

  it('costs progressively more per level, so levelling slows down', () => {
    const earlyStep = experienceForLevel(3) - experienceForLevel(2)
    const lateStep = experienceForLevel(20) - experienceForLevel(19)
    expect(lateStep).toBeGreaterThan(earlyStep * 3)
  })
})

describe('levelForExperience', () => {
  it('is the inverse of experienceForLevel at the boundaries', () => {
    for (const level of [1, 2, 5, 10, 20]) {
      expect(levelForExperience(experienceForLevel(level))).toBe(level)
    }
  })

  it('does not level up one point short of the threshold', () => {
    const threshold = experienceForLevel(5)
    expect(levelForExperience(threshold - 1)).toBe(4)
  })

  it('treats negative experience as level 1 rather than throwing', () => {
    expect(levelForExperience(-500)).toBe(1)
  })
})

describe('levelProgress', () => {
  it('reports zero progress exactly at a level boundary', () => {
    const progress = levelProgress(experienceForLevel(4))
    expect(progress.level).toBe(4)
    expect(progress.into).toBe(0)
    expect(progress.ratio).toBe(0)
  })

  it('keeps the ratio within 0..1 across a wide range', () => {
    for (let xp = 0; xp < 20_000; xp += 137) {
      const progress = levelProgress(xp)
      expect(progress.ratio).toBeGreaterThanOrEqual(0)
      expect(progress.ratio).toBeLessThanOrEqual(1)
    }
  })

  it('reaches roughly half way at the midpoint of a level', () => {
    const base = experienceForLevel(3)
    const span = experienceForLevel(4) - base
    const progress = levelProgress(base + span / 2)
    expect(progress.ratio).toBeCloseTo(0.5, 1)
  })
})

describe('experienceForRing', () => {
  it('awards the base amount with no combo', () => {
    expect(experienceForRing(0)).toBe(XP_PER_RING)
    expect(experienceForRing(1)).toBe(XP_PER_RING)
  })

  it('scales with the combo up to the cap', () => {
    expect(experienceForRing(3)).toBe(XP_PER_RING * 3)
    expect(experienceForRing(99)).toBe(XP_PER_RING * MAX_COMBO_MULTIPLIER)
  })
})

describe('skins', () => {
  it('always has a skin available at level 1', () => {
    expect(unlockedSkins(1).length).toBeGreaterThan(0)
  })

  it('unlocks strictly more skins as the level rises', () => {
    expect(unlockedSkins(20).length).toBeGreaterThan(unlockedSkins(1).length)
  })

  it('reports the skin unlocked exactly at a level', () => {
    for (const skin of AIRCRAFT_SKINS) {
      expect(skinUnlockedAtLevel(skin.requiredLevel)?.id).toBe(skin.id)
    }
  })

  it('reports nothing for a level that unlocks no skin', () => {
    const taken = new Set(AIRCRAFT_SKINS.map((skin) => skin.requiredLevel))
    const free = [...Array(40).keys()].map((n) => n + 1).find((level) => !taken.has(level))
    expect(free).toBeDefined()
    expect(skinUnlockedAtLevel(free!)).toBeNull()
  })
})
