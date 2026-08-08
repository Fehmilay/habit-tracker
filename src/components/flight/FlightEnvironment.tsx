'use client'

import { useFrame, useStore } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  DataTexture,
  DoubleSide,
  EquirectangularReflectionMapping,
  FloatType,
  type Group,
  type InstancedMesh,
  LinearFilter,
  Matrix4,
  PMREMGenerator,
  type Points,
  Quaternion,
  RGBAFormat,
  type ShaderMaterial,
  Vector3,
} from 'three'
import { color } from '@/lib/design/tokens'
import {
  CLOUD_DECK_FRAGMENT_SHADER,
  CLOUD_DECK_VERTEX_SHADER,
  SKY_FRAGMENT_SHADER,
  SKY_VERTEX_SHADER,
} from '@/lib/flight/shaders'
import { ENVIRONMENT } from '@/lib/flight/sceneConfig'
import { safeDelta } from '@/lib/flight/flightMath'
import { createCloudTexture, createStarTexture } from '@/lib/flight/textures'
import { useFlightStore } from '@/store/flightStore'

/**
 * Where the sun sits in the sky: low and ahead to starboard, so it reads as a
 * late, atmospheric light near the horizon.
 */
const SUN_DIRECTION = new Vector3(0.9, 0.085, -0.43).normalize()

/**
 * Direction the key light comes from: behind, above and slightly to port.
 *
 * Not the same as the visible sun, deliberately. The chase camera only ever
 * sees the aircraft's upper rear surfaces, and lighting purely from the sun
 * ahead leaves those in shadow - the aircraft collapses into a flat silhouette
 * and none of the modelled detail survives. Keying from behind the camera is
 * the standard way to light a subject that is always viewed from one side.
 */
const KEY_LIGHT_DIRECTION = new Vector3(-0.38, 0.66, 0.65).normalize()

/**
 * Deterministic pseudo-random value in [0, 1) for a given index.
 *
 * A pure function of its input rather than a running seed, so cloud and star
 * layouts are reproducible across reloads and screenshots stay comparable -
 * and there is no mutable state captured in a render closure.
 */
function seededRandom(index: number): number {
  const value = Math.sin(index * 12.9898 + 78.233) * 43758.5453123
  return value - Math.floor(value)
}

interface FlightEnvironmentProps {
  cloudCount: number
  starCount: number
  showCloudDeck: boolean
  ambientMotion: number
}

/**
 * Sky, light, clouds and depth cues.
 *
 * The environment carries the sense of forward motion. The aircraft itself is
 * pinned at the origin, so if the clouds stopped scrolling the scene would read
 * as a hovering model rather than a cruising aeroplane.
 */
export function FlightEnvironment({
  cloudCount,
  starCount,
  showCloudDeck,
  ambientMotion,
}: FlightEnvironmentProps) {
  return (
    <>
      <SkyDome />
      <SceneLighting />
      <ReflectionEnvironment />

      <hemisphereLight
        args={[new Color(color.skyHaze), new Color(color.nightDeep), 0.42]}
      />

      {starCount > 0 ? <StarField count={starCount} /> : null}
      {showCloudDeck ? <CloudDeck /> : null}
      <CloudField count={cloudCount} ambientMotion={ambientMotion} />

      <fogExp2
        attach="fog"
        args={[new Color(color.skyHorizon).getHex(), ENVIRONMENT.fogDensity]}
      />
    </>
  )
}

/**
 * Gradient sky dome, re-centred on the camera every frame so it is unreachable
 * no matter how long the flight runs.
 */
function SkyDome() {
  const groupRef = useRef<Group>(null)

  const uniforms = useMemo(
    () => ({
      uZenith: { value: new Color(color.skyZenith) },
      uHigh: { value: new Color(color.skyHigh) },
      uMid: { value: new Color(color.skyMid) },
      uHorizon: { value: new Color(color.skyHorizon) },
      uHaze: { value: new Color(color.skyHaze) },
      uSunColor: { value: new Color('#ffd9a8') },
      uSunDirection: { value: SUN_DIRECTION.clone() },
    }),
    [],
  )

  useFrame((state) => {
    groupRef.current?.position.copy(state.camera.position)
  })

  return (
    <group ref={groupRef}>
      <mesh frustumCulled={false} renderOrder={-1000}>
        <sphereGeometry args={[ENVIRONMENT.skyRadius, 32, 20]} />
        <shaderMaterial
          vertexShader={SKY_VERTEX_SHADER}
          fragmentShader={SKY_FRAGMENT_SHADER}
          uniforms={uniforms}
          side={BackSide}
          depthWrite={false}
          fog={false}
        />
      </mesh>
    </group>
  )
}

