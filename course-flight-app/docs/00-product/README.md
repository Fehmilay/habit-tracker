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

Die App ist bewusst **isoliert** in `course-flight-app/` angelegt. Der alte Habit Tracker
im Repository-Root ist ausschließlich Repository-Grundlage: kein geteiltes Layout, kein
geteiltes Design-System, keine geteilten Komponenten, kein geteilter Build. Er wurde nicht
verändert.

Stack: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 mit eigenem
Token-System, Three.js, @react-three/fiber, @react-three/drei, Framer Motion, Zustand,
Vitest, Playwright. PWA-Manifest vorbereitet. Die Architektur ist rein clientseitig
lauffähig und damit später mit Capacitor als iOS-/Android-App verpackbar.

## Dateien

- `src/app/page.tsx` – Einstiegspunkt
- `src/components/flight/FlightView.tsx` – Hauptansicht
- `src/lib/design/tokens.ts` – Design-Tokens
- `src/lib/flight/demoJourney.ts` – feste Demo-Reise für Phase 1

## Hauptansicht

Die Hauptansicht ist die 3D-Flugszene aus der Verfolgerperspektive – **keine Weltkarte**
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
- [x] Alter Habit Tracker unverändert
- [x] Hauptansicht ist die 3D-Flugszene
- [ ] Vollständiger Produktfluss (Phasen 2–6)
