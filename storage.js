// ============================================================
// storage.js – Abstraktionsschicht für Persistenz
// ============================================================
// Bietet einheitliches Interface: getState / saveState / onRemoteUpdate
// Je nach config.enableSync → localStorage ODER Firestore
// ============================================================

/**
 * Erzeugt einen leeren Default-State für den aktuellen Monat.
 */
function createDefaultState() {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return {
    month,
    habits: JSON.parse(JSON.stringify(config.defaultHabits)),
    checks: {},          // { habitId: { dayNumber: true } }
    needs: { body: 70, personal: 70, spiritual: 70 },
    lastUpdateDate: _todayStr(),
    streaks: {},         // { habitId: number }
    neglect: {
      body:      { daysMissed: 0, status: 'OK', recoveryDays: 0 },
      personal:  { daysMissed: 0, status: 'OK', recoveryDays: 0 },
      spiritual: { daysMissed: 0, status: 'OK', recoveryDays: 0 }
    },
    restDaysUsedThisWeek: 0,
    currentISOWeek: _isoWeek(new Date()),
    dailyGainToday: { body: 0, personal: 0, spiritual: 0 },
    dailyGainDate: _todayStr()
  };
}

/** YYYY-MM-DD */
function _todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** ISO week number */
function _isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

// ---- localStorage-Implementierung ----
const localStore = {
  getState() {
    const raw = localStorage.getItem('habitTrackerState');
    if (!raw) return createDefaultState();
    try { return JSON.parse(raw); } catch { return createDefaultState(); }
  },
  saveState(state) {
    localStorage.setItem('habitTrackerState', JSON.stringify(state));
  },
  onRemoteUpdate(_cb) { /* noop for local */ }
};

// ---- Firestore-Implementierung (lazy loaded) ----
let firestoreStore = null;

function initFirestoreStore() {
  // Wird dynamisch in index.html geladen (Firebase SDKs)
  if (firestoreStore) return firestoreStore;

  let _userId = null;
  let _db = null;
  let _unsubscribe = null;
  let _remoteCallback = null;

  firestoreStore = {
    /** Initialisiert Firebase, gibt auth-Objekt zurück */
    async init() {
      if (typeof firebase === 'undefined') {
        console.error('Firebase SDK not loaded'); return null;
      }
      firebase.initializeApp(config.firebase);
      _db = firebase.firestore();
      return firebase.auth();
    },

    setUserId(uid) {
      _userId = uid;
      // Live-Listener starten
      if (_unsubscribe) _unsubscribe();
      _unsubscribe = _db.collection('users').doc(_userId).onSnapshot(snap => {
        if (snap.exists && _remoteCallback) {
          _remoteCallback(snap.data());
        }
      });
    },

    async getState() {
      if (!_userId || !_db) return createDefaultState();
      const snap = await _db.collection('users').doc(_userId).get();
      if (snap.exists) return snap.data();
      const def = createDefaultState();
      await _db.collection('users').doc(_userId).set(def);
      return def;
    },

    async saveState(state) {
      if (!_userId || !_db) return;
      await _db.collection('users').doc(_userId).set(state);
    },

    onRemoteUpdate(cb) { _remoteCallback = cb; }
  };

  return firestoreStore;
}

// ---- Storage-Facade ----
const storage = {
  _backend: localStore,

  /** Setup aufrufen bevor die App startet */
  async setup() {
    if (config.enableSync) {
      this._backend = initFirestoreStore();
      const auth = await this._backend.init();
      return auth; // Caller kümmert sich um Sign-In Flow
    }
    return null;
  },

  setUserId(uid) {
    if (this._backend.setUserId) this._backend.setUserId(uid);
  },

  async getState() {
    return await this._backend.getState();
  },

  async saveState(state) {
    // Immer auch lokal sichern als Backup
    localStore.saveState(state);
    await this._backend.saveState(state);
  },

  onRemoteUpdate(cb) {
    this._backend.onRemoteUpdate(cb);
  }
};
