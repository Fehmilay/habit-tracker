'use client'

import { motion } from 'framer-motion'
import { DeviationReadout } from './DeviationReadout'
import { motionEase } from '@/lib/design/tokens'
import { daysBetween, isHabitDue, localDateKey } from '@/lib/journey/date'
import { averageCompletion } from '@/lib/journey/projection'
import { formatKilometres } from '@/lib/flight/formatDeviation'
import { useFlightStore } from '@/store/flightStore'
import { useJourneyStore } from '@/store/journeyStore'

interface FlightHudProps {
  onOpenHabits: () => void
  onOpenStats: () => void
}
export function FlightHud({ onOpenHabits, onOpenStats }: FlightHudProps) {
  const sequenceRunning = useFlightStore((state) => state.sequenceRunning)
  const animationPhase = useFlightStore((state) => state.animationPhase)
  const journey = useJourneyStore((state) => state.journey)
  const habits = useJourneyStore((state) => state.habits)
  const drafts = useJourneyStore((state) => state.drafts)
  const records = useJourneyStore((state) => state.records)
  const startGame = useJourneyStore((state) => state.startGame)
  const gameMode = useJourneyStore((state) => state.gameMode)
  const progress = useJourneyStore((state) => state.progress)

  if (gameMode !== 'idle') return null

  const today = localDateKey()
  const due = habits.filter((habit) => isHabitDue(habit, today))
  const rated = due.filter((habit) => drafts[habit.id]).length
  const dayIndex = Math.min(journey.totalDays, daysBetween(journey.startDate) + 1)
  const remainingDays = Math.max(0, journey.totalDays - dayIndex)
  const remainingDistance = Math.round(journey.totalDistanceKm * (remainingDays / journey.totalDays))
  const projection = Math.round(averageCompletion(records.slice(-30)) * 100)
  const dimmed = sequenceRunning && animationPhase !== 'idle'

  const play = () => {
    const ringIds = (due.length > 0 ? due : habits.filter((habit) => !habit.archived)).slice(0, 6).map((habit) => habit.id)
    if (ringIds.length > 0) startGame(ringIds)
  }

  return (
    <div className="flight-hud" data-testid="flight-hud">
      <motion.header animate={{ opacity: dimmed ? 0.1 : 1 }} transition={{ duration: 0.4, ease: motionEase.standard }}>
        <button type="button" className="destination-button" onClick={onOpenStats}>
          <strong className="numeric">{journey.destinationIata}</strong>
          <span>{journey.destinationCity}</span>
          <small className="numeric">{formatKilometres(remainingDistance)} KM VERBLEIBEND</small>
        </button>
        <button type="button" className="stats-shortcut" onClick={onOpenStats} aria-label="Insights öffnen">↗</button>
      </motion.header>

      <motion.div className="deviation-anchor" animate={{ opacity: animationPhase === 'events' || animationPhase === 'result' ? 0.1 : 1 }}>
        <DeviationReadout />
      </motion.div>

      <motion.footer animate={{ opacity: dimmed ? 0.1 : 1 }} transition={{ duration: 0.4, ease: motionEase.standard }}>
        <div className="journey-strip">
          <span><small>REISETAG</small><strong className="numeric">{dayIndex}/{journey.totalDays}</strong></span>
          <span className="journey-level"><small>PILOT LEVEL</small><strong className="numeric">LVL {progress.level} · 🪙 {progress.coins}</strong></span>
          <span className="journey-goal"><small>{journey.title}</small><strong className="numeric">{projection}%</strong></span>
        </div>
        <div className="flight-actions">
          <button className="play-button" type="button" onClick={play} data-testid="play-flight"><i>▶</i><span>PLAY</span></button>
          <button className="checkin-button" type="button" onClick={onOpenHabits} data-testid="primary-action"><span>HEUTE</span><strong>{rated}/{due.length} HABITS</strong></button>
        </div>
        <div className="swipe-edges"><button type="button" onClick={onOpenHabits}>‹ HABITS</button><span>•</span><button type="button" onClick={onOpenStats}>STATS ›</button></div>
      </motion.footer>
    </div>
  )
}
