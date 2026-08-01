'use client'

import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { AdditiveBlending, type Group, type MeshBasicMaterial } from 'three'
import { SceneLabelSprite } from './SceneLabelSprite'
import { safeDelta } from '@/lib/flight/flightMath'
import { focusHaptic } from '@/lib/native/ios'
import { useFlightStore } from '@/store/flightStore'
import { useJourneyStore } from '@/store/journeyStore'

const START_Z = -31

/** A confirmed habit becomes a physical gate the aircraft passes through. */
export function DailyConfirmationRing() {
  const groupRef = useRef<Group>(null)
  const materialRefs = useRef<Array<MeshBasicMaterial | null>>([])
  const crossedRef = useRef(false)
  const activeEventIndex = useFlightStore((state) => state.activeEventIndex)
  const phase = useFlightStore((state) => state.animationPhase)
  const record = useJourneyStore((state) => state.records.at(-1))
  const event = activeEventIndex >= 0 ? record?.events[activeEventIndex] : undefined

  useEffect(() => {
    crossedRef.current = false
    if (groupRef.current) groupRef.current.position.z = START_Z
    const resetColor = event?.status === 'completed' ? '#ffd489' : event?.status === 'partial' ? '#f2b544' : '#e2555f'
    materialRefs.current.forEach((material) => material?.color.set(resetColor))
  }, [activeEventIndex, event?.status])

  useFrame((_state, delta) => {
    const group = groupRef.current
    if (!group || !event || phase !== 'events') return
    group.position.z += safeDelta(delta) * 58
    const completed = event.status === 'completed'
    if (completed && !crossedRef.current && group.position.z >= -0.5) {
      crossedRef.current = true
      materialRefs.current.forEach((material) => material?.color.set('#2fe0b0'))
      focusHaptic('success')
    }
    const pulse = crossedRef.current ? 1.14 : 1 + Math.sin(group.position.z * 0.18) * 0.025
    group.scale.setScalar(pulse)
  })

  if (!event || (phase !== 'events' && phase !== 'reacting')) return null
  const completed = event.status === 'completed'
  const partial = event.status === 'partial'
  const x = completed ? 0 : partial ? 4.2 : 7
  const color = completed ? '#ffd489' : partial ? '#f2b544' : '#e2555f'
  const subtext = completed ? 'FLIEG DURCH DEINEN ERFOLG · DANN GRÜN' : partial ? 'TEILWEISE · KURS BLEIBT UNRUHIG' : 'VERPASST · COMEBACK WIRD VERFÜGBAR'

  return (
    <group ref={groupRef} position={[x, 0, START_Z]} name="daily-confirmation-ring">
      <mesh>
        <torusGeometry args={[4.05, 0.26, 16, 72]} />
        <meshBasicMaterial ref={(material) => { materialRefs.current[0] = material }} color={color} transparent opacity={0.95} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh>
        <torusGeometry args={[4.55, 0.075, 10, 72]} />
        <meshBasicMaterial ref={(material) => { materialRefs.current[1] = material }} color={color} transparent opacity={0.42} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <SceneLabelSprite text={`${event.icon} ${event.label}`} subtext={subtext} color={color} position={[0, 6.2, 0]} scale={[18, 4.5, 1]} />
    </group>
  )
}
