'use client'

import { useFrame } from '@react-three/fiber'
import {
  pitchForState,
  stepFlightDynamics,
  verticalBob,
} from '@/lib/flight/flightDynamics'
import { safeDelta } from '@/lib/flight/flightMath'
import { damp } from '@/lib/flight/flightMath'
import { gameRuntime } from '@/lib/game/gameRuntime'
import { flightRuntime } from '@/lib/flight/flightRuntime'
import { useFlightStore } from '@/store/flightStore'
import { useJourneyStore } from '@/store/journeyStore'

interface FlightDriverProps {
  /** 0 disables idle motion entirely, for prefers-reduced-motion. */
  ambientMotion: number
}

/**
 * The single owner of the flight integration.
 *
 * Renders nothing. It exists so that heading, roll and pitch are advanced
 * exactly once per frame, in one place, before anything reads them - the
 * aircraft mesh, the camera and the HUD are all pure consumers of the result.
 * Splitting the integration across those consumers would let them drift a frame
 * apart and make the aircraft appear to lag its own course readout.
 */
export function FlightDriver({ ambientMotion }: FlightDriverProps) {
  const targetHeadingDegrees = useFlightStore((state) => state.targetHeadingDegrees)
  const zoomTarget = useFlightStore((state) => state.zoomTarget)
  const gameMode = useJourneyStore((state) => state.gameMode)

  useFrame((_state, delta) => {
    const dt = safeDelta(delta)
    if (dt === 0) return

    flightRuntime.elapsedSeconds += dt
    flightRuntime.ambientMotion = ambientMotion

    // Smoothed before the early return so a mid-gesture mode switch (e.g. into
    // the habit-flight mini-game) can't freeze the globe transition half-way.
    flightRuntime.zoomOut = damp(flightRuntime.zoomOut, zoomTarget, 3.2, dt)

    if (gameMode === 'playing') {
      gameRuntime.planeX = damp(gameRuntime.planeX, gameRuntime.inputX * 6.4, 5.5, dt)
      gameRuntime.planeY = damp(gameRuntime.planeY, gameRuntime.inputY * 4.2, 5.5, dt)
      flightRuntime.targetRollDegrees = gameRuntime.inputX * 24
      flightRuntime.currentRollDegrees = damp(
        flightRuntime.currentRollDegrees,
        flightRuntime.targetRollDegrees,
        6,
        dt,
      )
      flightRuntime.currentPitchDegrees = damp(
        flightRuntime.currentPitchDegrees,
        gameRuntime.inputY * 8,
        5,
        dt,
      )
      flightRuntime.verticalOffset = gameRuntime.planeY
      return
    }

    stepFlightDynamics(flightRuntime, targetHeadingDegrees, dt)

    flightRuntime.currentPitchDegrees = pitchForState(
      flightRuntime,
      flightRuntime.elapsedSeconds,
      ambientMotion,
    )
    flightRuntime.verticalOffset = verticalBob(
      flightRuntime.elapsedSeconds,
      ambientMotion,
    )
  })

  return null
}
