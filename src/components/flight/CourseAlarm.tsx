'use client'

import { useEffect, useRef } from 'react'
import { Glyph } from '@/components/icons/Glyph'
import { effectsFromSeverity } from '@/lib/flight/damage'
import { flightRuntime } from '@/lib/flight/flightRuntime'
import { useFlightStore } from '@/store/flightStore'

/**
 * Full-screen off-course alarm.
 *
 * Drifting used to be communicated only by a small number changing in the
 * middle of the HUD, which is easy to miss on a phone held at arm's length.
 * This adds the thing a cockpit would actually do: the edges of the frame
 * bleed red and pulse, faster and harder the further off course the aircraft
 * is, so the state is readable without reading anything.
 *
 * Driven straight from the flight runtime on an animation frame and written
 * to the DOM by hand, for the same reason as `DeviationReadout`: pushing a
 * per-frame value through React state would re-render this sixty times a
 * second to change one opacity.
 */
export function CourseAlarm() {
  const plannedHeadingDegrees = useFlightStore((state) => state.plannedHeadingDegrees)
  const sequenceRunning = useFlightStore((state) => state.sequenceRunning)

  const rootRef = useRef<HTMLDivElement>(null)
  const badgeRef = useRef<HTMLDivElement>(null)
  const lastStage = useRef(-1)

  useEffect(() => {
    let frame = 0

    const tick = () => {
      const root = rootRef.current
      if (root) {
        // Same smoothed severity the aircraft's own damage uses, so the alarm
        // and the burning aircraft can never disagree.
        const damage = effectsFromSeverity(flightRuntime.damageSeverity)
        const severity = sequenceRunning ? damage.severity * 0.4 : damage.severity

        // Pulse rate rises with severity: a slow breath when slightly off, an
        // urgent throb when critical.
        const rate = 1.6 + damage.severity * 4.2
        const pulse = 0.62 + 0.38 * Math.sin(flightRuntime.elapsedSeconds * rate)
        root.style.setProperty('--alarm', String(severity * pulse))
        root.style.setProperty('--alarm-steady', String(severity))

        if (damage.stage !== lastStage.current) {
          lastStage.current = damage.stage
          root.dataset.stage = String(damage.stage)
          if (badgeRef.current) badgeRef.current.hidden = damage.stage < 2
        }
      }
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [plannedHeadingDegrees, sequenceRunning])

  return (
    <div className="course-alarm" ref={rootRef} data-stage="0" aria-hidden="true">
      <div className="course-alarm-badge" ref={badgeRef} hidden>
        <Glyph name="warning" size={16} />
      </div>
    </div>
  )
}
