/**
 * The app's entire icon vocabulary, as inline vector paths.
 *
 * Deliberately not emoji: emoji render as full-colour bitmaps that differ per
 * platform, ignore the design system's palette, and read as decoration rather
 * than as part of the product. Every glyph here inherits `currentColor` and
 * sits on the same 24x24 grid with the same stroke weight, so a row of them
 * reads as one typographic system.
 */

export type GlyphName =
  | 'strength'
  | 'nutrition'
  | 'steps'
  | 'water'
  | 'study'
  | 'sleep'
  | 'focus'
  | 'money'
  | 'heart'
  | 'spark'
  | 'check'
  | 'half'
  | 'cross'
  | 'plus'
  | 'chevronLeft'
  | 'chevronRight'
  | 'arrowUpRight'
  | 'play'
  | 'globe'
  | 'warning'
  | 'level'

/** Stroke-based paths, drawn on a 24x24 grid. */
const STROKE_PATHS: Partial<Record<GlyphName, string>> = {
  strength: 'M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10',
  nutrition: 'M12 21c-4 0-7-3-7-7 0-3.5 3-6 7-6s7 2.5 7 6c0 4-3 7-7 7ZM12 8V3M12 3c2.5 0 4 1.5 4 3',
  steps: 'M8 4c1.7 0 2.6 1.2 2.6 3 0 1.6-.5 2.7-.5 4.2 0 1.3.4 2 .4 3.1 0 1.5-1 2.4-2.5 2.4S5.4 15.8 5.4 14.3c0-1.1.4-1.8.4-3.1 0-1.5-.5-2.6-.5-4.2C5.3 5.2 6.3 4 8 4ZM16.2 8.5c1.5 0 2.4 1.1 2.4 2.7 0 1.4-.5 2.4-.5 3.7 0 1.2.4 1.8.4 2.7 0 1.4-.9 2.2-2.3 2.2s-2.3-.8-2.3-2.2c0-.9.4-1.5.4-2.7 0-1.3-.5-2.3-.5-3.7 0-1.6.9-2.7 2.4-2.7Z',
  water: 'M12 3s6 6.6 6 10.5A6 6 0 0 1 6 13.5C6 9.6 12 3 12 3Z',
  study: 'M3 6.5c3-1.5 6-1.5 9 0v13c-3-1.5-6-1.5-9 0v-13ZM21 6.5c-3-1.5-6-1.5-9 0v13c3-1.5 6-1.5 9 0v-13Z',
  sleep: 'M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z',
  focus: 'M12 3v3M12 18v3M3 12h3M18 12h3M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z',
  money: 'M12 3v18M16.5 7c0-1.7-2-2.6-4.5-2.6S7.5 5.4 7.5 7.4c0 4.4 9 2.4 9 7 0 2-2 3-4.5 3S7 16.5 7 15',
  heart: 'M12 20s-7.5-4.6-7.5-9.6A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 7.5 2.8c0 5-7.5 9.6-7.5 9.6Z',
  spark: 'M12 3l2.1 5.6L20 10l-5.9 1.4L12 17l-2.1-5.6L4 10l5.9-1.4L12 3Z',
  check: 'M4.5 12.5 9.5 17.5 19.5 6.5',
  half: 'M5 12h14',
  cross: 'M6 6l12 12M18 6 6 18',
  plus: 'M12 5v14M5 12h14',
  chevronLeft: 'M15 5l-7 7 7 7',
  chevronRight: 'M9 5l7 7-7 7',
  arrowUpRight: 'M7 17 17 7M9 7h8v8',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM3.5 9.5h17M3.5 14.5h17M12 3c2.4 2.4 3.6 5.4 3.6 9S14.4 18.6 12 21c-2.4-2.4-3.6-5.4-3.6-9S9.6 5.4 12 3Z',
  warning: 'M12 4.5 21 19.5H3L12 4.5ZM12 10v4.5M12 17.4v.2',
  level: 'M4 19h4V9H4v10ZM10 19h4V4h-4v15ZM16 19h4v-7h-4v7Z',
}

/** Solid paths, for glyphs that read better filled. */
const FILL_PATHS: Partial<Record<GlyphName, string>> = {
  play: 'M8 5.2a1 1 0 0 1 1.5-.9l9 6.8a1 1 0 0 1 0 1.8l-9 6.8a1 1 0 0 1-1.5-.9V5.2Z',
}

/** Legacy saved habits store an emoji; map the common ones onto real glyphs. */
const EMOJI_TO_GLYPH: Record<string, GlyphName> = {
  '🏋️': 'strength',
  '🏋': 'strength',
  '🥗': 'nutrition',
  '🚶': 'steps',
  '💧': 'water',
  '📚': 'study',
  '🧘': 'sleep',
  '💼': 'money',
  '❤️': 'heart',
  '⭐': 'spark',
  '✦': 'spark',
}

/**
 * Resolve whatever is stored on a habit into a glyph name.
 *
 * Habits saved before the icon system existed hold an emoji string, so this
 * accepts both and never throws - an unknown value falls back to `spark`
 * rather than leaving a hole in the row.
 */
export function resolveGlyph(value: string | undefined): GlyphName {
  if (!value) return 'spark'
  if (value in EMOJI_TO_GLYPH) return EMOJI_TO_GLYPH[value]
  if (isGlyphName(value)) return value
  return 'spark'
}

export function isGlyphName(value: string): value is GlyphName {
  return value in STROKE_PATHS || value in FILL_PATHS
}

/** Glyphs offered in the habit editor's picker. */
export const HABIT_GLYPHS: GlyphName[] = [
  'strength',
  'nutrition',
  'steps',
  'water',
  'study',
  'sleep',
  'focus',
  'money',
  'heart',
  'spark',
]

interface GlyphProps {
  name: GlyphName
  size?: number
  strokeWidth?: number
  className?: string
}

export function Glyph({ name, size = 20, strokeWidth = 1.7, className }: GlyphProps) {
  const fillPath = FILL_PATHS[name]

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {fillPath ? (
        <path d={fillPath} fill="currentColor" />
      ) : (
        <path
          d={STROKE_PATHS[name]}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  )
}
