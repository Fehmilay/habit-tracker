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
