'use client'

import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  Color,
  type Group,
  type Mesh,
  MeshBasicMaterial,
  type SpriteMaterial,
  type Texture,
} from 'three'
import { gameRuntime, isEngaged } from '@/lib/game/gameRuntime'
import { safeDelta } from '@/lib/flight/flightMath'
import { createLabelTexture } from '@/lib/flight/textures'
import { isHabitDue, localDateKey } from '@/lib/journey/date'
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

const NEUTRAL = new Color('#c4e8ff')
const OPEN = new Color('#ffd489')
const HIT = new Color('#2fe0b0')
const MISS = new Color('#e2555f')

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

interface RingHabit {
  id: string
  name: string
  /** Due today and still unrated: the ring the player should care about. */
  open: boolean
}

/**
 * The endless habit-ring course.
 *
 * The flight never stops and never has to be started, so this is a recycling
 * stream rather than a finite list: five ring slots march toward the aircraft,
 * and each one that passes is scored and immediately re-dealt far ahead with
 * the next habit and next pattern position. That keeps the geometry count
 * fixed no matter how long someone flies.
 *
 * Each ring carries the name of the habit it stands for, and the ones still
 * open today burn gold. That is the whole reason the game sits inside a habit
 * tracker rather than beside it: flying it rehearses the list you have not
 * finished, so the loop that kills time also reminds you what is left.
 */
export function HabitRingCourse({ active }: { active: boolean }) {
  const habits = useJourneyStore((state) => state.habits)
  const drafts = useJourneyStore((state) => state.drafts)
  const records = useJourneyStore((state) => state.records)
  const registerRing = useJourneyStore((state) => state.registerGameRing)

  const groupRefs = useRef<Array<Group | null>>([])
  const materialRefs = useRef<Array<MeshBasicMaterial | null>>([])
  const dealt = useRef(0)

  const ringHabits = useMemo<RingHabit[]>(() => {
    const today = localDateKey()
    const closed = records.some((record) => record.date === today)
    return habits
      .filter((habit) => !habit.archived)
      .map((habit) => ({
        id: habit.id,
        name: habit.name,
        open: !closed && isHabitDue(habit, today) && !drafts[habit.id],
      }))
  }, [habits, drafts, records])

  const slots = useRef<RingSlot[]>(
    Array.from({ length: RING_SLOTS }, (_value, index) => ({
      z: -140 - index * RING_SPACING,
      pattern: index % PATTERN.length,
      habit: index,
      result: null,
    })),
  )

  const labelMaterials = useRef<Array<SpriteMaterial | null>>([])

  /**
   * One caption texture per habit, built up front.
   *
   * A slot changes habit every time it is re-dealt - roughly every four
   * seconds - so drawing the caption from React state would redraw a canvas
   * and upload a texture on that cadence. Instead the frame loop points the
   * sprite's `map` at an already-uploaded texture, which costs a reference
   * assignment.
   */
  const labelTextures = useMemo(
    () =>
      ringHabits.map((habit) =>
        createLabelTexture(
          habit.name,
          habit.open ? 'heute offen' : undefined,
          habit.open ? '#ffd489' : '#c4e8ff',
        ),
      ),
    [ringHabits],
  )

  useLayoutEffect(() => {
    const textures = labelTextures
    return () => {
      for (const texture of textures) texture?.dispose()
    }
  }, [labelTextures])

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
        // Only when someone is actually flying. The course scores forever, so
        // an ungated buzz here is an error haptic every four seconds at a phone
        // lying face-down on a table.
        if (isEngaged()) focusHaptic(hit ? 'success' : 'failure')
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

      const habitIndex = slot.habit % ringHabits.length
      const habit = ringHabits[habitIndex]

      const material = materialRefs.current[index]
      if (material) {
        material.color.copy(
          slot.result === true
            ? HIT
            : slot.result === false
              ? MISS
              : habit?.open
                ? OPEN
                : NEUTRAL,
        )
      }

      const label = labelMaterials.current[index]
      const texture: Texture | null = labelTextures[habitIndex] ?? null
      if (label && label.map !== texture) {
        label.map = texture
        label.opacity = texture ? 1 : 0
        label.needsUpdate = true
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
      {Array.from({ length: RING_SLOTS }, (_value, index) => {
        return (
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
            {/* Caption: the map is pointed at the right habit texture in the
                frame loop, so this sprite is created once and never re-renders. */}
            <sprite position={[0, RING_RADIUS + 1.7, 0]} scale={[7.4, 1.85, 1]} renderOrder={30}>
              <spriteMaterial
                ref={(material: SpriteMaterial | null) => {
                  labelMaterials.current[index] = material
                }}
                transparent
                opacity={0}
                depthWrite={false}
                toneMapped={false}
              />
            </sprite>
          </group>
        )
      })}
    </group>
  )
}
