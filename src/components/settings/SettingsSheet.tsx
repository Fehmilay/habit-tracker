'use client'

import { motion } from 'framer-motion'
import { useRef, useState } from 'react'
import { Glyph } from '@/components/icons/Glyph'
import { isNativeNotificationHost, requestNotificationPermission } from '@/lib/notifications/reminders'
import { useSheetDismiss } from '@/lib/interaction/useSheetDismiss'
import { localDateKey } from '@/lib/journey/date'
import { useJourneyStore } from '@/store/journeyStore'

/**
 * Settings, and the data escape hatch.
 *
 * The app keeps everything in local storage and asks for no account, which is
 * the right trade for a private habit log - but it also means a cleared browser
 * or a lost phone takes the whole history with it. Export and import are not a
 * power-user extra here; they are the only backup that exists.
 */
export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const settings = useJourneyStore((state) => state.settings)
  const updateSettings = useJourneyStore((state) => state.updateSettings)
  const exportSnapshot = useJourneyStore((state) => state.exportSnapshot)
  const importSnapshot = useJourneyStore((state) => state.importSnapshot)
  const resetEverything = useJourneyStore((state) => state.resetEverything)
  const records = useJourneyStore((state) => state.records)
  const fileRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [confirmingReset, setConfirmingReset] = useState(false)
  useSheetDismiss(onClose)

  const download = () => {
    const snapshot = exportSnapshot()
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `flight-habit-${localDateKey()}.json`
    link.click()
    // Revoked on the next tick rather than immediately: Safari cancels an
    // in-flight download if the object URL disappears in the same frame.
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
    setStatus(`${records.length} Tage exportiert.`)
  }

  const upload = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text())
      setStatus(
        importSnapshot(parsed)
          ? 'Profil wiederhergestellt.'
          : 'Diese Datei gehört nicht zu Flight Habit.',
      )
    } catch {
      setStatus('Datei konnte nicht gelesen werden.')
    }
  }

  return (
    <div
      className="sheet-backdrop"
      role="presentation"
      onPointerDown={(event) => {
        event.stopPropagation()
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <motion.div
        className="editor-sheet settings-sheet"
        data-testid="settings-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Einstellungen"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 26, stiffness: 260 }}
      >
        <div className="sheet-handle" />
        <div className="sheet-title-row">
          <div>
            <p className="label-caps-micro">Flight Habit</p>
            <h2>Einstellungen</h2>
          </div>
          <button type="button" className="round-icon-button" onClick={onClose} aria-label="Schließen">
            <Glyph name="cross" size={16} />
          </button>
        </div>

        <section className="settings-group">
          <p className="label-caps-micro">Erinnerungen</p>
          <ToggleRow
            icon="bell"
            title="Tägliche Erinnerung"
            caption={
              settings.reminderEnabled
                ? `Jeden Tag um ${String(settings.reminderHour).padStart(2, '0')}:${String(settings.reminderMinute).padStart(2, '0')}`
                : 'Aus'
            }
            active={settings.reminderEnabled}
            onToggle={async () => {
              const next = !settings.reminderEnabled
              if (next) await requestNotificationPermission()
              updateSettings({ reminderEnabled: next })
            }}
          />
          {settings.reminderEnabled ? (
            <>
              <div className="choice-group">
                <span>Uhrzeit</span>
                <div>
                  {[17, 18, 19, 20, 21, 22].map((hour) => (
                    <button
                      key={hour}
                      type="button"
                      className={settings.reminderHour === hour ? 'active' : ''}
                      onClick={() => updateSettings({ reminderHour: hour })}
                    >
                      {String(hour).padStart(2, '0')}:00
                    </button>
                  ))}
                </div>
              </div>
              <ToggleRow
                icon="clock"
                title="Letzter Aufruf"
                caption={`Nur wenn der Tag um ${String(settings.lastCallHour).padStart(2, '0')}:00 noch offen ist`}
                active={settings.lastCallEnabled}
                onToggle={() => updateSettings({ lastCallEnabled: !settings.lastCallEnabled })}
              />
            </>
          ) : null}
          {!isNativeNotificationHost() ? (
            <p className="settings-note">
              Im Browser können Erinnerungen nur ausgelöst werden, solange die App geöffnet
              ist. Installiere Flight Habit auf dem Homescreen für zuverlässige Hinweise.
            </p>
          ) : null}
        </section>

        <section className="settings-group">
          <p className="label-caps-micro">Flug</p>
          <ToggleRow
            icon="warning"
            title="Schadensbild"
            caption="Rauch, Funken und Feuer bei Kursabweichung"
            active={settings.showDamage}
            onToggle={() => updateSettings({ showDamage: !settings.showDamage })}
          />
          <ToggleRow
            icon="flame"
            title="Kettenschutz automatisch einsetzen"
            caption="Verbraucht 30% Reserve, um einen verpassten Tag zu überbrücken"
            active={settings.autoFreeze}
            onToggle={() => updateSettings({ autoFreeze: !settings.autoFreeze })}
          />
          <ToggleRow
            icon="spark"
            title="Haptik"
            caption="Vibration bei Ringen, Landungen und Bewertungen"
            active={settings.hapticsEnabled}
            onToggle={() => updateSettings({ hapticsEnabled: !settings.hapticsEnabled })}
          />
        </section>

        <section className="settings-group">
          <p className="label-caps-micro">Daten</p>
          <p className="settings-note">
            Alles liegt nur auf diesem Gerät. Kein Konto, keine Cloud - und damit auch kein
            Backup außer diesem hier.
          </p>
          <div className="settings-actions">
            <button type="button" className="secondary-button" onClick={download}>
              <Glyph name="download" size={15} />
              Exportieren
            </button>
            <button type="button" className="secondary-button" onClick={() => fileRef.current?.click()}>
              <Glyph name="upload" size={15} />
              Importieren
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void upload(file)
              event.target.value = ''
            }}
          />
          {status ? <p className="settings-status">{status}</p> : null}
        </section>

        {confirmingReset ? (
          <div className="settings-danger">
            <p>
              Alle {records.length} Tage, deine Kette und dein Hangar werden gelöscht. Das
              lässt sich nicht rückgängig machen.
            </p>
            <div className="settings-actions">
              <button type="button" className="secondary-button" onClick={() => setConfirmingReset(false)}>
                Abbrechen
              </button>
              <button
                type="button"
                className="danger-button"
                onClick={() => {
                  resetEverything()
                  onClose()
                }}
              >
                Endgültig löschen
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="danger-button" onClick={() => setConfirmingReset(true)}>
            Alles zurücksetzen
          </button>
        )}
      </motion.div>
    </div>
  )
}

interface ToggleRowProps {
  icon: 'bell' | 'clock' | 'warning' | 'flame' | 'spark'
  title: string
  caption: string
  active: boolean
  onToggle: () => void | Promise<void>
}

function ToggleRow({ icon, title, caption, active, onToggle }: ToggleRowProps) {
  return (
    <button
      type="button"
      className={active ? 'toggle-row active' : 'toggle-row'}
      onClick={() => void onToggle()}
      aria-pressed={active}
    >
      <span className="habit-icon">
        <Glyph name={icon} size={17} />
      </span>
      <span>
        <strong>{title}</strong>
        <small>{caption}</small>
      </span>
      <i aria-hidden="true" />
    </button>
  )
}
