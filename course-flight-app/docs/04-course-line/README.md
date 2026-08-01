# 04 – Soll-Kurslinie

## Ziel

Eine gerade, leuchtende Kurslinie vor dem Flugzeug in Richtung Zielflughafen. Bei 0° liegt
sie exakt mittig, bei Abweichung sichtbar seitlich versetzt.

## Technische Umsetzung

Die Linie ist an den **geplanten Kurs in der Welt** verankert, nicht am Flugzeug. Das ist
der eigentliche Mechanismus der ganzen Szene: weil der Gierwinkel der Kamera auf den
Flugzeugkurs konvergiert (siehe `02-camera`), erscheint eine stehende Abweichung von 3°
dauerhaft als 3° seitlicher Versatz der Linie – und bleibt dort, bis der Kurs tatsächlich
korrigiert wird.

Das Flugzeug selbst bewegt sich nicht durch die Welt, es rotiert nur; die Welt zieht an
ihm vorbei. Damit bleibt die Gleitkommagenauigkeit über beliebig lange Flüge exakt, und
vor allem verwandelt sich eine Kursabweichung nicht mit der Zeit in einen seitlichen
Versatz, der irgendwann aus dem Bild läuft – sie bleibt eine ablesbare Winkelabweichung.

Drei Bestandteile, alle additiv und ohne Tiefenschreiben:

1. **Band** – eine Ebene mit Shader: heller Kern, weiche Kanten, in Segmente unterteilt,
   die auf das Flugzeug zuscrollen. In der Ferne verschmelzen die Segmente kontrolliert
   (`merge`), statt zu flimmern – das ist die übliche Schwachstelle einer flach liegenden
   Linie.
2. **Zielkorridor** – zwei sehr schwache Schienen. Bewusst leise; heller gelesen wirkt er
   wie eine leuchtende Landebahn und konkurriert mit der Linie selbst.
3. **Lichttore** – vertikale Marken in festem Abstand, instanziert, ein Draw Call. Sie
   tragen den Tiefen- und Geschwindigkeitseindruck. Recycling verschiebt die gesamte Reihe
   um genau einen Abstand; die Nahausblendung im Shader verdeckt das Tor, das dabei am
   nahen Ende herausfällt.

Die Linie liegt unterhalb des Flugzeugs und beginnt deutlich vor der Nase, damit der Rumpf
sie nie vollständig verdeckt.

## Dateien

- `src/components/flight/CourseLine.tsx`
- `src/lib/flight/shaders.ts`
- `src/lib/flight/sceneConfig.ts` (`COURSE_LINE`)

## Risiken

- Flach liegende Linien neigen bei flachem Blickwinkel zu Aliasing; abgefedert durch weiche
  Segmentkanten und Fernverschmelzung.
- Additives Blending kann vor hellem Himmel ausbleichen. Der dunkle Himmel (siehe
  `03-environment`) ist auch dafür eine Voraussetzung.

## Performanceaspekte

Drei Draw Calls insgesamt. Keine Texturen. Tore je Gerätestufe 16 / 24 / 30.

## Tests

- E2E: bei 0° „Auf Kurs“, bei +3° „Deutliche Kursabweichung“
- Visuell: Screenshots bei 0°, +1°, +3° zeigen den seitlichen Versatz

## Abnahmekriterien

- [x] beginnt vor dem Flugzeug, verläuft zum Horizont
- [x] echte räumliche Perspektive, keine Bildschirmlinie
- [x] besteht aus Segmenten/Lichtmarkierungen, leuchtet leicht
- [x] bei 0° exakt mittig
- [x] bei +1°/+3° sichtbar seitlich versetzt
- [x] dezenter Zielkorridor
