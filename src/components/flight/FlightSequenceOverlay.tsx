'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { motionEase } from '@/lib/design/tokens'
import { projectedGoalValue } from '@/lib/journey/projection'
import type { HabitStatus } from '@/lib/journey/types'
import { deviationStatusLabel, formatDeviation } from '@/lib/flight/formatDeviation'
import { useFlightStore } from '@/store/flightStore'
import { useJourneyStore } from '@/store/journeyStore'

const STATUS_LABELS: Record<HabitStatus, string> = {
  completed: 'Erledigt',
  partial: 'Teilweise',
  missed: 'Nicht erledigt',
  not_relevant: 'Nicht relevant',
}

export function FlightSequenceOverlay({ onSkip }: { onSkip: () => void }) {
  const animationPhase = useFlightStore((state) => state.animationPhase)
  const activeEventIndex = useFlightStore((state) => state.activeEventIndex)
  const sequenceRunning = useFlightStore((state) => state.sequenceRunning)
  const records = useJourneyStore((state) => state.records)
  const journey = useJourneyStore((state) => state.journey)
  const record = records.at(-1)

  if (!sequenceRunning || !record) return null
  const projected = projectedGoalValue(journey.targetValue, records)

  return (
    <div className="sequence-layer" data-testid="sequence-overlay">
      <div className="sequence-content">
        <AnimatePresence mode="wait">
          {animationPhase === 'events' ? (
            <motion.ul key="events" className="sequence-events" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {record.events.map((event, index) => (
                <motion.li key={`${event.habitId}-${index}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: index <= activeEventIndex ? 1 : 0, y: index <= activeEventIndex ? 0 : 14 }} transition={{ duration: 0.38, ease: motionEase.decelerate }}>
                  <span><strong>{event.icon} {event.label}</strong><small>{STATUS_LABELS[event.status]}</small></span>
                  <b className="numeric">{event.degrees === 0 ? '0°' : formatDeviation(event.degrees)}</b>
                </motion.li>
              ))}
            </motion.ul>
          ) : null}
          {animationPhase === 'result' ? (
            <motion.div key="result" className="sequence-result" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
              <p className="label-caps">Neuer Kurs</p>
              <strong className="numeric" data-testid="sequence-result">{formatDeviation(record.finalDeviationDegrees)}</strong>
              <span>{deviationStatusLabel(record.finalDeviationDegrees)}</span>
            </motion.div>
          ) : null}
          {animationPhase === 'projection' ? (
            <motion.div key="projection" className="sequence-projection" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
              <p className="label-caps">Wenn du diesen Kurs hältst</p>
              <strong className="numeric">{record.crossTrackKm} KM</strong>
              <span>neben {journey.destinationIata}</span>
              <small>Aktuelle Zielprognose · {projected} von {journey.targetValue} {journey.unit}</small>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
      <button className="sequence-skip" type="button" onClick={onSkip} data-testid="sequence-skip">Überspringen</button>
    </div>
  )
}
