'use client'

import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import {
  clampReserve,
  RECOVERY_RESERVE_REWARD,
  RESERVE_PER_FREEZE,
  reserveEarnedForStatuses,
  STARTER_RESERVE,
} from '@/lib/game/economy'
import {
  experienceForRing,
  levelForExperience,
  skinById,
} from '@/lib/game/progression'
import { newlyEarned, type AchievementStats } from '@/lib/game/achievements'
import { DEFAULT_HABITS, DEFAULT_JOURNEY, DEFAULT_SETTINGS } from '@/lib/journey/defaults'
import { calculateDailyDeviation } from '@/lib/journey/deviation'
import { activeWeekCount, addDays, daysBetween, isHabitDue, localDateKey } from '@/lib/journey/date'
import { daysOnCourse } from '@/lib/journey/history'
import { crossTrackDistanceKm } from '@/lib/journey/projection'
import { computeStreak, gapDaysBefore, type StreakState } from '@/lib/journey/streak'
import { arrivalForecast } from '@/lib/flight/instruments'
import type {
  AircraftId,
  AppSettings,
  CycleLandingResult,
  DailyFlightRecord,
  FocusFlight,
  HabitGameProgress,
  Habit,
  HabitStatus,
  JourneyGoal,
  RecoveryMission,
  ReturnSummary,
} from '@/lib/journey/types'

export const STORAGE_KEY = 'course-flight-journey-v2'
export const STORAGE_VERSION = 3

/**
 * Local storage, written at most a few times a second.
 *
 * `registerGameRing` runs from inside the render loop and writes to this store
 * every time a ring passes the aircraft - roughly every four seconds, forever,
 * for as long as the flight page is open. zustand's persist middleware
 * serialises and writes the *entire* profile on every `set`, and
 * `localStorage.setItem` is synchronous and blocks the main thread, so an
 * uncoalesced write there is a frame hitch on a schedule.
 *
 * Coalescing them costs nothing in durability as long as anything pending is
 * flushed when the page goes away, which is what the pagehide/visibility
 * listeners below are for.
 */
const WRITE_DELAY_MS = 400

/** No-op storage for the server render, where there is nothing to persist to. */
const NOOP_STORAGE: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
}

function createDebouncedStorage(): StateStorage {
  if (typeof window === 'undefined') return NOOP_STORAGE

  let timer: number | null = null
  let pending: { name: string; value: string } | null = null

  const flush = () => {
    if (timer !== null) {
      window.clearTimeout(timer)
      timer = null
    }
    if (!pending) return
    try {
      window.localStorage.setItem(pending.name, pending.value)
    } catch {
      // A full or blocked storage must never take the flight down with it.
    }
    pending = null
  }

  window.addEventListener('pagehide', flush)
  window.addEventListener('beforeunload', flush)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
  })

  return {
    getItem: (name) => {
      // Read through the pending write, so a rehydrate that races a debounced
      // save never sees the older value.
      if (pending?.name === name) return pending.value
      try {
        return window.localStorage.getItem(name)
      } catch {
        return null
      }
    },
    setItem: (name, value) => {
      pending = { name, value }
      if (timer !== null) window.clearTimeout(timer)
      timer = window.setTimeout(flush, WRITE_DELAY_MS)
    },
    removeItem: (name) => {
      if (pending?.name === name) pending = null
      try {
        window.localStorage.removeItem(name)
      } catch {
        // Nothing to remove is a safe no-op.
      }
    },
  }
}

