// ============================================================
// storage.js – LocalStorage-Persistenz (v2 mit ✓/✗ + Journal)
// ============================================================

const Storage = {
  _get(key) {
    try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : null; }
    catch { return null; }
  },
  _set(key, value) { localStorage.setItem(key, JSON.stringify(value)); },

  // ---- Goal ----
  getGoal() {
    return this._get(CONFIG.STORAGE_KEYS.GOAL) || { targetKg: CONFIG.DEFAULT_GOAL_KG, mode: 'deficit' };
  },
  setGoal(g) { this._set(CONFIG.STORAGE_KEYS.GOAL, g); },

  // ---- kcal ----
  getKcalEntries() { return this._get(CONFIG.STORAGE_KEYS.KCAL_ENTRIES) || {}; },
  setKcalEntry(d, v) { const e = this.getKcalEntries(); e[d] = v; this._set(CONFIG.STORAGE_KEYS.KCAL_ENTRIES, e); },
  removeKcalEntry(d) { const e = this.getKcalEntries(); delete e[d]; this._set(CONFIG.STORAGE_KEYS.KCAL_ENTRIES, e); },
  getTotalKcal() { return Object.values(this.getKcalEntries()).reduce((s, v) => s + v, 0); },

  // ---- Habits ----
  getHabits() {
    const h = this._get(CONFIG.STORAGE_KEYS.HABITS);
    if (h && h.length > 0) {
      // Migration: Alte Habits ohne timeSlot/frequency
      let migrated = false;
      h.forEach(hab => {
        if (!hab.timeSlot)  { hab.timeSlot = 'anytime'; migrated = true; }
        if (!hab.frequency) { hab.frequency = 'daily';   migrated = true; }
      });
      if (migrated) this.setHabits(h);
      return h;
    }
    this.setHabits(CONFIG.DEFAULT_HABITS);
    return [...CONFIG.DEFAULT_HABITS];
  },
  setHabits(h) { this._set(CONFIG.STORAGE_KEYS.HABITS, h); },
  addHabit(h)  { const all = this.getHabits(); all.push(h); this.setHabits(all); },
  removeHabit(id) {
    this.setHabits(this.getHabits().filter(h => h.id !== id));
    const checks = this.getAllChecks();
    for (const d in checks) { delete checks[d][id]; }
    this._set(CONFIG.STORAGE_KEYS.CHECKS, checks);
  },

  // ---- Checks v2 ----
  // Format: { "2026-02-26": { "h1": { status: "done" }, "h2": { status: "skipped", reason: "Krank" } } }
  getAllChecks() { return this._get(CONFIG.STORAGE_KEYS.CHECKS) || {}; },
  getDayChecks(d) { return this.getAllChecks()[d] || {}; },

  setHabitStatus(dateStr, habitId, status, reason) {
    const all = this.getAllChecks();
    if (!all[dateStr]) all[dateStr] = {};
    all[dateStr][habitId] = { status, reason: reason || '' };
    this._set(CONFIG.STORAGE_KEYS.CHECKS, all);
  },
  removeHabitStatus(dateStr, habitId) {
    const all = this.getAllChecks();
    if (all[dateStr]) { delete all[dateStr][habitId]; }
    this._set(CONFIG.STORAGE_KEYS.CHECKS, all);
  },
  getHabitStatus(dateStr, habitId) {
    const day = this.getDayChecks(dateStr);
    return day[habitId] || null; // null = not yet, { status: 'done'|'skipped', reason }
  },

  // Convenience: Anzahl "done" an einem Tag
  countDone(dateStr) {
    const day = this.getDayChecks(dateStr);
    return Object.values(day).filter(v => v.status === 'done').length;
  },
  countSkipped(dateStr) {
    const day = this.getDayChecks(dateStr);
    return Object.values(day).filter(v => v.status === 'skipped').length;
  },

  // ---- Frequenz-Check: Ist das Habit heute fällig? ----
  isHabitDueToday(habit, dateStr) {
    if (!habit.frequency || habit.frequency === 'daily') return true;
    const freq = CONFIG.FREQUENCIES.find(f => f.id === habit.frequency);
    if (!freq) return true;
    // Wochenanfang berechnen (Montag)
    const d = new Date(dateStr + 'T12:00:00');
    const dayOfWeek = (d.getDay() + 6) % 7; // Mo=0
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - dayOfWeek);
    // Wie oft wurde dieses Habit diese Woche schon "done"?
    const allChecks = this.getAllChecks();
    let doneThisWeek = 0;
    for (let i = 0; i < 7; i++) {
      const wd = new Date(weekStart);
      wd.setDate(weekStart.getDate() + i);
      const key = wd.toISOString().slice(0, 10);
      if (key === dateStr) continue; // Heutigen Tag nicht mitzählen
      if (key > dateStr) break;
      const check = allChecks[key]?.[habit.id];
      if (check?.status === 'done') doneThisWeek++;
    }
    return doneThisWeek < freq.perWeek;
  },

  // Frequenz: Wie oft diese Woche Done
  getWeeklyDoneCount(habitId, dateStr) {
    const d = new Date(dateStr + 'T12:00:00');
    const dayOfWeek = (d.getDay() + 6) % 7;
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - dayOfWeek);
    const allChecks = this.getAllChecks();
    let count = 0;
    for (let i = 0; i < 7; i++) {
      const wd = new Date(weekStart);
      wd.setDate(weekStart.getDate() + i);
      const key = wd.toISOString().slice(0, 10);
      if (allChecks[key]?.[habitId]?.status === 'done') count++;
    }
    return count;
  },

  // ---- Journal ----
  // { "2026-02-26": "Heute war gut...", ... }
  getAllJournals() { return this._get(CONFIG.STORAGE_KEYS.JOURNAL) || {}; },
  getJournal(d) { return this.getAllJournals()[d] || ''; },
  setJournal(d, text) {
    const all = this.getAllJournals();
    if (text.trim()) { all[d] = text.trim(); }
    else { delete all[d]; }
    this._set(CONFIG.STORAGE_KEYS.JOURNAL, all);
  },

  // ---- Avatar ----
  getAvatar() { return this._get(CONFIG.STORAGE_KEYS.AVATAR) || { mood: 'neutral', streak: 0 }; },
  setAvatar(s) { this._set(CONFIG.STORAGE_KEYS.AVATAR, s); },

  // ---- Helpers ----
  todayStr() { return new Date().toISOString().slice(0, 10); },
  generateId() { return 'h' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }
};

