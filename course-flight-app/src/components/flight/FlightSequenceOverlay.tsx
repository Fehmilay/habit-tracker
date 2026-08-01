'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { color, motionEase } from '@/lib/design/tokens'
import { DEMO_DAY_EVENTS } from '@/lib/flight/demoJourney'
import {
  deviationStatusLabel,
  formatDeviation,
} from '@/lib/flight/formatDeviation'
import { selectTargetDeviation, useFlightStore } from '@/store/flightStore'

interface FlightSequenceOverlayProps {
  onSkip: () => void
}

/**
 * Overlay for the day-sequence preview.
 *
 * Covers storyboard phases 2 and 4 only - the task events and the resulting new
 * course. Miss distance, goal projection, the map interlude and the recovery
 * hint are Phase 4 and 5 features and are left out rather than mocked up with
 * numbers the app cannot yet actually compute.
 */
export function FlightSequenceOverlay({ onSkip }: FlightSequenceOverlayProps) {
  const animationPhase = useFlightStore((state) => state.animationPhase)
  const activeEventIndex = useFlightStore((state) => state.activeEventIndex)
  const sequenceRunning = useFlightStore((state) => state.sequenceRunning)
  const targetDeviation = useFlightStore(selectTargetDeviation)

  if (!sequenceRunning) return null

  // The event list clears as soon as the aircraft starts to react. From that
  // moment the live deviation counter is the thing to watch, and leaving both
  // on screen made them overlap on short viewports.
  const showEvents = animationPhase === 'events'
  const showResult = animationPhase === 'result'

  return (
    <div
      data-testid="sequence-overlay"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 'var(--z-sequence)',
        pointerEvents: 'none',
        display: 'grid',
        // Anchored to the upper third rather than centred: dead centre puts the
        // event list straight on top of the aircraft, which is the thing the
        // sequence is asking you to watch.
        alignItems: 'start',
        justifyItems: 'center',
        paddingInline: 'calc(var(--safe-left) + 24px) calc(var(--safe-right) + 24px)',
      }}
    >
      {/* vh rather than a percentage: percentage margins resolve against the
          containing block's *width*, which would place this differently on
          every aspect ratio. */}
      <div style={{ width: '100%', maxWidth: 420, marginTop: '22vh' }}>
        <AnimatePresence mode="wait">
          {showEvents ? (
            <motion.ul
              key="events"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 14 }}
            >
              {DEMO_DAY_EVENTS.map((event, index) => {
                const revealed = index <= activeEventIndex
                const improves = event.degrees < 0
                return (
                  <motion.li
                    key={event.label}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{
                      opacity: revealed ? 1 : 0,
                      y: revealed ? 0 : 14,
                    }}
                    transition={{ duration: 0.42, ease: motionEase.decelerate }}
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      gap: 16,
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.9375rem',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        fontWeight: 600,
                        color: 'var(--color-ink)',
                      }}
                    >
                      {event.label}
                      <span
                        style={{
                          display: 'block',
                          fontSize: '0.6875rem',
                          letterSpacing: '0.16em',
                          fontWeight: 500,
                          marginTop: 4,
                          color: 'var(--color-ink-secondary)',
                        }}
                      >
                        {event.detail}
                      </span>
                    </span>
                    <span
                      className="numeric"
                      style={{
                        fontSize: '1.375rem',
                        fontWeight: 600,
                        color: improves ? color.correction : color.projection,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatDeviation(event.degrees)}
                    </span>
                  </motion.li>
                )
              })}
            </motion.ul>
          ) : null}

          {showResult ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: motionEase.decelerate }}
              style={{ textAlign: 'center' }}
            >
              <p className="label-caps" style={{ margin: 0 }}>
                Neuer Kurs
              </p>
              <p
                className="numeric"
                data-testid="sequence-result"
                style={{
                  margin: '10px 0 0',
                  fontSize: '2.75rem',
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                }}
              >
                {formatDeviation(targetDeviation)}
              </p>
              <p
                className="label-caps-micro"
                style={{ margin: '12px 0 0', color: 'var(--color-ink-secondary)' }}
              >
                {deviationStatusLabel(targetDeviation)}
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <button
        type="button"
        data-testid="sequence-skip"
        onClick={onSkip}
        style={{
          position: 'absolute',
          top: 'calc(var(--safe-top) + 18px)',
          right: 'calc(var(--safe-right) + 20px)',
          pointerEvents: 'auto',
          padding: '9px 16px',
          borderRadius: 'var(--radius-pill, 999px)',
          border: '1px solid rgba(255,255,255,0.14)',
          background: 'rgba(22, 29, 38, 0.6)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          color: 'var(--color-ink-secondary)',
          fontSize: '0.6875rem',
          fontWeight: 600,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
        }}
      >
        Überspringen
      </button>
    </div>
  )
}
