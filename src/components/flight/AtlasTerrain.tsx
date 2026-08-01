'use client'

/* eslint-disable react-hooks/immutability -- Three.js textures are intentionally mutable GPU resources. */

import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { useLayoutEffect } from 'react'
import { ClampToEdgeWrapping, LinearMipmapLinearFilter, MirroredRepeatWrapping, SRGBColorSpace } from 'three'
import { safeDelta } from '@/lib/flight/flightMath'
import { flightCycleProgress, localDateKey } from '@/lib/journey/date'
import { useFlightStore } from '@/store/flightStore'
import { useJourneyStore } from '@/store/journeyStore'

export const FLIGHT_REGIONS = [
  { fromDay: 1, toDay: 7, name: 'Nachtküste', texture: '/assets/world-atlas-night.png' },
  { fromDay: 8, toDay: 15, name: 'Wüstenmorgen', texture: '/assets/maps/desert-dawn.png' },
  { fromDay: 16, toDay: 23, name: 'Arktische Nacht', texture: '/assets/maps/arctic-night.png' },
  { fromDay: 24, toDay: 29, name: 'Smaragd-Archipel', texture: '/assets/maps/emerald-archipelago.png' },
  { fromDay: 30, toDay: 30, name: 'Final Approach', texture: '/assets/maps/day-30-runway.png' },
] as const

export function flightRegionForDay(day: number) {
  return FLIGHT_REGIONS.find((region) => day >= region.fromDay && day <= region.toDay) ?? FLIGHT_REGIONS[0]
}

/**
 * A generated fictional atlas far below the aircraft. The image is mirrored
 * before repeating, so it can scroll indefinitely without a hard texture seam.
 */
export function AtlasTerrain({ reducedDetail = false }: { reducedDetail?: boolean }) {
  const journeyStart = useJourneyStore((state) => state.journey.startDate)
  const cycleDay = flightCycleProgress(journeyStart, localDateKey()).day
  const region = flightRegionForDay(cycleDay)
  const landingRegion = cycleDay === 30
  const texture = useTexture(region.texture)
  const gl = useThree((state) => state.gl)
  const speed = useFlightStore((state) => state.speed)

  useLayoutEffect(() => {
    texture.colorSpace = SRGBColorSpace
    texture.wrapS = landingRegion ? ClampToEdgeWrapping : MirroredRepeatWrapping
    texture.wrapT = landingRegion ? ClampToEdgeWrapping : MirroredRepeatWrapping
    texture.repeat.set(landingRegion ? 1 : reducedDetail ? 1.2 : 1.65, landingRegion ? 1 : reducedDetail ? 2.6 : 3.8)
    texture.offset.set(0, 0)
    texture.anisotropy = Math.min(reducedDetail ? 2 : 4, gl.capabilities.getMaxAnisotropy())
    texture.minFilter = LinearMipmapLinearFilter
    texture.needsUpdate = true
  }, [gl, landingRegion, reducedDetail, texture])

  useFrame((_state, delta) => {
    const dt = safeDelta(delta)
    if (dt === 0) return
    if (!landingRegion) texture.offset.y = (texture.offset.y - speed * dt * 0.000055 + 1) % 1
  })

  return (
    <mesh position={[0, -108, landingRegion ? -1250 : -1180]} rotation={[-Math.PI / 2, 0, 0]} frustumCulled={false} renderOrder={-80}>
      <planeGeometry args={[2200, 4200, 1, 1]} />
      <meshBasicMaterial map={texture} color="#b7dce0" opacity={0.76} transparent fog toneMapped />
    </mesh>
  )
}
