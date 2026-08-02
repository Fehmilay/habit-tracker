'use client'

import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { PerspectiveCamera, Vector3 } from 'three'
import {
  CAMERA_RIGS,
  CAMERA_TUNING,
  GLOBE_RIG,
  verticalFovForAspect,
} from '@/lib/flight/sceneConfig'
import { clamp, damp, degToRad, safeDelta } from '@/lib/flight/flightMath'
import { flightRuntime } from '@/lib/flight/flightRuntime'
import { useFlightStore } from '@/store/flightStore'

const UP_AXIS = new Vector3(0, 1, 0)

/** Mutable rig values interpolated between camera modes. */
interface RigState {
  offsetY: number
  offsetZ: number
  lookAtY: number
  lookAtZ: number
  fov: number
}

/**
 * Chase camera: behind and slightly above the aircraft.
 *
 * Three deliberate choices, all from the brief:
 *
 * - The camera is *not* parented to the aircraft. A rigid mount would copy the
 *   roll and yaw exactly, which tilts the horizon with every manoeuvre and is
 *   the classic recipe for motion sickness. Instead the camera tracks the
 *   aircraft's heading through its own damped filter.
 * - It copies only a fraction of the bank, so a turn feels sympathetic without
 *   throwing the horizon around.
 * - All smoothing is exponential and delta-time based, so the feel is identical
 *   at 30, 60 or 120fps.
 *
 * Because the camera's yaw converges on the aircraft's heading, a standing
 * deviation shows up exactly as the brief describes: the aircraft stays centred
 * and the world-anchored course line sits visibly off to one side.
 */
