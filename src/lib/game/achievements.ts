import type { GlyphName } from '@/components/icons/Glyph'

/**
 * Milestones.
 *
 * Levels reward flying the ring game; these reward the thing the app is
 * actually for. They are pure predicates over a snapshot rather than events
 * fired at the moment they happen, which means an imported or repaired profile
 * arrives with the right badges instead of an empty case, and no achievement
 * can ever be granted twice or lost by a missed callback.
 */

export type AchievementTier = 'bronze' | 'silver' | 'gold'

export interface AchievementStats {
  streakCurrent: number
  streakBest: number
  checkInDays: number
  perfectDays: number
  focusMinutes: number
  ringsFlown: number
  successfulLandings: number
  recoveriesCompleted: number
  distanceFlownKm: number
  level: number
  daysOnCourse: number
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: GlyphName
  tier: AchievementTier
  /** Progress toward unlocking, 0..1, for the ones that are worth a bar. */
  progress: (stats: AchievementStats) => number
}

function ratio(value: number, target: number): number {
  if (target <= 0) return 1
  return Math.max(0, Math.min(1, value / target))
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-flight',
    name: 'Erster Start',
    description: 'Den ersten Tag bestätigt.',
    icon: 'play',
    tier: 'bronze',
    progress: (s) => ratio(s.checkInDays, 1),
  },
  {
    id: 'chain-3',
    name: 'Abgehoben',
    description: 'Drei Tage am Stück.',
    icon: 'spark',
    tier: 'bronze',
    progress: (s) => ratio(s.streakBest, 3),
  },
  {
    id: 'chain-7',
    name: 'Reiseflughöhe',
    description: 'Sieben Tage am Stück.',
    icon: 'spark',
    tier: 'silver',
    progress: (s) => ratio(s.streakBest, 7),
  },
  {
    id: 'chain-30',
    name: 'Langstrecke',
    description: 'Dreißig Tage am Stück.',
    icon: 'spark',
    tier: 'gold',
    progress: (s) => ratio(s.streakBest, 30),
  },
  {
    id: 'chain-100',
    name: 'Transatlantik',
    description: 'Hundert Tage am Stück.',
    icon: 'spark',
    tier: 'gold',
    progress: (s) => ratio(s.streakBest, 100),
  },
  {
    id: 'perfect-1',
    name: 'Saubere Linie',
    description: 'Ein Tag mit 100%.',
    icon: 'check',
    tier: 'bronze',
    progress: (s) => ratio(s.perfectDays, 1),
  },
  {
    id: 'perfect-10',
    name: 'Präzisionsflug',
    description: 'Zehn perfekte Tage.',
    icon: 'check',
    tier: 'silver',
    progress: (s) => ratio(s.perfectDays, 10),
  },
  {
    id: 'perfect-50',
    name: 'Kunstflug',
    description: 'Fünfzig perfekte Tage.',
    icon: 'check',
    tier: 'gold',
    progress: (s) => ratio(s.perfectDays, 50),
  },
  {
    id: 'checkin-25',
    name: 'Vielflieger',
    description: '25 Tage bestätigt.',
    icon: 'calendar',
    tier: 'bronze',
    progress: (s) => ratio(s.checkInDays, 25),
  },
  {
    id: 'checkin-100',
    name: 'Stammgast',
    description: '100 Tage bestätigt.',
    icon: 'calendar',
    tier: 'silver',
    progress: (s) => ratio(s.checkInDays, 100),
  },
  {
    id: 'focus-600',
    name: 'Zehn Stunden Fokus',
    description: '600 Minuten Fokusflug gesammelt.',
    icon: 'clock',
    tier: 'silver',
    progress: (s) => ratio(s.focusMinutes, 600),
  },
  {
    id: 'comeback-1',
    name: 'Comeback',
    description: 'Eine Comeback-Mission geflogen.',
    icon: 'refresh',
    tier: 'bronze',
    progress: (s) => ratio(s.recoveriesCompleted, 1),
  },
  {
    id: 'comeback-10',
    name: 'Wiedergutmachung',
    description: 'Zehn Comeback-Missionen geflogen.',
    icon: 'refresh',
    tier: 'gold',
    progress: (s) => ratio(s.recoveriesCompleted, 10),
  },
  {
    id: 'rings-250',
    name: 'Ringjäger',
    description: '250 Habit-Ringe durchflogen.',
    icon: 'target',
    tier: 'bronze',
    progress: (s) => ratio(s.ringsFlown, 250),
  },
  {
    id: 'rings-2500',
    name: 'Ringmeister',
    description: '2.500 Habit-Ringe durchflogen.',
    icon: 'target',
    tier: 'gold',
    progress: (s) => ratio(s.ringsFlown, 2_500),
  },
  {
    id: 'landing-1',
    name: 'Erste Landung',
    description: 'Einen 30-Tage-Zyklus gelandet.',
    icon: 'aircraft',
    tier: 'silver',
    progress: (s) => ratio(s.successfulLandings, 1),
  },
  {
    id: 'distance-1000',
    name: 'Tausend Kilometer',
    description: '1.000 km auf dem Sollkurs zurückgelegt.',
    icon: 'globe',
    tier: 'bronze',
    progress: (s) => ratio(s.distanceFlownKm, 1_000),
  },
  {
    id: 'on-course-14',
    name: 'Kurstreue',
    description: '14 Tage ohne Abweichung.',
    icon: 'compass',
    tier: 'silver',
    progress: (s) => ratio(s.daysOnCourse, 14),
  },
]

export function achievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((achievement) => achievement.id === id)
}

/** Every achievement the snapshot satisfies, unlocked or not. */
export function earnedAchievementIds(stats: AchievementStats): string[] {
  return ACHIEVEMENTS.filter((achievement) => achievement.progress(stats) >= 1).map(
    (achievement) => achievement.id,
  )
}

/** The ones newly satisfied since the last evaluation. */
export function newlyEarned(stats: AchievementStats, alreadyUnlocked: string[]): string[] {
  const known = new Set(alreadyUnlocked)
  return earnedAchievementIds(stats).filter((id) => !known.has(id))
}

/** The closest achievement still out of reach - the one worth showing next. */
export function nextAchievement(
  stats: AchievementStats,
  alreadyUnlocked: string[],
): { achievement: Achievement; progress: number } | null {
  const known = new Set(alreadyUnlocked)
  let best: { achievement: Achievement; progress: number } | null = null

  for (const achievement of ACHIEVEMENTS) {
    if (known.has(achievement.id)) continue
    const progress = achievement.progress(stats)
    if (progress >= 1) continue
    if (!best || progress > best.progress) best = { achievement, progress }
  }

  return best
}
