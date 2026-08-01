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

export function focusHaptic(kind: 'start' | 'success' | 'failure'): void {
  if (!Capacitor.isNativePlatform()) return
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
