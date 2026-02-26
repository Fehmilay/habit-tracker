# 🎯 Habit Tracker PWA

Ein moderner Habit-Tracker mit **Tamagotchi/Pou-Mechanik** – pflege deinen Avatar-Buddy durch tägliche Gewohnheiten in den Bereichen **Body**, **Personal** und **Spiritual**.

## 📁 Projektstruktur

```
habit-tracker/
├── index.html          # Haupt-HTML (Entry Point)
├── styles.css          # Dark-Mode Styles
├── config.js           # Konfiguration (Habits, Decay, Firebase)
├── storage.js          # Persistenz (localStorage / Firestore)
├── avatar.js           # 2D-Avatar SVG Rendering
├── app.js              # Hauptlogik (UI, Navigation, Game-Loop)
├── manifest.json       # PWA Manifest
├── service-worker.js   # Offline Caching
├── icons/
│   ├── icon-192.png    # App Icon 192x192
│   └── icon-512.png    # App Icon 512x512
└── README.md           # Diese Datei
```

## 🚀 Lokal starten

### Option 1: VS Code Live Server (empfohlen)
1. Öffne den `habit-tracker/` Ordner in VS Code
2. Installiere die Extension **"Live Server"** (ritwickdey.LiveServer)
3. Rechtsklick auf `index.html` → **"Open with Live Server"**
4. Die App öffnet sich im Browser unter `http://127.0.0.1:5500`

### Option 2: Python HTTP Server
```bash
cd habit-tracker
python -m http.server 8080
# Öffne http://localhost:8080
```

### Option 3: Node.js (npx serve)
```bash
cd habit-tracker
npx serve .
# Öffne die angezeigte URL
```

> **Hinweis:** Für PWA-Features (Service Worker, Install) muss die App über HTTPS oder `localhost` laufen.

## 🌐 Deploy auf Vercel

### Schnellste Methode:
1. Erstelle ein GitHub-Repository und pushe den `habit-tracker/` Ordner
2. Gehe zu [vercel.com](https://vercel.com) und logge dich ein
3. Klicke **"New Project"** → wähle dein GitHub-Repo
4. **Root Directory** auf `habit-tracker` setzen (falls es ein Subfolder ist)
5. Framework: **Other** auswählen
6. Klicke **"Deploy"**

### Oder per CLI:
```bash
npm i -g vercel
cd habit-tracker
vercel
# Folge den Anweisungen
```

Die App ist dann unter `https://dein-projekt.vercel.app` erreichbar und voll PWA-fähig.

## 📱 PWA auf iOS testen

1. Öffne die Vercel-URL in **Safari** auf dem iPhone/iPad
2. Tippe auf das **Teilen-Symbol** (Quadrat mit Pfeil nach oben)
3. Scrolle runter und tippe **"Zum Home-Bildschirm"**
4. Bestätige mit **"Hinzufügen"**
5. Die App erscheint als eigenständige App auf dem Home Screen

> Offline-Funktionalität wird automatisch durch den Service Worker bereitgestellt.

## 🔥 Firebase Sync aktivieren (optional)

Standardmäßig speichert die App alles im **localStorage** (lokal, offline-first). Um Daten zwischen Geräten zu synchronisieren:

### 1. Firebase-Projekt erstellen
1. Gehe zu [Firebase Console](https://console.firebase.google.com)
2. Erstelle ein neues Projekt
3. Aktiviere **Authentication** → Sign-in method → **Google**
4. Aktiviere **Cloud Firestore** → Erstelle eine Datenbank

### 2. Konfiguration einfügen
Öffne `config.js` und setze:
```js
const config = {
  enableSync: true,  // ← auf true setzen
  firebase: {
    apiKey: 'DEIN_API_KEY',
    authDomain: 'DEIN_PROJEKT.firebaseapp.com',
    projectId: 'DEIN_PROJEKT',
    storageBucket: 'DEIN_PROJEKT.appspot.com',
    messagingSenderId: '123456789',
    appId: '1:123456789:web:abc123'
  },
  // ... rest der config
};
```

### 3. Firebase SDKs aktivieren
Entkommentiere in `index.html` die Firebase `<script>` Tags am Ende der Datei:
```html
<script src="https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.2/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore-compat.js"></script>
```

### 4. Firestore-Regeln
Setze in der Firebase Console unter Firestore → Rules:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 🎮 Features

- **Avatar-Buddy** mit visuellen Zuständen (Haltung, Aura, Gesicht, Outfit)
- **3 Need-Bereiche**: Body, Personal, Spiritual mit Decay/Gain System
- **Neglect-Erkennung**: Warnt bei vernachlässigten Bereichen
- **Recovery-Modus**: 3 aufeinanderfolgende Tage für Erholung
- **Monatsansicht**: Kalender mit Checkboxen für jeden Tag
- **Streak-Tracking**: Aktuelle Streak pro Habit
- **Daily Score Chart**: Balkendiagramm mit Chart.js
- **Rest Day**: 1x pro Woche, halbiert Decay
- **Custom Habits**: Eigene Habits hinzufügen/löschen
- **Daten Export/Import**: JSON Backup
- **PWA**: Installierbar, Offline-fähig
- **Dark Mode**: Schwarz/Grün Design

## 📝 Lizenz

MIT – Frei nutzbar und anpassbar.
