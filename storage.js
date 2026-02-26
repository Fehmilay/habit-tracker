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

  // ---- Ziel (Goal) ----
  getGoal() {
    return this._get(CONFIG.STORAGE_KEYS.GOAL) || {
      targetKg: CONFIG.DEFAULT_GOAL_KG,
      mode: 'deficit'   // 'deficit' = abnehmen, 'surplus' = zunehmen
    };
  },
  setGoal(goal) {
    this._set(CONFIG.STORAGE_KEYS.GOAL, goal);
  },

  // ---- Tägliche kcal-Einträge ----
  // Format: { "2026-02-26": -500, "2026-02-27": -300, ... }
  getEntries() {
    return this._get(CONFIG.STORAGE_KEYS.ENTRIES) || {};
  },
  setEntry(dateStr, kcal) {
    const entries = this.getEntries();
    entries[dateStr] = kcal;
    this._set(CONFIG.STORAGE_KEYS.ENTRIES, entries);
  },
  removeEntry(dateStr) {
    const entries = this.getEntries();
    delete entries[dateStr];
    this._set(CONFIG.STORAGE_KEYS.ENTRIES, entries);
  },
  getTotalKcal() {
    const entries = this.getEntries();
    return Object.values(entries).reduce((sum, v) => sum + v, 0);
  },

  // ---- Habits ----
  getHabits() {
    return this._get(CONFIG.STORAGE_KEYS.HABITS) || [];
  },
  setHabits(habits) {
    this._set(CONFIG.STORAGE_KEYS.HABITS, habits);
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
  }
};

