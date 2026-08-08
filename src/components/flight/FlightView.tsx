'use client'

import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import { useEffect, useMemo, useRef, useState } from 'react'
import { FlightHud } from './FlightHud'
import { FlightScene } from './FlightScene'
import { CourseAlarm } from './CourseAlarm'
import { FlightSequenceOverlay } from './FlightSequenceOverlay'
import { FocusFlightOverlay } from './FocusFlightOverlay'
import { InstrumentSheet } from './InstrumentSheet'
import { LandingApproachOverlay } from './LandingApproachOverlay'
import { ReturnCard } from './ReturnCard'
import { useDayCompletionSequence } from './useDayCompletionSequence'
import { usePinchAndWheelZoom } from './usePinchAndWheelZoom'
import { AchievementToast } from '@/components/game/AchievementToast'
import { LevelUpCard } from '@/components/game/LevelUpCard'
import { SteeringLayer } from '@/components/game/SteeringLayer'
import { HabitsPanel } from '@/components/habits/HabitsPanel'
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow'
import { SettingsSheet } from '@/components/settings/SettingsSheet'
import { StatsPanel } from '@/components/stats/StatsPanel'
import type { DailyFlightRecord } from '@/lib/journey/types'
import { useFlightStore } from '@/store/flightStore'
import { useJourneyStore } from '@/store/journeyStore'
import { prepareFocusNotifications, refreshWebServiceWorker } from '@/lib/notifications/focusNotifications'
import { armWebReminder, syncDailyReminders } from '@/lib/notifications/reminders'
import { configureNativeChrome, focusHaptic, setHapticsEnabled } from '@/lib/native/ios'
import { flightCycleProgress, isHabitDue, localDateKey } from '@/lib/journey/date'
import { recentMissRate } from '@/lib/flight/damage'

type PageIndex = 0 | 1 | 2

const WorldRouteMap = dynamic(() => import('@/components/map/WorldRouteMap'), { ssr: false })

