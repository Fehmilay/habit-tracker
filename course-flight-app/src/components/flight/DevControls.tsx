'use client'

import { useState } from 'react'
import { selectTargetDeviation, useFlightStore } from '@/store/flightStore'

const DEVIATION_PRESETS = [0, 1, 3] as const

interface DevControlsProps {
  onRunSequence: () => void
}

/**
 * Phase 1 development controls.
 *
 * These exist so the flight behaviour can be reviewed without a check-in flow:
 * the fixed deviations named in the brief, the return to zero, and a run of the
 * day-animation preview. They are a scaffold for reviewing Phase 1 and are
 * expected to be removed once the real check-in lands in Phase 3.
 */
export function DevControls({ onRunSequence }: DevControlsProps) {
  const [open, setOpen] = useState(true)
  const setTargetDeviation = useFlightStore((state) => state.setTargetDeviation)
  const resetCourse = useFlightStore((state) => state.resetCourse)
  const sequenceRunning = useFlightStore((state) => state.sequenceRunning)
  const targetDeviation = useFlightStore(selectTargetDeviation)

  return (
    <div
      data-testid="dev-controls"
      style={{
        position: 'absolute',
        left: 'calc(var(--safe-left) + 20px)',
        right: 'calc(var(--safe-right) + 20px)',
        // Sits in the band between the aircraft and the footer, so the dev
        // scaffold never covers the thing it exists to let you review.
        bottom: 'calc(var(--safe-bottom) + 166px)',
        zIndex: 'var(--z-dev-tools)',
        display: 'flex',
        // A single scrolling row rather than a wrapping one. On a 375px-wide
        // phone wrapping produced two rows, and the upper row landed on top of
        // the aircraft - hiding exactly what these controls exist to reveal.
        flexWrap: 'nowrap',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        gap: 6,
        justifyContent: 'flex-start',
        alignItems: 'center',
        pointerEvents: 'auto',
      }}
    >
      <button
        type="button"
        data-testid="dev-toggle"
        onClick={() => setOpen((value) => !value)}
        style={chipStyle(false, true)}
      >
        {open ? 'Dev ×' : 'Dev'}
      </button>

      {open ? (
        <>
          {DEVIATION_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              data-testid={`dev-set-${preset}`}
              disabled={sequenceRunning}
              onClick={() => setTargetDeviation(preset)}
              style={chipStyle(
                Math.abs(targetDeviation - preset) < 0.01,
                false,
                sequenceRunning,
              )}
            >
              {preset > 0 ? `+${preset}°` : '0°'}
            </button>
          ))}

          <button
            type="button"
            data-testid="dev-reset"
            disabled={sequenceRunning}
            onClick={resetCourse}
            style={chipStyle(false, false, sequenceRunning)}
          >
            Zurück auf 0°
          </button>

          <button
            type="button"
            data-testid="dev-run-sequence"
            disabled={sequenceRunning}
            onClick={onRunSequence}
            style={chipStyle(false, true, sequenceRunning)}
          >
            Tagesanimation testen
          </button>
        </>
      ) : null}
    </div>
  )
}

function chipStyle(
  active: boolean,
  emphasised: boolean,
  disabled = false,
): React.CSSProperties {
  return {
    padding: '6px 11px',
    borderRadius: 999,
    border: `1px solid ${
      active ? 'rgba(124, 201, 255, 0.55)' : 'rgba(255, 255, 255, 0.12)'
    }`,
    background: active
      ? 'rgba(124, 201, 255, 0.18)'
      : emphasised
        ? 'rgba(22, 29, 38, 0.78)'
        : 'rgba(22, 29, 38, 0.55)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    color: active ? 'var(--color-course-bright)' : 'var(--color-ink-secondary)',
    fontSize: '0.625rem',
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    flex: '0 0 auto',
    opacity: disabled ? 0.4 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background 220ms var(--ease-standard), color 220ms var(--ease-standard)',
  }
}
