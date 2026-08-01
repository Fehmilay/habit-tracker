export type HabitStatus = 'completed' | 'partial' | 'missed' | 'not_relevant'

export interface Habit {
  id: string
  name: string
  icon: string
  cue: string
  /** Focus-flight duration. Older saved habits fall back to 25 minutes. */
  durationMinutes?: number
  /** Number of calendar days this habit belongs to the active flight. */
  challengeDays?: number
  days: number[]
  impact: number
  archived: boolean
  createdAt: string
}

export interface JourneyGoal {
  title: string
  targetValue: number
  unit: string
  totalDays: number
  startDate: string
  originIata: string
  originCity: string
  destinationIata: string
  destinationCity: string
  totalDistanceKm: number
}

export interface DeviationEvent {
  habitId: string
  label: string
  icon: string
  status: HabitStatus
  degrees: number
}

export interface DailyFlightRecord {
  date: string
  statuses: Record<string, HabitStatus>
  previousDeviationDegrees: number
  recoveredDegrees: number
  addedDegrees: number
  finalDeviationDegrees: number
  crossTrackKm: number
  completionRate: number
  events: DeviationEvent[]
  fuelEarned?: number
  completedAt: string
}

export type AircraftId = 'trainer' | 'turboprop' | 'regional' | 'longhaul' | 'velocity'

export interface AircraftDefinition {
  id: AircraftId
  name: string
  caption: string
  requiredWeeks: number
  accent: string
}

export type GameMode = 'idle' | 'countdown' | 'playing' | 'summary'

export interface HabitGameProgress {
  experience: number
  level: number
  bestCombo: number
  fuel: number
  totalFuelEarned: number
  successfulLandings: number
}

export type RecoveryMissionStatus = 'available' | 'completed'

export interface RecoveryMission {
  id: string
  sourceDate: string
  habitId: string
  habitName: string
  habitIcon: string
  actionLabel: string
  durationMinutes: number
  recoveryDegrees: number
  status: RecoveryMissionStatus
  completedAt?: string
}

export interface CycleLandingResult {
  cycle: number
  completionPercent: number
  grade: 'centerline' | 'safe' | 'hard' | 'alternate'
  landedAt: string
}

export type FocusFlightStatus = 'flying' | 'landed' | 'crashed'

export interface FocusFlight {
  habitId: string
  habitName: string
  durationMinutes: number
  startedAt: number
  endsAt: number
  hiddenAt: number | null
  status: FocusFlightStatus
  kind?: 'habit' | 'recovery'
  recoveryMissionId?: string
  recoveryDegrees?: number
}
