'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { AircraftGlyph } from '@/components/icons/AircraftGlyph'
import { Glyph, resolveGlyph } from '@/components/icons/Glyph'
import { GOAL_PRESETS, HABIT_PRESETS, type HabitPreset } from '@/lib/journey/defaults'
import { AIRPORTS, airportByIata, distanceBetweenAirports } from '@/lib/maps/airports'
import { selectionHaptic } from '@/lib/native/ios'
import { requestNotificationPermission } from '@/lib/notifications/reminders'
import { useJourneyStore } from '@/store/journeyStore'

/**
 * First run.
 *
 * The app used to open on somebody else's gym schedule and a flight to New
 * York nobody chose, which made the very first screen - the one that decides
 * whether an app is kept - about a stranger's goals. This asks four questions
 * instead, in the order they actually depend on each other: what you want, how
 * long you are giving it, which habits carry it, and when to be reminded.
 *
 * Every step is answerable in one or two taps and none of them can be answered
 * wrongly enough to break the app, so the flow never validates and never nags.
 */

const DURATIONS = [30, 60, 90, 180]

interface DraftHabit extends HabitPreset {
  selected: boolean
}

export function OnboardingFlow() {
  const completeOnboarding = useJourneyStore((state) => state.completeOnboarding)
  const [step, setStep] = useState(0)
  const [title, setTitle] = useState('')
  const [unit, setUnit] = useState('saubere Tage')
  const [targetValue, setTargetValue] = useState(60)
  const [totalDays, setTotalDays] = useState(90)
  const [originIata, setOriginIata] = useState('DUS')
  const [destinationIata, setDestinationIata] = useState('JFK')
  const [reminderEnabled, setReminderEnabled] = useState(true)
  const [reminderHour, setReminderHour] = useState(20)
  const [habits, setHabits] = useState<DraftHabit[]>(() =>
    HABIT_PRESETS.map((preset, index) => ({ ...preset, selected: index < 3 })),
  )

  const origin = airportByIata(originIata, AIRPORTS[0])
  const destination = airportByIata(destinationIata, AIRPORTS[5])
  const distance = useMemo(
    () => Math.max(100, distanceBetweenAirports(origin, destination)),
    [origin, destination],
  )
  const chosen = habits.filter((habit) => habit.selected)
  const canContinue = step === 0 ? title.trim().length > 0 : step === 2 ? chosen.length > 0 : true

  const finish = async () => {
    if (reminderEnabled) await requestNotificationPermission()
    completeOnboarding({
      journey: {
        title: title.trim() || 'Mein Ziel',
        unit: unit.trim() || 'saubere Tage',
        targetValue: Math.max(1, targetValue),
        totalDays,
        originIata: origin.iata,
        originCity: origin.city,
        destinationIata: destination.iata,
        destinationCity: destination.city,
        totalDistanceKm: distance,
      },
      habits: chosen.map((habit) => ({
        name: habit.name,
        icon: habit.icon,
        cue: habit.cue,
        durationMinutes: habit.durationMinutes,
        days: habit.days,
        impact: habit.impact,
        challengeDays: undefined,
      })),
      settings: { reminderEnabled, reminderHour },
    })
    selectionHaptic()
  }

  return (
    <section className="onboarding-layer" data-testid="onboarding">
      <div className="onboarding-sheet">
        <header className="onboarding-header">
          <span className="onboarding-mark" aria-hidden="true">
            <AircraftGlyph size={26} color="#c4e8ff" rotationDegrees={-42} />
          </span>
          <div className="editor-progress">
            {[0, 1, 2, 3].map((index) => (
              <i key={index} className={index <= step ? 'active' : ''} />
            ))}
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            className="onboarding-step"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.28 }}
          >
            {step === 0 ? (
              <>
                <p className="label-caps-micro">Schritt 1 von 4</p>
                <h1>Wohin willst du wirklich?</h1>
                <p className="onboarding-lead">
                  Dein Ziel ist das Reiseziel. Alles andere in dieser App misst nur, ob du
                  darauf zufliegst.
                </p>
                <label className="field">
                  <span>Dein Ziel</span>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="z. B. Fitter werden"
                    autoFocus
                    data-testid="onboarding-goal"
                  />
                </label>
                <div className="choice-group">
                  <span>Vorlagen</span>
                  <div>
                    {GOAL_PRESETS.map((preset) => (
                      <button
                        key={preset.title}
                        type="button"
                        className={title === preset.title ? 'active' : ''}
                        onClick={() => {
                          setTitle(preset.title)
                          setUnit(preset.unit)
                          setTargetValue(preset.targetValue)
                          setTotalDays(preset.totalDays)
                          setDestinationIata(preset.destinationIata)
                        }}
                      >
                        {preset.title}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : null}

            {step === 1 ? (
              <>
                <p className="label-caps-micro">Schritt 2 von 4</p>
                <h1>Deine Route</h1>
                <p className="onboarding-lead">
                  Die Strecke macht aus abstrakten Tagen eine Distanz. Ein Grad Abweichung
                  kostet auf dieser Route rund {Math.round(distance * Math.sin(Math.PI / 180))} km.
                </p>
                <div className="field-grid">
                  <label>
                    <span>Start</span>
                    <select value={originIata} onChange={(event) => setOriginIata(event.target.value)}>
                      {AIRPORTS.map((airport) => (
                        <option key={airport.iata} value={airport.iata} disabled={airport.iata === destinationIata}>
                          {airport.iata} · {airport.city}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Ziel</span>
                    <select value={destinationIata} onChange={(event) => setDestinationIata(event.target.value)}>
                      {AIRPORTS.map((airport) => (
                        <option key={airport.iata} value={airport.iata} disabled={airport.iata === originIata}>
                          {airport.iata} · {airport.city}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="route-preview">
                  <strong>{origin.iata}</strong>
                  <i />
                  <strong>{destination.iata}</strong>
                  <small>{distance.toLocaleString('de-DE')} km</small>
                </div>
                <div className="choice-group">
                  <span>Flugdauer</span>
                  <div>
                    {DURATIONS.map((days) => (
                      <button
                        key={days}
                        type="button"
                        className={totalDays === days ? 'active' : ''}
                        onClick={() => setTotalDays(days)}
                      >
                        {days} Tage
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <p className="label-caps-micro">Schritt 3 von 4</p>
                <h1>Was bringt dich hin?</h1>
                <p className="onboarding-lead">
                  Zwei bis vier Habits reichen. Mehr davon macht den Tag nicht besser,
                  sondern nur schwerer zu bestätigen.
                </p>
                <div className="onboarding-habits">
                  {habits.map((habit, index) => (
                    <button
                      key={habit.name}
                      type="button"
                      className={habit.selected ? 'active' : ''}
                      onClick={() => {
                        selectionHaptic()
                        setHabits((current) =>
                          current.map((entry, entryIndex) =>
                            entryIndex === index ? { ...entry, selected: !entry.selected } : entry,
                          ),
                        )
                      }}
                      aria-pressed={habit.selected}
                    >
                      <span className="habit-icon">
                        <Glyph name={resolveGlyph(habit.icon)} size={18} />
                      </span>
                      <span>
                        <strong>{habit.name}</strong>
                        <small>{habit.cue}</small>
                      </span>
                      <i aria-hidden="true">
                        <Glyph name={habit.selected ? 'check' : 'plus'} size={14} />
                      </i>
                    </button>
                  ))}
                </div>
                <p className="onboarding-note">
                  {chosen.length === 0
                    ? 'Wähle mindestens einen Habit.'
                    : `${chosen.length} ausgewählt · später jederzeit änderbar`}
                </p>
              </>
            ) : null}

            {step === 3 ? (
              <>
                <p className="label-caps-micro">Schritt 4 von 4</p>
                <h1>Wann erinnern wir dich?</h1>
                <p className="onboarding-lead">
                  Einmal am Abend, wenn der Tag zu Ende ist. Nur dann lässt er sich
                  ehrlich bewerten.
                </p>
                <button
                  type="button"
                  className={reminderEnabled ? 'toggle-row active' : 'toggle-row'}
                  onClick={() => setReminderEnabled((current) => !current)}
                  aria-pressed={reminderEnabled}
                >
                  <span className="habit-icon">
                    <Glyph name="bell" size={18} />
                  </span>
                  <span>
                    <strong>Tägliche Erinnerung</strong>
                    <small>{reminderEnabled ? 'An' : 'Aus'}</small>
                  </span>
                  <i aria-hidden="true" />
                </button>
                {reminderEnabled ? (
                  <div className="choice-group">
                    <span>Uhrzeit</span>
                    <div>
                      {[18, 19, 20, 21, 22].map((hour) => (
                        <button
                          key={hour}
                          type="button"
                          className={reminderHour === hour ? 'active' : ''}
                          onClick={() => setReminderHour(hour)}
                        >
                          {String(hour).padStart(2, '0')}:00
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="onboarding-summary">
                  <p className="label-caps-micro">Dein Flug</p>
                  <strong>{title.trim() || 'Mein Ziel'}</strong>
                  <small>
                    {origin.iata} → {destination.iata} · {totalDays} Tage · {chosen.length}{' '}
                    {chosen.length === 1 ? 'Habit' : 'Habits'}
                  </small>
                </div>
              </>
            ) : null}
          </motion.div>
        </AnimatePresence>

        <div className="editor-actions onboarding-actions">
          {step > 0 ? (
            <button type="button" className="secondary-button" onClick={() => setStep((current) => Math.max(0, current - 1))}>
              Zurück
            </button>
          ) : null}
          <button
            type="button"
            className="primary-button"
            disabled={!canContinue}
            data-testid="onboarding-next"
            // Functional update: two quick taps both read the same `step` from
            // the render closure and collapse into a single advance, so a fast
            // tapper silently gets stuck a step behind.
            onClick={() => {
              if (step < 3) setStep((current) => Math.min(3, current + 1))
              else void finish()
            }}
          >
            {step < 3 ? 'Weiter' : 'Abheben'}
          </button>
        </div>
      </div>
    </section>
  )
}
