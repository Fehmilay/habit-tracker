import { describe, expect, it } from 'vitest'
import {
  airspeedForMomentum,
  altitudeForStreak,
  arrivalForecast,
  CRUISE_ALTITUDE_FEET,
  CRUISE_KNOTS,
  FEET_PER_STREAK_DAY,
  MIN_KNOTS,
  momentum,
  readInstruments,
  todayProgress,
  verticalSpeedFpm,
} from './instruments'
import type { DailyFlightRecord, Habit, JourneyGoal } from '@/lib/journey/types'
import type { StreakState } from '@/lib/journey/streak'

const journey: JourneyGoal = {
  title: 'Ziel',
  targetValue: 30,
  unit: 'Tage',
  totalDays: 100,
  startDate: '2026-03-01',
  originIata: 'DUS',
  originCity: 'Düsseldorf',
  destinationIata: 'JFK',
  destinationCity: 'New York',
  totalDistanceKm: 10_000,
}

function record(date: string, completionRate: number): DailyFlightRecord {
  return {
    date,
    statuses: {},
    previousDeviationDegrees: 0,
    recoveredDegrees: 0,
    addedDegrees: 0,
    finalDeviationDegrees: 0,
    crossTrackKm: 0,
    completionRate,
    events: [],
    completedAt: `${date}T20:00:00.000Z`,
  }
}

function days(count: number, rate: number, from = 1): DailyFlightRecord[] {
  return Array.from({ length: count }, (_value, index) =>
    record(`2026-03-${String(from + index).padStart(2, '0')}`, rate),
  )
}

const habit: Habit = {
  id: 'gym',
  name: 'Gym',
  icon: 'strength',
  cue: 'Trainieren',
  days: [0, 1, 2, 3, 4, 5, 6],
  impact: 1,
  archived: false,
  createdAt: '2026-01-01T00:00:00.000Z',
}

const streak: StreakState = {
  current: 5,
  best: 9,
  atRisk: false,
  totalKeptDays: 20,
  perfectDays: 12,
  lastKeptDate: '2026-03-10',
}

describe('altitudeForStreak', () => {
  it('climbs a thousand feet per day and levels off at cruise', () => {
    expect(altitudeForStreak(0)).toBe(0)
    expect(altitudeForStreak(7)).toBe(7 * FEET_PER_STREAK_DAY)
    expect(altitudeForStreak(500)).toBe(CRUISE_ALTITUDE_FEET)
  })

  it('never goes negative on a corrupt value', () => {
    expect(altitudeForStreak(-4)).toBe(0)
  })
})

describe('momentum', () => {
  it('weights recent days more heavily than older ones', () => {
    const improving = momentum([...days(3, 0), ...days(3, 1, 4)])
    const declining = momentum([...days(3, 1), ...days(3, 0, 4)])
    expect(improving).toBeGreaterThan(declining)
  })

  it('is zero without history and one for a flawless week', () => {
    expect(momentum([])).toBe(0)
    expect(momentum(days(7, 1))).toBeCloseTo(1)
  })

  it('ignores a non-finite completion rate rather than poisoning the mean', () => {
    expect(momentum([record('2026-03-01', Number.NaN), record('2026-03-02', 1)])).toBeGreaterThan(0)
  })
})

describe('airspeedForMomentum', () => {
  it('spans the full band', () => {
    expect(airspeedForMomentum(0)).toBe(MIN_KNOTS)
    expect(airspeedForMomentum(1)).toBe(CRUISE_KNOTS)
    expect(airspeedForMomentum(0.5)).toBeGreaterThan(MIN_KNOTS)
    expect(airspeedForMomentum(0.5)).toBeLessThan(CRUISE_KNOTS)
  })
})

describe('verticalSpeedFpm', () => {
  it('climbs when the recent days beat the ones before them', () => {
    expect(verticalSpeedFpm([...days(7, 0.2), ...days(4, 1, 8)])).toBeGreaterThan(0)
  })

  it('sinks when the recent days are worse', () => {
    expect(verticalSpeedFpm([...days(7, 1), ...days(4, 0.1, 8)])).toBeLessThan(0)
  })

  it('is level with no history', () => {
    expect(verticalSpeedFpm([])).toBe(0)
  })

  it('stays inside the instrument range', () => {
    const value = verticalSpeedFpm([...days(7, 0), ...days(4, 1, 8)])
    expect(Math.abs(value)).toBeLessThanOrEqual(2_500)
  })
})

