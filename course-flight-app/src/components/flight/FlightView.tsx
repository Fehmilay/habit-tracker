'use client'

import { useEffect } from 'react'
import { DevControls } from './DevControls'
import { FlightHud } from './FlightHud'
import { FlightScene } from './FlightScene'
import { FlightSequenceOverlay } from './FlightSequenceOverlay'
import { useDayAnimationPreview } from './useDayAnimationPreview'
import { useFlightStore } from '@/store/flightStore'

/**
 * The main view: the 3D flight scene with the HUD layered over it.
 *
 * This is the app's home screen, and it is a flight - not a dashboard, not a
 * map. Everything else in the product will be reached from here.
 */
export function FlightView() {
  const resetScene = useFlightStore((state) => state.resetScene)
  const { start, skip } = useDayAnimationPreview()

  // Start from a known state on every mount, so a reload always begins on
  // course rather than inheriting whatever the last session left behind.
  useEffect(() => {
    resetScene()
  }, [resetScene])

  return (
    <main
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        background: 'var(--color-night-deep)',
      }}
    >
      <FlightScene />
      <FlightHud />
      <FlightSequenceOverlay onSkip={skip} />
      <DevControls onRunSequence={start} />
    </main>
  )
}
