'use client'

import { useFrame } from '@react-three/fiber'
import {
  pitchForState,
  stepFlightDynamics,
  verticalBob,
} from '@/lib/flight/flightDynamics'
import { safeDelta } from '@/lib/flight/flightMath'
import { flightRuntime } from '@/lib/flight/flightRuntime'
import { useFlightStore } from '@/store/flightStore'

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

  useFrame((_state, delta) => {
    const dt = safeDelta(delta)
    if (dt === 0) return

    flightRuntime.elapsedSeconds += dt
    flightRuntime.ambientMotion = ambientMotion

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
