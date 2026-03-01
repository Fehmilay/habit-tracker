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
      let migrated = false;
      h.forEach(hab => {
        if (!hab.timeSlot) { hab.timeSlot = 'anytime'; migrated = true; }
        // Migration: frequency → days (Wochentag-Array)
        if (!hab.days) {
          const map = { 'daily':[0,1,2,3,4,5,6], '5x_week':[0,1,2,3,4], '3x_week':[0,2,4], '2x_week':[0,3], '1x_week':[0] };
          hab.days = map[hab.frequency] || [0,1,2,3,4,5,6];
          delete hab.frequency;
          migrated = true;
        }
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

  // ---- Wochentag-basiert: Ist Habit heute fällig? ----
  isHabitDueToday(habit, dateStr) {
    if (!habit.days || habit.days.length === 0 || habit.days.length === 7) return true;
    const d = new Date(dateStr + 'T12:00:00');
    const dow = (d.getDay() + 6) % 7; // Mo=0 … So=6
    return habit.days.includes(dow);
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

  // ---- Evening Check-in ----
  getAllCheckins() { return this._get(CONFIG.STORAGE_KEYS.CHECKIN) || {}; },
  getCheckin(d) { return this.getAllCheckins()[d] || null; },
  setCheckin(d, data) {
    const all = this.getAllCheckins(); all[d] = data;
    this._set(CONFIG.STORAGE_KEYS.CHECKIN, all);
  },
  getCheckinStreaks() {
    return this._get(CONFIG.STORAGE_KEYS.CHECKIN_STREAKS) || {
      body: { daysMissed: 0 }, personal: { daysMissed: 0 }, spiritual: { daysMissed: 0 }
    };
  },
  setCheckinStreaks(s) { this._set(CONFIG.STORAGE_KEYS.CHECKIN_STREAKS, s); },
  updateStreaksAfterCheckin(areas) {
    const streaks = this.getCheckinStreaks();
    for (const cat of ['body', 'personal', 'spiritual']) {
      if (!areas[cat]) continue;
      if (areas[cat].status === 'done' || areas[cat].status === 'redeemed') {
        streaks[cat].daysMissed = 0;
      } else if (areas[cat].status === 'missed') {
        streaks[cat].daysMissed = (streaks[cat].daysMissed || 0) + 1;
      }
    }
    this.setCheckinStreaks(streaks);
    return streaks;
  },

  // ---- Cloud Sync (JSONBlob) ----
  getSyncId() { return localStorage.getItem(CONFIG.STORAGE_KEYS.SYNC_ID) || ''; },
  setSyncId(id) { localStorage.setItem(CONFIG.STORAGE_KEYS.SYNC_ID, id || ''); },
  getAllData() {
    return {
      goal: this.getGoal(), kcal: this.getKcalEntries(), habits: this.getHabits(),
      checks: this.getAllChecks(), journal: this.getAllJournals(),
      checkin: this.getAllCheckins(), checkinStreaks: this.getCheckinStreaks(),
      compensations: this.getAllCompensations(), compSettings: this.getCompSettings(),
      _syncedAt: new Date().toISOString()
    };
  },
  importAllData(data) {
    if (data.goal)     this.setGoal(data.goal);
    if (data.kcal)     this._set(CONFIG.STORAGE_KEYS.KCAL_ENTRIES, data.kcal);
    if (data.habits)   this.setHabits(data.habits);
    if (data.checks)   this._set(CONFIG.STORAGE_KEYS.CHECKS, data.checks);
    if (data.journal)  this._set(CONFIG.STORAGE_KEYS.JOURNAL, data.journal);
    if (data.checkin)  this._set(CONFIG.STORAGE_KEYS.CHECKIN, data.checkin);
    if (data.checkinStreaks) this.setCheckinStreaks(data.checkinStreaks);
    if (data.compensations) this._set(CONFIG.STORAGE_KEYS.COMPENSATION, data.compensations);
    if (data.compSettings) this.setCompSettings(data.compSettings);
  },
  async syncPush() {
    const data = this.getAllData();
    const id = this.getSyncId();
    try {
      if (id) {
        await fetch(`${CONFIG.SYNC_API}/${id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        return id;
      } else {
        const res = await fetch(CONFIG.SYNC_API, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const loc = res.headers.get('Location') || '';
        const newId = loc.split('/').pop();
        if (newId) this.setSyncId(newId);
        return newId;
      }
    } catch (e) { console.error('Sync push failed:', e); return null; }
  },
  async syncPull(id) {
    try {
      const res = await fetch(`${CONFIG.SYNC_API}/${id}`);
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      this.importAllData(data);
      this.setSyncId(id);
      return true;
    } catch (e) { console.error('Sync pull failed:', e); return false; }
  },

  // ---- Compensations ----
  getAllCompensations() { return this._get(CONFIG.STORAGE_KEYS.COMPENSATION) || {}; },
  getCompensations(d) { return this.getAllCompensations()[d] || {}; },
  setCompensation(d, cat, done) {
    const all = this.getAllCompensations();
    if (!all[d]) all[d] = {};
    all[d][cat] = done;
    this._set(CONFIG.STORAGE_KEYS.COMPENSATION, all);
  },
  getRequiredCompensations(dateStr) {
    const habits = this.getHabits();
    const dayChecks = this.getDayChecks(dateStr);
    const result = {};
    for (const cat of ['body', 'personal', 'spiritual']) {
      const skipped = habits.filter(h =>
        h.category === cat && this.isHabitDueToday(h, dateStr) && dayChecks[h.id]?.status === 'skipped'
      ).length;
      if (skipped > 0) {
        const comp = this.getCompForCategory(cat);
        result[cat] = { count: skipped, total: skipped * comp.perMiss, comp };
      }
    }
    return result;
  },
  areCompensationsDone(dateStr) {
    const required = this.getRequiredCompensations(dateStr);
    const done = this.getCompensations(dateStr);
    for (const cat in required) {
      if (!done[cat]) return false;
    }
    return true;
  },

  // ---- Compensation Settings (user-customized per category) ----
  getCompSettings() {
    return this._get(CONFIG.STORAGE_KEYS.COMP_SETTINGS) || {};
  },
  setCompSettings(settings) {
    this._set(CONFIG.STORAGE_KEYS.COMP_SETTINGS, settings);
  },
  getCompForCategory(cat) {
    const custom = this.getCompSettings();
    if (custom[cat]) return custom[cat];
    return CONFIG.COMPENSATIONS[cat];
  },

  // ---- Avatar ----
  getAvatar() { return this._get(CONFIG.STORAGE_KEYS.AVATAR) || { mood: 'neutral', streak: 0 }; },
  setAvatar(s) { this._set(CONFIG.STORAGE_KEYS.AVATAR, s); },

  // ---- Helpers ----
  todayStr() { return new Date().toISOString().slice(0, 10); },
  generateId() { return 'h' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }
};

