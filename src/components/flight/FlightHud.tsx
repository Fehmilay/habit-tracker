'use client'

import { motion } from 'framer-motion'
import { DeviationReadout } from './DeviationReadout'
import { InstrumentBar } from './InstrumentBar'
import { Glyph } from '@/components/icons/Glyph'
import { motionEase } from '@/lib/design/tokens'
import { daysBetween, flightCycleProgress, isHabitDue, localDateKey } from '@/lib/journey/date'
import { formatKilometres } from '@/lib/flight/formatDeviation'
import { levelProgress } from '@/lib/game/progression'
import { type AnimationPhase, useFlightStore } from '@/store/flightStore'
import { useInstruments, useStreak } from '@/store/hooks'
import { useJourneyStore } from '@/store/journeyStore'

/** Sequence phases whose overlay occupies the middle of the screen. */
const OVERLAID_PHASES = new Set<AnimationPhase>(['events', 'result', 'streak', 'projection'])

interface FlightHudProps {
  onOpenHabits: () => void
  onOpenStats: () => void
  onOpenMap: () => void
  onOpenInstruments: () => void
  onOpenSettings: () => void
  onStartLanding: () => void
}

/**
 * The heads-up display.
 *
 * Numbers and glyphs only. Three things earn their place on top of the scene:
 * where the aircraft is pointing, how long the chain is, and what to do next.
 * Everything else - the level, the hangar, the history - lives one swipe away,
 * because a HUD that answers every question answers none of them at a glance.
 */
export function FlightHud({
  onOpenHabits,
  onOpenStats,
  onOpenMap,
  onOpenInstruments,
  onOpenSettings,
  onStartLanding,
}: FlightHudProps) {
  const sequenceRunning = useFlightStore((state) => state.sequenceRunning)
  const animationPhase = useFlightStore((state) => state.animationPhase)
  const journey = useJourneyStore((state) => state.journey)
  const habits = useJourneyStore((state) => state.habits)
  const drafts = useJourneyStore((state) => state.drafts)
  const records = useJourneyStore((state) => state.records)
  const progress = useJourneyStore((state) => state.progress)
  const streak = useStreak()
  const readout = useInstruments()

  const today = localDateKey()
  const flightCycle = flightCycleProgress(journey.startDate, today)
  const due = habits.filter((habit) => isHabitDue(habit, today))
  const rated = due.filter((habit) => drafts[habit.id]).length
  const closed = records.some((record) => record.date === today)
  const dayIndex = Math.min(journey.totalDays, daysBetween(journey.startDate) + 1)
  const remainingDistance = formatKilometres(readout.remainingDistanceKm)
  const level = levelProgress(progress.experience)
  const dimmed = sequenceRunning && animationPhase !== 'idle'

  return (
    <div className="flight-hud" data-testid="flight-hud">
      {/* Header and instrument bar travel together so the column below them
          keeps exactly three flex children and the deviation readout stays
          where it is. */}
      <motion.div className="hud-top" animate={{ opacity: dimmed ? 0.1 : 1 }} transition={{ duration: 0.4, ease: motionEase.standard }}>
      <header>
        <button type="button" className="destination-button" onClick={onOpenMap} aria-label={`Weltkarte: ${journey.destinationCity}`}>
          <strong className="numeric">{journey.destinationIata}</strong>
          <span>{journey.destinationCity}</span>
          <small className="numeric">{remainingDistance} KM</small>
        </button>

        {flightCycle.day === 30 ? (
          <button className="flight-cycle-timer flight-cycle-final" type="button" onClick={onStartLanding} data-testid="flight-cycle-timer" aria-label="Landeanflug starten">
            <strong className="numeric">30<b>/30</b></strong>
            <i aria-hidden="true"><b style={{ width: '100%' }} /></i>
          </button>
        ) : (
          <div className="flight-cycle-timer" data-testid="flight-cycle-timer" aria-label={`Tag ${flightCycle.day} von 30`}>
            <strong className="numeric">{flightCycle.day}<b>/30</b></strong>
            <i aria-hidden="true"><b style={{ width: `${flightCycle.progress * 100}%` }} /></i>
          </div>
        )}

        <div className="hud-corner-actions">
          <button type="button" className="stats-shortcut" onClick={onOpenSettings} aria-label="Einstellungen öffnen">
            <Glyph name="settings" size={17} />
          </button>
          <button type="button" className="stats-shortcut" onClick={onOpenStats} aria-label="Insights öffnen">
            <Glyph name="arrowUpRight" size={18} />
          </button>
        </div>
      </header>

      <InstrumentBar onOpen={onOpenInstruments} />
      </motion.div>

      <motion.div
        className="deviation-anchor"
        // Every phase that paints over the centre of the screen, not just the
        // first two - the projection beat used to land on top of the readout.
        animate={{ opacity: OVERLAID_PHASES.has(animationPhase) ? 0.1 : 1 }}
      >
        <DeviationReadout />
      </motion.div>

      <motion.footer animate={{ opacity: dimmed ? 0.1 : 1 }} transition={{ duration: 0.4, ease: motionEase.standard }}>
        {/* The one sentence worth acting on, computed by the instrument model.
            It sits directly above the check-in button so reading it and doing
            it are the same gesture. */}
        <p className="hud-next-action" data-testid="hud-next-action">{readout.nextAction}</p>

        <div className="journey-strip">
          <button
            type="button"
            className="journey-streak"
            data-state={streak.current === 0 ? 'cold' : streak.atRisk ? 'risk' : 'hot'}
            data-testid="streak-chip"
            onClick={onOpenStats}
            aria-label={`Kette: ${streak.current} Tage, Rekord ${streak.best}`}
          >
            <Glyph name="flame" size={14} />
            <strong className="numeric">{streak.current}</strong>
          </button>
          <span>
            <small>TAG</small>
            <strong className="numeric">{dayIndex}<b>/{journey.totalDays}</b></strong>
          </span>
          <span className="journey-level" data-testid="pilot-level">
            <small>LVL</small>
            <strong className="numeric">{level.level}</strong>
            <i aria-hidden="true"><b style={{ width: `${level.ratio * 100}%` }} /></i>
          </span>
        </div>

        <div className="flight-actions">
          <button
            className="checkin-button"
            type="button"
            onClick={onOpenHabits}
            data-testid="primary-action"
            data-state={closed ? 'done' : rated === due.length && due.length > 0 ? 'ready' : 'open'}
            aria-label={`Habits: ${rated} von ${due.length} bewertet`}
          >
            {closed ? <Glyph name="check" size={17} /> : null}
            <strong className="numeric">{rated}<b>/{due.length}</b></strong>
            <Glyph name="chevronRight" size={16} />
          </button>
        </div>

        <div className="swipe-edges">
          <button type="button" onClick={onOpenHabits} aria-label="Habits">
            <Glyph name="chevronLeft" size={15} />
          </button>
          <span aria-hidden="true" />
          <button type="button" onClick={onOpenStats} aria-label="Insights">
            <Glyph name="chevronRight" size={15} />
          </button>
        </div>
      </motion.footer>
    </div>
  )
}
