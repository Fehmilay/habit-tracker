'use client'

import { useEffect, useRef } from 'react'
import { flightRuntime } from '@/lib/flight/flightRuntime'
import {
  deviationColor,
  deviationStatusLabel,
  formatDeviation,
} from '@/lib/flight/formatDeviation'
import { useFlightStore } from '@/store/flightStore'

/**
 * The live course-deviation figure.
 *
 * Driven straight from the flight runtime on an animation frame and written to
 * the DOM by hand. Routing a value that changes every frame through React state
 * would re-render the HUD sixty times a second to update one string; this keeps
 * the counter perfectly smooth at zero render cost.
 */
export function DeviationReadout() {
  const plannedHeadingDegrees = useFlightStore((state) => state.plannedHeadingDegrees)

  const valueRef = useRef<HTMLSpanElement>(null)
  const statusRef = useRef<HTMLSpanElement>(null)
  const lastValue = useRef<string>('')
  const lastStatus = useRef<string>('')

  useEffect(() => {
    let frame = 0

    const tick = () => {
      const deviation = flightRuntime.currentHeadingDegrees - plannedHeadingDegrees

      const text = formatDeviation(deviation)
      if (text !== lastValue.current && valueRef.current) {
        valueRef.current.textContent = text
        valueRef.current.style.color = deviationColor(deviation)
        lastValue.current = text
      }

      const status = deviationStatusLabel(deviation)
      if (status !== lastStatus.current && statusRef.current) {
        statusRef.current.textContent = status
        lastStatus.current = status
      }

      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [plannedHeadingDegrees])

  return (
    <div style={{ textAlign: 'center' }}>
      <p className="label-caps" style={{ margin: 0 }}>
        Kursabweichung
      </p>
      <span
        ref={valueRef}
        data-testid="deviation-value"
        className="numeric"
        style={{
          display: 'block',
          marginTop: 4,
          fontSize: 'clamp(2.25rem, 11vw, 3.25rem)',
          fontWeight: 600,
          letterSpacing: '-0.02em',
          lineHeight: 1,
          color: 'var(--color-course)',
          textShadow: '0 0 28px rgba(124, 201, 255, 0.35)',
          transition: 'color 400ms var(--ease-standard)',
        }}
      >
        0°
      </span>
      <span
        ref={statusRef}
        data-testid="deviation-status"
        className="label-caps-micro"
        style={{ display: 'block', marginTop: 8 }}
      >
        Auf Kurs
      </span>
    </div>
  )
}
