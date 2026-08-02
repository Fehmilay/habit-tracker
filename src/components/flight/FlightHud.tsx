'use client'

import { motion } from 'framer-motion'
import { DeviationReadout } from './DeviationReadout'
import { Glyph } from '@/components/icons/Glyph'
import { motionEase } from '@/lib/design/tokens'
import { daysBetween, flightCycleProgress, isHabitDue, localDateKey } from '@/lib/journey/date'
import { averageCompletion } from '@/lib/journey/projection'
import { formatKilometres } from '@/lib/flight/formatDeviation'
import { levelProgress } from '@/lib/game/progression'
import { useFlightStore } from '@/store/flightStore'
import { useJourneyStore } from '@/store/journeyStore'

interface FlightHudProps {
  onOpenHabits: () => void
  onOpenStats: () => void
  onOpenMap: () => void
  onStartLanding: () => void
}

/**
 * The heads-up display.
 *
 * Stripped to numbers and glyphs. Everything here is either a live figure or
 * a control; the explanatory captions the previous version carried
 * ("Habit Flight", fuel cost, "ZIEHEN ZUM LENKEN") described a round-based
 * game that no longer exists - the flight simply runs.
 */
export function FlightHud({ onOpenHabits, onOpenStats, onOpenMap, onStartLanding }: FlightHudProps) {
  const sequenceRunning = useFlightStore((state) => state.sequenceRunning)
  const animationPhase = useFlightStore((state) => state.animationPhase)
  const journey = useJourneyStore((state) => state.journey)
  const habits = useJourneyStore((state) => state.habits)
  const drafts = useJourneyStore((state) => state.drafts)
  const records = useJourneyStore((state) => state.records)
  const progress = useJourneyStore((state) => state.progress)

  const today = localDateKey()
  const flightCycle = flightCycleProgress(journey.startDate, today)
  const due = habits.filter((habit) => isHabitDue(habit, today))
  const rated = due.filter((habit) => drafts[habit.id]).length
  const dayIndex = Math.min(journey.totalDays, daysBetween(journey.startDate) + 1)
  const remainingDays = Math.max(0, journey.totalDays - dayIndex)
  const remainingDistance = Math.round(journey.totalDistanceKm * (remainingDays / journey.totalDays))
  const projection = Math.round(averageCompletion(records.slice(-30)) * 100)
  const level = levelProgress(progress.experience)
  const dimmed = sequenceRunning && animationPhase !== 'idle'

  return (
    <div className="flight-hud" data-testid="flight-hud">
      <motion.header animate={{ opacity: dimmed ? 0.1 : 1 }} transition={{ duration: 0.4, ease: motionEase.standard }}>
        <button type="button" className="destination-button" onClick={onOpenMap} aria-label={`Weltkarte: ${journey.destinationCity}`}>
          <strong className="numeric">{journey.destinationIata}</strong>
          <span>{journey.destinationCity}</span>
          <small className="numeric">{formatKilometres(remainingDistance)} KM</small>
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

        <button type="button" className="stats-shortcut" onClick={onOpenStats} aria-label="Insights öffnen">
          <Glyph name="arrowUpRight" size={18} />
        </button>
      </motion.header>

      <motion.div
        className="deviation-anchor"
        animate={{ opacity: animationPhase === 'events' || animationPhase === 'result' ? 0.1 : 1 }}
      >
        <DeviationReadout />
      </motion.div>

      <motion.footer animate={{ opacity: dimmed ? 0.1 : 1 }} transition={{ duration: 0.4, ease: motionEase.standard }}>
        <div className="journey-strip">
          <span>
            <small>TAG</small>
            <strong className="numeric">{dayIndex}<b>/{journey.totalDays}</b></strong>
          </span>
          <span className="journey-level" data-testid="pilot-level">
            <small>LVL</small>
            <strong className="numeric">{level.level}</strong>
            <i aria-hidden="true"><b style={{ width: `${level.ratio * 100}%` }} /></i>
          </span>
          <span className="journey-goal">
            <small>ZIEL</small>
            <strong className="numeric">{projection}%</strong>
          </span>
        </div>

        <div className="flight-actions">
          <button className="checkin-button" type="button" onClick={onOpenHabits} data-testid="primary-action" aria-label={`Habits: ${rated} von ${due.length} bewertet`}>
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
