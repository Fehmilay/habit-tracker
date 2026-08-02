'use client'

import { useFrame } from '@react-three/fiber'
import { type ReactNode, useRef } from 'react'
import type { Group } from 'three'
import { flightRuntime } from '@/lib/flight/flightRuntime'
import { GLOBE } from '@/lib/flight/sceneConfig'

/**
 * Hides the aircraft/course-line/chase-only content once the globe view has
 * taken over.
 *
 * A visibility toggle rather than a per-material opacity fade: these children
 * are complex multi-material meshes (the aircraft alone has a dozen), and
 * fading each one's material would mean reaching into all of them. By the
 * zoom level this switches at, the camera has already pulled back far enough
 * that the aircraft and course line are tiny and heavily fogged - see
 * `ChaseCamera`'s globe blend - so the cut is not visible in practice.
 */
export function ChaseViewFade({ children }: { children: ReactNode }) {
  const groupRef = useRef<Group>(null)

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.visible = flightRuntime.zoomOut < GLOBE.chaseHideAt
    }
  })

  return <group ref={groupRef}>{children}</group>
}
