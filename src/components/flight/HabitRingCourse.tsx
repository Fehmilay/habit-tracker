'use client'

import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { AdditiveBlending, type Group } from 'three'
import { SceneLabelSprite } from './SceneLabelSprite'
import { gameRuntime, resetGameRuntime } from '@/lib/game/gameRuntime'
import { safeDelta } from '@/lib/flight/flightMath'
import { focusHaptic } from '@/lib/native/ios'
import { useJourneyStore } from '@/store/journeyStore'

const RING_SPACING = 72
const FIRST_RING_Z = -82
const GAME_SPEED = 18
const PATTERN = [
  { x: -3.8, y: 0.8 },
  { x: 3.2, y: -1.4 },
  { x: -1.8, y: 2.1 },
  { x: 4.2, y: 0.4 },
  { x: 0, y: -2.2 },
  { x: -4.2, y: 1.5 },
]

export function HabitRingCourse() {
  const gameMode = useJourneyStore((state) => state.gameMode)
  const ringIds = useJourneyStore((state) => state.gameRingIds)
  const ringIndex = useJourneyStore((state) => state.gameRingIndex)
  const ringResults = useJourneyStore((state) => state.gameRingResults)
  const habits = useJourneyStore((state) => state.habits)
  const registerRing = useJourneyStore((state) => state.registerGameRing)
  const finishGame = useJourneyStore((state) => state.finishGame)
  const groups = useRef<Array<Group | null>>([])
  const handledIndex = useRef(-1)

  const rings = ringIds
    .map((id) => habits.find((habit) => habit.id === id))
    .filter((habit): habit is NonNullable<typeof habit> => Boolean(habit))

  useEffect(() => {
    if (gameMode === 'countdown') {
      resetGameRuntime()
      handledIndex.current = -1
    }
    if (gameMode === 'idle') resetGameRuntime()
  }, [gameMode])

  useFrame((_state, delta) => {
    if (gameMode !== 'playing') return
    const dt = safeDelta(delta)
    gameRuntime.travel += GAME_SPEED * dt

    groups.current.forEach((group, index) => {
      if (group) group.position.z = FIRST_RING_Z - index * RING_SPACING + gameRuntime.travel
    })

    const active = groups.current[ringIndex]
    if (!active || active.position.z < -0.5 || handledIndex.current === ringIndex) return

    handledIndex.current = ringIndex
    const pattern = PATTERN[ringIndex % PATTERN.length]
    const dx = gameRuntime.planeX - pattern.x
    const dy = gameRuntime.planeY - pattern.y
    const hit = dx * dx + dy * dy <= 12.25
    registerRing(hit)
    focusHaptic(hit ? 'success' : 'failure')
    if (hit && typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(22)
    if (ringIndex >= rings.length - 1) finishGame()
  })

  if (gameMode === 'idle' || gameMode === 'summary') return null

  return (
    <group name="habit-ring-course">
      {rings.map((habit, index) => {
        const pattern = PATTERN[index % PATTERN.length]
        const result = ringResults[index]
        const ringColor = result === true ? '#2fe0b0' : result === false ? '#e2555f' : index === ringIndex ? '#c4e8ff' : '#2f6d99'
        return (
          <group key={`${habit.id}-${index}`} ref={(group) => { groups.current[index] = group }} position={[pattern.x, pattern.y, FIRST_RING_Z - index * RING_SPACING]}>
            <mesh>
              <torusGeometry args={[3.5, 0.18, 12, 64]} />
              <meshBasicMaterial color={ringColor} transparent opacity={index < ringIndex ? 0.7 : 0.9} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
            </mesh>
            <mesh>
              <torusGeometry args={[3.75, 0.055, 8, 64]} />
              <meshBasicMaterial color="#7cc9ff" transparent opacity={0.48} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
            </mesh>
            <SceneLabelSprite text={`${habit.icon} ${habit.name}`} subtext={result === true ? 'GETROFFEN · IM KOPF VERANKERT' : result === false ? 'VERPASST · HABIT BLEIBT OFFEN' : habit.cue} color={ringColor} position={[0, 5.5, 0]} scale={[15, 3.75, 1]} />
          </group>
        )
      })}
    </group>
  )
}
