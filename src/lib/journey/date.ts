import type { Habit } from './types'

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function daysBetween(startDate: string, endDate = localDateKey()): number {
  const start = new Date(`${startDate}T12:00:00`)
  const end = new Date(`${endDate}T12:00:00`)
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86_400_000))
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
    const firstDay = habit.createdAt.slice(0, 10)
    if (dateKey < firstDay || daysBetween(firstDay, dateKey) >= habit.challengeDays) return false
  }
  return habit.days.length === 0 || habit.days.includes(weekdayIndex(dateKey))
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
