import { describe, expect, it } from 'vitest'
import {
  ACHIEVEMENTS,
  achievementById,
  earnedAchievementIds,
  newlyEarned,
  nextAchievement,
  type AchievementStats,
} from './achievements'

const empty: AchievementStats = {
  streakCurrent: 0,
  streakBest: 0,
  checkInDays: 0,
  perfectDays: 0,
  focusMinutes: 0,
  ringsFlown: 0,
  successfulLandings: 0,
  recoveriesCompleted: 0,
  distanceFlownKm: 0,
  level: 1,
  daysOnCourse: 0,
}

describe('achievements catalogue', () => {
  it('has unique ids', () => {
    const ids = ACHIEVEMENTS.map((achievement) => achievement.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('reports progress between zero and one for every rule', () => {
    for (const achievement of ACHIEVEMENTS) {
      expect(achievement.progress(empty)).toBeGreaterThanOrEqual(0)
      expect(achievement.progress(empty)).toBeLessThanOrEqual(1)
    }
  })

  it('resolves by id', () => {
    expect(achievementById('chain-7')?.name).toBe('Reiseflughöhe')
    expect(achievementById('nope')).toBeUndefined()
  })
})

describe('earnedAchievementIds', () => {
  it('grants nothing to an untouched profile', () => {
    expect(earnedAchievementIds(empty)).toEqual([])
  })

  it('grants every tier below the one reached', () => {
    const earned = earnedAchievementIds({ ...empty, streakBest: 30, checkInDays: 30 })
    expect(earned).toContain('chain-3')
    expect(earned).toContain('chain-7')
    expect(earned).toContain('chain-30')
    expect(earned).not.toContain('chain-100')
  })
})

describe('newlyEarned', () => {
  it('only returns milestones that were not already held', () => {
    const stats = { ...empty, checkInDays: 1, streakBest: 3 }
    expect(newlyEarned(stats, [])).toEqual(['first-flight', 'chain-3'])
    expect(newlyEarned(stats, ['first-flight'])).toEqual(['chain-3'])
    expect(newlyEarned(stats, ['first-flight', 'chain-3'])).toEqual([])
  })
})

describe('nextAchievement', () => {
  it('points at the closest one still out of reach', () => {
    const next = nextAchievement({ ...empty, streakBest: 2, checkInDays: 1 }, ['first-flight'])
    expect(next?.achievement.id).toBe('chain-3')
    expect(next?.progress).toBeCloseTo(2 / 3)
  })

  it('returns null once everything is unlocked', () => {
    const all = ACHIEVEMENTS.map((achievement) => achievement.id)
    expect(nextAchievement(empty, all)).toBeNull()
  })
})
