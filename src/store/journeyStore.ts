'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { AIRCRAFT, DEFAULT_HABITS, DEFAULT_JOURNEY } from '@/lib/journey/defaults'
import { calculateDailyDeviation } from '@/lib/journey/deviation'
import { activeWeekCount, isHabitDue, localDateKey } from '@/lib/journey/date'
import { crossTrackDistanceKm } from '@/lib/journey/projection'
import type {
  AircraftId,
  DailyFlightRecord,
  FocusFlight,
  GameMode,
  HabitGameProgress,
  Habit,
  HabitStatus,
  JourneyGoal,
} from '@/lib/journey/types'

interface JourneyStoreState {
  journey: JourneyGoal
  habits: Habit[]
  drafts: Record<string, HabitStatus>
  records: DailyFlightRecord[]
  currentDeviationDegrees: number
  selectedAircraft: AircraftId
  flightMinutes: number
  hydrated: boolean
  hasStarted: boolean

  gameMode: GameMode
  gameRingIds: string[]
  gameRingIndex: number
  gameScore: number
  gameHits: number
  gameCoins: number
  gameCombo: number
  gameBestCombo: number
  progress: HabitGameProgress

  focusFlight: FocusFlight | null

  setHydrated: (hydrated: boolean) => void
  initializeJourney: () => void
  updateJourney: (updates: Partial<JourneyGoal>) => void
  addHabit: (habit: Omit<Habit, 'id' | 'createdAt' | 'archived'>) => void
  updateHabit: (id: string, updates: Partial<Habit>) => void
  archiveHabit: (id: string) => void
  setDraftStatus: (habitId: string, status: HabitStatus) => void
  clearDrafts: () => void
  completeToday: (dateKey?: string) => DailyFlightRecord | null
  importLegacyHabits: () => number

  startGame: (ringIds: string[]) => void
  beginGame: () => void
  registerGameRing: (hit: boolean) => void
  collectGameCoin: () => void
  finishGame: () => void
  exitGame: () => void
  startFocusFlight: (habit: Habit) => void
  setFocusHiddenAt: (hiddenAt: number | null) => void
  landFocusFlight: () => void
  crashFocusFlight: () => void
  exitFocusFlight: () => void
  clearFocusFlight: () => void
  selectAircraft: (id: AircraftId) => void
}

