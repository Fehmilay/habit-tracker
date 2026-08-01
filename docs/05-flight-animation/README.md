# 05 – Flugphysik und Animation

## Ziel

Keine vollständige Flugsimulation, sondern eine kontrollierte visuelle Fluglogik: das
Flugzeug rollt in die Kurve, der Kurs folgt, der Roll geht zurück, der neue Kurs bleibt.

## Technische Umsetzung

**Modell des koordinierten Kurvenflugs.** Aus einem einzigen Sollkurs entsteht genau die
geforderte Abfolge, ohne dass irgendein Manöver skriptet wird:

```
Sollquerneigung = clamp(Kursfehler × 6.0, ±26°)
Querneigung     = damp(Querneigung, Sollquerneigung, 3.0/s, dt)
Drehrate        = Querneigung × 0.2 °/s pro °
Kurs           += Drehrate × dt
```

Die Querneigung wird proportional zum **verbleibenden** Kursfehler kommandiert, die
Drehrate ist proportional zur **aktuellen** Querneigung – dieselbe Kopplung wie beim
echten Flugzeug. Daraus folgt automatisch: erst Roll, dann Kursänderung, und wenn der
Fehler aufgebraucht ist, geht der Roll von selbst auf null zurück.

**Auslegung.** Kreisverstärkung 6.0 × 0.2 = 1.2/s gegen eine Rollantwort von 3.0/s ergibt
ein Dämpfungsmaß von ca. 0.83. Damit sind rund 90 % der Kursänderung nach etwa 1.4 s
erreicht – die geforderten „etwa 1,5 Sekunden“ – ohne sichtbares Überschwingen. Die
Spitzenquerneigung wird innerhalb von ca. 0.8 s erreicht.

**Kein Überschwingen.** Ein Schritt, der über den Sollkurs hinausginge, wird auf den
Sollkurs gesetzt. Der Kurs steht damit exakt, nicht asymptotisch.

**Nickwinkel** bleibt weitgehend stabil: leichte Nase-tief-Kopplung an die Querneigung
plus sehr geringe deterministische Luftbewegung.

**Frame-Deltas** werden auf 1/20 s begrenzt, damit ein blockierter Tab das Integral nicht
springen lässt. Nebenwirkung: auf sehr langsamen Renderern läuft das Manöver in Zeitlupe –
absichtlich, weil langsam besser ist als sprunghaft. Die E2E-Tests warten deshalb auf den
Zustand statt auf eine feste Zeit.

**Trennung von React.** `FlightDriver` ist der einzige Ort, an dem integriert wird – genau
einmal pro Frame, bevor irgendjemand liest. Kurs, Roll und Nickwinkel liegen in einem
mutablen `flightRuntime`, nicht im Store: Werte, die sich jeden Frame ändern, durch React
zu schicken hieße, das HUD sechzigmal pro Sekunde neu zu rendern. Diskreter Zustand
(Phase, Kameramodus, Zielkurs) liegt dagegen in Zustand.

## Dateien

- `src/lib/flight/flightDynamics.ts`
- `src/lib/flight/flightMath.ts`
- `src/lib/flight/flightRuntime.ts`
- `src/components/flight/FlightDriver.tsx`

## Risiken

- Die Parameter sind gekoppelt: eine Änderung an `rollPerHeadingError` verändert auch die
  Einschwingzeit. Die Auslegung ist oben dokumentiert und durch Tests abgesichert.

## Performanceaspekte

Einige Fließkommaoperationen pro Frame, keine Allokationen.

## Tests

`src/lib/flight/flightDynamics.test.ts` prüft unter anderem:

- Roll ist bei 0.35 s bereits aufgebaut, während der Kurs kaum gewandert ist
- Spitzenquerneigung innerhalb von 0.85 s
- Kursänderung nach 1.5 s im Wesentlichen abgeschlossen
- kein Überschwingen
- Rückkehr auf Wings-Level nach dem Manöver
- Korrektur +3° → 0° rollt in die Gegenrichtung und ist monoton
- Ergebnis bei 30 fps und 120 fps identisch

## Abnahmekriterien

- [x] Yaw trägt die Richtungsänderung, Roll unterstützt sichtbar, Pitch bleibt stabil
- [x] Roll geht nach der Drehung zurück, der neue Kurs bleibt
- [x] keine sofortigen Rotationssprünge
