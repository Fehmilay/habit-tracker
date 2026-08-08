'use client'

import { useMemo } from 'react'
import { readInstruments, type InstrumentReadout } from '@/lib/flight/instruments'
import { computeStreak, type StreakState } from '@/lib/journey/streak'
import { localDateKey } from '@/lib/journey/date'
import { useJourneyStore } from './journeyStore'

/**
 * Derived-state hooks.
 *
 * Both of these compute over the whole record history, and both are read by
 * components that also live next to a 60 fps scene. Selecting the store slices
 * they actually depend on and memoising on those slices means a ring scored in
 * the game - which writes to `progress` several times a minute - does not drag
 * a full history scan along with it.
 *
 * They must not be written as plain `useJourneyStore(selector)` calls either:
 * each returns a fresh object, and zustand compares snapshots by identity, so a
 * selector that allocates would re-render on every single store write.
 */

export function useStreak(): StreakState {
  const records = useJourneyStore((state) => state.records)
  const habits = useJourneyStore((state) => state.habits)
  const frozenDates = useJourneyStore((state) => state.streakFrozenDates)
  const startDate = useJourneyStore((state) => state.journey.startDate)

  return useMemo(
    () =>
      computeStreak({
        records,
        habits,
        frozenDates,
        journeyStartDate: startDate,
      }),
    [records, habits, frozenDates, startDate],
  )
}

export function useInstruments(): InstrumentReadout {
  const journey = useJourneyStore((state) => state.journey)
  const habits = useJourneyStore((state) => state.habits)
  const records = useJourneyStore((state) => state.records)
  const drafts = useJourneyStore((state) => state.drafts)
  const reserve = useJourneyStore((state) => state.progress.reserve)
  const deviation = useJourneyStore((state) => state.currentDeviationDegrees)
  const streak = useStreak()

  return useMemo(
    () =>
      readInstruments({
        journey,
        habits,
        records,
        drafts,
        streak,
        reserve,
        deviationDegrees: deviation,
        today: localDateKey(),
      }),
    [journey, habits, records, drafts, streak, reserve, deviation],
  )
}
