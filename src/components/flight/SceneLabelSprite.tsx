'use client'

import { useLayoutEffect, useMemo } from 'react'
import { createLabelTexture } from '@/lib/flight/textures'

interface SceneLabelSpriteProps {
  text: string
  subtext?: string
  color?: string
  position?: [number, number, number]
  scale?: [number, number, number]
}

export function SceneLabelSprite({
  text,
  subtext,
  color = '#c4e8ff',
  position = [0, 0, 0],
  scale = [22, 5.5, 1],
}: SceneLabelSpriteProps) {
  const texture = useMemo(() => createLabelTexture(text, subtext, color), [color, subtext, text])

  useLayoutEffect(() => () => texture?.dispose(), [texture])

  if (!texture) return null
  return (
    <sprite position={position} scale={scale} renderOrder={30}>
      <spriteMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
    </sprite>
  )
}
