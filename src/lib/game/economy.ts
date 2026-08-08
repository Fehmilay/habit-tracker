import type { HabitStatus } from '@/lib/journey/types'

/**
 * The reserve tank.
 *
 * This used to be a fuel meter that the ring game spent to start a round. The
 * game no longer has rounds, so the tank paid for nothing and quietly filled up
 * forever - a currency with no sink, which is the definition of a dead
 * mechanic. It now buys the one thing in this app worth paying for: a day of
 * chain protection when life gets in the way.
 *
 * Deliberately *earned only from real habit outcomes*. Nothing you do inside
 * the ring game adds a drop, because a streak you bought by flying loops would
 * make the chain a lie.
 */

export const MAX_RESERVE = 100
export const STARTER_RESERVE = 20
/** Reserve spent to bridge one missed active day. */
export const RESERVE_PER_FREEZE = 30
/** Reserve for landing a comeback mission. */
export const RECOVERY_RESERVE_REWARD = 8

export function reserveForHabitStatus(status: HabitStatus): number {
  if (status === 'completed') return 25
  if (status === 'partial') return 8
  return 0
}

export function clampReserve(value: number): number {
  return Math.max(0, Math.min(MAX_RESERVE, Math.round(value)))
}

export function reserveEarnedForStatuses(statuses: Record<string, HabitStatus>): number {
  return Object.values(statuses).reduce(
    (total, status) => total + reserveForHabitStatus(status),
    0,
  )
}

/** How many missed days the given reserve can bridge. */
export function freezesAvailable(reserve: number): number {
  return Math.floor(clampReserve(reserve) / RESERVE_PER_FREEZE)
}
