// ============================================================
// storage.js – Persistenz (localStorage + optionaler Firestore)
// ============================================================

function todayStr(d) {
  const dt = d || new Date();
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
}

function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
  const y = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil(((d-y)/86400000+1)/7);
}

function monthStr(d) {
  const dt = d || new Date();
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`;
}

function createDefaultState() {
  return {
    month: monthStr(),
    habits: CONFIG.defaultHabits.map(h => ({...h, createdAt: Date.now(), deleted: false})),
    checks: {},
    areas: {
      body:      { value:70, daysMissed:0, status:'OK', recoveryDays:0 },
      personal:  { value:70, daysMissed:0, status:'OK', recoveryDays:0 },
      spiritual: { value:70, daysMissed:0, status:'OK', recoveryDays:0 }
    },
    buddy: {...CONFIG.buddyDefaults},
    journal: {},           // { "YYYY-MM-DD": { j1:"...", j2:"..." } }
    streaks: {},
    lastUpdateDate: todayStr(),
    dailyGain: { body:0, personal:0, spiritual:0 },
    dailyGainDate: todayStr(),
    restDaysUsedThisWeek: 0,
    currentISOWeek: isoWeek(new Date())
  };
}

// ---- localStorage Backend ----
const localBackend = {
  getState()  { try { return JSON.parse(localStorage.getItem('ht_state')); } catch { return null; } },
  saveState(s){ localStorage.setItem('ht_state', JSON.stringify(s)); },
  onRemoteUpdate(){}
};

// ---- Storage Facade ----
const storage = {
  _b: localBackend,
  async setup(){ return null; },
  async getState(){ return this._b.getState() || createDefaultState(); },
  async saveState(s){ this._b.saveState(s); },
  onRemoteUpdate(cb){ this._b.onRemoteUpdate(cb); }
};

