# 00 – Produkt

## Ziel

Course Flight zeigt persönliche Ziele und tägliche Gewohnheiten als Langstreckenflug.
Der Nutzer wählt ein Ziel, einen Zeitraum, tägliche Aufgaben, einen Startflughafen und
einen weit entfernten Zielflughafen. Jeden Abend trägt er ein, was erledigt wurde. Danach
zeigt eine 3D-Animation, wie sich der Flugkurs verändert.

Die zentrale Aussage: **Eine einzelne kleine Fehlentscheidung verändert den Kurs nur
gering. Wiederholt sich dieses Verhalten über längere Zeit, kommt man weit vom
eigentlichen Ziel entfernt an.**

Beispiel-Reise: DUS → JFK, 90 Tage, Ziel „10 kg abnehmen“, Aufgaben Gym, Kalorienziel,
Schritte, Schlafziel, Wasser.

## Technische Umsetzung

Die aktive App liegt im Repository-Root. Der alte Habit Tracker ist vollständig unter
`archive/legacy-habit-tracker/` archiviert und vom Build ausgeschlossen. Konzeptuelles
Datenmodell-Wissen und ein optionaler lokaler Habit-Import bleiben erhalten.

Stack: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 mit eigenem
Token-System, Three.js, @react-three/fiber, @react-three/drei, Framer Motion, Zustand,
Vitest, Playwright. PWA-Manifest vorbereitet. Die Architektur ist rein clientseitig
lauffähig und damit später mit Capacitor als iOS-/Android-App verpackbar.

## Dateien

- `src/app/page.tsx` – Einstiegspunkt
- `src/components/flight/FlightView.tsx` – Hauptansicht
- `src/lib/design/tokens.ts` – Design-Tokens
- `src/lib/flight/demoJourney.ts` – feste Demo-Reise für Phase 1

## Produktschleife

Beim ersten Start führt ein vierstufiges Setup durch Ziel, Route, Habits und
Erinnerungszeit — die App öffnet nicht mehr auf fremden Gewohnheiten. Danach:

1. **Abends** erinnert eine lokale Benachrichtigung an den offenen Tag.
2. **Der Check-in** bewertet jeden fälligen Habit als erledigt, teilweise, verfehlt oder
   nicht relevant und bewegt den Kurs.
3. **Die Sequenz** zeigt Ereignisse, neuen Kurs, **Kette** und Prognose.
4. **Abwesenheit wird abgerechnet**: nicht bestätigte Tage schließt die App selbst als
   verpasst — sonst wäre Wegsehen billiger als Ehrlichkeit (siehe `15-retention`).
5. **Alle 30 Tage** landet der Zyklus und wird aus echten Check-ins bewertet.

Details: `15-retention` (Kette, Reserve, Meilensteine, Erinnerungen) und `16-instruments`
(das Flugzeug als ablesbares Werkzeug).

## Hauptansicht

Die Hauptansicht ist die 3D-Flugszene aus der Verfolgerperspektive. Eine optionale, offline gebündelte Weltkarte zeigt die reale Route, ohne die Hauptansicht zu ersetzen.
und **kein Dashboard**. Die Karte ist sekundär (siehe `07-geographic-projection`).

## Risiken

- Die Metapher darf nicht in Gamification kippen. Ton: erwachsen, ruhig, sachlich.
- Keine medizinischen Versprechen bei Gewichtszielen.
- Die 3D-Szene ist das Produkt. Wenn sie nicht überzeugt, trägt die App nicht.

## Performanceaspekte

Siehe `03-environment` und `12-execution`. Grundsatz: mobil flüssig vor visuell maximal.

## Tests

- Unit: Kurslogik, Flugmodell, Geo-Projektion, Zielprognose
- E2E: Hauptansicht auf fünf Viewports

## Abnahmekriterien

- [x] Neue App ist unabhängig vom alten Habit Tracker startbar
- [x] Alter Habit Tracker vollständig archiviert
- [x] Hauptansicht ist die 3D-Flugszene
- [x] Habit-, Check-in-, Kurs-, Stats- und Game-Produktfluss
