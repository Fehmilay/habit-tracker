import { Vector3 } from 'three'
import { GLOBE } from './sceneConfig'

/**
 * Geographic helpers for the globe view.
 *
 * Kept separate from the R3F component so the projection math is testable
 * without a renderer, the same reasoning as `flightDynamics.ts`.
 */

/**
 * Longitude/latitude, in degrees, to a point on the globe's surface.
 *
 * Standard spherical-to-Cartesian conversion with the poles on +Y/-Y. The
 * longitude offset (`+ 90`) and sign flip on X line the texture's seam up
 * with the equirectangular texture drawn in `earthTexture.ts`, which starts
 * at -180° at its left edge.
 */
export function latLongToVector3(
  longitude: number,
  latitude: number,
  radius: number = GLOBE.radius,
  altitude = 0,
): Vector3 {
  const lat = (latitude * Math.PI) / 180
  const lon = (longitude * Math.PI) / 180
  const r = radius + altitude

  return new Vector3(
    -r * Math.cos(lat) * Math.cos(lon),
    r * Math.sin(lat),
    r * Math.cos(lat) * Math.sin(lon),
  )
}

/** `latLongToVector3`, offset into world space at the globe's centre. */
export function airportWorldPosition(
  longitude: number,
  latitude: number,
  altitude = 0,
): Vector3 {
  const local = latLongToVector3(longitude, latitude, GLOBE.radius, altitude)
  return local.add(
    new Vector3(GLOBE.center.x, GLOBE.center.y, GLOBE.center.z),
  )
}

/**
 * Points along the great-circle arc from one lon/lat pair to another,
 * lifted slightly off the surface so the route reads as a flight path rather
 * than a line painted on the globe.
 *
 * Spherical linear interpolation between the two surface unit vectors - the
 * shortest path between two points on a sphere is the one a slerp traces.
 */
export function greatCircleArcPoints(
  fromLonLat: [number, number],
  toLonLat: [number, number],
  steps = 64,
  liftHeight = 3.2,
): Vector3[] {
  const from = latLongToVector3(fromLonLat[0], fromLonLat[1], 1)
  const to = latLongToVector3(toLonLat[0], toLonLat[1], 1)

  const angle = from.angleTo(to)
  const center = new Vector3(GLOBE.center.x, GLOBE.center.y, GLOBE.center.z)

  if (angle < 1e-6) {
    return [
      latLongToVector3(fromLonLat[0], fromLonLat[1]).add(center),
      latLongToVector3(toLonLat[0], toLonLat[1]).add(center),
    ]
  }

  const points: Vector3[] = []
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps
    const a = Math.sin((1 - t) * angle) / Math.sin(angle)
    const b = Math.sin(t * angle) / Math.sin(angle)

    const direction = new Vector3(
      from.x * a + to.x * b,
      from.y * a + to.y * b,
      from.z * a + to.z * b,
    ).normalize()

    // Lift peaks at the midpoint and tapers to zero at both ends, so the arc
    // touches down exactly at the two airports.
    const lift = liftHeight * Math.sin(t * Math.PI)
    points.push(direction.multiplyScalar(GLOBE.radius + lift).add(center))
  }

  return points
}
