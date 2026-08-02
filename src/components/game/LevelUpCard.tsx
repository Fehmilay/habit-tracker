'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { AircraftGlyph } from '@/components/icons/AircraftGlyph'
import { Glyph } from '@/components/icons/Glyph'
import { skinUnlockedAtLevel } from '@/lib/game/progression'
import { selectionHaptic } from '@/lib/native/ios'
import { useJourneyStore } from '@/store/journeyStore'

/** How long the card stays up before dismissing itself. */
const AUTO_DISMISS_MS = 3400

/**
 * Level-up flourish.
 *
 * Self-dismissing rather than requiring a tap: the flight never pauses, so a
 * card that waited for acknowledgement would sit over a live aircraft the
 * player still has to steer. Text is kept to the level number and, when one is
 * earned, the skin name.
 */
export function LevelUpCard() {
  const pendingLevelUp = useJourneyStore((state) => state.pendingLevelUp)
  const clearLevelUp = useJourneyStore((state) => state.clearLevelUp)
  const selectAircraft = useJourneyStore((state) => state.selectAircraft)

  const unlocked = pendingLevelUp ? skinUnlockedAtLevel(pendingLevelUp) : null

  useEffect(() => {
    if (!pendingLevelUp) return
    selectionHaptic()
    // Wearing the new aircraft immediately is the reward; making the player
    // find it in the hangar first would bury it.
    if (unlocked) selectAircraft(unlocked.id)
    const timer = window.setTimeout(clearLevelUp, AUTO_DISMISS_MS)
    return () => window.clearTimeout(timer)
  }, [clearLevelUp, pendingLevelUp, selectAircraft, unlocked])

  return (
    <AnimatePresence>
      {pendingLevelUp ? (
        <motion.div
          className="level-up-card"
          data-testid="level-up-card"
          initial={{ opacity: 0, y: 24, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.98 }}
          transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="level-up-mark" aria-hidden="true">
            <Glyph name="level" size={22} />
          </span>
          <strong className="numeric">{pendingLevelUp}</strong>
          {unlocked ? (
            <span className="level-up-skin" style={{ color: unlocked.accent }}>
              <AircraftGlyph size={18} color={unlocked.accent} rotationDegrees={-45} />
              {unlocked.name}
            </span>
          ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
