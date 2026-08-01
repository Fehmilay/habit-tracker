# Flight Habit

Flight Habit macht die langfristige Wirkung täglicher Gewohnheiten als persönlichen
Langstreckenflug sichtbar. Die aktive Next.js-App liegt im Repository-Root; der frühere
Vanilla-JS-Habit-Tracker bleibt vollständig unter `archive/legacy-habit-tracker/`
archiviert und ist nicht Teil des Builds.

## Produktfluss

Die App besteht aus drei horizontalen Fullscreen-Bereichen:

```text
HABITS  ←  FLUG  →  STATS
```

- **Habits:** Gewohnheiten anlegen, bearbeiten, planen und täglich als erledigt,
  teilweise, verfehlt oder nicht relevant bewerten.
- **Flug:** 3D-Flugzeug, Sollkurs, Zielflughafen, projizierter Kurs, Tagesabschluss und
  der Play-Modus.
- **Stats:** Kilometer-Versatz, Zielprognose, Korrekturtage, Habit-Einfluss, verbleibende
  Zeit und Hangar.

Beim Tagesabschluss korrigieren erledigte Habits zuerst eine bereits bestehende
Abweichung. Erst danach werden heutige Fehler addiert. Ein verfehlter wichtiger Habit
entspricht standardmäßig `+1°`. Auf 5.840 km sind `1°` ungefähr 102 km Versatz; sechs
unkorrigierte Grad führen zu rund 610 km.

## Habit Flight

Der Play-Button startet ein kurzes Ein-Daumen-Spiel in derselben 3D-Szene. Das Flugzeug
fliegt automatisch vorwärts und wird durch beschriftete Habit-Ringe gesteuert. Schwache
oder heute fällige Habits können dadurch wiederholt werden. Spielen vergibt Flight Hours,
markiert aber niemals einen echten Habit als erledigt.

Neue visuelle Flugzeuge werden nach aktiven Wochen freigeschaltet. Eine aktive Woche
benötigt vier eingecheckte Tage; Perfektion ist nicht erforderlich.

## Daten und Technik

- Next.js 16, React 19, TypeScript
- Three.js, React Three Fiber und Drei
- Zustand mit lokaler, versionierter Persistenz
- Framer Motion für Swipe- und Abschlusssequenzen
- lokale Nutzung ohne Konto; bestehende `ht_habits` können übernommen werden
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

Die E2E-Suite prüft den vollständigen Produktfluss auf fünf Viewports von 375×667 bis
1440×900.
