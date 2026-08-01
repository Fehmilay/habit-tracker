'use client'

import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  DoubleSide,
  type Group,
  type InstancedMesh,
  type Mesh,
  type Sprite,
} from 'three'
import { color } from '@/lib/design/tokens'
import {
  createCabinWindowMatrices,
  createCockpitWindowMatrices,
  createFuselageGeometry,
  createLiftingSurfaceGeometry,
  ENGINE_POSITIONS,
  FIN_PLANFORM,
  mirrorGeometryX,
  NACELLE_RADIUS,
  NAV_LIGHTS,
  STABILISER_PLANFORM,
  WING_PLANFORM,
  WINGLET_PLANFORM,
} from '@/lib/flight/aircraftGeometry'
import { degToRad } from '@/lib/flight/flightMath'
import { flightRuntime } from '@/lib/flight/flightRuntime'
import { gameRuntime } from '@/lib/game/gameRuntime'
import { createFanTexture, createGlowTexture } from '@/lib/flight/textures'
import { AIRCRAFT } from '@/lib/journey/defaults'
import { useJourneyStore } from '@/store/journeyStore'

const WING_DIHEDRAL = degToRad(5)
const STABILISER_DIHEDRAL = degToRad(7)
const WING_ANCHOR: [number, number, number] = [0, -0.24, -0.5]
const STABILISER_ANCHOR: [number, number, number] = [0, 0.66, 3.0]
const FIN_ANCHOR: [number, number, number] = [0, 0.5, 2.35]

interface Aircraft3DProps {
  /** Radial segments on the lathed fuselage; lowered on weak devices. */
  fuselageSegments: number
}

/**
 * The aircraft: a stylised twin-engine airliner assembled from Three.js
 * geometry.
 *
 * The component only *renders* the aircraft. Its attitude comes from the shared
 * flight runtime, which `FlightDriver` integrates once per frame - so the mesh,
 * the camera and the HUD readout can never disagree about where the nose is
 * pointing.
 */
