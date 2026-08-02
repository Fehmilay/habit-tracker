import type { HabitStatus } from '@/lib/journey/types'

export const MAX_HABIT_FUEL = 100
export const STARTER_FUEL = 20
export const RECOVERY_FUEL_REWARD = 8

export function fuelForHabitStatus(status: HabitStatus): number {
  if (status === 'completed') return 25
  if (status === 'partial') return 8
  return 0
}

export function clampFuel(value: number): number {
  return Math.max(0, Math.min(MAX_HABIT_FUEL, Math.round(value)))
}

export function fuelEarnedForStatuses(statuses: Record<string, HabitStatus>): number {
  return Object.values(statuses).reduce((total, status) => total + fuelForHabitStatus(status), 0)
}
