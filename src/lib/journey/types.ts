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
  /**
   * Day the challenge window started.
   *
   * Separate from `createdAt` so adding a 30-day challenge to a habit you have
   * had for months starts a fresh window instead of one that expired long ago.
   * Absent on older saved habits, which fall back to `createdAt`.
   */
  challengeStartedAt?: string
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
  reserveEarned?: number
  /** Set when the day was filed after the fact rather than on the day. */
  backfilled?: boolean
  /**
   * Set when nobody filed the day and the app closed it out as missed.
   *
   * Distinguished from a human "missed" so the history can show the two
   * differently - one is an admission, the other is an absence.
   */
  autoMissed?: boolean
  completedAt: string
}

/** What the app closed out while nobody was looking. */
export interface ReturnSummary {
  /** Date keys that were auto-filed, oldest first. */
  days: string[]
  /** Degrees of course added by the absence. */
  addedDegrees: number
  /** Chain length before the absence, so the card can say what it cost. */
  streakBefore: number
}

export type AircraftId = 'trainer' | 'turboprop' | 'regional' | 'longhaul' | 'velocity'

export interface HabitGameProgress {
  experience: number
  level: number
  bestCombo: number
  /**
   * The reserve tank, 0..100. Earned from real habit outcomes only and spent
   * to freeze a missed day so the chain survives it.
   */
  reserve: number
  totalReserveEarned: number
  successfulLandings: number
  ringsFlown: number
  /** Comeback missions actually flown to a landing. */
  recoveriesCompleted: number
}

export interface AppSettings {
  /** Daily nudge to close the day out. */
  reminderEnabled: boolean
  /** Local wall-clock time of that nudge. */
  reminderHour: number
  reminderMinute: number
  /** Second nudge, only fired when the day is still open. */
  lastCallEnabled: boolean
  lastCallHour: number
  hapticsEnabled: boolean
  /** Lets someone turn the damage drama off without turning motion off. */
  showDamage: boolean
  /** Automatically spend reserve to bridge a missed day. */
  autoFreeze: boolean
}

export type RecoveryMissionStatus = 'available' | 'completed' | 'expired'

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