function SceneLighting() {
  const keyPosition = useMemo(
    () => KEY_LIGHT_DIRECTION.clone().multiplyScalar(400),
    [],
  )
  const rimPosition = useMemo(() => SUN_DIRECTION.clone().multiplyScalar(400), [])
  const fillPosition = useMemo(() => new Vector3(-160, -120, 90), [])

  return (
    <>
      {/* Key: models the hull, wings and engines for the chase camera. */}
      <directionalLight position={keyPosition} intensity={2.35} color="#dce8f6" />
      {/* Rim from the sun ahead, catching the leading edges. */}
      <directionalLight position={rimPosition} intensity={0.85} color="#ffd9a8" />
      {/* Cold bounce from below, standing in for light off the cloud deck. */}
      <directionalLight position={fillPosition} intensity={0.3} color="#3f6d9e" />
      <ambientLight intensity={0.14} color="#7fa0c2" />
    </>
  )
}

/**
 * A tiny equirectangular gradient, pre-filtered into an environment map.
 *
 * Gives the metallic hull something to reflect. Generated rather than loaded:
 * an HDR file would be tens of times larger than the entire rest of the app,
 * and at this roughness a two-stop gradient is indistinguishable from one.
 */
function ReflectionEnvironment() {
  // The R3F store, rather than a snapshot of gl/scene taken during render -
  // the renderer and scene are only touched inside this effect.
  const store = useStore()

  useEffect(() => {
    const { gl, scene } = store.getState()

    const width = 32
    const height = 16
    const data = new Float32Array(width * height * 4)

    const sky = new Color(color.skyMid)
    const horizon = new Color(color.skyHorizon)
    const ground = new Color(color.nightSoft)

    for (let y = 0; y < height; y += 1) {
      // v = 0 at the top of the equirect map.
      const v = y / (height - 1)
      const mixed = new Color()
      if (v < 0.5) {
        mixed.copy(sky).lerp(horizon, v / 0.5)
      } else {
        mixed.copy(horizon).lerp(ground, (v - 0.5) / 0.5)
      }

      for (let x = 0; x < width; x += 1) {
        const index = (y * width + x) * 4
        data[index] = mixed.r
        data[index + 1] = mixed.g
        data[index + 2] = mixed.b
        data[index + 3] = 1
      }
    }

    const texture = new DataTexture(data, width, height, RGBAFormat, FloatType)
    texture.mapping = EquirectangularReflectionMapping
    texture.minFilter = LinearFilter
    texture.magFilter = LinearFilter
    texture.needsUpdate = true

    const pmrem = new PMREMGenerator(gl)
    const target = pmrem.fromEquirectangular(texture)
    scene.environment = target.texture

    return () => {
      scene.environment = null
      target.dispose()
      pmrem.dispose()
      texture.dispose()
    }
  }, [store])

  return null
}

/**
 * Instanced cloud billboards.
 *
 * One draw call for the whole field. The instances are not individually
 * billboarded - instead the parent group is yawed to face the camera once per
 * frame. From a chase camera the view direction only varies by a few degrees,
 * so the difference is invisible and it saves recomputing every instance
 * orientation.
 */
/**
 * Frame-loop scratch objects.
 *
 * Module-level and reused, following the same pattern as the rest of the
 * scene: the cloud field runs every frame over every instance, and allocating
 * a matrix, three vectors and a quaternion per frame hands the garbage
 * collector work purely so the code can read a line shorter.
 */
const SCRATCH_DIRECTION = new Vector3()
const SCRATCH_MATRIX = new Matrix4()
const SCRATCH_POSITION = new Vector3()
const SCRATCH_QUATERNION = new Quaternion()
const SCRATCH_SCALE = new Vector3()
const SPIN_AXIS = new Vector3(0, 0, 1)

