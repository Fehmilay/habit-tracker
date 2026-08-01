'use client'

import { useEffect, useMemo, useState } from 'react'
import { isHabitDue, localDateKey } from '@/lib/journey/date'
import type { DailyFlightRecord, Habit, HabitStatus } from '@/lib/journey/types'
import { useJourneyStore } from '@/store/journeyStore'

const STATUS_OPTIONS: Array<{ status: HabitStatus; label: string; symbol: string }> = ([
  { status: 'completed', label: 'Erledigt', symbol: '✓' },
  { status: 'partial', label: 'Teilweise', symbol: '½' },
  { status: 'missed', label: 'Nicht erledigt', symbol: '×' },
  { status: 'not_relevant', label: 'Heute nicht relevant', symbol: '–' },
] as Array<{ status: HabitStatus; label: string; symbol: string }>).filter((option) => option.status !== 'not_relevant')

const DAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

interface HabitsPanelProps {
  onBackToFlight: () => void
  onComplete: (record: DailyFlightRecord) => void
  onStartTask: (habit: Habit) => void
}

export function HabitsPanel({ onBackToFlight, onComplete, onStartTask }: HabitsPanelProps) {
  const habits = useJourneyStore((state) => state.habits)
  const drafts = useJourneyStore((state) => state.drafts)
  const records = useJourneyStore((state) => state.records)
  const setDraftStatus = useJourneyStore((state) => state.setDraftStatus)
  const completeToday = useJourneyStore((state) => state.completeToday)
  const importLegacyHabits = useJourneyStore((state) => state.importLegacyHabits)
  const [editingHabit, setEditingHabit] = useState<Habit | 'new' | null>(null)
  const [editingGoal, setEditingGoal] = useState(false)
  const [legacyAvailable, setLegacyAvailable] = useState(false)

  const today = localDateKey()
  const dueHabits = useMemo(
    () => habits.filter((habit) => isHabitDue(habit, today)),
    [habits, today],
  )
  const completedRecord = records.find((record) => record.date === today)
  const statuses = completedRecord?.statuses ?? drafts
  const ratedCount = dueHabits.filter((habit) => statuses[habit.id]).length
  const ready = dueHabits.length > 0 && ratedCount === dueHabits.length && !completedRecord

  useEffect(() => {
    const timer = window.setTimeout(
      () => setLegacyAvailable(Boolean(window.localStorage.getItem('ht_habits'))),
      0,
    )
    return () => window.clearTimeout(timer)
  }, [])

  const handleComplete = () => {
    const record = completeToday(today)
    if (record) onComplete(record)
  }

  return (
    <section className="side-page habits-page" data-testid="habits-page">
      <header className="side-header">
        <button className="eyebrow-button" type="button" onClick={onBackToFlight}>
          ← Flug
        </button>
        <div>
          <p className="label-caps-micro">Heute</p>
          <h1>{ratedCount}/{dueHabits.length}</h1>
        </div>
        <button className="round-icon-button" type="button" onClick={() => setEditingHabit('new')} aria-label="Habit hinzufügen">
          +
        </button>
      </header>

      <div className="habit-intro">
        <p>Jede bewusste Entscheidung verändert deinen Kurs.</p>
        <button type="button" onClick={() => setEditingGoal(true)}>Ziel bearbeiten</button>
      </div>

      <div className="habit-list">
        {dueHabits.map((habit) => {
          const selected = statuses[habit.id]
          return (
            <article className="habit-row" key={habit.id} data-testid={`habit-${habit.id}`}>
              <button className="habit-copy" type="button" onClick={() => setEditingHabit(habit)}>
                <span className="habit-icon">{habit.icon}</span>
                <span>
                  <strong>{habit.name}</strong>
                  <small>{habit.cue}</small>
                </span>
              </button>
              <div className="habit-controls">
                <button className="habit-focus-button" type="button" onClick={() => onStartTask(habit)} disabled={Boolean(completedRecord)} aria-label={`${habit.name}: Fokusflug für ${habit.durationMinutes ?? 25} Minuten starten`} title={`${habit.durationMinutes ?? 25} Min. Fokusflug`}>
                  <i>▶</i><span>{habit.durationMinutes ?? 25}</span>
                </button>
                <div className="habit-statuses" role="group" aria-label={`${habit.name} bewerten`}>
                  {STATUS_OPTIONS.map((option) => (
                    <button
                      key={option.status}
                      type="button"
                      className={selected === option.status ? `status-${option.status} active` : ''}
                      aria-label={option.label}
                      title={option.label}
                      disabled={Boolean(completedRecord)}
                      onClick={() => setDraftStatus(habit.id, option.status)}
                      data-testid={`habit-${habit.id}-${option.status}`}
                    >
                      {option.symbol}
                    </button>
                  ))}
                </div>
              </div>
            </article>
          )
        })}
      </div>

      <div className="habit-footer">
        {legacyAvailable ? (
          <button
            className="text-button"
            type="button"
            onClick={() => {
              const count = importLegacyHabits()
              if (count > 0) setLegacyAvailable(false)
            }}
          >
            Alte Habits übernehmen
          </button>
        ) : null}
        <button
          className="primary-button"
          type="button"
          disabled={!ready}
          onClick={completedRecord ? onBackToFlight : handleComplete}
          data-testid="complete-day"
        >
          {completedRecord
            ? 'Tag abgeschlossen · Zum Flug'
            : ready
              ? 'Tag abschließen'
              : `Noch ${dueHabits.length - ratedCount} bewerten`}
        </button>
        <p className="swipe-note">Nach rechts wischen für den Flug</p>
      </div>

      {editingHabit ? (
        <HabitEditor habit={editingHabit === 'new' ? undefined : editingHabit} onClose={() => setEditingHabit(null)} />
      ) : null}
      {editingGoal ? <GoalEditor onClose={() => setEditingGoal(false)} /> : null}
    </section>
  )
}

