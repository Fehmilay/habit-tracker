'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  cancelFocusNotifications,
  FOCUS_LANDING_NOTIFICATION_ID,
  FOCUS_RETURN_NOTIFICATION_ID,
  scheduleFocusNotification,
  showFocusNotification,
} from '@/lib/notifications/focusNotifications'
import { useJourneyStore } from '@/store/journeyStore'
import { focusHaptic } from '@/lib/native/ios'

const AWAY_LIMIT_MS = 60_000

function formatRemaining(milliseconds: number): string {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000))
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}

/** A focused timer that makes absence materially visible in the product. */
export function FocusFlightOverlay() {
  const focusFlight = useJourneyStore((state) => state.focusFlight)
  const habits = useJourneyStore((state) => state.habits)
  const setFocusHiddenAt = useJourneyStore((state) => state.setFocusHiddenAt)
  const landFocusFlight = useJourneyStore((state) => state.landFocusFlight)
  const crashFocusFlight = useJourneyStore((state) => state.crashFocusFlight)
  const clearFocusFlight = useJourneyStore((state) => state.clearFocusFlight)
  const exitFocusFlight = useJourneyStore((state) => state.exitFocusFlight)
  const startFocusFlight = useJourneyStore((state) => state.startFocusFlight)
  const startRecoveryFlight = useJourneyStore((state) => state.startRecoveryFlight)
  const [now, setNow] = useState(() => Date.now())
  const warnedForStart = useRef<number | null>(null)
  const resolvedFlight = useRef<number | null>(null)
  const focusStatus = focusFlight?.status
  const focusEndsAt = focusFlight?.endsAt
  const focusHabitName = focusFlight?.habitName

  useEffect(() => {
    if (!focusFlight || focusFlight.status === 'flying') return
    if (resolvedFlight.current === focusFlight.startedAt) return
    resolvedFlight.current = focusFlight.startedAt
    focusHaptic(focusFlight.status === 'landed' ? 'success' : 'failure')
  }, [focusFlight])

  useEffect(() => {
    if (!focusFlight || focusFlight.status !== 'flying') return

    const reconcile = () => {
      const current = Date.now()
      setNow(current)
      const state = useJourneyStore.getState().focusFlight
      if (!state || state.status !== 'flying') return

      if (document.visibilityState === 'hidden') {
        if (state.hiddenAt === null) {
          setFocusHiddenAt(current)
          void scheduleFocusNotification(
            FOCUS_RETURN_NOTIFICATION_ID,
            'Dein Flug wartet',
            `Kehre zu „${state.habitName}“ zurück, bevor dein Flug abstürzt.`,
            current + 45_000,
          )
        }
        return
      }

      if (state.hiddenAt !== null) {
        if (current - state.hiddenAt >= AWAY_LIMIT_MS) {
          crashFocusFlight()
          return
        }
        setFocusHiddenAt(null)
        void cancelFocusNotifications([FOCUS_RETURN_NOTIFICATION_ID])
      }

      if (current >= state.endsAt) landFocusFlight()
    }

    reconcile()
    const interval = window.setInterval(reconcile, 250)
    document.addEventListener('visibilitychange', reconcile)
    window.addEventListener('focus', reconcile)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', reconcile)
      window.removeEventListener('focus', reconcile)
    }
  }, [crashFocusFlight, focusFlight, landFocusFlight, setFocusHiddenAt])

  useEffect(() => {
    if (!focusEndsAt || focusStatus !== 'flying' || !focusHabitName) {
      void cancelFocusNotifications([FOCUS_LANDING_NOTIFICATION_ID, FOCUS_RETURN_NOTIFICATION_ID])
      return
    }

    const landingWarningAt = focusEndsAt - 60_000
    if (landingWarningAt > Date.now()) {
      void scheduleFocusNotification(
        FOCUS_LANDING_NOTIFICATION_ID,
        'Noch 60 Sekunden',
        `${focusHabitName} landet gleich. Bleib auf Kurs.`,
        landingWarningAt,
      )
    }
  }, [focusEndsAt, focusHabitName, focusStatus])

  useEffect(() => {
    if (!focusFlight || focusFlight.status !== 'flying') return
    if (warnedForStart.current === focusFlight.startedAt) return
    warnedForStart.current = focusFlight.startedAt

    const notifyWhenAway = () => {
      if (document.visibilityState !== 'hidden') return
      void showFocusNotification(
        'Dein Flug wartet',
        `Kehre zu „${focusFlight.habitName}“ zurück, bevor dein Flug abstürzt.`,
      )
    }
    document.addEventListener('visibilitychange', notifyWhenAway)
    return () => document.removeEventListener('visibilitychange', notifyWhenAway)
  }, [focusFlight])

  useEffect(() => {
    if (!focusFlight || focusFlight.status !== 'flying') return
    const warningDelay = Math.max(1_000, focusFlight.endsAt - Date.now() - 60_000)
    const warning = window.setTimeout(() => {
      if (document.visibilityState === 'visible') {
        void showFocusNotification('Noch 60 Sekunden', `${focusFlight.habitName} landet gleich.`)
      }
    }, warningDelay)
    return () => window.clearTimeout(warning)
  }, [focusFlight])

  const habit = useMemo(
    () => habits.find((candidate) => candidate.id === focusFlight?.habitId),
    [focusFlight?.habitId, habits],
  )
  const recovery = focusFlight?.kind === 'recovery'
  const remaining = focusFlight ? Math.max(0, focusFlight.endsAt - now) : 0
  const awayRemaining = focusFlight?.hiddenAt
    ? Math.max(0, AWAY_LIMIT_MS - (now - focusFlight.hiddenAt))
    : null

  return (
    <AnimatePresence>
      {focusFlight ? (
        <motion.section
          className={`focus-flight-layer focus-${focusFlight.status}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          aria-live="polite"
          aria-label={`Fokusflug: ${focusFlight.habitName}`}
        >
          {focusFlight.status === 'flying' ? (
            <motion.div className="focus-flight-hud" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
              <div className="focus-flight-topline">
                <button className="focus-exit-button" type="button" onClick={exitFocusFlight} aria-label="Fokusflug ohne Abschluss beenden">×</button>
                <span className="focus-live-dot" aria-hidden="true" />
                <span>FOKUSFLUG</span>
                <strong className="numeric">{formatRemaining(remaining)}</strong>
              </div>
              <div className="focus-task-chip"><span>{habit?.icon ?? '✦'}</span>{focusFlight.habitName}</div>
              <div className="focus-progress" aria-label={`${formatRemaining(remaining)} verbleibend`}>
                <i style={{ transform: `scaleX(${Math.max(0, Math.min(1, remaining / (focusFlight.durationMinutes * 60_000)))})` }} />
              </div>
              <p>{awayRemaining === null ? 'Bleib in der App. Über 60 Sek. außerhalb = Absturz.' : `Rückkehrfenster: ${formatRemaining(awayRemaining)}`}</p>
            </motion.div>
          ) : null}

          {focusFlight.status === 'landed' ? (
            <motion.div className="focus-result focus-landed-card" initial={{ scale: 0.82, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', damping: 17 }}>
              <motion.div className="landing-plane" initial={{ x: -150, y: -90, rotate: -16 }} animate={{ x: 8, y: 0, rotate: 0 }} transition={{ duration: 1.15, ease: [0.16, 1, 0.3, 1] }}>✈</motion.div>
              <div className="runway" aria-hidden="true"><i /><i /><i /></div>
              <p className="label-caps">{recovery ? 'Comeback gelandet' : 'Saubere Landung'}</p>
              <h2>{recovery ? `${focusFlight.recoveryDegrees ?? 0}° Kurs zurückgeholt.` : `${focusFlight.habitName} ist erledigt.`}</h2>
              <span>{recovery ? `Der alte Fehlschlag bleibt ehrlich bestehen · +8 Treibstoff` : `${focusFlight.durationMinutes} Minuten auf Kurs · Habit abgehakt`}</span>
              <button className="primary-button" type="button" onClick={clearFocusFlight}>Zurück zum Kurs</button>
            </motion.div>
          ) : null}

          {focusFlight.status === 'crashed' ? (
            <motion.div className="focus-result focus-crashed-card" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
              <div className="crash-mark" aria-hidden="true">↘</div>
              <p className="label-caps">Flug abgebrochen</p>
              <h2>Du warst länger als 60 Sekunden weg.</h2>
              <span>{recovery ? 'Die Comeback-Mission bleibt verfügbar.' : `${focusFlight.habitName} wurde nicht abgehakt.`}</span>
              <button className="primary-button" type="button" onClick={() => recovery && focusFlight.recoveryMissionId ? startRecoveryFlight(focusFlight.recoveryMissionId) : habit && startFocusFlight(habit)}>Neu starten</button>
              <button className="text-button" type="button" onClick={clearFocusFlight}>Zum Kurs zurück</button>
            </motion.div>
          ) : null}
        </motion.section>
      ) : null}
    </AnimatePresence>
  )
}
