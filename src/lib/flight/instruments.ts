import { addDays, isHabitDue, localDateKey, signedDaysBetween } from '@/lib/journey/date'
import { crossTrackDistanceKm } from '@/lib/journey/projection'
import type { DailyFlightRecord, Habit, HabitStatus, JourneyGoal } from '@/lib/journey/types'
import type { StreakState } from '@/lib/journey/streak'

/**
 * The instrument panel.
 *
 * This is the file that makes the aircraft a *tool* rather than a mascot. Every
 * gauge below is a real quantity from the habit record rendered in the unit a
 * pilot would read it in, and the mapping is one-way and honest: there is no
 * cosmetic value here, and nothing is smoothed to look better than it is.
 *
 *   ALT  altitude       the chain - how many consecutive days you have kept
 *   SPD  airspeed       momentum - weighted completion over the last week
 *   V/S  vertical speed trend - whether this week beats the one before it
 *   FUEL fuel remaining reserve - the days of chain protection you have banked
 *   TODAY                today's check-in, the only gauge you can move right now
 *   ETA  arrival        the date you actually reach the destination at this pace
 *   XTK  cross track    kilometres beside the destination if nothing changes
 *
 * Kept pure and free of React and Three.js so the numbers can be unit tested,
 * and so the same readout can drive the HUD strip, the instrument sheet and the
 * notification copy without three subtly different implementations.
 */

/** Feet of altitude per day on the chain. */
export const FEET_PER_STREAK_DAY = 1_000
/** Cruise altitude, reached at a 35-day chain. Nothing climbs past it. */
export const CRUISE_ALTITUDE_FEET = 35_000

/** Airspeed at zero momentum. Below `STALL_KNOTS` the aircraft is sinking. */
export const MIN_KNOTS = 140
export const STALL_KNOTS = 210
export const CRUISE_KNOTS = 540

/** Reserve needed to freeze one missed day. */
export const RESERVE_PER_FREEZE = 30
export const MAX_RESERVE = 100

export type InstrumentTone = 'good' | 'warn' | 'bad' | 'neutral'

export interface Instrument {
  id: 'altitude' | 'airspeed' | 'vertical' | 'fuel' | 'today' | 'eta' | 'crosstrack'
  /** Three-to-five letter panel label, as printed on a real instrument. */
  code: string
  /** What it means, in plain German. */
  title: string
  /** Formatted primary figure. */
  value: string
  unit: string
  /** One line saying what the figure is actually telling you. */
  caption: string
  /** 0..1 fill for the gauge arc, where that reads meaningfully. */
  ratio: number
  tone: InstrumentTone
}

export interface InstrumentInput {
  journey: JourneyGoal
  habits: Habit[]
  records: DailyFlightRecord[]
  drafts: Record<string, HabitStatus>
  streak: StreakState
  reserve: number
  deviationDegrees: number
  today?: string
}

export interface InstrumentReadout {
  altitudeFeet: number
  airspeedKnots: number
  verticalSpeedFpm: number
  reservePercent: number
  freezesAvailable: number
  todayRatio: number
  todayRated: number
  todayDue: number
  /** Projected arrival date key at the current pace. */
  etaDate: string
  /** Days later (+) or earlier (-) than the planned arrival. */
  etaDeltaDays: number
  plannedArrivalDate: string
  distanceFlownKm: number
  remainingDistanceKm: number
  crossTrackKm: number
  /** The single most useful thing to do next. */
  nextAction: string
  instruments: Instrument[]
}

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value
}

function clamp01(value: number): number {
  return clamp(Number.isFinite(value) ? value : 0, 0, 1)
}

/** Altitude for a chain length. Linear, then flat at cruise. */
export function altitudeForStreak(streakDays: number): number {
  const safe = Math.max(0, Math.floor(streakDays))
  return Math.min(CRUISE_ALTITUDE_FEET, safe * FEET_PER_STREAK_DAY)
}

/**
 * Weighted completion over a window, most recent day heaviest.
 *
 * Linear weights rather than a flat mean: the point of an airspeed needle is
 * that it responds to what you are doing now, and a flat 30-day mean takes a
 * fortnight to notice that someone stopped.
 */
