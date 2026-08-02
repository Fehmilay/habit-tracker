'use client'

import { useEffect, useMemo, useState } from 'react'
import { isHabitDue, localDateKey } from '@/lib/journey/date'
import { AIRPORTS, airportByIata, distanceBetweenAirports } from '@/lib/maps/airports'
import { selectionHaptic } from '@/lib/native/ios'
import type { DailyFlightRecord, Habit, HabitStatus, RecoveryMission } from '@/lib/journey/types'
import { useJourneyStore } from '@/store/journeyStore'

const STATUS_OPTIONS: Array<{ status: HabitStatus; label: string; symbol: string }> = [
  { status: 'completed', label: 'Erledigt', symbol: '✓' },
  { status: 'partial', label: 'Teilweise', symbol: '½' },
  { status: 'missed', label: 'Nicht erledigt', symbol: '×' },
]
const DAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const CHALLENGE_LENGTHS = [7, 21, 30, 66, 90]
const ICONS = ['✦', '🏋️', '📚', '🧘', '💧', '🚶', '🥗', '💼']

interface HabitsPanelProps {
  onBackToFlight: () => void
  onComplete: (record: DailyFlightRecord) => void
  onStartTask: (habit: Habit) => void
  onStartRecovery: (mission: RecoveryMission) => void
}

