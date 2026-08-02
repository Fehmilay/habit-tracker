import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Datenschutz · Flight Habit',
  description: 'Datenschutzhinweise für Flight Habit.',
}

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <Link href="/" className="legal-back">Zurück</Link>
      <p className="label-caps">Datenschutz</p>
      <h1>Deine Reise bleibt auf deinem Gerät.</h1>
      <p>Flight Habit speichert Ziele, Habits, Check-ins und Fokusflüge lokal im Browser beziehungsweise in der installierten App. Es gibt kein Benutzerkonto.</p>
      <section><h2>Keine Analyse und keine Werbung</h2><p>Flight Habit verwendet keine Analyse-Tracker, Werbenetzwerke oder Profiling-SDKs und verkauft keine Daten.</p></section>
      <section><h2>Weltkarte</h2><p>Die optionale Weltkarte und ihre Flugrouten sind vollständig in der App gebündelt. Beim Öffnen werden keine Kartenkacheln von einem externen Kartendienst geladen und keine Habit-Daten übertragen.</p></section>
      <section><h2>Benachrichtigungen</h2><p>Benachrichtigungen sind optional und werden ausschließlich für einen laufenden Fokusflug genutzt. Du kannst die Berechtigung jederzeit in den iOS- oder Browser-Einstellungen widerrufen.</p></section>
      <section><h2>Deine Kontrolle</h2><p>Du kannst alle App-Daten jederzeit durch Löschen der App beziehungsweise der lokalen Website-Daten entfernen.</p></section>
      <p className="legal-updated">Stand: 1. August 2026</p>
    </main>
  )
}
