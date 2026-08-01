'use client'

import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'

export const FOCUS_LANDING_NOTIFICATION_ID = 9420
export const FOCUS_RETURN_NOTIFICATION_ID = 9421

export async function refreshWebServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || Capacitor.isNativePlatform() || !('serviceWorker' in navigator)) return null
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
    await registration.update()
    return registration
  } catch {
    return null
  }
}

/**
 * Local notifications are deliberately best-effort: iOS only allows them for
 * installed web apps after an explicit user gesture. The focus timer itself
 * never relies on a notification and is verified on return to the app.
 */
export async function prepareFocusNotifications(): Promise<boolean> {
  if (typeof window === 'undefined') return false

  if (Capacitor.isNativePlatform()) {
    try {
      const current = await LocalNotifications.checkPermissions()
      if (current.display === 'granted') return true
      return (await LocalNotifications.requestPermissions()).display === 'granted'
    } catch {
      return false
    }
  }

  if (!('Notification' in window)) return false

  if ('serviceWorker' in navigator) {
    try {
      await refreshWebServiceWorker()
      await navigator.serviceWorker.ready
    } catch {
      // The flight still works without a service worker.
    }
  }

  if (Notification.permission === 'granted') return true
  if (Notification.permission !== 'default') return false

  try {
    return (await Notification.requestPermission()) === 'granted'
  } catch {
    return false
  }
}

export async function showFocusNotification(title: string, body: string): Promise<void> {
  if (typeof window === 'undefined') return

  if (Capacitor.isNativePlatform()) {
    try {
      const permission = await LocalNotifications.checkPermissions()
      if (permission.display !== 'granted') return
      await LocalNotifications.schedule({
        notifications: [{ id: FOCUS_RETURN_NOTIFICATION_ID, title, body, schedule: { at: new Date(Date.now() + 100) } }],
      })
    } catch {
      // The flight's absence rule is always verified by the persisted session.
    }
    return
  }

  if (!('Notification' in window)) return

  if (Notification.permission !== 'granted') return

  try {
    const registration = await navigator.serviceWorker?.ready
    if (registration) {
      await registration.showNotification(title, {
        body,
        icon: '/icons/icon.svg',
        badge: '/icons/icon-maskable.svg',
        tag: 'flight-habit-focus',
      })
      return
    }
  } catch {
    // Fall through for browsers without service worker notifications.
  }

  try {
    new Notification(title, { body, icon: '/icons/icon.svg', tag: 'flight-habit-focus' })
  } catch {
    // Notification APIs vary across browsers; no-op is intentional.
  }
}

export async function scheduleFocusNotification(
  id: number,
  title: string,
  body: string,
  at: number,
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    const permission = await LocalNotifications.checkPermissions()
    if (permission.display !== 'granted' || at <= Date.now()) return
    await LocalNotifications.schedule({
      notifications: [{ id, title, body, schedule: { at: new Date(at) } }],
    })
  } catch {
    // A notification is supplementary; focus-flight validation stays local.
  }
}

export async function cancelFocusNotifications(ids: number[]): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    await LocalNotifications.cancel({ notifications: ids.map((id) => ({ id })) })
  } catch {
    // Nothing to cancel is a safe no-op.
  }
}
