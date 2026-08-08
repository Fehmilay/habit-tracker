'use client'

import dynamic from 'next/dynamic'
import { useSyncExternalStore } from 'react'
import { SceneErrorBoundary } from './SceneErrorBoundary'
import { SceneFallback2D } from './SceneFallback2D'
import { SceneLoading } from './SceneLoading'
import { detectWebGL } from '@/lib/perf/webgl'

/**
 * Three.js, R3F and drei are the heaviest thing in the app by a wide margin.
 * Loading them lazily and without SSR means the shell paints immediately, and a
 * device that cannot run WebGL never downloads them at all.
 */
const FlightSceneCanvas = dynamic(() => import('./FlightSceneCanvas'), {
  ssr: false,
  loading: () => <SceneLoading />,
})

/**
 * WebGL support cannot change during a session, and probing it allocates a
 * canvas and a context - so the answer is resolved once and cached.
 */
let cachedSupport: boolean | null = null

function getSupportSnapshot(): boolean {
  cachedSupport ??= detectWebGL()
  return cachedSupport
}

/**
 * On the server we optimistically assume WebGL is available. The canvas is
 * client-only anyway, so the first client render is what actually decides.
 */
function getServerSupportSnapshot(): boolean {
  return true
}

const noopSubscribe = () => () => {}

interface FlightSceneProps {
  paused?: boolean
  /** Whether the endless ring course runs and steering moves the aircraft. */
  interactive?: boolean
  /** 0..1 share of recently rated habits that were missed. */
  missRate?: number
  /** Lets the settings sheet turn the smoke, sparks and fire off. */
  showDamage?: boolean
}

export function FlightScene({
  paused = false,
  interactive = true,
  missRate = 0,
  showDamage = true,
}: FlightSceneProps) {
  const supported = useSyncExternalStore(
    noopSubscribe,
    getSupportSnapshot,
    getServerSupportSnapshot,
  )

  if (!supported) return <SceneFallback2D reason="no-webgl" />

  return (
    <SceneErrorBoundary fallback={<SceneFallback2D reason="error" />}>
      <FlightSceneCanvas paused={paused} interactive={interactive} missRate={missRate} showDamage={showDamage} />
    </SceneErrorBoundary>
  )
}
