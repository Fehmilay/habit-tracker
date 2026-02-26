// ============================================================
// storage.js – LocalStorage-Persistenz
// ============================================================

const Storage = {
  // ---- Generisch ----
  _get(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  _set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },

  // ---- Ziel (kg / kcal Goal) ----
  getGoal() {
    return this._get(CONFIG.STORAGE_KEYS.GOAL) || {
      targetKg: CONFIG.DEFAULT_GOAL_KG,
      mode: 'deficit'
    };
  },
  setGoal(goal) {
    this._set(CONFIG.STORAGE_KEYS.GOAL, goal);
  },

  // ---- Tägliche kcal-Einträge ----
  // { "2026-02-26": -500, ... }
  getKcalEntries() {
    return this._get(CONFIG.STORAGE_KEYS.KCAL_ENTRIES) || {};
  },
  setKcalEntry(dateStr, kcal) {
    const entries = this.getKcalEntries();
    entries[dateStr] = kcal;
    this._set(CONFIG.STORAGE_KEYS.KCAL_ENTRIES, entries);
  },
  removeKcalEntry(dateStr) {
    const entries = this.getKcalEntries();
    delete entries[dateStr];
    this._set(CONFIG.STORAGE_KEYS.KCAL_ENTRIES, entries);
  },
  getTotalKcal() {
    const entries = this.getKcalEntries();
    return Object.values(entries).reduce((sum, v) => sum + v, 0);
  },

  // ---- Habits ----
  getHabits() {
    const h = this._get(CONFIG.STORAGE_KEYS.HABITS);
    if (h && h.length > 0) return h;
    // Beim ersten Start Default-Habits anlegen
    this.setHabits(CONFIG.DEFAULT_HABITS);
    return CONFIG.DEFAULT_HABITS;
  },
  setHabits(habits) {
    this._set(CONFIG.STORAGE_KEYS.HABITS, habits);
  },
  addHabit(habit) {
    const habits = this.getHabits();
    habits.push(habit);
    this.setHabits(habits);
  },
  removeHabit(id) {
    const habits = this.getHabits().filter(h => h.id !== id);
    this.setHabits(habits);
    // Auch alle Checks für dieses Habit löschen
    const checks = this.getAllChecks();
    for (const date in checks) {
      checks[date] = checks[date].filter(hid => hid !== id);
    }
    this._set(CONFIG.STORAGE_KEYS.CHECKS, checks);
  },

  // ---- Habit Checks (pro Tag) ----
  // { "2026-02-26": ["h1","h3"], ... }
  getAllChecks() {
    return this._get(CONFIG.STORAGE_KEYS.CHECKS) || {};
  },
  getChecks(dateStr) {
    const all = this.getAllChecks();
    return all[dateStr] || [];
  },
  toggleCheck(dateStr, habitId) {
    const all = this.getAllChecks();
    if (!all[dateStr]) all[dateStr] = [];
    const idx = all[dateStr].indexOf(habitId);
    if (idx >= 0) {
      all[dateStr].splice(idx, 1);
    } else {
      all[dateStr].push(habitId);
    }
    this._set(CONFIG.STORAGE_KEYS.CHECKS, all);
    return all[dateStr];
  },
  isChecked(dateStr, habitId) {
    return this.getChecks(dateStr).includes(habitId);
  },

  // ---- Avatar State ----
  getAvatar() {
    return this._get(CONFIG.STORAGE_KEYS.AVATAR) || { mood: 'neutral', streak: 0 };
  },
  setAvatar(state) {
    this._set(CONFIG.STORAGE_KEYS.AVATAR, state);
  },

  // ---- Hilfsfunktionen ----
  todayStr() {
    return new Date().toISOString().slice(0, 10);
  },
  generateId() {
    return 'h' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  }
};

