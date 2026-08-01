'use client'

import { useSyncExternalStore } from 'react'

export type QualityTier = 'low' | 'medium' | 'high'

export interface QualitySettings {
  tier: QualityTier
  /** [min, max] device pixel ratio handed to the renderer. */
  dpr: [number, number]
  cloudCount: number
  /** Vertical light gates along the course line. */
  courseGateCount: number
  starCount: number
  /** Radial segments on the lathed fuselage. */
  fuselageSegments: number
  antialias: boolean
  showCloudDeck: boolean
}

const PROFILES: Record<QualityTier, Omit<QualitySettings, 'tier'>> = {
  low: {
    dpr: [1, 1.25],
    cloudCount: 34,
    courseGateCount: 16,
    starCount: 0,
    fuselageSegments: 16,
    antialias: false,
    showCloudDeck: false,
  },
  medium: {
    dpr: [1, 1.6],
    cloudCount: 72,
    courseGateCount: 24,
    starCount: 180,
    fuselageSegments: 22,
    antialias: true,
    showCloudDeck: true,
  },
  high: {
    dpr: [1, 2],
    cloudCount: 120,
    courseGateCount: 30,
    starCount: 320,
    fuselageSegments: 30,
    antialias: true,
    showCloudDeck: true,
  },
}

/**
 * Pick a quality tier from what the device is willing to tell us.
 *
 * Deliberately conservative: a phone that reports nothing lands on `medium`
 * rather than `high`, because a smooth scene matters more than an extra
 * handful of clouds.
 */
export function detectQualityTier(): QualityTier {
  if (typeof window === 'undefined') return 'medium'

  const cores = navigator.hardwareConcurrency ?? 4
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches
  const smallViewport = Math.min(window.innerWidth, window.innerHeight) < 420

  if (cores <= 4 || memory <= 2) return 'low'
  if (coarsePointer && smallViewport && cores <= 6) return 'low'
  if (coarsePointer || cores <= 8) return 'medium'
  return 'high'
}

export function qualitySettings(tier: QualityTier): QualitySettings {
  return { tier, ...PROFILES[tier] }
}

/** Device capability never changes mid-session, so the tier is resolved once. */
let cachedTier: QualityTier | null = null

function getTierSnapshot(): QualityTier {
  cachedTier ??= detectQualityTier()
  return cachedTier
}

function getServerTierSnapshot(): QualityTier {
  return 'medium'
}

const noopSubscribe = () => () => {}

/**
 * Resolves the quality tier on the client.
 *
 * `medium` is used for the server snapshot so hydration matches; the real tier
 * is read on the client and cached, because probing the device on every render
 * would be wasted work for a value that cannot change.
 */
export function useQualitySettings(): QualitySettings {
  const tier = useSyncExternalStore(
    noopSubscribe,
    getTierSnapshot,
    getServerTierSnapshot,
  )
  return qualitySettings(tier)
}
