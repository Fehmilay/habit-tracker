# Flight Habit

Flight Habit macht die langfristige Wirkung täglicher Gewohnheiten als persönlichen
Langstreckenflug sichtbar. Die aktive Next.js-App liegt im Repository-Root; der frühere
Vanilla-JS-Habit-Tracker bleibt vollständig unter `archive/legacy-habit-tracker/`
archiviert und ist nicht Teil des Builds.

## Produktfluss

Beim ersten Start führt ein vierstufiges Setup durch Ziel, Route, Habits und
Erinnerungszeit. Danach besteht die App aus drei horizontalen Fullscreen-Bereichen:

```text
HABITS  ←  FLUG  →  STATS
```

- **Habits:** Kette, Schnellbewertung, Gewohnheiten anlegen, bearbeiten, planen und
  täglich als erledigt, teilweise, verfehlt oder nicht relevant bewerten. Der Vortag
  lässt sich genau einen Tag lang nachtragen.
- **Flug:** 3D-Flugzeug, Instrumentenleiste, Sollkurs, Zielflughafen, projizierter Kurs,
  Tagesabschluss und der Play-Modus.
- **Stats:** Kette, Wochenrückblick, Monatsverlauf, Kilometer-Versatz, Zielprognose,
  Korrekturtage, Habit-Einfluss, Meilensteine und Hangar.

Beim Tagesabschluss korrigieren erledigte Habits zuerst eine bereits bestehende
Abweichung. Erst danach werden heutige Fehler addiert. Ein verfehlter wichtiger Habit
entspricht standardmäßig `+1°`. Auf 5.840 km sind `1°` ungefähr 102 km Versatz; sechs
unkorrigierte Grad führen zu rund 610 km.

## Das Flugzeug als Werkzeug

Jedes Instrument zeigt eine echte Größe aus dem Habit-Protokoll in der Einheit, in der
ein Pilot sie ablesen würde. Nichts davon ist Dekoration, und nichts ist geglättet.

| Instrument | Bedeutung | Formel |
| --- | --- | --- |
| `ALT` | Kette | 1.000 ft je Tag am Stück, Reiseflughöhe bei 35 Tagen |
| `SPD` | Momentum | gewichtete Erfüllung der letzten 7 Tage → 140–540 kt |
| `V/S` | Trend | letzte 4 Tage gegen die 7 davor → ±2.500 fpm |
| `TDY` | heute | bewertete von fälligen Habits, gewichtet nach Einfluss |
| `FUEL` | Reserve | Kettenschutz-Tank, 30% pro überbrücktem Tag |
| `ETA` | Ankunft | zurückgelegte Etappen gegen das aktuelle Tempo |
| `XTK` | Querabweichung | Kilometer neben dem Zielflughafen |

Die Leiste liegt permanent unter dem Header; ein Tap öffnet das volle Panel mit
künstlichem Horizont, Erklärung je Instrument und der einen Handlung, die als Nächstes
zählt. Die Logik liegt vollständig in `src/lib/flight/instruments.ts` und ist ohne
Renderer testbar.

## Kette, Reserve und Comeback

- Ein Tag zählt ab 50% Erfüllung. Ruhetage ohne fälligen Habit unterbrechen nichts.
- Die Kette wird aus den Aufzeichnungen berechnet, nie als Zähler gespeichert - ein
  Import oder eine Migration kann sie damit nicht verfälschen.
- Erledigte Habits füllen die Reserve. Ab 30% überbrückt sie automatisch einen
  verpassten Tag (maximal zwei pro Check-in), abschaltbar in den Einstellungen.
- Verfehlte Habits erzeugen Comeback-Missionen, die einen Teil des Kurses zurückholen.

## Habit Flight

Der Play-Button startet ein kurzes Ein-Daumen-Spiel in derselben 3D-Szene. Das Flugzeug
fliegt automatisch vorwärts und wird durch beschriftete Habit-Ringe gesteuert. Heute
noch offene Habits leuchten golden, sodass der Zeitvertreib die offene Liste wiederholt.
Spielen vergibt Flight Hours, markiert aber niemals einen echten Habit als erledigt und
füllt niemals die Reserve.

Neue visuelle Flugzeuge werden über Level freigeschaltet, Meilensteine über echte
Check-ins, Ketten, perfekte Tage, Fokusminuten und Landungen.

## Daten und Technik

- Next.js 16, React 19, TypeScript
- Three.js, React Three Fiber und Drei
- Zustand mit lokaler, versionierter Persistenz (`v3`) inklusive Migration
- Framer Motion für Swipe- und Abschlusssequenzen
- lokale Nutzung ohne Konto; bestehende `ht_habits` können übernommen werden
- Export und Import des kompletten Profils als JSON - das einzige Backup, das es gibt
- Lokale Erinnerungen (Capacitor auf iOS, In-Page-Fallback im Browser)
- WebGL-Fallback und Reduced-Motion-Unterstützung

## Entwicklung

```bash
npm install
npm run dev          # http://localhost:3100
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:e2e
```

Die E2E-Suite prüft den vollständigen Produktfluss - vom Setup über die Instrumente bis
zum Kettenmoment - auf fünf Viewports von 375×667 bis 1440×900.