describe('todayProgress', () => {
  it('weights partial credit by habit impact', () => {
    const habits = [habit, { ...habit, id: 'water', impact: 0.5 }]
    const progress = todayProgress(habits, { gym: 'completed', water: 'missed' }, undefined, '2026-03-10')
    expect(progress.due).toBe(2)
    expect(progress.rated).toBe(2)
    expect(progress.ratio).toBeCloseTo(1 / 1.5)
  })

  it('treats a day with nothing due as complete', () => {
    const weekend = { ...habit, days: [5, 6] }
    // 2026-03-10 is a Tuesday.
    expect(todayProgress([weekend], {}, undefined, '2026-03-10')).toEqual({ due: 0, rated: 0, ratio: 1 })
  })

  it('prefers the filed record over the drafts once the day is closed', () => {
    const filed = record('2026-03-10', 1)
    filed.statuses = { gym: 'completed' }
    const progress = todayProgress([habit], { gym: 'missed' }, filed, '2026-03-10')
    expect(progress.ratio).toBe(1)
  })
})

describe('arrivalForecast', () => {
  it('is on the planned day when every day is flown at 100%', () => {
    const forecast = arrivalForecast(journey, days(10, 1), '2026-03-10')
    // Ten perfect days out of a hundred: ninety left at one leg per day.
    expect(forecast.distanceFlownKm).toBe(1_000)
    expect(forecast.etaDeltaDays).toBe(0)
  })

  it('slides later when days are only half done', () => {
    const forecast = arrivalForecast(journey, days(10, 0.5), '2026-03-10')
    expect(forecast.distanceFlownKm).toBe(500)
    expect(forecast.etaDeltaDays).toBeGreaterThan(0)
  })

  it('shows the planned arrival before there is any history', () => {
    const forecast = arrivalForecast(journey, [], '2026-03-01')
    expect(forecast.plannedArrivalDate).toBe('2026-06-08')
    expect(forecast.etaDeltaDays).toBe(0)
  })

  it('never divides by zero when nothing at all has been completed', () => {
    const forecast = arrivalForecast(journey, days(5, 0), '2026-03-05')
    expect(Number.isFinite(forecast.etaDeltaDays)).toBe(true)
    expect(forecast.remainingDistanceKm).toBe(10_000)
  })
})

describe('readInstruments', () => {
  const base = {
    journey,
    habits: [habit],
    records: days(6, 1),
    drafts: {},
    streak,
    reserve: 60,
    deviationDegrees: 0,
    today: '2026-03-07',
  }

  it('produces every gauge exactly once', () => {
    const readout = readInstruments(base)
    expect(readout.instruments.map((instrument) => instrument.id)).toEqual([
      'altitude',
      'airspeed',
      'vertical',
      'today',
      'fuel',
      'eta',
      'crosstrack',
    ])
  })

  it('turns the reserve into whole days of chain protection', () => {
    expect(readInstruments(base).freezesAvailable).toBe(2)
    expect(readInstruments({ ...base, reserve: 10 }).freezesAvailable).toBe(0)
  })

  it('asks for the open habits first, before anything about the course', () => {
    const readout = readInstruments({ ...base, deviationDegrees: 6 })
    expect(readout.nextAction).toContain('offen')
  })

  it('falls back to the course once today is fully rated', () => {
    const readout = readInstruments({
      ...base,
      drafts: { gym: 'completed' },
      streak: { ...streak, atRisk: false },
      deviationDegrees: 4,
    })
    expect(readout.nextAction).toContain('4.0°')
  })

  it('reports zero cross track on a straight course', () => {
    expect(readInstruments(base).crossTrackKm).toBe(0)
  })

  it('survives a record with a non-finite completion rate', () => {
    const readout = readInstruments({
      ...base,
      records: [record('2026-03-01', Number.NaN), record('2026-03-02', 1)],
    })
    expect(Number.isFinite(readout.airspeedKnots)).toBe(true)
    expect(Number.isFinite(readout.distanceFlownKm)).toBe(true)
  })
})
