'use client'

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { gameRuntime, thumbInputFromDrag } from '@/lib/game/gameRuntime'
import { useJourneyStore } from '@/store/journeyStore'

export function GameOverlay() {
  const gameMode = useJourneyStore((state) => state.gameMode)
  const ringIndex = useJourneyStore((state) => state.gameRingIndex)
  const ringIds = useJourneyStore((state) => state.gameRingIds)
  const score = useJourneyStore((state) => state.gameScore)
  const hits = useJourneyStore((state) => state.gameHits)
  const combo = useJourneyStore((state) => state.gameCombo)
  const bestCombo = useJourneyStore((state) => state.gameBestCombo)
  const progress = useJourneyStore((state) => state.progress)
  const habits = useJourneyStore((state) => state.habits)
  const beginGame = useJourneyStore((state) => state.beginGame)
  const startGame = useJourneyStore((state) => state.startGame)
  const exitGame = useJourneyStore((state) => state.exitGame)
  const [countdown, setCountdown] = useState(3)
  const dragStart = useRef<{ x: number; y: number } | null>(null)
  const stickRef = useRef<HTMLElement>(null)
  const activeHabit = habits.find((habit) => habit.id === ringIds[ringIndex])

  useEffect(() => {
    if (gameMode !== 'countdown') return
    const timers = [
      window.setTimeout(() => setCountdown(3), 0),
      window.setTimeout(() => setCountdown(2), 700),
      window.setTimeout(() => setCountdown(1), 1400),
      window.setTimeout(beginGame, 2100),
    ]
    return () => timers.forEach(window.clearTimeout)
  }, [beginGame, gameMode])

  useEffect(() => {
    if (gameMode !== 'playing') return
    const pressed = new Set<string>()
    const updateKeyboardInput = () => {
      gameRuntime.inputX = Number(pressed.has('arrowright') || pressed.has('d')) - Number(pressed.has('arrowleft') || pressed.has('a'))
      gameRuntime.inputY = Number(pressed.has('arrowup') || pressed.has('w')) - Number(pressed.has('arrowdown') || pressed.has('s'))
    }
    const keyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (!['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'w', 'a', 's', 'd'].includes(key)) return
      event.preventDefault()
      pressed.add(key)
      updateKeyboardInput()
    }
    const keyUp = (event: KeyboardEvent) => {
      pressed.delete(event.key.toLowerCase())
      updateKeyboardInput()
    }
    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)
    return () => {
      window.removeEventListener('keydown', keyDown)
      window.removeEventListener('keyup', keyUp)
      gameRuntime.inputX = 0
      gameRuntime.inputY = 0
    }
  }, [gameMode])

  const setStick = (x: number, y: number, active: boolean) => {
    if (!stickRef.current) return
    stickRef.current.style.setProperty('--stick-x', `${x}px`)
    stickRef.current.style.setProperty('--stick-y', `${y}px`)
    stickRef.current.dataset.active = String(active)
  }

  const beginThumbControl = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    const box = event.currentTarget.getBoundingClientRect()
    dragStart.current = { x: event.clientX, y: event.clientY }
    if (stickRef.current) {
      stickRef.current.style.left = `${event.clientX - box.left}px`
      stickRef.current.style.top = `${event.clientY - box.top}px`
    }
    gameRuntime.inputX = 0
    gameRuntime.inputY = 0
    setStick(0, 0, true)
  }

  const moveThumbControl = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragStart.current || !event.currentTarget.hasPointerCapture(event.pointerId)) return
    const input = thumbInputFromDrag(event.clientX - dragStart.current.x, event.clientY - dragStart.current.y)
    gameRuntime.inputX = input.inputX
    gameRuntime.inputY = input.inputY
    setStick(input.displayX, input.displayY, true)
  }

  const endThumbControl = (event?: ReactPointerEvent<HTMLDivElement>) => {
    if (event?.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    dragStart.current = null
    gameRuntime.inputX = 0
    gameRuntime.inputY = 0
    setStick(0, 0, false)
  }

  if (gameMode === 'idle') return null

  if (gameMode === 'summary') {
    return (
      <div className="game-summary" data-testid="game-summary">
        <p className="label-caps">Habit Flight · Level {progress.level}</p>
        <strong className="numeric">{score}</strong>
        <span>{hits}/{ringIds.length} Habits getroffen · +{hits * 100} XP</span>
        <div className="game-reward-grid"><span>⚡ Fokus +{hits * 100}</span><span>🔥 Beste Combo {bestCombo}</span><span>✈ Level {progress.level}</span></div>
        <div><button className="primary-button" type="button" onClick={() => startGame(ringIds)}>Nochmal fliegen</button><button className="text-button" type="button" onClick={exitGame}>Zurück zum Kurs</button></div>
      </div>
    )
  }

  return (
    <div className="game-layer" data-testid="game-layer" onPointerDown={(event) => event.stopPropagation()}>
      <div className="game-topline">
        <button type="button" onClick={exitGame}>×</button>
        <div><p className="label-caps-micro">Habit Flight · Level {progress.level}</p><strong className="numeric">{Math.min(ringIndex + 1, ringIds.length)}/{ringIds.length}</strong></div>
        <span className="game-live-score"><strong className="numeric">{score}</strong>{combo > 1 ? <em>×{combo}</em> : null}</span>
      </div>
      {activeHabit ? <div className="game-habit-prompt"><span>NÄCHSTER HABIT-RING</span><strong>{activeHabit.icon} {activeHabit.name}</strong><small>{activeHabit.cue}</small></div> : null}
      {gameMode === 'countdown' ? <div className="game-countdown"><span className="numeric">{countdown}</span><p>Mit dem Daumen lenken</p><small>Ziehe im unteren Bildschirmbereich</small></div> : null}
      {gameMode === 'playing' ? (
        <div
          className="thumb-zone"
          data-testid="thumb-zone"
          aria-label="Steuerfläche: Ziehen, um das Flugzeug zu lenken"
          onPointerDown={beginThumbControl}
          onPointerMove={moveThumbControl}
          onPointerUp={endThumbControl}
          onPointerCancel={endThumbControl}
          onLostPointerCapture={() => endThumbControl()}
        >
          <span className="thumb-instruction">ZIEHEN ZUM LENKEN</span>
          <i ref={stickRef} className="thumb-stick" data-active="false" aria-hidden="true" />
        </div>
      ) : null}
    </div>
  )
}
