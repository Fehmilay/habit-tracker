# 09 – Täglicher Check-in und Tagesabschlussanimation

> **Status: geplant (Phase 3).** In Phase 1 ist der Button „Heutigen Tag eintragen“
> sichtbar, aber deaktiviert. Es gibt bewusst keinen halben Check-in ohne Kurslogik und
> ohne Persistenz.

## Ziel

Ein hochwertiges Bottom Sheet zur Tageserfassung und die Tagesabschlussanimation als
zentrale tägliche Belohnung.

## Technische Umsetzung

**Check-in** (`components/check-in/DailyCheckInSheet.tsx`): pro Aufgabe Name, optionales
kurzes Ziel und die Auswahl *Erledigt* / *Teilweise* / *Nicht erledigt* / *Heute nicht
relevant*. Unten eine Vorschau („Aktuelle Vorschau: +2° Kursänderung“), die noch **nichts**
speichert. Primärbutton „Tag abschließen“.

Vor dem Abschluss: sicherstellen, dass jede Aufgabe bewusst bewertet wurde; fehlende
Eingaben **nicht** automatisch als Fehler behandeln; doppelten Tagesabschluss verhindern;
Speichern nur nach ausdrücklicher Bestätigung.

**Tagesabschlussanimation** (`components/flight/FlightCompletionSequence.tsx`), 6–9
Sekunden, überspringbar:

| Phase | Inhalt | Phase 1 |
| --- | --- | --- |
| 1 | Übergang, Sheet schließt, HUD tritt zurück, Kamera fährt näher | umgesetzt |
| 2 | Aufgaben einzeln einblenden, Kurswert reagiert sichtbar | umgesetzt |
| 3 | Flugzeug rollt und dreht, Gradanzeige zählt weich | umgesetzt |
| 4 | Neuer Kurs mit Status | umgesetzt |
| 5 | Langfristige Auswirkung in km | offen – braucht Phase 4 |
| 6 | Persönliche Zielprognose | offen – braucht Phase 5 |
| 7 | Kurze Kartenansicht | offen – braucht Phase 4 |
| 8 | Korrekturhinweis | offen – braucht Phase 2 |

Die Phase-1-Vorschau (`useDayAnimationPreview`) deckt die Phasen 1–4 ab und ist als
Vorschau dokumentiert. Die Phasen 5–8 werden **nicht** mit erfundenen Zahlen simuliert.

## Dateien

- vorhanden: `src/components/flight/useDayAnimationPreview.ts`,
  `src/components/flight/FlightSequenceOverlay.tsx`
- geplant: `src/components/check-in/DailyCheckInSheet.tsx`,
  `src/components/flight/FlightCompletionSequence.tsx`

## Risiken

- Eine tägliche Animation von 6–9 s wird bei täglicher Nutzung schnell lang. Die
  Überspringen-Option muss jederzeit erreichbar bleiben.
- Bewegung muss exakt zur berechneten Änderung passen, sonst wirkt die Aussage unehrlich.
  Deshalb besitzt das Flugmodell die Bewegung, nicht die Animation.

## Performanceaspekte

Sheet und Sequenz sind DOM/Framer-Motion; die 3D-Szene läuft unverändert weiter, es kommt
nur ein Kameramoduswechsel hinzu.

## Tests

- vorhanden (E2E): Vorschau läuft, ist überspringbar, endet im erwarteten Kurs
- geplant: doppelter Tagesabschluss wird verhindert; Vorschau speichert nicht

## Abnahmekriterien

- [ ] Bottom Sheet mit allen vier Status je Aufgabe
- [ ] Vorschau ohne Speicherung
- [ ] Doppelter Tagesabschluss unmöglich
- [x] Animation überspringbar
- [ ] Alle acht Phasen
