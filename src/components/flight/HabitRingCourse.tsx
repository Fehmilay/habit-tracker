'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, type Group, type Mesh, MeshBasicMaterial } from 'three'
import { gameRuntime } from '@/lib/game/gameRuntime'
import { safeDelta } from '@/lib/flight/flightMath'
import { focusHaptic } from '@/lib/native/ios'
import { useJourneyStore } from '@/store/journeyStore'

/** How many ring slots exist. They are recycled forever, never added to. */
const RING_SLOTS = 5
const RING_SPACING = 78
const RING_RADIUS = 3.5
/** Z at which a ring counts as passed and is scored. */
const SCORE_Z = 2
const GAME_SPEED = 19
/** Squared hit radius: generous enough to feel fair on a phone. */
const HIT_RADIUS_SQUARED = 12.25

/**
 * Lateral/vertical offsets the rings cycle through.
 *
 * A fixed loop rather than random placement: the player should be able to
 * learn the rhythm, and a random stream occasionally deals two far-apart
 * rings back to back, which reads as unfair rather than difficult.
 */
const PATTERN = [
  { x: -3.8, y: 0.8 },
  { x: 3.2, y: -1.4 },
  { x: -1.8, y: 2.1 },
  { x: 4.2, y: 0.4 },
  { x: 0, y: -2.2 },
  { x: -4.2, y: 1.5 },
  { x: 2.4, y: 2.4 },
]

interface RingSlot {
  z: number
  /** Index into PATTERN, decides where this ring sits. */
  pattern: number
  /** Which habit this ring currently represents. */
  habit: number
  /** null while ahead, true/false once scored - drives the colour. */
  result: boolean | null
}

/**
 * The endless habit-ring course.
 *
 * The flight never stops and never has to be started, so this is a recycling
 * stream rather than a finite list: five ring slots march toward the aircraft,
 * and each one that passes is scored and immediately re-dealt far ahead with
 * the next habit and next pattern position. That keeps the geometry count
 * fixed no matter how long someone flies.
 */
export function HabitRingCourse({ active }: { active: boolean }) {
  const habits = useJourneyStore((state) => state.habits)
  const registerRing = useJourneyStore((state) => state.registerGameRing)

  const groupRefs = useRef<Array<Group | null>>([])
  const materialRefs = useRef<Array<MeshBasicMaterial | null>>([])
  const dealt = useRef(0)

  const ringHabits = useMemo(
    () => habits.filter((habit) => !habit.archived),
    [habits],
  )

  const slots = useRef<RingSlot[]>(
    Array.from({ length: RING_SLOTS }, (_value, index) => ({
      z: -140 - index * RING_SPACING,
      pattern: index % PATTERN.length,
      habit: index,
      result: null,
    })),
  )

  useFrame((_state, delta) => {
    const dt = safeDelta(delta)
    if (!active || dt === 0 || ringHabits.length === 0) return

    gameRuntime.travel += GAME_SPEED * dt

    for (let index = 0; index < slots.current.length; index += 1) {
      const slot = slots.current[index]
      slot.z += GAME_SPEED * dt

      if (slot.z >= SCORE_Z && slot.result === null) {
        const pattern = PATTERN[slot.pattern]
        const dx = gameRuntime.planeX - pattern.x
        const dy = gameRuntime.planeY - pattern.y
        const hit = dx * dx + dy * dy <= HIT_RADIUS_SQUARED

        slot.result = hit
        registerRing(hit)
        focusHaptic(hit ? 'success' : 'failure')
      }

      // Once well behind the camera, re-deal this slot to the back of the queue.
      if (slot.z > 40) {
        dealt.current += 1
        slot.z -= RING_SLOTS * RING_SPACING
        slot.pattern = (slot.pattern + RING_SLOTS) % PATTERN.length
        slot.habit = dealt.current % Math.max(1, ringHabits.length)
        slot.result = null
      }

      const group = groupRefs.current[index]
      if (group) {
        const pattern = PATTERN[slot.pattern]
        group.position.set(pattern.x, pattern.y, slot.z)
        // Slow spin, so a ring reads as an object in space rather than a decal.
        group.rotation.z += dt * 0.35
      }

      const material = materialRefs.current[index]
      if (material) {
        material.color.set(
          slot.result === true ? '#2fe0b0' : slot.result === false ? '#e2555f' : '#c4e8ff',
        )
      }
    }
  })

  if (ringHabits.length === 0) return null

  // Rendered from a fixed-length array rather than from the slot ref: the slot
  // data is frame-loop state, and reading it during render would both violate
  // the rules of refs and be pointless, since useFrame positions every group
  // on the very next frame anyway.
  return (
    <group name="habit-ring-course">
      {Array.from({ length: RING_SLOTS }, (_value, index) => (
        <group
          key={index}
          ref={(group) => {
            groupRefs.current[index] = group
          }}
        >
          <mesh
            ref={(mesh: Mesh | null) => {
              materialRefs.current[index] = (mesh?.material as MeshBasicMaterial) ?? null
            }}
          >
            <torusGeometry args={[RING_RADIUS, 0.16, 10, 48]} />
            <meshBasicMaterial
              color="#c4e8ff"
              transparent
              opacity={0.92}
              blending={AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          <mesh>
            <torusGeometry args={[RING_RADIUS + 0.28, 0.045, 8, 48]} />
            <meshBasicMaterial
              color="#7cc9ff"
              transparent
              opacity={0.4}
              blending={AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}