export function ChaseCamera() {
  const cameraMode = useFlightStore((state) => state.cameraMode)

  const yawRef = useRef(flightRuntime.currentHeadingDegrees)
  const rigRef = useRef<RigState>({
    offsetY: CAMERA_RIGS.chase.offset.y,
    offsetZ: CAMERA_RIGS.chase.offset.z,
    lookAtY: CAMERA_RIGS.chase.lookAt.y,
    lookAtZ: CAMERA_RIGS.chase.lookAt.z,
    fov: CAMERA_RIGS.chase.vFovLandscape,
  })
  const desiredPosition = useRef(new Vector3())
  const desiredLookAt = useRef(new Vector3())
  const currentLookAt = useRef(new Vector3())
  const globePosition = useRef(new Vector3())
  const globeLookAt = useRef(new Vector3())
  const initialisedRef = useRef(false)

  useFrame((state, delta) => {
    const dt = safeDelta(delta)
    // Taken from the frame state rather than captured during render, so the
    // camera is only ever touched inside the render loop that owns it.
    const camera = state.camera
    if (dt === 0 || !(camera instanceof PerspectiveCamera)) return

    const rig = rigRef.current
    const target = CAMERA_RIGS[cameraMode]
    const snap = !initialisedRef.current

    // Ease between camera modes rather than cutting - the brief rules out
    // abrupt changes of shot.
    const rigLambda = CAMERA_TUNING.rigLambda
    rigRef.current.offsetY = snap
      ? target.offset.y
      : damp(rig.offsetY, target.offset.y, rigLambda, dt)
    rigRef.current.offsetZ = snap
      ? target.offset.z
      : damp(rig.offsetZ, target.offset.z, rigLambda, dt)
    rigRef.current.lookAtY = snap
      ? target.lookAt.y
      : damp(rig.lookAtY, target.lookAt.y, rigLambda, dt)
    rigRef.current.lookAtZ = snap
      ? target.lookAt.z
      : damp(rig.lookAtZ, target.lookAt.z, rigLambda, dt)
    // Framing is resolved against the live aspect ratio, so the aircraft is the
    // same size on a tall phone as on a desktop window.
    const targetFov = verticalFovForAspect(target, camera.aspect)
    rigRef.current.fov = snap ? targetFov : damp(rig.fov, targetFov, rigLambda, dt)
    const globeFov = verticalFovForAspect(GLOBE_RIG, camera.aspect)

    // The camera's own heading lags the aircraft's, which is what makes a turn
    // read as the aircraft swinging away and the camera catching up.
    yawRef.current = snap
      ? flightRuntime.currentHeadingDegrees
      : damp(
          yawRef.current,
          flightRuntime.currentHeadingDegrees,
          CAMERA_TUNING.yawLambda,
          dt,
        )
    const rigOffsetY = rigRef.current.offsetY
    const rigOffsetZ = rigRef.current.offsetZ
    const rigLookAtY = rigRef.current.lookAtY
    const rigLookAtZ = rigRef.current.lookAtZ

    const yawRad = -degToRad(yawRef.current)

    // Eased 0..1 amount the view has pulled back to the globe, smoothed once
    // already by FlightDriver so a jumpy gesture never produces a jumpy camera.
    const globeBlend = smoothstep01(flightRuntime.zoomOut)

    // The aircraft only ever bobs vertically; following a fraction of that
    // keeps the shot alive without letting the horizon breathe. Fades out with
    // the globe blend so the pulled-back view holds still.
    const aircraftY = flightRuntime.verticalOffset * 0.3 * (1 - globeBlend)

    desiredPosition.current
      .set(0, rigOffsetY, rigOffsetZ)
      .applyAxisAngle(UP_AXIS, yawRad)
      .setY(rigOffsetY + aircraftY)

    desiredLookAt.current
      .set(0, rigLookAtY, rigLookAtZ)
      .applyAxisAngle(UP_AXIS, yawRad)
      .setY(rigLookAtY + aircraftY)

    if (globeBlend > 0.0005) {
      // The globe rig deliberately does NOT rotate with the aircraft's yaw:
      // the globe sits at a fixed point in world space (see sceneConfig.GLOBE),
      // so a camera that kept turning with the aircraft while zoomed out would
      // swing the whole Earth across the frame on every course change.
      desiredPosition.current.lerp(
        globePosition.current.set(GLOBE_RIG.offset.x, GLOBE_RIG.offset.y, GLOBE_RIG.offset.z),
        globeBlend,
      )
      desiredLookAt.current.lerp(
        globeLookAt.current.set(GLOBE_RIG.lookAt.x, GLOBE_RIG.lookAt.y, GLOBE_RIG.lookAt.z),
        globeBlend,
      )
    }

    if (snap) {
      camera.position.copy(desiredPosition.current)
      currentLookAt.current.copy(desiredLookAt.current)
      initialisedRef.current = true
    } else {
      const positionLambda = CAMERA_TUNING.positionLambda
      camera.position.set(
        damp(camera.position.x, desiredPosition.current.x, positionLambda, dt),
        damp(camera.position.y, desiredPosition.current.y, positionLambda, dt),
        damp(camera.position.z, desiredPosition.current.z, positionLambda, dt),
      )

      const lookLambda = CAMERA_TUNING.lookAtLambda
      currentLookAt.current.set(
        damp(currentLookAt.current.x, desiredLookAt.current.x, lookLambda, dt),
        damp(currentLookAt.current.y, desiredLookAt.current.y, lookLambda, dt),
        damp(currentLookAt.current.z, desiredLookAt.current.z, lookLambda, dt),
      )
    }

    camera.lookAt(currentLookAt.current)

    // Partial bank, applied after lookAt so it rolls about the view axis. Fades
    // out with the globe blend - a levelled-off view of the whole planet
    // should never bank with the aircraft's own manoeuvres.
    const roll =
      clamp(
        flightRuntime.currentRollDegrees * CAMERA_TUNING.rollFollow,
        -CAMERA_TUNING.maxRollDegrees,
        CAMERA_TUNING.maxRollDegrees,
      ) * (1 - globeBlend)
    camera.rotateZ(-degToRad(roll))

    const nextFov = rigRef.current.fov + (globeFov - rigRef.current.fov) * globeBlend
    if (Math.abs(camera.fov - nextFov) > 0.001) {
      camera.fov = nextFov
      camera.updateProjectionMatrix()
    }
  })

  return null
}

/** Cubic smoothstep, used to ease the globe blend rather than lerp it linearly. */
function smoothstep01(value: number): number {
  const t = Math.min(1, Math.max(0, value))
  return t * t * (3 - 2 * t)
}