function makeId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export const useJourneyStore = create<JourneyStoreState>()(
  persist(
    (set, get) => ({
      journey: DEFAULT_JOURNEY,
      habits: DEFAULT_HABITS,
      drafts: {},
      records: [],
      currentDeviationDegrees: 0,
      selectedAircraft: 'trainer',
      flightMinutes: 0,
      hydrated: false,
      hasStarted: false,

      gameMode: 'idle',
      gameRingIds: [],
      gameRingIndex: 0,
      gameScore: 0,
      gameHits: 0,
      gameCoins: 0,
      gameCombo: 0,
      gameBestCombo: 0,
      progress: { coins: 0, experience: 0, level: 1, bestCombo: 0 },

      focusFlight: null,

      setHydrated: (hydrated) => set({ hydrated }),
      initializeJourney: () => {
        const state = get()
        if (state.hasStarted) return
        set({
          hasStarted: true,
          journey: {
            ...state.journey,
            startDate: state.records.length > 0 ? state.journey.startDate : localDateKey(),
          },
        })
      },
      updateJourney: (updates) => set((state) => ({ journey: { ...state.journey, ...updates } })),

      addHabit: (habit) =>
        set((state) => ({
          habits: [
            ...state.habits,
            {
              ...habit,
              id: makeId('habit'),
              archived: false,
              createdAt: new Date().toISOString(),
            },
          ],
        })),

      updateHabit: (id, updates) =>
        set((state) => ({
          habits: state.habits.map((habit) =>
            habit.id === id ? { ...habit, ...updates, id: habit.id } : habit,
          ),
        })),

      archiveHabit: (id) =>
        set((state) => ({
          habits: state.habits.map((habit) =>
            habit.id === id ? { ...habit, archived: true } : habit,
          ),
          drafts: Object.fromEntries(
            Object.entries(state.drafts).filter(([habitId]) => habitId !== id),
          ),
        })),

      setDraftStatus: (habitId, status) =>
        set((state) => ({ drafts: { ...state.drafts, [habitId]: status } })),
      clearDrafts: () => set({ drafts: {} }),

      completeToday: (dateKey = localDateKey()) => {
        const state = get()
        if (state.records.some((record) => record.date === dateKey)) return null

        const dueHabits = state.habits.filter((habit) => isHabitDue(habit, dateKey))
        if (dueHabits.length === 0 || dueHabits.some((habit) => !state.drafts[habit.id])) {
          return null
        }

        const outcome = calculateDailyDeviation(
          state.currentDeviationDegrees,
          dueHabits,
          state.drafts,
        )
        const record: DailyFlightRecord = {
          date: dateKey,
          statuses: Object.fromEntries(
            dueHabits.map((habit) => [habit.id, state.drafts[habit.id]]),
          ),
          previousDeviationDegrees: outcome.previousDeviationDegrees,
          recoveredDegrees: outcome.recoveredDegrees,
          addedDegrees: outcome.addedDegrees,
          finalDeviationDegrees: outcome.finalDeviationDegrees,
          crossTrackKm: crossTrackDistanceKm(
            state.journey.totalDistanceKm,
            outcome.finalDeviationDegrees,
          ),
          completionRate: outcome.completionRate,
          events: outcome.events,
          completedAt: new Date().toISOString(),
        }

        set({
          records: [...state.records, record],
          currentDeviationDegrees: record.finalDeviationDegrees,
          drafts: {},
          flightMinutes: state.flightMinutes + Math.max(5, Math.round(outcome.completionRate * 20)),
        })
        return record
      },

      importLegacyHabits: () => {
        if (typeof window === 'undefined') return 0
        try {
          const raw = window.localStorage.getItem('ht_habits')
          if (!raw) return 0
          const legacy = JSON.parse(raw) as Array<Record<string, unknown>>
          const imported = legacy
            .filter((item) => typeof item.name === 'string')
            .map<Habit>((item) => ({
              id: makeId('legacy'),
              name: String(item.name),
              icon: typeof item.icon === 'string' ? item.icon : '⭐',
              cue:
                typeof item.duration === 'number'
                  ? `${item.duration} Minuten`
                  : 'Heute bewusst erledigen',
              days: Array.isArray(item.days)
                ? item.days.filter((day): day is number => typeof day === 'number')
                : [0, 1, 2, 3, 4, 5, 6],
              impact: 1,
              archived: false,
              createdAt: new Date().toISOString(),
            }))
          if (imported.length > 0) set((state) => ({ habits: [...state.habits, ...imported] }))
          return imported.length
        } catch {
          return 0
        }
      },

      startGame: (ringIds) =>
        set({
          gameMode: 'countdown',
          gameRingIds: ringIds,
          gameRingIndex: 0,
          gameScore: 0,
          gameHits: 0,
          gameCoins: 0,
          gameCombo: 0,
          gameBestCombo: 0,
        }),
      beginGame: () => set({ gameMode: 'playing' }),
      registerGameRing: (hit) =>
        set((state) => {
          const gameCombo = hit ? state.gameCombo + 1 : 0
          return {
            gameRingIndex: state.gameRingIndex + 1,
            gameScore: state.gameScore + (hit ? 100 * Math.min(5, gameCombo) : 0),
            gameHits: state.gameHits + (hit ? 1 : 0),
            gameCombo,
            gameBestCombo: Math.max(state.gameBestCombo, gameCombo),
          }
        }),
      collectGameCoin: () =>
        set((state) => ({
          gameCoins: state.gameCoins + 1,
          gameScore: state.gameScore + 25,
        })),
      finishGame: () =>
        set((state) => {
          const earnedExperience = state.gameHits * 100 + state.gameCoins * 25
          const experience = state.progress.experience + earnedExperience
          return {
            gameMode: 'summary',
            flightMinutes: state.flightMinutes + state.gameHits * 2,
            progress: {
              coins: state.progress.coins + state.gameCoins,
              experience,
              level: Math.floor(experience / 500) + 1,
              bestCombo: Math.max(state.progress.bestCombo, state.gameBestCombo),
            },
          }
        }),
      exitGame: () =>
        set({
          gameMode: 'idle',
          gameRingIds: [],
          gameRingIndex: 0,
          gameScore: 0,
          gameHits: 0,
          gameCoins: 0,
          gameCombo: 0,
          gameBestCombo: 0,
        }),
      startFocusFlight: (habit) => {
        const startedAt = Date.now()
        const durationMinutes = Math.max(1, Math.min(240, habit.durationMinutes ?? 25))
        set({
          focusFlight: {
            habitId: habit.id,
            habitName: habit.name,
            durationMinutes,
            startedAt,
            endsAt: startedAt + durationMinutes * 60_000,
            hiddenAt: null,
            status: 'flying',
          },
        })
      },
      setFocusHiddenAt: (hiddenAt) =>
        set((state) => state.focusFlight?.status === 'flying'
          ? { focusFlight: { ...state.focusFlight, hiddenAt } }
          : state),
      landFocusFlight: () =>
        set((state) => {
          if (!state.focusFlight || state.focusFlight.status !== 'flying') return state
          const earnedExperience = state.focusFlight.durationMinutes * 10
          const experience = state.progress.experience + earnedExperience
          return {
            focusFlight: { ...state.focusFlight, hiddenAt: null, status: 'landed' },
            drafts: { ...state.drafts, [state.focusFlight.habitId]: 'completed' },
            flightMinutes: state.flightMinutes + state.focusFlight.durationMinutes,
            progress: {
              ...state.progress,
              coins: state.progress.coins + Math.max(1, Math.floor(state.focusFlight.durationMinutes / 5)),
              experience,
              level: Math.floor(experience / 500) + 1,
            },
          }
        }),
      crashFocusFlight: () =>
        set((state) => state.focusFlight?.status === 'flying'
          ? { focusFlight: { ...state.focusFlight, status: 'crashed' } }
          : state),
      exitFocusFlight: () => set({ focusFlight: null }),
      clearFocusFlight: () => set({ focusFlight: null }),
      selectAircraft: (id) => {
        const weeks = activeWeekCount(get().records.map((record) => record.date))
        const aircraft = AIRCRAFT.find((item) => item.id === id)
        if (aircraft && weeks >= aircraft.requiredWeeks) set({ selectedAircraft: id })
      },
    }),
    {
      name: 'course-flight-journey-v2',
      version: 2,
      partialize: (state) => ({
        ...state,
        hydrated: false,
        gameMode: 'idle' as const,
        gameRingIds: [],
        gameRingIndex: 0,
        gameScore: 0,
        gameHits: 0,
        gameCoins: 0,
        gameCombo: 0,
        gameBestCombo: 0,
      }),
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    },
  ),
)

export function selectActiveWeeks(state: JourneyStoreState): number {
  return activeWeekCount(state.records.map((record) => record.date))
}