function CloudField({
  count,
  ambientMotion,
}: {
  count: number
  ambientMotion: number
}) {
  const meshRef = useRef<InstancedMesh>(null)
  const groupRef = useRef<Group>(null)
  const speed = useFlightStore((state) => state.speed)
  const texture = useMemo(() => createCloudTexture(), [])

  // How far the field has scrolled. Kept as a single number so the cloud
  // descriptors below stay immutable - each cloud's Z is derived from its base
  // position and this offset rather than being advanced in place.
  const scrollRef = useRef(0)

  // Deterministic layout: a fixed pseudo-random sequence, so every session sees
  // the same sky and screenshots stay comparable.
  const clouds = useMemo(
    () =>
      Array.from({ length: count }, (_value, index) => {
        const base = index * 8 + 1
        const high = seededRandom(base) > 0.72
        return {
          x: (seededRandom(base + 1) - 0.5) * 2 * ENVIRONMENT.cloudSpreadX,
          y: high
            ? 12 + seededRandom(base + 2) * 46 // a few wisps above flight level
            : -12 - seededRandom(base + 2) * 58,
          baseZ:
            ENVIRONMENT.cloudSpawnZ +
            seededRandom(base + 3) *
              (ENVIRONMENT.cloudRecycleZ - ENVIRONMENT.cloudSpawnZ),
          scale: 22 + seededRandom(base + 4) * 62,
          tilt: (seededRandom(base + 5) - 0.5) * 0.5,
          brightness: 0.5 + seededRandom(base + 6) * 0.5,
          // Parallax: distant clouds drift past more slowly.
          speedFactor: 0.55 + seededRandom(base + 7) * 0.7,
        }
      }),
    [count],
  )

  const span = ENVIRONMENT.cloudRecycleZ - ENVIRONMENT.cloudSpawnZ

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return

    const tint = new Color()
    const shadow = new Color(color.cloudShadow)
    const lit = new Color(color.cloudLit)

    clouds.forEach((cloud, index) => {
      tint.copy(shadow).lerp(lit, cloud.brightness)
      mesh.setColorAt(index, tint)
    })

    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [clouds])

  useFrame((state, delta) => {
    const dt = safeDelta(delta)
    const mesh = meshRef.current
    if (!mesh || dt === 0) return

    // Face the camera's yaw, without copying its roll - clouds should never
    // appear to bank with the aircraft.
    if (groupRef.current) {
      state.camera.getWorldDirection(SCRATCH_DIRECTION)
      groupRef.current.rotation.y =
        Math.atan2(SCRATCH_DIRECTION.x, SCRATCH_DIRECTION.z) + Math.PI
    }

    scrollRef.current += speed * dt * (0.35 + 0.65 * ambientMotion)
    const scroll = scrollRef.current

    clouds.forEach((cloud, index) => {
      // Wrap into the spawn..recycle band. Deriving Z rather than accumulating
      // it also means the field never drifts from floating-point error.
      const travelled = cloud.baseZ - ENVIRONMENT.cloudSpawnZ + scroll * cloud.speedFactor
      const z = ENVIRONMENT.cloudSpawnZ + (travelled % span)

      SCRATCH_POSITION.set(cloud.x, cloud.y, z)
      SCRATCH_QUATERNION.setFromAxisAngle(SPIN_AXIS, cloud.tilt)
      SCRATCH_SCALE.set(cloud.scale, cloud.scale * 0.62, 1)
      mesh.setMatrixAt(
        index,
        SCRATCH_MATRIX.compose(SCRATCH_POSITION, SCRATCH_QUATERNION, SCRATCH_SCALE),
      )
    })

    mesh.instanceMatrix.needsUpdate = true
  })

  useLayoutEffect(() => () => texture?.dispose(), [texture])

  if (!texture) return null

  return (
    <group ref={groupRef}>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, count]}
        frustumCulled={false}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={texture}
          transparent
          depthWrite={false}
          opacity={0.62}
          side={DoubleSide}
        />
      </instancedMesh>
    </group>
  )
}

/** Thin procedural cloud layer far below, establishing altitude. */
function CloudDeck() {
  const materialRef = useRef<ShaderMaterial>(null)
  const speed = useFlightStore((state) => state.speed)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uLitColor: { value: new Color(color.cloudLit) },
      uShadowColor: { value: new Color(color.cloudShadow) },
      uOpacity: { value: 0.5 },
      uScale: { value: 26 },
    }),
    [],
  )

  useFrame((_state, delta) => {
    const dt = safeDelta(delta)
    if (materialRef.current) {
      // Scaled down heavily: the deck is far away, so it should crawl.
      materialRef.current.uniforms.uTime.value -= dt * speed * 0.0016
    }
  })

  return (
    <mesh
      position={[0, ENVIRONMENT.cloudDeckY, -700]}
      rotation={[-Math.PI / 2, 0, 0]}
      frustumCulled={false}
    >
      <planeGeometry args={[5200, 5200, 1, 1]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={CLOUD_DECK_VERTEX_SHADER}
        fragmentShader={CLOUD_DECK_FRAGMENT_SHADER}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={DoubleSide}
        fog={false}
      />
    </mesh>
  )
}

/** Faint stars near the zenith, for the dusk atmosphere. */
function StarField({ count }: { count: number }) {
  const pointsRef = useRef<Points>(null)
  const texture = useMemo(() => createStarTexture(), [])

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const radius = ENVIRONMENT.skyRadius * 0.85

    for (let i = 0; i < count; i += 1) {
      // Upper hemisphere only, biased toward the zenith where the sky is dark
      // enough for stars to be plausible.
      const theta = seededRandom(i * 2 + 3001) * Math.PI * 2
      const elevation = 0.28 + seededRandom(i * 2 + 3002) * 1.2
      positions[i * 3] = Math.cos(theta) * Math.cos(elevation) * radius
      positions[i * 3 + 1] = Math.sin(elevation) * radius
      positions[i * 3 + 2] = Math.sin(theta) * Math.cos(elevation) * radius
    }

    const buffer = new BufferGeometry()
    buffer.setAttribute('position', new BufferAttribute(positions, 3))
    return buffer
  }, [count])

  useFrame((state) => {
    pointsRef.current?.position.copy(state.camera.position)
  })

  useLayoutEffect(
    () => () => {
      geometry.dispose()
      texture?.dispose()
    },
    [geometry, texture],
  )

  if (!texture) return null

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false} renderOrder={-900}>
      <pointsMaterial
        map={texture}
        size={26}
        sizeAttenuation
        transparent
        opacity={0.55}
        depthWrite={false}
        blending={AdditiveBlending}
        fog={false}
      />
    </points>
  )
}

export { SUN_DIRECTION }
export type { FlightEnvironmentProps }
