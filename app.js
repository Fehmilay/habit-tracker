// ============================================================
// app.js – Hauptlogik der Habit-Tracker App
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

const App = {
  // ---- State ----
  currentTab: 'today',

  // ---- Init ----
  init() {
    this.registerSW();
    this.bindNav();
    this.bindModals();
    this.showTab('today');
  },

  // ---- Service Worker ----
  registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('service-worker.js').catch(() => {});
    }
  },

  // ============================================================
  //  NAVIGATION
  // ============================================================
  bindNav() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.showTab(btn.dataset.tab);
      });
    });
  },

  showTab(tab) {
    this.currentTab = tab;
    // Nav-Buttons highlighten
    document.querySelectorAll('.nav-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tab);
    });
    // Sections ein/ausblenden
    document.querySelectorAll('.tab-section').forEach(s => {
      s.classList.toggle('hidden', s.id !== `tab-${tab}`);
    });
    // Tab-spezifisches Rendering
    if (tab === 'today') this.renderToday();
    if (tab === 'insights') this.renderInsights();
    if (tab === 'settings') this.renderSettings();
  },

  // ============================================================
  //  TODAY TAB – Täglicher kcal Eintrag
  // ============================================================
  renderToday() {
    const container = document.getElementById('today-content');
    const today = Storage.todayStr();
    const entries = Storage.getEntries();
    const todayEntry = entries[today];
    const goal = Storage.getGoal();
    const isLogged = todayEntry !== undefined;

    // Avatar
    const totalKcal = Storage.getTotalKcal();
    const targetKcal = goal.targetKg * CONFIG.KCAL_PER_KG;
    const progress = targetKcal > 0 ? Math.min(Math.abs(totalKcal) / targetKcal, 1) : 0;
    Avatar.render('avatar-container', progress, isLogged);

    container.innerHTML = `
      <div class="today-card">
        <h2>Heute: ${this.formatDate(today)}</h2>

        ${isLogged ? `
          <div class="logged-info">
            <span class="logged-value ${todayEntry < 0 ? 'deficit' : 'surplus'}">
              ${todayEntry > 0 ? '+' : ''}${todayEntry} kcal
            </span>
            <p class="logged-label">${todayEntry < 0 ? 'Defizit' : 'Überschuss'} eingetragen ✓</p>
            <button class="btn btn-sm btn-outline" id="btn-edit-today">Ändern</button>
            <button class="btn btn-sm btn-danger-outline" id="btn-delete-today">Löschen</button>
          </div>
        ` : `
          <div class="entry-form">
            <label for="kcal-input">kcal Defizit (−) oder Überschuss (+)</label>
            <div class="input-row">
              <button class="btn btn-icon" id="btn-minus">−</button>
              <input type="number" id="kcal-input" value="${Math.abs(CONFIG.DEFAULT_DAILY_KCAL)}" min="0" max="9999" step="50">
              <button class="btn btn-icon" id="btn-plus">+</button>
            </div>
            <div class="toggle-row">
              <button class="btn toggle-btn active" id="toggle-deficit" data-mode="deficit">Defizit (−)</button>
              <button class="btn toggle-btn" id="toggle-surplus" data-mode="surplus">Überschuss (+)</button>
            </div>
            <button class="btn btn-primary btn-lg" id="btn-log">Eintragen</button>
          </div>
        `}
      </div>

      <div class="quick-stats">
        <div class="stat-item">
          <span class="stat-value">${Math.abs(totalKcal).toLocaleString('de-DE')}</span>
          <span class="stat-label">kcal gesamt</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${Object.keys(entries).length}</span>
          <span class="stat-label">Tage geloggt</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${(Math.abs(totalKcal) / CONFIG.KCAL_PER_KG).toFixed(1)} kg</span>
          <span class="stat-label">${totalKcal <= 0 ? 'abgenommen' : 'zugenommen'}</span>
        </div>
      </div>
    `;

    // Event-Listener
    if (isLogged) {
      document.getElementById('btn-edit-today')?.addEventListener('click', () => {
        Storage.removeEntry(today);
        this.renderToday();
      });
      document.getElementById('btn-delete-today')?.addEventListener('click', () => {
        Storage.removeEntry(today);
        this.renderToday();
      });
    } else {
      let mode = 'deficit';
      const input = document.getElementById('kcal-input');

      document.getElementById('btn-minus')?.addEventListener('click', () => {
        input.value = Math.max(0, parseInt(input.value || 0) - 50);
      });
      document.getElementById('btn-plus')?.addEventListener('click', () => {
        input.value = parseInt(input.value || 0) + 50;
      });

      document.getElementById('toggle-deficit')?.addEventListener('click', () => {
        mode = 'deficit';
        document.getElementById('toggle-deficit').classList.add('active');
        document.getElementById('toggle-surplus').classList.remove('active');
      });
      document.getElementById('toggle-surplus')?.addEventListener('click', () => {
        mode = 'surplus';
        document.getElementById('toggle-surplus').classList.add('active');
        document.getElementById('toggle-deficit').classList.remove('active');
      });

      document.getElementById('btn-log')?.addEventListener('click', () => {
        const val = parseInt(input.value || 0);
        if (val === 0) return;
        const kcal = mode === 'deficit' ? -val : val;
        Storage.setEntry(today, kcal);
        this.renderToday();
        // Kurz Insights refreshen falls offen
      });
    }
  },

  // ============================================================
  //  INSIGHTS TAB – Fortschrittskreis + Statistiken
  // ============================================================
  renderInsights() {
    const container = document.getElementById('insights-content');
    const goal = Storage.getGoal();
    const totalKcal = Storage.getTotalKcal();
    const targetKcal = goal.targetKg * CONFIG.KCAL_PER_KG;
    const progress = targetKcal > 0 ? Math.min(Math.abs(totalKcal) / targetKcal, 1) : 0;
    const percentText = Math.round(progress * 100);

    const entries = Storage.getEntries();
    const sortedDates = Object.keys(entries).sort();
    const kgLost = (Math.abs(totalKcal) / CONFIG.KCAL_PER_KG).toFixed(1);
    const kgRemaining = Math.max(0, goal.targetKg - Math.abs(totalKcal) / CONFIG.KCAL_PER_KG).toFixed(1);

    // Streak berechnen
    const streak = this.calcStreak(entries);

    // Durchschnitt
    const avgKcal = sortedDates.length > 0
      ? Math.round(Object.values(entries).reduce((a, b) => a + b, 0) / sortedDates.length)
      : 0;

    // Letzte 7 Tage
    const last7 = this.getLast7Days(entries);

    container.innerHTML = `
      <div class="insights-hero">
        <h2>Dein Fortschritt</h2>
        <div class="circle-wrapper">
          ${this.renderProgressCircle(progress, percentText, goal, kgLost)}
        </div>
        <p class="insights-sub">
          ${kgLost} von ${goal.targetKg} kg ${goal.mode === 'deficit' ? 'abgenommen' : 'zugenommen'}
          &middot; noch ${kgRemaining} kg
        </p>
      </div>

      <div class="insights-stats">
        <div class="stat-card">
          <span class="stat-card-value">${streak}</span>
          <span class="stat-card-label">Tage Streak 🔥</span>
        </div>
        <div class="stat-card">
          <span class="stat-card-value">${avgKcal > 0 ? '+' : ''}${avgKcal}</span>
          <span class="stat-card-label">⌀ kcal/Tag</span>
        </div>
        <div class="stat-card">
          <span class="stat-card-value">${sortedDates.length}</span>
          <span class="stat-card-label">Tage geloggt</span>
        </div>
        <div class="stat-card">
          <span class="stat-card-value">${Math.abs(totalKcal).toLocaleString('de-DE')}</span>
          <span class="stat-card-label">kcal gesamt</span>
        </div>
      </div>

      <div class="last7-section">
        <h3>Letzte 7 Tage</h3>
        <div class="bar-chart">
          ${last7.map(d => `
            <div class="bar-col">
              <div class="bar ${d.value < 0 ? 'bar-deficit' : d.value > 0 ? 'bar-surplus' : 'bar-empty'}"
                   style="height: ${d.value !== 0 ? Math.max(8, Math.min(80, Math.abs(d.value) / 10)) : 4}px">
              </div>
              <span class="bar-label">${d.label}</span>
              <span class="bar-value">${d.value !== 0 ? d.value : '–'}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  renderProgressCircle(progress, percentText, goal, kgDone) {
    const R = CONFIG.CIRCLE.RADIUS;
    const STROKE = CONFIG.CIRCLE.STROKE_WIDTH;
    const SIZE = CONFIG.CIRCLE.SIZE;
    const C = 2 * Math.PI * R; // Umfang
    const offset = C * (1 - progress);

    // Farbe je nach Fortschritt
    let strokeColor = CONFIG.COLORS.PRIMARY;
    if (progress >= 1) strokeColor = CONFIG.COLORS.SUCCESS;
    else if (progress >= 0.5) strokeColor = '#4fc3f7';

    return `
      <svg class="progress-ring" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
        <!-- Hintergrund-Kreis -->
        <circle
          cx="${SIZE / 2}" cy="${SIZE / 2}" r="${R}"
          fill="none"
          stroke="${CONFIG.COLORS.CARD_BG}"
          stroke-width="${STROKE}"
        />
        <!-- Fortschritts-Kreis -->
        <circle
          class="progress-ring-circle"
          cx="${SIZE / 2}" cy="${SIZE / 2}" r="${R}"
          fill="none"
          stroke="${strokeColor}"
          stroke-width="${STROKE}"
          stroke-linecap="round"
          stroke-dasharray="${C}"
          stroke-dashoffset="${offset}"
          transform="rotate(-90 ${SIZE / 2} ${SIZE / 2})"
        />
        <!-- Prozent-Text -->
        <text x="50%" y="45%" text-anchor="middle" dy=".3em"
              class="progress-text">${percentText}%</text>
        <text x="50%" y="60%" text-anchor="middle"
              class="progress-sub">${kgDone} / ${goal.targetKg} kg</text>
      </svg>
    `;
  },

  // ============================================================
  //  SETTINGS TAB – Ziel anpassen
  // ============================================================
  renderSettings() {
    const container = document.getElementById('settings-content');
    const goal = Storage.getGoal();

    container.innerHTML = `
      <div class="settings-card">
        <h2>Ziel einstellen</h2>

        <div class="setting-group">
          <label for="goal-kg">Ziel in kg</label>
          <input type="number" id="goal-kg" value="${goal.targetKg}" min="0.5" max="100" step="0.5">
          <p class="hint">= ${(goal.targetKg * CONFIG.KCAL_PER_KG).toLocaleString('de-DE')} kcal</p>
        </div>

        <div class="setting-group">
          <label>Modus</label>
          <div class="toggle-row">
            <button class="btn toggle-btn ${goal.mode === 'deficit' ? 'active' : ''}" id="set-deficit">Abnehmen</button>
            <button class="btn toggle-btn ${goal.mode === 'surplus' ? 'active' : ''}" id="set-surplus">Zunehmen</button>
          </div>
        </div>

        <button class="btn btn-primary btn-lg" id="btn-save-goal">Speichern</button>
      </div>

      <div class="settings-card">
        <h2>Verlauf</h2>
        <p class="hint">Alle Einträge anzeigen / löschen</p>
        ${this.renderHistory()}
      </div>

      <div class="settings-card danger-zone">
        <h2>Gefahrenzone</h2>
        <button class="btn btn-danger" id="btn-reset-all">Alle Daten löschen</button>
      </div>
    `;

    // Event Listener
    let mode = goal.mode;

    document.getElementById('set-deficit')?.addEventListener('click', () => {
      mode = 'deficit';
      document.getElementById('set-deficit').classList.add('active');
      document.getElementById('set-surplus').classList.remove('active');
      this.updateKcalHint();
    });
    document.getElementById('set-surplus')?.addEventListener('click', () => {
      mode = 'surplus';
      document.getElementById('set-surplus').classList.add('active');
      document.getElementById('set-deficit').classList.remove('active');
      this.updateKcalHint();
    });

    document.getElementById('goal-kg')?.addEventListener('input', () => {
      this.updateKcalHint();
    });

    document.getElementById('btn-save-goal')?.addEventListener('click', () => {
      const kg = parseFloat(document.getElementById('goal-kg').value) || CONFIG.DEFAULT_GOAL_KG;
      Storage.setGoal({ targetKg: kg, mode });
      this.showToast('Ziel gespeichert ✓');
      this.renderSettings();
    });

    document.getElementById('btn-reset-all')?.addEventListener('click', () => {
      if (confirm('Wirklich ALLE Daten löschen? Das kann nicht rückgängig gemacht werden!')) {
        localStorage.clear();
        this.showToast('Alle Daten gelöscht');
        this.showTab('today');
      }
    });

    // Delete einzelner Einträge
    container.querySelectorAll('.btn-delete-entry').forEach(btn => {
      btn.addEventListener('click', () => {
        Storage.removeEntry(btn.dataset.date);
        this.renderSettings();
      });
    });
  },

  updateKcalHint() {
    const kg = parseFloat(document.getElementById('goal-kg')?.value) || 0;
    const hint = document.querySelector('.setting-group .hint');
    if (hint) hint.textContent = `= ${(kg * CONFIG.KCAL_PER_KG).toLocaleString('de-DE')} kcal`;
  },

  renderHistory() {
    const entries = Storage.getEntries();
    const dates = Object.keys(entries).sort().reverse();
    if (dates.length === 0) return '<p class="hint">Noch keine Einträge.</p>';

    return `
      <div class="history-list">
        ${dates.map(d => `
          <div class="history-item">
            <span class="history-date">${this.formatDate(d)}</span>
            <span class="history-val ${entries[d] < 0 ? 'deficit' : 'surplus'}">
              ${entries[d] > 0 ? '+' : ''}${entries[d]} kcal
            </span>
            <button class="btn btn-sm btn-danger-outline btn-delete-entry" data-date="${d}">✕</button>
          </div>
        `).join('')}
      </div>
    `;
  },

  // ============================================================
  //  MODALS
  // ============================================================
  bindModals() {
    // Schließen per Overlay-Klick
    document.querySelectorAll('.modal-overlay').forEach(m => {
      m.addEventListener('click', (e) => {
        if (e.target === m) m.classList.add('hidden');
      });
    });
  },

  // ============================================================
  //  HILFSFUNKTIONEN
  // ============================================================

  calcStreak(entries) {
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      if (entries[key] !== undefined) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  },

  getLast7Days(entries) {
    const result = [];
    const today = new Date();
    const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      result.push({
        date: key,
        label: dayNames[d.getDay()],
        value: entries[key] || 0
      });
    }
    return result;
  },

  formatDate(dateStr) {
    const [y, m, d] = dateStr.split('-');
    return `${d}.${m}.${y}`;
  },

  showToast(msg) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }
};