export function HabitsPanel({ onBackToFlight, onComplete, onStartTask, onStartRecovery }: HabitsPanelProps) {
  const habits = useJourneyStore((state) => state.habits)
  const drafts = useJourneyStore((state) => state.drafts)
  const records = useJourneyStore((state) => state.records)
  const setDraftStatus = useJourneyStore((state) => state.setDraftStatus)
  const completeToday = useJourneyStore((state) => state.completeToday)
  const importLegacyHabits = useJourneyStore((state) => state.importLegacyHabits)
  const allRecoveryMissions = useJourneyStore((state) => state.recoveryMissions)
  const [editingHabit, setEditingHabit] = useState<Habit | 'new' | null>(null)
  const [editingGoal, setEditingGoal] = useState(false)
  const [legacyAvailable, setLegacyAvailable] = useState(false)
  const recoveryMissions = useMemo(
    () => allRecoveryMissions.filter((mission) => mission.status === 'available'),
    [allRecoveryMissions],
  )
  const today = localDateKey()
  const dueHabits = useMemo(() => habits.filter((habit) => isHabitDue(habit, today)), [habits, today])
  const completedRecord = records.find((record) => record.date === today)
  const statuses = completedRecord?.statuses ?? drafts
  const ratedCount = dueHabits.filter((habit) => statuses[habit.id]).length
  const ready = dueHabits.length > 0 && ratedCount === dueHabits.length && !completedRecord

  useEffect(() => {
    const timer = window.setTimeout(() => setLegacyAvailable(Boolean(window.localStorage.getItem('ht_habits'))), 0)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <section className="side-page habits-page" data-testid="habits-page">
      <header className="side-header">
        <button className="eyebrow-button" type="button" onClick={onBackToFlight}>← Flug</button>
        <div><p className="label-caps-micro">Heute</p><h1>{ratedCount}/{dueHabits.length}</h1></div>
        <button className="round-icon-button" type="button" onClick={() => setEditingHabit('new')} aria-label="Habit hinzufügen">+</button>
      </header>

      <div className="habit-intro"><p>Bewerte kurz. Dein Kurs zeigt die Wirkung.</p><button type="button" onClick={() => setEditingGoal(true)}>Route ändern</button></div>

      <div className="habit-list">
        {dueHabits.map((habit) => {
          const selected = statuses[habit.id]
          return (
            <article className="habit-row" key={habit.id} data-testid={`habit-${habit.id}`}>
              <button className="habit-copy" type="button" onClick={() => setEditingHabit(habit)}>
                <span className="habit-icon">{habit.icon}</span>
                <span><strong>{habit.name}</strong><small>{habit.challengeDays ? `${habit.cue} · ${habit.challengeDays} Tage` : habit.cue}</small></span>
              </button>
              <div className="habit-statuses" role="group" aria-label={`${habit.name} bewerten`}>
                {STATUS_OPTIONS.map((option) => (
                  <button key={option.status} type="button" className={selected === option.status ? `status-${option.status} active` : ''} aria-label={option.label} aria-pressed={selected === option.status} disabled={Boolean(completedRecord)} onClick={() => { selectionHaptic(); setDraftStatus(habit.id, option.status) }} data-testid={`habit-${habit.id}-${option.status}`}>{option.symbol}</button>
                ))}
              </div>
              <button className="habit-focus-button" type="button" onClick={() => onStartTask(habit)} disabled={Boolean(completedRecord)} aria-label={`${habit.name}: Fokusflug für ${habit.durationMinutes ?? 25} Minuten starten`}>
                <span><small>Fokusflug</small><strong>{habit.durationMinutes ?? 25} MIN</strong></span><i>▶</i>
              </button>
            </article>
          )
        })}
        {dueHabits.length === 0 ? <div className="empty-habits"><strong>Heute ist frei.</strong><span>Oder starte mit + einen neuen Habit-Flug.</span></div> : null}
      </div>

      {recoveryMissions.length > 0 ? (
        <section className="recovery-deck" aria-label="Comeback-Missionen">
          <div><span className="label-caps-micro">ECHTE KURSKORREKTUR</span><strong>Comeback-Missionen</strong><small>Der alte Fehlschlag bleibt bestehen. Eine kurze reale Handlung holt einen Teil des Kurses zurück.</small></div>
          {recoveryMissions.slice(0, 3).map((mission) => (
            <article key={mission.id}>
              <span>{mission.habitIcon}</span>
              <div><strong>{mission.habitName}</strong><small>{mission.actionLabel}</small><em>−{mission.recoveryDegrees}° · +8 Treibstoff</em></div>
              <button type="button" onClick={() => onStartRecovery(mission)}><small>COMEBACK</small><strong>{mission.durationMinutes} MIN</strong></button>
            </article>
          ))}
        </section>
      ) : null}

      <div className="habit-footer">
        {legacyAvailable ? <button className="text-button" type="button" onClick={() => { if (importLegacyHabits() > 0) setLegacyAvailable(false) }}>Alte Habits übernehmen</button> : null}
        <button className="primary-button" type="button" disabled={!ready} onClick={() => { const record = completeToday(today); if (record) onComplete(record) }} data-testid="complete-day">
          {completedRecord ? 'Tag abgeschlossen' : ready ? 'Bewertung bestätigen' : `Noch ${dueHabits.length - ratedCount} offen`}
        </button>
      </div>

      {editingHabit ? <HabitEditor habit={editingHabit === 'new' ? undefined : editingHabit} onClose={() => setEditingHabit(null)} /> : null}
      {editingGoal ? <GoalEditor onClose={() => setEditingGoal(false)} /> : null}
    </section>
  )
}

function HabitEditor({ habit, onClose }: { habit?: Habit; onClose: () => void }) {
  const addHabit = useJourneyStore((state) => state.addHabit)
  const updateHabit = useJourneyStore((state) => state.updateHabit)
  const archiveHabit = useJourneyStore((state) => state.archiveHabit)
  const [step, setStep] = useState(0)
  const [name, setName] = useState(habit?.name ?? '')
  const [icon, setIcon] = useState(habit?.icon ?? '✦')
  const [cue, setCue] = useState(habit?.cue ?? '')
  const [durationMinutes, setDurationMinutes] = useState(habit?.durationMinutes ?? 25)
  const [challengeDays, setChallengeDays] = useState<number | undefined>(habit?.challengeDays ?? 30)
  const [impact, setImpact] = useState(habit?.impact ?? 1)
  const [days, setDays] = useState<number[]>(habit?.days ?? [0, 1, 2, 3, 4, 5, 6])

  const save = () => {
    if (!name.trim() || days.length === 0) return
    const value = { name: name.trim(), icon, cue: cue.trim() || 'Heute bewusst erledigen', durationMinutes: Math.max(1, Math.min(240, durationMinutes || 25)), challengeDays, impact, days }
    if (habit) updateHabit(habit.id, value)
    else addHabit(value)
    selectionHaptic()
    onClose()
  }

  const canContinue = step > 0 || Boolean(name.trim())
  return (
    <div className="sheet-backdrop" role="presentation" onPointerDown={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) onClose() }}>
      <div className="editor-sheet habit-editor-sheet" data-testid="habit-editor">
        <div className="sheet-handle" />
        <div className="sheet-title-row"><div><p className="label-caps-micro">Schritt {step + 1} von 3</p><h2>{['Dein Habit', 'Dein Rhythmus', 'Dein Fokusflug'][step]}</h2></div><button type="button" className="round-icon-button" onClick={onClose}>×</button></div>
        <div className="editor-progress">{[0, 1, 2].map((index) => <i key={index} className={index <= step ? 'active' : ''} />)}</div>

        {step === 0 ? <div className="editor-step">
          <div className="icon-picker">{ICONS.map((value) => <button key={value} type="button" className={icon === value ? 'active' : ''} onClick={() => setIcon(value)}>{value}</button>)}</div>
          <label className="field"><span>Name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="z. B. Gym" autoFocus /></label>
          <label className="field"><span>Klare Handlung</span><input value={cue} onChange={(event) => setCue(event.target.value)} placeholder="45 Minuten trainieren" /></label>
        </div> : null}

        {step === 1 ? <div className="editor-step">
          <fieldset className="day-picker"><legend>Flugtage</legend>{DAY_LABELS.map((label, index) => <button key={label} type="button" className={days.includes(index) ? 'active' : ''} onClick={() => setDays((current) => current.includes(index) ? current.filter((day) => day !== index) : [...current, index].sort())}>{label}</button>)}</fieldset>
          <div className="choice-group"><span>Wie lange läuft dieser Habit-Flug?</span><div>{CHALLENGE_LENGTHS.map((length) => <button key={length} type="button" className={challengeDays === length ? 'active' : ''} onClick={() => setChallengeDays(length)}>{length} Tage</button>)}<button type="button" className={!challengeDays ? 'active' : ''} onClick={() => setChallengeDays(undefined)}>Unbegrenzt</button></div></div>
          <p className="editor-hint">Der Habit erscheint automatisch an deinen Flugtagen und endet nach dem gewählten Zeitraum.</p>
        </div> : null}

        {step === 2 ? <div className="editor-step">
          <label className="field"><span>Fokusflug pro Task</span><div className="duration-control"><input type="range" min="5" max="120" step="5" value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))} /><strong className="numeric">{durationMinutes} MIN</strong></div></label>
          <div className="choice-group"><span>Einfluss auf deinen Kurs</span><div>{[{ value: .5, label: 'Leicht' }, { value: 1, label: 'Wichtig' }, { value: 1.5, label: 'Kritisch' }].map((option) => <button key={option.value} type="button" className={impact === option.value ? 'active' : ''} onClick={() => setImpact(option.value)}>{option.label}</button>)}</div></div>
          <div className="habit-preview"><span>{icon}</span><div><strong>{name || 'Dein Habit'}</strong><small>{challengeDays ? `${challengeDays} Tage · ` : ''}{durationMinutes} Min Fokus</small></div></div>
        </div> : null}

        <div className="editor-actions">{step > 0 ? <button type="button" className="secondary-button" onClick={() => setStep(step - 1)}>Zurück</button> : null}<button type="button" className="primary-button" disabled={!canContinue || days.length === 0} onClick={() => step < 2 ? setStep(step + 1) : save()}>{step < 2 ? 'Weiter' : habit ? 'Änderungen sichern' : 'Habit starten'}</button></div>
        {habit ? <button className="danger-button" type="button" onClick={() => { archiveHabit(habit.id); onClose() }}>Habit archivieren</button> : null}
      </div>
    </div>
  )
}

