# 12 – Ausführung, Performance und Phasenplan

## Ziel

Nachvollziehbar festhalten, was in Phase 1 tatsächlich gebaut wurde, was bewusst offen
blieb, und wie es weitergeht.

## Phase 1 – Status: abgeschlossen

Umgesetzt: neue isolierte App, neues Design-System, `FlightScene`, `Aircraft3D`,
`ChaseCamera`, `FlightEnvironment`, `CourseLine`, `FlightHud`, lokale Demoseite,
Entwickler-Steuerungen für 0°, +1°, +3°, Zurück auf 0° und „Tagesanimation testen“.

Abnahmekriterien der Vorgabe:

| # | Kriterium | Status |
| --- | --- | --- |
| 1 | Flugzeug eindeutig dreidimensional | erfüllt |
| 2 | Verfolgerperspektive | erfüllt |
| 3 | Kamera folgt weich | erfüllt |
| 4 | Horizont stabil | erfüllt |
| 5 | Kurslinie bei 0° mittig | erfüllt |
| 6 | Flugzeug rollt und dreht bei +1° und +3° | erfüllt |
| 7 | Kurslinie verschiebt sich relativ sichtbar | erfüllt |
| 8 | Rückkehr zu 0° funktioniert | erfüllt |
| 9 | Läuft auf mobilen Viewports | erfüllt, per E2E auf fünf Größen |
| 10 | Typecheck, Lint, Tests, Build | erfüllt |

Bewusst **nicht** umgesetzt, weil Phase 1 dort endet: echter Check-in, Kurslogik der
Aufgaben, Datenbank, Weltkarte, Verlaufsseite, Kilometer- und Zielprognoserechnung.

## Performance

- Three.js wird per `next/dynamic` ohne SSR geladen; ohne WebGL wird es nie geladen
- Device Pixel Ratio je Gerätestufe auf 1.25 / 1.6 / 2.0 gedeckelt
- adaptive Qualität: Wolken, Sterne, Lichttore, Rumpfsegmente, Antialiasing, Wolkendecke
- Instancing für Wolken, Lichttore, Kabinen- und Cockpitfenster
- kleine prozedurale Texturen (≤ 128 px), keine Bilddateien, keine HDR-Umgebung
- wenige Draw Calls (Aircraft ca. 10, Kurslinie 3, Wolken 1, Wolkendecke 1, Himmel 1)
- Szene pausiert vollständig, wenn der Tab unsichtbar ist (`frameloop`)
- kein Postprocessing
- 2D-Fallback ohne WebGL, Ladezustand, Fehlerzustand über Error Boundary
- `prefers-reduced-motion` schaltet Eigenbewegung, Turbulenz und den Großteil der Parallaxe
  ab, behält aber die Kursänderungen, weil diese die Aussage tragen

## Bekannte Einschränkungen

- Das Flugzeug ist prozedural, nicht ein lizenziertes Detailmodell
- Die Tagesanimations-Vorschau deckt die Storyboard-Phasen 1–4 ab; 5–8 fehlen, weil sie
  Geo- und Zielmathematik brauchen
- Alle Reisewerte im HUD (JFK, 5 840 km, Tag 18 von 90, 74 %) sind feste Demo-Werte aus
  `demoJourney.ts`, keine Berechnung
- Die Entwickler-Steuerungen sind ein Gerüst für die Abnahme von Phase 1 und werden mit
  dem echten Check-in entfernt
- Gemessene Bildraten liegen hier nur unter Software-Rendering vor und sagen nichts über
  echte Geräte aus; auf echter Hardware wurde nicht getestet

## Umgesetzte Erweiterung

Nach Phase 1 wurden Habit-CRUD, täglicher Check-in, deterministische Kurslogik,
Kilometer- und Zielprojektion, Drei-Seiten-Swipe-Navigation, Zielflughafen, Stats, Hangar
und der Daumen-gesteuerte Habit-Flight-Modus umgesetzt.

## Weitere Phasen

| Phase | Inhalt | Freigabe |
| --- | --- | --- |
| 2 | `calculateDailyDeviation`, Unit-Tests, Aufgabenereignisse, Anbindung ans 3D-Flugzeug | ausstehend |
| 3 | Bottom Sheet, Tag abschließen, vollständiges Storyboard | nach Phase 2 |
| 4 | Flughäfen, Kilometerberechnung, Kartenansicht | nach Phase 3 |
| 5 | Zielprognose, Korrekturtage | nach Phase 4 |
| 6 | Verlauf, Persistenz, Authentifizierung, sinnvolle Backend-Teile | nach Phase 5 |

## Befehle

```bash
npm install
npm run dev        # http://localhost:3100
npm run typecheck
npm run lint
npm run test       # Vitest
npm run build
npm run test:e2e   # Playwright, fünf Viewports, braucht build + start
```

Die aktive App liegt im Repository-Root. Der alte Tracker ist unter
`archive/legacy-habit-tracker/` archiviert.
