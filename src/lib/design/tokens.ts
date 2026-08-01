/**
 * Design tokens for Course Flight.
 *
 * Single source of truth for the whole app. The 3D scene consumes the raw hex
 * values directly; the CSS layer mirrors them as custom properties in
 * `globals.css`. Nothing here is derived from the legacy habit tracker.
 */

export const color = {
  /** Deep night blue, the darkest surface in the app. */
  nightDeep: '#050a16',
  night: '#08111f',
  nightSoft: '#0d1a2d',
  /** Anthracite, used for panels and controls. */
  anthracite: '#161d26',
  anthraciteSoft: '#1f2833',

  /**
   * Sky gradient stops, zenith to horizon.
   *
   * Kept deliberately dark: the brief asks for a night-blue, atmospheric,
   * grown-up scene, and a bright daylight haze both washes out the glowing
   * course line and flattens the aircraft into a silhouette.
   */
  skyZenith: '#02050e',
  skyHigh: '#050f20',
  skyMid: '#0a1d33',
  skyHorizon: '#1b3d59',
  skyHaze: '#41708e',

  /** Cold light blue: the planned course line. */
  course: '#7cc9ff',
  courseBright: '#c4e8ff',
  courseDim: '#2f6d99',

  /** Turquoise / green: positive corrections. */
  correction: '#2fe0b0',
  correctionSoft: '#8ff2d8',

  /** Gold / orange: projections and forecasts. */
  projection: '#f2b544',
  projectionSoft: '#ffd489',

  /** Red, used sparingly for strong deviation only. */
  alert: '#e2555f',

  /** Aircraft materials. */
  hullLight: '#c9d2dc',
  hullDark: '#48525e',
  hullBelly: '#8b95a1',
  cockpitGlass: '#0b1520',
  cabinWindow: '#ffdfae',
  engineCowl: '#2b323b',
  engineIntake: '#0a0d11',
  navRed: '#ff3b46',
  navGreen: '#33ff7d',
  navWhite: '#fff6e6',

  /** Cloud tint. */
  cloudLit: '#93aec9',
  cloudShadow: '#2c3d55',

  /** Foreground. */
  textPrimary: '#f2f6fb',
  textSecondary: '#9fb0c4',
  textMuted: '#63748a',
} as const

export const typography = {
  fontSans:
    "'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  fontNumeric:
    "'SF Mono', ui-monospace, 'SFMono-Regular', 'Roboto Mono', 'Courier New', monospace",
  /** Type scale in rem. */
  size: {
    micro: '0.625rem',
    label: '0.6875rem',
    caption: '0.8125rem',
    body: '0.9375rem',
    title: '1.125rem',
    display: '1.75rem',
    hero: '2.75rem',
    colossal: '4rem',
  },
  weight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  tracking: {
    tight: '-0.02em',
    normal: '0em',
    wide: '0.08em',
    wider: '0.16em',
    widest: '0.24em',
  },
} as const

export const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '0.75rem',
  lg: '1rem',
  xl: '1.5rem',
  '2xl': '2rem',
  '3xl': '3rem',
} as const

export const radius = {
  sm: '0.375rem',
  md: '0.625rem',
  lg: '1rem',
  xl: '1.375rem',
  pill: '999px',
} as const

export const shadow = {
  panel: '0 18px 48px -24px rgba(0, 0, 0, 0.85)',
  lift: '0 8px 24px -12px rgba(0, 0, 0, 0.7)',
  glowCourse: '0 0 24px -4px rgba(124, 201, 255, 0.55)',
  glowProjection: '0 0 24px -6px rgba(242, 181, 68, 0.45)',
} as const

export const zIndex = {
  scene: 0,
  sceneOverlay: 10,
  hud: 20,
  sequence: 30,
  sheet: 40,
  devTools: 50,
} as const

/** Motion durations in milliseconds. */
export const duration = {
  instant: 90,
  fast: 180,
  base: 280,
  slow: 480,
  deliberate: 900,
} as const

export const easing = {
  standard: 'cubic-bezier(0.32, 0.72, 0, 1)',
  decelerate: 'cubic-bezier(0.16, 1, 0.3, 1)',
  accelerate: 'cubic-bezier(0.7, 0, 0.84, 0)',
} as const

/**
 * Framer Motion easing arrays mirroring `easing`, since Motion takes numeric
 * bezier control points rather than CSS strings.
 */
export const motionEase = {
  standard: [0.32, 0.72, 0, 1],
  decelerate: [0.16, 1, 0.3, 1],
  accelerate: [0.7, 0, 0.84, 0],
} as const

export const tokens = {
  color,
  typography,
  spacing,
  radius,
  shadow,
  zIndex,
  duration,
  easing,
  motionEase,
} as const

export type Tokens = typeof tokens
