'use client'

import { feature } from 'topojson-client'
import type { Feature, FeatureCollection, Geometry, Position } from 'geojson'
import type { Topology } from 'topojson-specification'
import worldTopology from 'world-atlas/land-110m.json'
import { useMemo } from 'react'
import { Glyph } from '@/components/icons/Glyph'
import { daysBetween } from '@/lib/journey/date'
import { AIRPORTS, airportByIata } from '@/lib/maps/airports'
import { useJourneyStore } from '@/store/journeyStore'

const MAP_WIDTH = 1000
const MAP_HEIGHT = 500

function project([longitude, latitude]: [number, number]): [number, number] {
  return [((longitude + 180) / 360) * MAP_WIDTH, ((90 - latitude) / 180) * MAP_HEIGHT]
}

function greatCircle(start: [number, number], end: [number, number], steps = 140): [number, number][] {
  const toRadians = (value: number) => value * Math.PI / 180
  const toDegrees = (value: number) => value * 180 / Math.PI
  const [lon1, lat1] = start.map(toRadians)
  const [lon2, lat2] = end.map(toRadians)
  const angle = 2 * Math.asin(Math.sqrt(Math.sin((lat2 - lat1) / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2))
  if (angle === 0) return [start, end]
  return Array.from({ length: steps + 1 }, (_value, index) => {
    const t = index / steps
    const a = Math.sin((1 - t) * angle) / Math.sin(angle)
    const b = Math.sin(t * angle) / Math.sin(angle)
    const x = a * Math.cos(lat1) * Math.cos(lon1) + b * Math.cos(lat2) * Math.cos(lon2)
    const y = a * Math.cos(lat1) * Math.sin(lon1) + b * Math.cos(lat2) * Math.sin(lon2)
    const z = a * Math.sin(lat1) + b * Math.sin(lat2)
    return [toDegrees(Math.atan2(y, x)), toDegrees(Math.atan2(z, Math.sqrt(x * x + y * y)))]
  }) as [number, number][]
}

function polygonRings(geometry: Geometry): Position[][] {
  if (geometry.type === 'Polygon') return geometry.coordinates
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.flat()
  return []
}

function ringPath(ring: Position[]): string {
  return ring.map((position, index) => {
    const [x, y] = project([position[0], position[1]])
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ') + ' Z'
}

const topology = worldTopology as unknown as Topology
const landFeature = feature(topology, topology.objects.land) as Feature<Geometry> | FeatureCollection<Geometry>
const landPath = (landFeature.type === 'FeatureCollection' ? landFeature.features : [landFeature])
  .flatMap((item) => polygonRings(item.geometry))
  .map(ringPath)
  .join(' ')

function splitRouteAtDateline(points: [number, number][]): [number, number][][] {
  const segments: [number, number][][] = [[]]
  points.forEach((point, index) => {
    if (index > 0 && Math.abs(point[0] - points[index - 1][0]) > 180) segments.push([])
    segments.at(-1)?.push(point)
  })
  return segments
}

function pathFromPoints(points: [number, number][]): string {
  return points.map((point, index) => {
    const [x, y] = project(point)
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
}

/**
 * The route, seen from above.
 *
 * The aircraft marker sits at the journey's *real* progress - day count over
 * total days. It previously had a "start world flight" button that flew a
 * marker along the route over twelve seconds and then reset: an animation
 * that showed nothing true and could be replayed forever, so it has been
 * dropped in favour of the position actually meaning something.
 */
export default function WorldRouteMap({ onClose }: { onClose: () => void }) {
  const journey = useJourneyStore((state) => state.journey)
  const progress = Math.max(
    0,
    Math.min(1, (daysBetween(journey.startDate) + 1) / Math.max(1, journey.totalDays)),
  )

  const origin = airportByIata(journey.originIata, AIRPORTS[0])
  const destination = airportByIata(journey.destinationIata, AIRPORTS[5])
  const route = useMemo(() => greatCircle(origin.coordinates, destination.coordinates), [destination.coordinates, origin.coordinates])
  const routeSegments = useMemo(() => splitRouteAtDateline(route), [route])
  const planeIndex = Math.min(route.length - 1, Math.floor(progress * (route.length - 1)))
  const planePoint = project(route[planeIndex])
  const planeAheadPoint = project(route[Math.min(route.length - 1, planeIndex + 1)])
  const planeBearing = Math.atan2(
    planeAheadPoint[0] - planePoint[0],
    -(planeAheadPoint[1] - planePoint[1]),
  ) * 180 / Math.PI
  const originPoint = project(origin.coordinates)
  const destinationPoint = project(destination.coordinates)

  return (
    <section className="world-map-layer" aria-label="Offline-Weltflugkarte">
      <div className="world-map-canvas world-map-offline">
        <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} preserveAspectRatio="xMidYMid slice" role="img" aria-label={`Flugroute von ${origin.city} nach ${destination.city}`}>
          <defs>
            <radialGradient id="world-ocean" cx="50%" cy="45%" r="75%"><stop offset="0" stopColor="#12324b" /><stop offset="1" stopColor="#030914" /></radialGradient>
            <linearGradient id="world-land" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#1c4b4c" /><stop offset="1" stopColor="#0c252c" /></linearGradient>
            <filter id="route-glow"><feGaussianBlur stdDeviation="5" /></filter>
          </defs>
          <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#world-ocean)" />
          <g className="world-map-grid" aria-hidden="true">{[-60, -30, 0, 30, 60].map((latitude) => { const [, y] = project([0, latitude]); return <line key={latitude} x1="0" x2={MAP_WIDTH} y1={y} y2={y} /> })}</g>
          <path className="world-map-land" d={landPath} fill="url(#world-land)" fillRule="evenodd" />
          {routeSegments.map((segment, index) => <path key={`glow-${index}`} className="world-route-glow" d={pathFromPoints(segment)} filter="url(#route-glow)" />)}
          {routeSegments.map((segment, index) => <path key={`route-${index}`} className="world-route-line" d={pathFromPoints(segment)} />)}
          <g className="world-airport-marker" transform={`translate(${originPoint[0]} ${originPoint[1]})`}><circle r="8" /><circle r="3" /><text y="-14">{origin.iata}</text></g>
          <g className="world-airport-marker destination" transform={`translate(${destinationPoint[0]} ${destinationPoint[1]})`}><circle r="10" /><circle r="3" /><text y="-16">{destination.iata}</text></g>
          <g className="world-map-plane" transform={`translate(${planePoint[0]} ${planePoint[1]})`}>
            <circle r="13" />
            <path
              className="world-map-plane-glyph"
              transform={`rotate(${planeBearing}) scale(0.62) translate(-12 -12)`}
              d="M12 1.4c.8 0 1.35.98 1.5 2.7l.06 1.9 6.9 4.36c.4.25.64.7.64 1.18v1.02c0 .5-.42.87-.9.78l-6.64-1.22v3.9l2.36 1.7c.22.16.35.42.35.7v.98c0 .5-.44.87-.92.77L12 18.9l-3.35 1.19c-.48.1-.92-.27-.92-.77v-.98c0-.28.13-.54.35-.7l2.36-1.7v-3.9l-6.64 1.22c-.48.09-.9-.28-.9-.78v-1.02c0-.48.24-.93.64-1.18l6.9-4.36.06-1.9c.15-1.72.7-2.7 1.5-2.7Z"
            />
          </g>
        </svg>
      </div>
      <header className="world-map-header">
        <button type="button" onClick={onClose} aria-label="Weltkarte schließen"><Glyph name="cross" size={16} /></button>
        <div><strong className="numeric">{origin.iata}<i aria-hidden="true" />{destination.iata}</strong></div>
        <span className="numeric">{Math.round(journey.totalDistanceKm).toLocaleString('de-DE')} km</span>
      </header>
      <div className="world-map-card">
        <div><span>{origin.city}</span><i /><span>{destination.city}</span></div>
        <div className="world-map-progress" aria-label={`${Math.round(progress * 100)} Prozent der Reise`}>
          <i><b style={{ width: `${progress * 100}%` }} /></i>
          <strong className="numeric">{Math.round(progress * 100)}%</strong>
        </div>
      </div>
    </section>
  )
}
