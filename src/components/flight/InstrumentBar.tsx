'use client'

import type { Instrument } from '@/lib/flight/instruments'
import { useInstruments } from '@/store/hooks'

/**
 * The instrument bar.
 *
 * Four figures, always on screen, each one a real quantity from the habit
 * record: how long the chain is, how fast the last week was, whether the trend
 * is up or down, and the day the destination is actually reached at this pace.
 *
 * These are the numbers that answer "how am I doing" without opening anything,
 * which is the whole reason the aircraft is here rather than a progress bar.
 * The full panel behind it explains each one; the bar itself is deliberately
 * silent, because a HUD that captions itself stops being a HUD.
 */

const BAR_IDS: Array<Instrument['id']> = ['altitude', 'airspeed', 'vertical', 'eta']

export function InstrumentBar({ onOpen }: { onOpen: () => void }) {
  const readout = useInstruments()
  const shown = BAR_IDS.map((id) => readout.instruments.find((entry) => entry.id === id)).filter(
    (entry): entry is Instrument => Boolean(entry),
  )

  return (
    <button
      type="button"
      className="instrument-bar"
      data-testid="instrument-bar"
      onClick={onOpen}
      aria-label="Instrumente öffnen"
    >
      {shown.map((instrument) => (
        <span key={instrument.id} className="instrument-cell" data-tone={instrument.tone}>
          <small>{instrument.code}</small>
          <strong className="numeric">{instrument.value}</strong>
          <em>{instrument.unit}</em>
        </span>
      ))}
    </button>
  )
}
