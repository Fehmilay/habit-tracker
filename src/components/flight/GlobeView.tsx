'use client'

import { Line } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import type { Line2 } from 'three-stdlib'
import {
  AdditiveBlending,
  BackSide,
  Color,
  type Group,
  type Mesh,
  type ShaderMaterial,
} from 'three'
import { color as tokens } from '@/lib/design/tokens'
import { createEarthTexture } from '@/lib/flight/earthTexture'
import { airportWorldPosition, greatCircleArcPoints } from '@/lib/flight/globeMath'
import { safeDelta } from '@/lib/flight/flightMath'
import { flightRuntime } from '@/lib/flight/flightRuntime'
import { GLOBE } from '@/lib/flight/sceneConfig'
import { createGlowTexture } from '@/lib/flight/textures'
import { SceneLabelSprite } from './SceneLabelSprite'

interface GlobeViewProps {
  originIata: string
  originCoordinates: [number, number]
  destinationIata: string
  destinationCoordinates: [number, number]
}

const ATMOSPHERE_VERTEX = /* glsl */ `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const ATMOSPHERE_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec3 vNormal;
  void main() {
    // Fresnel-style rim: brightest where the surface normal points away from
    // the camera, which is what reads as a thin glowing air layer at the limb.
    float rim = pow(1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0), 2.4);
    gl_FragColor = vec4(uColor, rim * uOpacity);
  }
`

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

/**
 * The globe: reached by zooming out on the flight scene (see `ChaseCamera`
 * and the wheel/pinch handler in `FlightSceneCanvas`).
 *
 * Shows the whole planned route at once - both airports and the great-circle
 * arc between them - which the chase view, being a first-person shot from just
 * behind the aircraft, structurally cannot. Fades in via `flightRuntime.zoomOut`
 * rather than mounting/unmounting outright, so the transition reads as pulling
 * back into space rather than a scene cut.
 *
 * All child positions (`airportWorldPosition`, `greatCircleArcPoints`) are
 * already expressed in world space, i.e. offset by `GLOBE.center`. The group
 * nesting below - translate to the centre, then back by its negative - looks
 * redundant but is what lets the outer group's rotation and scale pivot
 * around the globe's own centre instead of the world origin: a vertex's
 * offset from that centre survives the round trip unchanged, so rotating the
 * outer group spins the sphere in place rather than swinging it through space.
 */
