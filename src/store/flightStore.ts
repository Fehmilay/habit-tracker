'use client'

import { create } from 'zustand'
import { clamp, roundTo } from '@/lib/flight/flightMath'
import { DEMO_JOURNEY } from '@/lib/flight/demoJourney'
import { flightRuntime, resetFlightRuntime } from '@/lib/flight/flightRuntime'

/** Storyboard phases of the end-of-day sequence. */
export type AnimationPhase =
  | 'idle'
  | 'transition'
  | 'events'
  | 'reacting'
  | 'result'
  | 'projection'

export type CameraMode = 'chase' | 'closeup' | 'wide'

/** Deviation is capped at the value the brief specifies for the course logic. */
export const MAX_DEVIATION_DEGREES = 15

export interface FlightStoreState {
  /** Reference course the line is drawn along. Deviation is measured from it. */
  plannedHeadingDegrees: number
  /** Heading the aircraft is flying toward. The dynamics model chases this. */
  targetHeadingDegrees: number

  animationPhase: AnimationPhase
  cameraMode: CameraMode

  /** Symbolic cruise speed, drives environment and course-line scroll. */
  speed: number
  remainingDistanceKm: number

  dayIndex: number
  totalDays: number
  goalProjectionPercent: number

  /** Index into the demo event list while the preview sequence plays. */
  activeEventIndex: number
  sequenceRunning: boolean

  /**
   * Raw 0..1 "zoomed out to the globe" target, set directly by the wheel or
   * pinch gesture. `FlightDriver` smooths this into `flightRuntime.zoomOut`
   * every frame; nothing renders off this raw value directly.
   */
  zoomTarget: number

  setTargetDeviation: (degrees: number) => void
  addDeviation: (degrees: number) => void
  resetCourse: () => void
  setAnimationPhase: (phase: AnimationPhase) => void
  setCameraMode: (mode: CameraMode) => void
  setActiveEventIndex: (index: number) => void
  setSequenceRunning: (running: boolean) => void
  setZoomTarget: (value: number) => void
  nudgeZoomTarget: (delta: number) => void
  /** Hard reset used by the dev controls and when the scene remounts. */
  resetScene: () => void
}

export const useFlightStore = create<FlightStoreState>((set, get) => ({
  plannedHeadingDegrees: 0,
  targetHeadingDegrees: 0,

  animationPhase: 'idle',
  cameraMode: 'chase',

  speed: 42,
  remainingDistanceKm: DEMO_JOURNEY.remainingDistanceKm,

  dayIndex: DEMO_JOURNEY.dayIndex,
  totalDays: DEMO_JOURNEY.totalDays,
  goalProjectionPercent: DEMO_JOURNEY.goalProjectionPercent,

  activeEventIndex: -1,
  sequenceRunning: false,

  zoomTarget: 0,

  setTargetDeviation: (degrees) => {
    const { plannedHeadingDegrees } = get()
    const bounded = clamp(
      roundTo(degrees, 2),
      -MAX_DEVIATION_DEGREES,
      MAX_DEVIATION_DEGREES,
    )
    set({ targetHeadingDegrees: plannedHeadingDegrees + bounded })
  },

  addDeviation: (degrees) => {
    const { plannedHeadingDegrees, targetHeadingDegrees } = get()
    const current = targetHeadingDegrees - plannedHeadingDegrees
    get().setTargetDeviation(current + degrees)
  },

  resetCourse: () => {
    get().setTargetDeviation(0)
  },

  setAnimationPhase: (animationPhase) => set({ animationPhase }),
  setCameraMode: (cameraMode) => set({ cameraMode }),
  setActiveEventIndex: (activeEventIndex) => set({ activeEventIndex }),
  setSequenceRunning: (sequenceRunning) => set({ sequenceRunning }),

  setZoomTarget: (value) => set({ zoomTarget: clamp(value, 0, 1) }),
  nudgeZoomTarget: (delta) => set((state) => ({ zoomTarget: clamp(state.zoomTarget + delta, 0, 1) })),

  resetScene: () => {
    const { plannedHeadingDegrees } = get()
    resetFlightRuntime(plannedHeadingDegrees)
    set({
      targetHeadingDegrees: plannedHeadingDegrees,
      animationPhase: 'idle',
      cameraMode: 'chase',
      activeEventIndex: -1,
      sequenceRunning: false,
      zoomTarget: 0,
    })
  },
}))

/** Deviation the store is currently steering toward, in degrees. */
export function selectTargetDeviation(state: FlightStoreState): number {
  return state.targetHeadingDegrees - state.plannedHeadingDegrees
}

/**
 * The full `FlightState` shape from the brief, assembled on demand.
 *
 * The live per-frame values come from the runtime rather than the store; this
 * function is the single place that joins the two halves back together for
 * anything that wants a complete snapshot (debug overlays, future tests).
 */
export interface FlightStateSnapshot {
  targetHeadingDegrees: number
  currentHeadingDegrees: number
  targetRollDegrees: number
  currentRollDegrees: number
  deviationDegrees: number
  animationPhase: AnimationPhase
  cameraMode: CameraMode
  speed: number
  remainingDistanceKm: number
}

export function readFlightState(): FlightStateSnapshot {
  const store = useFlightStore.getState()
  return {
    targetHeadingDegrees: store.targetHeadingDegrees,
    currentHeadingDegrees: flightRuntime.currentHeadingDegrees,
    targetRollDegrees: flightRuntime.targetRollDegrees,
    currentRollDegrees: flightRuntime.currentRollDegrees,
    deviationDegrees:
      flightRuntime.currentHeadingDegrees - store.plannedHeadingDegrees,
    animationPhase: store.animationPhase,
    cameraMode: store.cameraMode,
    speed: store.speed,
    remainingDistanceKm: store.remainingDistanceKm,
  }
}
