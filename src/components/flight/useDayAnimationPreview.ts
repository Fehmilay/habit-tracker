'use client'

import { useCallback, useEffect, useRef } from 'react'
import { DEMO_DAY_EVENTS } from '@/lib/flight/demoJourney'
import { useFlightStore } from '@/store/flightStore'

/**
 * Phase 1 preview of the end-of-day sequence.
 *
 * Scope note: this covers only storyboard phases 1-4 from the brief - the
 * transition, the task events, the aircraft reacting, and the new course. The
 * later phases (kilometre miss distance, personal goal projection, the map
 * interlude and the recovery hint) need the great-circle and goal-projection
 * maths that Phases 4 and 5 introduce, so they are deliberately absent rather
 * than faked with invented numbers.
 *
 * The deviation applied here is the plain sum of the demo events. The real
 * rule - today's completed tasks recover yesterday's deviation before today's
 * misses are added - is Phase 2 work and is not implemented yet.
 */

const EVENT_INTERVAL_MS = 900
const TRANSITION_MS = 500
const REACTION_MS = 2100
const RESULT_MS = 1700

export interface DayAnimationPreview {
  start: () => void
  skip: () => void
}

export function useDayAnimationPreview(): DayAnimationPreview {
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([])

  const clearTimers = useCallback(() => {
    for (const timer of timers.current) clearTimeout(timer)
    timers.current = []
  }, [])

  const schedule = useCallback((delay: number, action: () => void) => {
    timers.current.push(setTimeout(action, delay))
  }, [])

  const finish = useCallback(() => {
    const store = useFlightStore.getState()
    store.setAnimationPhase('idle')
    store.setCameraMode('chase')
    store.setActiveEventIndex(-1)
    store.setSequenceRunning(false)
  }, [])

  const skip = useCallback(() => {
    clearTimers()

    // Skipping jumps to the end state rather than cancelling it - the course
    // change has been decided, only the presentation is being cut short.
    const store = useFlightStore.getState()
    const total = DEMO_DAY_EVENTS.reduce((sum, event) => sum + event.degrees, 0)
    if (store.sequenceRunning && store.animationPhase !== 'result') {
      store.addDeviation(total)
    }
    finish()
  }, [clearTimers, finish])

  const start = useCallback(() => {
    const store = useFlightStore.getState()
    if (store.sequenceRunning) return

    clearTimers()
    store.setSequenceRunning(true)
    store.setActiveEventIndex(-1)

    // Phase 1: transition. HUD steps back, camera moves in closer.
    store.setAnimationPhase('transition')
    store.setCameraMode('closeup')

    // Phase 2: reveal each task result in turn.
    let elapsed = TRANSITION_MS
    schedule(elapsed, () => {
      useFlightStore.getState().setAnimationPhase('events')
    })

    DEMO_DAY_EVENTS.forEach((_event, index) => {
      schedule(elapsed + index * EVENT_INTERVAL_MS, () => {
        useFlightStore.getState().setActiveEventIndex(index)
      })
    })
    elapsed += DEMO_DAY_EVENTS.length * EVENT_INTERVAL_MS

    // Phase 3: the aircraft actually manoeuvres. The dynamics model owns the
    // motion, so the roll and heading always match the number on screen.
    schedule(elapsed, () => {
      const current = useFlightStore.getState()
      current.setAnimationPhase('reacting')
      const total = DEMO_DAY_EVENTS.reduce((sum, event) => sum + event.degrees, 0)
      current.addDeviation(total)
    })
    elapsed += REACTION_MS

    // Phase 4: settle on the new course, camera eases back out.
    schedule(elapsed, () => {
      const current = useFlightStore.getState()
      current.setAnimationPhase('result')
      current.setCameraMode('wide')
    })
    elapsed += RESULT_MS

    schedule(elapsed, finish)
  }, [clearTimers, finish, schedule])

  useEffect(() => clearTimers, [clearTimers])

  return { start, skip }
}
