import type { AircraftId } from '@/lib/journey/types'

/**
 * Level curve and skin unlocks.
 *
 * The game runs continuously now, so experience arrives steadily rather than
 * in per-round lumps. A flat "every 500 XP" threshold would hand out a level
 * every few minutes forever; instead each level costs progressively more, so
 * early levels arrive quickly enough to feel responsive and later ones stay
 * worth reaching.
 */

/** XP awarded for flying through a habit ring, before the combo multiplier. */
export const XP_PER_RING = 12

/** Combo multiplier is capped so a long clean run cannot run away with it. */
export const MAX_COMBO_MULTIPLIER = 5

/** Total experience needed to have reached a given level. */
export function experienceForLevel(level: number): number {
  if (level <= 1) return 0
  // Quadratic: level 2 at 120, level 5 at ~960, level 10 at ~4300.
  const steps = level - 1
  return Math.round(60 * steps * (steps + 1))
}

/** The level a given total experience corresponds to. */
export function levelForExperience(experience: number): number {
  const safe = Math.max(0, experience)
  let level = 1
  while (experienceForLevel(level + 1) <= safe && level < 999) level += 1
  return level
}

export interface LevelProgress {
  level: number
  /** Experience earned inside the current level. */
  into: number
  /** Experience the current level spans in total. */
  span: number
  /** 0..1 progress toward the next level. */
  ratio: number
}

export function levelProgress(experience: number): LevelProgress {
  const level = levelForExperience(experience)
  const base = experienceForLevel(level)
  const next = experienceForLevel(level + 1)
  const span = Math.max(1, next - base)
  const into = Math.max(0, Math.min(span, experience - base))
  return { level, into, span, ratio: into / span }
}

/** Experience for one ring, given the combo that ring completed. */
export function experienceForRing(combo: number): number {
  const multiplier = Math.max(1, Math.min(MAX_COMBO_MULTIPLIER, combo))
  return XP_PER_RING * multiplier
}

export interface AircraftSkin {
  id: AircraftId
  name: string
  requiredLevel: number
  /** Main hull colour. */
  hull: string
  /** Livery accent: fin, winglets, stabilisers. */
  accent: string
  /** Engine cowl and trim. */
  trim: string
}

/**
 * Skins, unlocked purely by level.
 *
 * Previously these were gated on "active weeks", which meant a player could
 * fly for hours and unlock nothing. Tying them to the level curve makes the
 * thing you do produce the thing you earn.
 */
export const AIRCRAFT_SKINS: AircraftSkin[] = [
  { id: 'trainer', name: 'Aero One', requiredLevel: 1, hull: '#c9d2dc', accent: '#dce8f6', trim: '#2b323b' },
  { id: 'turboprop', name: 'Northstar', requiredLevel: 3, hull: '#b8ccc7', accent: '#8ff2d8', trim: '#1f3b36' },
  { id: 'regional', name: 'Pulse', requiredLevel: 6, hull: '#aebfd6', accent: '#7cc9ff', trim: '#1b3350' },
  { id: 'longhaul', name: 'Meridian', requiredLevel: 10, hull: '#d6c8a8', accent: '#ffd489', trim: '#3d3016' },
  { id: 'velocity', name: 'Velocity', requiredLevel: 16, hull: '#c3b0d8', accent: '#d1a8ff', trim: '#2e2044' },
]

export function skinById(id: AircraftId): AircraftSkin {
  return AIRCRAFT_SKINS.find((skin) => skin.id === id) ?? AIRCRAFT_SKINS[0]
}

export function unlockedSkins(level: number): AircraftSkin[] {
  return AIRCRAFT_SKINS.filter((skin) => skin.requiredLevel <= level)
}

/** The skin unlocked exactly at this level, if any - used for the level-up card. */
export function skinUnlockedAtLevel(level: number): AircraftSkin | null {
  return AIRCRAFT_SKINS.find((skin) => skin.requiredLevel === level) ?? null
}