export function momentum(records: DailyFlightRecord[], windowDays = 7): number {
  const recent = records.slice(-windowDays)
  if (recent.length === 0) return 0

  let weighted = 0
  let weight = 0
  recent.forEach((record, index) => {
    const rate = Number.isFinite(record.completionRate) ? clamp01(record.completionRate) : 0
    const w = index + 1
    weighted += rate * w
    weight += w
  })

  return weight === 0 ? 0 : weighted / weight
}

export function airspeedForMomentum(value: number): number {
  return Math.round(MIN_KNOTS + clamp01(value) * (CRUISE_KNOTS - MIN_KNOTS))
}

/**
 * Vertical speed: this week against the week before it.
 *
 * Answers the one question a completion percentage cannot - "am I getting
 * better or worse right now" - which is exactly what a real VSI is for.
 */
export function verticalSpeedFpm(records: DailyFlightRecord[]): number {
  if (records.length < 2) return 0
  const recent = momentum(records.slice(-4), 4)
  const before = momentum(records.slice(-11, -4), 7)
  if (records.length < 5) return Math.round((recent - 0.5) * 2_000)
  return Math.round(clamp((recent - before) * 6_000, -2_500, 2_500))
}

export interface TodayProgress {
  due: number
  rated: number
  /** Status-weighted share of today's work that has actually landed. */
  ratio: number
}

export function todayProgress(
  habits: Habit[],
  drafts: Record<string, HabitStatus>,
  record: DailyFlightRecord | undefined,
  dateKey: string,
): TodayProgress {
  const due = habits.filter((habit) => isHabitDue(habit, dateKey))
  if (due.length === 0) return { due: 0, rated: 0, ratio: 1 }

  const statuses = record?.statuses ?? drafts
  let rated = 0
  let earned = 0
  let possible = 0

  for (const habit of due) {
    const status = statuses[habit.id]
    if (!status) continue
    rated += 1
    if (status === 'not_relevant') continue
    possible += habit.impact
    if (status === 'completed') earned += habit.impact
    else if (status === 'partial') earned += habit.impact * 0.5
  }

  return { due: due.length, rated, ratio: possible === 0 ? (rated > 0 ? 1 : 0) : earned / possible }
}

/**
 * Arrival forecast.
 *
 * Distance is earned, not granted: each recorded day advances the aircraft by
 * its completion share of one planned day's leg. A half-done day covers half a
 * day's ground, and a skipped day covers none - which is precisely why the
 * arrival date slides later, and why it slides back when someone recovers.
 */
export interface ArrivalForecast {
  distanceFlownKm: number
  remainingDistanceKm: number
  etaDate: string
  etaDeltaDays: number
  plannedArrivalDate: string
  /** Kilometres of ground covered per day at the current pace. */
  paceKmPerDay: number
}

export function arrivalForecast(
  journey: JourneyGoal,
  records: DailyFlightRecord[],
  today = localDateKey(),
): ArrivalForecast {
  const totalDays = Math.max(1, journey.totalDays)
  const totalKm = Math.max(1, journey.totalDistanceKm)
  const legKm = totalKm / totalDays
  // Day 1 is the start date itself, so a hundred-day flight lands on day
  // `start + 99`. Using `+ totalDays` here silently makes every journey a day
  // long and puts a perfect run permanently one day "early".
  const plannedArrivalDate = addDays(journey.startDate, totalDays - 1)

  const earnedDays = records.reduce(
    (sum, record) => sum + clamp01(record.completionRate),
    0,
  )
  const distanceFlownKm = Math.min(totalKm, Math.round(earnedDays * legKm))
  const remainingDistanceKm = Math.max(0, totalKm - distanceFlownKm)

  // Pace falls back to the planned leg before there is any history, so a brand
  // new journey shows its planned arrival rather than "never".
  const pace = records.length === 0 ? 1 : momentum(records, 14)
  const paceKmPerDay = Math.max(legKm * 0.08, legKm * pace)
  const daysRemaining = Math.max(0, Math.ceil(remainingDistanceKm / paceKmPerDay))
  // Today only counts toward the remaining legs if it has not been flown yet -
  // otherwise the first of those legs is tomorrow's.
  const todayRecorded = records.some((entry) => entry.date === today)
  const etaDate = addDays(
    today,
    todayRecorded || daysRemaining === 0 ? daysRemaining : daysRemaining - 1,
  )

  return {
    distanceFlownKm,
    remainingDistanceKm,
    etaDate,
    etaDeltaDays: signedDaysBetween(plannedArrivalDate, etaDate),
    plannedArrivalDate,
    paceKmPerDay: Math.round(paceKmPerDay),
  }
}

