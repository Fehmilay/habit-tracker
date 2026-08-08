# 16 – Instrumente: das Flugzeug als Werkzeug

## Warum

Das Flugzeug war schön und stumm. Es zeigte Kursabweichung und Schaden — beides
Zustände, keine Handlungen — und alles andere daran war konstant: die Fluggeschwindigkeit
war die Zahl `42`, es gab keine Höhe, keine Steigrate und keine Ankunftszeit. Der
stärkste Wahrnehmungsreiz der Szene trug null Information.

Ein Cockpit ist das dichteste Informationsdisplay, das je gebaut wurde. Wenn die App
schon in einem sitzt, muss jedes Instrument eine echte Größe anzeigen.

## Die Abbildung

`src/lib/flight/instruments.ts` — rein, ohne React und ohne Three.js, damit jede Zahl
ohne Renderer testbar ist.

| Instrument | Größe | Formel |
| --- | --- | --- |
| `ALT` | Kette | `min(35.000, Tage × 1.000)` ft |
| `SPD` | Momentum | linear gewichtete Erfüllung der letzten 7 Tage → 140…540 kt |
| `V/S` | Trend | `(Ø letzte 4 − Ø der 7 davor) × 6.000`, begrenzt auf ±2.500 fpm |
| `TDY` | heute | bewertete von fälligen Habits, Anteil nach `impact` gewichtet |
| `FUEL` | Reserve | Kettenschutz-Tank, 0…100 % |
| `ETA` | Ankunft | verdiente Etappen gegen das aktuelle Tempo |
| `XTK` | Querabweichung | `sin(Grad) × Restdistanz` |

Nichts davon ist kosmetisch, nichts ist geglättet, und jede Kachel schreibt die
Zuordnung aus. Die Metapher zu verstecken würde sie verschwenden.

### Warum gewichtete statt flacher Mittelwerte

Eine Fahrtmesser-Nadel muss auf das reagieren, was gerade passiert. Ein flacher
30-Tage-Mittelwert braucht zwei Wochen, um zu bemerken, dass jemand aufgehört hat.

### Warum die Ankunft verdient wird

Jeder aufgezeichnete Tag bringt das Flugzeug um seinen Erfüllungsanteil **einer**
geplanten Tagesetappe voran. Ein halber Tag deckt eine halbe Etappe, ein verpasster Tag
gar keine — deshalb rutscht die Ankunft nach hinten und deshalb rutscht sie beim
Aufholen wieder nach vorn. Der geplante Ankunftstag ist `Start + Dauer − 1`: Tag 1 ist
der Starttag selbst.

## Darstellung

- `InstrumentBar` — vier Zahlen unter dem Header, permanent, ohne Beschriftung. Ein HUD,
  das sich selbst erklärt, ist kein HUD mehr.
- `InstrumentSheet` — das volle Panel: künstlicher Horizont (live aus `flightRuntime`
  auf einem Animation Frame, nicht über React-State), alle sieben Kacheln mit Erklärung,
  Streckenfortschritt.
- `nextAction` — der eine Satz, auf den es sich zu handeln lohnt. Nach Dringlichkeit
  sortiert, nicht nach Schwere: die Kette lässt sich nur heute retten, eine Abweichung
  über mehrere Tage abarbeiten, und ein Level ist nie dringend. Steht im HUD direkt über
  dem Check-in-Knopf, damit Lesen und Tun dieselbe Geste sind.

## Tests

`src/lib/flight/instruments.test.ts` — Bänder, Grenzen, Monotonie des Trends, Ankunft
bei 100 % / 50 % / 0 %, und Robustheit gegen nicht-finite Erfüllungsraten aus alten
gespeicherten Profilen.
