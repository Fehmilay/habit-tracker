# 15 – Retention: Kette, Abwesenheit, Meilensteine

## Warum es dieses Kapitel gibt

Die App hatte eine funktionierende Metapher und keine Rückkehrschleife. Wer sie eine
Woche nicht öffnete, verlor nichts: der Kurs bewegte sich nur beim Bestätigen eines
Tages, also kostete Nichtstun `0°`, während ein ehrliches „nicht erledigt" bis zu `3°`
kostete. Die dominante Strategie war, die App nicht mehr zu öffnen — genau das
Verhalten, gegen das das Produkt existiert.

Dieses Kapitel beschreibt die drei Systeme, die das beheben.

## 1. Die Kette

`src/lib/journey/streak.ts`

- Ein Tag zählt ab **50 % Erfüllung** (`STREAK_MIN_COMPLETION`).
- **Ruhetage** — Tage ohne fälligen Habit — sind durchlässig: sie brechen die Kette
  nicht und verlängern sie nicht. Ohne diese Regel verliert jemand mit einem
  Werktags-Habit jeden Samstag seine Kette.
- **Gefrorene Tage** (Kettenschutz) sind ebenfalls durchlässig.
- Die Kette wird **aus den Aufzeichnungen berechnet**, nie als Zähler gespeichert. Ein
  gespeicherter Zähler driftet, sobald ein Datensatz importiert oder migriert wird, und
  eine Kette, die still falsch sein kann, ist schlechter als keine.
- `atRisk` markiert einen offenen heutigen Tag, ohne die Länge schon zu verlieren.

## 2. Abwesenheit wird abgerechnet

`journeyStore.reconcileCalendar()`

Läuft beim Start und bei jedem Wechsel in den Vordergrund. Jeder fällige Tag ohne
Check-in wird als verpasst geschlossen (`autoMissed: true`), der Kurs bewegt sich
entsprechend, und beim nächsten Öffnen erklärt die `ReturnCard`, was es gekostet hat.

Drei Grenzen halten das fair:

- **Gestern bleibt offen.** Der Sweep endet bei `heute − 2`; der Vortag lässt sich genau
  einen Tag lang von Hand nachtragen (`backfillDay`).
- **Kein Rückgriff vor den letzten Sweep.** `lastReconciledDate` ist die Untergrenze,
  sonst würde ein Update Monate alter „kostenloser" Tage rückwirkend abrechnen.
- **Nichts vor der Existenz des Habits.** Tage vor `createdAt` sind keine Versäumnisse.

Ehrlichkeit darf nie teurer sein als Schweigen — deshalb hat `not_relevant` jetzt einen
eigenen Knopf in der Bewertungszeile. Ein Krankheitstag ist kein verfehlter Tag.

## 3. Reserve und Kettenschutz

`src/lib/game/economy.ts`

Der frühere Treibstoff-Tank war eine tote Währung: er wurde befüllt, angezeigt und nie
ausgegeben. Er ist jetzt der **Reservetank**, der genau eine Sache kauft — einen Tag
Kettenschutz für 30 %, automatisch beim nächsten Check-in eingesetzt (abschaltbar).

Reserve entsteht **ausschließlich** aus echten Habit-Ergebnissen. Kein Ring im Spiel
füllt sie, denn eine erflogene Kette wäre gelogen.

## 4. Meilensteine

`src/lib/game/achievements.ts`

Reine Prädikate über einen Zustands-Snapshot, nicht Ereignisse im Moment des Erreichens.
Ein importiertes oder repariertes Profil kommt damit mit den richtigen Abzeichen an, und
kein Meilenstein kann doppelt oder durch einen verpassten Callback gar nicht vergeben
werden. Ausgewertet nach Check-in, Nachtrag, Fokuslandung und Zyklus-Landung.

## 5. Erinnerungen

`src/lib/notifications/reminders.ts`

Zwei lokale Benachrichtigungen, beide abbestellbar, keine an jemanden, der den Tag schon
geschlossen hat: die Erinnerung zur gewählten Stunde und ein „letzter Aufruf", der nur
feuert, solange der Tag offen ist. Nativ über Capacitor geplant; im Browser nur als
In-Page-Timer, was die Einstellungen auch so benennen.

## Tests

- `src/lib/journey/streak.test.ts` – Kette, Ruhetage, Frost, Rekord
- `src/store/journeyStore.test.ts` – Sweep, Gnadentag, Idempotenz, Nachtrag, Import
- `src/lib/game/achievements.test.ts` – Prädikate und Fortschritt
- `e2e/flight-scene.spec.ts` – Setup, Kettenmoment, Instrumente
