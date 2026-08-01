# 07 – Geografische Projektion und Kartenansicht

> **Status: geplant (Phase 4).** In Phase 1 nicht implementiert. Es werden bewusst keine
> erfundenen Kilometerwerte angezeigt.

## Ziel

Die Kilometerabweichung wird echt berechnet, nicht geschätzt. 1° Abweichung früh auf der
Reise erzeugt eine größere Endabweichung als 1° kurz vor dem Ziel – das muss aus der
Mathematik folgen, nicht aus einer Formel nach Gefühl.

## Technische Umsetzung

Rechenweg:

1. aktuelle Position auf der symbolischen Flugroute
2. Bearing zum Zielflughafen
3. verbleibende Distanz
4. Bearing plus Kursabweichung
5. projizierter Endpunkt nach der verbleibenden Distanz
6. Großkreisabstand zwischen projiziertem Endpunkt und Zielflughafen

```ts
const projectedBearing = plannedBearing + deviationDegrees
const projectedArrival  = calculateDestinationPoint(
  currentPosition, projectedBearing, remainingDistanceKm,
)
const missDistanceKm = calculateGreatCircleDistance(
  projectedArrival, destinationAirport,
)
```

**Formulierung.** Liegt der projizierte Punkt im Meer, wird **nicht** „Du landest im Meer“
gesagt, sondern: „Du würdest den Zielflughafen voraussichtlich um 204 km verfehlen.“
Optional zusätzlich der nächstgelegene größere Flughafen.

## Dateien (geplant)

- `src/lib/geo/greatCircleDistance.ts`
- `src/lib/geo/initialBearing.ts`
- `src/lib/geo/destinationPoint.ts`
- `src/lib/geo/projectedArrival.ts`
- `src/lib/geo/nearestAirport.ts`
- `src/data/airports.ts` – kuratierte Liste mit `id`, `iata`, `icao`, `name`, `city`,
  `country`, `latitude`, `longitude`, `timezone`, `size`; mindestens DUS, FRA, MUC, BER,
  AMS, CDG, LHR, LIS, MAD, BCN, IST, JFK, EWR, LAX, SFO, MIA, DXB, DOH, SIN, HND, ICN, SYD
- `src/components/map/FlightResultMap.tsx` – ruhiger dunkler Stil, Zielflughafen,
  prognostizierter Ankunftspunkt, Abweichungslinie, Kilometer, nächster Flughafen

Die Karte ist **sekundär**: Flughafenauswahl, kurze Ergebnisansicht nach dem Check-in,
Verlauf, Vergleich. Nie Hauptansicht.

## Risiken

- Verwechslung von Grad und Radiant ist die klassische Fehlerquelle; Tests gegen bekannte
  Strecken (DUS–JFK ≈ 6 180 km) fangen das ab.
- Kartenkacheln von Dritten wären ein Netzwerk- und Datenschutzthema; bevorzugt eine
  vektorbasierte, lokal gerenderte Darstellung.

## Performanceaspekte

Reine Trigonometrie, vernachlässigbar. Die Karte wird nur bei Bedarf geladen.

## Tests (geplant)

- Großkreisdistanz gegen bekannte Flughafenpaare
- `destinationPoint(bearing=0, d)` bewegt sich exakt nach Norden
- Hin- und Rückrechnung ist konsistent
- gleiche Abweichung früh erzeugt größere Endabweichung als spät

## Abnahmekriterien

- [ ] Kilometerabweichung stammt aus echter Großkreisrechnung
- [ ] Formulierung ohne „Du landest im Meer“
- [ ] Karte nur sekundär
