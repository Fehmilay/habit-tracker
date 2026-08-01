import { color } from '@/lib/design/tokens'

/**
 * Format a deviation for display, German-style.
 *
 * Whole degrees are shown without decimals so a settled course reads as a clean
 * "+2°", but mid-manoeuvre the readout falls back to one decimal so it visibly
 * counts up rather than jumping between integers.
 */
export function formatDeviation(degrees: number): string {
  const rounded = Math.round(degrees * 10) / 10
  const magnitude = Math.abs(rounded)
  const sign = rounded > 0.05 ? '+' : rounded < -0.05 ? '−' : ''

  const nearestWhole = Math.round(magnitude)
  const isWhole = Math.abs(magnitude - nearestWhole) < 0.05

  const value = isWhole
    ? String(nearestWhole)
    : magnitude.toFixed(1).replace('.', ',')

  return `${sign}${value}°`
}

export type DeviationSeverity = 'on-course' | 'slight' | 'notable' | 'severe'

export function deviationSeverity(degrees: number): DeviationSeverity {
  const magnitude = Math.abs(degrees)
  if (magnitude < 0.15) return 'on-course'
  if (magnitude < 2) return 'slight'
  if (magnitude < 4.5) return 'notable'
  return 'severe'
}

export function deviationStatusLabel(degrees: number): string {
  switch (deviationSeverity(degrees)) {
    case 'on-course':
      return 'Auf Kurs'
    case 'slight':
      return 'Leichte Kursabweichung'
    case 'notable':
      return 'Deutliche Kursabweichung'
    case 'severe':
      return 'Starke Kursabweichung'
  }
}

/** Red is reserved for genuinely severe deviation, per the design brief. */
export function deviationColor(degrees: number): string {
  switch (deviationSeverity(degrees)) {
    case 'on-course':
      return color.correction
    case 'slight':
      return color.course
    case 'notable':
      return color.projection
    case 'severe':
      return color.alert
  }
}

/** German thousands separator, e.g. 5840 -> "5.840". */
export function formatKilometres(km: number): string {
  return Math.round(km).toLocaleString('de-DE')
}
