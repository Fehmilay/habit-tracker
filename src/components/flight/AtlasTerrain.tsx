'use client'

/* eslint-disable react-hooks/immutability -- Three.js textures are intentionally mutable GPU resources. */

import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { useLayoutEffect } from 'react'
import { LinearMipmapLinearFilter, MirroredRepeatWrapping, SRGBColorSpace } from 'three'
import { safeDelta } from '@/lib/flight/flightMath'
import { useFlightStore } from '@/store/flightStore'

const ATLAS_TEXTURE = '/assets/world-atlas-night.png'

/**
 * A generated fictional atlas far below the aircraft. The image is mirrored
 * before repeating, so it can scroll indefinitely without a hard texture seam.
 */
export function AtlasTerrain({ reducedDetail = false }: { reducedDetail?: boolean }) {
  const texture = useTexture(ATLAS_TEXTURE)
  const gl = useThree((state) => state.gl)
  const speed = useFlightStore((state) => state.speed)

  useLayoutEffect(() => {
    texture.colorSpace = SRGBColorSpace
    texture.wrapS = MirroredRepeatWrapping
    texture.wrapT = MirroredRepeatWrapping
    texture.repeat.set(reducedDetail ? 1.2 : 1.65, reducedDetail ? 2.6 : 3.8)
    texture.anisotropy = Math.min(reducedDetail ? 2 : 4, gl.capabilities.getMaxAnisotropy())
    texture.minFilter = LinearMipmapLinearFilter
    texture.needsUpdate = true
  }, [gl, reducedDetail, texture])

  useFrame((_state, delta) => {
    const dt = safeDelta(delta)
    if (dt === 0) return
    texture.offset.y = (texture.offset.y - speed * dt * 0.000055 + 1) % 1
  })

  return (
    <mesh position={[0, -108, -1180]} rotation={[-Math.PI / 2, 0, 0]} frustumCulled={false} renderOrder={-80}>
      <planeGeometry args={[2200, 4200, 1, 1]} />
      <meshBasicMaterial map={texture} color="#b7dce0" opacity={0.76} transparent fog toneMapped />
    </mesh>
  )
}

useTexture.preload(ATLAS_TEXTURE)
