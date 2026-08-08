'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Glyph } from '@/components/icons/Glyph'
import { formatKilometres } from '@/lib/flight/formatDeviation'
import { crossTrackDistanceKm } from '@/lib/journey/projection'
import { useJourneyStore } from '@/store/journeyStore'

/**
 * "Welcome back."
 *
 * Shown once, after the calendar sweep closes out days nobody answered for.
 * The point is not to scold: it is that the consequence has to be *visible* at
 * the moment someone returns, or absence stays cheaper than honesty. It states
 * the cost in the app's own units - days, degrees, kilometres beside the
 * destination - and then gets out of the way.
 */
export function ReturnCard() {
  const summary = useJourneyStore((state) => state.pendingReturn)
  const clear = useJourneyStore((state) => state.clearReturnSummary)
  const journey = useJourneyStore((state) => state.journey)

  const days = summary?.days.length ?? 0
  const offCourseKm = summary
    ? crossTrackDistanceKm(journey.totalDistanceKm, summary.addedDegrees)
    : 0

  return (
    <AnimatePresence>
      {summary && days > 0 ? (
        <motion.div
          className="return-layer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          data-testid="return-card"
        >
          <motion.div
            className="return-card"
            initial={{ y: 30, scale: 0.94, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 24, stiffness: 240 }}
          >
            <span className="return-mark" aria-hidden="true">
              <Glyph name="warning" size={24} />
            </span>
            <p className="label-caps">Willkommen zurück</p>
            <h2>
              {days} {days === 1 ? 'Tag' : 'Tage'} ohne Check-in.
            </h2>
            <p className="return-copy">
              Der Flug ist weitergegangen, ohne dich. Die Tage wurden als verpasst
              geschlossen — nicht um dich zu bestrafen, sondern weil ein Kurs, der sich
              beim Wegsehen nicht bewegt, nichts misst.
            </p>
            <div className="return-figures">
              <span>
                <strong className="numeric">+{summary.addedDegrees.toFixed(1)}°</strong>
                <small>Kurs verloren</small>
              </span>
              <span>
                <strong className="numeric">{formatKilometres(offCourseKm)}</strong>
                <small>km neben {journey.destinationIata}</small>
              </span>
              {summary.streakBefore > 0 ? (
                <span>
                  <strong className="numeric">{summary.streakBefore}</strong>
                  <small>Tage Kette weg</small>
                </span>
              ) : null}
            </div>
            <button className="primary-button" type="button" onClick={clear}>
              Zurück auf Kurs
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
