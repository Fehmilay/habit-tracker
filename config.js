// ============================================================
// config.js – Globale Konfiguration & Konstanten
// ============================================================

const CONFIG = {
  KCAL_PER_KG: 7700,
  DEFAULT_GOAL_KG: 10,
  DEFAULT_DAILY_KCAL: -500,

  // Kategorien
  CATEGORIES: [
    { id: 'body',      name: 'Body',      icon: '💪', color: '#6c63ff' },
    { id: 'personal',  name: 'Personal',  icon: '📚', color: '#ffab40' },
    { id: 'spiritual', name: 'Spiritual', icon: '🧘', color: '#00c853' }
  ],

  // Tageszeiten
  TIME_SLOTS: [
    { id: 'morning',   name: 'Morgens',   icon: '🌅', range: '06–10 Uhr' },
    { id: 'afternoon', name: 'Tagsüber',  icon: '☀️', range: '10–18 Uhr' },
    { id: 'evening',   name: 'Abends',    icon: '🌙', range: '18–23 Uhr' },
    { id: 'anytime',   name: 'Flexibel',  icon: '⏰', range: 'Jederzeit' }
  ],

  // Frequenzen
  FREQUENCIES: [
    { id: 'daily',    name: 'Täglich',      short: 'Tägl.',   perWeek: 7 },
    { id: '5x_week',  name: '5× / Woche',   short: '5×/W',    perWeek: 5 },
    { id: '3x_week',  name: '3× / Woche',   short: '3×/W',    perWeek: 3 },
    { id: '2x_week',  name: '2× / Woche',   short: '2×/W',    perWeek: 2 },
    { id: '1x_week',  name: '1× / Woche',   short: '1×/W',    perWeek: 1 }
  ],

  // Standard-Habits mit Tageszeit + Frequenz
  DEFAULT_HABITS: [
    { id: 'h1', name: 'Workout',        category: 'body',      icon: '🏋️', timeSlot: 'morning',   frequency: 'daily' },
    { id: 'h2', name: '10k Schritte',   category: 'body',      icon: '🚶',  timeSlot: 'afternoon', frequency: 'daily' },
    { id: 'h3', name: 'Gesund essen',   category: 'body',      icon: '🥗',  timeSlot: 'anytime',   frequency: 'daily' },
    { id: 'h4', name: 'Wiegen',         category: 'body',      icon: '⚖️',  timeSlot: 'morning',   frequency: '2x_week' },
    { id: 'h5', name: 'Lesen',          category: 'personal',  icon: '📖',  timeSlot: 'evening',   frequency: 'daily' },
    { id: 'h6', name: 'Kein Handy 1h',  category: 'personal',  icon: '📵',  timeSlot: 'evening',   frequency: 'daily' },
    { id: 'h7', name: 'Journaling',     category: 'personal',  icon: '📝',  timeSlot: 'evening',   frequency: 'daily' },
    { id: 'h8', name: 'Meditation',     category: 'spiritual', icon: '🧘',  timeSlot: 'morning',   frequency: 'daily' },
    { id: 'h9', name: 'Dankbarkeit',    category: 'spiritual', icon: '🙏',  timeSlot: 'morning',   frequency: 'daily' }
  ],

  CIRCLE: { RADIUS: 90, STROKE_WIDTH: 14, SIZE: 220 },

  STORAGE_KEYS: {
    GOAL: 'ht_goal',
    KCAL_ENTRIES: 'ht_kcal_entries',
    HABITS: 'ht_habits',
    CHECKS: 'ht_checks_v2',     // v2: { date: { habitId: { status, reason } } }
    JOURNAL: 'ht_journal',
    AVATAR: 'ht_avatar'
  },

  COLORS: {
    PRIMARY: '#6c63ff',
    SUCCESS: '#00c853',
    DANGER: '#ff5252',
    WARNING: '#ffab40',
    BG_DARK: '#0a0a0a',
    CARD_BG: '#1a1a2e',
    TEXT: '#e0e0e0',
    TEXT_MUTED: '#888'
  },

  // Motivations-Zitate
  QUOTES: [
    'Discipline is the bridge between goals and accomplishment.',
    'Small daily improvements lead to stunning results.',
    'Du musst nicht perfekt sein – nur konsistent.',
    'Jeder Tag zählt. Fang jetzt an.',
    'The pain of discipline is far less than the pain of regret.',
    'Erfolg ist die Summe kleiner Anstrengungen.',
    'Mach es heute, damit dein zukünftiges Ich dir dankt.',
    'Gib nicht auf. Große Dinge brauchen Zeit.',
    'Your body hears everything your mind says.',
    'Fortschritt, nicht Perfektion.'
  ]
};

