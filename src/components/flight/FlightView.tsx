'use client'

import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { FlightHud } from './FlightHud'
import { FlightScene } from './FlightScene'
import { FlightSequenceOverlay } from './FlightSequenceOverlay'
import { FocusFlightOverlay } from './FocusFlightOverlay'
import { useDayCompletionSequence } from './useDayCompletionSequence'
import { GameOverlay } from '@/components/game/GameOverlay'
import { HabitsPanel } from '@/components/habits/HabitsPanel'
import { StatsPanel } from '@/components/stats/StatsPanel'
import type { DailyFlightRecord } from '@/lib/journey/types'
import { useFlightStore } from '@/store/flightStore'
import { useJourneyStore } from '@/store/journeyStore'
import { prepareFocusNotifications } from '@/lib/notifications/focusNotifications'
import { configureNativeChrome, focusHaptic } from '@/lib/native/ios'

type PageIndex = 0 | 1 | 2

export function FlightView() {
  const [page, setPage] = useState<PageIndex>(1)
  const pointerStart = useRef<{ x: number; y: number } | null>(null)
  const sceneInitialised = useRef(false)
  const hydrated = useJourneyStore((state) => state.hydrated)
  const initializeJourney = useJourneyStore((state) => state.initializeJourney)
  const currentDeviation = useJourneyStore((state) => state.currentDeviationDegrees)
  const gameMode = useJourneyStore((state) => state.gameMode)
  const focusFlight = useJourneyStore((state) => state.focusFlight)
  const startFocusFlight = useJourneyStore((state) => state.startFocusFlight)
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
    void configureNativeChrome()
  }, [])

  const handleComplete = (record: DailyFlightRecord) => {
    setPage(1)
    start(record)
  }

  const swipeEnabled = gameMode === 'idle' && !sequenceRunning && !focusFlight

  return (
    <main
      className="app-shell"
      onPointerDown={(event) => {
        if (!swipeEnabled) return
        pointerStart.current = { x: event.clientX, y: event.clientY }
      }}
      onPointerUp={(event) => {
        if (!swipeEnabled || !pointerStart.current) return
        const dx = event.clientX - pointerStart.current.x
        const dy = event.clientY - pointerStart.current.y
        pointerStart.current = null
        if (Math.abs(dx) < 64 || Math.abs(dx) < Math.abs(dy) * 1.2) return
        if (dx < 0) setPage((current) => Math.min(2, current + 1) as PageIndex)
        else setPage((current) => Math.max(0, current - 1) as PageIndex)
      }}
    >
      <motion.div className="scene-stage" animate={{ opacity: page === 1 ? 1 : 0.22, scale: page === 1 ? 1 : 0.96 }} transition={{ duration: 0.45 }}>
        <FlightScene />
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
        />
        <section className="flight-page" aria-label="Flug"><FlightHud onOpenHabits={() => setPage(0)} onOpenStats={() => setPage(2)} /></section>
        <StatsPanel onBackToFlight={() => setPage(1)} />
      </motion.div>
      {gameMode === 'idle' && !sequenceRunning && !focusFlight ? (
        <nav className="page-dots" aria-label="Bereiche">
          {['Habits', 'Flug', 'Stats'].map((label, index) => <button key={label} type="button" className={page === index ? 'active' : ''} onClick={() => setPage(index as PageIndex)} aria-label={label} />)}
        </nav>
      ) : null}
      <GameOverlay />
      <FocusFlightOverlay />
      <FlightSequenceOverlay onSkip={skip} />
    </main>
  )
}