function HabitEditor({ habit, onClose }: { habit?: Habit; onClose: () => void }) {
  const addHabit = useJourneyStore((state) => state.addHabit)
  const updateHabit = useJourneyStore((state) => state.updateHabit)
  const archiveHabit = useJourneyStore((state) => state.archiveHabit)
  const [name, setName] = useState(habit?.name ?? '')
  const [icon, setIcon] = useState(habit?.icon ?? '⭐')
  const [cue, setCue] = useState(habit?.cue ?? '')
  const [durationMinutes, setDurationMinutes] = useState(habit?.durationMinutes ?? 25)
  const [impact, setImpact] = useState(habit?.impact ?? 1)
  const [days, setDays] = useState<number[]>(habit?.days ?? [0, 1, 2, 3, 4, 5, 6])

  const save = (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim() || days.length === 0) return
    const value = { name: name.trim(), icon: icon.trim() || '⭐', cue: cue.trim() || 'Heute bewusst erledigen', durationMinutes: Math.max(1, Math.min(240, Number(durationMinutes) || 25)), impact, days }
    if (habit) updateHabit(habit.id, value)
    else addHabit(value)
    onClose()
  }

  return (
    <div className="sheet-backdrop" role="presentation" onPointerDown={(event) => event.stopPropagation()}>
      <form className="editor-sheet" onSubmit={save} data-testid="habit-editor">
        <div className="sheet-handle" />
        <div className="sheet-title-row">
          <div>
            <p className="label-caps-micro">Kursfaktor</p>
            <h2>{habit ? 'Habit bearbeiten' : 'Habit hinzufügen'}</h2>
          </div>
          <button type="button" className="round-icon-button" onClick={onClose}>×</button>
        </div>
        <div className="field-grid compact-icon-field">
          <label><span>Icon</span><input value={icon} onChange={(event) => setIcon(event.target.value)} maxLength={4} /></label>
          <label><span>Name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Gym" autoFocus /></label>
        </div>
        <label className="field"><span>Konkreter Cue</span><input value={cue} onChange={(event) => setCue(event.target.value)} placeholder="45 Minuten Training" /></label>
        <label className="field"><span>Fokusflug · Minuten</span><input type="number" min="1" max="240" value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))} /></label>
        <fieldset className="day-picker">
          <legend>Fällige Tage</legend>
          {DAY_LABELS.map((label, index) => (
            <button
              key={label}
              type="button"
              className={days.includes(index) ? 'active' : ''}
              onClick={() => setDays((current) => current.includes(index) ? current.filter((day) => day !== index) : [...current, index].sort())}
            >
              {label}
            </button>
          ))}
        </fieldset>
        <label className="field"><span>Kurswirkung</span>
          <select value={impact} onChange={(event) => setImpact(Number(event.target.value))}>
            <option value={0.5}>Unterstützend · 0,5°</option>
            <option value={1}>Wichtig · 1°</option>
            <option value={1.5}>Kritisch · 1,5°</option>
          </select>
        </label>
        <button className="primary-button" type="submit">Speichern</button>
        {habit ? <button className="danger-button" type="button" onClick={() => { archiveHabit(habit.id); onClose() }}>Habit archivieren</button> : null}
      </form>
    </div>
  )
}