export function GlobeView({
  originIata,
  originCoordinates,
  destinationIata,
  destinationCoordinates,
}: GlobeViewProps) {
  const groupRef = useRef<Group>(null)
  const earthMaterialRef = useRef<ShaderMaterial | null>(null)
  const atmosphereRef = useRef<ShaderMaterial>(null)
  const routeLineRef = useRef<Line2>(null)
  const earthMeshRef = useRef<Mesh>(null)

  const earthTexture = useMemo(() => createEarthTexture(), [])
  const glowTexture = useMemo(() => createGlowTexture(48), [])
  const atmosphereUniforms = useMemo(
    () => ({
      uColor: { value: new Color(tokens.course) },
      uOpacity: { value: 0 },
    }),
    [],
  )

  useLayoutEffect(
    () => () => {
      earthTexture?.dispose()
      glowTexture?.dispose()
    },
    [earthTexture, glowTexture],
  )

  const originPosition = useMemo(
    () => airportWorldPosition(originCoordinates[0], originCoordinates[1]),
    [originCoordinates],
  )
  const destinationPosition = useMemo(
    () => airportWorldPosition(destinationCoordinates[0], destinationCoordinates[1]),
    [destinationCoordinates],
  )

  const routePoints = useMemo(
    () =>
      greatCircleArcPoints(originCoordinates, destinationCoordinates, 96).map(
        (point): [number, number, number] => [point.x, point.y, point.z],
      ),
    [originCoordinates, destinationCoordinates],
  )

  useFrame((_state, delta) => {
    const dt = safeDelta(delta)
    const zoom = flightRuntime.zoomOut

    // Fades computed once here and applied to every material below, so all
    // the globe's parts appear and disappear together.
    const globeOpacity = smoothstep(GLOBE.fadeInStart, GLOBE.fadeInEnd, zoom)
    const scale = 0.85 + globeOpacity * 0.15

    if (groupRef.current) {
      if (dt > 0) groupRef.current.rotation.y += dt * 0.015 * globeOpacity
      groupRef.current.scale.setScalar(scale)
      groupRef.current.visible = globeOpacity > 0.003
    }

    if (earthMaterialRef.current) earthMaterialRef.current.opacity = globeOpacity
    if (atmosphereRef.current) atmosphereRef.current.uniforms.uOpacity.value = globeOpacity * 0.8
    if (routeLineRef.current) routeLineRef.current.material.opacity = globeOpacity
  })

  if (!earthTexture) return null

  return (
    <group ref={groupRef} position={[GLOBE.center.x, GLOBE.center.y, GLOBE.center.z]}>
      <group position={[-GLOBE.center.x, -GLOBE.center.y, -GLOBE.center.z]}>
        {/* Earth sphere. Rotated 180 degrees about Y so the equirectangular
            texture's seam lines up with this project's longitude convention
            (see the note in earthTexture.ts) rather than three's default. */}
        <mesh
          ref={earthMeshRef}
          position={[GLOBE.center.x, GLOBE.center.y, GLOBE.center.z]}
          rotation={[0, Math.PI, 0]}
        >
          <sphereGeometry args={[GLOBE.radius, 48, 32]} />
          <meshStandardMaterial
            ref={earthMaterialRef}
            map={earthTexture}
            roughness={0.85}
            metalness={0.05}
            transparent
            opacity={0}
            toneMapped={false}
          />
        </mesh>

        {/* Thin additive atmosphere shell, slightly larger than the globe. */}
        <mesh position={[GLOBE.center.x, GLOBE.center.y, GLOBE.center.z]} scale={1.045}>
          <sphereGeometry args={[GLOBE.radius, 32, 24]} />
          <shaderMaterial
            ref={atmosphereRef}
            vertexShader={ATMOSPHERE_VERTEX}
            fragmentShader={ATMOSPHERE_FRAGMENT}
            uniforms={atmosphereUniforms}
            transparent
            depthWrite={false}
            side={BackSide}
            blending={AdditiveBlending}
          />
        </mesh>

        {/* Great-circle route */}
        <Line
          ref={routeLineRef}
          points={routePoints}
          color={tokens.courseBright}
          lineWidth={2}
          transparent
          opacity={0}
          toneMapped={false}
        />

        <GlobeMarker
          position={originPosition}
          label={originIata}
          glowTexture={glowTexture}
          markerColor={tokens.correction}
        />
        <GlobeMarker
          position={destinationPosition}
          label={destinationIata}
          glowTexture={glowTexture}
          markerColor={tokens.projection}
        />
      </group>
    </group>
  )
}

interface GlobeMarkerProps {
  position: { x: number; y: number; z: number }
  label: string
  glowTexture: ReturnType<typeof createGlowTexture>
  markerColor: string
}

function GlobeMarker({ position, label, glowTexture, markerColor }: GlobeMarkerProps) {
  const pos: [number, number, number] = [position.x, position.y, position.z]
  // Push the label out along the same radial direction the marker sits on, so
  // it floats just above the surface rather than intersecting it.
  const radial =
    Math.hypot(
      position.x - GLOBE.center.x,
      position.y - GLOBE.center.y,
      position.z - GLOBE.center.z,
    ) || 1
  const labelScale = (GLOBE.radius + 7) / radial
  const labelPos: [number, number, number] = [
    GLOBE.center.x + (position.x - GLOBE.center.x) * labelScale,
    GLOBE.center.y + (position.y - GLOBE.center.y) * labelScale,
    GLOBE.center.z + (position.z - GLOBE.center.z) * labelScale,
  ]

  return (
    <group>
      <mesh position={pos}>
        <sphereGeometry args={[0.55, 12, 12]} />
        <meshBasicMaterial color={markerColor} toneMapped={false} />
      </mesh>
      {glowTexture ? (
        <sprite position={pos} scale={[3.2, 3.2, 3.2]}>
          <spriteMaterial
            map={glowTexture}
            color={markerColor}
            blending={AdditiveBlending}
            depthWrite={false}
            transparent
            opacity={0.85}
            toneMapped={false}
          />
        </sprite>
      ) : null}
      <SceneLabelSprite
        text={label}
        color={markerColor}
        position={labelPos}
        scale={[9, 2.4, 1]}
      />
    </group>
  )
}
