'use client'

import { useFrame } from '@react-three/fiber'
import {
  pitchForState,
  stepFlightDynamics,
  verticalBob,
} from '@/lib/flight/flightDynamics'
import { damageFromCourse } from '@/lib/flight/damage'
import { damp, safeDelta } from '@/lib/flight/flightMath'
import { gameRuntime } from '@/lib/game/gameRuntime'
import { flightRuntime } from '@/lib/flight/flightRuntime'
import { useFlightStore } from '@/store/flightStore'

interface FlightDriverProps {
  /** 0 disables idle motion entirely, for prefers-reduced-motion. */
  ambientMotion: number
  /** Whether the player's steering input should move the aircraft. */
  steeringActive: boolean
  /** 0..1 share of recently rated habits that were missed. */
  missRate: number
}

/** How far steering can push the aircraft off the camera's centreline. */
const STEER_RANGE_X = 6.4
const STEER_RANGE_Y = 4.2
/** Bank angle at full stick deflection. */
const STEER_ROLL_DEGREES = 20

/**
 * The single owner of the flight integration.
 *
 * Renders nothing. It exists so that heading, roll and pitch are advanced
 * exactly once per frame, in one place, before anything reads them - the
 * aircraft mesh, the camera and the HUD are all pure consumers of the result.
 * Splitting the integration across those consumers would let them drift a frame
 * apart and make the aircraft appear to lag its own course readout.
 *
 * Steering is applied *on top of* the course model rather than replacing it.
 * The course heading is the app's meaning - it is what the deviation readout,
 * the course line and the damage all key off - so flying the ring game must
 * not overwrite it. The player nudges the aircraft around within the shot; the
 * course underneath it keeps being whatever their habits made it.
 */
export function FlightDriver({ ambientMotion, steeringActive, missRate }: FlightDriverProps) {
  const targetHeadingDegrees = useFlightStore((state) => state.targetHeadingDegrees)
  const zoomTarget = useFlightStore((state) => state.zoomTarget)
  const plannedHeadingDegrees = useFlightStore((state) => state.plannedHeadingDegrees)

  useFrame((_state, delta) => {
    const dt = safeDelta(delta)
    if (dt === 0) return

    flightRuntime.elapsedSeconds += dt
    flightRuntime.ambientMotion = ambientMotion
    flightRuntime.zoomOut = damp(flightRuntime.zoomOut, zoomTarget, 3.2, dt)

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

    // Steering: eased toward the stick, and eased back to centre when the
    // player lets go or the controls are handed to something else.
    const inputX = steeringActive ? gameRuntime.inputX : 0
    const inputY = steeringActive ? gameRuntime.inputY : 0
    gameRuntime.planeX = damp(gameRuntime.planeX, inputX * STEER_RANGE_X, 5.5, dt)
    gameRuntime.planeY = damp(gameRuntime.planeY, inputY * STEER_RANGE_Y, 5.5, dt)
    flightRuntime.steerRollDegrees = damp(
      flightRuntime.steerRollDegrees,
      inputX * STEER_ROLL_DEGREES,
      6,
      dt,
    )

    // Damage tracks the *live* heading rather than the settled target, so the
    // aircraft visibly starts smoking during the turn that puts it off course,
    // not a second later.
    const deviation = flightRuntime.currentHeadingDegrees - plannedHeadingDegrees
    const target = damageFromCourse(deviation, missRate).severity
    // Damage builds faster than it clears: falling apart should feel immediate,
    // recovering should feel earned.
    const lambda = target > flightRuntime.damageSeverity ? 1.6 : 0.6
    flightRuntime.damageSeverity = damp(flightRuntime.damageSeverity, target, lambda, dt)
  })

  return null
}
