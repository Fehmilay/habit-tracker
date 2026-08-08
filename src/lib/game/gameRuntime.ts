export interface GameRuntime {
  inputX: number
  inputY: number
  planeX: number
  planeY: number
  travel: number
  /**
   * `performance.now()` of the last steering input.
   *
   * The ring course scores whether or not anyone is holding the stick, so this
   * is what tells the feedback layer the difference between a player missing a
   * ring and a phone sitting on a table with the flight page open. Without it
   * the app fires an iOS *error* haptic every four seconds at nobody.
   */
  lastInputAt: number
}

export const gameRuntime: GameRuntime = {
  inputX: 0,
  inputY: 0,
  planeX: 0,
  planeY: 0,
  travel: 0,
  lastInputAt: 0,
}

/** How long after letting go a ring outcome is still "yours". */
export const ENGAGEMENT_WINDOW_MS = 6_000

export function isEngaged(now = typeof performance === 'undefined' ? 0 : performance.now()): boolean {
  return gameRuntime.lastInputAt > 0 && now - gameRuntime.lastInputAt < ENGAGEMENT_WINDOW_MS
}

export function markInput(): void {
  gameRuntime.lastInputAt = typeof performance === 'undefined' ? 0 : performance.now()
}

export function resetGameRuntime(): void {
  gameRuntime.inputX = 0
  gameRuntime.inputY = 0
  gameRuntime.planeX = 0
  gameRuntime.planeY = 0
  gameRuntime.travel = 0
  gameRuntime.lastInputAt = 0
}

export function thumbInputFromDrag(deltaX: number, deltaY: number, radius = 72) {
  const safeRadius = Math.max(1, radius)
  const distance = Math.hypot(deltaX, deltaY)
  const scale = distance > safeRadius ? safeRadius / distance : 1
  const displayX = deltaX * scale
  const displayY = deltaY * scale
  return {
    displayX,
    displayY,
    inputX: displayX / safeRadius,
    inputY: -displayY / safeRadius,
  }
}
