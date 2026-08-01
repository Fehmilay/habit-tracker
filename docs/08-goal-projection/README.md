# 08 – Persönliche Zielprognose

> **Status: umgesetzt als verhaltensbasierte Prognose.** Die App zeigt die gewichtete
> Habit-Erfüllung, einen projizierten Zielwert, Kilometer-Versatz und benötigte
> Korrekturtage. Ohne echte Körper- oder Finanzmesswerte bleibt die Darstellung bewusst
> eine Verhaltensfortschreibung und kein medizinisches oder finanzielles Versprechen.

## Ziel

Kilometer sind die Metapher. Zusätzlich muss die App die reale Auswirkung auf das
persönliche Ziel zeigen.

## Technische Umsetzung

```ts
calculateGoalProjection(...)
// → { completionPercentage, projectedValue, targetValue, unit,
//     projectedDelayDays, recoveryDaysRequired, explanation }
```

Unterstützte Zielarten: Gewicht reduzieren, Gewicht erhöhen, Anzahl Trainingseinheiten,
Lerntage, Sparbetrag, Schlafroutine, allgemeines quantitatives Ziel.

Beispiele:

- Gewicht: 74 % Zielerreichung – voraussichtlich 7,4 kg statt 10 kg
- Training: voraussichtlich 24 statt 36 Einheiten
- Lernen: voraussichtlich 61 statt 80 Lerntage
- Sparen: voraussichtlich 3.850 € statt 5.000 €

## Dateien (geplant)

- `src/lib/goals/calculateGoalProjection.ts`
- `src/lib/goals/calculateGoalProjection.test.ts`

## Risiken

- **Keine medizinischen Versprechen.** Formulierungen bleiben bei „voraussichtlich“ und
  beschreiben eine Fortschreibung des bisherigen Verhaltens, keine Zusage.
- Eine Prognose aus wenigen Tagen ist statistisch schwach; die Darstellung muss das
  einräumen, statt Scheingenauigkeit zu erzeugen.

## Performanceaspekte

Reine Funktion, vernachlässigbar.

## Tests (geplant)

- vollständige Erfüllung → 100 %
- konstante Teilerfüllung skaliert linear
- alle Zielarten liefern plausible Einheiten und Formatierung
- Division durch null (Zeitraum 0, Zielwert 0) ist abgefangen

## Abnahmekriterien

- [x] Quantitative Zielwerte und frei wählbare Einheiten unterstützt
- [x] Zielwert, Prozent, Kilometer-Versatz und Korrekturtage werden abgeleitet
- [x] Keine medizinischen Versprechen