/** Payload of a data export. Versioned so an import can refuse a future file. */
export interface JourneySnapshot {
  app: 'flight-habit'
  version: number
  exportedAt: string
  journey: JourneyGoal
  habits: Habit[]
  records: DailyFlightRecord[]
  currentDeviationDegrees: number
  progress: HabitGameProgress
  settings: AppSettings
  streakFrozenDates: string[]
  unlockedAchievements: string[]
  recoveryMissions: RecoveryMission[]
  selectedAircraft: AircraftId
  flightMinutes: number
}

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
  /** False until someone has been through the setup flow at least once. */
  onboarded: boolean
  settings: AppSettings

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

  /** Active days rescued by spending reserve. Keeps the chain honest. */
  streakFrozenDates: string[]
  unlockedAchievements: string[]
  /** Queue the UI drains one card at a time. */
  pendingAchievements: string[]

  /** The day the drafts belong to. Anything older is thrown away. */
  draftsDate: string | null
  /** Last day the calendar was closed out, so the sweep runs once per day. */
  lastReconciledDate: string | null
  /** Set when the sweep filed days nobody answered for. UI clears it. */
  pendingReturn: ReturnSummary | null

  focusFlight: FocusFlight | null
  recoveryMissions: RecoveryMission[]
  lastLanding: CycleLandingResult | null

  setHydrated: (hydrated: boolean) => void
  initializeJourney: () => void
  updateJourney: (updates: Partial<JourneyGoal>) => void
  completeOnboarding: (setup: OnboardingSetup) => void
  updateSettings: (updates: Partial<AppSettings>) => void
  addHabit: (habit: Omit<Habit, 'id' | 'createdAt' | 'archived'>) => void
  updateHabit: (id: string, updates: Partial<Habit>) => void
  archiveHabit: (id: string) => void
  setDraftStatus: (habitId: string, status: HabitStatus) => void
  setAllDrafts: (status: HabitStatus) => void
  clearDrafts: () => void
  completeToday: (dateKey?: string) => DailyFlightRecord | null
  /** Close out every unanswered day and throw away stale drafts. */
  reconcileCalendar: () => void
  clearReturnSummary: () => void
  backfillDay: (dateKey: string, statuses: Record<string, HabitStatus>) => DailyFlightRecord | null
  importLegacyHabits: () => number

  registerGameRing: (hit: boolean) => void
  clearLevelUp: () => void
  evaluateAchievements: () => void
  dismissAchievement: (id: string) => void
  startFocusFlight: (habit: Habit) => void
  startRecoveryFlight: (missionId: string) => void
  setFocusHiddenAt: (hiddenAt: number | null) => void
  landFocusFlight: () => void
  crashFocusFlight: () => void
  exitFocusFlight: () => void
  clearFocusFlight: () => void
  recordLanding: (result: CycleLandingResult) => void
  selectAircraft: (id: AircraftId) => void

  exportSnapshot: () => JourneySnapshot
  importSnapshot: (snapshot: unknown) => boolean
  resetEverything: () => void
}

export interface OnboardingSetup {
  journey: Partial<JourneyGoal>
  habits: Array<Omit<Habit, 'id' | 'createdAt' | 'archived'>>
  settings?: Partial<AppSettings>
}

/** Days a comeback mission stays redeemable after the day it came from. */
export const RECOVERY_WINDOW_DAYS = 3

const DEFAULT_PROGRESS: HabitGameProgress = {
  experience: 0,
  level: 1,
  bestCombo: 0,
  reserve: STARTER_RESERVE,
  totalReserveEarned: 0,
  successfulLandings: 0,
  ringsFlown: 0,
  recoveriesCompleted: 0,
}

function makeId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

/**
 * Everything the achievement predicates need, assembled from the live state.
 *
 * Built here rather than inside the achievement module so that module stays a
 * pure list of rules with no idea the store exists.
 */
function achievementStatsFor(state: JourneyStoreState, streak: StreakState): AchievementStats {
  const forecast = arrivalForecast(state.journey, state.records)
  return {
    streakCurrent: streak.current,
    streakBest: streak.best,
    checkInDays: state.records.length,
    perfectDays: streak.perfectDays,
    focusMinutes: state.flightMinutes,
    ringsFlown: state.progress.ringsFlown,
    successfulLandings: state.progress.successfulLandings,
    recoveriesCompleted: state.progress.recoveriesCompleted,
    distanceFlownKm: forecast.distanceFlownKm,
    level: state.progress.level,
    daysOnCourse: daysOnCourse(state.records),
  }
}

function buildRecord(
  state: JourneyStoreState,
  dateKey: string,
  dueHabits: Habit[],
  statuses: Record<string, HabitStatus>,
  backfilled: boolean,
): DailyFlightRecord {
  const outcome = calculateDailyDeviation(state.currentDeviationDegrees, dueHabits, statuses)
  return {
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
    reserveEarned: reserveEarnedForStatuses(statuses),
    backfilled: backfilled || undefined,
    completedAt: new Date().toISOString(),
  }
}

