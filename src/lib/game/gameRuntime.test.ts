import { describe, expect, it } from 'vitest'
import { thumbInputFromDrag } from './gameRuntime'

describe('thumbInputFromDrag', () => {
  it('maps an upward thumb movement to a positive climb input', () => {
    expect(thumbInputFromDrag(0, -36)).toEqual({
      displayX: 0,
      displayY: -36,
      inputX: 0,
      inputY: 0.5,
    })
  })

  it('clamps long drags to the virtual joystick radius', () => {
    const input = thumbInputFromDrag(144, 0)
    expect(input.displayX).toBe(72)
    expect(input.inputX).toBe(1)
    expect(Math.hypot(input.inputX, input.inputY)).toBeLessThanOrEqual(1)
  })
})
