import type { Habit } from './types'

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * A date key as a UTC noon timestamp.
 *
 * Every date key in this app names a *calendar day*, and calendar arithmetic
 * has to be done somewhere without daylight saving. Parsing `YYYY-MM-DDT12:00`
 * as a local time and subtracting milliseconds looks right and is wrong twice a
 * year: across Germany's spring transition two consecutive local noons are 23
 * hours apart, `Math.floor(23h / 24h)` is 0, and the app permanently loses a
 * day - every streak, cycle and arrival date shifted by one from that Sunday
 * onward. UTC has no transitions, so the difference is always exact.
 */
function utcNoon(dateKey: string): number {
  const [year, month, day] = dateKey.split('-').map(Number)
  return Date.UTC(year, (month ?? 1) - 1, day ?? 1, 12)
}

function fromUtc(timestamp: number): string {
  const date = new Date(timestamp)
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function daysBetween(startDate: string, endDate = localDateKey()): number {
  return Math.max(0, signedDaysBetween(startDate, endDate))
}

/**
 * Signed day distance, unlike `daysBetween` which floors at zero.
 *
 * Needed anywhere a date can legitimately lie in the past *or* the future -
 * the arrival forecast, for one, has to be able to say "eleven days early".
 */
export function signedDaysBetween(startDate: string, endDate: string): number {
  const start = utcNoon(startDate)
  const end = utcNoon(endDate)
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0
  return Math.round((end - start) / 86_400_000)
}

/** Shift a date key by whole days. */
export function addDays(dateKey: string, days: number): string {
  return fromUtc(utcNoon(dateKey) + days * 86_400_000)
}

export function previousDateKey(dateKey: string): string {
  return addDays(dateKey, -1)
}

export interface FlightCycleProgress {
  cycle: number
  day: number
  remainingDays: number
  progress: number
}

export function flightCycleProgress(startDate: string, endDate = localDateKey(), cycleDays = 30): FlightCycleProgress {
  const length = Math.max(1, Math.round(cycleDays))
  const elapsedDays = daysBetween(startDate, endDate)
  const day = elapsedDays % length + 1
  return {
    cycle: Math.floor(elapsedDays / length) + 1,
    day,
    remainingDays: length - day,
    progress: day / length,
  }
}

export function weekdayIndex(dateKey: string): number {
  const day = new Date(`${dateKey}T12:00:00`).getDay()
  return (day + 6) % 7
}

export function isHabitDue(habit: Habit, dateKey: string): boolean {
  if (habit.archived) return false
  if (habit.challengeDays) {
    const firstDay = habit.challengeStartedAt ?? habit.createdAt.slice(0, 10)
    if (dateKey < firstDay || daysBetween(firstDay, dateKey) >= habit.challengeDays) return false
  }
  return habit.days.length === 0 || habit.days.includes(weekdayIndex(dateKey))
}

/** Whether a habit's challenge window has run out. */
export function isChallengeComplete(habit: Habit, dateKey = localDateKey()): boolean {
  if (!habit.challengeDays || habit.archived) return false
  const firstDay = habit.challengeStartedAt ?? habit.createdAt.slice(0, 10)
  return daysBetween(firstDay, dateKey) >= habit.challengeDays
}

export function activeWeekCount(dates: string[]): number {
  const weeks = new Map<string, Set<string>>()
  for (const dateKey of dates) {
    const date = new Date(`${dateKey}T12:00:00`)
    const day = (date.getDay() + 6) % 7
    const monday = new Date(date)
    monday.setDate(date.getDate() - day)
    const key = localDateKey(monday)
    const days = weeks.get(key) ?? new Set<string>()
    days.add(dateKey)
    weeks.set(key, days)
  }
  return [...weeks.values()].filter((days) => days.size >= 4).length
}
