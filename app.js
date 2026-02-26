// ============================================================
// app.js – Hauptlogik der Habit-Tracker App
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

const App = {
  currentTab: 'today',

  init() {
    this.registerSW();
    this.bindNav();
    this.showTab('today');
  },

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
      btn.addEventListener('click', () => this.showTab(btn.dataset.tab));
    });
  },

  showTab(tab) {
    this.currentTab = tab;
    document.querySelectorAll('.nav-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.tab === tab)
    );
    document.querySelectorAll('.tab-section').forEach(s =>
      s.classList.toggle('hidden', s.id !== `tab-${tab}`)
    );
    if (tab === 'today')    this.renderToday();
    if (tab === 'insights') this.renderInsights();
    if (tab === 'settings') this.renderSettings();
  },

  // ============================================================
  //  TODAY TAB – Habits abhaken + kcal eintragen
  // ============================================================
  renderToday() {
    const container = document.getElementById('today-content');
    const today = Storage.todayStr();
    const habits = Storage.getHabits();
    const checks = Storage.getChecks(today);
    const kcalEntries = Storage.getKcalEntries();
    const todayKcal = kcalEntries[today];
    const hasKcal = todayKcal !== undefined;

    // Fortschritt
    const checkedCount = checks.length;
    const totalCount = habits.length;
    const habitProgress = totalCount > 0 ? checkedCount / totalCount : 0;

    // Avatar
    Avatar.render('avatar-container', habitProgress, checkedCount > 0);

    // Habits nach Kategorie gruppieren
    const grouped = {};
    CONFIG.CATEGORIES.forEach(cat => { grouped[cat.id] = []; });
    habits.forEach(h => {
      if (grouped[h.category]) grouped[h.category].push(h);
      else grouped['body'].push(h); // fallback
    });

    container.innerHTML = `
      <div class="today-header">
        <h2>${this.formatDate(today)}</h2>
        <div class="today-progress-bar">
          <div class="today-progress-fill" style="width: ${habitProgress * 100}%"></div>
        </div>
        <span class="today-progress-text">${checkedCount} / ${totalCount} Habits</span>
      </div>

      <!-- HABITS LISTE -->
      <div class="habits-list">
        ${CONFIG.CATEGORIES.map(cat => {
          const catHabits = grouped[cat.id];
          if (catHabits.length === 0) return '';
          return `
            <div class="category-section">
              <h3 class="category-title" style="color: ${cat.color}">
                ${cat.icon} ${cat.name}
              </h3>
              ${catHabits.map(h => {
                const done = checks.includes(h.id);
                return `
                  <div class="habit-item ${done ? 'checked' : ''}" data-id="${h.id}">
                    <div class="habit-check">
                      <div class="checkbox ${done ? 'checked' : ''}" style="--cat-color: ${cat.color}">
                        ${done ? '✓' : ''}
                      </div>
                    </div>
                    <span class="habit-icon">${h.icon}</span>
                    <span class="habit-name">${h.name}</span>
                  </div>
                `;
              }).join('')}
            </div>
          `;
        }).join('')}
      </div>

      <!-- KCAL SECTION -->
      <div class="kcal-section">
        <h3 class="category-title" style="color: ${CONFIG.COLORS.WARNING}">🔥 Kalorien</h3>
        ${hasKcal ? `
          <div class="kcal-logged">
            <span class="kcal-value ${todayKcal < 0 ? 'deficit' : 'surplus'}">
              ${todayKcal > 0 ? '+' : ''}${todayKcal} kcal
            </span>
            <span class="kcal-status">${todayKcal < 0 ? 'Defizit' : 'Überschuss'} ✓</span>
            <div class="kcal-actions">
              <button class="btn btn-sm btn-outline" id="btn-edit-kcal">Ändern</button>
              <button class="btn btn-sm btn-danger-outline" id="btn-delete-kcal">✕</button>
            </div>
          </div>
        ` : `
          <div class="kcal-form">
            <div class="input-row">
              <button class="btn btn-icon" id="btn-minus">−</button>
              <input type="number" id="kcal-input" value="${Math.abs(CONFIG.DEFAULT_DAILY_KCAL)}" min="0" max="9999" step="50">
              <button class="btn btn-icon" id="btn-plus">+</button>
            </div>
            <div class="toggle-row">
              <button class="btn toggle-btn active" id="toggle-deficit">Defizit (−)</button>
              <button class="btn toggle-btn" id="toggle-surplus">Überschuss (+)</button>
            </div>
            <button class="btn btn-primary btn-block" id="btn-log-kcal">kcal eintragen</button>
          </div>
        `}
      </div>
    `;

    // ---- Event Listeners: Habits ----
    container.querySelectorAll('.habit-item').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.id;
        Storage.toggleCheck(today, id);
        this.renderToday();
      });
    });

    // ---- Event Listeners: kcal ----
    if (hasKcal) {
      document.getElementById('btn-edit-kcal')?.addEventListener('click', () => {
        Storage.removeKcalEntry(today);
        this.renderToday();
      });
      document.getElementById('btn-delete-kcal')?.addEventListener('click', () => {
        Storage.removeKcalEntry(today);
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
      document.getElementById('btn-log-kcal')?.addEventListener('click', () => {
        const val = parseInt(input.value || 0);
        if (val === 0) return;
        Storage.setKcalEntry(today, mode === 'deficit' ? -val : val);
        this.renderToday();
      });
    }
  },

  // ============================================================
  //  INSIGHTS TAB – kcal Fortschrittskreis + Habit Stats
  // ============================================================
  renderInsights() {
    const container = document.getElementById('insights-content');
    const goal = Storage.getGoal();
    const totalKcal = Storage.getTotalKcal();
    const targetKcal = goal.targetKg * CONFIG.KCAL_PER_KG;
    const progress = targetKcal > 0 ? Math.min(Math.abs(totalKcal) / targetKcal, 1) : 0;
    const percentText = Math.round(progress * 100);
    const kgDone = (Math.abs(totalKcal) / CONFIG.KCAL_PER_KG).toFixed(1);
    const kgRemaining = Math.max(0, goal.targetKg - parseFloat(kgDone)).toFixed(1);

    const kcalEntries = Storage.getKcalEntries();
    const kcalDays = Object.keys(kcalEntries);
    const avgKcal = kcalDays.length > 0
      ? Math.round(Object.values(kcalEntries).reduce((a, b) => a + b, 0) / kcalDays.length)
      : 0;

    // Habit stats
    const habits = Storage.getHabits();
    const allChecks = Storage.getAllChecks();
    const habitStreak = this.calcHabitStreak(habits, allChecks);
    const kcalStreak = this.calcKcalStreak(kcalEntries);

    // Habit completion letzte 7 Tage
    const last7 = this.getLast7Days(habits, allChecks, kcalEntries);

    // Gesamte Habit-Completion
    const checkDays = Object.keys(allChecks);
    let totalChecks = 0, totalPossible = 0;
    checkDays.forEach(d => {
      totalChecks += allChecks[d].length;
      totalPossible += habits.length;
    });
    const overallRate = totalPossible > 0 ? Math.round((totalChecks / totalPossible) * 100) : 0;

    container.innerHTML = `
      <!-- KCAL FORTSCHRITTSKREIS -->
      <div class="insights-hero">
        <h2>🔥 Kalorien-Ziel</h2>
        <div class="circle-wrapper">
          ${this.renderProgressCircle(progress, percentText, goal, kgDone)}
        </div>
        <p class="insights-sub">
          ${kgDone} von ${goal.targetKg} kg ${goal.mode === 'deficit' ? 'abgenommen' : 'zugenommen'}
          &middot; noch ${kgRemaining} kg
        </p>
      </div>

      <!-- STATS GRID -->
      <div class="insights-stats">
        <div class="stat-card">
          <span class="stat-card-value">${habitStreak}</span>
          <span class="stat-card-label">Habit Streak 🔥</span>
        </div>
        <div class="stat-card">
          <span class="stat-card-value">${overallRate}%</span>
          <span class="stat-card-label">Completion Rate</span>
        </div>
        <div class="stat-card">
          <span class="stat-card-value">${kcalStreak}</span>
          <span class="stat-card-label">kcal Streak 📊</span>
        </div>
        <div class="stat-card">
          <span class="stat-card-value">${avgKcal > 0 ? '+' : ''}${avgKcal}</span>
          <span class="stat-card-label">⌀ kcal/Tag</span>
        </div>
      </div>

      <!-- LETZTE 7 TAGE -->
      <div class="last7-section">
        <h3>Letzte 7 Tage</h3>
        <div class="week-grid">
          ${last7.map(d => `
            <div class="week-day ${d.isToday ? 'today' : ''}">
              <span class="week-label">${d.label}</span>
              <div class="week-habits-ring" style="--pct: ${d.habitPct}">
                <span class="week-pct">${d.habitPct}%</span>
              </div>
              <span class="week-kcal ${d.kcal < 0 ? 'deficit' : d.kcal > 0 ? 'surplus' : 'none'}">
                ${d.kcal !== 0 ? (d.kcal > 0 ? '+' : '') + d.kcal : '–'}
              </span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- HABIT DETAILS -->
      <div class="habit-insights">
        <h3>Habits im Detail</h3>
        ${habits.map(h => {
          const cat = CONFIG.CATEGORIES.find(c => c.id === h.category);
          const daysChecked = Object.values(allChecks).filter(arr => arr.includes(h.id)).length;
          const totalDays = Math.max(checkDays.length, 1);
          const rate = Math.round((daysChecked / totalDays) * 100);
          return `
            <div class="habit-insight-row">
              <span class="habit-insight-icon">${h.icon}</span>
              <span class="habit-insight-name">${h.name}</span>
              <div class="habit-insight-bar">
                <div class="habit-insight-fill" style="width: ${rate}%; background: ${cat?.color || CONFIG.COLORS.PRIMARY}"></div>
              </div>
              <span class="habit-insight-rate">${rate}%</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  renderProgressCircle(progress, percentText, goal, kgDone) {
    const R = CONFIG.CIRCLE.RADIUS;
    const STROKE = CONFIG.CIRCLE.STROKE_WIDTH;
    const SIZE = CONFIG.CIRCLE.SIZE;
    const C = 2 * Math.PI * R;
    const offset = C * (1 - progress);

    let strokeColor = CONFIG.COLORS.PRIMARY;
    if (progress >= 1) strokeColor = CONFIG.COLORS.SUCCESS;
    else if (progress >= 0.5) strokeColor = '#4fc3f7';

    return `
      <svg class="progress-ring" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
        <circle cx="${SIZE/2}" cy="${SIZE/2}" r="${R}" fill="none"
                stroke="${CONFIG.COLORS.CARD_BG}" stroke-width="${STROKE}"/>
        <circle class="progress-ring-circle"
                cx="${SIZE/2}" cy="${SIZE/2}" r="${R}" fill="none"
                stroke="${strokeColor}" stroke-width="${STROKE}"
                stroke-linecap="round"
                stroke-dasharray="${C}" stroke-dashoffset="${offset}"
                transform="rotate(-90 ${SIZE/2} ${SIZE/2})"/>
        <text x="50%" y="45%" text-anchor="middle" dy=".3em"
              class="progress-text">${percentText}%</text>
        <text x="50%" y="60%" text-anchor="middle"
              class="progress-sub">${kgDone} / ${goal.targetKg} kg</text>
      </svg>
    `;
  },

  // ============================================================
  //  SETTINGS TAB – Habits verwalten + kcal Ziel
  // ============================================================
  renderSettings() {
    const container = document.getElementById('settings-content');
    const goal = Storage.getGoal();
    const habits = Storage.getHabits();

    container.innerHTML = `
      <!-- KCAL ZIEL -->
      <div class="settings-card">
        <h2>🔥 Kalorien-Ziel</h2>
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
        <button class="btn btn-primary btn-block" id="btn-save-goal">Ziel speichern</button>
      </div>

      <!-- HABITS VERWALTEN -->
      <div class="settings-card">
        <h2>📋 Habits verwalten</h2>
        <div class="manage-habits-list">
          ${habits.map(h => {
            const cat = CONFIG.CATEGORIES.find(c => c.id === h.category);
            return `
              <div class="manage-habit-item">
                <span class="manage-habit-icon">${h.icon}</span>
                <span class="manage-habit-name">${h.name}</span>
                <span class="manage-habit-cat" style="color: ${cat?.color || '#888'}">${cat?.name || ''}</span>
                <button class="btn btn-sm btn-danger-outline btn-delete-habit" data-id="${h.id}">✕</button>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Neues Habit hinzufügen -->
        <div class="add-habit-form">
          <h3>Neues Habit</h3>
          <div class="setting-group">
            <input type="text" id="new-habit-name" placeholder="Name (z.B. Joggen)">
          </div>
          <div class="setting-group">
            <input type="text" id="new-habit-icon" placeholder="Emoji (z.B. 🏃)" maxlength="4">
          </div>
          <div class="setting-group">
            <label>Kategorie</label>
            <div class="toggle-row">
              ${CONFIG.CATEGORIES.map((cat, i) => `
                <button class="btn toggle-btn cat-select ${i === 0 ? 'active' : ''}" data-cat="${cat.id}" style="--cat-color: ${cat.color}">
                  ${cat.icon} ${cat.name}
                </button>
              `).join('')}
            </div>
          </div>
          <button class="btn btn-primary btn-block" id="btn-add-habit">Habit hinzufügen</button>
        </div>
      </div>

      <!-- KCAL VERLAUF -->
      <div class="settings-card">
        <h2>📊 kcal Verlauf</h2>
        ${this.renderKcalHistory()}
      </div>

      <!-- GEFAHRENZONE -->
      <div class="settings-card danger-zone">
        <h2>⚠️ Gefahrenzone</h2>
        <button class="btn btn-danger" id="btn-reset-all">Alle Daten löschen</button>
      </div>
    `;

    // ---- Event Listeners ----
    let mode = goal.mode;

    document.getElementById('set-deficit')?.addEventListener('click', () => {
      mode = 'deficit';
      document.getElementById('set-deficit').classList.add('active');
      document.getElementById('set-surplus').classList.remove('active');
    });
    document.getElementById('set-surplus')?.addEventListener('click', () => {
      mode = 'surplus';
      document.getElementById('set-surplus').classList.add('active');
      document.getElementById('set-deficit').classList.remove('active');
    });

    document.getElementById('goal-kg')?.addEventListener('input', () => {
      const kg = parseFloat(document.getElementById('goal-kg').value) || 0;
      const hint = container.querySelector('.setting-group .hint');
      if (hint) hint.textContent = `= ${(kg * CONFIG.KCAL_PER_KG).toLocaleString('de-DE')} kcal`;
    });

    document.getElementById('btn-save-goal')?.addEventListener('click', () => {
      const kg = parseFloat(document.getElementById('goal-kg').value) || CONFIG.DEFAULT_GOAL_KG;
      Storage.setGoal({ targetKg: kg, mode });
      this.showToast('Ziel gespeichert ✓');
    });

    // Delete habits
    container.querySelectorAll('.btn-delete-habit').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('Habit löschen?')) {
          Storage.removeHabit(btn.dataset.id);
          this.renderSettings();
        }
      });
    });

    // Add habit
    let selectedCat = CONFIG.CATEGORIES[0].id;
    container.querySelectorAll('.cat-select').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.cat-select').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedCat = btn.dataset.cat;
      });
    });

    document.getElementById('btn-add-habit')?.addEventListener('click', () => {
      const name = document.getElementById('new-habit-name').value.trim();
      const icon = document.getElementById('new-habit-icon').value.trim() || '⭐';
      if (!name) { this.showToast('Bitte Name eingeben'); return; }
      Storage.addHabit({
        id: Storage.generateId(),
        name,
        icon,
        category: selectedCat
      });
      this.showToast(`"${name}" hinzugefügt ✓`);
      this.renderSettings();
    });

    // Delete kcal entries
    container.querySelectorAll('.btn-delete-entry').forEach(btn => {
      btn.addEventListener('click', () => {
        Storage.removeKcalEntry(btn.dataset.date);
        this.renderSettings();
      });
    });

    // Reset
    document.getElementById('btn-reset-all')?.addEventListener('click', () => {
      if (confirm('Wirklich ALLE Daten löschen?')) {
        localStorage.clear();
        this.showToast('Alle Daten gelöscht');
        this.showTab('today');
      }
    });
  },

  renderKcalHistory() {
    const entries = Storage.getKcalEntries();
    const dates = Object.keys(entries).sort().reverse();
    if (dates.length === 0) return '<p class="hint">Noch keine kcal-Einträge.</p>';
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
  //  HILFSFUNKTIONEN
  // ============================================================

  calcHabitStreak(habits, allChecks) {
    if (habits.length === 0) return 0;
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const dayChecks = allChecks[key] || [];
      // Mindestens 50% der Habits müssen erledigt sein
      if (dayChecks.length >= Math.ceil(habits.length / 2)) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  },

  calcKcalStreak(kcalEntries) {
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      if (kcalEntries[key] !== undefined) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  },

  getLast7Days(habits, allChecks, kcalEntries) {
    const result = [];
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const dayChecks = allChecks[key] || [];
      const pct = habits.length > 0 ? Math.round((dayChecks.length / habits.length) * 100) : 0;
      result.push({
        date: key,
        label: dayNames[d.getDay()],
        habitPct: pct,
        kcal: kcalEntries[key] || 0,
        isToday: key === todayStr
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

