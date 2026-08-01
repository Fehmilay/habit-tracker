import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Datenschutz · Flight Habit',
  description: 'Datenschutzhinweise für Flight Habit.',
}

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <Link href="/" className="legal-back">← Flight Habit</Link>
      <p className="label-caps">Datenschutz</p>
      <h1>Deine Reise bleibt auf deinem Gerät.</h1>
      <p>Flight Habit speichert deine Ziele, Habits, Check-ins und Fokusflüge ausschließlich lokal im Speicher deines Browsers oder der installierten Web-App.</p>
      <section>
        <h2>Keine Weitergabe</h2>
        <p>Die App überträgt keine Nutzungsdaten an einen eigenen Server und verwendet keine Werbung, Analyse-Tracker oder Drittanbieter-SDKs.</p>
      </section>
      <section>
        <h2>Benachrichtigungen</h2>
        <p>Benachrichtigungen sind optional. Wenn du sie erlaubst, nutzt Flight Habit sie nur für deinen laufenden Fokusflug, etwa als Erinnerung vor der Landung oder beim Verlassen der App.</p>
      </section>
      <section>
        <h2>Deine Kontrolle</h2>
        <p>Du kannst die lokalen App-Daten jederzeit in den Browser- oder iOS-Einstellungen löschen und Benachrichtigungen dort jederzeit deaktivieren.</p>
      </section>
      <p className="legal-updated">Stand: 1. August 2026</p>
    </main>
  )
}
