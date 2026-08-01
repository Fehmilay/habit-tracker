'use client'

import { motion } from 'framer-motion'
import { DeviationReadout } from './DeviationReadout'
import { DEMO_JOURNEY } from '@/lib/flight/demoJourney'
import { formatKilometres } from '@/lib/flight/formatDeviation'
import { motionEase } from '@/lib/design/tokens'
import { useFlightStore } from '@/store/flightStore'

const NAV_ITEMS = ['Flug', 'Verlauf', 'Ziel', 'Einstellungen'] as const

/**
 * The heads-up display.
 *
 * Deliberately sparse. It sits over the scene as text rather than panels -
 * almost no cards, no borders, no stat tiles - so the aircraft, the horizon and
 * the course line stay the subject. Every element is anchored inside the device
 * safe areas so nothing collides with a notch or a home indicator.
 *
 * The whole HUD steps back to near-transparent while the day sequence plays,
 * which is phase 1 of the storyboard in the brief.
 */
export function FlightHud() {
  const animationPhase = useFlightStore((state) => state.animationPhase)
  const dayIndex = useFlightStore((state) => state.dayIndex)
  const totalDays = useFlightStore((state) => state.totalDays)
  const goalProjectionPercent = useFlightStore((state) => state.goalProjectionPercent)
  const remainingDistanceKm = useFlightStore((state) => state.remainingDistanceKm)
  const sequenceRunning = useFlightStore((state) => state.sequenceRunning)

  const dimmed = sequenceRunning && animationPhase !== 'idle'

  return (
    <div
      data-testid="flight-hud"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 'var(--z-hud)',
        // The scene stays interactive; only the controls opt back in.
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        paddingTop: 'calc(var(--safe-top) + 18px)',
        paddingBottom: 'calc(var(--safe-bottom) + 16px)',
        paddingLeft: 'calc(var(--safe-left) + 20px)',
        paddingRight: 'calc(var(--safe-right) + 20px)',
      }}
    >
      {/* Destination and remaining distance */}
      <motion.header
        animate={{ opacity: dimmed ? 0.12 : 1 }}
        transition={{ duration: 0.45, ease: motionEase.standard }}
        style={{ pointerEvents: 'none' }}
      >
        <p
          className="numeric"
          style={{
            margin: 0,
            fontSize: '1.75rem',
            fontWeight: 600,
            letterSpacing: '0.04em',
            lineHeight: 1,
          }}
        >
          {DEMO_JOURNEY.destinationIata}
        </p>
        <p
          className="label-caps"
          style={{ margin: '6px 0 0', letterSpacing: '0.2em' }}
        >
          {DEMO_JOURNEY.destinationCity}
        </p>
        <p
          className="numeric"
          data-testid="remaining-distance"
          style={{
            margin: '14px 0 0',
            fontSize: '0.8125rem',
            letterSpacing: '0.12em',
            color: 'var(--color-ink-secondary)',
          }}
        >
          {formatKilometres(remainingDistanceKm)} KM VERBLEIBEND
        </p>
      </motion.header>

      {/* Deviation, sitting near the vanishing point of the course line.
          It steps back while the task events are being listed and again once
          the sequence states the new course itself, but stays lit through the
          manoeuvre - that is the counter the brief asks to tick up, and it is
          never shown at the same time as a second copy of the same figure. */}
      <motion.div
        animate={{
          opacity:
            animationPhase === 'events' || animationPhase === 'result' ? 0.12 : 1,
        }}
        transition={{ duration: 0.4, ease: motionEase.standard }}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 'clamp(24%, 26%, 30%)',
          display: 'grid',
          placeItems: 'center',
          pointerEvents: 'none',
        }}
      >
        <DeviationReadout />
      </motion.div>

      {/* Journey progress and primary action */}
      <motion.footer
        animate={{ opacity: dimmed ? 0.12 : 1 }}
        transition={{ duration: 0.45, ease: motionEase.standard }}
        style={{ pointerEvents: dimmed ? 'none' : 'auto' }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: 16,
            marginBottom: 18,
          }}
        >
          <div>
            <p className="label-caps-micro" style={{ margin: 0 }}>
              Reisetag
            </p>
            <p
              className="numeric"
              data-testid="journey-day"
              style={{ margin: '5px 0 0', fontSize: '1rem', fontWeight: 600 }}
            >
              TAG {dayIndex} VON {totalDays}
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <p className="label-caps-micro" style={{ margin: 0 }}>
              Zielprognose
            </p>
            <p
              className="numeric"
              data-testid="goal-projection"
              style={{
                margin: '5px 0 0',
                fontSize: '1.25rem',
                fontWeight: 600,
                color: 'var(--color-projection)',
              }}
            >
              {goalProjectionPercent} %
            </p>
          </div>
        </div>

        <button
          type="button"
          data-testid="primary-action"
          // Phase 1 has no check-in: the sheet, the task logic and the
          // persistence it would write to all arrive in Phases 2 and 3.
          disabled
          title="Verfügbar ab Phase 3"
          style={{
            width: '100%',
            padding: '15px 20px',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid rgba(124, 201, 255, 0.28)',
            background:
              'linear-gradient(180deg, rgba(124,201,255,0.18) 0%, rgba(124,201,255,0.07) 100%)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            color: 'var(--color-course-bright)',
            fontSize: '0.8125rem',
            fontWeight: 600,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            opacity: 0.55,
            cursor: 'not-allowed',
          }}
        >
          Heutigen Tag eintragen
        </button>

        <nav
          aria-label="Hauptnavigation"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 16,
            paddingInline: 4,
          }}
        >
          {NAV_ITEMS.map((item, index) => (
            <span
              key={item}
              data-testid={`nav-${item.toLowerCase()}`}
              className="label-caps-micro"
              style={{
                color:
                  index === 0 ? 'var(--color-course)' : 'var(--color-ink-muted)',
                letterSpacing: '0.14em',
              }}
            >
              {item}
            </span>
          ))}
        </nav>
      </motion.footer>
    </div>
  )
}
