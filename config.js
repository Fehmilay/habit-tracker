// ============================================================
// config.js – Globale Konfiguration & Konstanten
// ============================================================

const CONFIG = {
  // 1 kg Körperfett ≈ 7 700 kcal
  KCAL_PER_KG: 7700,

  // Standard-Ziel: 10 kg abnehmen
  DEFAULT_GOAL_KG: 10,

  // Standard tägliches Defizit (negativ = abnehmen, positiv = zunehmen)
  DEFAULT_DAILY_KCAL: -500,

  // Habit-Kategorien
  CATEGORIES: [
    { id: 'body',      name: 'Body',      icon: '💪', color: '#6c63ff' },
    { id: 'personal',  name: 'Personal',  icon: '📚', color: '#ffab40' },
    { id: 'spiritual', name: 'Spiritual', icon: '🧘', color: '#00c853' }
  ],

  // Standard-Habits (werden beim ersten Start angelegt)
  DEFAULT_HABITS: [
    { id: 'h1', name: 'Workout',      category: 'body',      icon: '🏋️' },
    { id: 'h2', name: '10k Schritte', category: 'body',      icon: '🚶' },
    { id: 'h3', name: 'Gesund essen', category: 'body',      icon: '🥗' },
    { id: 'h4', name: 'Lesen',        category: 'personal',  icon: '📖' },
    { id: 'h5', name: 'Kein Handy 1h',category: 'personal',  icon: '📵' },
    { id: 'h6', name: 'Meditation',   category: 'spiritual', icon: '🧘' },
    { id: 'h7', name: 'Dankbarkeit',  category: 'spiritual', icon: '🙏' }
  ],

  // SVG Kreis-Parameter
  CIRCLE: {
    RADIUS: 90,
    STROKE_WIDTH: 14,
    SIZE: 220
  },

  // LocalStorage Keys
  STORAGE_KEYS: {
    GOAL: 'ht_goal',
    KCAL_ENTRIES: 'ht_kcal_entries',
    HABITS: 'ht_habits',
    CHECKS: 'ht_checks',
    AVATAR: 'ht_avatar'
  },

  // Farben
  COLORS: {
    PRIMARY: '#6c63ff',
    SUCCESS: '#00c853',
    DANGER: '#ff5252',
    WARNING: '#ffab40',
    BG_DARK: '#0a0a0a',
    CARD_BG: '#1a1a2e',
    TEXT: '#e0e0e0',
    TEXT_MUTED: '#888'
  }
};

