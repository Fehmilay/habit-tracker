'use client'

import { AdditiveBlending, DoubleSide } from 'three'
import { SceneLabelSprite } from './SceneLabelSprite'
import { COURSE_LINE } from '@/lib/flight/sceneConfig'
import { degToRad } from '@/lib/flight/flightMath'
import { useFlightStore } from '@/store/flightStore'
import { useJourneyStore } from '@/store/journeyStore'

export function DestinationAirport() {
  const plannedHeadingDegrees = useFlightStore((state) => state.plannedHeadingDegrees)
  const destinationIata = useJourneyStore((state) => state.journey.destinationIata)
  const destinationCity = useJourneyStore((state) => state.journey.destinationCity)
  const farZ = COURSE_LINE.farZ + 28

  return (
    <group
      name="destination-airport"
      rotation={[0, -degToRad(plannedHeadingDegrees), 0]}
      position={[0, 0, 0]}
    >
      <group position={[0, COURSE_LINE.y, farZ]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[42, 120]} />
          <meshBasicMaterial
            color="#10243b"
            transparent
            opacity={0.72}
            side={DoubleSide}
          />
        </mesh>
        <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2.4, 112]} />
          <meshBasicMaterial
            color="#c4e8ff"
            transparent
            opacity={0.82}
            blending={AdditiveBlending}
          />
        </mesh>
        {[-16, -10, -4, 4, 10, 16].map((x) => (
          <mesh key={x} position={[x, 0.2, 14]}>
            <sphereGeometry args={[0.7, 8, 8]} />
            <meshBasicMaterial color="#7cc9ff" toneMapped={false} />
          </mesh>
        ))}
        <mesh position={[0, 12, 0]}>
          <torusGeometry args={[10, 0.65, 10, 48]} />
          <meshBasicMaterial
            color="#7cc9ff"
            transparent
            opacity={0.72}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
        <SceneLabelSprite
          text={destinationIata}
          subtext={destinationCity}
          position={[0, 27, 0]}
          scale={[34, 8.5, 1]}
        />
      </group>
    </group>
  )
}

