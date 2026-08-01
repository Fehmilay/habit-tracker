export interface GameRuntime {
  inputX: number
  inputY: number
  planeX: number
  planeY: number
  travel: number
}

export const gameRuntime: GameRuntime = {
  inputX: 0,
  inputY: 0,
  planeX: 0,
  planeY: 0,
  travel: 0,
}

export function resetGameRuntime(): void {
  gameRuntime.inputX = 0
  gameRuntime.inputY = 0
  gameRuntime.planeX = 0
  gameRuntime.planeY = 0
  gameRuntime.travel = 0
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
