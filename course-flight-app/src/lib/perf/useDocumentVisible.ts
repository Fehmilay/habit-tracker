'use client'

import { useSyncExternalStore } from 'react'

function subscribe(onChange: () => void): () => void {
  if (typeof document === 'undefined') return () => {}
  document.addEventListener('visibilitychange', onChange)
  return () => document.removeEventListener('visibilitychange', onChange)
}

function getSnapshot(): boolean {
  return document.visibilityState === 'visible'
}

function getServerSnapshot(): boolean {
  return true
}

/**
 * Whether the document is currently visible. Drives `frameloop`, so a
 * backgrounded tab stops rendering entirely instead of burning battery.
 */
export function useDocumentVisible(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
