'use client'

import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  type Group,
  type InstancedMesh,
  Matrix4,
  Quaternion,
  type ShaderMaterial,
  Vector3,
} from 'three'
import { color } from '@/lib/design/tokens'
import {
  CORRIDOR_FRAGMENT_SHADER,
  COURSE_GATE_FRAGMENT_SHADER,
  COURSE_GATE_VERTEX_SHADER,
  COURSE_RIBBON_FRAGMENT_SHADER,
  COURSE_RIBBON_VERTEX_SHADER,
} from '@/lib/flight/shaders'
import { COURSE_LINE } from '@/lib/flight/sceneConfig'
import { degToRad, safeDelta } from '@/lib/flight/flightMath'
import { useFlightStore } from '@/store/flightStore'

const RIBBON_LENGTH = Math.abs(COURSE_LINE.farZ - COURSE_LINE.nearZ)
const RIBBON_CENTRE_Z = (COURSE_LINE.nearZ + COURSE_LINE.farZ) / 2

interface CourseLineProps {
  gateCount: number
}

/**
 * The planned course, drawn as a glowing ribbon running to the horizon.
 *
 * The line is anchored to the *planned* heading in world space, not to the
 * aircraft. That is the whole mechanism behind the scene's central idea: since
 * the camera converges on the aircraft's heading, an aircraft that is 3 degrees
 * off course keeps the line permanently 3 degrees off to one side of the frame,
 * where it stays until the deviation is actually corrected. At 0 degrees it
 * sits dead centre.
 *
 * It is placed below the aircraft so the fuselage never hides it, and it
 * recedes in true perspective rather than being drawn as a screen-space line.
 */
export function CourseLine({ gateCount }: CourseLineProps) {
  const plannedHeadingDegrees = useFlightStore((state) => state.plannedHeadingDegrees)
  const speed = useFlightStore((state) => state.speed)

  const ribbonMaterialRef = useRef<ShaderMaterial>(null)
  const gatesRef = useRef<InstancedMesh>(null)
  const gateGroupRef = useRef<Group>(null)
  const gateOffsetRef = useRef(0)

  const ribbonUniforms = useMemo(
    () => ({
      uColor: { value: new Color(color.correction) },
      uCoreColor: { value: new Color(color.projectionSoft) },
      uTime: { value: 0 },
      uDashLength: { value: COURSE_LINE.dashLength },
      uDashGap: { value: COURSE_LINE.dashGap },
      uLength: { value: RIBBON_LENGTH },
      uOpacity: { value: 0.95 },
    }),
    [],
  )

  const corridorUniforms = useMemo(
    () => ({
      uColor: { value: new Color('#14725f') },
      // Very low: the corridor is a hint, not a structure. Anything brighter
      // reads as a glowing runway and competes with the course line itself.
      uOpacity: { value: 0.22 },
    }),
    [],
  )

  const gateUniforms = useMemo(
    () => ({
      uColor: { value: new Color(color.correction) },
      uOpacity: { value: 0.55 },
    }),
    [],
  )

  // Gates sit at fixed intervals starting one spacing beyond the ribbon's near
  // end, so the row can be scrolled and recycled as a single unit.
  const gatePositions = useMemo(() => {
    const start = COURSE_LINE.nearZ - COURSE_LINE.gateSpacing
    const positions: Array<[number, number]> = []
    for (let i = 0; i < gateCount; i += 1) {
      const z = start - i * COURSE_LINE.gateSpacing
      positions.push([-COURSE_LINE.width / 2 - 0.55, z])
      positions.push([COURSE_LINE.width / 2 + 0.55, z])
    }
    return positions
  }, [gateCount])

  useLayoutEffect(() => {
    const gates = gatesRef.current
    if (!gates) return

    const matrix = new Matrix4()
    const position = new Vector3()
    const quaternion = new Quaternion()
    const scale = new Vector3(0.5, 1.6, 1)

    gatePositions.forEach(([x, z], index) => {
      position.set(x, COURSE_LINE.y + 0.8, z)
      gates.setMatrixAt(index, matrix.compose(position, quaternion, scale))
    })
    gates.instanceMatrix.needsUpdate = true
  }, [gatePositions])

  useFrame((_state, delta) => {
    const dt = safeDelta(delta)
    if (dt === 0) return

    const travel = speed * dt

    if (ribbonMaterialRef.current) {
      ribbonMaterialRef.current.uniforms.uTime.value += travel
    }

    // Shift the whole gate row toward the aircraft, wrapping every spacing.
    // Because the gates are evenly spaced, wrapping is invisible in the middle
    // of the row; the shader's near fade covers the one that drops off.
    if (gateGroupRef.current) {
      gateOffsetRef.current += travel
      if (gateOffsetRef.current >= COURSE_LINE.gateSpacing) {
        gateOffsetRef.current -= COURSE_LINE.gateSpacing
      }
      gateGroupRef.current.position.z = gateOffsetRef.current
    }
  })

  return (
    <group rotation={[0, -degToRad(plannedHeadingDegrees), 0]} name="course-line">
      {/* Faint target corridor around the line */}
      <mesh
        position={[0, COURSE_LINE.y - 0.02, RIBBON_CENTRE_Z]}
        rotation={[-Math.PI / 2, 0, 0]}
        frustumCulled={false}
        renderOrder={5}
      >
        <planeGeometry args={[COURSE_LINE.corridorHalfWidth * 2, RIBBON_LENGTH]} />
        <shaderMaterial
          vertexShader={COURSE_RIBBON_VERTEX_SHADER}
          fragmentShader={CORRIDOR_FRAGMENT_SHADER}
          uniforms={corridorUniforms}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          side={DoubleSide}
          fog={false}
        />
      </mesh>

      {/* The course line itself */}
      <mesh
        position={[0, COURSE_LINE.y, RIBBON_CENTRE_Z]}
        rotation={[-Math.PI / 2, 0, 0]}
        frustumCulled={false}
        renderOrder={6}
      >
        <planeGeometry args={[COURSE_LINE.width, RIBBON_LENGTH]} />
        <shaderMaterial
          ref={ribbonMaterialRef}
          vertexShader={COURSE_RIBBON_VERTEX_SHADER}
          fragmentShader={COURSE_RIBBON_FRAGMENT_SHADER}
          uniforms={ribbonUniforms}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          side={DoubleSide}
          fog={false}
        />
      </mesh>

      {/* Vertical light gates, giving the line depth and a sense of speed */}
      <group ref={gateGroupRef}>
        <instancedMesh
          ref={gatesRef}
          args={[undefined, undefined, gatePositions.length]}
          frustumCulled={false}
          renderOrder={7}
        >
          <planeGeometry args={[1, 1]} />
          <shaderMaterial
            vertexShader={COURSE_GATE_VERTEX_SHADER}
            fragmentShader={COURSE_GATE_FRAGMENT_SHADER}
            uniforms={gateUniforms}
            transparent
            depthWrite={false}
            blending={AdditiveBlending}
            side={DoubleSide}
            fog={false}
          />
        </instancedMesh>
      </group>
    </group>
  )
}
