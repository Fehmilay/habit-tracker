'use client'

import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  Color,
  InstancedBufferAttribute,
  type InstancedMesh,
  Matrix4,
  NormalBlending,
  Quaternion,
  type ShaderMaterial,
  type Sprite,
  Vector3,
} from 'three'
import { flightRuntime } from '@/lib/flight/flightRuntime'
import { effectsFromSeverity } from '@/lib/flight/damage'
import { safeDelta } from '@/lib/flight/flightMath'
import { ENGINE_POSITIONS } from '@/lib/flight/aircraftGeometry'
import { createCloudTexture, createGlowTexture } from '@/lib/flight/textures'
import { gameRuntime } from '@/lib/game/gameRuntime'

/** Particle budget. Fixed, so a long bad streak cannot grow the scene. */
const PARTICLE_COUNT = 44

const PARTICLE_VERTEX = /* glsl */ `
  attribute float aAlpha;
  attribute float aTint;
  varying float vAlpha;
  varying float vTint;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vAlpha = aAlpha;
    vTint = aTint;
    vec4 worldPosition = modelMatrix * instanceMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`

const PARTICLE_FRAGMENT = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uSmoke;
  uniform vec3 uEmber;
  varying float vAlpha;
  varying float vTint;
  varying vec2 vUv;

  void main() {
    vec4 texel = texture2D(uMap, vUv);
    float alpha = texel.a * vAlpha;
    if (alpha < 0.004) discard;
    // vTint blends a cold smoke puff into a hot ember, so one particle system
    // covers both without a second draw call.
    vec3 tint = mix(uSmoke, uEmber, vTint);
    gl_FragColor = vec4(tint, alpha);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

interface Particle {
  life: number
  maxLife: number
  position: Vector3
  velocity: Vector3
  scale: number
  /** 0 = smoke, 1 = ember. */
  tint: number
}

function createParticle(): Particle {
  return {
    life: 0,
    maxLife: 1,
    position: new Vector3(),
    velocity: new Vector3(),
    scale: 1,
    tint: 0,
  }
}

/**
 * Smoke, sparks and fire streaming off a damaged aircraft.
 *
 * Particles live in world space, not parented to the aircraft: the aircraft
 * holds station at the origin while the world scrolls past it (see
 * sceneConfig), so a trail that followed the aircraft would hang motionless
 * beside it. Emitting into world space and drifting aft is what makes it read
 * as a trail being left behind.
 *
 * One instanced mesh covers both smoke and embers, distinguished by a
 * per-instance tint attribute, so the whole effect is a single draw call at
 * any severity.
 */
export function AircraftDamage() {
  const meshRef = useRef<InstancedMesh>(null)
  const materialRef = useRef<ShaderMaterial>(null)
  const fireRefs = useRef<Array<Sprite | null>>([])
  const emitAccumulator = useRef(0)

  const smokeTexture = useMemo(() => createCloudTexture(64), [])
  const glowTexture = useMemo(() => createGlowTexture(64), [])

  const particles = useRef<Particle[]>(
    Array.from({ length: PARTICLE_COUNT }, createParticle),
  )
  // Scratch objects, reused every frame so the particle loop allocates nothing.
  const scratch = useRef({
    matrix: new Matrix4(),
    rotation: new Quaternion(),
    scale: new Vector3(),
    origin: new Vector3(),
  })

  // Held in refs rather than useMemo: these buffers are written every frame,
  // and a value produced during render must not be mutated afterwards.
  const attributes = useRef({
    alpha: new InstancedBufferAttribute(new Float32Array(PARTICLE_COUNT), 1),
    tint: new InstancedBufferAttribute(new Float32Array(PARTICLE_COUNT), 1),
  })

  const uniforms = useMemo(
    () => ({
      uMap: { value: smokeTexture },
      uSmoke: { value: new Color('#20262e') },
      uEmber: { value: new Color('#ff8a3d') },
    }),
    [smokeTexture],
  )

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    mesh.geometry.setAttribute('aAlpha', attributes.current.alpha)
    mesh.geometry.setAttribute('aTint', attributes.current.tint)
  }, [])

  useLayoutEffect(
    () => () => {
      smokeTexture?.dispose()
      glowTexture?.dispose()
    },
    [smokeTexture, glowTexture],
  )

  useFrame((_state, delta) => {
    const dt = safeDelta(delta)
    const mesh = meshRef.current
    if (!mesh || dt === 0) return

    // The driver already folded deviation and miss rate into this and eased
    // it over time; this only expands it into per-effect intensities.
    const damage = effectsFromSeverity(flightRuntime.damageSeverity)

    // Emit from the engine on the side the aircraft is drifting toward: the
    // damage then reads as connected to the direction of the mistake.
    const drifting = flightRuntime.currentHeadingDegrees >= 0 ? 1 : 0
    const engine = ENGINE_POSITIONS[drifting]
    const origin = scratch.current.origin.set(
      engine[0] + gameRuntime.planeX,
      engine[1] + gameRuntime.planeY + flightRuntime.verticalOffset,
      engine[2],
    )

    // Emission rate scales with smoke intensity; at zero nothing is emitted
    // and the existing particles simply finish their lives and vanish.
    const rate = damage.smoke * 26
    emitAccumulator.current += rate * dt
    let budget = emitAccumulator.current

    const list = particles.current
    for (let index = 0; index < list.length; index += 1) {
      const particle = list[index]

      if (particle.life > 0) {
        particle.life -= dt
        particle.position.addScaledVector(particle.velocity, dt)
        // Embers fall away and cool; smoke rises and expands.
        particle.velocity.y += (particle.tint > 0.5 ? -5 : 1.6) * dt
      } else if (budget >= 1) {
        budget -= 1

        // A spark burst rides along whenever sparks are active; the rest is smoke.
        const ember = Math.random() < damage.sparks * 0.45
        particle.tint = ember ? 1 : 0
        particle.maxLife = ember ? 0.45 + Math.random() * 0.3 : 1.1 + Math.random() * 0.9
        particle.life = particle.maxLife
        particle.scale = ember ? 0.25 + Math.random() * 0.3 : 1.1 + Math.random() * 1.6
        particle.position.copy(origin)
        particle.velocity.set(
          (Math.random() - 0.5) * (ember ? 6 : 1.6),
          (Math.random() - 0.5) * (ember ? 5 : 1.2),
          // Aft at roughly the speed the world is moving past.
          22 + Math.random() * (ember ? 16 : 6),
        )
      }

      const alive = particle.life > 0
      const t = alive ? particle.life / particle.maxLife : 0
      // Fade in quickly, out slowly.
      const fade = alive ? Math.min(1, (1 - t) * 6) * t : 0

      attributes.current.alpha.setX(index, fade * (particle.tint > 0.5 ? 0.95 : 0.55))
      attributes.current.tint.setX(index, particle.tint)

      const grow = particle.tint > 0.5 ? particle.scale : particle.scale * (1 + (1 - t) * 1.6)
      mesh.setMatrixAt(
        index,
        scratch.current.matrix.compose(
          particle.position,
          scratch.current.rotation,
          scratch.current.scale.set(grow, grow, 1),
        ),
      )
    }

    emitAccumulator.current = budget
    mesh.instanceMatrix.needsUpdate = true
    attributes.current.alpha.needsUpdate = true
    attributes.current.tint.needsUpdate = true

    // Fire sits on the engines themselves and flickers.
    for (let index = 0; index < fireRefs.current.length; index += 1) {
      const sprite = fireRefs.current[index]
      if (!sprite) continue
      const flicker =
        0.72 +
        0.28 * Math.sin(flightRuntime.elapsedSeconds * 21 + index * 2.1) *
          Math.sin(flightRuntime.elapsedSeconds * 7.3 + index)
      const strength = damage.fire * flicker
      sprite.visible = strength > 0.01
      sprite.material.opacity = strength
      const size = 1.5 + strength * 1.9
      sprite.scale.set(size, size, size)
      sprite.position.set(
        ENGINE_POSITIONS[index][0] + gameRuntime.planeX,
        ENGINE_POSITIONS[index][1] + gameRuntime.planeY + flightRuntime.verticalOffset,
        ENGINE_POSITIONS[index][2] + 0.4,
      )
    }
  })

  if (!smokeTexture || !glowTexture) return null

  return (
    <group name="aircraft-damage">
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, PARTICLE_COUNT]}
        frustumCulled={false}
        renderOrder={20}
      >
        <planeGeometry args={[1, 1]} />
        <shaderMaterial
          ref={materialRef}
          vertexShader={PARTICLE_VERTEX}
          fragmentShader={PARTICLE_FRAGMENT}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={NormalBlending}
          fog={false}
        />
      </instancedMesh>

      {ENGINE_POSITIONS.map((position, index) => (
        <sprite
          key={`fire-${index}`}
          ref={(sprite: Sprite | null) => {
            fireRefs.current[index] = sprite
          }}
          position={[position[0], position[1], position[2] + 0.4]}
          scale={[1.5, 1.5, 1.5]}
          visible={false}
        >
          <spriteMaterial
            map={glowTexture}
            color="#ff7a2a"
            blending={AdditiveBlending}
            depthWrite={false}
            transparent
            opacity={0}
            toneMapped={false}
          />
        </sprite>
      ))}
    </group>
  )
}
