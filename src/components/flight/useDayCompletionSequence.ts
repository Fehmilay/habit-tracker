'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { DailyFlightRecord } from '@/lib/journey/types'
import { useFlightStore } from '@/store/flightStore'

const EVENT_INTERVAL_MS = 680
const TRANSITION_MS = 420
const REACTION_MS = 2100
const RESULT_MS = 1450
const STREAK_MS = 1800
const PROJECTION_MS = 1900

export function useDayCompletionSequence() {
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([])
  const activeRecord = useRef<DailyFlightRecord | null>(null)

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout)
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
    activeRecord.current = null
  }, [])

  const skip = useCallback(() => {
    clearTimers()
    const record = activeRecord.current
    if (record) useFlightStore.getState().setTargetDeviation(record.finalDeviationDegrees)
    finish()
  }, [clearTimers, finish])

  const start = useCallback((record: DailyFlightRecord) => {
    const store = useFlightStore.getState()
    if (store.sequenceRunning) return
    activeRecord.current = record
    clearTimers()
    store.setSequenceRunning(true)
    store.setActiveEventIndex(-1)
    store.setAnimationPhase('transition')
    store.setCameraMode('closeup')

    let elapsed = TRANSITION_MS
    schedule(elapsed, () => useFlightStore.getState().setAnimationPhase('events'))
    record.events.forEach((_event, index) => {
      schedule(elapsed + index * EVENT_INTERVAL_MS, () => useFlightStore.getState().setActiveEventIndex(index))
    })
    elapsed += Math.max(1, record.events.length) * EVENT_INTERVAL_MS
    schedule(elapsed, () => {
      const current = useFlightStore.getState()
      current.setAnimationPhase('reacting')
      current.setTargetDeviation(record.finalDeviationDegrees)
    })
    elapsed += REACTION_MS
    schedule(elapsed, () => {
      const current = useFlightStore.getState()
      current.setAnimationPhase('result')
      current.setCameraMode('wide')
    })
    elapsed += RESULT_MS
    // The chain lands between the course result and the forecast on purpose:
    // the course figure is what the day cost, the chain is what it bought, and
    // the forecast only makes sense once both are on screen.
    schedule(elapsed, () => useFlightStore.getState().setAnimationPhase('streak'))
    elapsed += STREAK_MS
    schedule(elapsed, () => useFlightStore.getState().setAnimationPhase('projection'))
    elapsed += PROJECTION_MS
    schedule(elapsed, finish)
  }, [clearTimers, finish, schedule])

  useEffect(() => clearTimers, [clearTimers])
  return { start, skip }
}

