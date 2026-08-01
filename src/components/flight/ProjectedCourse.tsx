'use client'

import { Line } from '@react-three/drei'
import { useMemo } from 'react'
import { COURSE_LINE } from '@/lib/flight/sceneConfig'
import { degToRad } from '@/lib/flight/flightMath'
import { useJourneyStore } from '@/store/journeyStore'

export function ProjectedCourse() {
  const deviation = useJourneyStore((state) => state.currentDeviationDegrees)
  const points = useMemo(() => {
    const length = Math.abs(COURSE_LINE.farZ)
    const endX = Math.tan(degToRad(deviation)) * length
    return [
      [0, COURSE_LINE.y + 0.12, COURSE_LINE.nearZ] as [number, number, number],
      [endX, COURSE_LINE.y + 0.12, COURSE_LINE.farZ] as [number, number, number],
    ]
  }, [deviation])

  if (Math.abs(deviation) < 0.05) return null

  return (
    <group name="projected-course">
      <Line
        points={points}
        color="#f2b544"
        lineWidth={1.25}
        transparent
        opacity={0.72}
        dashed
        dashSize={7}
        gapSize={6}
      />
      <mesh position={points[1]}>
        <sphereGeometry args={[3.2, 12, 12]} />
        <meshBasicMaterial color="#f2b544" transparent opacity={0.8} toneMapped={false} />
      </mesh>
    </group>
  )
}