function recoveryMissionsFor(
  dateKey: string,
  dueHabits: Habit[],
  statuses: Record<string, HabitStatus>,
): RecoveryMission[] {
  return dueHabits
    .filter((habit) => statuses[habit.id] === 'missed')
    .map<RecoveryMission>((habit) => ({
      id: `recovery-${dateKey}-${habit.id}`,
      sourceDate: dateKey,
      habitId: habit.id,
      habitName: habit.name,
      habitIcon: habit.icon,
      actionLabel: habit.cue,
      durationMinutes: Math.max(
        5,
        Math.min(15, Math.ceil(((habit.durationMinutes ?? 25) / 3) / 5) * 5),
      ),
      recoveryDegrees: Math.round(Math.min(0.75, habit.impact * 0.5) * 100) / 100,
      status: 'available',
    }))
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
      onboarded: false,
      settings: DEFAULT_SETTINGS,

      gameCombo: 0,
      gameBestCombo: 0,
      progress: DEFAULT_PROGRESS,
      pendingLevelUp: null,

      streakFrozenDates: [],
      unlockedAchievements: [],
      pendingAchievements: [],

      draftsDate: null,
      lastReconciledDate: null,
      pendingReturn: null,

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

      /**
       * First run.
       *
       * Replaces the sample habits outright rather than appending to them. The
       * defaults exist so the very first frame of the app is not an empty
       * screen; keeping them afterwards would leave every new user rating
       * somebody else's gym schedule on day one.
       */
      completeOnboarding: (setup) =>
        set((state) => {
          const createdAt = new Date().toISOString()
          const habits = setup.habits.map<Habit>((habit) => ({
            ...habit,
            id: makeId('habit'),
            archived: false,
            createdAt,
          }))
          return {
            onboarded: true,
            hasStarted: true,
            habits: habits.length > 0 ? habits : state.habits,
            journey: { ...state.journey, ...setup.journey, startDate: localDateKey() },
            settings: { ...state.settings, ...setup.settings },
            records: [],
            drafts: {},
            draftsDate: null,
            lastReconciledDate: localDateKey(),
            pendingReturn: null,
            currentDeviationDegrees: 0,
            streakFrozenDates: [],
          }
        }),

      updateSettings: (updates) =>
        set((state) => ({ settings: { ...state.settings, ...updates } })),

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
          // Every draft write stamps the day it belongs to. Drafts are
          // persisted, so without the stamp a rating made at 23:58 and never
          // confirmed silently becomes tomorrow's answer.
          const draftsDate = localDateKey()
          if (state.drafts[habitId] !== status) {
            return { draftsDate, drafts: { ...state.drafts, [habitId]: status } }
          }
          const drafts = { ...state.drafts }
          delete drafts[habitId]
          return { draftsDate, drafts }
        }),

      /** One tap for the common "the whole day went to plan" case. */
      setAllDrafts: (status) =>
        set((state) => {
          const today = localDateKey()
          const drafts = { ...state.drafts }
          for (const habit of state.habits) {
            if (isHabitDue(habit, today)) drafts[habit.id] = status
          }
          return { draftsDate: today, drafts }
        }),

      clearDrafts: () => set({ drafts: {}, draftsDate: null }),

      completeToday: (dateKey = localDateKey()) => {
        const state = get()
        if (state.records.some((record) => record.date === dateKey)) return null

        const dueHabits = state.habits.filter((habit) => isHabitDue(habit, dateKey))
        if (dueHabits.length === 0 || dueHabits.some((habit) => !state.drafts[habit.id])) {
          return null
        }

        const statuses = Object.fromEntries(
          dueHabits.map((habit) => [habit.id, state.drafts[habit.id]]),
        )
        const record = buildRecord(state, dateKey, dueHabits, statuses, false)
        const reserveEarned = record.reserveEarned ?? 0
        const records = [...state.records, record].sort((a, b) => a.date.localeCompare(b.date))

        // Chain protection is settled before the streak is read, so the number
        // the check-in animation shows is already the post-freeze one.
        const freeze = applyFreezes(state, dateKey, reserveEarned)

        set({
          records,
          currentDeviationDegrees: record.finalDeviationDegrees,
          drafts: {},
          draftsDate: null,
          streakFrozenDates: freeze.frozenDates,
          recoveryMissions: [
            ...state.recoveryMissions,
            ...recoveryMissionsFor(dateKey, dueHabits, statuses),
          ],
          progress: {
            ...state.progress,
            reserve: freeze.reserve,
            totalReserveEarned: state.progress.totalReserveEarned + reserveEarned,
          },
        })
        get().evaluateAchievements()
        return record
      },

      /**
       * Close the calendar out.
       *
       * The single most important rule in this app used to be broken: doing
       * nothing was free. `completeToday` only ever wrote a record for a day
       * you explicitly confirmed, so someone who stopped opening the app added
       * 0° of course, kept a spotless aircraft and a 100% forecast, while
       * someone who honestly tapped "nicht erledigt" watched their plane catch
       * fire. The dominant strategy was to stop showing up - the exact
       * behaviour the product exists to prevent.
       *
       * So absence is now filed. Every due day nobody answered for is closed
       * out as missed, and the aircraft has visibly drifted by the time you
       * come back. Yesterday is deliberately spared: it stays open for the
       * one-day backfill, which is the difference between a tracker that is
       * strict and one that is unusable.
       */
      reconcileCalendar: () => {
        const state = get()
        if (!state.onboarded) return

        const today = localDateKey()
        // Drafts belong to the day they were made on, and they outlive it in
        // local storage.
        const staleDrafts = state.draftsDate !== null && state.draftsDate !== today
        if (state.lastReconciledDate === today && !staleDrafts) return

        const recorded = new Set(state.records.map((record) => record.date))
        // Yesterday is the grace day; the sweep stops the day before it.
        const lastClosable = addDays(today, -2)
        // Never reaches back past the last sweep. Without that floor, upgrading
        // an existing profile would retroactively close out months of days that
        // cost nothing under the old rules and slam the course to its cap - a
        // punishment for a change the user did not make.
        const afterLastRecord = state.records.at(-1)?.date
          ? addDays(state.records.at(-1)!.date, 1)
          : state.journey.startDate
        const begin = [afterLastRecord, state.lastReconciledDate]
          .filter((value): value is string => Boolean(value))
          .sort()
          .at(-1)!

        const filled: DailyFlightRecord[] = []
        let deviation = state.currentDeviationDegrees
        let cursor = begin
        let guard = 0

        while (cursor <= lastClosable && guard < 400) {
          guard += 1
          if (!recorded.has(cursor)) {
            const dueHabits = state.habits.filter((habit) => {
              if (cursor < habit.createdAt.slice(0, 10)) return false
              return isHabitDue(habit, cursor)
            })
            if (dueHabits.length > 0) {
              const statuses = Object.fromEntries(
                dueHabits.map((habit) => [habit.id, 'missed' as HabitStatus]),
              )
              const outcome = calculateDailyDeviation(deviation, dueHabits, statuses)
              deviation = outcome.finalDeviationDegrees
              filled.push({
                date: cursor,
                statuses,
                previousDeviationDegrees: outcome.previousDeviationDegrees,
                recoveredDegrees: outcome.recoveredDegrees,
                addedDegrees: outcome.addedDegrees,
                finalDeviationDegrees: outcome.finalDeviationDegrees,
                crossTrackKm: crossTrackDistanceKm(
                  state.journey.totalDistanceKm,
                  outcome.finalDeviationDegrees,
                ),
                completionRate: 0,
                events: outcome.events,
                reserveEarned: 0,
                autoMissed: true,
                completedAt: new Date().toISOString(),
              })
            }
          }
          cursor = addDays(cursor, 1)
        }

        // Comeback missions are a repair window, not a bank. Left open they
        // let someone sit at the 15-degree cap and grind months of old misses
        // back to zero, which would make the deviation number meaningless.
        const expiredMissions = state.recoveryMissions.map((mission) =>
          mission.status === 'available' && daysBetween(mission.sourceDate, today) > RECOVERY_WINDOW_DAYS
            ? { ...mission, status: 'expired' as const }
            : mission,
        )
        const prunedMissions = expiredMissions.filter(
          (mission) => mission.status === 'available' || daysBetween(mission.sourceDate, today) <= 60,
        )
        const missionsChanged =
          prunedMissions.length !== state.recoveryMissions.length ||
          prunedMissions.some((mission, index) => mission.status !== state.recoveryMissions[index]?.status)

        if (filled.length === 0) {
          set({
            lastReconciledDate: today,
            ...(missionsChanged ? { recoveryMissions: prunedMissions } : {}),
            ...(staleDrafts ? { drafts: {}, draftsDate: null } : {}),
          })
          return
        }

        const streakBefore = computeStreak({
          records: state.records,
          habits: state.habits,
          frozenDates: state.streakFrozenDates,
          journeyStartDate: state.journey.startDate,
          today: filled[0].date,
        }).current

        const records = [...state.records, ...filled].sort((a, b) =>
          a.date.localeCompare(b.date),
        )

        set({
          records,
          currentDeviationDegrees: deviation,
          lastReconciledDate: today,
          recoveryMissions: prunedMissions,
          drafts: staleDrafts ? {} : state.drafts,
          draftsDate: staleDrafts ? null : state.draftsDate,
          pendingReturn: {
            days: filled.map((record) => record.date),
            addedDegrees:
              Math.round((deviation - state.currentDeviationDegrees) * 100) / 100,
            streakBefore,
          },
        })
      },

      clearReturnSummary: () => set({ pendingReturn: null }),

      /**
       * File a day that was missed at the time.
       *
       * Restricted to yesterday by the UI. Anything further back would turn the
       * whole record into fiction, and the record is the only thing in this app
       * that is supposed to be true.
       */
      backfillDay: (dateKey, statuses) => {
        const state = get()
        if (state.records.some((record) => record.date === dateKey)) return null
        if (dateKey >= localDateKey()) return null

        const dueHabits = state.habits.filter((habit) => isHabitDue(habit, dateKey))
        if (dueHabits.length === 0) return null
        if (dueHabits.some((habit) => !statuses[habit.id])) return null

        const scoped = Object.fromEntries(dueHabits.map((habit) => [habit.id, statuses[habit.id]]))
        const record = buildRecord(state, dateKey, dueHabits, scoped, true)
        const records = [...state.records, record].sort((a, b) => a.date.localeCompare(b.date))

        // The live course only moves if this really is the most recent day.
        // Someone who files today and then remembers yesterday would otherwise
        // have yesterday's outcome applied on top of today's and end up with a
        // deviation that belongs to neither.
        const isLatest = records.at(-1)?.date === dateKey

        set({
          records,
          currentDeviationDegrees: isLatest
            ? record.finalDeviationDegrees
            : state.currentDeviationDegrees,
          // A backfilled day no longer needs a freeze holding it open.
          streakFrozenDates: state.streakFrozenDates.filter((date) => date !== dateKey),
          recoveryMissions: [
            ...state.recoveryMissions,
            ...recoveryMissionsFor(dateKey, dueHabits, scoped),
          ],
        })
        get().evaluateAchievements()
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

      /**
       * Grant every milestone the current state satisfies.
       *
       * Called after each event that can plausibly earn one - a check-in, a
       * backfill, a focus landing, a cycle landing - rather than on every
       * scored ring. A ring-count milestone therefore lands at the next of
       * those moments instead of mid-flight, which is the right trade: the
       * predicate is a full history scan, and interrupting a game with a card
       * every few seconds would be worse than a short wait.
       */
      evaluateAchievements: () => {
        const state = get()
        const streak = computeStreak({
          records: state.records,
          habits: state.habits,
          frozenDates: state.streakFrozenDates,
          journeyStartDate: state.journey.startDate,
        })
        const unlocked = newlyEarned(
          achievementStatsFor(state, streak),
          state.unlockedAchievements,
        )
        if (unlocked.length === 0) return
        set({
          unlockedAchievements: [...state.unlockedAchievements, ...unlocked],
          pendingAchievements: [...state.pendingAchievements, ...unlocked],
        })
      },
      dismissAchievement: (id) =>
        set((state) => ({
          pendingAchievements: state.pendingAchievements.filter((entry) => entry !== id),
        })),
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
      landFocusFlight: () => {
        set((state) => {
          if (!state.focusFlight || state.focusFlight.status !== 'flying') return state
          const recovery = state.focusFlight.kind === 'recovery'
          const earnedExperience = state.focusFlight.durationMinutes * 10
          const experience = state.progress.experience + earnedExperience
          const recoveryDegrees = recovery ? state.focusFlight.recoveryDegrees ?? 0 : 0
          const recoveryReserve = recovery ? RECOVERY_RESERVE_REWARD : 0
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
              level: levelForExperience(experience),
              reserve: clampReserve(state.progress.reserve + recoveryReserve),
              totalReserveEarned: state.progress.totalReserveEarned + recoveryReserve,
              recoveriesCompleted: state.progress.recoveriesCompleted + (recovery ? 1 : 0),
            },
          }
        })
        get().evaluateAchievements()
      },
      crashFocusFlight: () =>
        set((state) => state.focusFlight?.status === 'flying'
          ? { focusFlight: { ...state.focusFlight, status: 'crashed' } }
          : state),
      exitFocusFlight: () => set({ focusFlight: null }),
      clearFocusFlight: () => set({ focusFlight: null }),
      recordLanding: (result) => {
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
        })
        get().evaluateAchievements()
      },
      selectAircraft: (id) => {
        const skin = skinById(id)
        if (get().progress.level >= skin.requiredLevel) set({ selectedAircraft: id })
      },

      exportSnapshot: () => {
        const state = get()
        return {
          app: 'flight-habit',
          version: STORAGE_VERSION,
          exportedAt: new Date().toISOString(),
          journey: state.journey,
          habits: state.habits,
          records: state.records,
          currentDeviationDegrees: state.currentDeviationDegrees,
          progress: state.progress,
          settings: state.settings,
          streakFrozenDates: state.streakFrozenDates,
          unlockedAchievements: state.unlockedAchievements,
          recoveryMissions: state.recoveryMissions,
          selectedAircraft: state.selectedAircraft,
          flightMinutes: state.flightMinutes,
        }
      },

      /**
       * Restore a previously exported profile.
       *
       * Every field is validated rather than trusted: this is the one entry
       * point where arbitrary JSON from a file picker becomes application
       * state, and a malformed records array would otherwise turn every
       * projection in the app into NaN with no way back.
       */
      importSnapshot: (snapshot) => {
        const parsed = parseSnapshot(snapshot)
        if (!parsed) return false
        set({
          ...parsed,
          drafts: {},
          draftsDate: null,
          lastReconciledDate: null,
          pendingReturn: null,
          onboarded: true,
          hasStarted: true,
          pendingAchievements: [],
          pendingLevelUp: null,
          focusFlight: null,
          gameCombo: 0,
          gameBestCombo: 0,
        })
        return true
      },

      resetEverything: () =>
        set({
          journey: DEFAULT_JOURNEY,
          habits: DEFAULT_HABITS,
          drafts: {},
          records: [],
          currentDeviationDegrees: 0,
          selectedAircraft: 'trainer',
          flightMinutes: 0,
          hasStarted: false,
          onboarded: false,
          settings: DEFAULT_SETTINGS,
          gameCombo: 0,
          gameBestCombo: 0,
          progress: DEFAULT_PROGRESS,
          pendingLevelUp: null,
          streakFrozenDates: [],
          unlockedAchievements: [],
          pendingAchievements: [],
          draftsDate: null,
          lastReconciledDate: null,
          pendingReturn: null,
          focusFlight: null,
          recoveryMissions: [],
          lastLanding: null,
        }),
    }),
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
      storage: createJSONStorage(createDebouncedStorage),
      partialize: (state) => ({
        ...state,
        hydrated: false,
        // Per-session: a combo you left running yesterday is not one you are
        // still flying.
        gameCombo: 0,
        gameBestCombo: 0,
        pendingLevelUp: null,
        pendingAchievements: [],
        // A return card describes a sweep that already ran; replaying it on the
        // next launch would announce the same lost days twice.
        pendingReturn: null,
        // Never persisted mid-flight: a focus session restored on relaunch
        // would tick down against wall-clock time the app was not open for and
        // then auto-land, handing out a habit completion for time nobody spent.
        focusFlight: null,
      }),
      migrate: (persistedState, version) => {
        const saved = (persistedState ?? {}) as Record<string, unknown>
        if (version >= STORAGE_VERSION) return saved

        // v2 -> v3: the dead fuel meter became the reserve tank, records grew a
        // reserve field, and settings/onboarding did not exist at all. A
        // profile written before v3 has been played, so it is marked onboarded
        // rather than being sent back through a setup flow it already skipped.
        const progress = (saved.progress ?? {}) as Record<string, unknown>
        return {
          ...saved,
          onboarded: true,
          draftsDate: null,
          drafts: {},
          // Absence only starts costing from the upgrade onward.
          lastReconciledDate: localDateKey(),
          settings: { ...DEFAULT_SETTINGS, ...((saved.settings as object) ?? {}) },
          streakFrozenDates: saved.streakFrozenDates ?? [],
          unlockedAchievements: saved.unlockedAchievements ?? [],
          progress: {
            ...progress,
            reserve: progress.reserve ?? progress.fuel ?? STARTER_RESERVE,
            totalReserveEarned: progress.totalReserveEarned ?? progress.totalFuelEarned ?? 0,
            recoveriesCompleted: progress.recoveriesCompleted ?? 0,
          },
        }
      },
      merge: (persistedState, currentState) => {
        // `persistedState` is undefined on a first-ever launch, and zustand
        // calls `merge` anyway. Reading through it unguarded threw, which
        // rejected the rehydrate promise, which meant `onRehydrateStorage`
        // never ran and `hydrated` stayed false forever - so a brand new
        // install never called `initializeJourney` and sat on the hardcoded
        // sample start date instead of today's.
        const saved = (persistedState ?? {}) as Partial<JourneyStoreState>
        const savedProgress = saved.progress
        const experience = savedProgress?.experience ?? 0
        return {
          ...currentState,
          ...saved,
          gameCombo: 0,
          gameBestCombo: 0,
          pendingLevelUp: null,
          pendingAchievements: [],
          pendingReturn: null,
          focusFlight: null,
          settings: { ...DEFAULT_SETTINGS, ...saved.settings },
          progress: {
            ...DEFAULT_PROGRESS,
            ...savedProgress,
            experience,
            // Recomputed rather than trusted: profiles saved under the old
            // flat "every 500 XP" curve carry a level that no longer matches
            // their experience, and skins are gated on it.
            level: levelForExperience(experience),
            reserve: clampReserve(savedProgress?.reserve ?? STARTER_RESERVE),
            totalReserveEarned: savedProgress?.totalReserveEarned ?? 0,
            successfulLandings: savedProgress?.successfulLandings ?? 0,
            ringsFlown: savedProgress?.ringsFlown ?? 0,
            recoveriesCompleted: savedProgress?.recoveriesCompleted ?? 0,
          },
          records: (saved.records ?? []).slice().sort((a, b) => a.date.localeCompare(b.date)),
          streakFrozenDates: saved.streakFrozenDates ?? [],
          unlockedAchievements: saved.unlockedAchievements ?? [],
          recoveryMissions: saved.recoveryMissions ?? [],
          lastLanding: saved.lastLanding ?? null,
        }
      },
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    },
  ),
)

