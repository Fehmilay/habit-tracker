'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { clampFuel, fuelEarnedForStatuses, RECOVERY_FUEL_REWARD, STARTER_FUEL } from '@/lib/game/economy'
import {
  experienceForRing,
  levelForExperience,
  skinById,
} from '@/lib/game/progression'
import { DEFAULT_HABITS, DEFAULT_JOURNEY } from '@/lib/journey/defaults'
import { calculateDailyDeviation } from '@/lib/journey/deviation'
import { activeWeekCount, isHabitDue, localDateKey } from '@/lib/journey/date'
import { crossTrackDistanceKm } from '@/lib/journey/projection'
import type {
  AircraftId,
  CycleLandingResult,
  DailyFlightRecord,
  FocusFlight,
  HabitGameProgress,
  Habit,
  HabitStatus,
  JourneyGoal,
  RecoveryMission,
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

  /**
   * Live combo. The habit flight runs continuously now rather than as a round
   * you start and finish, so this accumulates for the session instead of being
   * reset by a start/finish pair.
   */
  gameCombo: number
  gameBestCombo: number
  progress: HabitGameProgress
  /** Set when a ring pushes the player over a level threshold; UI clears it. */
  pendingLevelUp: number | null

  focusFlight: FocusFlight | null
  recoveryMissions: RecoveryMission[]
  lastLanding: CycleLandingResult | null

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

  registerGameRing: (hit: boolean) => void
  clearLevelUp: () => void
  startFocusFlight: (habit: Habit) => void
  startRecoveryFlight: (missionId: string) => void
  setFocusHiddenAt: (hiddenAt: number | null) => void
  landFocusFlight: () => void
  crashFocusFlight: () => void
  exitFocusFlight: () => void
  clearFocusFlight: () => void
  recordLanding: (result: CycleLandingResult) => void
  selectAircraft: (id: AircraftId) => void
}

