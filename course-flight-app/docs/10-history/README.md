# 10 – Verlauf, Datenbank und Persistenz

> **Status: geplant (Phase 6).** In Phase 1 gibt es keine Persistenz, keine
> Authentifizierung und keine Verlaufsseite. Der Navigationspunkt „Verlauf“ ist sichtbar,
> aber ohne Funktion.

## Ziel

Eine eigene Verlaufsseite, die die Reise über die Zeit zeigt, sowie Persistenz und – falls
technisch sauber – Übernahme sinnvoller Backend-Teile des alten Habit Trackers.

## Technische Umsetzung

Inhalte der Verlaufsseite:

- Tagesliste
- Verlauf der Gradabweichung
- Verlauf der Kilometerabweichung
- Verlauf der Zielprognose
- bisherige Route auf einer Karte
- stärkste Abweichung, stärkste Korrektur
- Anzahl erfolgreicher Tage bis 0°
- Replay vergangener Tagesabschlussanimationen

**Persistenz.** Zuerst lokal (IndexedDB), damit die App offline und als PWA/Capacitor-App
ohne Konto nutzbar ist. Ein synchronisierendes Backend kommt danach.

**Altbestand.** Der alte Habit Tracker ist eine reine Vanilla-JS-PWA im Repository-Root
(`app.js`, `storage.js`, `config.js`) mit lokalem Speicher. Er bringt **kein**
serverseitiges Backend und **keine** Authentifizierung mit, die übernommen werden könnte.
Übernommen wird deshalb voraussichtlich höchstens konzeptionelles Datenmodell-Wissen, kein
Code. Diese Einschätzung ist vor Phase 6 erneut zu prüfen.

**Replay.** Weil das Flugmodell deterministisch ist und die Kurslogik keine Zufallswerte
enthält, genügt es, Datum, Aufgabenstatus und Vorabweichung zu speichern – die Animation
lässt sich daraus exakt reproduzieren. Es müssen keine Frames aufgezeichnet werden.

## Dateien (geplant)

- `src/app/verlauf/page.tsx`
- `src/lib/storage/*`
- `src/components/history/*`

## Risiken

- Gesundheits- und Gewohnheitsdaten sind sensibel. Lokal zuerst, Synchronisierung nur
  bewusst und erklärt.
- Zeitzonen und Tageswechsel sind die klassische Fehlerquelle bei Tagebuch-Apps; das
  Flughafen-Datenmodell enthält deshalb bereits `timezone`.

## Performanceaspekte

Verlaufsdiagramme dürfen die 3D-Szene nicht gleichzeitig laden; eigene Route, eigener
Bundle-Split.

## Tests (geplant)

- Persistenz überlebt einen Reload
- Replay eines gespeicherten Tages ergibt exakt dieselbe Endabweichung
- Tageswechsel über Zeitzonengrenzen

## Abnahmekriterien

- [ ] Verlaufsseite mit allen genannten Inhalten
- [ ] Persistenz
- [ ] Route-Replay
