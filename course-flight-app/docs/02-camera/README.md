# 02 – Verfolgerkamera

## Ziel

Die Kamera steht hinter und leicht oberhalb des Flugzeugs, folgt weich, hält den Horizont
stabil und erzeugt keine Motion Sickness.

## Technische Umsetzung

Die Kamera ist **nicht** am Flugzeug befestigt. Eine starre Montage würde Roll und Gier
exakt kopieren, den Horizont bei jedem Manöver mitkippen und genau die ruckartige,
übelkeitsfördernde Bewegung erzeugen, die die Vorgabe ausschließt.

Stattdessen:

1. Die Kamera führt einen **eigenen gedämpften Gierwinkel**, der dem Flugzeugkurs
   nachläuft (`yawLambda` 1.8/s). Daraus entsteht die gewollte Verzögerung: das Flugzeug
   dreht weg, die Kamera zieht nach.
2. Aus diesem Gierwinkel wird die Sollposition hinter/über dem Flugzeug berechnet; die
   tatsächliche Position wird nochmals gedämpft (`positionLambda` 2.4/s).
3. Nach `lookAt` wird nur ein **Bruchteil der Querneigung** übernommen (22 %, maximal 7°).
4. Von der Höhenbewegung des Flugzeugs übernimmt die Kamera 30 %, damit die Einstellung
   lebt, ohne dass der Horizont atmet.

Alle Glättung ist exponentiell und delta-time-basiert (`damp` in `flightMath.ts`), das Bild
verhält sich also bei 30, 60 und 120 fps identisch.

**Kameramodi.** `chase` (Normalzustand), `closeup` (fährt zur Tagesanimation näher heran),
`wide` (zoomt zur Ergebnisanzeige heraus). Zwischen den Modi wird interpoliert
(`rigLambda` 1.6/s) – keine harten Schnitte.

**Bildausschnitt nach Seitenverhältnis.** Die Modi geben für Hochformat ein *horizontales*
Blickfeld vor, nicht ein vertikales. Grund: ein aufrecht gehaltenes Telefon hat ein
Seitenverhältnis um 0.46; ein festes vertikales Blickfeld schrumpft das horizontale auf
etwa 25° und schneidet die Tragflächen seitlich ab. `verticalFovForAspect()` rechnet um,
gedeckelt auf 78°.

Weil der Gierwinkel der Kamera auf den Flugzeugkurs konvergiert, bleibt das Flugzeug
zentriert und die weltfeste Kurslinie wandert zur Seite – genau das in der Vorgabe
beschriebene Verhalten.

## Dateien

- `src/components/flight/ChaseCamera.tsx`
- `src/lib/flight/sceneConfig.ts` (`CAMERA_RIGS`, `CAMERA_TUNING`, `verticalFovForAspect`)

## Risiken

- Zu starke Dämpfung wirkt träge, zu schwache nervös. Werte sind an einer Stelle
  gebündelt und ohne Codeänderung nachjustierbar.
- Sehr schmale Viewports könnten das FOV-Limit erreichen; dann wird der Ausschnitt enger
  statt verzerrt.

## Performanceaspekte

Reine Rechenarbeit pro Frame, keine Allokationen im Frame-Loop (Vektoren liegen in Refs).

## Tests

- Unit: `damp` ist frameratenunabhängig
- E2E: keine abrupten Sprünge – die Gradanzeige ist während des Manövers messbar zwischen
  Start- und Zielwert

## Abnahmekriterien

- [x] Kamera hinter und leicht oberhalb
- [x] Flugzeug groß genug für Details, Horizont sichtbar, Kurslinie nicht vollständig
      verdeckt
- [x] weiches, leicht verzögertes Folgen
- [x] Kamera rollt nicht vollständig mit
- [x] näher bei der Tagesanimation, weiter bei der Ergebnisanzeige, ruhige Rückkehr
