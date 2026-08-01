'use client'

import { useMemo } from 'react'
import { AIRCRAFT } from '@/lib/journey/defaults'
import { activeWeekCount, daysBetween, isHabitDue, localDateKey } from '@/lib/journey/date'
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
  const activeWeeks = activeWeekCount(records.map((record) => record.date))

  const habitRates = useMemo(() => habits.filter((habit) => !habit.archived).map((habit) => {
    const values = records.map((record) => record.statuses[habit.id]).filter(Boolean).map((status) => statusScore[status]).filter((score): score is number => score !== null)
    return { habit, rate: values.length === 0 ? 1 : values.reduce((sum, value) => sum + value, 0) / values.length }
  }).sort((a, b) => a.rate - b.rate), [habits, records])

  return (
    <section className="side-page stats-page" data-testid="stats-page">
      <header className="side-header stats-header"><button className="eyebrow-button" type="button" onClick={onBackToFlight}>Flug →</button><div><p className="label-caps-micro">Zukunftskurs</p><h1>Insights</h1></div><span className="flight-hours numeric">{Math.floor(flightMinutes / 60)}:{String(flightMinutes % 60).padStart(2, '0')}</span></header>
      <div className="impact-hero"><p className="label-caps">Wenn du diesen Kurs hältst</p><strong className="numeric">{missDistance} KM</strong><span>neben {journey.destinationIata}</span><div className="route-comparison"><i /><i style={{ transform: `rotate(${Math.min(12, deviation)}deg)` }} /></div></div>
      <div className="stats-grid">
        <article><span>Zielprognose</span><strong className="numeric">{projectionPercent}%</strong><small>{projectionValue} von {journey.targetValue} {journey.unit}</small></article>
        <article><span>Zurück auf Kurs</span><strong className="numeric">{Number.isFinite(recoveryDays) ? recoveryDays : '—'}</strong><small>{recoveryDays === 1 ? 'sauberer Tag' : 'saubere Tage'}</small></article>
        <article><span>Zeit als Werkzeug</span><strong className="numeric">{remainingDays}</strong><small>Tage verbleiben</small></article>
        <article><span>Wenn 7 Tage so bleiben</span><strong className="numeric">{repeatedMissKm} km</strong><small>projizierter Versatz</small></article>
      </div>
      <section className="stats-section"><div className="section-heading"><div><p className="label-caps-micro">Einfluss</p><h2>Deine Habits</h2></div><span>30 Tage</span></div><div className="habit-rate-list">{habitRates.map(({ habit, rate }) => <div key={habit.id} className="habit-rate-row"><span>{habit.icon} {habit.name}</span><div><i style={{ width: `${Math.round(rate * 100)}%` }} /></div><strong className="numeric">{Math.round(rate * 100)}%</strong></div>)}</div></section>
      <section className="stats-section pilot-progress-section"><div className="section-heading"><div><p className="label-caps-micro">Spielstand</p><h2>Pilot Progress</h2></div><span>Level {progress.level}</span></div><div className="pilot-progress-card"><div><span>⚡ {progress.experience} XP</span><strong className="numeric">⛽ {progress.fuel}/100</strong><small>{progress.successfulLandings} sichere 30-Tage-Landungen</small></div><div className="pilot-xp-track"><i style={{ width: `${progress.fuel}%` }} /></div><p>Nur echte Habit-Abschlüsse und Comeback-Fokusflüge füllen deinen Tank. Spielen verändert deinen realen Kurs nicht.</p>{lastLanding ? <p className="last-landing-line">Letzte Landung · Zyklus {lastLanding.cycle} · <strong className="numeric">{lastLanding.completionPercent}%</strong> · {lastLanding.grade}</p> : null}</div></section>
      <section className="stats-section hangar-section"><div className="section-heading"><div><p className="label-caps-micro">Belohnung</p><h2>Hangar</h2></div><span>{activeWeeks} aktive Wochen</span></div><div className="aircraft-carousel">{AIRCRAFT.map((aircraft) => { const unlocked = activeWeeks >= aircraft.requiredWeeks; return <button type="button" key={aircraft.id} className={selectedAircraft === aircraft.id ? 'aircraft-card selected' : 'aircraft-card'} disabled={!unlocked} onClick={() => selectAircraft(aircraft.id)} style={{ '--aircraft-accent': aircraft.accent } as React.CSSProperties}><span className="aircraft-glyph">✈</span><strong>{aircraft.name}</strong><small>{unlocked ? aircraft.caption : `Ab Woche ${aircraft.requiredWeeks}`}</small></button> })}</div></section>
      <p className="swipe-note">Nach links wischen für den Flug</p>
    </section>
  )
}
