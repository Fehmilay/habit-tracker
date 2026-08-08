import type { AppSettings, Habit, JourneyGoal } from './types'

const everyDay = [0, 1, 2, 3, 4, 5, 6]
const weekdays = [0, 1, 2, 3, 4]

/**
 * The sample profile.
 *
 * Only ever seen for the handful of frames between mount and the setup flow -
 * it exists so the first paint is a working aircraft over a real route rather
 * than an empty screen, and `completeOnboarding` replaces it wholesale.
 */
export const DEFAULT_HABITS: Habit[] = [
  {
    id: 'gym',
    name: 'Gym',
    icon: 'strength',
    cue: '45 Minuten Training',
    durationMinutes: 45,
    days: [0, 2, 4],
    impact: 1,
    archived: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'nutrition',
    name: 'Kalorienziel',
    icon: 'nutrition',
    cue: 'Im geplanten Rahmen bleiben',
    durationMinutes: 25,
    days: everyDay,
    impact: 1,
    archived: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'steps',
    name: '10k Schritte',
    icon: 'steps',
    cue: '10.000 Schritte sammeln',
    durationMinutes: 30,
    days: everyDay,
    impact: 0.5,
    archived: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'water',
    name: 'Wasser',
    icon: 'water',
    cue: '2,5 Liter trinken',
    durationMinutes: 10,
    days: everyDay,
    impact: 0.5,
    archived: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
]

export const DEFAULT_JOURNEY: JourneyGoal = {
  title: 'Traumkörper aufbauen',
  targetValue: 36,
  unit: 'Trainings',
  totalDays: 90,
  startDate: '2026-08-01',
  originIata: 'DUS',
  originCity: 'Düsseldorf',
  destinationIata: 'JFK',
  destinationCity: 'New York',
  totalDistanceKm: 5840,
}

/**
 * Reminder defaults.
 *
 * 20:00 rather than the morning: the check-in reports on a day that has to be
 * over before it can be rated honestly. The last call at 22:00 only fires when
 * the day is still open, so someone who already checked in is never nagged.
 */
export const DEFAULT_SETTINGS: AppSettings = {
  reminderEnabled: true,
  reminderHour: 20,
  reminderMinute: 0,
  lastCallEnabled: true,
  lastCallHour: 22,
  hapticsEnabled: true,
  showDamage: true,
  autoFreeze: true,
}

export interface HabitPreset {
  name: string
  icon: string
  cue: string
  durationMinutes: number
  days: number[]
  impact: number
}

/**
 * Starter habits offered during setup.
 *
 * Kept short and concrete. A preset like "gesünder leben" cannot be rated at
 * the end of a day, and a habit you cannot rate never produces a record.
 */
export const HABIT_PRESETS: HabitPreset[] = [
  { name: 'Training', icon: 'strength', cue: '45 Minuten bewegen', durationMinutes: 45, days: [0, 2, 4], impact: 1 },
  { name: '10k Schritte', icon: 'steps', cue: '10.000 Schritte sammeln', durationMinutes: 30, days: everyDay, impact: 0.5 },
  { name: 'Ernährung', icon: 'nutrition', cue: 'Im geplanten Rahmen bleiben', durationMinutes: 20, days: everyDay, impact: 1 },
  { name: 'Wasser', icon: 'water', cue: '2,5 Liter trinken', durationMinutes: 10, days: everyDay, impact: 0.5 },
  { name: 'Lesen', icon: 'study', cue: '20 Seiten lesen', durationMinutes: 25, days: everyDay, impact: 0.5 },
  { name: 'Deep Work', icon: 'focus', cue: '90 Minuten ohne Ablenkung', durationMinutes: 90, days: weekdays, impact: 1.5 },
  { name: 'Schlaf', icon: 'sleep', cue: 'Vor 23:30 im Bett', durationMinutes: 15, days: everyDay, impact: 1 },
  { name: 'Sparen', icon: 'money', cue: 'Kein ungeplanter Kauf', durationMinutes: 10, days: everyDay, impact: 0.5 },
  { name: 'Meditation', icon: 'heart', cue: '10 Minuten still sitzen', durationMinutes: 10, days: everyDay, impact: 0.5 },
]

export interface GoalPreset {
  title: string
  unit: string
  targetValue: number
  totalDays: number
  destinationIata: string
}

export const GOAL_PRESETS: GoalPreset[] = [
  { title: 'Fitter werden', unit: 'Trainings', targetValue: 36, totalDays: 90, destinationIata: 'JFK' },
  { title: 'Ruhiger werden', unit: 'ruhige Tage', targetValue: 60, totalDays: 90, destinationIata: 'HND' },
  { title: 'Fokussierter arbeiten', unit: 'Deep-Work-Blöcke', targetValue: 90, totalDays: 120, destinationIata: 'SIN' },
  { title: 'Gesünder leben', unit: 'saubere Tage', targetValue: 120, totalDays: 180, destinationIata: 'SYD' },
]
