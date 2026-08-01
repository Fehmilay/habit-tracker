# 03 – Flugumgebung

## Ziel

Atmosphärischer Himmel mit Farbverlauf, dezenter Lichtquelle, dünner Wolkendecke,
einzelnen vorbeiziehenden Wolken und räumlicher Tiefenstaffelung. Die Vorwärtsbewegung
muss erkennbar sein.

## Technische Umsetzung

**Himmel.** Kuppel mit eigenem Shader, Farbverlauf von fast schwarzem Zenit über Nachtblau
zu hellerem Dunst am Horizont. Die Kuppel wird jeden Frame auf die Kameraposition
gesetzt, ist also unerreichbar. Der Übergang unter den Horizont ist bewusst eng
(`smoothstep(-0.15, -0.004)`) – ein weicher Übergang lässt keine ablesbare Horizontlinie
entstehen, und der Horizont ist die Referenz, an der man die Querneigung beurteilt.

**Licht.** Getrennt von der sichtbaren Sonne:

- Die *Sonne* steht tief und voraus steuerbord und liefert die Atmosphäre.
- Das *Führungslicht* kommt von **hinten oben**, weil die Verfolgerkamera nur die oberen
  hinteren Flächen des Flugzeugs sieht. Beleuchtet man ausschließlich von der Sonne
  voraus, liegen genau diese Flächen im Schatten und das Flugzeug fällt zur flachen
  Silhouette zusammen.
- Dazu ein kalter Aufheller von unten (Reflexion der Wolkendecke) und wenig Ambient.

**Reflexionen.** Statt einer HDR-Datei wird eine 32×16-Pixel-Gradienten-`DataTexture`
erzeugt und per `PMREMGenerator` vorgefiltert. Eine HDR-Umgebung wäre um ein Vielfaches
größer als die gesamte restliche App und bei dieser Rauheit visuell nicht unterscheidbar.

**Wolken.** `InstancedMesh` mit prozedural gezeichneter Puff-Textur (128 px), ein Draw
Call. Nicht jede Instanz wird einzeln zur Kamera gedreht – stattdessen wird die
Elterngruppe einmal pro Frame auf den Gierwinkel der Kamera gedreht; bei einer
Verfolgerkamera variiert die Blickrichtung nur um wenige Grad. Die Wolken scrollen mit
Parallaxe (entfernte langsamer). Die Z-Position wird aus Basisposition und einem einzigen
Scroll-Offset **abgeleitet**, nicht fortlaufend addiert – dadurch driftet das Feld nicht
durch Rundungsfehler.

**Wolkendecke.** Eine Ebene weit unten mit fBm-Value-Noise im Shader, scrollend, mit
Nah- und Fernausblendung. Ein Draw Call, keine Textur.

**Sterne.** `Points` mit kleiner Punkt-Textur, nur obere Hemisphäre, additiv, sehr dezent.

**Tiefe.** `FogExp2` in Horizontfarbe. Alle additiven Shader blenden zusätzlich explizit
über die Distanz aus, da Fog bei ihnen unerwünscht wäre.

Layouts von Wolken und Sternen kommen aus einer **reinen Hash-Funktion** über den Index,
sind also über Reloads hinweg identisch und machen Screenshots vergleichbar.

## Dateien

- `src/components/flight/FlightEnvironment.tsx`
- `src/lib/flight/shaders.ts`
- `src/lib/flight/textures.ts`

## Risiken

- fBm im Fragment-Shader ist auf sehr schwachen GPUs spürbar; die Wolkendecke wird auf der
  Stufe `low` deaktiviert.
- Transparente Wolken-Billboards ohne Tiefenschreiben können sich in seltenen Fällen
  falsch überlagern. Bei weichen Puffs visuell unauffällig.

## Performanceaspekte

Wolkenanzahl 34 / 72 / 120 je Gerätestufe, Sterne 0 / 180 / 320, Wolkendecke erst ab
`medium`. Keine großen Texturen, keine Postprocessing-Effekte.

## Tests

- E2E: keine Konsolenfehler auf allen Viewports
- Visuell: Screenshots über `scripts/shoot.mjs`

## Abnahmekriterien

- [x] Farbverlauf tiefes Blau → hellerer Horizont
- [x] dezente Lichtquelle
- [x] dünne Wolkendecke und einzelne vorbeiziehende Wolken
- [x] räumliche Tiefenstaffelung, Fog
- [x] Vorwärtsflug erkennbar
- [x] keine großen hochauflösenden Texturen
