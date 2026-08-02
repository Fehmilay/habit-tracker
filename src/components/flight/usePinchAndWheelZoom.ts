'use client'

import { useMemo, useRef } from 'react'
import { useFlightStore } from '@/store/flightStore'

/** Mouse wheel / trackpad sensitivity: pixels of deltaY per full 0..1 zoom range. */
const WHEEL_RANGE_PX = 900

/** Pinch sensitivity: pixels of finger-distance change per full 0..1 zoom range. */
const PINCH_RANGE_PX = 260

interface PointerPoint {
  x: number
  y: number
}

/**
 * Wheel and pinch handlers that drive `flightStore.zoomTarget`.
 *
 * Scrolling or pinching down (fingers together) pulls the view back to the
 * globe - the same direction as "zoom out" in a map app. Scrolling or
 * spreading fingers apart brings it back to the normal chase view. Returned
 * as a plain object of DOM event handler props so it can be spread directly
 * onto the R3F `<Canvas>`, which forwards unrecognised props to the
 * underlying canvas element.
 */
export function usePinchAndWheelZoom(enabled: boolean) {
  const pointers = useRef(new Map<number, PointerPoint>())
  const lastPinchDistance = useRef<number | null>(null)

  return useMemo(() => {
    if (!enabled) return {}

    const onWheel = (event: React.WheelEvent<HTMLElement>) => {
      // No preventDefault: React attaches wheel listeners as passive, so
      // calling it would only throw. It is not needed anyway - the app shell
      // is already `overflow: hidden`, so there is no page scroll to suppress.
      useFlightStore.getState().nudgeZoomTarget(event.deltaY / WHEEL_RANGE_PX)
    }

    const onPointerDown = (event: React.PointerEvent<HTMLElement>) => {
      if (event.pointerType !== 'touch') return
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
      if (pointers.current.size !== 2) lastPinchDistance.current = null
    }

    const onPointerMove = (event: React.PointerEvent<HTMLElement>) => {
      if (event.pointerType !== 'touch' || !pointers.current.has(event.pointerId)) return
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
      if (pointers.current.size !== 2) return

      const [a, b] = [...pointers.current.values()]
      const distance = Math.hypot(a.x - b.x, a.y - b.y)

      if (lastPinchDistance.current !== null) {
        // Shrinking distance (pinching in) should zoom OUT to the globe, so the
        // sign is inverted relative to a naive "distance grew -> value grew".
        const delta = lastPinchDistance.current - distance
        useFlightStore.getState().nudgeZoomTarget(delta / PINCH_RANGE_PX)
      }
      lastPinchDistance.current = distance
    }

    const onPointerUp = (event: React.PointerEvent<HTMLElement>) => {
      pointers.current.delete(event.pointerId)
      if (pointers.current.size < 2) lastPinchDistance.current = null
    }

    return {
      onWheel,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      onPointerLeave: onPointerUp,
    }
  }, [enabled])
}
