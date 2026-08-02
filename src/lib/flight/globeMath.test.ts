import { Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { GLOBE } from './sceneConfig'
import { airportWorldPosition, greatCircleArcPoints, latLongToVector3 } from './globeMath'

const GLOBE_CENTER = new Vector3(GLOBE.center.x, GLOBE.center.y, GLOBE.center.z)

describe('latLongToVector3', () => {
  it('places the north pole on +Y', () => {
    const point = latLongToVector3(0, 90, 10)
    expect(point.y).toBeCloseTo(10, 5)
    expect(point.x).toBeCloseTo(0, 4)
    expect(point.z).toBeCloseTo(0, 4)
  })

  it('places the south pole on -Y', () => {
    const point = latLongToVector3(0, -90, 10)
    expect(point.y).toBeCloseTo(-10, 5)
  })

  it('keeps every point at the requested radius', () => {
    for (const [lon, lat] of [
      [0, 0],
      [45, 30],
      [-120, -15],
      [179, 60],
    ] as const) {
      const point = latLongToVector3(lon, lat, 25)
      expect(point.length()).toBeCloseTo(25, 4)
    }
  })
})

describe('airportWorldPosition', () => {
  it('sits exactly one radius from the globe centre', () => {
    const position = airportWorldPosition(6.7668, 51.2895)
    expect(position.distanceTo(GLOBE_CENTER)).toBeCloseTo(GLOBE.radius, 4)
  })
})

describe('greatCircleArcPoints', () => {
  const dus: [number, number] = [6.7668, 51.2895]
  const jfk: [number, number] = [-73.7781, 40.6413]

  it('starts and ends at the requested airports, on the sphere surface', () => {
    const points = greatCircleArcPoints(dus, jfk, 32, 0)
    const start = airportWorldPosition(dus[0], dus[1])
    const end = airportWorldPosition(jfk[0], jfk[1])

    expect(points[0].distanceTo(start)).toBeLessThan(0.01)
    expect(points.at(-1)!.distanceTo(end)).toBeLessThan(0.01)
    expect(points.length).toBe(33)
  })

  it('bulges upward at the midpoint when lifted', () => {
    const a: [number, number] = [0, 0]
    const b: [number, number] = [90, 0]
    const lifted = greatCircleArcPoints(a, b, 10, 5)
    const flat = greatCircleArcPoints(a, b, 10, 0)

    const mid = Math.floor(lifted.length / 2)
    expect(lifted[mid].distanceTo(GLOBE_CENTER)).toBeGreaterThan(
      flat[mid].distanceTo(GLOBE_CENTER),
    )
  })

  it('every arc point stays at or above the base globe radius', () => {
    const points = greatCircleArcPoints([10, 10], [-160, -40], 40, 4)
    for (const point of points) {
      expect(point.distanceTo(GLOBE_CENTER)).toBeGreaterThanOrEqual(GLOBE.radius - 0.01)
    }
  })

  it('handles identical start and end points without dividing by zero', () => {
    const points = greatCircleArcPoints(dus, dus, 16, 4)
    expect(points.every((point) => Number.isFinite(point.x))).toBe(true)
  })
})
