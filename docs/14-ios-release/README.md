# iOS-Release und App-Review

## Build

```bash
npm run build:ios
npm run open:ios
```

In Xcode das Scheme **App** wählen, ein physisches iPhone oder einen Simulator auswählen und anschließend **Product → Archive** nutzen. Der Bundle-Identifier ist `com.fehmilay.flighthabit`. Vor dem ersten Upload muss er im Apple Developer Account registriert werden.

## App-Review-Notiz zum Einfügen

> Flight Habit ist eine lokale Habit- und Fokus-App. Es gibt keinen Login, keine bezahlten Inhalte und keine externen Accounts. Um den Kernablauf zu prüfen: In „Habits“ beim gewünschten Habit auf den Play-Button tippen. Der Fokusflug läuft für die hinterlegte Dauer. Bei erfolgreicher Landung wird der Habit als erledigt markiert. Wenn die App länger als 60 Sekunden verlassen wird, stürzt der Flug ab. Benachrichtigungen sind optional und werden nur für einen laufenden Fokusflug genutzt.

## Datenschutzangaben

- Daten werden nicht an einen Server übertragen.
- Es gibt keine Werbung, Analyse-SDKs oder Tracker. Die optionale Weltkarte lädt Kartenkacheln von OpenFreeMap/OpenStreetMap; diese technische Verbindung wird in der Datenschutzseite offengelegt.
- Ziele, Habits, Check-ins und Fokusflüge bleiben lokal auf dem Gerät.
- App Privacy: kein Tracking und keine mit Habit-Daten verknüpften Serverdaten. Die technische Kartenverbindung muss anhand der zum Release gültigen OpenFreeMap-Datenschutzhinweise in App Store Connect angegeben werden.
- Datenschutz-URL nach dem Deployment: `https://<deine-domain>/privacy`

## Vor dem Absenden

- In Xcode ein echtes Team für die Signierung auswählen.
- Die endgültige Support-URL und Support-E-Mail in App Store Connect hinterlegen.
- Die Datenschutz-URL der produktiven Vercel-Domain eintragen.
- Aktuelle Screenshots für 6,7-Zoll-iPhone und 12,9-Zoll-iPad aus dem Release-Build aufnehmen.
- Altersfreigabe und Kategorie „Health & Fitness“ in App Store Connect setzen.
- Einmal auf einem echten iPhone die optionale Benachrichtigungsabfrage und die 60-Sekunden-Rückkehrregel testen.

Die App benötigt keine Login-Daten, keine Kamera, kein Mikrofon und keine Standortfreigabe.
