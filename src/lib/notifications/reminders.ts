'use client'

import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import type { AppSettings } from '@/lib/journey/types'
import { prepareFocusNotifications, showFocusNotification } from './focusNotifications'

/**
 * The daily nudge.
 *
 * A habit tracker that never speaks first is a habit tracker you forget on day
 * four. Two notifications, both local, both cancellable, and neither of them
 * fired at someone who has already closed their day out:
 *
 *   - the reminder, at the hour the user picked, every day
 *   - the last call, later the same evening, only while the day is still open
 *
 * Native gets real scheduled notifications through Capacitor. The browser
 * cannot schedule anything in the background without a push server, so the web
 * build arms an in-page timer instead and is honest about the difference in the
 * settings sheet rather than pretending the two are equivalent.
 */

export const DAILY_REMINDER_ID = 9430
export const LAST_CALL_ID = 9431

export async function requestNotificationPermission(): Promise<boolean> {
  return prepareFocusNotifications()
}

export function isNativeNotificationHost(): boolean {
  return Capacitor.isNativePlatform()
}

interface ReminderContext {
  settings: AppSettings
  /** True once today's check-in is filed - suppresses the last call. */
  dayClosed: boolean
  openHabits: number
}

function reminderCopy(context: ReminderContext): { title: string; body: string } {
  const { openHabits } = context
  return {
    title: 'Dein Flug wartet',
    body:
      openHabits > 0
        ? `${openHabits} ${openHabits === 1 ? 'Habit' : 'Habits'} offen. Bestätige den Tag, bevor der Kurs abdriftet.`
        : 'Alles bewertet - bestätige den Tag und sichere deine Kette.',
  }
}

/**
 * Reconcile the scheduled notifications with the current settings.
 *
 * Always cancels first. Rescheduling on top of an existing notification with
 * the same id is well defined on iOS but not on every Android build, and a
 * duplicated daily reminder is the fastest way to get an app muted.
 */
export async function syncDailyReminders(context: ReminderContext): Promise<void> {
  if (typeof window === 'undefined' || !Capacitor.isNativePlatform()) return

  try {
    await LocalNotifications.cancel({
      notifications: [{ id: DAILY_REMINDER_ID }, { id: LAST_CALL_ID }],
    })

    const permission = await LocalNotifications.checkPermissions()
    if (permission.display !== 'granted') return
    if (!context.settings.reminderEnabled) return

    const copy = reminderCopy(context)
    const notifications = [
      {
        id: DAILY_REMINDER_ID,
        title: copy.title,
        body: copy.body,
        schedule: {
          on: {
            hour: context.settings.reminderHour,
            minute: context.settings.reminderMinute,
          },
          allowWhileIdle: true,
        },
      },
    ]

    if (context.settings.lastCallEnabled && !context.dayClosed) {
      notifications.push({
        id: LAST_CALL_ID,
        title: 'Letzter Aufruf',
        body: 'Der Tag schließt gleich. Ein Tap hält die Kette.',
        schedule: {
          on: { hour: context.settings.lastCallHour, minute: 0 },
          allowWhileIdle: true,
        },
      })
    }

    await LocalNotifications.schedule({ notifications })
  } catch {
    // A reminder is a courtesy. The check-in itself never depends on it.
  }
}

/**
 * Web fallback: fire the reminder while the tab is alive.
 *
 * Returns a cleanup function. Deliberately does nothing on native, where the
 * scheduled notification above already covers it.
 */
export function armWebReminder(context: ReminderContext): () => void {
  if (typeof window === 'undefined' || Capacitor.isNativePlatform()) return () => {}
  if (!context.settings.reminderEnabled || context.dayClosed) return () => {}

  const now = new Date()
  const target = new Date(now)
  target.setHours(context.settings.reminderHour, context.settings.reminderMinute, 0, 0)
  if (target.getTime() <= now.getTime()) return () => {}

  const copy = reminderCopy(context)
  const timer = window.setTimeout(
    () => {
      void showFocusNotification(copy.title, copy.body)
    },
    // A setTimeout beyond ~24.8 days overflows to firing immediately; the cap
    // keeps a mis-set clock from producing an instant notification.
    Math.min(target.getTime() - now.getTime(), 2_147_483_000),
  )

  return () => window.clearTimeout(timer)
}

export async function cancelDailyReminders(): Promise<void> {
  if (typeof window === 'undefined' || !Capacitor.isNativePlatform()) return
  try {
    await LocalNotifications.cancel({
      notifications: [{ id: DAILY_REMINDER_ID }, { id: LAST_CALL_ID }],
    })
  } catch {
    // Nothing to cancel is a safe no-op.
  }
}
