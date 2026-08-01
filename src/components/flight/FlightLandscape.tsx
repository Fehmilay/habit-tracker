'use client'

import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { Color, Object3D, type Group, type InstancedMesh } from 'three'
import { safeDelta } from '@/lib/flight/flightMath'
import { useFlightStore } from '@/store/flightStore'

const GROUND_Y = -108
const LOOP_LENGTH = 980

function seeded(index: number): number {
  const value = Math.sin(index * 78.233 + 19.19) * 43758.5453
  return value - Math.floor(value)
}

/**
 * Low-poly terrain and a distant night city give the flight a meaningful world
 * to cross without loading a heavy map tile or external asset.
 */
export function FlightLandscape() {
  return (
    <group name="flight-landscape">
      <mesh position={[0, GROUND_Y, -430]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1300, 1700]} />
        <meshStandardMaterial color="#081526" roughness={0.94} metalness={0.05} />
      </mesh>
      <MountainRange />
      <NightCity />
    </group>
  )
}

function useSceneryScroll(ref: React.RefObject<Group | null>, speedFactor: number) {
  const speed = useFlightStore((state) => state.speed)
  const scroll = useRef(0)
  useFrame((_state, delta) => {
    const dt = safeDelta(delta)
    if (!ref.current || dt === 0) return
    scroll.current = (scroll.current + speed * speedFactor * dt) % LOOP_LENGTH
    ref.current.position.z = scroll.current
  })
}

function MountainRange() {
  const ref = useRef<Group>(null)
  const meshRef = useRef<InstancedMesh>(null)
  const mountains = useMemo(() => Array.from({ length: 26 }, (_value, index) => {
    const side = index % 2 === 0 ? -1 : 1
    return {
      x: side * (56 + seeded(index + 10) * 260),
      z: -920 + seeded(index + 30) * 830,
      width: 35 + seeded(index + 50) * 92,
      height: 38 + seeded(index + 70) * 105,
      hue: seeded(index + 90),
    }
  }), [])

  useSceneryScroll(ref, 0.46)

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    const helper = new Object3D()
    const tint = new Color()
    mountains.forEach((mountain, index) => {
      helper.position.set(mountain.x, GROUND_Y + mountain.height / 2, mountain.z)
      helper.scale.set(mountain.width, mountain.height, mountain.width)
      helper.rotation.set(0, mountain.hue * Math.PI, 0)
      helper.updateMatrix()
      mesh.setMatrixAt(index, helper.matrix)
      tint.set('#162a43').lerp(new Color('#315071'), mountain.hue * 0.5)
      mesh.setColorAt(index, tint)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [mountains])

  return (
    <group ref={ref}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, mountains.length]} castShadow receiveShadow>
        <coneGeometry args={[1, 1, 5]} />
        <meshStandardMaterial roughness={0.88} metalness={0.04} vertexColors />
      </instancedMesh>
    </group>
  )
}

function NightCity() {
  const ref = useRef<Group>(null)
  const buildingsRef = useRef<InstancedMesh>(null)
  const buildings = useMemo(() => Array.from({ length: 92 }, (_value, index) => {
    const corridor = seeded(index + 120) > 0.5 ? 1 : -1
    return {
      x: corridor * (24 + seeded(index + 140) * 210),
      z: -1000 + seeded(index + 160) * 710,
      width: 4 + seeded(index + 180) * 11,
      depth: 4 + seeded(index + 200) * 13,
      height: 8 + seeded(index + 220) * 52,
      light: seeded(index + 240),
    }
  }), [])

  useSceneryScroll(ref, 0.66)

  useLayoutEffect(() => {
    const mesh = buildingsRef.current
    if (!mesh) return
    const helper = new Object3D()
    const tint = new Color()
    buildings.forEach((building, index) => {
      helper.position.set(building.x, GROUND_Y + building.height / 2, building.z)
      helper.scale.set(building.width, building.height, building.depth)
      helper.updateMatrix()
      mesh.setMatrixAt(index, helper.matrix)
      tint.set('#102139').lerp(new Color('#386386'), building.light * 0.7)
      mesh.setColorAt(index, tint)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [buildings])

  return (
    <group ref={ref}>
      <instancedMesh ref={buildingsRef} args={[undefined, undefined, buildings.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.7} metalness={0.28} vertexColors emissive="#07101d" emissiveIntensity={0.25} />
      </instancedMesh>
      {buildings.filter((_building, index) => index % 9 === 0).map((building, index) => (
        <pointLight key={index} position={[building.x, GROUND_Y + building.height * 0.6, building.z]} color="#7cc9ff" intensity={0.7} distance={34} decay={2} />
      ))}
    </group>
  )
}
