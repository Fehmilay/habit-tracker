'use client'

import { useEffect, useState } from 'react'
import { gameRuntime } from '@/lib/game/gameRuntime'
import { useJourneyStore } from '@/store/journeyStore'

export function GameOverlay() {
  const gameMode = useJourneyStore((state) => state.gameMode)
  const ringIndex = useJourneyStore((state) => state.gameRingIndex)
  const ringIds = useJourneyStore((state) => state.gameRingIds)
  const score = useJourneyStore((state) => state.gameScore)
  const hits = useJourneyStore((state) => state.gameHits)
  const beginGame = useJourneyStore((state) => state.beginGame)
  const startGame = useJourneyStore((state) => state.startGame)
  const exitGame = useJourneyStore((state) => state.exitGame)
  const [countdown, setCountdown] = useState(3)

  useEffect(() => {
    if (gameMode !== 'countdown') return
    const reset = window.setTimeout(() => setCountdown(3), 0)
    const first = window.setTimeout(() => setCountdown(2), 700)
    const second = window.setTimeout(() => setCountdown(1), 1400)
    const start = window.setTimeout(beginGame, 2100)
    return () => {
      window.clearTimeout(first)
      window.clearTimeout(second)
      window.clearTimeout(start)
      window.clearTimeout(reset)
    }
  }, [beginGame, gameMode])

  if (gameMode === 'idle') return null

  if (gameMode === 'summary') {
    return (
      <div className="game-summary" data-testid="game-summary">
        <p className="label-caps">Habit Flight abgeschlossen</p>
        <strong className="numeric">{hits}/{ringIds.length}</strong>
        <span>Ringe verinnerlicht · {score} Punkte</span>
        <div><button className="primary-button" type="button" onClick={() => startGame(ringIds)}>Nochmal fliegen</button><button className="text-button" type="button" onClick={exitGame}>Zurück zum Kurs</button></div>
      </div>
    )
  }

  return (
    <div className="game-layer" data-testid="game-layer" onPointerDown={(event) => event.stopPropagation()}>
      <div className="game-topline">
        <button type="button" onClick={exitGame}>×</button>
        <div><p className="label-caps-micro">Habit Flight</p><strong className="numeric">{Math.min(ringIndex + 1, ringIds.length)}/{ringIds.length}</strong></div>
        <span className="numeric">{score}</span>
      </div>
      {gameMode === 'countdown' ? (
        <div className="game-countdown"><span className="numeric">{countdown}</span><p>Daumen bewegen · Ringe treffen</p></div>
      ) : null}
      <div
        className="thumb-zone"
        data-testid="thumb-zone"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerMove={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
          const box = event.currentTarget.getBoundingClientRect()
          gameRuntime.inputX = Math.max(-1, Math.min(1, ((event.clientX - box.left) / box.width - 0.5) * 2))
          gameRuntime.inputY = Math.max(-1, Math.min(1, -(((event.clientY - box.top) / box.height - 0.5) * 2)))
        }}
        onPointerUp={(event) => {
          event.currentTarget.releasePointerCapture(event.pointerId)
          gameRuntime.inputX = 0
          gameRuntime.inputY = 0
        }}
        onPointerCancel={() => {
          gameRuntime.inputX = 0
          gameRuntime.inputY = 0
        }}
      >
        <span>STEER</span>
      </div>
    </div>
  )
}
