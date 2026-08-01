'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { cycleTruthScore, landingGrade, landingOffsetPercent } from '@/lib/game/landing'
import { flightCycleProgress, localDateKey } from '@/lib/journey/date'
import type { CycleLandingResult } from '@/lib/journey/types'
import { focusHaptic } from '@/lib/native/ios'
import { useJourneyStore } from '@/store/journeyStore'

type LandingPhase = 'briefing' | 'approach' | 'result'

const GRADE_COPY = {
  centerline: { eyebrow: 'Centerline', title: 'Punktlandung.', detail: 'Deine echten Habits haben dich genau zur Runway gebracht.' },
  safe: { eyebrow: 'Sichere Landung', title: 'Du bist angekommen.', detail: 'Nicht perfekt, aber dein realer Kurs war stabil genug.' },
  hard: { eyebrow: 'Harte Landung', title: 'Knapp neben der Linie.', detail: 'Der nächste Zyklus beginnt mit einer klaren Kurskorrektur.' },
  alternate: { eyebrow: 'Ausweichlandung', title: 'Das Ziel wurde verfehlt.', detail: 'Spielpunkte konnten fehlende echte Habit-Tage nicht verdecken.' },
} as const

export function LandingApproachOverlay({ onClose }: { onClose: () => void }) {
  const journey = useJourneyStore((state) => state.journey)
  const habits = useJourneyStore((state) => state.habits)
  const records = useJourneyStore((state) => state.records)
  const deviation = useJourneyStore((state) => state.currentDeviationDegrees)
  const lastLanding = useJourneyStore((state) => state.lastLanding)
  const recordLanding = useJourneyStore((state) => state.recordLanding)
  const cycle = flightCycleProgress(journey.startDate, localDateKey()).cycle
  const existingResult = lastLanding?.cycle === cycle ? lastLanding : null
  const [phase, setPhase] = useState<LandingPhase>(existingResult ? 'result' : 'briefing')
  const resultWritten = useRef(Boolean(existingResult))

  const truth = useMemo(
    () => cycleTruthScore(records, habits, journey.startDate, cycle),
    [cycle, habits, journey.startDate, records],
  )
  const completionPercent = Math.round(truth.completionRate * 100)
  const grade = landingGrade(truth.completionRate)
  const offset = landingOffsetPercent(truth.completionRate, deviation)
  const copy = GRADE_COPY[grade]

  useEffect(() => {
    if (phase !== 'approach') return
    const finish = window.setTimeout(() => {
      if (!resultWritten.current) {
        const result: CycleLandingResult = {
          cycle,
          completionPercent,
          grade,
          landedAt: new Date().toISOString(),
        }
        recordLanding(result)
        resultWritten.current = true
      }
      focusHaptic(grade === 'alternate' ? 'failure' : 'success')
      setPhase('result')
    }, 5_600)
    return () => window.clearTimeout(finish)
  }, [completionPercent, cycle, grade, phase, recordLanding])

  const startApproach = () => {
    resultWritten.current = false
    focusHaptic('start')
    setPhase('approach')
  }

  return (
    <AnimatePresence>
      <motion.section
        className={`landing-approach-layer landing-grade-${grade}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        aria-label={`30-Tage-Landung, ${completionPercent} Prozent echte Erfüllung`}
      >
        <div className="landing-map-art" aria-hidden="true" />
        <div className="landing-vignette" aria-hidden="true" />
        <button className="landing-close-button" type="button" onClick={onClose} aria-label="Landeanflug schließen">×</button>

        {phase === 'approach' ? (
          <>
            <motion.div
              className="final-plane"
              initial={{ y: '-42vh', x: '-50%', scale: 0.34, rotate: offset * 0.18 }}
              animate={{ y: '22vh', x: `calc(-50% + ${offset}vw)`, scale: 1.05, rotate: 0 }}
              transition={{ duration: 5.35, ease: [0.45, 0, 0.2, 1] }}
              aria-hidden="true"
            >✈</motion.div>
            <motion.div className="landing-telemetry" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <span>FINAL · CYCLE {cycle}</span>
              <strong className="numeric">{completionPercent}% REAL</strong>
              <small>Runway wird aus Habit-Erfüllung berechnet</small>
            </motion.div>
          </>
        ) : (
          <motion.div className="landing-truth-card" initial={{ y: 26, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            {phase === 'briefing' ? (
              <>
                <p className="label-caps">30 Tage · echte Bilanz</p>
                <h2>Deine Habits bestimmen die Landebahn.</h2>
                <div className="landing-score-orbit"><strong className="numeric">{completionPercent}%</strong><span>ERFÜLLT</span></div>
                <div className="landing-facts">
                  <span><strong className="numeric">{truth.checkedInDays}/{truth.trackedDays}</strong><small>aktive Tage eingecheckt</small></span>
                  <span><strong className="numeric">{Math.abs(offset).toFixed(0)}%</strong><small>Runway-Versatz</small></span>
                </div>
                <p className="landing-integrity-note">Habit Flight trainiert deine Ziele. XP und Ringe verändern diese Landung nicht.</p>
                <button className="primary-button" type="button" onClick={startApproach}>Landeanflug starten</button>
              </>
            ) : (
              <>
                <p className="label-caps">{copy.eyebrow} · Zyklus {cycle}</p>
                <h2>{copy.title}</h2>
                <div className="landing-score-orbit"><strong className="numeric">{completionPercent}%</strong><span>REALER KURS</span></div>
                <p className="landing-result-copy">{copy.detail}</p>
                <div className="landing-facts">
                  <span><strong className="numeric">{truth.checkedInDays}</strong><small>Check-in-Tage</small></span>
                  <span><strong className="numeric">{Math.abs(offset).toFixed(0)}%</strong><small>neben Centerline</small></span>
                </div>
                <button className="primary-button" type="button" onClick={onClose}>Nächsten Kurs vorbereiten</button>
                <button className="text-button" type="button" onClick={startApproach}>Landung wiederholen</button>
              </>
            )}
          </motion.div>
        )}
      </motion.section>
    </AnimatePresence>
  )
}
