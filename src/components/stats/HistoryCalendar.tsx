'use client'

import { useMemo, useState } from 'react'
import { Glyph } from '@/components/icons/Glyph'
import { monthGrid, type HistoryCell } from '@/lib/journey/history'
import { localDateKey } from '@/lib/journey/date'
import { useJourneyStore } from '@/store/journeyStore'

/**
 * The chain, drawn as a month.
 *
 * A streak number tells you where you are; this tells you what your last month
 * actually looked like, gaps and all. The gaps are the point - a visible hole
 * in an otherwise solid grid is a far stronger argument against a second one
 * than any counter resetting to zero.
 */

const WEEKDAYS = ['M', 'D', 'M', 'D', 'F', 'S', 'S']

const OUTCOME_LABELS: Record<HistoryCell['outcome'], string> = {
  kept: 'bestätigt',
  broken: 'unter 50%',
  missed: 'verpasst',
  frozen: 'Kettenschutz',
  rest: 'Ruhetag',
  pending: 'heute offen',
  outside: '',
}

export function HistoryCalendar() {
  const records = useJourneyStore((state) => state.records)
  const habits = useJourneyStore((state) => state.habits)
  const frozenDates = useJourneyStore((state) => state.streakFrozenDates)
  const today = localDateKey()
  const [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)

  const view = useMemo(() => {
    const anchor = new Date(`${today}T12:00:00`)
    anchor.setDate(1)
    anchor.setMonth(anchor.getMonth() + offset)
    return monthGrid(
      { records, habits, frozenDates, today },
      anchor.getFullYear(),
      anchor.getMonth(),
    )
  }, [records, habits, frozenDates, today, offset])

  const selectedCell = selected ? view.cells.find((cell) => cell.date === selected) : null
  const selectedRecord = selected ? records.find((record) => record.date === selected) : null
  const earliest = records[0]?.date

  return (
    <section className="stats-section history-section">
      <div className="section-heading">
        <div>
          <p className="label-caps-micro">Verlauf</p>
          <h2>{view.label}</h2>
        </div>
        <div className="history-nav">
          <button
            type="button"
            onClick={() => setOffset((current) => current - 1)}
            disabled={Boolean(earliest) && view.cells[0].date <= (earliest ?? '')}
            aria-label="Vorheriger Monat"
          >
            <Glyph name="chevronLeft" size={14} />
          </button>
          <button
            type="button"
            onClick={() => setOffset((current) => Math.min(0, current + 1))}
            disabled={offset >= 0}
            aria-label="Nächster Monat"
          >
            <Glyph name="chevronRight" size={14} />
          </button>
        </div>
      </div>

      <div className="history-grid" data-testid="history-grid">
        {WEEKDAYS.map((label, index) => (
          <span key={`${label}-${index}`} className="history-weekday" aria-hidden="true">
            {label}
          </span>
        ))}
        {Array.from({ length: view.leadingBlanks }, (_value, index) => (
          <i key={`blank-${index}`} className="history-blank" aria-hidden="true" />
        ))}
        {view.cells.map((cell) => (
          <button
            key={cell.date}
            type="button"
            className="history-cell"
            data-outcome={cell.outcome}
            data-today={cell.isToday}
            data-perfect={cell.perfect}
            data-selected={cell.date === selected}
            disabled={cell.isFuture}
            onClick={() => setSelected(cell.date === selected ? null : cell.date)}
            aria-label={`${cell.date}${OUTCOME_LABELS[cell.outcome] ? `, ${OUTCOME_LABELS[cell.outcome]}` : ''}`}
          >
            <span className="numeric">{Number(cell.date.slice(8))}</span>
          </button>
        ))}
      </div>

      {selectedCell ? (
        <div className="history-detail" data-testid="history-detail">
          <div>
            <strong className="numeric">
              {new Date(`${selectedCell.date}T12:00:00`).toLocaleDateString('de-DE', {
                weekday: 'short',
                day: '2-digit',
                month: 'short',
              })}
            </strong>
            <small>{OUTCOME_LABELS[selectedCell.outcome] || '—'}</small>
          </div>
          {selectedRecord ? (
            <div className="history-detail-figures">
              <span className="numeric">{Math.round(selectedRecord.completionRate * 100)}%</span>
              <small>
                {selectedRecord.recoveredDegrees > 0 ? `−${selectedRecord.recoveredDegrees}° ` : ''}
                {selectedRecord.addedDegrees > 0 ? `+${selectedRecord.addedDegrees}°` : ''}
                {selectedRecord.recoveredDegrees === 0 && selectedRecord.addedDegrees === 0
                  ? 'Kurs gehalten'
                  : ''}
              </small>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="history-legend">
          {(['kept', 'broken', 'missed', 'frozen', 'rest'] as const).map((outcome) => (
            <span key={outcome}>
              <i data-outcome={outcome} aria-hidden="true" />
              {OUTCOME_LABELS[outcome]}
            </span>
          ))}
        </div>
      )}
    </section>
  )
}