export function formatFeet(feet: number): string {
  return Math.round(feet).toLocaleString('de-DE')
}

export function formatVerticalSpeed(fpm: number): string {
  const rounded = Math.round(fpm / 10) * 10
  if (rounded === 0) return '0'
  return `${rounded > 0 ? '+' : '−'}${Math.abs(rounded).toLocaleString('de-DE')}`
}

export function formatShortDate(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00`)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
}

/**
 * The one sentence the pilot should act on.
 *
 * Ordered by urgency rather than by severity: the chain can only be saved
 * today, a deviation can be worked off over several days, and a level is never
 * urgent at all.
 */
function nextActionFor(
  progress: TodayProgress,
  streak: StreakState,
  deviationDegrees: number,
  forecast: ArrivalForecast,
): string {
  if (progress.due === 0) return 'Heute ist Ruhetag. Die Kette läuft weiter.'
  if (progress.rated < progress.due) {
    const open = progress.due - progress.rated
    return streak.current > 0
      ? `Noch ${open} ${open === 1 ? 'Habit' : 'Habits'} offen — ${streak.current} Tage Kette stehen auf dem Spiel.`
      : `Noch ${open} ${open === 1 ? 'Habit' : 'Habits'} offen. Der erste Tag startet die Kette.`
  }
  if (streak.atRisk) return 'Alles bewertet. Bestätige den Tag, um die Kette zu sichern.'
  if (deviationDegrees >= 1) {
    return `${deviationDegrees.toFixed(1)}° neben dem Kurs. Ein sauberer Tag holt bis zu ${Math.min(3, Math.round(deviationDegrees * 10) / 10)}° zurück.`
  }
  if (forecast.etaDeltaDays > 0) {
    return `Ankunft ${forecast.etaDeltaDays} ${forecast.etaDeltaDays === 1 ? 'Tag' : 'Tage'} zu spät. Halte das Tempo, dann zieht sie sich zusammen.`
  }
  return 'Auf Kurs, auf Zeit. Genau so weiter.'
}

/** Assemble the whole panel. */
export function readInstruments(input: InstrumentInput): InstrumentReadout {
  const today = input.today ?? localDateKey()
  const record = input.records.find((entry) => entry.date === today)
  const progress = todayProgress(input.habits, input.drafts, record, today)

  const altitudeFeet = altitudeForStreak(input.streak.current)
  const pace = momentum(input.records, 7)
  const airspeedKnots = airspeedForMomentum(pace)
  const vertical = verticalSpeedFpm(input.records)
  const forecast = arrivalForecast(input.journey, input.records, today)

  const reserve = clamp(Math.round(input.reserve), 0, MAX_RESERVE)
  const freezesAvailable = Math.floor(reserve / RESERVE_PER_FREEZE)
  const crossTrackKm = crossTrackDistanceKm(
    forecast.remainingDistanceKm || input.journey.totalDistanceKm,
    input.deviationDegrees,
  )

  const instruments: Instrument[] = [
    {
      id: 'altitude',
      code: 'ALT',
      title: 'Flughöhe · Kette',
      value: formatFeet(altitudeFeet),
      unit: 'FT',
      caption:
        input.streak.current === 0
          ? 'Am Boden. Ein bestätigter Tag hebt dich ab.'
          : `${input.streak.current} ${input.streak.current === 1 ? 'Tag' : 'Tage'} am Stück · Rekord ${input.streak.best}`,
      ratio: clamp01(altitudeFeet / CRUISE_ALTITUDE_FEET),
      tone: input.streak.current === 0 ? 'bad' : input.streak.atRisk ? 'warn' : 'good',
    },
    {
      id: 'airspeed',
      code: 'SPD',
      title: 'Geschwindigkeit · Momentum',
      value: String(airspeedKnots),
      unit: 'KT',
      caption:
        airspeedKnots < STALL_KNOTS
          ? 'Unter Mindestfahrt. Die letzten sieben Tage tragen dich nicht.'
          : `${Math.round(pace * 100)}% der letzten sieben Tage erledigt`,
      ratio: clamp01((airspeedKnots - MIN_KNOTS) / (CRUISE_KNOTS - MIN_KNOTS)),
      tone: airspeedKnots < STALL_KNOTS ? 'bad' : airspeedKnots < 380 ? 'warn' : 'good',
    },
    {
      id: 'vertical',
      code: 'V/S',
      title: 'Steigrate · Trend',
      value: formatVerticalSpeed(vertical),
      unit: 'FPM',
      caption:
        vertical > 120
          ? 'Du wirst besser als in der Woche davor.'
          : vertical < -120
            ? 'Du fällst hinter deine eigene Vorwoche zurück.'
            : 'Stabil auf dem Niveau der Vorwoche.',
      ratio: clamp01((vertical + 2_500) / 5_000),
      tone: vertical > 120 ? 'good' : vertical < -120 ? 'bad' : 'neutral',
    },
    {
      id: 'today',
      code: 'TDY',
      title: 'Heute',
      value:
        progress.due === 0 ? '—' : `${progress.rated}/${progress.due}`,
      unit: progress.due === 0 ? 'FREI' : 'HABITS',
      caption:
        progress.due === 0
          ? 'Kein Habit fällig.'
          : record
            ? `Tag bestätigt · ${Math.round(progress.ratio * 100)}%`
            : `${Math.round(progress.ratio * 100)}% erledigt · noch nicht bestätigt`,
      ratio: progress.due === 0 ? 1 : progress.rated / progress.due,
      tone: progress.due === 0 ? 'neutral' : record ? 'good' : progress.rated === 0 ? 'bad' : 'warn',
    },
    {
      id: 'fuel',
      code: 'FUEL',
      title: 'Reserve · Kettenschutz',
      value: String(reserve),
      unit: '%',
      caption:
        freezesAvailable > 0
          ? `${freezesAvailable} ${freezesAvailable === 1 ? 'Tag' : 'Tage'} Kettenschutz im Tank`
          : `Noch ${RESERVE_PER_FREEZE - reserve}% bis zum nächsten Kettenschutz`,
      ratio: reserve / MAX_RESERVE,
      tone: freezesAvailable > 0 ? 'good' : reserve > 0 ? 'neutral' : 'warn',
    },
    {
      id: 'eta',
      code: 'ETA',
      title: 'Ankunft',
      value: formatShortDate(forecast.etaDate),
      unit: input.journey.destinationIata,
      caption:
        forecast.etaDeltaDays === 0
          ? 'Punktlandung auf den geplanten Tag.'
          : forecast.etaDeltaDays > 0
            ? `${forecast.etaDeltaDays} ${forecast.etaDeltaDays === 1 ? 'Tag' : 'Tage'} später als geplant`
            : `${Math.abs(forecast.etaDeltaDays)} ${Math.abs(forecast.etaDeltaDays) === 1 ? 'Tag' : 'Tage'} früher als geplant`,
      ratio: clamp01(forecast.distanceFlownKm / Math.max(1, input.journey.totalDistanceKm)),
      tone: forecast.etaDeltaDays <= 0 ? 'good' : forecast.etaDeltaDays <= 5 ? 'warn' : 'bad',
    },
    {
      id: 'crosstrack',
      code: 'XTK',
      title: 'Querabweichung',
      value: crossTrackKm.toLocaleString('de-DE'),
      unit: 'KM',
      caption:
        crossTrackKm === 0
          ? `Direkt auf ${input.journey.destinationIata}.`
          : `So weit würdest du an ${input.journey.destinationIata} vorbeifliegen.`,
      ratio: clamp01(crossTrackKm / Math.max(1, input.journey.totalDistanceKm * 0.25)),
      tone: crossTrackKm === 0 ? 'good' : input.deviationDegrees < 3 ? 'warn' : 'bad',
    },
  ]

  return {
    altitudeFeet,
    airspeedKnots,
    verticalSpeedFpm: vertical,
    reservePercent: reserve,
    freezesAvailable,
    todayRatio: progress.ratio,
    todayRated: progress.rated,
    todayDue: progress.due,
    etaDate: forecast.etaDate,
    etaDeltaDays: forecast.etaDeltaDays,
    plannedArrivalDate: forecast.plannedArrivalDate,
    distanceFlownKm: forecast.distanceFlownKm,
    remainingDistanceKm: forecast.remainingDistanceKm,
    crossTrackKm,
    nextAction: nextActionFor(progress, input.streak, input.deviationDegrees, forecast),
    instruments,
  }
}
