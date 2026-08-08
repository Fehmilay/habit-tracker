'use client'

import { useMemo } from 'react'
import { HistoryCalendar } from './HistoryCalendar'
import { AircraftGlyph } from '@/components/icons/AircraftGlyph'
import { Glyph, resolveGlyph } from '@/components/icons/Glyph'
import { ACHIEVEMENTS, nextAchievement, type AchievementStats } from '@/lib/game/achievements'
import { AIRCRAFT_SKINS, levelProgress } from '@/lib/game/progression'
import { formatShortDate } from '@/lib/flight/instruments'
import { daysBetween, isHabitDue, localDateKey } from '@/lib/journey/date'
import { daysOnCourse, rollingWeek } from '@/lib/journey/history'
import { completionPercent, projectedGoalValue, recoveryDaysRequired, repeatedPatternDeviation } from '@/lib/journey/projection'
import { crossTrackDistanceKm } from '@/lib/journey/projection'
import type { HabitStatus } from '@/lib/journey/types'
import { useInstruments, useStreak } from '@/store/hooks'
import { useJourneyStore } from '@/store/journeyStore'

const statusScore: Record<HabitStatus, number | null> = { completed: 1, partial: 0.5, missed: 0, not_relevant: null }

interface StatsPanelProps {
  onBackToFlight: () => void
  onOpenSettings: () => void
}

