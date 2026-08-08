import { beforeEach, describe, expect, it } from 'vitest'
import { useJourneyStore } from './journeyStore'
import { addDays, localDateKey } from '@/lib/journey/date'
import type { Habit } from '@/lib/journey/types'

/**
 * Store-level tests for the rules that cannot be expressed as pure functions:
 * closing the calendar out, the one-day backfill window, and the draft stamp.
 */

const today = localDateKey()

function habit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'gym',
    name: 'Gym',
    icon: 'strength',
    cue: 'Trainieren',
    days: [0, 1, 2, 3, 4, 5, 6],
    impact: 1,
    archived: false,
    createdAt: `${addDays(today, -30)}T00:00:00.000Z`,
    ...overrides,
  }
}

type StoreState = ReturnType<typeof useJourneyStore.getState>

/**
 * `setState` merges shallowly, but the persist middleware narrows its type to
 * the replace-everything overload - so a partial patch has to be asserted
 * through. The cast describes what zustand actually does, not a lie about the
 * object being complete.
 */
function patch(partial: Partial<StoreState>) {
  useJourneyStore.setState(partial as StoreState)
}

function setup(overrides: Partial<StoreState> = {}) {
  useJourneyStore.getState().resetEverything()
  patch({
    onboarded: true,
    hasStarted: true,
    habits: [habit()],
    journey: { ...useJourneyStore.getState().journey, startDate: addDays(today, -10) },
    ...overrides,
  })
}

beforeEach(() => {
  setup()
})

describe('reconcileCalendar', () => {
  it('closes out every unanswered day and moves the course', () => {
    useJourneyStore.getState().reconcileCalendar()
    const state = useJourneyStore.getState()

    // Ten days back to yesterday-minus-one, all missed.
    expect(state.records.length).toBeGreaterThan(0)
    expect(state.records.every((record) => record.autoMissed)).toBe(true)
    expect(state.currentDeviationDegrees).toBeGreaterThan(0)
    expect(state.pendingReturn?.days.length).toBe(state.records.length)
    expect(state.pendingReturn?.addedDegrees).toBeGreaterThan(0)
  })

  it('leaves yesterday alone so it can still be filed by hand', () => {
    useJourneyStore.getState().reconcileCalendar()
    const dates = useJourneyStore.getState().records.map((record) => record.date)
    expect(dates).not.toContain(addDays(today, -1))
    expect(dates).not.toContain(today)
    expect(dates).toContain(addDays(today, -2))
  })

  it('is idempotent within a day', () => {
    useJourneyStore.getState().reconcileCalendar()
    const first = useJourneyStore.getState().records.length
    useJourneyStore.getState().clearReturnSummary()
    useJourneyStore.getState().reconcileCalendar()
    expect(useJourneyStore.getState().records).toHaveLength(first)
    expect(useJourneyStore.getState().pendingReturn).toBeNull()
  })

  it('does nothing before setup is finished', () => {
    setup({ onboarded: false })
    useJourneyStore.getState().reconcileCalendar()
    expect(useJourneyStore.getState().records).toHaveLength(0)
  })

  it('skips days on which no habit was due', () => {
    // Due on Mondays only, so at most two of the swept days can be filed.
    setup({ habits: [habit({ days: [0] })] })
    useJourneyStore.getState().reconcileCalendar()
    expect(useJourneyStore.getState().records.length).toBeLessThanOrEqual(2)
  })

  it('never files a day before the habit existed', () => {
    setup({ habits: [habit({ createdAt: `${addDays(today, -4)}T00:00:00.000Z` })] })
    useJourneyStore.getState().reconcileCalendar()
    const dates = useJourneyStore.getState().records.map((record) => record.date)
    expect(dates).not.toContain(addDays(today, -6))
    expect(dates).toContain(addDays(today, -3))
  })

  it('throws away drafts that belong to a previous day', () => {
    setup({ drafts: { gym: 'completed' }, draftsDate: addDays(today, -1) })
    useJourneyStore.getState().reconcileCalendar()
    expect(useJourneyStore.getState().drafts).toEqual({})
    expect(useJourneyStore.getState().draftsDate).toBeNull()
  })

  it("keeps today's drafts", () => {
    setup({ drafts: { gym: 'completed' }, draftsDate: today })
    useJourneyStore.getState().reconcileCalendar()
    expect(useJourneyStore.getState().drafts).toEqual({ gym: 'completed' })
  })

  it('expires comeback missions that are past their repair window', () => {
    setup({
      recoveryMissions: [
        {
          id: 'old',
          sourceDate: addDays(today, -9),
          habitId: 'gym',
          habitName: 'Gym',
          habitIcon: 'strength',
          actionLabel: 'Trainieren',
          durationMinutes: 10,
          recoveryDegrees: 0.5,
          status: 'available',
        },
        {
          id: 'fresh',
          sourceDate: addDays(today, -1),
          habitId: 'gym',
          habitName: 'Gym',
          habitIcon: 'strength',
          actionLabel: 'Trainieren',
          durationMinutes: 10,
          recoveryDegrees: 0.5,
          status: 'available',
        },
      ],
    })
    useJourneyStore.getState().reconcileCalendar()
    const missions = useJourneyStore.getState().recoveryMissions
    expect(missions.find((mission) => mission.id === 'old')?.status).toBe('expired')
    expect(missions.find((mission) => mission.id === 'fresh')?.status).toBe('available')
  })
})