const DEFAULT_PROGRESS: HabitGameProgress = {
  experience: 0,
  level: 1,
  bestCombo: 0,
  fuel: STARTER_FUEL,
  totalFuelEarned: 0,
  successfulLandings: 0,
  ringsFlown: 0,
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

      gameCombo: 0,
      gameBestCombo: 0,
      progress: DEFAULT_PROGRESS,
      pendingLevelUp: null,

      focusFlight: null,
      recoveryMissions: [],
      lastLanding: null,

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
        set((state) => {
          if (state.drafts[habitId] !== status) return { drafts: { ...state.drafts, [habitId]: status } }
          const drafts = { ...state.drafts }
          delete drafts[habitId]
          return { drafts }
        }),
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
        const statuses = Object.fromEntries(
          dueHabits.map((habit) => [habit.id, state.drafts[habit.id]]),
        )
        const fuelEarned = fuelEarnedForStatuses(statuses)
        const recoveryMissions = dueHabits
          .filter((habit) => state.drafts[habit.id] === 'missed')
          .map<RecoveryMission>((habit) => ({
            id: `recovery-${dateKey}-${habit.id}`,
            sourceDate: dateKey,
            habitId: habit.id,
            habitName: habit.name,
            habitIcon: habit.icon,
            actionLabel: habit.cue,
            durationMinutes: Math.max(5, Math.min(15, Math.ceil(((habit.durationMinutes ?? 25) / 3) / 5) * 5)),
            recoveryDegrees: Math.round(Math.min(0.75, habit.impact * 0.5) * 100) / 100,
            status: 'available',
          }))
        const record: DailyFlightRecord = {
          date: dateKey,
          statuses,
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
          fuelEarned,
          completedAt: new Date().toISOString(),
        }

        set({
          records: [...state.records, record],
          currentDeviationDegrees: record.finalDeviationDegrees,
          drafts: {},
          flightMinutes: state.flightMinutes + Math.max(5, Math.round(outcome.completionRate * 20)),
          recoveryMissions: [...state.recoveryMissions, ...recoveryMissions],
          progress: {
            ...state.progress,
            fuel: clampFuel(state.progress.fuel + fuelEarned),
            totalFuelEarned: state.progress.totalFuelEarned + fuelEarned,
          },
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
              icon: typeof item.icon === 'string' ? item.icon : 'spark',
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

      /**
       * One ring passed the aircraft.
       *
       * This is the whole game loop now - there is no round to start or
       * finish, so experience and levels are settled here, ring by ring.
       */
      registerGameRing: (hit) =>
        set((state) => {
          const gameCombo = hit ? state.gameCombo + 1 : 0
          const earned = hit ? experienceForRing(gameCombo) : 0
          const experience = state.progress.experience + earned
          const level = levelForExperience(experience)
          const levelledUp = level > state.progress.level

          return {
            gameCombo,
            gameBestCombo: Math.max(state.gameBestCombo, gameCombo),
            pendingLevelUp: levelledUp ? level : state.pendingLevelUp,
            progress: {
              ...state.progress,
              experience,
              level,
              bestCombo: Math.max(state.progress.bestCombo, gameCombo),
              ringsFlown: state.progress.ringsFlown + 1,
            },
          }
        }),
      clearLevelUp: () => set({ pendingLevelUp: null }),
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
            kind: 'habit',
          },
        })
      },
      startRecoveryFlight: (missionId) => {
        const mission = get().recoveryMissions.find((candidate) => candidate.id === missionId && candidate.status === 'available')
        if (!mission) return
        const startedAt = Date.now()
        set({
          focusFlight: {
            habitId: mission.habitId,
            habitName: `Comeback · ${mission.habitName}`,
            durationMinutes: mission.durationMinutes,
            startedAt,
            endsAt: startedAt + mission.durationMinutes * 60_000,
            hiddenAt: null,
            status: 'flying',
            kind: 'recovery',
            recoveryMissionId: mission.id,
            recoveryDegrees: mission.recoveryDegrees,
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
          const recovery = state.focusFlight.kind === 'recovery'
          const earnedExperience = state.focusFlight.durationMinutes * 10
          const experience = state.progress.experience + earnedExperience
          const recoveryDegrees = recovery ? state.focusFlight.recoveryDegrees ?? 0 : 0
          const recoveryFuel = recovery ? RECOVERY_FUEL_REWARD : 0
          return {
            focusFlight: { ...state.focusFlight, hiddenAt: null, status: 'landed' },
            drafts: recovery ? state.drafts : { ...state.drafts, [state.focusFlight.habitId]: 'completed' },
            currentDeviationDegrees: recovery
              ? Math.round(Math.max(0, state.currentDeviationDegrees - recoveryDegrees) * 100) / 100
              : state.currentDeviationDegrees,
            recoveryMissions: recovery
              ? state.recoveryMissions.map((mission) => mission.id === state.focusFlight?.recoveryMissionId
                ? { ...mission, status: 'completed' as const, completedAt: new Date().toISOString() }
                : mission)
              : state.recoveryMissions,
            flightMinutes: state.flightMinutes + state.focusFlight.durationMinutes,
            progress: {
              ...state.progress,
              experience,
              level: Math.floor(experience / 500) + 1,
              fuel: clampFuel(state.progress.fuel + recoveryFuel),
              totalFuelEarned: state.progress.totalFuelEarned + recoveryFuel,
            },
          }
        }),
      crashFocusFlight: () =>
        set((state) => state.focusFlight?.status === 'flying'
          ? { focusFlight: { ...state.focusFlight, status: 'crashed' } }
          : state),
      exitFocusFlight: () => set({ focusFlight: null }),
      clearFocusFlight: () => set({ focusFlight: null }),
      recordLanding: (result) =>
        set((state) => {
          const previousSuccessful = state.lastLanding?.cycle === result.cycle
            && (state.lastLanding.grade === 'centerline' || state.lastLanding.grade === 'safe')
          const successful = result.grade === 'centerline' || result.grade === 'safe'
          return {
            lastLanding: result,
            progress: {
              ...state.progress,
              successfulLandings: state.progress.successfulLandings + (successful && !previousSuccessful ? 1 : 0),
            },
          }
        }),
      selectAircraft: (id) => {
        const skin = skinById(id)
        if (get().progress.level >= skin.requiredLevel) set({ selectedAircraft: id })
      },
    }),
    {
      name: 'course-flight-journey-v2',
      version: 2,
      partialize: (state) => ({
        ...state,
        hydrated: false,
        // Per-session: a combo you left running yesterday is not one you are
        // still flying.
        gameCombo: 0,
        gameBestCombo: 0,
        pendingLevelUp: null,
      }),
      merge: (persistedState, currentState) => {
        const saved = persistedState as Partial<JourneyStoreState>
        const savedProgress = saved.progress
        const experience = savedProgress?.experience ?? 0
        return {
          ...currentState,
          ...saved,
          gameCombo: 0,
          gameBestCombo: 0,
          pendingLevelUp: null,
          progress: {
            ...DEFAULT_PROGRESS,
            ...savedProgress,
            experience,
            // Recomputed rather than trusted: profiles saved under the old
            // flat "every 500 XP" curve carry a level that no longer matches
            // their experience, and skins are gated on it.
            level: levelForExperience(experience),
            fuel: clampFuel(savedProgress?.fuel ?? STARTER_FUEL),
            totalFuelEarned: savedProgress?.totalFuelEarned ?? 0,
            successfulLandings: savedProgress?.successfulLandings ?? 0,
            ringsFlown: savedProgress?.ringsFlown ?? 0,
          },
          recoveryMissions: saved.recoveryMissions ?? [],
          lastLanding: saved.lastLanding ?? null,
        }
      },
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    },
  ),
)

export function selectActiveWeeks(state: JourneyStoreState): number {
  return activeWeekCount(state.records.map((record) => record.date))
}
