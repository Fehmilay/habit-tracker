import { addDays, localDateKey, weekdayIndex } from './date'
import { dayOutcome, PERFECT_MIN_COMPLETION, type DayOutcome } from './streak'
import type { DailyFlightRecord, Habit } from './types'

/**
 * The chain, drawn.
 *
 * A streak counter tells you a number; a month grid tells you the *shape* of
 * your last thirty days, which is the thing that actually changes behaviour -
 * a visible gap is far harder to repeat than an invisible one.
 */

export interface HistoryCell {
  date: string
  outcome: DayOutcome
  /** 0..1 completion where the day was recorded, otherwise null. */
  completionRate: number | null
  perfect: boolean
  /** Monday-indexed weekday, 0..6. */
  weekday: number
  isToday: boolean
  isFuture: boolean
}

export interface MonthGrid {
  year: number
  month: number
  label: string
  /** Blank slots before the first of the month, so the grid lines up on Monday. */
  leadingBlanks: number
  cells: HistoryCell[]
}

export interface HistoryInput {
  records: DailyFlightRecord[]
  habits: Habit[]
  frozenDates?: string[]
  today?: string
}

function lookupFor(input: HistoryInput, today: string) {
  return {
    habits: input.habits,
    recordsByDate: new Map(input.records.map((record) => [record.date, record])),
    frozenDates: new Set(input.frozenDates ?? []),
    today,
  }
}

const MONTH_LABELS = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
]

function dateKeyFor(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function monthGrid(input: HistoryInput, year: number, month: number): MonthGrid {
  const today = input.today ?? localDateKey()
  const lookup = lookupFor(input, today)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const first = dateKeyFor(year, month, 1)

  const cells: HistoryCell[] = []
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = dateKeyFor(year, month, day)
    const record = lookup.recordsByDate.get(date)
    const isFuture = date > today
    cells.push({
      date,
      outcome: isFuture ? 'outside' : dayOutcome(date, lookup),
      completionRate: record ? record.completionRate : null,
      perfect: Boolean(record && record.completionRate >= PERFECT_MIN_COMPLETION),
      weekday: weekdayIndex(date),
      isToday: date === today,
      isFuture,
    })
  }

  return {
    year,
    month,
    label: `${MONTH_LABELS[month]} ${year}`,
    leadingBlanks: weekdayIndex(first),
    cells,
  }
}

export interface WeekSummary {
  /** Monday of the week. */
  startDate: string
  keptDays: number
  activeDays: number
  perfectDays: number
  completionRate: number
  /** Habit ids that failed most often this week. */
  weakestHabitIds: string[]
}

/**
 * The last seven days, summarised.
 *
 * Deliberately a rolling window rather than a calendar week: a Wednesday recap
 * of "your week so far" is two days of data and reads as failure, which is
 * exactly the wrong feedback to give someone mid-week.
 */
export function rollingWeek(input: HistoryInput): WeekSummary {
  const today = input.today ?? localDateKey()
  const lookup = lookupFor(input, today)
  const startDate = addDays(today, -6)

  let keptDays = 0
  let activeDays = 0
  let perfectDays = 0
  let rateTotal = 0
  const misses = new Map<string, number>()

  for (let offset = 0; offset < 7; offset += 1) {
    const date = addDays(startDate, offset)
    const outcome = dayOutcome(date, lookup)
    if (outcome === 'rest' || outcome === 'outside') continue

    activeDays += 1
    const record = lookup.recordsByDate.get(date)
    if (record) {
      rateTotal += Math.max(0, Math.min(1, record.completionRate))
      if (outcome === 'kept') keptDays += 1
      if (record.completionRate >= PERFECT_MIN_COMPLETION) perfectDays += 1
      for (const [habitId, status] of Object.entries(record.statuses)) {
        if (status === 'missed') misses.set(habitId, (misses.get(habitId) ?? 0) + 1)
      }
    }
  }

  const weakestHabitIds = [...misses.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([habitId]) => habitId)

  return {
    startDate,
    keptDays,
    activeDays,
    perfectDays,
    completionRate: activeDays === 0 ? 1 : rateTotal / activeDays,
    weakestHabitIds,
  }
}

/** Days since the journey started on which the course was dead straight. */
export function daysOnCourse(records: DailyFlightRecord[]): number {
  return records.filter((record) => record.finalDeviationDegrees <= 0.001).length
}
