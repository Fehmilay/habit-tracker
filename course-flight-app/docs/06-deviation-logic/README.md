# 06 – Kurslogik der täglichen Aufgaben

> **Status: geplant (Phase 2).** In Phase 1 nicht implementiert. Die
> Tagesanimations-Vorschau addiert nur die rohen Demo-Werte und ist als Vorschau
> gekennzeichnet.

## Ziel

Aus den Aufgabenstatus eines Tages deterministisch die neue Kursabweichung berechnen.

## Technische Umsetzung

Aufgabenstatus: `completed`, `partial`, `missed`, `not_relevant`.

Grundlogik:

| Status | Wirkung |
| --- | --- |
| `missed` | +1° |
| `partial` | +0,5° |
| `completed` | korrigiert bis zu 1° einer **bereits bestehenden** Abweichung |
| `not_relevant` | 0° |

**Zentrale Regel.** Erledigte Aufgaben des aktuellen Tages korrigieren ausschließlich die
Abweichung, die **vor** dem heutigen Check-in bestand. Erst danach werden die Fehler des
heutigen Tages addiert. Dadurch bleiben heutige Fehler sichtbar und lassen sich nicht
innerhalb desselben Tages wegrechnen.

Beispiel: Vorher +3°, heute Gym erledigt, Schritte erledigt, Kalorienziel verfehlt.
→ bestehende Abweichung durch zwei Erledigte von +3° auf +1° reduzieren, heutigen Fehler
+1° addieren → **+2°**.

Schnittstelle:

```ts
calculateDailyDeviation({ previousDeviationDegrees, tasks })
// → { previousDeviationDegrees, recoverableDegrees, recoveredDegrees,
//     addedDegrees, finalDeviationDegrees, completedCount, partialCount,
//     missedCount, ignoredCount, events }
```

Regeln: Mindestwert 0°, Standard-Maximalwert 15°, deterministisch, keine Zufallswerte,
unabhängig von der visuellen Animation.

## Dateien (geplant)

- `src/lib/flight/calculateDailyDeviation.ts`
- `src/lib/flight/calculateDailyDeviation.test.ts`

Vorbereitet: `MAX_DEVIATION_DEGREES` in `src/store/flightStore.ts`.

## Risiken

- Die Reihenfolge Korrektur-vor-Addition ist leicht zu verwechseln; sie ist der Kern der
  Aussage und muss durch Tests festgenagelt sein.
- Leere Eingaben dürfen **nicht** automatisch als `missed` gelten.

## Performanceaspekte

Reine Funktion über eine kurze Liste, vernachlässigbar.

## Tests (verpflichtend)

- 0° und alle erledigt → 0°
- 0° und eine Aufgabe verfehlt → +1°
- +3° und drei Aufgaben erledigt → 0°
- +3° mit zwei erledigten und einer verfehlten → +2°
- +2° mit einer teilweisen Aufgabe → +2,5°
- `not_relevant` verändert nichts
- Deckelung bei 15°
- leere Eingaben gelten nicht als `missed`

## Abnahmekriterien

- [ ] Funktion implementiert, deterministisch, vollständig getestet
- [ ] An das 3D-Flugzeug angebunden (Ergebnis setzt den Sollkurs)