function GoalEditor({ onClose }: { onClose: () => void }) {
  const journey = useJourneyStore((state) => state.journey)
  const updateJourney = useJourneyStore((state) => state.updateJourney)
  const [title, setTitle] = useState(journey.title)
  const [targetValue, setTargetValue] = useState(journey.targetValue)
  const [unit, setUnit] = useState(journey.unit)
  const [totalDays, setTotalDays] = useState(journey.totalDays)
  const [originIata, setOriginIata] = useState(journey.originIata)
  const [destinationIata, setDestinationIata] = useState(journey.destinationIata)
  const origin = airportByIata(originIata, AIRPORTS[0])
  const destination = airportByIata(destinationIata, AIRPORTS[5])

  const save = () => {
    updateJourney({ title: title.trim() || 'Mein Ziel', targetValue: Math.max(1, targetValue), unit: unit.trim() || 'Erfolge', totalDays: Math.max(7, totalDays), originIata: origin.iata, originCity: origin.city, destinationIata: destination.iata, destinationCity: destination.city, totalDistanceKm: Math.max(100, distanceBetweenAirports(origin, destination)) })
    onClose()
  }

  return (
    <div className="sheet-backdrop" role="presentation" onPointerDown={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) onClose() }}>
      <div className="editor-sheet" data-testid="goal-editor">
        <div className="sheet-handle" /><div className="sheet-title-row"><div><p className="label-caps-micro">Weltflug</p><h2>Ziel & Route</h2></div><button type="button" className="round-icon-button" onClick={onClose}>×</button></div>
        <label className="field"><span>Ziel</span><input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <div className="field-grid"><label><span>Start</span><select value={originIata} onChange={(event) => setOriginIata(event.target.value)}>{AIRPORTS.map((airport) => <option key={airport.iata} value={airport.iata} disabled={airport.iata === destinationIata}>{airport.iata} · {airport.city}</option>)}</select></label><label><span>Zielort</span><select value={destinationIata} onChange={(event) => setDestinationIata(event.target.value)}>{AIRPORTS.map((airport) => <option key={airport.iata} value={airport.iata} disabled={airport.iata === originIata}>{airport.iata} · {airport.city}</option>)}</select></label></div>
        <div className="route-preview"><strong>{origin.iata}</strong><i /><strong>{destination.iata}</strong><small>{distanceBetweenAirports(origin, destination).toLocaleString('de-DE')} km</small></div>
        <div className="field-grid"><label><span>Flugdauer · Tage</span><input type="number" min="7" max="730" value={totalDays} onChange={(event) => setTotalDays(Number(event.target.value))} /></label><label><span>Zielwert</span><input type="number" min="1" value={targetValue} onChange={(event) => setTargetValue(Number(event.target.value))} /></label></div>
        <label className="field"><span>Einheit</span><input value={unit} onChange={(event) => setUnit(event.target.value)} /></label>
        <button className="primary-button" type="button" onClick={save}>Route speichern</button>
      </div>
    </div>
  )
}
