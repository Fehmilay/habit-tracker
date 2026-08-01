/**
 * Fixed demo journey for Phase 1.
 *
 * Phase 1 has no persistence, no airport picker and no geographic maths - the
 * curated airport dataset and great-circle projection arrive in Phase 4. These
 * values exist purely so the HUD has something truthful to render while the
 * flight scene is being built, and they are intentionally the ones used as the
 * worked example in the brief.
 */
export interface DemoJourney {
  originIata: string
  originCity: string
  destinationIata: string
  destinationCity: string
  remainingDistanceKm: number
  totalDistanceKm: number
  dayIndex: number
  totalDays: number
  goalProjectionPercent: number
  goalLabel: string
}

export const DEMO_JOURNEY: DemoJourney = {
  originIata: 'DUS',
  originCity: 'Düsseldorf',
  destinationIata: 'JFK',
  destinationCity: 'New York',
  remainingDistanceKm: 5840,
  totalDistanceKm: 6180,
  dayIndex: 18,
  totalDays: 90,
  goalProjectionPercent: 74,
  goalLabel: 'In 90 Tagen 10 kg abnehmen',
}

/** Sample day events used by the Phase 1 "Tagesanimation testen" preview. */
export interface DemoDayEvent {
  label: string
  detail: string
  degrees: number
}

export const DEMO_DAY_EVENTS: DemoDayEvent[] = [
  { label: 'Gym', detail: 'Nicht erledigt', degrees: 1 },
  { label: 'Schritte', detail: 'Nicht erreicht', degrees: 1 },
  { label: 'Kalorienziel', detail: 'Erreicht', degrees: -1 },
]
