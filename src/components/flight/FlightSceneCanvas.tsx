'use client'

import { Canvas } from '@react-three/fiber'
import { ACESFilmicToneMapping } from 'three'
import { Aircraft3D } from './Aircraft3D'
import { ChaseCamera } from './ChaseCamera'
import { CourseLine } from './CourseLine'
import { DestinationAirport } from './DestinationAirport'
import { FlightDriver } from './FlightDriver'
import { FlightEnvironment } from './FlightEnvironment'
import { HabitRingCourse } from './HabitRingCourse'
import { ProjectedCourse } from './ProjectedCourse'
import { CAMERA_RIGS, ENVIRONMENT } from '@/lib/flight/sceneConfig'
import { useQualitySettings } from '@/lib/perf/quality'
import { useDocumentVisible } from '@/lib/perf/useDocumentVisible'
import { useReducedMotion } from '@/lib/perf/useReducedMotion'
import { useJourneyStore } from '@/store/journeyStore'

/**
 * The WebGL scene.
 *
 * Default-exported and loaded through `next/dynamic` with SSR disabled, so the
 * Three.js bundle is only fetched once we know the device can actually use it.
 */
export default function FlightSceneCanvas() {
  const quality = useQualitySettings()
  const prefersReducedMotion = useReducedMotion()
  const documentVisible = useDocumentVisible()
  const gameMode = useJourneyStore((state) => state.gameMode)
  const gameRunning = gameMode === 'countdown' || gameMode === 'playing'

  // Reduced motion keeps course changes - they carry the meaning - but stops
  // the idle drift, turbulence and most of the parallax.
  const ambientMotion = prefersReducedMotion ? 0 : 1

  return (
    <Canvas
      dpr={quality.dpr}
      // A backgrounded tab renders nothing at all.
      frameloop={documentVisible ? 'always' : 'never'}
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
      <FlightDriver ambientMotion={ambientMotion} />
      <ChaseCamera />

      <FlightEnvironment
        cloudCount={quality.cloudCount}
        starCount={quality.starCount}
        showCloudDeck={quality.showCloudDeck}
        ambientMotion={ambientMotion}
      />

      {gameRunning ? (
        <HabitRingCourse />
      ) : (
        <>
          <CourseLine gateCount={quality.courseGateCount} />
          <ProjectedCourse />
          <DestinationAirport />
        </>
      )}
      <Aircraft3D fuselageSegments={quality.fuselageSegments} />
    </Canvas>
  )
}
