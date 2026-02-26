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

  // Wochentage (Mo=0 … So=6)
  WEEKDAYS: [
    { id: 0, name: 'Montag',     short: 'Mo' },
    { id: 1, name: 'Dienstag',   short: 'Di' },
    { id: 2, name: 'Mittwoch',   short: 'Mi' },
    { id: 3, name: 'Donnerstag', short: 'Do' },
    { id: 4, name: 'Freitag',    short: 'Fr' },
    { id: 5, name: 'Samstag',    short: 'Sa' },
    { id: 6, name: 'Sonntag',    short: 'So' }
  ],

  // Frequenz-Vorlagen
  FREQUENCY_PRESETS: [
    { id: 'daily', name: 'Täglich',      days: [0,1,2,3,4,5,6] },
    { id: '5x',   name: '5× / Woche',   days: [0,1,2,3,4] },
    { id: '3x',   name: '3× / Woche',   days: [0,2,4] },
    { id: '2x',   name: '2× / Woche',   days: [0,3] },
    { id: '1x',   name: '1× / Woche',   days: [0] }
  ],

  // Standard-Habits mit Tageszeit + Wochentagen
  DEFAULT_HABITS: [
    { id: 'h1', name: 'Workout',        category: 'body',      icon: '🏋️', timeSlot: 'morning',   days: [0,1,2,3,4,5,6] },
    { id: 'h2', name: '10k Schritte',   category: 'body',      icon: '🚶',  timeSlot: 'afternoon', days: [0,1,2,3,4,5,6] },
    { id: 'h3', name: 'Gesund essen',   category: 'body',      icon: '🥗',  timeSlot: 'anytime',   days: [0,1,2,3,4,5,6] },
    { id: 'h4', name: 'Wiegen',         category: 'body',      icon: '⚖️',  timeSlot: 'morning',   days: [0,3] },
    { id: 'h5', name: 'Lesen',          category: 'personal',  icon: '📖',  timeSlot: 'evening',   days: [0,1,2,3,4,5,6] },
    { id: 'h6', name: 'Kein Handy 1h',  category: 'personal',  icon: '📵',  timeSlot: 'evening',   days: [0,1,2,3,4,5,6] },
    { id: 'h7', name: 'Journaling',     category: 'personal',  icon: '📝',  timeSlot: 'evening',   days: [0,1,2,3,4,5,6] },
    { id: 'h8', name: 'Meditation',     category: 'spiritual', icon: '🧘',  timeSlot: 'morning',   days: [0,1,2,3,4,5,6] },
    { id: 'h9', name: 'Dankbarkeit',    category: 'spiritual', icon: '🙏',  timeSlot: 'morning',   days: [0,1,2,3,4,5,6] }
  ],

  CIRCLE: { RADIUS: 90, STROKE_WIDTH: 14, SIZE: 220 },

  STORAGE_KEYS: {
    GOAL: 'ht_goal',
    KCAL_ENTRIES: 'ht_kcal_entries',
    HABITS: 'ht_habits',
    CHECKS: 'ht_checks_v2',
    JOURNAL: 'ht_journal',
    AVATAR: 'ht_avatar',
    CHECKIN: 'ht_checkin',
    CHECKIN_STREAKS: 'ht_checkin_streaks',
    SYNC_ID: 'ht_sync_id'
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
  ],

  // Abend Check-in
  CHECKIN: {
    HOUR: 18,
    REFLECTION_REASONS: [
      { id: 'no_time',      label: 'Keine Zeit',      icon: '⏳' },
      { id: 'no_energy',    label: 'Keine Energie',   icon: '😴' },
      { id: 'avoided',      label: 'Vermieden',       icon: '🙈' },
      { id: 'not_priority', label: 'Nicht Priorität', icon: '📋' },
      { id: 'other',        label: 'Anderes',         icon: '❓' }
    ],
    REDEMPTION: {
      body: [
        { name: '20 Liegestütze',   type: 'count', target: 20, icon: '💪' },
        { name: '20 Kniebeugen',    type: 'count', target: 20, icon: '🦵' },
        { name: '2 Min. Bewegung',  type: 'timer', seconds: 120, icon: '🏃' }
      ],
      personal: [
        { name: '5 Min. Fokus-Timer',       type: 'timer',   seconds: 300, icon: '🎯' },
        { name: '1 Satz: Morgen-Priorität', type: 'text',    icon: '✏️' },
        { name: '1 Micro-Step erledigen',   type: 'confirm', icon: '📌' }
      ],
      spiritual: [
        { name: '3 Min. Atmen',   type: 'timer',   seconds: 180, icon: '🧘' },
        { name: '1 Seite lesen',  type: 'confirm', icon: '📖' },
        { name: '2 Min. Stille',  type: 'timer',   seconds: 120, icon: '🤫' }
      ]
    }
  },

  SYNC_API: 'https://jsonblob.com/api/jsonBlob'
};

