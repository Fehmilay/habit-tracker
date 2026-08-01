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

/**
 * Course loss is always presented as a negative value. Left/right remains
 * visible in the 3D scene; the HUD answers the more important question:
 * whether the current heading helps or hurts the goal.
 */
export function formatCourseDeviation(degrees: number): string {
  const rounded = Math.round(Math.abs(degrees) * 10) / 10
  if (rounded < 0.05) return '0°'
  const nearestWhole = Math.round(rounded)
  const value = Math.abs(rounded - nearestWhole) < 0.05
    ? String(nearestWhole)
    : rounded.toFixed(1).replace('.', ',')
  return `−${value}°`
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
      return 'Perfekt auf Kurs'
    case 'slight':
      return 'Kursverlust · zurück zu 0°'
    case 'notable':
      return 'Deutlich neben dem Zielkurs'
    case 'severe':
      return 'Ziel stark gefährdet'
  }
}

/** Every non-zero course loss is intentionally red; zero is the reward state. */
export function deviationColor(degrees: number): string {
  return deviationSeverity(degrees) === 'on-course' ? color.correction : color.alert
}

/** German thousands separator, e.g. 5840 -> "5.840". */
export function formatKilometres(km: number): string {
  return Math.round(km).toLocaleString('de-DE')
}
