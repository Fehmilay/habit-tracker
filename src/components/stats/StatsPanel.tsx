'use client'

import { useMemo } from 'react'
import { AircraftGlyph } from '@/components/icons/AircraftGlyph'
import { Glyph, resolveGlyph } from '@/components/icons/Glyph'
import { AIRCRAFT_SKINS, levelProgress } from '@/lib/game/progression'
import { daysBetween, isHabitDue, localDateKey } from '@/lib/journey/date'
import { averageCompletion, crossTrackDistanceKm, projectedGoalValue, recoveryDaysRequired, repeatedPatternDeviation } from '@/lib/journey/projection'
import type { HabitStatus } from '@/lib/journey/types'
import { useJourneyStore } from '@/store/journeyStore'

const statusScore: Record<HabitStatus, number | null> = { completed: 1, partial: 0.5, missed: 0, not_relevant: null }

export function StatsPanel({ onBackToFlight }: { onBackToFlight: () => void }) {
  const journey = useJourneyStore((state) => state.journey)
  const habits = useJourneyStore((state) => state.habits)
  const records = useJourneyStore((state) => state.records)
  const deviation = useJourneyStore((state) => state.currentDeviationDegrees)
  const selectedAircraft = useJourneyStore((state) => state.selectedAircraft)
  const selectAircraft = useJourneyStore((state) => state.selectAircraft)
  const flightMinutes = useJourneyStore((state) => state.flightMinutes)
  const progress = useJourneyStore((state) => state.progress)
  const lastLanding = useJourneyStore((state) => state.lastLanding)
  const dayIndex = Math.min(journey.totalDays, daysBetween(journey.startDate) + 1)
  const remainingDays = Math.max(0, journey.totalDays - dayIndex)
  const remainingDistance = Math.round(journey.totalDistanceKm * (remainingDays / journey.totalDays))
  const missDistance = crossTrackDistanceKm(remainingDistance || journey.totalDistanceKm, deviation)
  const due = habits.filter((habit) => isHabitDue(habit, localDateKey()))
  const recoveryDays = recoveryDaysRequired(deviation, due)
  const projectionValue = projectedGoalValue(journey.targetValue, records)
  const projectionPercent = Math.round(averageCompletion(records.slice(-30)) * 100)
  const repeatedDeviation = repeatedPatternDeviation(deviation, records)
  const repeatedMissKm = crossTrackDistanceKm(remainingDistance || journey.totalDistanceKm, repeatedDeviation)
  const level = levelProgress(progress.experience)
  const unlockedCount = AIRCRAFT_SKINS.filter((skin) => level.level >= skin.requiredLevel).length

  const habitRates = useMemo(() => habits.filter((habit) => !habit.archived).map((habit) => {
    const values = records.map((record) => record.statuses[habit.id]).filter(Boolean).map((status) => statusScore[status]).filter((score): score is number => score !== null)
    return { habit, rate: values.length === 0 ? 1 : values.reduce((sum, value) => sum + value, 0) / values.length }
  }).sort((a, b) => a.rate - b.rate), [habits, records])

  return (
    <section className="side-page stats-page" data-testid="stats-page">
      <header className="side-header stats-header"><button className="eyebrow-button" type="button" onClick={onBackToFlight} aria-label="Zurück zum Flug"><Glyph name="chevronRight" size={16} /></button><div><p className="label-caps-micro">Zukunftskurs</p><h1>Insights</h1></div><span className="flight-hours numeric">{Math.floor(flightMinutes / 60)}:{String(flightMinutes % 60).padStart(2, '0')}</span></header>
      <div className="impact-hero"><p className="label-caps">Wenn du diesen Kurs hältst</p><strong className="numeric">{missDistance} KM</strong><span>neben {journey.destinationIata}</span><div className="route-comparison"><i /><i style={{ transform: `rotate(${Math.min(12, deviation)}deg)` }} /></div></div>
      <div className="stats-grid">
        <article><span>Zielprognose</span><strong className="numeric">{projectionPercent}%</strong><small>{projectionValue} von {journey.targetValue} {journey.unit}</small></article>
        <article><span>Zurück auf Kurs</span><strong className="numeric">{Number.isFinite(recoveryDays) ? recoveryDays : '—'}</strong><small>{recoveryDays === 1 ? 'sauberer Tag' : 'saubere Tage'}</small></article>
        <article><span>Zeit als Werkzeug</span><strong className="numeric">{remainingDays}</strong><small>Tage verbleiben</small></article>
        <article><span>Wenn 7 Tage so bleiben</span><strong className="numeric">{repeatedMissKm} km</strong><small>projizierter Versatz</small></article>
      </div>
      <section className="stats-section"><div className="section-heading"><div><p className="label-caps-micro">Einfluss</p><h2>Deine Habits</h2></div><span>30 Tage</span></div><div className="habit-rate-list">{habitRates.map(({ habit, rate }) => <div key={habit.id} className="habit-rate-row"><span><i className="habit-icon"><Glyph name={resolveGlyph(habit.icon)} size={15} /></i>{habit.name}</span><div><i style={{ width: `${Math.round(rate * 100)}%` }} /></div><strong className="numeric">{Math.round(rate * 100)}%</strong></div>)}</div></section>
      <section className="stats-section pilot-progress-section"><div className="section-heading"><div><p className="label-caps-micro">Pilot</p><h2>Level {level.level}</h2></div><span className="numeric">{progress.ringsFlown} Ringe</span></div><div className="pilot-progress-card"><div className="pilot-progress-figures"><strong className="numeric">{level.into}<b>/{level.span}</b></strong><small className="numeric">Beste Combo ×{progress.bestCombo}</small></div><div className="pilot-xp-track"><i style={{ width: `${level.ratio * 100}%` }} /></div><p>Der Flug trainiert die Habits. Nur echte Abschlüsse verändern deinen Kurs.</p>{lastLanding ? <p className="last-landing-line">Zyklus {lastLanding.cycle} · <strong className="numeric">{lastLanding.completionPercent}%</strong></p> : null}</div></section>
      <section className="stats-section hangar-section"><div className="section-heading"><div><p className="label-caps-micro">Hangar</p><h2>Skins</h2></div><span className="numeric">{unlockedCount}/{AIRCRAFT_SKINS.length}</span></div><div className="aircraft-carousel">{AIRCRAFT_SKINS.map((skin) => { const unlocked = level.level >= skin.requiredLevel; return <button type="button" key={skin.id} className={selectedAircraft === skin.id ? 'aircraft-card selected' : 'aircraft-card'} disabled={!unlocked} onClick={() => selectAircraft(skin.id)} style={{ '--aircraft-accent': skin.accent } as React.CSSProperties} aria-label={unlocked ? skin.name : `${skin.name}, ab Level ${skin.requiredLevel}`}><span className="aircraft-glyph"><AircraftGlyph size={26} color={unlocked ? skin.accent : '#4a5666'} rotationDegrees={-45} /></span><strong>{skin.name}</strong><small className="numeric">{unlocked ? '' : `LVL ${skin.requiredLevel}`}</small></button> })}</div></section>
    </section>
  )
}
