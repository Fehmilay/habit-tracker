import { addDays, isHabitDue, localDateKey } from './date'
import type { DailyFlightRecord, Habit } from './types'

/**
 * The chain.
 *
 * Everything else in this app measures *how far off course* you are. The streak
 * measures the opposite thing - how long you have kept showing up - and it is
 * the one number people protect. It is deliberately computed from the recorded
 * days rather than stored as a counter: a stored counter drifts the moment a
 * record is edited, imported or migrated, and a chain that can silently be
 * wrong is worse than no chain at all.
 */

/** Share of a day's due habits that has to land for the day to count. */
export const STREAK_MIN_COMPLETION = 0.5

/** A day at or above this counts as flawless, which the UI marks separately. */
export const PERFECT_MIN_COMPLETION = 0.999

export type DayOutcome =
  /** No habit was due - a planned rest day. Passes the chain through untouched. */
  | 'rest'
  /** Checked in at or above the threshold. */
  | 'kept'
  /** Checked in, but below the threshold. */
  | 'broken'
  /** An active day with no check-in at all. */
  | 'missed'
  /** An active day bridged by a reserve freeze. */
  | 'frozen'
  /** Today, still open. */
  | 'pending'
  /** Before the journey began, or in the future. */
  | 'outside'

export interface StreakState {
  /** Days currently on the chain. */
  current: number
  /** Longest chain ever reached. */
  best: number
  /** True when today is an active day that has not been secured yet. */
  atRisk: boolean
  /** Total days ever kept, across all chains. */
  totalKeptDays: number
  /** Total days ever flown at 100%. */
  perfectDays: number
  /** The most recent day that counted. */
  lastKeptDate: string | null
}

export interface DayLookup {
  habits: Habit[]
  recordsByDate: Map<string, DailyFlightRecord>
  frozenDates: Set<string>
  today: string
}

function isActiveDay(habits: Habit[], dateKey: string): boolean {
  return habits.some((habit) => {
    // A habit cannot have been due before it existed, so a day earlier than the
    // habit's creation is not an obligation someone failed - it is prehistory.
    if (dateKey < habit.createdAt.slice(0, 10)) return false
    return isHabitDue(habit, dateKey)
  })
}

/** What one calendar day did to the chain. */
export function dayOutcome(dateKey: string, lookup: DayLookup): DayOutcome {
  if (dateKey > lookup.today) return 'outside'

  const record = lookup.recordsByDate.get(dateKey)
  if (record) {
    return record.completionRate >= STREAK_MIN_COMPLETION ? 'kept' : 'broken'
  }

  if (!isActiveDay(lookup.habits, dateKey)) return 'rest'
  if (lookup.frozenDates.has(dateKey)) return 'frozen'
  if (dateKey === lookup.today) return 'pending'
  return 'missed'
}

export interface StreakInput {
  records: DailyFlightRecord[]
  habits: Habit[]
  /** Days rescued by spending reserve, so they neither break nor extend. */
  frozenDates?: string[]
  today?: string
  /** Earliest day the chain can reach back to. */
  journeyStartDate?: string
}

function buildLookup(input: StreakInput): DayLookup {
  return {
    habits: input.habits,
    recordsByDate: new Map(input.records.map((record) => [record.date, record])),
    frozenDates: new Set(input.frozenDates ?? []),
    today: input.today ?? localDateKey(),
  }
}

/**
 * The live chain state.
 *
 * Walks backwards from today. Rest days and frozen days are transparent - they
 * neither add to the chain nor cut it - so someone whose habits only run on
 * weekdays does not lose their streak every Saturday, which was the single
 * most common way naive streak implementations punish the wrong behaviour.
 */
export function computeStreak(input: StreakInput): StreakState {
  const lookup = buildLookup(input)
  const earliest = earliestDay(input, lookup)

  let current = 0
  let atRisk = false
  let lastKeptDate: string | null = null
  let cursor = lookup.today
  // A profile with no habits at all makes every day a rest day, so the walk
  // would run back to the journey start without ever hitting a stop condition.
  let guard = 0

  while (cursor >= earliest && guard < 4000) {
    guard += 1
    const outcome = dayOutcome(cursor, lookup)

    if (outcome === 'kept') {
      current += 1
      lastKeptDate ??= cursor
    } else if (outcome === 'pending') {
      // Today is still open: the chain carries yesterday's length and is shown
      // as at risk rather than already lost.
      atRisk = true
    } else if (outcome !== 'rest' && outcome !== 'frozen') {
      break
    }

    cursor = addDays(cursor, -1)
  }

  const history = scanHistory(input, lookup, earliest)

  return {
    current,
    best: Math.max(current, history.best),
    atRisk,
    totalKeptDays: history.totalKeptDays,
    perfectDays: history.perfectDays,
    lastKeptDate,
  }
}

function earliestDay(input: StreakInput, lookup: DayLookup): string {
  const dates = [...lookup.recordsByDate.keys()].sort()
  const firstRecord = dates[0]
  const candidates = [input.journeyStartDate, firstRecord].filter(
    (value): value is string => typeof value === 'string' && value.length === 10,
  )
  if (candidates.length === 0) return lookup.today
  return candidates.sort()[0]
}

interface HistoryScan {
  best: number
  totalKeptDays: number
  perfectDays: number
}

/**
 * Forward sweep for the all-time figures.
 *
 * Bounded to the recorded span rather than run open-endedly: a profile whose
 * journey start is a year old but which has three records should cost three
 * hundred cheap iterations, not be able to grow without limit.
 */
function scanHistory(input: StreakInput, lookup: DayLookup, earliest: string): HistoryScan {
  let best = 0
  let run = 0
  let totalKeptDays = 0
  let perfectDays = 0

  for (const record of input.records) {
    if (record.completionRate >= PERFECT_MIN_COMPLETION) perfectDays += 1
  }

  let cursor = earliest
  let guard = 0
  while (cursor <= lookup.today && guard < 4000) {
    guard += 1
    const outcome = dayOutcome(cursor, lookup)

    if (outcome === 'kept') {
      run += 1
      totalKeptDays += 1
      best = Math.max(best, run)
    } else if (outcome === 'broken' || outcome === 'missed') {
      run = 0
    }
    // 'rest', 'frozen' and 'pending' deliberately leave the run untouched.

    cursor = addDays(cursor, 1)
  }

  return { best, totalKeptDays, perfectDays }
}

/**
 * Active days between two check-ins that nobody answered for.
 *
 * Used at check-in time to decide how many days the reserve tank has to bridge
 * for the chain to survive.
 */
export function gapDaysBefore(dateKey: string, input: StreakInput, limit = 3): string[] {
  const lookup = buildLookup({ ...input, today: dateKey })
  const gaps: string[] = []
  let cursor = addDays(dateKey, -1)

  for (let step = 0; step < limit; step += 1) {
    const outcome = dayOutcome(cursor, lookup)
    if (outcome === 'rest' || outcome === 'frozen') {
      cursor = addDays(cursor, -1)
      continue
    }
    if (outcome !== 'missed') break
    gaps.push(cursor)
    cursor = addDays(cursor, -1)
  }

  return gaps
}