export function FlightView() {
  const [page, setPage] = useState<PageIndex>(1)
  const [mapOpen, setMapOpen] = useState(false)
  const [landingOpen, setLandingOpen] = useState(false)
  const [instrumentsOpen, setInstrumentsOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const pointerStart = useRef<{ x: number; y: number } | null>(null)
  const sceneInitialised = useRef(false)
  const hydrated = useJourneyStore((state) => state.hydrated)
  const onboarded = useJourneyStore((state) => state.onboarded)
  const settings = useJourneyStore((state) => state.settings)
  const initializeJourney = useJourneyStore((state) => state.initializeJourney)
  const reconcileCalendar = useJourneyStore((state) => state.reconcileCalendar)
  const pendingReturn = useJourneyStore((state) => state.pendingReturn)
  const currentDeviation = useJourneyStore((state) => state.currentDeviationDegrees)
  const focusFlight = useJourneyStore((state) => state.focusFlight)
  const habits = useJourneyStore((state) => state.habits)
  const drafts = useJourneyStore((state) => state.drafts)
  const records = useJourneyStore((state) => state.records)
  const startFocusFlight = useJourneyStore((state) => state.startFocusFlight)
  const startRecoveryFlight = useJourneyStore((state) => state.startRecoveryFlight)
  const journeyStartDate = useJourneyStore((state) => state.journey.startDate)
  const lastLanding = useJourneyStore((state) => state.lastLanding)
  const sequenceRunning = useFlightStore((state) => state.sequenceRunning)
  const resetScene = useFlightStore((state) => state.resetScene)
  const setTargetDeviation = useFlightStore((state) => state.setTargetDeviation)
  const { start, skip } = useDayCompletionSequence()

  useEffect(() => {
    if (!hydrated || sceneInitialised.current) return
    sceneInitialised.current = true
    initializeJourney()
    resetScene()
    setTargetDeviation(currentDeviation)
  }, [currentDeviation, hydrated, initializeJourney, resetScene, setTargetDeviation])

  useEffect(() => {
    if (!hydrated || !sceneInitialised.current || sequenceRunning) return
    setTargetDeviation(currentDeviation)
  }, [currentDeviation, hydrated, sequenceRunning, setTargetDeviation])

  useEffect(() => {
    void configureNativeChrome()
    void refreshWebServiceWorker()
  }, [])

  /**
   * Close the calendar out on arrival, and again whenever the app is brought
   * back to the front.
   *
   * The second half matters more than it looks: a phone that keeps this app
   * suspended for a week resumes the same JS context, so without a
   * visibility-driven sweep the day would silently never roll over.
   */
  useEffect(() => {
    if (!hydrated || !onboarded) return
    reconcileCalendar()
    const onVisible = () => {
      if (document.visibilityState === 'visible') reconcileCalendar()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [hydrated, onboarded, reconcileCalendar])

  useEffect(() => {
    setHapticsEnabled(settings.hapticsEnabled)
  }, [settings.hapticsEnabled])

  const today = localDateKey()
  const dayClosed = useMemo(
    () => records.some((record) => record.date === today),
    [records, today],
  )
  const openHabits = useMemo(
    () => habits.filter((habit) => isHabitDue(habit, today) && !drafts[habit.id]).length,
    [habits, drafts, today],
  )

  // The reminders are reconciled from state rather than fired at the moment
  // something happens: the only thing that decides whether tonight's nudge is
  // owed is whether the day is still open, and that is a fact about the store,
  // not an event.
  useEffect(() => {
    if (!hydrated || !onboarded) return
    void syncDailyReminders({ settings, dayClosed, openHabits })
    return armWebReminder({ settings, dayClosed, openHabits })
  }, [hydrated, onboarded, settings, dayClosed, openHabits])

  /**
   * Reveal the cycle landing on the first open after a cycle ends.
   *
   * This used to fire only while `cycle.day === 30`, which is exactly one
   * calendar day per cycle: not opening the app that Tuesday meant thirty days
   * of check-ins produced no ceremony at all and the next cycle started in
   * silence. Gating on "a cycle has completed and has not been landed" instead
   * makes the payoff impossible to miss.
   */
  useEffect(() => {
    if (!hydrated || !onboarded || pendingReturn) return
    const cycle = flightCycleProgress(journeyStartDate, localDateKey())
    const completedCycle = cycle.day === 30 ? cycle.cycle : cycle.cycle - 1
    if (completedCycle < 1 || (lastLanding?.cycle ?? 0) >= completedCycle) return
    const reveal = window.setTimeout(() => setLandingOpen(true), 0)
    return () => window.clearTimeout(reveal)
  }, [hydrated, onboarded, journeyStartDate, lastLanding?.cycle, pendingReturn])

  const handleComplete = (record: DailyFlightRecord) => {
    setPage(1)
    start(record)
  }

  const sheetOpen = mapOpen || landingOpen || instrumentsOpen || settingsOpen || Boolean(pendingReturn)
  const swipeEnabled = !sequenceRunning && !focusFlight && !sheetOpen
  // The habit flight runs forever, but hands the controls over whenever
  // something else owns the screen.
  const flightInteractive = swipeEnabled && page === 1
  const missRate = useMemo(
    () => (settings.showDamage ? recentMissRate(records.map((record) => record.statuses)) : 0),
    [records, settings.showDamage],
  )
  // Zooming out to the globe only makes sense on the flight page itself, in
  // the normal chase view - not mid-manoeuvre, mid-game, or while another
  // sheet owns the gesture.
  const zoomEnabled = swipeEnabled && page === 1
  const zoomHandlers = usePinchAndWheelZoom(zoomEnabled)

  useEffect(() => {
    // Leaving the flight page (or any other state above) mid-gesture must not
    // strand the camera half-way to the globe.
    if (!zoomEnabled) useFlightStore.getState().setZoomTarget(0)
  }, [zoomEnabled])

  // Setup owns the whole screen. Rendering the HUD behind it would let someone
  // rate a habit that the flow is about to replace.
  if (hydrated && !onboarded) return <OnboardingFlow />

  return (
    <main
      className="app-shell"
      // The scene canvas sits behind `.app-track` in paint order and that
      // track covers the full viewport with `pointer-events: auto` for its
      // own buttons, so wheel/pinch/swipe input for the 3D view has to be
      // captured up here rather than on the canvas itself.
      onWheel={zoomHandlers.onWheel}
      onPointerDown={(event) => {
        zoomHandlers.onPointerDown?.(event)
        if (!swipeEnabled) return
        // A second simultaneous touch means a pinch is starting, not a swipe -
        // drop any in-progress swipe tracking rather than let the two gestures
        // fight over the same pointer data.
        if (!event.isPrimary) {
          pointerStart.current = null
          return
        }
        pointerStart.current = { x: event.clientX, y: event.clientY }
      }}
      onPointerMove={zoomHandlers.onPointerMove}
      onPointerUp={(event) => {
        zoomHandlers.onPointerUp?.(event)
        if (!swipeEnabled || !pointerStart.current) return
        const dx = event.clientX - pointerStart.current.x
        const dy = event.clientY - pointerStart.current.y
        pointerStart.current = null
        if (Math.abs(dx) < 64 || Math.abs(dx) < Math.abs(dy) * 1.2) return
        if (dx < 0) setPage((current) => Math.min(2, current + 1) as PageIndex)
        else setPage((current) => Math.max(0, current - 1) as PageIndex)
      }}
      onPointerCancel={zoomHandlers.onPointerCancel}
    >
      <motion.div className="scene-stage" animate={{ opacity: page === 1 ? 1 : 0.22, scale: page === 1 ? 1 : 0.96 }} transition={{ duration: 0.45 }}>
        <FlightScene
          paused={mapOpen || landingOpen}
          interactive={flightInteractive}
          missRate={missRate}
          showDamage={settings.showDamage}
        />
      </motion.div>
      <motion.div className="app-track" animate={{ x: `${page * -100}vw` }} transition={{ type: 'spring', stiffness: 280, damping: 34, mass: 0.85 }}>
        <HabitsPanel
          onBackToFlight={() => setPage(1)}
          onComplete={handleComplete}
          onStartTask={(habit) => {
            setPage(1)
            startFocusFlight(habit)
            focusHaptic('start')
            void prepareFocusNotifications()
          }}
          onStartRecovery={(mission) => {
            setPage(1)
            startRecoveryFlight(mission.id)
            focusHaptic('start')
            void prepareFocusNotifications()
          }}
        />
        <section className="flight-page" aria-label="Flug">
          <FlightHud
            onOpenHabits={() => setPage(0)}
            onOpenStats={() => setPage(2)}
            onOpenMap={() => setMapOpen(true)}
            onOpenInstruments={() => setInstrumentsOpen(true)}
            onOpenSettings={() => setSettingsOpen(true)}
            onStartLanding={() => setLandingOpen(true)}
          />
        </section>
        <StatsPanel onBackToFlight={() => setPage(1)} onOpenSettings={() => setSettingsOpen(true)} />
      </motion.div>
      {!sequenceRunning && !focusFlight && !sheetOpen ? (
        <nav className="page-dots" aria-label="Bereiche">
          {['Habits', 'Flug', 'Stats'].map((label, index) => <button key={label} type="button" className={page === index ? 'active' : ''} onClick={() => setPage(index as PageIndex)} aria-label={label} />)}
        </nav>
      ) : null}
      {page === 1 ? <CourseAlarm /> : null}
      <SteeringLayer active={flightInteractive} />
      <ReturnCard />
      <AchievementToast />
      <LevelUpCard />
      <FocusFlightOverlay />
      <FlightSequenceOverlay onSkip={skip} />
      {instrumentsOpen ? <InstrumentSheet onClose={() => setInstrumentsOpen(false)} /> : null}
      {settingsOpen ? <SettingsSheet onClose={() => setSettingsOpen(false)} /> : null}
      {mapOpen ? <WorldRouteMap onClose={() => setMapOpen(false)} /> : null}
      {landingOpen ? <LandingApproachOverlay onClose={() => setLandingOpen(false)} /> : null}
    </main>
  )
}
