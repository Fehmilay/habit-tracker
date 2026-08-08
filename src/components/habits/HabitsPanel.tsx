'use client'

import { useEffect, useMemo, useState } from 'react'
import { Glyph, HABIT_GLYPHS, resolveGlyph } from '@/components/icons/Glyph'
import { useLongPress } from '@/lib/interaction/useLongPress'
import { useSheetDismiss } from '@/lib/interaction/useSheetDismiss'
import { isHabitDue, localDateKey } from '@/lib/journey/date'
import { AIRPORTS, airportByIata, distanceBetweenAirports } from '@/lib/maps/airports'
import { selectionHaptic } from '@/lib/native/ios'
import type { DailyFlightRecord, Habit, HabitStatus, RecoveryMission } from '@/lib/journey/types'
import { useStreak } from '@/store/hooks'
import { selectBackfillableDate, useJourneyStore } from '@/store/journeyStore'

/**
 * The four honest answers.
 *
 * `not_relevant` was defined in the type, honoured by the deviation maths and
 * printed in the check-in sequence, but had no button - so a sick day or a
 * cancelled plan had to be logged as a miss. That made honesty strictly worse
 * than silence for the user, which is the one thing a habit tracker cannot
 * afford.
 */
const STATUS_OPTIONS = [
  { status: 'completed' as HabitStatus, label: 'Erledigt', glyph: 'check' as const },
  { status: 'partial' as HabitStatus, label: 'Teilweise', glyph: 'half' as const },
  { status: 'missed' as HabitStatus, label: 'Nicht erledigt', glyph: 'cross' as const },
  { status: 'not_relevant' as HabitStatus, label: 'Nicht relevant', glyph: 'skip' as const },
]
const DAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const CHALLENGE_LENGTHS = [7, 21, 30, 66, 90]


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
  const setAllDrafts = useJourneyStore((state) => state.setAllDrafts)
  const completeToday = useJourneyStore((state) => state.completeToday)
  const importLegacyHabits = useJourneyStore((state) => state.importLegacyHabits)
  const allRecoveryMissions = useJourneyStore((state) => state.recoveryMissions)
  const backfillDate = useJourneyStore(selectBackfillableDate)
  const streak = useStreak()
  const [editingHabit, setEditingHabit] = useState<Habit | 'new' | null>(null)
  const [editingGoal, setEditingGoal] = useState(false)
  const [backfilling, setBackfilling] = useState(false)
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
        <button className="eyebrow-button" type="button" onClick={onBackToFlight} aria-label="Zurück zum Flug"><Glyph name="chevronLeft" size={16} /></button>
        <div><p className="label-caps-micro">Heute</p><h1 className="numeric">{ratedCount}<b>/{dueHabits.length}</b></h1></div>
        <button className="round-icon-button" type="button" onClick={() => setEditingHabit('new')} aria-label="Habit hinzufügen"><Glyph name="plus" size={18} /></button>
      </header>

      {/* The chain, at the top of the screen where the work happens. Seeing
          what a missed day would cost belongs next to the buttons that decide
          it, not two swipes away in the stats panel. */}
      <div className="chain-banner" data-state={streak.current === 0 ? 'cold' : streak.atRisk ? 'risk' : 'hot'} data-testid="chain-banner">
        <span className="chain-flame"><Glyph name="flame" size={20} /></span>
        <div>
          <strong className="numeric">{streak.current}<b>{streak.current === 1 ? ' Tag' : ' Tage'}</b></strong>
          <small>
            {completedRecord
              ? 'Heute gesichert.'
              : streak.current === 0
                ? 'Der erste bestätigte Tag startet deine Kette.'
                : `Bestätige heute, sonst reißt die Kette. Rekord ${streak.best}.`}
          </small>
        </div>
      </div>

      <div className="habit-intro"><p>Gedrückt halten zum Bearbeiten.</p><button type="button" onClick={() => setEditingGoal(true)}>Route</button></div>

      {!completedRecord && dueHabits.length > 1 ? (
        <div className="habit-quick-actions">
          <button type="button" onClick={() => { selectionHaptic(); setAllDrafts('completed') }} data-testid="mark-all-complete">
            <Glyph name="check" size={14} />Alles erledigt
          </button>
          <button type="button" onClick={() => { selectionHaptic(); setAllDrafts('missed') }}>
            <Glyph name="cross" size={14} />Alles verpasst
          </button>
        </div>
      ) : null}

      {backfillDate && !backfilling ? (
        <button className="backfill-prompt" type="button" onClick={() => setBackfilling(true)} data-testid="backfill-prompt">
          <span className="habit-icon"><Glyph name="calendar" size={17} /></span>
          <span>
            <strong>Gestern fehlt noch</strong>
            <small>Trag den Tag nach, bevor er als verpasst zählt.</small>
          </span>
          <Glyph name="chevronRight" size={14} />
        </button>
      ) : null}

      <div className="habit-list">
        {dueHabits.map((habit) => {
          const selected = statuses[habit.id]
          return (
            <HabitRow
              key={habit.id}
              habit={habit}
              selected={selected}
              locked={Boolean(completedRecord)}
              onEdit={() => setEditingHabit(habit)}
              onRate={(status) => { selectionHaptic(); setDraftStatus(habit.id, status) }}
              onStartTask={() => onStartTask(habit)}
            />
          )
        })}
        {dueHabits.length === 0 ? <div className="empty-habits"><strong>Heute ist frei.</strong></div> : null}
      </div>

      {recoveryMissions.length > 0 ? (
        <section className="recovery-deck" aria-label="Comeback-Missionen">
          <div><span className="label-caps-micro">Comeback</span><small>Holt einen Teil des Kurses zurück.</small></div>
          {recoveryMissions.slice(0, 3).map((mission) => (
            <article key={mission.id}>
              <span className="habit-icon"><Glyph name={resolveGlyph(mission.habitIcon)} size={18} /></span>
              <div><strong>{mission.habitName}</strong><em className="numeric">−{mission.recoveryDegrees}°</em></div>
              <button type="button" onClick={() => onStartRecovery(mission)} aria-label={`Comeback ${mission.durationMinutes} Minuten`}><strong className="numeric">{mission.durationMinutes}</strong><Glyph name="play" size={12} /></button>
            </article>
          ))}
        </section>
      ) : null}

      <div className="habit-footer">
        {legacyAvailable ? <button className="text-button" type="button" onClick={() => { if (importLegacyHabits() > 0) setLegacyAvailable(false) }}>Alte Habits übernehmen</button> : null}
        <button className="primary-button" type="button" disabled={!ready} onClick={() => { const record = completeToday(today); if (record) onComplete(record) }} data-testid="complete-day">
          {completedRecord ? 'Abgeschlossen' : ready ? 'Bestätigen' : `Noch ${dueHabits.length - ratedCount}`}
        </button>
      </div>

      {editingHabit ? <HabitEditor habit={editingHabit === 'new' ? undefined : editingHabit} onClose={() => setEditingHabit(null)} /> : null}
      {editingGoal ? <GoalEditor onClose={() => setEditingGoal(false)} /> : null}
      {backfilling && backfillDate ? <BackfillSheet dateKey={backfillDate} onClose={() => setBackfilling(false)} /> : null}
    </section>
  )
}

