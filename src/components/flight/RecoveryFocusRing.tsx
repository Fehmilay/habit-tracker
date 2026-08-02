'use client'

import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { AdditiveBlending, type Group } from 'three'
import { SceneLabelSprite } from './SceneLabelSprite'
import { safeDelta } from '@/lib/flight/flightMath'
import { useJourneyStore } from '@/store/journeyStore'

/** The real-world recovery timer is represented by one honest course ring. */
export function RecoveryFocusRing() {
  const groupRef = useRef<Group>(null)
  const elapsedRef = useRef(0)
  const focusFlight = useJourneyStore((state) => state.focusFlight)
  const recovery = focusFlight?.kind === 'recovery' ? focusFlight : null

  useEffect(() => {
    if (!groupRef.current) return
    elapsedRef.current = 0
    groupRef.current.position.set(0, 0.5, -27)
    groupRef.current.scale.setScalar(1)
  }, [recovery?.startedAt, recovery?.status])

  useFrame((_state, delta) => {
    const group = groupRef.current
    if (!group || !recovery) return
    const dt = safeDelta(delta)
    elapsedRef.current += dt
    if (recovery.status === 'landed') group.position.z += dt * 42
    const pulse = 1 + Math.sin(elapsedRef.current * 2.4) * 0.035
    group.scale.setScalar(pulse)
    group.rotation.z = Math.sin(elapsedRef.current * 0.7) * 0.025
  })

  if (!recovery || recovery.status === 'crashed') return null
  const landed = recovery.status === 'landed'
  const color = landed ? '#2fe0b0' : '#f2b544'

  return (
    <group ref={groupRef} position={[0, 0.5, -27]} name="recovery-focus-ring">
      <mesh>
        <torusGeometry args={[4.15, 0.3, 16, 72]} />
        <meshBasicMaterial color={color} transparent opacity={0.96} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh>
        <torusGeometry args={[4.75, 0.075, 10, 72]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <SceneLabelSprite
        text={recovery.habitName}
        subtext={landed ? `ECHTE AKTION · −${recovery.recoveryDegrees ?? 0}° KURSKORREKTUR` : `${recovery.durationMinutes} MIN FOKUS · FEHLSCHLAG BLEIBT BESTEHEN`}
        color={color}
        position={[0, 6.25, 0]}
        scale={[19, 4.6, 1]}
      />
    </group>
  )
}
