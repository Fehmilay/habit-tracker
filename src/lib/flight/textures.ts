import { CanvasTexture, LinearFilter, SRGBColorSpace, type Texture } from 'three'

/**
 * Procedural textures, drawn once into small canvases.
 *
 * The brief rules out large high-resolution texture files, and everything here
 * is a soft gradient anyway - things that compress badly as images but cost
 * almost nothing to draw. Nothing exceeds 128px, so the whole set is a few tens
 * of kilobytes of GPU memory and adds zero network requests.
 */

function createCanvas(size: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  return canvas
}

function finish(canvas: HTMLCanvasElement): Texture {
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.needsUpdate = true
  return texture
}

/** Soft radial glow, used for navigation lights and the course-line bloom. */
export function createGlowTexture(size = 64): Texture | null {
  const canvas = createCanvas(size)
  if (!canvas) return null
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const half = size / 2
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half)
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
  gradient.addColorStop(0.22, 'rgba(255, 255, 255, 0.62)')
  gradient.addColorStop(0.55, 'rgba(255, 255, 255, 0.14)')
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  return finish(canvas)
}

/**
 * A cloud puff: several overlapping soft blobs so the silhouette is irregular
 * rather than an obvious circle.
 */
export function createCloudTexture(size = 128): Texture | null {
  const canvas = createCanvas(size)
  if (!canvas) return null
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.clearRect(0, 0, size, size)

  // Fixed offsets - a deterministic puff means every reload looks the same.
  const blobs: Array<[number, number, number, number]> = [
    [0.5, 0.54, 0.4, 0.85],
    [0.34, 0.6, 0.28, 0.6],
    [0.66, 0.58, 0.3, 0.62],
    [0.44, 0.44, 0.24, 0.5],
    [0.6, 0.46, 0.2, 0.42],
    [0.26, 0.52, 0.16, 0.3],
    [0.76, 0.54, 0.17, 0.32],
  ]

  ctx.globalCompositeOperation = 'lighter'
  for (const [cx, cy, radius, alpha] of blobs) {
    const x = cx * size
    const y = cy * size
    const r = radius * size
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r)
    gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`)
    gradient.addColorStop(0.45, `rgba(255, 255, 255, ${alpha * 0.42})`)
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  return finish(canvas)
}

/** Engine fan face: dark hub with radial blades, spun in the render loop. */
export function createFanTexture(size = 128): Texture | null {
  const canvas = createCanvas(size)
  if (!canvas) return null
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const half = size / 2

  ctx.fillStyle = '#0a0d11'
  ctx.fillRect(0, 0, size, size)

  const blades = 22
  ctx.strokeStyle = 'rgba(150, 168, 186, 0.55)'
  ctx.lineWidth = Math.max(1, size / 64)
  ctx.lineCap = 'round'

  for (let i = 0; i < blades; i += 1) {
    const angle = (i / blades) * Math.PI * 2
    // Slight sweep so the blades read as curved, like a real fan.
    const sweep = 0.42
    ctx.beginPath()
    ctx.moveTo(half + Math.cos(angle) * half * 0.2, half + Math.sin(angle) * half * 0.2)
    ctx.quadraticCurveTo(
      half + Math.cos(angle + sweep * 0.5) * half * 0.62,
      half + Math.sin(angle + sweep * 0.5) * half * 0.62,
      half + Math.cos(angle + sweep) * half * 0.94,
      half + Math.sin(angle + sweep) * half * 0.94,
    )
    ctx.stroke()
  }

  ctx.fillStyle = '#1b2129'
  ctx.beginPath()
  ctx.arc(half, half, half * 0.2, 0, Math.PI * 2)
  ctx.fill()

  return finish(canvas)
}

/** A single soft dot for the star field. */
export function createStarTexture(size = 32): Texture | null {
  const canvas = createCanvas(size)
  if (!canvas) return null
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const half = size / 2
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half)
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
  gradient.addColorStop(0.35, 'rgba(255, 255, 255, 0.35)')
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  return finish(canvas)
}