export function StatsPanel({ onBackToFlight, onOpenSettings }: StatsPanelProps) {
  const journey = useJourneyStore((state) => state.journey)
  const habits = useJourneyStore((state) => state.habits)
  const records = useJourneyStore((state) => state.records)
  const frozenDates = useJourneyStore((state) => state.streakFrozenDates)
  const deviation = useJourneyStore((state) => state.currentDeviationDegrees)
  const selectedAircraft = useJourneyStore((state) => state.selectedAircraft)
  const selectAircraft = useJourneyStore((state) => state.selectAircraft)
  const flightMinutes = useJourneyStore((state) => state.flightMinutes)
  const progress = useJourneyStore((state) => state.progress)
  const unlocked = useJourneyStore((state) => state.unlockedAchievements)
  const lastLanding = useJourneyStore((state) => state.lastLanding)
  const streak = useStreak()
  const readout = useInstruments()

  const today = localDateKey()
  const dayIndex = Math.min(journey.totalDays, daysBetween(journey.startDate) + 1)
  const remainingDays = Math.max(0, journey.totalDays - dayIndex)
  const missDistance = readout.crossTrackKm
  const due = habits.filter((habit) => isHabitDue(habit, today))
  const recoveryDays = recoveryDaysRequired(deviation, due)
  const projectionValue = projectedGoalValue(journey.targetValue, records)
  const projectionPercent = completionPercent(records)
  const repeatedDeviation = repeatedPatternDeviation(deviation, records)
  const repeatedMissKm = crossTrackDistanceKm(readout.remainingDistanceKm || journey.totalDistanceKm, repeatedDeviation)
  const level = levelProgress(progress.experience)
  const unlockedCount = AIRCRAFT_SKINS.filter((skin) => level.level >= skin.requiredLevel).length

  // Left unmemoised on purpose: the React Compiler is enabled for this project
  // and memoises these itself. Hand-written useMemo calls around them were
  // rejected by `react-hooks/preserve-manual-memoization`, and a manual cache
  // the compiler has to bail out of is worse than no manual cache at all.
  const week = rollingWeek({ records, habits, frozenDates, today })

  const achievementStats: AchievementStats = {
    streakCurrent: streak.current,
    streakBest: streak.best,
    checkInDays: records.length,
    perfectDays: streak.perfectDays,
    focusMinutes: flightMinutes,
    ringsFlown: progress.ringsFlown,
    successfulLandings: progress.successfulLandings,
    recoveriesCompleted: progress.recoveriesCompleted,
    distanceFlownKm: readout.distanceFlownKm,
    level: level.level,
    daysOnCourse: daysOnCourse(records),
  }
  const upNext = nextAchievement(achievementStats, unlocked)

  const habitRates = useMemo(() => habits.filter((habit) => !habit.archived).map((habit) => {
    const values = records.map((record) => record.statuses[habit.id]).filter(Boolean).map((status) => statusScore[status]).filter((score): score is number => score !== null)
    return { habit, rate: values.length === 0 ? 1 : values.reduce((sum, value) => sum + value, 0) / values.length }
  }).sort((a, b) => a.rate - b.rate), [habits, records])

  return (
    <section className="side-page stats-page" data-testid="stats-page">
      <header className="side-header stats-header">
        <button className="eyebrow-button" type="button" onClick={onBackToFlight} aria-label="Zurück zum Flug"><Glyph name="chevronRight" size={16} /></button>
        <div><p className="label-caps-micro">Zukunftskurs</p><h1>Insights</h1></div>
        <button className="round-icon-button" type="button" onClick={onOpenSettings} aria-label="Einstellungen öffnen"><Glyph name="settings" size={17} /></button>
      </header>

      {/* The chain leads, because it is the number people actually return for. */}
      <div className="streak-hero" data-state={streak.current === 0 ? 'cold' : streak.atRisk ? 'risk' : 'hot'} data-testid="streak-hero">
        <span className="streak-hero-flame"><Glyph name="flame" size={30} /></span>
        <strong className="numeric">{streak.current}</strong>
        <span>{streak.current === 1 ? 'Tag am Stück' : 'Tage am Stück'}</span>
        <div className="streak-hero-meta">
          <span><small>REKORD</small><strong className="numeric">{streak.best}</strong></span>
          <span><small>PERFEKT</small><strong className="numeric">{streak.perfectDays}</strong></span>
          <span><small>RESERVE</small><strong className="numeric">{readout.reservePercent}%</strong></span>
        </div>
      </div>

      <div className="impact-hero"><p className="label-caps">Wenn du diesen Kurs hältst</p><strong className="numeric">{missDistance} KM</strong><span>neben {journey.destinationIata}</span><div className="route-comparison"><i /><i style={{ transform: `rotate(${Math.min(12, deviation)}deg)` }} /></div></div>

      <div className="stats-grid">
        <article><span>Ankunft</span><strong className="numeric">{formatShortDate(readout.etaDate)}</strong><small>{readout.etaDeltaDays === 0 ? 'genau im Plan' : readout.etaDeltaDays > 0 ? `${readout.etaDeltaDays} Tage später als geplant` : `${Math.abs(readout.etaDeltaDays)} Tage früher`}</small></article>
        <article><span>Zielprognose</span><strong className="numeric">{projectionPercent === null ? '—' : `${projectionPercent}%`}</strong><small>{projectionPercent === null ? 'Noch kein bestätigter Tag' : `${projectionValue} von ${journey.targetValue} ${journey.unit}`}</small></article>
        <article><span>Zurück auf Kurs</span><strong className="numeric">{Number.isFinite(recoveryDays) ? recoveryDays : '—'}</strong><small>{recoveryDays === 1 ? 'sauberer Tag' : 'saubere Tage'}</small></article>
        <article><span>Wenn 7 Tage so bleiben</span><strong className="numeric">{repeatedMissKm} km</strong><small>projizierter Versatz</small></article>
      </div>

      <section className="stats-section week-section">
        <div className="section-heading"><div><p className="label-caps-micro">Letzte 7 Tage</p><h2>Deine Woche</h2></div><span className="numeric">{Math.round(week.completionRate * 100)}%</span></div>
        <div className="week-card">
          <div className="week-figures">
            <span><strong className="numeric">{week.keptDays}<b>/{week.activeDays}</b></strong><small>Tage gehalten</small></span>
            <span><strong className="numeric">{week.perfectDays}</strong><small>perfekt</small></span>
            <span><strong className="numeric">{Math.floor(flightMinutes / 60)}h</strong><small>Fokusflug</small></span>
          </div>
          <div className="week-track"><i style={{ width: `${Math.round(week.completionRate * 100)}%` }} /></div>
          <p>
            {week.weakestHabitIds.length === 0
              ? 'Kein Habit ist diese Woche durchgefallen.'
              : `Am häufigsten gerissen: ${week.weakestHabitIds
                  .map((id) => habits.find((habit) => habit.id === id)?.name)
                  .filter(Boolean)
                  .join(', ')}.`}
          </p>
        </div>
      </section>

      <HistoryCalendar />

      <section className="stats-section"><div className="section-heading"><div><p className="label-caps-micro">Einfluss</p><h2>Deine Habits</h2></div><span>{records.length} {records.length === 1 ? 'Tag' : 'Tage'}</span></div><div className="habit-rate-list">{habitRates.map(({ habit, rate }) => <div key={habit.id} className="habit-rate-row"><span><i className="habit-icon"><Glyph name={resolveGlyph(habit.icon)} size={15} /></i>{habit.name}</span><div><i style={{ width: `${Math.round(rate * 100)}%` }} /></div><strong className="numeric">{Math.round(rate * 100)}%</strong></div>)}</div></section>

      <section className="stats-section achievements-section">
        <div className="section-heading"><div><p className="label-caps-micro">Meilensteine</p><h2>Logbuch</h2></div><span className="numeric">{unlocked.length}/{ACHIEVEMENTS.length}</span></div>
        {upNext ? (
          <div className="achievement-next">
            <span className="habit-icon"><Glyph name={upNext.achievement.icon} size={17} /></span>
            <div>
              <strong>{upNext.achievement.name}</strong>
              <small>{upNext.achievement.description}</small>
              <i aria-hidden="true"><b style={{ width: `${Math.round(upNext.progress * 100)}%` }} /></i>
            </div>
            <strong className="numeric">{Math.round(upNext.progress * 100)}%</strong>
          </div>
        ) : null}
        <div className="achievement-grid">
          {ACHIEVEMENTS.map((achievement) => {
            const earned = unlocked.includes(achievement.id)
            return (
              <span key={achievement.id} className="achievement-chip" data-tier={achievement.tier} data-earned={earned} title={achievement.description}>
                <Glyph name={achievement.icon} size={15} />
                <small>{achievement.name}</small>
              </span>
            )
          })}
        </div>
      </section>

      <section className="stats-section pilot-progress-section"><div className="section-heading"><div><p className="label-caps-micro">Pilot</p><h2>Level {level.level}</h2></div><span className="numeric">{progress.ringsFlown} Ringe</span></div><div className="pilot-progress-card"><div className="pilot-progress-figures"><strong className="numeric">{level.into}<b>/{level.span}</b></strong><small className="numeric">Beste Combo ×{progress.bestCombo}</small></div><div className="pilot-xp-track"><i style={{ width: `${level.ratio * 100}%` }} /></div><p>Der Flug trainiert die Habits. Nur echte Abschlüsse verändern deinen Kurs.</p>{lastLanding ? <p className="last-landing-line">Zyklus {lastLanding.cycle} · <strong className="numeric">{lastLanding.completionPercent}%</strong></p> : null}</div></section>

      <section className="stats-section hangar-section"><div className="section-heading"><div><p className="label-caps-micro">Hangar</p><h2>Skins</h2></div><span className="numeric">{unlockedCount}/{AIRCRAFT_SKINS.length}</span></div><div className="aircraft-carousel">{AIRCRAFT_SKINS.map((skin) => { const isUnlocked = level.level >= skin.requiredLevel; return <button type="button" key={skin.id} className={selectedAircraft === skin.id ? 'aircraft-card selected' : 'aircraft-card'} disabled={!isUnlocked} onClick={() => selectAircraft(skin.id)} style={{ '--aircraft-accent': skin.accent } as React.CSSProperties} aria-label={isUnlocked ? skin.name : `${skin.name}, ab Level ${skin.requiredLevel}`}><span className="aircraft-glyph"><AircraftGlyph size={26} color={isUnlocked ? skin.accent : '#4a5666'} rotationDegrees={-45} /></span><strong>{skin.name}</strong><small className="numeric">{isUnlocked ? '' : `LVL ${skin.requiredLevel}`}</small></button> })}</div></section>

      <p className="stats-footnote">Tag {dayIndex} von {journey.totalDays} · noch {remainingDays} Tage bis {journey.destinationIata}</p>
    </section>
  )
}
