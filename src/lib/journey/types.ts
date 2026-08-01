export type HabitStatus = 'completed' | 'partial' | 'missed' | 'not_relevant'

export interface Habit {
  id: string
  name: string
  icon: string
  cue: string
  /** Focus-flight duration. Older saved habits fall back to 25 minutes. */
  durationMinutes?: number
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
  coins: number
  experience: number
  level: number
  bestCombo: number
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
}