export function Aircraft3D({ fuselageSegments }: Aircraft3DProps) {
  const selectedAircraft = useJourneyStore((state) => state.selectedAircraft)
  const gameMode = useJourneyStore((state) => state.gameMode)
  const aircraftAccent = AIRCRAFT.find((item) => item.id === selectedAircraft)?.accent ?? color.hullLight
  const groupRef = useRef<Group>(null)
  const cabinWindowsRef = useRef<InstancedMesh>(null)
  const cockpitWindowsRef = useRef<InstancedMesh>(null)
  const beaconRef = useRef<Sprite>(null)
  const fanRefs = useRef<Array<Mesh | null>>([])

  const fuselage = useMemo(
    () => createFuselageGeometry(fuselageSegments),
    [fuselageSegments],
  )

  const wing = useMemo(() => createLiftingSurfaceGeometry(WING_PLANFORM, 0.15, 0.075), [])
  const wingPort = useMemo(() => mirrorGeometryX(wing), [wing])

  const stabiliser = useMemo(
    () => createLiftingSurfaceGeometry(STABILISER_PLANFORM, 0.11, 0.035),
    [],
  )
  const stabiliserPort = useMemo(() => mirrorGeometryX(stabiliser), [stabiliser])

  const fin = useMemo(() => createLiftingSurfaceGeometry(FIN_PLANFORM, 0.16, 0.045), [])

  const winglet = useMemo(
    () => createLiftingSurfaceGeometry(WINGLET_PLANFORM, 0.11, 0.03),
    [],
  )
  const wingletPort = useMemo(() => mirrorGeometryX(winglet), [winglet])

  const cabinWindowMatrices = useMemo(
    () =>
      createCabinWindowMatrices({
        fromZ: -2.9,
        toZ: 2.6,
        spacing: 0.34,
        elevation: 0.34,
      }),
    [],
  )
  const cockpitWindowMatrices = useMemo(() => createCockpitWindowMatrices(), [])

  const glowTexture = useMemo(() => createGlowTexture(), [])
  const fanTexture = useMemo(() => createFanTexture(), [])

  // Dispose the procedural geometry when the scene unmounts. React frees the
  // JS objects but the GPU buffers behind them need an explicit release.
  useLayoutEffect(() => {
    const geometries = [
      fuselage,
      wing,
      wingPort,
      stabiliser,
      stabiliserPort,
      fin,
      winglet,
      wingletPort,
    ]
    return () => {
      for (const geometry of geometries) geometry.dispose()
      glowTexture?.dispose()
      fanTexture?.dispose()
    }
  }, [
    fuselage,
    wing,
    wingPort,
    stabiliser,
    stabiliserPort,
    fin,
    winglet,
    wingletPort,
    glowTexture,
    fanTexture,
  ])

  useLayoutEffect(() => {
    // Yaw, then pitch, then roll - the order these rotations physically compose.
    if (groupRef.current) groupRef.current.rotation.order = 'YXZ'

    const cabin = cabinWindowsRef.current
    if (cabin) {
      cabinWindowMatrices.forEach((matrix, index) => cabin.setMatrixAt(index, matrix))
      cabin.instanceMatrix.needsUpdate = true
    }

    const cockpit = cockpitWindowsRef.current
    if (cockpit) {
      cockpitWindowMatrices.forEach((matrix, index) =>
        cockpit.setMatrixAt(index, matrix),
      )
      cockpit.instanceMatrix.needsUpdate = true
    }
  }, [cabinWindowMatrices, cockpitWindowMatrices])

  useFrame((_state, delta) => {
    const group = groupRef.current
    if (!group) return

    // Sign conventions are documented in sceneConfig: a positive heading turns
    // right, which is a negative rotation about +Y.
    group.rotation.y = -degToRad(flightRuntime.currentHeadingDegrees)
    group.rotation.x = degToRad(flightRuntime.currentPitchDegrees)
    group.rotation.z = -degToRad(flightRuntime.currentRollDegrees)
    group.position.x = gameMode === 'playing' ? gameRuntime.planeX : 0
    group.position.y = flightRuntime.verticalOffset

    for (const fan of fanRefs.current) {
      if (fan) fan.rotation.z += delta * 7.5
    }

    if (beaconRef.current) {
      // Slow asymmetric pulse, like a real anti-collision beacon.
      const pulse = Math.max(0, Math.sin(flightRuntime.elapsedSeconds * 2.4))
      const intensity = pulse * pulse * flightRuntime.ambientMotion
      beaconRef.current.material.opacity = 0.15 + intensity * 0.85
      const scale = 0.5 + intensity * 0.5
      beaconRef.current.scale.set(scale, scale, scale)
    }
  })

  return (
    <group ref={groupRef} name="aircraft">
      {/* Fuselage */}
      <mesh geometry={fuselage} frustumCulled={false}>
        <meshStandardMaterial
          color={color.hullLight}
          metalness={0.62}
          roughness={0.34}
          envMapIntensity={0.85}
        />
      </mesh>

      {/* Wings, with winglets inheriting the dihedral from their parent */}
      <mesh geometry={wing} position={WING_ANCHOR} rotation={[0, 0, WING_DIHEDRAL]}>
        <meshStandardMaterial
          color={color.hullLight}
          metalness={0.58}
          roughness={0.4}
          side={DoubleSide}
          envMapIntensity={0.7}
        />
        <mesh geometry={winglet} position={[4.66, 0, 0]} rotation={[0, 0, 1.31]}>
          <meshStandardMaterial
            color={aircraftAccent}
            metalness={0.5}
            roughness={0.45}
            side={DoubleSide}
          />
        </mesh>
      </mesh>

      <mesh
        geometry={wingPort}
        position={WING_ANCHOR}
        rotation={[0, 0, -WING_DIHEDRAL]}
      >
        <meshStandardMaterial
          color={color.hullLight}
          metalness={0.58}
          roughness={0.4}
          side={DoubleSide}
          envMapIntensity={0.7}
        />
        <mesh geometry={wingletPort} position={[-4.66, 0, 0]} rotation={[0, 0, -1.31]}>
          <meshStandardMaterial
            color={aircraftAccent}
            metalness={0.5}
            roughness={0.45}
            side={DoubleSide}
          />
        </mesh>
      </mesh>

      {/* Horizontal stabilisers */}
      <mesh
        geometry={stabiliser}
        position={STABILISER_ANCHOR}
        rotation={[0, 0, STABILISER_DIHEDRAL]}
      >
        <meshStandardMaterial
          color={aircraftAccent}
          metalness={0.55}
          roughness={0.42}
          side={DoubleSide}
        />
      </mesh>
      <mesh
        geometry={stabiliserPort}
        position={STABILISER_ANCHOR}
        rotation={[0, 0, -STABILISER_DIHEDRAL]}
      >
        <meshStandardMaterial
          color={color.hullLight}
          metalness={0.55}
          roughness={0.42}
          side={DoubleSide}
        />
      </mesh>

      {/* Vertical fin: the same lifting surface stood on its edge */}
      <mesh geometry={fin} position={FIN_ANCHOR} rotation={[0, 0, Math.PI / 2]}>
        <meshStandardMaterial
          color={color.hullLight}
          metalness={0.52}
          roughness={0.42}
          side={DoubleSide}
          envMapIntensity={0.7}
        />
      </mesh>

      {/* Engines */}
      {ENGINE_POSITIONS.map((position, index) => (
        <group key={`engine-${index}`} position={position}>
          {/* Nacelle */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry
              args={[NACELLE_RADIUS, NACELLE_RADIUS * 0.93, 1.85, 20, 1, true]}
            />
            <meshStandardMaterial
              color={color.engineCowl}
              metalness={0.72}
              roughness={0.32}
              side={DoubleSide}
              envMapIntensity={0.9}
            />
          </mesh>

          {/* Intake lip */}
          <mesh position={[0, 0, -0.92]}>
            <torusGeometry args={[NACELLE_RADIUS, 0.045, 8, 24]} />
            <meshStandardMaterial
              color={color.hullLight}
              metalness={0.85}
              roughness={0.22}
            />
          </mesh>

          {/* Fan face, spun in the frame loop */}
          <mesh
            position={[0, 0, -0.85]}
            ref={(mesh) => {
              fanRefs.current[index] = mesh
            }}
          >
            <circleGeometry args={[NACELLE_RADIUS * 0.94, 24]} />
            <meshStandardMaterial
              map={fanTexture}
              color={color.engineIntake}
              metalness={0.6}
              roughness={0.5}
            />
          </mesh>

          {/* Exhaust nozzle and plug. The plug is deliberately light: from a
              chase camera this is the most visible part of the engine, and a
              dark nozzle alone just reads as a hole punched in the wing. */}
          <mesh position={[0, 0, 0.94]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.27, 0.23, 0.3, 18, 1, true]} />
            <meshStandardMaterial
              color={color.engineIntake}
              metalness={0.5}
              roughness={0.6}
              side={DoubleSide}
            />
          </mesh>
          <mesh position={[0, 0, 1.08]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.18, 0.42, 16]} />
            <meshStandardMaterial
              color={color.hullBelly}
              metalness={0.65}
              roughness={0.4}
              envMapIntensity={0.9}
            />
          </mesh>

          {/* Pylon up and back to the wing leading edge */}
          <mesh position={[0, 0.42, 0.62]}>
            <boxGeometry args={[0.13, 0.6, 1.15]} />
            <meshStandardMaterial
              color={color.hullLight}
              metalness={0.5}
              roughness={0.45}
            />
          </mesh>
        </group>
      ))}

      {/* Cabin windows */}
      <instancedMesh
        ref={cabinWindowsRef}
        args={[undefined, undefined, cabinWindowMatrices.length]}
        frustumCulled={false}
      >
        <planeGeometry args={[0.1, 0.13]} />
        <meshBasicMaterial color={color.cabinWindow} toneMapped={false} />
      </instancedMesh>

      {/* Flight deck glazing */}
      <instancedMesh
        ref={cockpitWindowsRef}
        args={[undefined, undefined, cockpitWindowMatrices.length]}
        frustumCulled={false}
      >
        <planeGeometry args={[0.26, 0.17]} />
        <meshStandardMaterial
          color={color.cockpitGlass}
          metalness={0.9}
          roughness={0.06}
        />
      </instancedMesh>

      {/* Navigation lights: red to port, green to starboard, white astern */}
      <NavigationLight position={NAV_LIGHTS.port} lightColor={color.navRed} />
      <NavigationLight position={NAV_LIGHTS.starboard} lightColor={color.navGreen} />
      <NavigationLight position={NAV_LIGHTS.tail} lightColor={color.navWhite} size={0.5} />

      {/* Pulsing anti-collision beacon on the spine */}
      {glowTexture ? (
        <sprite ref={beaconRef} position={NAV_LIGHTS.beacon} scale={[0.8, 0.8, 0.8]}>
          <spriteMaterial
            map={glowTexture}
            color={color.navRed}
            blending={AdditiveBlending}
            depthWrite={false}
            transparent
            opacity={0.2}
            toneMapped={false}
          />
        </sprite>
      ) : null}
    </group>
  )
}

interface NavigationLightProps {
  position: [number, number, number]
  lightColor: string
  size?: number
}

/** A bulb plus an additive halo, so the light reads against the bright sky. */
function NavigationLight({ position, lightColor, size = 0.62 }: NavigationLightProps) {
  const glowTexture = useMemo(() => createGlowTexture(32), [])

  useLayoutEffect(() => () => glowTexture?.dispose(), [glowTexture])

  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.075, 8, 8]} />
        <meshBasicMaterial color={lightColor} toneMapped={false} />
      </mesh>
      {glowTexture ? (
        <sprite scale={[size, size, size]}>
          <spriteMaterial
            map={glowTexture}
            color={lightColor}
            blending={AdditiveBlending}
            depthWrite={false}
            transparent
            opacity={0.75}
            toneMapped={false}
          />
        </sprite>
      ) : null}
    </group>
  )
}
