'use client'

import { Canvas } from '@react-three/fiber'
import { useMemo } from 'react'
import { ACESFilmicToneMapping } from 'three'
import { Aircraft3D } from './Aircraft3D'
import { AircraftDamage } from './AircraftDamage'
import { AtlasTerrain } from './AtlasTerrain'
import { ChaseCamera } from './ChaseCamera'
import { ChaseViewFade } from './ChaseViewFade'
import { CourseLine } from './CourseLine'
import { DailyConfirmationRing } from './DailyConfirmationRing'
import { GlobeView } from './GlobeView'
import { RecoveryFocusRing } from './RecoveryFocusRing'
import { DestinationAirport } from './DestinationAirport'
import { FlightDriver } from './FlightDriver'
import { FlightEnvironment } from './FlightEnvironment'
import { HabitRingCourse } from './HabitRingCourse'
import { ProjectedCourse } from './ProjectedCourse'
import { CAMERA_RIGS, ENVIRONMENT } from '@/lib/flight/sceneConfig'
import { airportByIata, AIRPORTS } from '@/lib/maps/airports'
import { useQualitySettings } from '@/lib/perf/quality'
import { useDocumentVisible } from '@/lib/perf/useDocumentVisible'
import { useReducedMotion } from '@/lib/perf/useReducedMotion'
import { useJourneyStore } from '@/store/journeyStore'

interface FlightSceneCanvasProps {
  paused?: boolean
  /** Whether the endless ring course runs and steering moves the aircraft. */
  interactive?: boolean
  /** 0..1 share of recently rated habits that were missed. */
  missRate?: number
  /** Lets the settings sheet turn the smoke, sparks and fire off. */
  showDamage?: boolean
}

/**
 * The WebGL scene.
 *
 * Default-exported and loaded through `next/dynamic` with SSR disabled, so the
 * Three.js bundle is only fetched once we know the device can actually use it.
 *
 * The zoom-to-globe gesture is *not* wired up here, even though the globe it
 * reveals is rendered here. `.app-track` - the sliding Habits/Flight/Stats
 * container in `FlightView` - sits above this canvas in paint order and has
 * `pointer-events: auto` across its full extent (it has to, for its own
 * buttons), so it intercepts every wheel and pointer event before they would
 * ever reach this component's DOM node. The gesture is wired up in
 * `FlightView` instead, on `<main>`, alongside the swipe handling that
 * already lives there for the same structural reason.
 */
export default function FlightSceneCanvas({
  paused = false,
  interactive = true,
  missRate = 0,
  showDamage = true,
}: FlightSceneCanvasProps) {
  const quality = useQualitySettings()
  const prefersReducedMotion = useReducedMotion()
  const documentVisible = useDocumentVisible()
  const originIata = useJourneyStore((state) => state.journey.originIata)
  const destinationIata = useJourneyStore((state) => state.journey.destinationIata)

  // Reduced motion keeps course changes - they carry the meaning - but stops
  // the idle drift, turbulence and most of the parallax.
  const ambientMotion = prefersReducedMotion ? 0 : 1

  const origin = useMemo(() => airportByIata(originIata, AIRPORTS[0]), [originIata])
  const destination = useMemo(
    () => airportByIata(destinationIata, AIRPORTS[5]),
    [destinationIata],
  )

  return (
    <Canvas
      dpr={quality.dpr}
      // A backgrounded tab renders nothing at all.
      frameloop={documentVisible && !paused ? 'always' : 'never'}
      gl={{
        antialias: quality.antialias,
        powerPreference: 'high-performance',
        alpha: false,
        stencil: false,
        depth: true,
      }}
      camera={{
        fov: CAMERA_RIGS.chase.vFovLandscape,
        near: 0.5,
        // Must clear the sky dome radius, or the sky is clipped away.
        far: ENVIRONMENT.skyRadius * 2.5,
        position: [0, CAMERA_RIGS.chase.offset.y, CAMERA_RIGS.chase.offset.z],
      }}
      onCreated={({ gl }) => {
        gl.toneMapping = ACESFilmicToneMapping
        gl.toneMappingExposure = 1.18
      }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <FlightDriver
        ambientMotion={ambientMotion}
        steeringActive={interactive}
        missRate={missRate}
        damageEnabled={showDamage}
      />
      <ChaseCamera />

      <FlightEnvironment
        cloudCount={quality.cloudCount}
        starCount={quality.starCount}
        showCloudDeck={quality.showCloudDeck}
        ambientMotion={ambientMotion}
      />

      <ChaseViewFade>
        <AtlasTerrain reducedDetail={quality.tier === 'low'} />

        {/* The course line and the ring course now coexist. The line is the
            app's meaning - where you should be - and the rings are the game
            played along it; the old build swapped one out for the other, which
            meant playing hid the very thing being visualised. */}
        <CourseLine gateCount={quality.courseGateCount} />
        <ProjectedCourse />
        <DestinationAirport />
        <HabitRingCourse active={interactive && !paused} />
        <DailyConfirmationRing />
        <RecoveryFocusRing />
        <Aircraft3D fuselageSegments={quality.fuselageSegments} />
        <AircraftDamage />
      </ChaseViewFade>

      <GlobeView
        originIata={origin.iata}
        originCoordinates={origin.coordinates}
        destinationIata={destination.iata}
        destinationCoordinates={destination.coordinates}
      />
    </Canvas>
  )
}
