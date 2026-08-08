'use client'

import { useEffect } from 'react'

/**
 * Escape closes the sheet.
 *
 * Every overlay in this app is a plain `<div>` over the flight scene rather
 * than a `<dialog>`, because the scene behind them has to keep rendering and a
 * top-layer dialog would sit above the WebGL canvas' own stacking context.
 * That choice is fine visually and costs nothing to make accessible - a
 * `role="dialog"`, an `aria-modal`, a label and this key handler - but leaving
 * all four out meant a keyboard user could open a sheet and had no way to
 * shut it.
 */
export function useSheetDismiss(onClose: () => void): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])
}
