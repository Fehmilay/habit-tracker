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

  // Habit-Kategorien (aus Manifest: Body, Personal, Spiritual)
  CATEGORIES: ['Body', 'Personal', 'Spiritual'],

  // SVG Kreis-Parameter
  CIRCLE: {
    RADIUS: 90,
    STROKE_WIDTH: 14,
    SIZE: 220
  },

  // LocalStorage Keys
  STORAGE_KEYS: {
    GOAL: 'ht_goal',
    ENTRIES: 'ht_entries',
    HABITS: 'ht_habits',
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

