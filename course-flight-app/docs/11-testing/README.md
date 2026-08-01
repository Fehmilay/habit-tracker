# 11 – Testing

## Ziel

Die Behauptungen über das Flugverhalten sollen überprüfbar sein, nicht nur behauptet.

## Technische Umsetzung

**Unit-Tests (Vitest, `node`-Umgebung).** Das Flugmodell und die Mathematik sind bewusst
frei von Three.js und React, damit sie ohne Renderer testbar sind. `simulateHeadingChange`
lässt ein Manöver über eine feste Zeitachse laufen und gibt die Stichproben zurück, sodass
sich Timing-Aussagen („Roll innerhalb von 0,8 s“, „Kursänderung in etwa 1,5 s“) direkt
prüfen lassen.

**E2E-Tests (Playwright).** Dieselbe Suite läuft in fünf Projekten: 375×667, 390×844,
430×932, iPad 820×1180 und Desktop 1440×900. Jede Aussage über Layout und Flugverhalten
wird damit an allen fünf Größen geprüft – das ist die geforderte mobile Prüfung, in
wiederholbarer Form statt als Sichtkontrolle.

Zwei umgebungsbedingte Details:

- Software-WebGL im Container braucht ANGLE/SwiftShader-Flags.
- Ist im Image ein anderer Playwright-Browser-Build vorinstalliert als die
  Projektabhängigkeit erwartet, wird über `e2e/chromium.ts` das vorhandene Chromium
  genutzt, statt einen zweiten Browser herunterzuladen.

**Warten auf Zustand, nicht auf Zeit.** Weil das Flugmodell den Frame-Delta deckelt, läuft
ein Manöver auf einem langsamen Renderer in Zeitlupe. Die Tests pollen deshalb den
Zustand (`expectSettledAt`); feste Wartezeiten würden die Framerate der CI-Maschine messen
statt des Flugverhaltens.

**Visuelle Kontrolle.** `scripts/shoot.mjs` erzeugt Screenshots der festen Phase-1-Zustände
(0°, +1°, +3°, Korrektur, Sequenz) für eine beliebige Auflösung; `scripts/inspect.mjs`
liefert hochauflösende Nahaufnahmen des Flugzeugs mit ausgeblendetem HUD.

## Dateien

- `src/lib/flight/flightDynamics.test.ts`
- `src/lib/flight/flightMath.test.ts`
- `e2e/flight-scene.spec.ts`
- `e2e/chromium.ts`
- `playwright.config.ts`, `vitest.config.mts`
- `scripts/shoot.mjs`, `scripts/inspect.mjs`

## Risiken

- Software-Rendering ist deutlich langsamer als eine echte GPU; Zeitbudgets in Tests
  dürfen daher nicht knapp gesetzt werden.
- Screenshot-Vergleiche (visuelle Regression) sind bewusst **nicht** eingerichtet – unter
  Software-Rendering sind sie zu instabil, um nützlich zu sein.

## Performanceaspekte

Die gesamte E2E-Matrix läuft seriell (`workers: 1`), weil parallele WebGL-Kontexte unter
SwiftShader unzuverlässig sind. Laufzeit ca. fünf Minuten.

## Tests

30 Unit-Tests, 65 E2E-Tests (13 × 5 Viewports).

## Abnahmekriterien

- [x] Flugverhalten durch Unit-Tests belegt
- [x] Layout und Verhalten auf allen fünf Viewports geprüft
- [x] Keine Konsolenfehler
- [ ] Tests für Kurslogik, Geo und Zielprognose (Phasen 2, 4, 5)
