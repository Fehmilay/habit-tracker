'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { Glyph } from '@/components/icons/Glyph'
import { achievementById } from '@/lib/game/achievements'
import { focusHaptic } from '@/lib/native/ios'
import { useFlightStore } from '@/store/flightStore'
import { useJourneyStore } from '@/store/journeyStore'

/**
 * Milestone card.
 *
 * Drains the pending queue one at a time and auto-dismisses. Kept separate
 * from `LevelUpCard` even though they look related: a level says you flew a
 * lot, a milestone says you kept a promise, and stacking both into one card
 * would make the cheap one dilute the expensive one.
 */
const VISIBLE_MS = 4_200

export function AchievementToast() {
  const pending = useJourneyStore((state) => state.pendingAchievements)
  const dismiss = useJourneyStore((state) => state.dismissAchievement)
  // The check-in sequence owns the screen while it plays, and this card sits
  // over its skip button. Milestones earned by that check-in wait for it.
  const sequenceRunning = useFlightStore((state) => state.sequenceRunning)
  const id = sequenceRunning ? undefined : pending[0]
  const achievement = id ? achievementById(id) : undefined

  useEffect(() => {
    if (!id) return
    focusHaptic('success')
    const timer = window.setTimeout(() => dismiss(id), VISIBLE_MS)
    return () => window.clearTimeout(timer)
  }, [dismiss, id])

  return (
    <AnimatePresence>
      {achievement ? (
        <motion.button
          key={achievement.id}
          type="button"
          className="achievement-toast"
          data-tier={achievement.tier}
          data-testid="achievement-toast"
          // `x: '-50%'` rather than a CSS transform: Motion writes `transform`
          // inline every frame, so a `translateX(-50%)` in the stylesheet is
          // overwritten the moment the card animates and it lands off-screen.
          initial={{ y: -70, x: '-50%', opacity: 0 }}
          animate={{ y: 0, x: '-50%', opacity: 1 }}
          exit={{ y: -70, x: '-50%', opacity: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 280 }}
          onClick={() => dismiss(achievement.id)}
          aria-live="polite"
        >
          <span className="achievement-mark">
            <Glyph name={achievement.icon} size={20} />
          </span>
          <span>
            <small>Meilenstein</small>
            <strong>{achievement.name}</strong>
            <em>{achievement.description}</em>
          </span>
          <Glyph name="trophy" size={16} />
        </motion.button>
      ) : null}
    </AnimatePresence>
  )
}
