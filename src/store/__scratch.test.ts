import { afterEach, describe, expect, it, vi } from 'vitest'
import { useJourneyStore } from './journeyStore'
import { localDateKey } from '@/lib/journey/date'
import { computeStreak } from '@/lib/journey/streak'
import type { Habit } from '@/lib/journey/types'

function habit(createdAt: string): Habit {
  return { id: 'gym', name: 'Gym', icon: 'strength', cue: 'Trainieren',
    days: [0,1,2,3,4,5,6], impact: 1, archived: false, createdAt }
}
type StoreState = ReturnType<typeof useJourneyStore.getState>
function patch(p: Partial<StoreState>) { useJourneyStore.setState(p as StoreState) }
const d = (n: number) => `2026-06-${String(n).padStart(2, '0')}`
afterEach(() => vi.useRealTimers())

describe('A daily opener, never checks in', () => {
  it('reconcile files nothing', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(`${d(1)}T09:00:00`))
    useJourneyStore.getState().resetEverything()
    patch({ onboarded: true, hasStarted: true, habits: [habit('2026-05-01T00:00:00.000Z')],
      journey: { ...useJourneyStore.getState().journey, startDate: d(1) },
      records: [], lastReconciledDate: d(1), currentDeviationDegrees: 0 })
    const log: string[] = []
    for (let i = 1; i <= 14; i += 1) {
      vi.setSystemTime(new Date(`${d(i)}T09:00:00`))
      useJourneyStore.getState().reconcileCalendar()
      const s = useJourneyStore.getState()
      log.push(`${localDateKey()} rec=${s.records.length} dev=${s.currentDeviationDegrees} last=${s.lastReconciledDate} ret=${s.pendingReturn ? s.pendingReturn.days.length : '-'}`)
    }
    expect(log).toBe('SHOW')
  })
})

describe('E partial freeze waste', () => {
  it('spends 30 on the older gap and the chain still breaks', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(`${d(10)}T21:00:00`))
    useJourneyStore.getState().resetEverything()
    const h = habit('2026-05-01T00:00:00.000Z')
    const kept = (date: string) => ({
      date, statuses: { gym: 'completed' as const },
      previousDeviationDegrees: 0, recoveredDegrees: 0, addedDegrees: 0,
      finalDeviationDegrees: 0, crossTrackKm: 0, completionRate: 1, events: [],
      completedAt: `${date}T20:00:00.000Z`,
    })
    patch({ onboarded: true, hasStarted: true, habits: [h],
      journey: { ...useJourneyStore.getState().journey, startDate: d(1) },
      // kept 06-01..06-07, then 06-08 and 06-09 both unanswered, checking in 06-10
      records: [1,2,3,4,5,6,7].map((n) => kept(d(n))),
      lastReconciledDate: d(10),
      progress: { ...useJourneyStore.getState().progress, reserve: 20 } })
    useJourneyStore.getState().setDraftStatus('gym', 'completed')
    useJourneyStore.getState().completeToday()
    const s = useJourneyStore.getState()
    expect({ frozen: s.streakFrozenDates, reserve: s.progress.reserve, streak: computeStreak({ records: s.records, habits: s.habits, frozenDates: s.streakFrozenDates, journeyStartDate: s.journey.startDate }).current }).toBe('SHOW')
  })
})