describe('drafts', () => {
  it('stamps the day a rating belongs to', () => {
    useJourneyStore.getState().setDraftStatus('gym', 'completed')
    expect(useJourneyStore.getState().draftsDate).toBe(today)
  })

  it('clears the stamp once the day is filed', () => {
    useJourneyStore.getState().setDraftStatus('gym', 'completed')
    useJourneyStore.getState().completeToday()
    expect(useJourneyStore.getState().draftsDate).toBeNull()
    expect(useJourneyStore.getState().drafts).toEqual({})
  })
})

describe('completeToday', () => {
  it('refuses a day that is already filed', () => {
    useJourneyStore.getState().setDraftStatus('gym', 'completed')
    expect(useJourneyStore.getState().completeToday()).not.toBeNull()
    useJourneyStore.getState().setDraftStatus('gym', 'completed')
    expect(useJourneyStore.getState().completeToday()).toBeNull()
  })

  it('refuses a partially rated day', () => {
    setup({ habits: [habit(), habit({ id: 'water', name: 'Wasser' })] })
    useJourneyStore.getState().setDraftStatus('gym', 'completed')
    expect(useJourneyStore.getState().completeToday()).toBeNull()
  })

  it('awards reserve only for real outcomes and unlocks the first milestone', () => {
    useJourneyStore.getState().setDraftStatus('gym', 'completed')
    useJourneyStore.getState().completeToday()
    const state = useJourneyStore.getState()
    expect(state.progress.totalReserveEarned).toBe(25)
    expect(state.unlockedAchievements).toContain('first-flight')
    expect(state.pendingAchievements).toContain('first-flight')
  })
})

describe('backfillDay', () => {
  it('files yesterday and marks it as filed after the fact', () => {
    const yesterday = addDays(today, -1)
    const record = useJourneyStore.getState().backfillDay(yesterday, { gym: 'completed' })
    expect(record?.backfilled).toBe(true)
    expect(useJourneyStore.getState().records.map((entry) => entry.date)).toContain(yesterday)
  })

  it('refuses today and the future', () => {
    expect(useJourneyStore.getState().backfillDay(today, { gym: 'completed' })).toBeNull()
    expect(
      useJourneyStore.getState().backfillDay(addDays(today, 1), { gym: 'completed' }),
    ).toBeNull()
  })

  it('does not overwrite the live course when a later day is already filed', () => {
    useJourneyStore.getState().setDraftStatus('gym', 'missed')
    useJourneyStore.getState().completeToday()
    const afterToday = useJourneyStore.getState().currentDeviationDegrees
    useJourneyStore.getState().backfillDay(addDays(today, -1), { gym: 'completed' })
    expect(useJourneyStore.getState().currentDeviationDegrees).toBe(afterToday)
  })
})

describe('exportSnapshot / importSnapshot', () => {
  it('round-trips a profile', () => {
    useJourneyStore.getState().setDraftStatus('gym', 'completed')
    useJourneyStore.getState().completeToday()
    const snapshot = useJourneyStore.getState().exportSnapshot()

    useJourneyStore.getState().resetEverything()
    expect(useJourneyStore.getState().records).toHaveLength(0)

    expect(useJourneyStore.getState().importSnapshot(snapshot)).toBe(true)
    expect(useJourneyStore.getState().records).toHaveLength(1)
    expect(useJourneyStore.getState().onboarded).toBe(true)
  })

  it('refuses anything that is not one of ours', () => {
    const importSnapshot = useJourneyStore.getState().importSnapshot
    expect(importSnapshot(null)).toBe(false)
    expect(importSnapshot({ app: 'something-else', version: 3 })).toBe(false)
    expect(importSnapshot({ app: 'flight-habit', version: 999 })).toBe(false)
    expect(importSnapshot({ app: 'flight-habit', version: 3 })).toBe(false)
  })

  it('drops records that would poison the projections', () => {
    const snapshot = useJourneyStore.getState().exportSnapshot()
    const corrupted = {
      ...snapshot,
      records: [
        { date: '2026-01-01', completionRate: Number.NaN },
        { date: 'nonsense', completionRate: 1 },
      ],
    }
    expect(useJourneyStore.getState().importSnapshot(corrupted)).toBe(true)
    expect(useJourneyStore.getState().records).toHaveLength(0)
  })
})