function GoalEditor({ onClose }: { onClose: () => void }) {
  const journey = useJourneyStore((state) => state.journey)
  const updateJourney = useJourneyStore((state) => state.updateJourney)
  const [draft, setDraft] = useState(journey)

  const save = (event: React.FormEvent) => {
    event.preventDefault()
    updateJourney({
      ...draft,
      targetValue: Math.max(1, Number(draft.targetValue)),
      totalDays: Math.max(7, Number(draft.totalDays)),
      totalDistanceKm: Math.max(100, Number(draft.totalDistanceKm)),
      destinationIata: draft.destinationIata.toUpperCase().slice(0, 3),
    })
    onClose()
  }

  return (
    <div className="sheet-backdrop" role="presentation" onPointerDown={(event) => event.stopPropagation()}>
      <form className="editor-sheet" onSubmit={save} data-testid="goal-editor">
        <div className="sheet-handle" />
        <div className="sheet-title-row"><div><p className="label-caps-micro">Destination</p><h2>Dein Ziel</h2></div><button type="button" className="round-icon-button" onClick={onClose}>×</button></div>
        <label className="field"><span>Ziel</span><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
        <div className="field-grid">
          <label><span>Zielwert</span><input type="number" value={draft.targetValue} onChange={(event) => setDraft({ ...draft, targetValue: Number(event.target.value) })} /></label>
          <label><span>Einheit</span><input value={draft.unit} onChange={(event) => setDraft({ ...draft, unit: event.target.value })} /></label>
        </div>
        <div className="field-grid">
          <label><span>Tage</span><input type="number" min="7" value={draft.totalDays} onChange={(event) => setDraft({ ...draft, totalDays: Number(event.target.value) })} /></label>
          <label><span>Distanz km</span><input type="number" min="100" value={draft.totalDistanceKm} onChange={(event) => setDraft({ ...draft, totalDistanceKm: Number(event.target.value) })} /></label>
        </div>
        <div className="field-grid compact-icon-field">
          <label><span>IATA</span><input maxLength={3} value={draft.destinationIata} onChange={(event) => setDraft({ ...draft, destinationIata: event.target.value })} /></label>
          <label><span>Zielflughafen</span><input value={draft.destinationCity} onChange={(event) => setDraft({ ...draft, destinationCity: event.target.value })} /></label>
        </div>
        <button className="primary-button" type="submit">Reise aktualisieren</button>
      </form>
    </div>
  )
}
