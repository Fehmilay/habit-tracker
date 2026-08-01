'use client'

import { useFlightStore, selectTargetDeviation } from '@/store/flightStore'

interface SceneFallback2DProps {
  reason: 'no-webgl' | 'error'
}

/**
 * Flat fallback for devices without WebGL, or when the 3D scene fails.
 *
 * It deliberately still shows the deviation and the course line, tilted by the
 * actual deviation angle, because that is the information the app exists to
 * convey. Losing the 3D view should cost fidelity, not meaning.
 */
export function SceneFallback2D({ reason }: SceneFallback2DProps) {
  const deviation = useFlightStore(selectTargetDeviation)

  return (
    <div
      data-testid="scene-fallback-2d"
      style={{
        position: 'absolute',
        inset: 0,
        background:
          'linear-gradient(180deg, #040a1a 0%, #0a1b3a 42%, #123157 68%, #3d6d97 88%, #7ea8c4 100%)',
        overflow: 'hidden',
      }}
    >
      {/* Horizon */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '62%',
          height: 1,
          background: 'rgba(226, 240, 255, 0.35)',
        }}
      />

      {/* Planned course, rotated by the live deviation */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '62%',
          width: 3,
          height: '34%',
          marginLeft: -1.5,
          transformOrigin: 'top center',
          transform: `rotate(${deviation * 2.2}deg)`,
          background:
            'linear-gradient(180deg, rgba(124,201,255,0) 0%, rgba(124,201,255,0.9) 100%)',
          transition: 'transform 600ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 'calc(28% + var(--safe-bottom))',
          textAlign: 'center',
          padding: '0 24px',
        }}
      >
        <p className="label-caps" style={{ margin: 0 }}>
          {reason === 'no-webgl' ? '2D-Ansicht' : '2D-Ansicht nach Fehler'}
        </p>
        <p
          style={{
            margin: '10px 0 0',
            fontSize: '0.8125rem',
            lineHeight: 1.5,
            color: 'var(--color-ink-secondary)',
            maxWidth: 340,
            marginInline: 'auto',
          }}
        >
          {reason === 'no-webgl'
            ? 'Dieses Gerät stellt kein WebGL bereit. Der Kurs wird vereinfacht dargestellt.'
            : 'Die 3D-Szene konnte nicht geladen werden. Der Kurs wird vereinfacht dargestellt.'}
        </p>
      </div>
    </div>
  )
}
