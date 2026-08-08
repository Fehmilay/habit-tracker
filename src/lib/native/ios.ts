'use client'

import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { StatusBar, Style } from '@capacitor/status-bar'

export async function configureNativeChrome(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    await StatusBar.setStyle({ style: Style.Dark })
    await StatusBar.show()
  } catch {
    // Browser and older iOS versions simply retain their system chrome.
  }
}

/**
 * Haptics master switch.
 *
 * A module-level flag rather than a store read: `focusHaptic` is called from
 * inside the render loop when a ring is scored, and subscribing that call site
 * to a React store would put a store read on the hot path to save one boolean.
 * `FlightView` mirrors the setting here whenever it changes.
 */
let hapticsEnabled = true

export function setHapticsEnabled(enabled: boolean): void {
  hapticsEnabled = enabled
}

export function focusHaptic(kind: 'start' | 'success' | 'failure'): void {
  if (!hapticsEnabled || !Capacitor.isNativePlatform()) return
  if (kind === 'success') {
    void Haptics.notification({ type: NotificationType.Success })
    return
  }
  if (kind === 'failure') {
    void Haptics.notification({ type: NotificationType.Error })
    return
  }
  void Haptics.impact({ style: ImpactStyle.Medium })
}

export function selectionHaptic(): void {
  if (!hapticsEnabled || !Capacitor.isNativePlatform()) return
  void Haptics.selectionStart().then(() => Haptics.selectionChanged()).then(() => Haptics.selectionEnd())
}
