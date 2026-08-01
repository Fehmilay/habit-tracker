export type HabitStatus = 'completed' | 'partial' | 'missed' | 'not_relevant'

export interface Habit {
  id: string
  name: string
  icon: string
  cue: string
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

