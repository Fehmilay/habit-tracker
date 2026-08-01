# Course Flight

Deine Ziele und täglichen Gewohnheiten als Langstreckenflug.

Eine einzelne kleine Fehlentscheidung verändert den Kurs nur gering. Wiederholt sich
dieses Verhalten über längere Zeit, kommt man weit vom eigentlichen Ziel entfernt an.

> **Neue, eigenständige App.** Sie liegt isoliert in `course-flight-app/` und teilt sich
> mit dem alten Habit Tracker im Repository-Root weder Layout noch Design-System,
> Komponenten oder Build. Der alte Tracker wurde nicht verändert.

## Stand: Phase 1

Umgesetzt ist die 3D-Flugszene: ein prozedural gebautes Verkehrsflugzeug, eine gedämpfte
Verfolgerkamera, Himmel und Wolken, die leuchtende Soll-Kurslinie und ein reduziertes HUD.

Noch **nicht** umgesetzt: Check-in, Kurslogik der Aufgaben, Datenbank, Weltkarte,
Verlaufsseite, Kilometer- und Zielprognoserechnung. Die Reisewerte im HUD sind feste
Demo-Werte.

## Loslegen

```bash
npm install
npm run dev
```

→ <http://localhost:3100>

Unten in der Szene liegen die Entwickler-Steuerungen: **0°**, **+1°**, **+3°**,
**Zurück auf 0°** und **Tagesanimation testen**.

## Befehle

| Befehl | Zweck |
| --- | --- |
| `npm run dev` | Entwicklungsserver auf Port 3100 |
| `npm run build` | Produktions-Build |
| `npm run start` | Produktionsserver auf Port 3100 |
| `npm run typecheck` | TypeScript ohne Emit |
| `npm run lint` | ESLint |
| `npm run test` | Vitest (Flugmodell und Mathematik) |
| `npm run test:e2e` | Playwright auf fünf Viewports (benötigt `build`) |

## Aufbau

```
src/
  app/                     Next.js App Router
  components/flight/       Szene, Flugzeug, Kamera, Umgebung, Kurslinie, HUD
  lib/design/tokens.ts     Design-Tokens (einzige Quelle)
  lib/flight/              Flugmodell, Geometrie, Shader, Szenenkonfiguration
  lib/perf/                WebGL-Erkennung, Qualitätsstufen, Reduced Motion
  store/                   Zustand-Store
docs/                      Planung je Bereich, 00 bis 12
scripts/                   Screenshot- und Inspektionswerkzeuge
```

Die Achsenkonventionen der Szene und die Begründung, warum das Flugzeug im Ursprung bleibt
und die Welt an ihm vorbeizieht, stehen im Kopfkommentar von
`src/lib/flight/sceneConfig.ts`.

## Dokumentation

`docs/` enthält je Bereich Ziel, technische Umsetzung, Dateien, Risiken,
Performanceaspekte, Tests und Abnahmekriterien – siehe `docs/12-execution` für den
Phasenplan und die bekannten Einschränkungen.
