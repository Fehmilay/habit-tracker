'use client'

import { motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { Glyph } from '@/components/icons/Glyph'
import { flightRuntime } from '@/lib/flight/flightRuntime'
import { useSheetDismiss } from '@/lib/interaction/useSheetDismiss'
import { formatKilometres } from '@/lib/flight/formatDeviation'
import { formatShortDate } from '@/lib/flight/instruments'
import { useInstruments } from '@/store/hooks'
import { useFlightStore } from '@/store/flightStore'
import { useJourneyStore } from '@/store/journeyStore'

/**
 * The full instrument panel.
 *
 * Everything in here is a habit figure wearing a flight instrument's clothes,
 * and every tile says out loud which is which - the mapping is the product, so
 * hiding it behind a metaphor would waste it. The panel opens from the HUD bar
 * and leads with the one line worth acting on.
 */
export function InstrumentSheet({ onClose }: { onClose: () => void }) {
  const readout = useInstruments()
  const journey = useJourneyStore((state) => state.journey)
  useSheetDismiss(onClose)

  return (
    <div
      className="sheet-backdrop"
      role="presentation"
      onPointerDown={(event) => {
        event.stopPropagation()
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <motion.div
        className="editor-sheet instrument-sheet"
        data-testid="instrument-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Instrumente"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 26, stiffness: 260 }}
      >
        <div className="sheet-handle" />
        <div className="sheet-title-row">
          <div>
            <p className="label-caps-micro">Cockpit</p>
            <h2>Instrumente</h2>
          </div>
          <button type="button" className="round-icon-button" onClick={onClose} aria-label="Schließen">
            <Glyph name="cross" size={16} />
          </button>
        </div>

        <AttitudeIndicator />

        <p className="instrument-next-action" data-testid="instrument-next-action">
          {readout.nextAction}
        </p>

        <div className="instrument-grid">
          {readout.instruments.map((instrument) => (
            <article key={instrument.id} data-tone={instrument.tone}>
              <header>
                <span className="instrument-code numeric">{instrument.code}</span>
                <span className="instrument-title">{instrument.title}</span>
              </header>
              <strong className="numeric">
                {instrument.value}
                <b>{instrument.unit}</b>
              </strong>
              <i aria-hidden="true">
                <b style={{ width: `${Math.round(instrument.ratio * 100)}%` }} />
              </i>
              <small>{instrument.caption}</small>
            </article>
          ))}
        </div>

        <div className="instrument-route">
          <div>
            <span className="label-caps-micro">Geflogen</span>
            <strong className="numeric">{formatKilometres(readout.distanceFlownKm)} km</strong>
          </div>
          <i aria-hidden="true">
            <b
              style={{
                width: `${Math.round(
                  (readout.distanceFlownKm / Math.max(1, journey.totalDistanceKm)) * 100,
                )}%`,
              }}
            />
          </i>
          <div>
            <span className="label-caps-micro">{journey.destinationIata}</span>
            <strong className="numeric">{formatKilometres(readout.remainingDistanceKm)} km</strong>
          </div>
        </div>

        <p className="instrument-footnote">
          Geplante Ankunft {formatShortDate(readout.plannedArrivalDate)} · Prognose{' '}
          {formatShortDate(readout.etaDate)}. Jeder bestätigte Tag bringt dich seinen
          Erfüllungsanteil einer Tagesetappe weiter - ein halber Tag also eine halbe Etappe.
        </p>
      </motion.div>
    </div>
  )
}

/**
 * A live attitude indicator.
 *
 * Reads the flight runtime on an animation frame and writes transforms
 * straight to the DOM, the same way `DeviationReadout` does - routing a value
 * that changes every frame through React state would re-render this sheet
 * sixty times a second to move one horizon line.
 */
function AttitudeIndicator() {
  const plannedHeading = useFlightStore((state) => state.plannedHeadingDegrees)
  const horizonRef = useRef<SVGGElement>(null)
  const headingRef = useRef<HTMLSpanElement>(null)
  const bankRef = useRef<SVGGElement>(null)
  const lastHeading = useRef('')

  useEffect(() => {
    let frame = 0

    const tick = () => {
      const roll = flightRuntime.currentRollDegrees + flightRuntime.steerRollDegrees
      const pitch = flightRuntime.currentPitchDegrees

      if (horizonRef.current) {
        horizonRef.current.setAttribute(
          'transform',
          `rotate(${(-roll).toFixed(2)} 60 44) translate(0 ${(pitch * 2.6).toFixed(2)})`,
        )
      }
      if (bankRef.current) {
        bankRef.current.setAttribute('transform', `rotate(${(-roll).toFixed(2)} 60 44)`)
      }

      const heading = ((flightRuntime.currentHeadingDegrees - plannedHeading) % 360).toFixed(1)
      if (headingRef.current && heading !== lastHeading.current) {
        const value = Number(heading)
        headingRef.current.textContent = `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value).toFixed(1)}°`
        lastHeading.current = heading
      }

      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [plannedHeading])

  return (
    <div className="attitude-indicator" aria-hidden="true">
      <svg viewBox="0 0 120 88" role="presentation">
        <defs>
          <clipPath id="attitude-clip">
            <rect x="0" y="0" width="120" height="88" rx="16" />
          </clipPath>
        </defs>
        <g clipPath="url(#attitude-clip)">
          <g ref={horizonRef}>
            <rect x="-80" y="-90" width="280" height="134" fill="#12314c" />
            <rect x="-80" y="44" width="280" height="140" fill="#241c14" />
            <rect x="-80" y="43" width="280" height="2" fill="#c4e8ff" />
            {[-20, -10, 10, 20].map((offset) => (
              <rect
                key={offset}
                x={offset % 20 === 0 ? 44 : 50}
                y={44 + offset * 1.4}
                width={offset % 20 === 0 ? 32 : 20}
                height="1"
                fill="rgba(196,232,255,.5)"
              />
            ))}
          </g>
          <g ref={bankRef}>
            <polygon points="60,10 56,17 64,17" fill="#ffd489" />
          </g>
          {/* Fixed aircraft symbol: the one thing on a real ADI that never moves. */}
          <path d="M40 44h14l6 6 6-6h14" fill="none" stroke="#ffd489" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <rect x="0.6" y="0.6" width="118.8" height="86.8" rx="16" fill="none" stroke="rgba(255,255,255,.12)" />
      </svg>
      <div className="attitude-readout">
        <span className="label-caps-micro">Kursabweichung</span>
        <span ref={headingRef} className="numeric">
          0°
        </span>
      </div>
    </div>
  )
}
