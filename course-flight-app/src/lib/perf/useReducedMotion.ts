'use client'

import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const query = window.matchMedia(QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches
}

function getServerSnapshot(): boolean {
  return false
}

/**
 * Tracks `prefers-reduced-motion`. The scene keeps its course changes - they
 * carry the meaning - but drops idle drift, turbulence and parallax.
 *
 * Uses `useSyncExternalStore` rather than an effect that calls `setState`: the
 * media query is external state, and reading it this way avoids the extra
 * render pass a mount effect would cause.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
