'use client'

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { gameRuntime, markInput, thumbInputFromDrag } from '@/lib/game/gameRuntime'
import { useJourneyStore } from '@/store/journeyStore'

const STEER_KEYS = ['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'w', 'a', 's', 'd']

/**
 * Always-on steering surface for the endless habit flight.
 *
 * There is no round to start any more, so there is no countdown, no summary
 * and no start button - the aircraft is always flying and always steerable.
 * The control is a relative thumb stick rather than a fixed on-screen pad: it
 * anchors wherever the thumb lands, which is the only variant that works
 * one-handed across phone sizes.
 *
 * Carries no instructional text by design. The stick appears under the thumb
 * on contact, which teaches the control in one gesture; a caption would sit
 * on screen forever to explain something that explains itself once.
 *
 * Sits below the HUD in z-order and stops its own events from bubbling. The
 * layering lets HUD buttons win a tap that lands on one of them, while the
 * stopped propagation keeps a steering drag from also registering as the
 * page-swipe gesture that lives on <main>. Pinch-to-globe therefore works in
 * the upper part of the screen rather than inside the steering area.
 */
export function SteeringLayer({ active }: { active: boolean }) {
  const combo = useJourneyStore((state) => state.gameCombo)
  const dragStart = useRef<{ x: number; y: number } | null>(null)
  const stickRef = useRef<HTMLElement>(null)
  const [engaged, setEngaged] = useState(false)

  useEffect(() => {
    if (!active) {
      gameRuntime.inputX = 0
      gameRuntime.inputY = 0
      return
    }

    const pressed = new Set<string>()
    const apply = () => {
      gameRuntime.inputX =
        Number(pressed.has('arrowright') || pressed.has('d')) -
        Number(pressed.has('arrowleft') || pressed.has('a'))
      gameRuntime.inputY =
        Number(pressed.has('arrowup') || pressed.has('w')) -
        Number(pressed.has('arrowdown') || pressed.has('s'))
    }
    const keyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (!STEER_KEYS.includes(key)) return
      event.preventDefault()
      pressed.add(key)
      markInput()
      apply()
    }
    const keyUp = (event: KeyboardEvent) => {
      pressed.delete(event.key.toLowerCase())
      apply()
    }

    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)
    return () => {
      window.removeEventListener('keydown', keyDown)
      window.removeEventListener('keyup', keyUp)
      gameRuntime.inputX = 0
      gameRuntime.inputY = 0
    }
  }, [active])

  const setStick = (x: number, y: number) => {
    if (!stickRef.current) return
    stickRef.current.style.setProperty('--stick-x', `${x}px`)
    stickRef.current.style.setProperty('--stick-y', `${y}px`)
  }

  const begin = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!active) return
    // Steering and the page swipe are the same gesture - a horizontal drag -
    // so the swipe handler on <main> must not also see it, or steering right
    // would flip the app to the Stats page.
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    const box = event.currentTarget.getBoundingClientRect()
    dragStart.current = { x: event.clientX, y: event.clientY }
    if (stickRef.current) {
      stickRef.current.style.left = `${event.clientX - box.left}px`
      stickRef.current.style.top = `${event.clientY - box.top}px`
    }
    gameRuntime.inputX = 0
    gameRuntime.inputY = 0
    markInput()
    setStick(0, 0)
    setEngaged(true)
  }

  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.stopPropagation()
    if (!dragStart.current || !event.currentTarget.hasPointerCapture(event.pointerId)) return
    const input = thumbInputFromDrag(
      event.clientX - dragStart.current.x,
      event.clientY - dragStart.current.y,
    )
    gameRuntime.inputX = input.inputX
    gameRuntime.inputY = input.inputY
    markInput()
    setStick(input.displayX, input.displayY)
  }

  const end = (event?: ReactPointerEvent<HTMLDivElement>) => {
    event?.stopPropagation()
    if (event?.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    dragStart.current = null
    gameRuntime.inputX = 0
    gameRuntime.inputY = 0
    setStick(0, 0)
    setEngaged(false)
  }

  if (!active) return null

  return (
    <>
      {combo > 1 ? (
        <div className="combo-badge numeric" data-testid="combo-badge" aria-hidden="true">
          ×{combo}
        </div>
      ) : null}
      <div
        className="thumb-zone"
        data-testid="thumb-zone"
        data-active={engaged}
        aria-label="Steuerfläche"
        onPointerDown={begin}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={() => end()}
      >
        <i ref={stickRef} className="thumb-stick" data-active={engaged} aria-hidden="true" />
      </div>
    </>
  )
}