interface FreezeOutcome {
  reserve: number
  frozenDates: string[]
}

/**
 * Spend reserve to bridge the days between the last check-in and this one.
 *
 * Bounded to two days on purpose. A week away is a break, not a slip, and a
 * chain that survives a week off stops meaning anything - which would make the
 * one number people actually protect worthless.
 */
function applyFreezes(
  state: JourneyStoreState,
  dateKey: string,
  reserveEarned: number,
): FreezeOutcome {
  let reserve = clampReserve(state.progress.reserve + reserveEarned)
  const frozenDates = [...state.streakFrozenDates]

  if (!state.settings.autoFreeze) return { reserve, frozenDates }

  const gaps = gapDaysBefore(dateKey, {
    records: state.records,
    habits: state.habits,
    frozenDates: state.streakFrozenDates,
    journeyStartDate: state.journey.startDate,
  }, 2)
  if (gaps.length === 0) return { reserve, frozenDates }

  // Only spend on a chain there still is. The calendar sweep files everything
  // older than yesterday, so someone returning after a week arrives with the
  // chain already gone - paying 30% of the tank to bridge the one remaining
  // gap would buy nothing at all.
  const chainBeforeGap = computeStreak({
    records: state.records,
    habits: state.habits,
    frozenDates: state.streakFrozenDates,
    journeyStartDate: state.journey.startDate,
    today: addDays(gaps[gaps.length - 1], -1),
  }).current
  if (chainBeforeGap === 0) return { reserve, frozenDates }

  for (const gap of gaps.reverse()) {
    if (reserve < RESERVE_PER_FREEZE) break
    reserve -= RESERVE_PER_FREEZE
    frozenDates.push(gap)
  }

  return { reserve, frozenDates: [...new Set(frozenDates)].sort() }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseSnapshot(input: unknown): Partial<JourneyStoreState> | null {
  if (!isRecord(input)) return null
  if (input.app !== 'flight-habit') return null
  if (typeof input.version !== 'number' || input.version > STORAGE_VERSION) return null
  if (!isRecord(input.journey) || !Array.isArray(input.habits)) return null

  const habits = input.habits.filter(
    (habit): habit is Habit =>
      isRecord(habit) && typeof habit.id === 'string' && typeof habit.name === 'string',
  )
  const records = (Array.isArray(input.records) ? input.records : []).filter(
    (record): record is DailyFlightRecord =>
      isRecord(record) &&
      typeof record.date === 'string' &&
      record.date.length === 10 &&
      typeof record.completionRate === 'number' &&
      Number.isFinite(record.completionRate),
  )
  const progress = isRecord(input.progress) ? input.progress : {}
  const experience = typeof progress.experience === 'number' ? progress.experience : 0

  return {
    journey: { ...DEFAULT_JOURNEY, ...(input.journey as Partial<JourneyGoal>) },
    habits: habits.length > 0 ? habits : DEFAULT_HABITS,
    records: records.slice().sort((a, b) => a.date.localeCompare(b.date)),
    currentDeviationDegrees:
      typeof input.currentDeviationDegrees === 'number' && Number.isFinite(input.currentDeviationDegrees)
        ? input.currentDeviationDegrees
        : records.at(-1)?.finalDeviationDegrees ?? 0,
    progress: {
      ...DEFAULT_PROGRESS,
      ...(progress as Partial<HabitGameProgress>),
      experience,
      level: levelForExperience(experience),
      reserve: clampReserve(typeof progress.reserve === 'number' ? progress.reserve : STARTER_RESERVE),
    },
    settings: { ...DEFAULT_SETTINGS, ...(isRecord(input.settings) ? input.settings : {}) },
    streakFrozenDates: (Array.isArray(input.streakFrozenDates) ? input.streakFrozenDates : []).filter(
      (date): date is string => typeof date === 'string' && date.length === 10,
    ),
    unlockedAchievements: (Array.isArray(input.unlockedAchievements)
      ? input.unlockedAchievements
      : []).filter((id): id is string => typeof id === 'string'),
    recoveryMissions: (Array.isArray(input.recoveryMissions) ? input.recoveryMissions : []).filter(
      (mission): mission is RecoveryMission => isRecord(mission) && typeof mission.id === 'string',
    ),
    selectedAircraft:
      typeof input.selectedAircraft === 'string'
        ? (input.selectedAircraft as AircraftId)
        : 'trainer',
    flightMinutes:
      typeof input.flightMinutes === 'number' && Number.isFinite(input.flightMinutes)
        ? Math.max(0, Math.round(input.flightMinutes))
        : 0,
  }
}

export function selectActiveWeeks(state: JourneyStoreState): number {
  return activeWeekCount(state.records.map((record) => record.date))
}

/** The live chain, derived rather than stored. See `lib/journey/streak.ts`. */
export function selectStreak(state: JourneyStoreState): StreakState {
  return computeStreak({
    records: state.records,
    habits: state.habits,
    frozenDates: state.streakFrozenDates,
    journeyStartDate: state.journey.startDate,
  })
}

/** Yesterday, when it is an unrecorded active day that can still be filed. */
export function selectBackfillableDate(state: JourneyStoreState): string | null {
  const yesterday = addDays(localDateKey(), -1)
  if (state.records.some((record) => record.date === yesterday)) return null
  if (yesterday < state.journey.startDate) return null
  const due = state.habits.filter((habit) => isHabitDue(habit, yesterday))
  return due.length > 0 ? yesterday : null
}
