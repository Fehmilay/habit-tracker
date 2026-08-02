import type { Habit, JourneyGoal } from './types'

const everyDay = [0, 1, 2, 3, 4, 5, 6]

export const DEFAULT_HABITS: Habit[] = [
  {
    id: 'gym',
    name: 'Gym',
    icon: 'strength',
    cue: '45 Minuten Training',
    durationMinutes: 45,
    days: [0, 2, 4],
    impact: 1,
    archived: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'nutrition',
    name: 'Kalorienziel',
    icon: 'nutrition',
    cue: 'Im geplanten Rahmen bleiben',
    durationMinutes: 25,
    days: everyDay,
    impact: 1,
    archived: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'steps',
    name: '10k Schritte',
    icon: 'steps',
    cue: '10.000 Schritte sammeln',
    durationMinutes: 30,
    days: everyDay,
    impact: 0.5,
    archived: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'water',
    name: 'Wasser',
    icon: 'water',
    cue: '2,5 Liter trinken',
    durationMinutes: 10,
    days: everyDay,
    impact: 0.5,
    archived: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
]

export const DEFAULT_JOURNEY: JourneyGoal = {
  title: 'Traumkörper aufbauen',
  targetValue: 36,
  unit: 'Trainings',
  totalDays: 90,
  startDate: '2026-08-01',
  originIata: 'DUS',
  originCity: 'Düsseldorf',
  destinationIata: 'JFK',
  destinationCity: 'New York',
  totalDistanceKm: 5840,
}
