'use client'

import { useLayoutEffect, useMemo } from 'react'
import { CanvasTexture, LinearFilter } from 'three'

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
  const texture = useMemo(() => {
    if (typeof document === 'undefined') return null
    const canvas = document.createElement('canvas')
    canvas.width = 768
    canvas.height = 192
    const context = canvas.getContext('2d')
    if (!context) return null

    context.clearRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = 'rgba(5, 10, 22, 0.76)'
    context.beginPath()
    context.roundRect(18, 16, 732, 160, 44)
    context.fill()
    context.strokeStyle = `${color}88`
    context.lineWidth = 4
    context.stroke()
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillStyle = color
    context.font = '700 62px system-ui, sans-serif'
    context.fillText(text.toUpperCase(), 384, subtext ? 78 : 96)
    if (subtext) {
      context.fillStyle = 'rgba(242, 246, 251, 0.72)'
      context.font = '500 28px system-ui, sans-serif'
      context.fillText(subtext.toUpperCase(), 384, 132)
    }

    const next = new CanvasTexture(canvas)
    next.minFilter = LinearFilter
    next.magFilter = LinearFilter
    next.needsUpdate = true
    return next
  }, [color, subtext, text])

  useLayoutEffect(() => () => texture?.dispose(), [texture])

  if (!texture) return null
  return (
    <sprite position={position} scale={scale} renderOrder={30}>
      <spriteMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
    </sprite>
  )
}

