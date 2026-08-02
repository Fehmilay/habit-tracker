import { feature } from 'topojson-client'
import type { Feature, FeatureCollection, Geometry, Position } from 'geojson'
import type { Topology } from 'topojson-specification'
import worldTopology from 'world-atlas/land-110m.json'
import { CanvasTexture, LinearFilter, type Texture } from 'three'

/**
 * Procedural Earth texture for the globe view.
 *
 * Reuses the same 110m land-outline dataset `WorldRouteMap` already draws as a
 * flat SVG map - one data source for "what does the world look like" rather
 * than shipping a second, heavier satellite texture. An equirectangular photo
 * texture at any usable resolution would be several megabytes; this is a few
 * hundred lines vector-filled onto a small canvas, in the same dark, teal-land
 * palette as the rest of the app.
 */

const TEXTURE_WIDTH = 1024
const TEXTURE_HEIGHT = 512

function polygonRings(geometry: Geometry): Position[][] {
  if (geometry.type === 'Polygon') return geometry.coordinates
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.flat()
  return []
}

/**
 * Longitude/latitude to equirectangular pixel coordinates.
 *
 * Must agree with `globeMath.latLongToVector3`'s seam: that function treats
 * longitude 0 as facing +Z: with the standard `sphere.rotateY(-90deg)` framing
 * this uses, that lines up with this texture's left edge sitting at -180.
 */
function project(longitude: number, latitude: number): [number, number] {
  return [
    ((longitude + 180) / 360) * TEXTURE_WIDTH,
    ((90 - latitude) / 180) * TEXTURE_HEIGHT,
  ]
}

let cachedLandRings: Position[][] | null = null

function getLandRings(): Position[][] {
  if (cachedLandRings) return cachedLandRings

  const topology = worldTopology as unknown as Topology
  const landFeature = feature(topology, topology.objects.land) as
    | Feature<Geometry>
    | FeatureCollection<Geometry>

  cachedLandRings = (
    landFeature.type === 'FeatureCollection' ? landFeature.features : [landFeature]
  ).flatMap((item) => polygonRings(item.geometry))

  return cachedLandRings
}

/** Draws one land ring, including copies wrapped across the antimeridian. */
function fillRing(ctx: CanvasRenderingContext2D, ring: Position[]): void {
  for (const wrap of [-TEXTURE_WIDTH, 0, TEXTURE_WIDTH]) {
    ctx.beginPath()
    ring.forEach((position, index) => {
      const [x, y] = project(position[0], position[1])
      if (index === 0) ctx.moveTo(x + wrap, y)
      else ctx.lineTo(x + wrap, y)
    })
    ctx.closePath()
    ctx.fill()
  }
}

export function createEarthTexture(): Texture | null {
  if (typeof document === 'undefined') return null

  const canvas = document.createElement('canvas')
  canvas.width = TEXTURE_WIDTH
  canvas.height = TEXTURE_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const ocean = ctx.createLinearGradient(0, 0, 0, TEXTURE_HEIGHT)
  ocean.addColorStop(0, '#0c2338')
  ocean.addColorStop(0.5, '#0a1d33')
  ocean.addColorStop(1, '#0c2338')
  ctx.fillStyle = ocean
  ctx.fillRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT)

  ctx.fillStyle = '#123a3c'
  for (const ring of getLandRings()) fillRing(ctx, ring)

  // A faint highlight band, like sunlight grazing the land from the northeast -
  // consistent with the flight scene's own key-light direction.
  ctx.globalCompositeOperation = 'source-atop'
  const sheen = ctx.createLinearGradient(0, 0, TEXTURE_WIDTH * 0.3, TEXTURE_HEIGHT * 0.7)
  sheen.addColorStop(0, 'rgba(146, 196, 214, 0.22)')
  sheen.addColorStop(1, 'rgba(146, 196, 214, 0)')
  ctx.fillStyle = sheen
  ctx.fillRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT)
  ctx.globalCompositeOperation = 'source-over'

  // Faint latitude/longitude grid, echoing the flat map's graticule.
  ctx.strokeStyle = 'rgba(196, 232, 255, 0.05)'
  ctx.lineWidth = 1
  for (let lat = -60; lat <= 60; lat += 30) {
    const [, y] = project(0, lat)
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(TEXTURE_WIDTH, y)
    ctx.stroke()
  }
  for (let lon = -150; lon <= 150; lon += 30) {
    const [x] = project(lon, 0)
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, TEXTURE_HEIGHT)
    ctx.stroke()
  }

  const texture = new CanvasTexture(canvas)
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.needsUpdate = true
  return texture
}