/**
 * File yesterday.
 *
 * Bounded to the single previous day, and every record it writes is flagged
 * `backfilled`. A tracker that lets you rewrite last month is a tracker whose
 * numbers mean nothing; one that refuses to let you fix the evening you fell
 * asleep before checking in is merely annoying. One day is the line.
 */
function BackfillSheet({ dateKey, onClose }: { dateKey: string; onClose: () => void }) {
  const habits = useJourneyStore((state) => state.habits)
  const backfillDay = useJourneyStore((state) => state.backfillDay)
  const [statuses, setStatuses] = useState<Record<string, HabitStatus>>({})
  const due = useMemo(() => habits.filter((habit) => isHabitDue(habit, dateKey)), [habits, dateKey])
  const ready = due.length > 0 && due.every((habit) => statuses[habit.id])
  useSheetDismiss(onClose)
  const label = new Date(`${dateKey}T12:00:00`).toLocaleDateString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })

  return (
    <div className="sheet-backdrop" role="presentation" onPointerDown={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) onClose() }}>
      <div className="editor-sheet" data-testid="backfill-sheet" role="dialog" aria-modal="true" aria-label={`${label} nachtragen`}>
        <div className="sheet-handle" />
        <div className="sheet-title-row">
          <div><p className="label-caps-micro">Nachtragen</p><h2>{label}</h2></div>
          <button type="button" className="round-icon-button" onClick={onClose} aria-label="Schließen"><Glyph name="cross" size={16} /></button>
        </div>
        <p className="editor-hint">Nur ehrliche Antworten helfen dem Kurs. Der Tag wird als nachgetragen markiert.</p>
        <div className="habit-list">
          {due.map((habit) => (
            <article className="habit-row" key={habit.id}>
              <div className="habit-copy">
                <span className="habit-icon"><Glyph name={resolveGlyph(habit.icon)} size={19} /></span>
                <span><strong>{habit.name}</strong><small>{habit.cue}</small></span>
              </div>
              <div className="habit-statuses" role="group" aria-label={`${habit.name} bewerten`}>
                {STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.status}
                    type="button"
                    className={statuses[habit.id] === option.status ? `status-${option.status} active` : ''}
                    aria-label={option.label}
                    aria-pressed={statuses[habit.id] === option.status}
                    onClick={() => setStatuses((current) => ({ ...current, [habit.id]: option.status }))}
                  >
                    <Glyph name={option.glyph} size={16} />
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
        <button
          className="primary-button"
          type="button"
          disabled={!ready}
          onClick={() => { backfillDay(dateKey, statuses); selectionHaptic(); onClose() }}
          data-testid="backfill-save"
        >
          {ready ? 'Tag nachtragen' : `Noch ${due.length - due.filter((habit) => statuses[habit.id]).length}`}
        </button>
      </div>
    </div>
  )
}

interface HabitRowProps {
  habit: Habit
  selected: HabitStatus | undefined
  locked: boolean
  onEdit: () => void
  onRate: (status: HabitStatus) => void
  onStartTask: () => void
}

/**
 * One habit row.
 *
 * The whole row is press-and-hold to edit. Previously a plain tap opened the
 * editor, which meant the most common action on this screen - rating the habit
 * - sat next to a much rarer one with the same weight, and mis-taps opened a
 * three-step form. Holding is deliberate enough that it cannot happen by
 * accident, and the fill animation shows it is happening before it fires.
 */
function HabitRow({ habit, selected, locked, onEdit, onRate, onStartTask }: HabitRowProps) {
  const { holding, handlers } = useLongPress({ onLongPress: onEdit })

  return (
    <article className="habit-row" data-testid={`habit-${habit.id}`} data-holding={holding}>
      <div
        className="habit-copy"
        role="button"
        tabIndex={0}
        aria-label={`${habit.name} bearbeiten (gedrückt halten)`}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onEdit()
          }
        }}
        {...handlers}
      >
        <span className="habit-icon"><Glyph name={resolveGlyph(habit.icon)} size={19} /></span>
        <span><strong>{habit.name}</strong><small>{habit.cue}</small></span>
        <i className="habit-hold-fill" aria-hidden="true" />
      </div>

      <div className="habit-statuses" role="group" aria-label={`${habit.name} bewerten`}>
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option.status}
            type="button"
            className={selected === option.status ? `status-${option.status} active` : ''}
            aria-label={option.label}
            aria-pressed={selected === option.status}
            disabled={locked}
            onClick={() => onRate(option.status)}
            data-testid={`habit-${habit.id}-${option.status}`}
          >
            <Glyph name={option.glyph} size={16} />
          </button>
        ))}
      </div>

      <button
        className="habit-focus-button"
        type="button"
        onClick={onStartTask}
        disabled={locked}
        aria-label={`Fokusflug ${habit.durationMinutes ?? 25} Minuten`}
      >
        <strong className="numeric">{habit.durationMinutes ?? 25}</strong>
        <Glyph name="play" size={12} />
      </button>
    </article>
  )
}