describe('chain protection', () => {
  it('spends reserve to bridge yesterday when the chain is still alive', () => {
    // Two days back kept, yesterday missed, checking in today.
    setup({
      progress: { ...useJourneyStore.getState().progress, reserve: 100 },
      records: [
        {
          date: addDays(today, -2),
          statuses: { gym: 'completed' },
          previousDeviationDegrees: 0,
          recoveredDegrees: 0,
          addedDegrees: 0,
          finalDeviationDegrees: 0,
          crossTrackKm: 0,
          completionRate: 1,
          events: [],
          completedAt: `${addDays(today, -2)}T20:00:00.000Z`,
        },
      ],
      lastReconciledDate: today,
    })

    useJourneyStore.getState().setDraftStatus('gym', 'completed')
    useJourneyStore.getState().completeToday()

    const state = useJourneyStore.getState()
    expect(state.streakFrozenDates).toContain(addDays(today, -1))
    expect(state.progress.reserve).toBeLessThan(100)
  })

  it('does not spend reserve when the chain is already gone', () => {
    // Nothing kept at all, so bridging yesterday would buy nothing.
    setup({ progress: { ...useJourneyStore.getState().progress, reserve: 100 }, lastReconciledDate: today })
    useJourneyStore.getState().setDraftStatus('gym', 'completed')
    useJourneyStore.getState().completeToday()

    const state = useJourneyStore.getState()
    expect(state.streakFrozenDates).toEqual([])
    // Still gains the reserve the completed habit earned, and spends none.
    expect(state.progress.reserve).toBe(100)
  })
})

describe('reconcileCalendar watermark', () => {
  /**
   * The hole this closes: the sweep stops at `today - 2`, so if the watermark
   * were "the day the sweep last ran" the grace day would be skipped while it
   * was current and then sit below the floor forever. Someone opening the app
   * daily and rating nothing would never be charged for a single day.
   *
   * The watermark is therefore the last day *accounted for*, and these tests
   * walk it forward one day at a time the way real use does.
   */
  it('charges the grace day on the next day, not never', () => {
    // As if the app had been opened yesterday: that run closed up to T-3.
    setup({ lastReconciledDate: addDays(today, -3) })
    useJourneyStore.getState().reconcileCalendar()

    const dates = useJourneyStore.getState().records.map((record) => record.date)
    expect(dates).toEqual([addDays(today, -2)])
    expect(useJourneyStore.getState().lastReconciledDate).toBe(addDays(today, -2))
  })

  it('leaves a daily user nothing to catch up on, but never nothing to pay', () => {
    setup({ lastReconciledDate: addDays(today, -3) })
    const store = useJourneyStore.getState()

    store.reconcileCalendar()
    const afterFirst = useJourneyStore.getState().records.length
    // Same day again: the watermark already covers everything closable.
    store.reconcileCalendar()
    expect(useJourneyStore.getState().records).toHaveLength(afterFirst)
    expect(afterFirst).toBe(1)
  })

  it('does not charge the two days that are still inside the grace window', () => {
    setup({ lastReconciledDate: addDays(today, -1) })
    useJourneyStore.getState().reconcileCalendar()
    expect(useJourneyStore.getState().records).toHaveLength(0)
  })

  it('starts a fresh profile with everything before today already accounted for', () => {
    useJourneyStore.getState().resetEverything()
    useJourneyStore.getState().completeOnboarding({
      journey: {},
      habits: [{ name: 'Gym', icon: 'strength', cue: 'x', days: [0, 1, 2, 3, 4, 5, 6], impact: 1 }],
    })
    expect(useJourneyStore.getState().lastReconciledDate).toBe(addDays(today, -1))
    useJourneyStore.getState().reconcileCalendar()
    expect(useJourneyStore.getState().records).toHaveLength(0)
  })
})
