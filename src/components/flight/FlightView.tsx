'use client'

import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import { useEffect, useMemo, useRef, useState } from 'react'
import { FlightHud } from './FlightHud'
import { FlightScene } from './FlightScene'
import { CourseAlarm } from './CourseAlarm'
import { FlightSequenceOverlay } from './FlightSequenceOverlay'
import { FocusFlightOverlay } from './FocusFlightOverlay'
import { LandingApproachOverlay } from './LandingApproachOverlay'
import { useDayCompletionSequence } from './useDayCompletionSequence'
import { usePinchAndWheelZoom } from './usePinchAndWheelZoom'
import { LevelUpCard } from '@/components/game/LevelUpCard'
import { SteeringLayer } from '@/components/game/SteeringLayer'
import { HabitsPanel } from '@/components/habits/HabitsPanel'
import { StatsPanel } from '@/components/stats/StatsPanel'
import type { DailyFlightRecord } from '@/lib/journey/types'
import { useFlightStore } from '@/store/flightStore'
import { useJourneyStore } from '@/store/journeyStore'
import { prepareFocusNotifications, refreshWebServiceWorker } from '@/lib/notifications/focusNotifications'
import { configureNativeChrome, focusHaptic } from '@/lib/native/ios'
import { flightCycleProgress, localDateKey } from '@/lib/journey/date'
import { recentMissRate } from '@/lib/flight/damage'

type PageIndex = 0 | 1 | 2

const WorldRouteMap = dynamic(() => import('@/components/map/WorldRouteMap'), { ssr: false })

export function FlightView() {
  const [page, setPage] = useState<PageIndex>(1)
  const [mapOpen, setMapOpen] = useState(false)
  const [landingOpen, setLandingOpen] = useState(false)
  const pointerStart = useRef<{ x: number; y: number } | null>(null)
  const sceneInitialised = useRef(false)
  const hydrated = useJourneyStore((state) => state.hydrated)
  const initializeJourney = useJourneyStore((state) => state.initializeJourney)
  const currentDeviation = useJourneyStore((state) => state.currentDeviationDegrees)
  const focusFlight = useJourneyStore((state) => state.focusFlight)
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

  useEffect(() => {
    if (!hydrated) return
    const cycle = flightCycleProgress(journeyStartDate, localDateKey())
    if (cycle.day !== 30 || lastLanding?.cycle === cycle.cycle) return
    const reveal = window.setTimeout(() => setLandingOpen(true), 0)
    return () => window.clearTimeout(reveal)
  }, [hydrated, journeyStartDate, lastLanding?.cycle])

  const handleComplete = (record: DailyFlightRecord) => {
    setPage(1)
    start(record)
  }

  const swipeEnabled = !sequenceRunning && !focusFlight && !mapOpen && !landingOpen
  // The habit flight runs forever, but hands the controls over whenever
  // something else owns the screen.
  const flightInteractive = swipeEnabled && page === 1
  const missRate = useMemo(
    () => recentMissRate(records.map((record) => record.statuses)),
    [records],
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
        <section className="flight-page" aria-label="Flug"><FlightHud onOpenHabits={() => setPage(0)} onOpenStats={() => setPage(2)} onOpenMap={() => setMapOpen(true)} onStartLanding={() => setLandingOpen(true)} /></section>
        <StatsPanel onBackToFlight={() => setPage(1)} />
      </motion.div>
      {!sequenceRunning && !focusFlight && !mapOpen ? (
        <nav className="page-dots" aria-label="Bereiche">
          {['Habits', 'Flug', 'Stats'].map((label, index) => <button key={label} type="button" className={page === index ? 'active' : ''} onClick={() => setPage(index as PageIndex)} aria-label={label} />)}
        </nav>
      ) : null}
      {page === 1 ? <CourseAlarm /> : null}
      <SteeringLayer active={flightInteractive} />
      <LevelUpCard />
      <FocusFlightOverlay />
      <FlightSequenceOverlay onSkip={skip} />
      {mapOpen ? <WorldRouteMap onClose={() => setMapOpen(false)} /> : null}
      {landingOpen ? <LandingApproachOverlay onClose={() => setLandingOpen(false)} /> : null}
    </main>
  )
}