function HabitEditor({ habit, onClose }: { habit?: Habit; onClose: () => void }) {
  const addHabit = useJourneyStore((state) => state.addHabit)
  const updateHabit = useJourneyStore((state) => state.updateHabit)
  const archiveHabit = useJourneyStore((state) => state.archiveHabit)
  const [step, setStep] = useState(0)
  const [name, setName] = useState(habit?.name ?? '')
  const [icon, setIcon] = useState(habit?.icon ?? 'spark')
  const [cue, setCue] = useState(habit?.cue ?? '')
  const [durationMinutes, setDurationMinutes] = useState(habit?.durationMinutes ?? 25)
  // Defaulting this to 30 for an existing habit was a data-loss bug: all the
  // seeded habits carry no `challengeDays` and a `createdAt` months in the
  // past, so merely renaming one and saving turned it into a challenge that
  // had already expired - and `isHabitDue` then hid it forever, with no
  // archive view to get it back.
  const [challengeDays, setChallengeDays] = useState<number | undefined>(habit?.challengeDays)
  const [impact, setImpact] = useState(habit?.impact ?? 1)
  const [days, setDays] = useState<number[]>(habit?.days ?? [0, 1, 2, 3, 4, 5, 6])
  useSheetDismiss(onClose)

  const save = () => {
    if (!name.trim() || days.length === 0) return
    const value = {
      name: name.trim(),
      icon,
      cue: cue.trim() || 'Heute bewusst erledigen',
      durationMinutes: Math.max(1, Math.min(240, durationMinutes || 25)),
      challengeDays,
      // The window runs from the day it was set, not from the day the habit was
      // created - otherwise adding a 30-day challenge to an old habit starts it
      // already finished.
      challengeStartedAt:
        challengeDays === undefined
          ? undefined
          : habit?.challengeDays === challengeDays
            ? habit?.challengeStartedAt ?? localDateKey()
            : localDateKey(),
      impact,
      days,
    }
    if (habit) updateHabit(habit.id, value)
    else addHabit(value)
    selectionHaptic()
    onClose()
  }

  const canContinue = step > 0 || Boolean(name.trim())
  return (
    <div className="sheet-backdrop" role="presentation" onPointerDown={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) onClose() }}>
      <div className="editor-sheet habit-editor-sheet" data-testid="habit-editor" role="dialog" aria-modal="true" aria-label={habit ? `${habit.name} bearbeiten` : 'Neuer Habit'}>
        <div className="sheet-handle" />
        <div className="sheet-title-row"><div><p className="label-caps-micro">Schritt {step + 1} von 3</p><h2>{['Dein Habit', 'Dein Rhythmus', 'Dein Fokusflug'][step]}</h2></div><button type="button" className="round-icon-button" onClick={onClose} aria-label="Schließen"><Glyph name="cross" size={16} /></button></div>
        <div className="editor-progress">{[0, 1, 2].map((index) => <i key={index} className={index <= step ? 'active' : ''} />)}</div>

        {step === 0 ? <div className="editor-step">
          <div className="icon-picker">{HABIT_GLYPHS.map((value) => <button key={value} type="button" className={resolveGlyph(icon) === value ? 'active' : ''} onClick={() => setIcon(value)} aria-label={value}><Glyph name={value} size={20} /></button>)}</div>
          <label className="field"><span>Name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="z. B. Gym" autoFocus /></label>
          <label className="field"><span>Handlung</span><input value={cue} onChange={(event) => setCue(event.target.value)} placeholder="45 Minuten trainieren" /></label>
        </div> : null}

        {step === 1 ? <div className="editor-step">
          <fieldset className="day-picker"><legend>Flugtage</legend>{DAY_LABELS.map((label, index) => <button key={label} type="button" className={days.includes(index) ? 'active' : ''} onClick={() => setDays((current) => current.includes(index) ? current.filter((day) => day !== index) : [...current, index].sort())}>{label}</button>)}</fieldset>
          <div className="choice-group"><span>Zeitraum</span><div>{CHALLENGE_LENGTHS.map((length) => <button key={length} type="button" className={challengeDays === length ? 'active' : ''} onClick={() => setChallengeDays(length)}>{length} Tage</button>)}<button type="button" className={!challengeDays ? 'active' : ''} onClick={() => setChallengeDays(undefined)}>Unbegrenzt</button></div></div>

        </div> : null}

        {step === 2 ? <div className="editor-step">
          <label className="field"><span>Fokusflug</span><div className="duration-control"><input type="range" min="5" max="120" step="5" value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))} /><strong className="numeric">{durationMinutes} MIN</strong></div></label>
          <div className="choice-group"><span>Einfluss</span><div>{[{ value: .5, label: 'Leicht' }, { value: 1, label: 'Wichtig' }, { value: 1.5, label: 'Kritisch' }].map((option) => <button key={option.value} type="button" className={impact === option.value ? 'active' : ''} onClick={() => setImpact(option.value)}>{option.label}</button>)}</div></div>
          <div className="habit-preview"><span className="habit-icon"><Glyph name={resolveGlyph(icon)} size={20} /></span><div><strong>{name || 'Dein Habit'}</strong><small>{challengeDays ? `${challengeDays} Tage · ` : ''}{durationMinutes} Min Fokus</small></div></div>
        </div> : null}

        <div className="editor-actions">{step > 0 ? <button type="button" className="secondary-button" onClick={() => setStep((current) => Math.max(0, current - 1))}>Zurück</button> : null}<button type="button" className="primary-button" disabled={!canContinue || days.length === 0} onClick={() => { if (step < 2) setStep((current) => Math.min(2, current + 1)); else save() }}>{step < 2 ? 'Weiter' : 'Sichern'}</button></div>
        {habit ? <button className="danger-button" type="button" onClick={() => { archiveHabit(habit.id); onClose() }}>Archivieren</button> : null}
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
  useSheetDismiss(onClose)

  const save = () => {
    updateJourney({ title: title.trim() || 'Mein Ziel', targetValue: Math.max(1, targetValue), unit: unit.trim() || 'Erfolge', totalDays: Math.max(7, totalDays), originIata: origin.iata, originCity: origin.city, destinationIata: destination.iata, destinationCity: destination.city, totalDistanceKm: Math.max(100, distanceBetweenAirports(origin, destination)) })
    onClose()
  }

  return (
    <div className="sheet-backdrop" role="presentation" onPointerDown={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) onClose() }}>
      <div className="editor-sheet" data-testid="goal-editor" role="dialog" aria-modal="true" aria-label="Ziel und Route">
        <div className="sheet-handle" /><div className="sheet-title-row"><div><p className="label-caps-micro">Weltflug</p><h2>Ziel & Route</h2></div><button type="button" className="round-icon-button" onClick={onClose} aria-label="Schließen"><Glyph name="cross" size={16} /></button></div>
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
