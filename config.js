// ============================================================
// config.js – Zentrale Konfiguration für den Habit-Tracker
// ============================================================
// Setze enableSync auf true und fülle die firebase-Daten aus,
// um Cloud-Sync via Firestore + Google Sign-In zu aktivieren.
// ============================================================

const config = {
  // ---- Sync-Modus (false = nur localStorage) ----
  enableSync: false,

  // ---- Firebase-Konfiguration (nur wenn enableSync = true) ----
  firebase: {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  },

  // ---- Default-Habits (beim ersten Start) ----
  defaultHabits: [
    { id: 'h1', name: 'Daily Beten',       category: 'spiritual', createdAt: Date.now(), deleted: false },
    { id: 'h2', name: 'Gym / Sport',       category: 'body',      createdAt: Date.now(), deleted: false },
    { id: 'h3', name: '-1000 kcal Defizit', category: 'body',     createdAt: Date.now(), deleted: false },
    { id: 'h4', name: 'Uni / Arbeit',      category: 'personal',  createdAt: Date.now(), deleted: false },
    { id: 'h5', name: 'Bewerbung',         category: 'personal',  createdAt: Date.now(), deleted: false }
  ],

  // ---- Need-System – Decay pro Tag (wenn nichts getan) ----
  decay: {
    body: 3,
    personal: 2,
    spiritual: 2
  },

  // ---- Need-System – Gain pro Habit-Completion ----
  gain: {
    'h1': 10,   // Daily Beten
    'h2': 10,   // Gym / Sport
    'h3': 8,    // -1000 kcal
    'h4': 8,    // Uni / Arbeit
    'h5': 12    // Bewerbung
  },

  // ---- Max Gain pro Kategorie pro Tag ----
  dailyGainCap: 15,

  // ---- Neglect-Schwellen ----
  neglectThresholds: {
    low: 59,        // ≤ 59 → LOW
    neglected: 30   // < 30 → NEGLECTED
  },

  // ---- Recovery: x aufeinanderfolgende Tage nötig ----
  recoveryDaysRequired: 3,

  // ---- Rest-Day: max 1 pro Woche, halbiert Decay ----
  maxRestDaysPerWeek: 1
};
