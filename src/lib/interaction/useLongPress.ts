'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/** How long the press has to be held before it counts as a long press. */
export const LONG_PRESS_MS = 480

/** How far the finger may wander before the press is treated as a scroll. */
const MOVE_TOLERANCE_PX = 12

interface LongPressOptions {
  onLongPress: () => void
  /** Fired on a normal short press, if provided. */
  onPress?: () => void
  disabled?: boolean
}

/**
 * Press-and-hold handler, with a progress value for showing the hold.
 *
 * Uses pointer events rather than the browser's `contextmenu`, because that
 * event is inconsistent on touch and impossible to give visual feedback for.
 * The move tolerance matters on a phone: without it, every scroll that starts
 * on a row would fire a long press.
 */
export function useLongPress({ onLongPress, onPress, disabled = false }: LongPressOptions) {
  const timer = useRef<number | null>(null)
  const origin = useRef<{ x: number; y: number } | null>(null)
  const fired = useRef(false)
  const [holding, setHolding] = useState(false)

  const cancel = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
    origin.current = null
    setHolding(false)
  }, [])

  useEffect(() => cancel, [cancel])

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (disabled || !event.isPrimary) return
      fired.current = false
      origin.current = { x: event.clientX, y: event.clientY }
      setHolding(true)
      timer.current = window.setTimeout(() => {
        fired.current = true
        setHolding(false)
        onLongPress()
      }, LONG_PRESS_MS)
    },
    [disabled, onLongPress],
  )

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!origin.current) return
      const dx = event.clientX - origin.current.x
      const dy = event.clientY - origin.current.y
      if (Math.hypot(dx, dy) > MOVE_TOLERANCE_PX) cancel()
    },
    [cancel],
  )

  const onPointerUp = useCallback(() => {
    const wasLongPress = fired.current
    cancel()
    // A long press has already done its work; firing the tap action too would
    // open the editor and then immediately act on the row behind it.
    if (!wasLongPress && !disabled) onPress?.()
  }, [cancel, disabled, onPress])

  return {
    holding,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: cancel,
      onPointerLeave: cancel,
      onContextMenu: (event: React.MouseEvent) => event.preventDefault(),
    },
  }
}
