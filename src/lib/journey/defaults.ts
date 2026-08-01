import type { AircraftDefinition, Habit, JourneyGoal } from './types'

const everyDay = [0, 1, 2, 3, 4, 5, 6]

export const DEFAULT_HABITS: Habit[] = [
  {
    id: 'gym',
    name: 'Gym',
    icon: '🏋️',
    cue: '45 Minuten Training',
    days: [0, 2, 4],
    impact: 1,
    archived: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'nutrition',
    name: 'Kalorienziel',
    icon: '🥗',
    cue: 'Im geplanten Rahmen bleiben',
    days: everyDay,
    impact: 1,
    archived: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'steps',
    name: '10k Schritte',
    icon: '🚶',
    cue: '10.000 Schritte sammeln',
    days: everyDay,
    impact: 0.5,
    archived: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'water',
    name: 'Wasser',
    icon: '💧',
    cue: '2,5 Liter trinken',
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

export const AIRCRAFT: AircraftDefinition[] = [
  { id: 'trainer', name: 'Aero One', caption: 'Dein erster Kurs', requiredWeeks: 0, accent: '#dce8f6' },
  { id: 'turboprop', name: 'Northstar', caption: 'Eine aktive Woche', requiredWeeks: 1, accent: '#8ff2d8' },
  { id: 'regional', name: 'Pulse Jet', caption: 'Zwei aktive Wochen', requiredWeeks: 2, accent: '#7cc9ff' },
  { id: 'longhaul', name: 'Long Range', caption: 'Vier aktive Wochen', requiredWeeks: 4, accent: '#ffd489' },
  { id: 'velocity', name: 'Velocity X', caption: 'Acht aktive Wochen', requiredWeeks: 8, accent: '#d1a8ff' },
]

