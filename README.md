# 🎯 Habit Tracker PWA – Chibi-Buddy Edition

Moderner Habit-Tracker mit **personalisierbarem Chibi-Avatar** und Tamagotchi-Mechanik.
Drei Lebensbereiche: **Body**, **Personal**, **Spiritual**.

## 📁 Dateien

```
habit-tracker/
├── index.html          – Entry Point
├── styles.css          – Dark Mode Styles
├── config.js           – Konfiguration (Habits, Decay, Journal-Fragen)
├── storage.js          – localStorage Persistenz
├── avatar.js           – Chibi-Buddy SVG mit Customization + States
├── app.js              – Hauptlogik (Views, Slide, Journal, Chart)
├── manifest.json       – PWA Manifest
├── service-worker.js   – Offline Caching
└── icons/              – App Icons (192 + 512)
```

## 🚀 Lokal starten

**VS Code Live Server** (empfohlen):
1. Ordner in VS Code öffnen
2. Extension "Live Server" installieren
3. Rechtsklick auf `index.html` → "Open with Live Server"

**Alternativ:**
```bash
npx serve .          # oder
python -m http.server 8080
```

## 🌐 Deploy auf Vercel

1. GitHub-Repo erstellen, `habit-tracker/` Ordner pushen
2. [vercel.com](https://vercel.com) → "New Project" → Repo auswählen
3. Root Directory: `habit-tracker` (falls Subfolder)
4. Framework: "Other" → Deploy

Oder per CLI: `npx vercel`

## 📱 PWA auf iPhone

1. Vercel-URL in Safari öffnen
2. Teilen-Symbol → "Zum Home-Bildschirm"
3. App läuft standalone + offline

## 🎮 Features

- **Day Sliding**: Im Today-View nach links/rechts wischen für gestern/morgen
- **Chibi-Buddy**: Cute personalisierter Avatar mit 6 Optionen (Frisur, Bart, Hautton, Outfit, Accessoire, Augenbrauen)
- **Visuelle Zustände**: Avatar reagiert auf vernachlässigte Bereiche (müde, gestresst, verträumt...)
- **Journal**: 5 tägliche Reflexionsfragen pro Tag
- **Need-System**: Decay/Gain mit Recovery-Modus
- **Monatsansicht**: Kalender-Grid zum schnellen Abhaken
- **Insights**: Chart.js Diagramm, Streaks, Wochen-Übersicht
- **Rest Day**: 1x/Woche, halbiert Decay
- **Custom Habits**: Hinzufügen/löschen, Kategorie änderbar
- **Export/Import**: JSON Backup
