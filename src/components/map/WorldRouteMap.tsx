'use client'

import * as maplibregl from 'maplibre-gl'
import type { LngLatLike, Map as MapLibreMap } from 'maplibre-gl'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AIRPORTS, airportByIata } from '@/lib/maps/airports'
import { useJourneyStore } from '@/store/journeyStore'

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty'

function greatCircle(start: [number, number], end: [number, number], steps = 120): [number, number][] {
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

function bearing(from: [number, number], to: [number, number]): number {
  const radians = (value: number) => value * Math.PI / 180
  const y = Math.sin(radians(to[0] - from[0])) * Math.cos(radians(to[1]))
  const x = Math.cos(radians(from[1])) * Math.sin(radians(to[1])) - Math.sin(radians(from[1])) * Math.cos(radians(to[1])) * Math.cos(radians(to[0] - from[0]))
  return Math.atan2(y, x) * 180 / Math.PI
}

export default function WorldRouteMap({ onClose }: { onClose: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markerRef = useRef<maplibregl.Marker | null>(null)
  const frameRef = useRef<number | null>(null)
  const journey = useJourneyStore((state) => state.journey)
  const [ready, setReady] = useState(false)
  const [mapError, setMapError] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)

  const origin = airportByIata(journey.originIata, AIRPORTS[0])
  const destination = airportByIata(journey.destinationIata, AIRPORTS[5])
  const route = useMemo(() => greatCircle(origin.coordinates, destination.coordinates), [destination.coordinates, origin.coordinates])

  const fitRoute = useCallback(() => {
    const map = mapRef.current
    if (!map) return
    const bounds = route.reduce((current, point) => current.extend(point as LngLatLike), new maplibregl.LngLatBounds(route[0], route[0]))
    map.fitBounds(bounds, { padding: { top: 130, right: 44, bottom: 180, left: 44 }, duration: 900, maxZoom: 5 })
  }, [route])

  useEffect(() => {
    if (!containerRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: origin.coordinates,
      zoom: 2.2,
      pitch: 34,
      attributionControl: { compact: true },
    })
    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')
    const plane = document.createElement('div')
    plane.className = 'world-map-plane'
    plane.textContent = '✈'
    const marker = new maplibregl.Marker({ element: plane, rotationAlignment: 'map' }).setLngLat(origin.coordinates).addTo(map)
    markerRef.current = marker

    map.on('load', () => {
      map.addSource('flight-route', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: route } } })
      map.addLayer({ id: 'flight-route-glow', type: 'line', source: 'flight-route', paint: { 'line-color': '#7cc9ff', 'line-width': 8, 'line-opacity': 0.18 } })
      map.addLayer({ id: 'flight-route', type: 'line', source: 'flight-route', paint: { 'line-color': '#c4e8ff', 'line-width': 2.5, 'line-opacity': 0.9 } })
      setReady(true)
      window.setTimeout(fitRoute, 50)
    })
    map.on('error', () => {
      if (!map.loaded()) setMapError(true)
    })

    return () => {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current)
      marker.remove()
      map.remove()
      mapRef.current = null
    }
  }, [fitRoute, origin.coordinates, route])

  const startFlight = () => {
    if (!ready || playing) return
    setPlaying(true)
    const startedAt = performance.now()
    const duration = 18_000
    let lastCameraUpdate = 0
    const animate = (time: number) => {
      const value = Math.min(1, (time - startedAt) / duration)
      const eased = value < 0.5 ? 2 * value * value : 1 - (-2 * value + 2) ** 2 / 2
      const index = Math.min(route.length - 1, Math.floor(eased * (route.length - 1)))
      const point = route[index]
      const next = route[Math.min(route.length - 1, index + 1)]
      markerRef.current?.setLngLat(point).setRotation(bearing(point, next))
      setProgress(value)
      if (time - lastCameraUpdate > 220) {
        mapRef.current?.easeTo({ center: point, zoom: 4.6, pitch: 58, bearing: bearing(point, next), duration: 300, essential: true })
        lastCameraUpdate = time
      }
      if (value < 1) frameRef.current = window.requestAnimationFrame(animate)
      else {
        setPlaying(false)
        window.setTimeout(fitRoute, 600)
      }
    }
    frameRef.current = window.requestAnimationFrame(animate)
  }

  return (
    <section className="world-map-layer" aria-label="Weltflugkarte">
      <div ref={containerRef} className="world-map-canvas" />
      {!ready ? <div className="world-map-loading"><strong>{mapError ? 'Karte gerade nicht erreichbar' : 'Weltkarte wird geladen'}</strong><span>{mapError ? 'Prüfe deine Verbindung und versuche es erneut.' : 'Route wird vorbereitet …'}</span></div> : null}
      <header className="world-map-header">
        <button type="button" onClick={onClose} aria-label="Weltkarte schließen">×</button>
        <div><span>DEINE WELTROUTE</span><strong>{origin.iata} → {destination.iata}</strong></div>
        <span>{Math.round(journey.totalDistanceKm).toLocaleString('de-DE')} km</span>
      </header>
      <div className="world-map-card">
        <div><span>{origin.city}</span><i /><span>{destination.city}</span></div>
        <button type="button" className="primary-button" onClick={startFlight} disabled={!ready || playing}>{playing ? `${Math.round(progress * 100)}% UNTERWEGS` : '▶ WELTFLUG STARTEN'}</button>
        <small>Karten: OpenFreeMap · OpenStreetMap</small>
      </div>
    </section>
  )
}
