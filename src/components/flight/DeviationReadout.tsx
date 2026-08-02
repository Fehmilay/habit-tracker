'use client'

import { useEffect, useRef } from 'react'
import { flightRuntime } from '@/lib/flight/flightRuntime'
import {
  deviationSeverity,
  deviationStatusLabel,
  formatCourseDeviation,
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
  const readoutRef = useRef<HTMLDivElement>(null)
  const symbolRef = useRef<HTMLSpanElement>(null)
  const lastValue = useRef<string>('')
  const lastStatus = useRef<string>('')
  const lastState = useRef<string>('')

  useEffect(() => {
    let frame = 0

    const tick = () => {
      const deviation = flightRuntime.currentHeadingDegrees - plannedHeadingDegrees

      const text = formatCourseDeviation(deviation)
      if (text !== lastValue.current && valueRef.current) {
        valueRef.current.textContent = text
        lastValue.current = text
      }

      const state = deviationSeverity(deviation) === 'on-course' ? 'on-course' : 'off-course'
      if (state !== lastState.current) {
        if (readoutRef.current) readoutRef.current.dataset.state = state
        // A data attribute rather than a character: the mark is drawn in CSS
        // so it matches the stroke weight of the rest of the icon set.
        if (symbolRef.current) symbolRef.current.dataset.state = state
        lastState.current = state
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
    <div ref={readoutRef} className="deviation-readout" data-state="on-course">
      <div className="deviation-value-shell">
        <span ref={symbolRef} className="deviation-state-symbol" data-state="on-course" aria-hidden="true" />
        <span ref={valueRef} data-testid="deviation-value" className="numeric">0°</span>
      </div>
      <span ref={statusRef} data-testid="deviation-status" className="deviation-status">Auf Kurs</span>
    </div>
  )
}
