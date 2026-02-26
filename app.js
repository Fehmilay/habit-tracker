// ============================================================
// app.js – Hauptlogik v2: ✓/✗ + Tageszeiten + Journal + Kalender
// ============================================================

document.addEventListener('DOMContentLoaded', () => App.init());

const App = {
  currentTab: 'today',

  init() {
    this.registerSW();
    this.bindNav();
    this.showTab('today');
    this.checkEveningCheckin();
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
    document.querySelectorAll('.nav-btn').forEach(btn =>
      btn.addEventListener('click', () => this.showTab(btn.dataset.tab))
    );
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
  //  TODAY TAB
  // ============================================================
  renderToday() {
    const c = document.getElementById('today-content');
    const today = Storage.todayStr();
    const habits = Storage.getHabits();
    const dayChecks = Storage.getDayChecks(today);
    const kcalEntries = Storage.getKcalEntries();
    const todayKcal = kcalEntries[today];
    const hasKcal = todayKcal !== undefined;

    // Nur habits die heute fällig sind
    const dueHabits = habits.filter(h => Storage.isHabitDueToday(h, today));
    const doneCount = dueHabits.filter(h => dayChecks[h.id]?.status === 'done').length;
    const skippedCount = dueHabits.filter(h => dayChecks[h.id]?.status === 'skipped').length;
    const totalDue = dueHabits.length;
    const progress = totalDue > 0 ? doneCount / totalDue : 0;

    // Avatar
    Avatar.render('avatar-container', progress, doneCount > 0);

    // Quote
    const quoteIdx = new Date().getDate() % CONFIG.QUOTES.length;
    const quote = CONFIG.QUOTES[quoteIdx];

    // Habits nach Tageszeit gruppieren
    const byTime = {};
    CONFIG.TIME_SLOTS.forEach(ts => { byTime[ts.id] = []; });
    dueHabits.forEach(h => {
      const slot = h.timeSlot || 'anytime';
      if (byTime[slot]) byTime[slot].push(h);
      else byTime['anytime'].push(h);
    });

    // Nicht-fällige Habits (diese Woche schon erledigt)
    const notDueHabits = habits.filter(h => !Storage.isHabitDueToday(h, today));

    c.innerHTML = `
      <div class="quote-banner">"${quote}"</div>

      <div class="today-header">
        <h2>${this.formatDateLong(today)}</h2>
        <div class="today-progress-bar">
          <div class="today-progress-fill" style="width: ${progress * 100}%"></div>
        </div>
        <div class="today-stats-row">
          <span class="ts-done">✓ ${doneCount}</span>
          <span class="ts-skipped">✗ ${skippedCount}</span>
          <span class="ts-remaining">○ ${totalDue - doneCount - skippedCount}</span>
          <span class="ts-total">${doneCount}/${totalDue} erledigt</span>
        </div>
      </div>

      <!-- HABITS BY TIMESLOT -->
      ${CONFIG.TIME_SLOTS.map(ts => {
        const slotHabits = byTime[ts.id];
        if (slotHabits.length === 0) return '';
        return `
          <div class="timeslot-section">
            <h3 class="timeslot-title">${ts.icon} ${ts.name} <span class="timeslot-range">${ts.range}</span></h3>
            ${slotHabits.map(h => this.renderHabitItem(h, dayChecks, today)).join('')}
          </div>
        `;
      }).join('')}

      ${notDueHabits.length > 0 ? `
        <div class="not-due-section">
          <h3 class="timeslot-title dim">📅 Nicht heute geplant</h3>
          ${notDueHabits.map(h => {
            const daysLabel = this.getDaysLabel(h.days);
            return `
              <div class="habit-item done-week">
                <span class="habit-icon">${h.icon}</span>
                <span class="habit-name">${h.name}</span>
                <span class="freq-badge">${daysLabel}</span>
              </div>
            `;
          }).join('')}
        </div>
      ` : ''}

      <!-- KCAL -->
      <div class="kcal-section">
        <h3 class="timeslot-title" style="color: ${CONFIG.COLORS.WARNING}">🔥 Kalorien</h3>
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

      <!-- JOURNAL -->
      <div class="journal-section">
        <h3 class="timeslot-title" style="color: ${CONFIG.COLORS.PRIMARY}">📝 Tages-Journal</h3>
        <textarea id="journal-input" class="journal-textarea" placeholder="Wie war dein Tag? Was hast du gelernt? Wofür bist du dankbar?"
          >${Storage.getJournal(today)}</textarea>
        <button class="btn btn-primary btn-block btn-sm" id="btn-save-journal">Journal speichern</button>

        ${this.renderRecentJournals(today)}
      </div>
    `;

    this.bindTodayEvents(today, hasKcal, todayKcal);
  },

  renderHabitItem(h, dayChecks, today) {
    const check = dayChecks[h.id];
    const status = check?.status || 'pending';
    const reason = check?.reason || '';
    const cat = CONFIG.CATEGORIES.find(ct => ct.id === h.category);
    const daysLabel = (h.days && h.days.length < 7) ? this.getDaysLabel(h.days) : null;

    return `
      <div class="habit-item status-${status}" data-id="${h.id}">
        <div class="habit-actions-col">
          <button class="hab-btn hab-done ${status === 'done' ? 'active' : ''}" data-id="${h.id}" data-action="done" title="Erledigt">✓</button>
          <button class="hab-btn hab-skip ${status === 'skipped' ? 'active' : ''}" data-id="${h.id}" data-action="skip" title="Nicht geschafft">✗</button>
        </div>
        <div class="habit-info">
          <div class="habit-name-row">
            <span class="habit-icon">${h.icon}</span>
            <span class="habit-name">${h.name}</span>
          </div>
          <div class="habit-meta">
            <span class="cat-dot" style="background:${cat?.color || '#888'}"></span>
            <span>${cat?.name || ''}</span>
            ${daysLabel ? `<span class="freq-tag">${daysLabel}</span>` : ''}
          </div>
        </div>
        ${status === 'skipped' ? `
          <div class="skip-reason-area">
            <input type="text" class="skip-reason-input" data-id="${h.id}" placeholder="Warum nicht? (optional)" value="${reason}">
          </div>
        ` : ''}
      </div>
    `;
  },

  renderRecentJournals(today) {
    const journals = Storage.getAllJournals();
    const dates = Object.keys(journals).filter(d => d < today).sort().reverse().slice(0, 3);
    if (dates.length === 0) return '';
    return `
      <div class="recent-journals">
        <h4>Letzte Einträge</h4>
        ${dates.map(d => `
          <div class="journal-preview">
            <span class="jp-date">${this.formatDateShort(d)}</span>
            <p class="jp-text">${journals[d].length > 120 ? journals[d].slice(0, 120) + '…' : journals[d]}</p>
          </div>
        `).join('')}
      </div>
    `;
  },

  bindTodayEvents(today, hasKcal, todayKcal) {
    const c = document.getElementById('today-content');

    // ---- Habit Done/Skip ----
    c.querySelectorAll('.hab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const action = btn.dataset.action;
        const current = Storage.getHabitStatus(today, id);

        if (action === 'done') {
          if (current?.status === 'done') {
            Storage.removeHabitStatus(today, id);
          } else {
            Storage.setHabitStatus(today, id, 'done', '');
          }
        } else { // skip
          if (current?.status === 'skipped') {
            Storage.removeHabitStatus(today, id);
          } else {
            Storage.setHabitStatus(today, id, 'skipped', '');
          }
        }
        this.renderToday();
      });
    });

    // ---- Skip Reason Input ----
    c.querySelectorAll('.skip-reason-input').forEach(inp => {
      inp.addEventListener('change', () => {
        Storage.setHabitStatus(today, inp.dataset.id, 'skipped', inp.value.trim());
      });
      inp.addEventListener('click', e => e.stopPropagation());
    });

    // ---- kcal ----
    if (hasKcal) {
      document.getElementById('btn-edit-kcal')?.addEventListener('click', () => {
        Storage.removeKcalEntry(today); this.renderToday();
      });
      document.getElementById('btn-delete-kcal')?.addEventListener('click', () => {
        Storage.removeKcalEntry(today); this.renderToday();
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

    // ---- Journal ----
    document.getElementById('btn-save-journal')?.addEventListener('click', () => {
      const text = document.getElementById('journal-input').value;
      Storage.setJournal(today, text);
      this.showToast('Journal gespeichert ✓');
    });
  },

  // ============================================================
  //  INSIGHTS TAB – Kalender + Kreis + Stats
  // ============================================================
  renderInsights() {
    const c = document.getElementById('insights-content');
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
      ? Math.round(Object.values(kcalEntries).reduce((a, b) => a + b, 0) / kcalDays.length) : 0;

    const habits = Storage.getHabits();
    const allChecks = Storage.getAllChecks();
    const habitStreak = this.calcHabitStreak(habits, allChecks);
    const kcalStreak = this.calcKcalStreak(kcalEntries);

    // Overall completion
    const checkDays = Object.keys(allChecks);
    let totalDone = 0, totalPossible = 0;
    checkDays.forEach(d => {
      const dayHabits = habits.filter(h => Storage.isHabitDueToday(h, d));
      const dayChecks = allChecks[d];
      totalDone += Object.values(dayChecks).filter(v => v.status === 'done').length;
      totalPossible += dayHabits.length;
    });
    const overallRate = totalPossible > 0 ? Math.round((totalDone / totalPossible) * 100) : 0;

    c.innerHTML = `
      <!-- KCAL FORTSCHRITTSKREIS -->
      <div class="insights-hero">
        <h2>🔥 Kalorien-Ziel</h2>
        <div class="circle-wrapper">
          ${this.renderProgressCircle(progress, percentText, goal, kgDone)}
        </div>
        <p class="insights-sub">
          ${kgDone} von ${goal.targetKg} kg ${goal.mode === 'deficit' ? 'abgenommen' : 'zugenommen'}
          · noch ${kgRemaining} kg
        </p>
      </div>

      <!-- STATS -->
      <div class="insights-stats">
        <div class="stat-card"><span class="stat-card-value">${habitStreak}</span><span class="stat-card-label">Habit Streak 🔥</span></div>
        <div class="stat-card"><span class="stat-card-value">${overallRate}%</span><span class="stat-card-label">Completion Rate</span></div>
        <div class="stat-card"><span class="stat-card-value">${kcalStreak}</span><span class="stat-card-label">kcal Streak 📊</span></div>
        <div class="stat-card"><span class="stat-card-value">${avgKcal > 0 ? '+' : ''}${avgKcal}</span><span class="stat-card-label">⌀ kcal/Tag</span></div>
      </div>

      <!-- KALENDER -->
      <div class="calendar-section">
        <div class="calendar-nav">
          <button class="btn btn-icon btn-sm" id="cal-prev">◀</button>
          <h3 id="cal-title"></h3>
          <button class="btn btn-icon btn-sm" id="cal-next">▶</button>
        </div>
        <div class="calendar-weekdays">
          ${['Mo','Di','Mi','Do','Fr','Sa','So'].map(d => `<span>${d}</span>`).join('')}
        </div>
        <div id="cal-grid" class="calendar-grid"></div>
        <div class="calendar-legend">
          <span class="legend-item"><span class="legend-dot leg-perfect"></span>Alles ✓</span>
          <span class="legend-item"><span class="legend-dot leg-good"></span>&gt;50%</span>
          <span class="legend-item"><span class="legend-dot leg-some"></span>&lt;50%</span>
          <span class="legend-item"><span class="legend-dot leg-skip"></span>Skipped</span>
          <span class="legend-item"><span class="legend-dot leg-none"></span>Nichts</span>
        </div>
      </div>

      <!-- HABIT DETAILS -->
      <div class="habit-insights">
        <h3>Habits im Detail</h3>
        ${habits.map(h => {
          const cat = CONFIG.CATEGORIES.find(ct => ct.id === h.category);
          let doneCount = 0;
          Object.values(allChecks).forEach(dc => { if (dc[h.id]?.status === 'done') doneCount++; });
          const totalD = Math.max(checkDays.length, 1);
          const rate = Math.round((doneCount / totalD) * 100);
          const skippedCount = Object.values(allChecks).filter(dc => dc[h.id]?.status === 'skipped').length;
          return `
            <div class="habit-insight-row">
              <span class="habit-insight-icon">${h.icon}</span>
              <span class="habit-insight-name">${h.name}</span>
              <div class="habit-insight-bar">
                <div class="habit-insight-fill" style="width:${rate}%; background:${cat?.color || CONFIG.COLORS.PRIMARY}"></div>
              </div>
              <span class="habit-insight-rate">${rate}%</span>
              ${skippedCount > 0 ? `<span class="skip-count">${skippedCount}✗</span>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;

    // Kalender rendern
    this._calMonth = new Date().getMonth();
    this._calYear = new Date().getFullYear();
    this.renderCalendar();
    document.getElementById('cal-prev')?.addEventListener('click', () => {
      this._calMonth--;
      if (this._calMonth < 0) { this._calMonth = 11; this._calYear--; }
      this.renderCalendar();
    });
    document.getElementById('cal-next')?.addEventListener('click', () => {
      this._calMonth++;
      if (this._calMonth > 11) { this._calMonth = 0; this._calYear++; }
      this.renderCalendar();
    });
  },

  renderCalendar() {
    const grid = document.getElementById('cal-grid');
    const title = document.getElementById('cal-title');
    if (!grid || !title) return;

    const y = this._calYear, m = this._calMonth;
    const months = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
    title.textContent = `${months[m]} ${y}`;

    const firstDay = new Date(y, m, 1);
    const lastDay = new Date(y, m + 1, 0);
    const startPad = (firstDay.getDay() + 6) % 7; // Mo=0
    const daysInMonth = lastDay.getDate();

    const habits = Storage.getHabits();
    const allChecks = Storage.getAllChecks();
    const kcalEntries = Storage.getKcalEntries();
    const journals = Storage.getAllJournals();
    const todayStr = Storage.todayStr();

    let html = '';
    // Padding
    for (let i = 0; i < startPad; i++) html += '<div class="cal-day empty"></div>';

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = dateStr === todayStr;
      const isFuture = dateStr > todayStr;

      if (isFuture) {
        html += `<div class="cal-day future${isToday ? ' today' : ''}">${d}</div>`;
        continue;
      }

      const dayChecks = allChecks[dateStr] || {};
      const dueHabits = habits.filter(h => Storage.isHabitDueToday(h, dateStr));
      const doneC = Object.values(dayChecks).filter(v => v.status === 'done').length;
      const skipC = Object.values(dayChecks).filter(v => v.status === 'skipped').length;
      const dueC = dueHabits.length || 1;
      const pct = doneC / dueC;
      const hasKcal = kcalEntries[dateStr] !== undefined;
      const hasJournal = !!journals[dateStr];

      let cls = 'cal-none';
      if (pct >= 1 && skipC === 0) cls = 'cal-perfect';
      else if (pct >= 0.5) cls = 'cal-good';
      else if (doneC > 0 || skipC > 0) cls = 'cal-some';
      else if (skipC > 0) cls = 'cal-skip';

      html += `
        <div class="cal-day ${cls}${isToday ? ' today' : ''}" title="${doneC}✓ ${skipC}✗ / ${dueC} fällig">
          ${d}
          <div class="cal-dots">
            ${hasKcal ? '<span class="cd-kcal"></span>' : ''}
            ${hasJournal ? '<span class="cd-journal"></span>' : ''}
          </div>
        </div>
      `;
    }
    grid.innerHTML = html;
  },

  renderProgressCircle(progress, percentText, goal, kgDone) {
    const R = CONFIG.CIRCLE.RADIUS, S = CONFIG.CIRCLE.STROKE_WIDTH, SZ = CONFIG.CIRCLE.SIZE;
    const C = 2 * Math.PI * R, offset = C * (1 - progress);
    let col = CONFIG.COLORS.PRIMARY;
    if (progress >= 1) col = CONFIG.COLORS.SUCCESS;
    else if (progress >= 0.5) col = '#4fc3f7';
    return `
      <svg class="progress-ring" width="${SZ}" height="${SZ}" viewBox="0 0 ${SZ} ${SZ}">
        <circle cx="${SZ/2}" cy="${SZ/2}" r="${R}" fill="none" stroke="${CONFIG.COLORS.CARD_BG}" stroke-width="${S}"/>
        <circle class="progress-ring-circle" cx="${SZ/2}" cy="${SZ/2}" r="${R}" fill="none"
                stroke="${col}" stroke-width="${S}" stroke-linecap="round"
                stroke-dasharray="${C}" stroke-dashoffset="${offset}" transform="rotate(-90 ${SZ/2} ${SZ/2})"/>
        <text x="50%" y="45%" text-anchor="middle" dy=".3em" class="progress-text">${percentText}%</text>
        <text x="50%" y="60%" text-anchor="middle" class="progress-sub">${kgDone} / ${goal.targetKg} kg</text>
      </svg>`;
  },

  // ============================================================
  //  SETTINGS TAB
  // ============================================================
  renderSettings() {
    const c = document.getElementById('settings-content');
    const goal = Storage.getGoal();
    const habits = Storage.getHabits();

    c.innerHTML = `
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
            const cat = CONFIG.CATEGORIES.find(ct => ct.id === h.category);
            const ts = CONFIG.TIME_SLOTS.find(t => t.id === h.timeSlot);
            const daysLabel = h.days?.length === 7 ? 'Tägl.' : App.getDaysLabel(h.days);
            return `
              <div class="manage-habit-item">
                <span class="manage-habit-icon">${h.icon}</span>
                <div class="manage-habit-info">
                  <span class="manage-habit-name">${h.name}</span>
                  <span class="manage-habit-tags">
                    <span style="color:${cat?.color || '#888'}">${cat?.name || ''}</span>
                    · ${ts?.icon || ''} ${ts?.name || ''}
                    · ${daysLabel}
                  </span>
                </div>
                <button class="btn btn-sm btn-danger-outline btn-delete-habit" data-id="${h.id}">✕</button>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Neues Habit -->
        <div class="add-habit-form">
          <h3>➕ Neues Habit</h3>
          <div class="setting-group">
            <label>Name</label>
            <input type="text" id="new-habit-name" placeholder="z.B. Joggen">
          </div>
          <div class="setting-group">
            <label>Emoji</label>
            <input type="text" id="new-habit-icon" placeholder="z.B. 🏃" maxlength="4">
          </div>
          <div class="setting-group">
            <label>Kategorie</label>
            <div class="toggle-row flex-wrap">
              ${CONFIG.CATEGORIES.map((cat, i) => `
                <button class="btn toggle-btn cat-select ${i === 0 ? 'active' : ''}" data-cat="${cat.id}">
                  ${cat.icon} ${cat.name}
                </button>
              `).join('')}
            </div>
          </div>
          <div class="setting-group">
            <label>Tageszeit</label>
            <div class="toggle-row flex-wrap">
              ${CONFIG.TIME_SLOTS.map((ts, i) => `
                <button class="btn toggle-btn ts-select ${i === 3 ? 'active' : ''}" data-ts="${ts.id}">
                  ${ts.icon} ${ts.name}
                </button>
              `).join('')}
            </div>
          </div>
          <div class="setting-group">
            <label>Frequenz</label>
            <div class="toggle-row flex-wrap">
              ${CONFIG.FREQUENCY_PRESETS.map((p, i) => `
                <button class="btn toggle-btn freq-preset ${i === 0 ? 'active' : ''}" data-preset="${p.id}">
                  ${p.name}
                </button>
              `).join('')}
            </div>
          </div>
          <div class="setting-group">
            <label>Wochentage</label>
            <div class="weekday-picker">
              ${CONFIG.WEEKDAYS.map(wd => `
                <button class="btn day-chip active" data-day="${wd.id}">${wd.short}</button>
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

      <!-- CLOUD SYNC -->
      <div class="settings-card">
        <h2>☁️ Cloud Sync</h2>
        <p class="hint" style="margin-bottom:12px">Sync-ID teilen um Daten geräteübergreifend zu nutzen.</p>
        <div class="setting-group">
          <label>Sync-ID</label>
          <input type="text" id="sync-id-input" placeholder="Sync-ID eingeben oder neu erstellen" value="${Storage.getSyncId()}">
        </div>
        <div class="sync-buttons">
          <button class="btn btn-primary btn-sm" id="btn-sync-push">⬆ Push</button>
          <button class="btn btn-outline btn-sm" id="btn-sync-pull">⬇ Pull</button>
          <button class="btn btn-outline btn-sm" id="btn-sync-new">🆕 Neu</button>
        </div>
        <p class="hint" id="sync-status"></p>
      </div>
    `;

    this.bindSettingsEvents(goal, c);
  },

  bindSettingsEvents(goal, c) {
    let mode = goal.mode;
    let selectedCat = CONFIG.CATEGORIES[0].id;
    let selectedTs = 'anytime';
    let selectedDays = [0,1,2,3,4,5,6];

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
      const hint = c.querySelector('.setting-group .hint');
      if (hint) hint.textContent = `= ${(kg * CONFIG.KCAL_PER_KG).toLocaleString('de-DE')} kcal`;
    });

    document.getElementById('btn-save-goal')?.addEventListener('click', () => {
      const kg = parseFloat(document.getElementById('goal-kg').value) || CONFIG.DEFAULT_GOAL_KG;
      Storage.setGoal({ targetKg: kg, mode });
      this.showToast('Ziel gespeichert ✓');
    });

    // Delete habits
    c.querySelectorAll('.btn-delete-habit').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('Habit löschen?')) { Storage.removeHabit(btn.dataset.id); this.renderSettings(); }
      });
    });

    // Toggle selectors
    const bindToggles = (selector, callback) => {
      c.querySelectorAll(selector).forEach(btn => {
        btn.addEventListener('click', () => {
          c.querySelectorAll(selector).forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          callback(btn);
        });
      });
    };
    bindToggles('.cat-select', btn => selectedCat = btn.dataset.cat);
    bindToggles('.ts-select', btn => selectedTs = btn.dataset.ts);

    // Frequency presets
    bindToggles('.freq-preset', btn => {
      const preset = CONFIG.FREQUENCY_PRESETS.find(p => p.id === btn.dataset.preset);
      if (preset) {
        selectedDays = [...preset.days];
        c.querySelectorAll('.day-chip').forEach(dc => {
          dc.classList.toggle('active', selectedDays.includes(parseInt(dc.dataset.day)));
        });
      }
    });

    // Individual day toggles
    c.querySelectorAll('.day-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const day = parseInt(btn.dataset.day);
        const idx = selectedDays.indexOf(day);
        if (idx >= 0) selectedDays.splice(idx, 1);
        else selectedDays.push(day);
        selectedDays.sort((a, b) => a - b);
        btn.classList.toggle('active');
        c.querySelectorAll('.freq-preset').forEach(p => p.classList.remove('active'));
        const match = CONFIG.FREQUENCY_PRESETS.find(p =>
          JSON.stringify(p.days) === JSON.stringify(selectedDays)
        );
        if (match) c.querySelector(`.freq-preset[data-preset="${match.id}"]`)?.classList.add('active');
      });
    });

    // Add habit
    document.getElementById('btn-add-habit')?.addEventListener('click', () => {
      const name = document.getElementById('new-habit-name').value.trim();
      const icon = document.getElementById('new-habit-icon').value.trim() || '⭐';
      if (!name) { this.showToast('Bitte Name eingeben'); return; }
      Storage.addHabit({
        id: Storage.generateId(), name, icon,
        category: selectedCat, timeSlot: selectedTs, days: [...selectedDays]
      });
      this.showToast(`"${name}" hinzugefügt ✓`);
      this.renderSettings();
    });

    // Delete kcal
    c.querySelectorAll('.btn-delete-entry').forEach(btn => {
      btn.addEventListener('click', () => { Storage.removeKcalEntry(btn.dataset.date); this.renderSettings(); });
    });

    // Reset
    document.getElementById('btn-reset-all')?.addEventListener('click', () => {
      if (confirm('Wirklich ALLE Daten löschen?')) {
        localStorage.clear(); this.showToast('Alle Daten gelöscht'); this.showTab('today');
      }
    });

    // Sync
    document.getElementById('btn-sync-push')?.addEventListener('click', async () => {
      const status = document.getElementById('sync-status');
      status.textContent = 'Wird hochgeladen…';
      const id = await Storage.syncPush();
      if (id) {
        document.getElementById('sync-id-input').value = id;
        status.textContent = `✓ Hochgeladen! ID: ${id}`;
      } else { status.textContent = '✗ Fehler beim Hochladen'; }
    });
    document.getElementById('btn-sync-pull')?.addEventListener('click', async () => {
      const id = document.getElementById('sync-id-input').value.trim();
      if (!id) { this.showToast('Bitte Sync-ID eingeben'); return; }
      const status = document.getElementById('sync-status');
      status.textContent = 'Wird heruntergeladen…';
      const ok = await Storage.syncPull(id);
      if (ok) { status.textContent = '✓ Daten heruntergeladen!'; this.showTab('today'); }
      else { status.textContent = '✗ Sync-ID nicht gefunden'; }
    });
    document.getElementById('btn-sync-new')?.addEventListener('click', async () => {
      Storage.setSyncId('');
      const status = document.getElementById('sync-status');
      status.textContent = 'Erstelle neue Sync-ID…';
      const id = await Storage.syncPush();
      if (id) {
        document.getElementById('sync-id-input').value = id;
        status.textContent = `✓ Neue Sync-ID: ${id}`;
      } else { status.textContent = '✗ Fehler'; }
    });
  },

  renderKcalHistory() {
    const entries = Storage.getKcalEntries();
    const dates = Object.keys(entries).sort().reverse();
    if (dates.length === 0) return '<p class="hint">Noch keine kcal-Einträge.</p>';
    return `<div class="history-list">${dates.map(d => `
      <div class="history-item">
        <span class="history-date">${this.formatDateShort(d)}</span>
        <span class="history-val ${entries[d] < 0 ? 'deficit' : 'surplus'}">${entries[d] > 0 ? '+' : ''}${entries[d]} kcal</span>
        <button class="btn btn-sm btn-danger-outline btn-delete-entry" data-date="${d}">✕</button>
      </div>`).join('')}</div>`;
  },

  // ============================================================
  //  HELPERS
  // ============================================================

  calcHabitStreak(habits, allChecks) {
    if (habits.length === 0) return 0;
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const dc = allChecks[key] || {};
      const doneCount = Object.values(dc).filter(v => v.status === 'done').length;
      const dueHabits = habits.filter(h => Storage.isHabitDueToday(h, key));
      if (dueHabits.length > 0 && doneCount >= Math.ceil(dueHabits.length / 2)) streak++;
      else break;
    }
    return streak;
  },

  calcKcalStreak(kcalEntries) {
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      if (kcalEntries[key] !== undefined) streak++; else break;
    }
    return streak;
  },

  formatDateLong(dateStr) {
    const d = new Date(dateStr + 'T12:00:00');
    const days = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
    const months = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
    return `${days[d.getDay()]}, ${d.getDate()}. ${months[d.getMonth()]} ${d.getFullYear()}`;
  },

  formatDateShort(dateStr) {
    const [y, m, d] = dateStr.split('-');
    return `${d}.${m}.${y}`;
  },

  showToast(msg) {
    document.querySelector('.toast')?.remove();
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2000);
  },

  getDaysLabel(days) {
    if (!days || days.length === 7) return 'Täglich';
    if (days.length === 0) return '–';
    return days.map(d => CONFIG.WEEKDAYS[d]?.short || '?').join(' ');
  },

  // ============================================================
  //  EVENING CHECK-IN SYSTEM
  // ============================================================
  _checkin: null,
  _checkinTimer: null,

  checkEveningCheckin() {
    const now = new Date();
    const today = Storage.todayStr();
    const existing = Storage.getCheckin(today);
    if (now.getHours() >= CONFIG.CHECKIN.HOUR && (!existing || !existing.completed)) {
      this.showCheckin();
    }
  },

  showCheckin() {
    const overlay = document.getElementById('checkin-overlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    this._checkin = {
      step: 'areas',
      areas: { body: null, personal: null, spiritual: null },
      queue: [], queueIdx: 0, results: {}
    };
    this.renderCheckinStep();
  },

  closeCheckin() {
    const overlay = document.getElementById('checkin-overlay');
    if (overlay) overlay.classList.add('hidden');
    if (this._checkinTimer) { clearInterval(this._checkinTimer); this._checkinTimer = null; }
    this._checkin = null;
    this.renderToday();
  },

  renderCheckinStep() {
    const overlay = document.getElementById('checkin-overlay');
    if (!overlay || !this._checkin) return;
    const ci = this._checkin;
    if (ci.step === 'areas') this.renderCheckinAreas(overlay);
    else if (ci.step === 'process') this.renderCheckinProcess(overlay);
    else if (ci.step === 'done') this.renderCheckinDone(overlay);
  },

  renderCheckinAreas(overlay) {
    const ci = this._checkin;
    const allSet = Object.values(ci.areas).every(v => v !== null);
    overlay.innerHTML = `
      <div class="checkin-container">
        <div class="checkin-header">
          <h2>🌙 Abend Check-in</h2>
          <p>Wie war dein Tag in jedem Bereich?</p>
        </div>
        ${CONFIG.CATEGORIES.map(cat => {
          const st = ci.areas[cat.id];
          return `
            <div class="checkin-area ${st ? 'ci-' + st : ''}">
              <div class="checkin-area-top">
                <span class="checkin-area-icon" style="background:${cat.color}">${cat.icon}</span>
                <span class="checkin-area-name">${cat.name}</span>
              </div>
              <div class="checkin-area-btns">
                <button class="btn ci-btn ci-done-btn ${st === 'done' ? 'active' : ''}" data-cat="${cat.id}" data-st="done">✓ Done</button>
                <button class="btn ci-btn ci-miss-btn ${st === 'missed' ? 'active' : ''}" data-cat="${cat.id}" data-st="missed">✗ Not Done</button>
              </div>
            </div>
          `;
        }).join('')}
        <button class="btn btn-primary btn-block ci-continue" ${allSet ? '' : 'disabled'}>Weiter</button>
        <button class="btn btn-outline btn-block btn-sm ci-skip-all" style="margin-top:8px;opacity:.5">Überspringen</button>
      </div>
    `;
    overlay.querySelectorAll('.ci-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        ci.areas[btn.dataset.cat] = btn.dataset.st;
        this.renderCheckinStep();
      });
    });
    overlay.querySelector('.ci-continue')?.addEventListener('click', () => {
      const streaks = Storage.getCheckinStreaks();
      ci.queue = [];
      for (const cat of ['body', 'personal', 'spiritual']) {
        if (ci.areas[cat] === 'missed') {
          const missed = streaks[cat]?.daysMissed || 0;
          ci.queue.push({ cat, daysMissed: missed, type: missed === 0 ? 'reflection' : 'redemption' });
        }
      }
      ci.step = ci.queue.length > 0 ? 'process' : 'done';
      ci.queueIdx = 0;
      this.renderCheckinStep();
    });
    overlay.querySelector('.ci-skip-all')?.addEventListener('click', () => this.closeCheckin());
  },

  renderCheckinProcess(overlay) {
    const ci = this._checkin;
    const item = ci.queue[ci.queueIdx];
    if (!item) { ci.step = 'done'; this.renderCheckinStep(); return; }
    const catInfo = CONFIG.CATEGORIES.find(c => c.id === item.cat);
    if (item.type === 'reflection') this.renderReflection(overlay, item, catInfo);
    else this.renderRedemption(overlay, item, catInfo);
  },

  renderReflection(overlay, item, catInfo) {
    const ci = this._checkin;
    overlay.innerHTML = `
      <div class="checkin-container">
        <div class="checkin-header">
          <span class="ci-step-badge">${ci.queueIdx + 1}/${ci.queue.length}</span>
          <h2>${catInfo.icon} ${catInfo.name}</h2>
          <p>Erster verpasster Tag – kurze Reflexion:</p>
          <p class="ci-question">Warum hast du es nicht geschafft?</p>
        </div>
        <div class="ci-reasons">
          ${CONFIG.CHECKIN.REFLECTION_REASONS.map(r => `
            <button class="btn ci-reason-btn" data-reason="${r.id}">
              <span>${r.icon}</span> ${r.label}
            </button>
          `).join('')}
        </div>
      </div>
    `;
    overlay.querySelectorAll('.ci-reason-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        ci.results[item.cat] = { status: 'missed', reflection: btn.dataset.reason };
        ci.queueIdx++;
        if (ci.queueIdx >= ci.queue.length) ci.step = 'done';
        this.renderCheckinStep();
      });
    });
  },

  renderRedemption(overlay, item, catInfo) {
    const ci = this._checkin;
    const tasks = CONFIG.CHECKIN.REDEMPTION[item.cat] || [];
    if (!item.selectedTask) {
      overlay.innerHTML = `
        <div class="checkin-container">
          <div class="checkin-header">
            <span class="ci-step-badge">${ci.queueIdx + 1}/${ci.queue.length}</span>
            <h2>${catInfo.icon} ${catInfo.name}</h2>
            <p>${item.daysMissed + 1} Tage in Folge verpasst</p>
            <p class="ci-question">Wähle eine Wiedergutmachung:</p>
          </div>
          <div class="ci-tasks">
            ${tasks.map((t, i) => `
              <button class="btn ci-task-btn" data-idx="${i}">
                <span class="ci-task-icon">${t.icon}</span>
                <span class="ci-task-name">${t.name}</span>
              </button>
            `).join('')}
          </div>
        </div>
      `;
      overlay.querySelectorAll('.ci-task-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          item.selectedTask = tasks[parseInt(btn.dataset.idx)];
          this.renderCheckinStep();
        });
      });
      return;
    }
    const task = item.selectedTask;
    if (task.type === 'timer') this.renderTimerTask(overlay, item, task);
    else if (task.type === 'count') this.renderCountTask(overlay, item, task);
    else if (task.type === 'text') this.renderTextTask(overlay, item, task);
    else this.renderConfirmTask(overlay, item, task);
  },

  renderTimerTask(overlay, item, task) {
    let remaining = task.seconds;
    let running = false;
    const draw = () => {
      const m = Math.floor(remaining / 60), s = remaining % 60;
      overlay.innerHTML = `
        <div class="checkin-container">
          <div class="checkin-header"><h2>${task.icon} ${task.name}</h2></div>
          <div class="ci-timer-display">
            <span class="ci-timer-time">${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}</span>
          </div>
          ${remaining > 0 ? `
            <button class="btn btn-primary btn-block ci-timer-toggle">${running ? '⏸ Pause' : '▶ Start'}</button>
          ` : `
            <p class="ci-timer-done">Geschafft! 🎉</p>
            <button class="btn btn-primary btn-block ci-task-complete">Weiter</button>
          `}
        </div>
      `;
      if (remaining > 0) {
        overlay.querySelector('.ci-timer-toggle')?.addEventListener('click', () => {
          if (running) { running = false; clearInterval(this._checkinTimer); this._checkinTimer = null; }
          else {
            running = true;
            this._checkinTimer = setInterval(() => {
              remaining--;
              if (remaining <= 0) { clearInterval(this._checkinTimer); this._checkinTimer = null; running = false; }
              draw();
            }, 1000);
          }
          draw();
        });
      } else {
        overlay.querySelector('.ci-task-complete')?.addEventListener('click', () => this.completeRedemption(item));
      }
    };
    draw();
  },

  renderCountTask(overlay, item, task) {
    let count = 0;
    const draw = () => {
      overlay.innerHTML = `
        <div class="checkin-container">
          <div class="checkin-header"><h2>${task.icon} ${task.name}</h2></div>
          <div class="ci-count-display">
            <span class="ci-count-num">${count}</span>
            <span class="ci-count-target">/ ${task.target}</span>
          </div>
          <div class="ci-count-bar"><div class="ci-count-fill" style="width:${(count/task.target)*100}%"></div></div>
          ${count >= task.target ? `
            <p class="ci-timer-done">Geschafft! 🎉</p>
            <button class="btn btn-primary btn-block ci-task-complete">Weiter</button>
          ` : `
            <button class="btn btn-primary btn-block ci-count-add">+1</button>
          `}
        </div>
      `;
      overlay.querySelector('.ci-count-add')?.addEventListener('click', () => { count++; draw(); });
      overlay.querySelector('.ci-task-complete')?.addEventListener('click', () => this.completeRedemption(item));
    };
    draw();
  },

  renderTextTask(overlay, item, task) {
    overlay.innerHTML = `
      <div class="checkin-container">
        <div class="checkin-header"><h2>${task.icon} ${task.name}</h2><p>Schreibe einen kurzen Satz:</p></div>
        <textarea class="ci-text-input" placeholder="Was ist morgen deine Top-Priorität?"></textarea>
        <button class="btn btn-primary btn-block ci-task-complete" disabled>Fertig</button>
      </div>
    `;
    const ta = overlay.querySelector('.ci-text-input');
    const btn = overlay.querySelector('.ci-task-complete');
    ta?.addEventListener('input', () => { btn.disabled = ta.value.trim().length < 2; });
    btn?.addEventListener('click', () => this.completeRedemption(item));
  },

  renderConfirmTask(overlay, item, task) {
    overlay.innerHTML = `
      <div class="checkin-container">
        <div class="checkin-header"><h2>${task.icon} ${task.name}</h2><p>Mach es jetzt – es dauert nur kurz.</p></div>
        <button class="btn btn-primary btn-block ci-task-complete">Erledigt ✓</button>
      </div>
    `;
    overlay.querySelector('.ci-task-complete')?.addEventListener('click', () => this.completeRedemption(item));
  },

  completeRedemption(item) {
    const ci = this._checkin;
    ci.results[item.cat] = { status: 'redeemed', task: item.selectedTask.name };
    ci.areas[item.cat] = 'redeemed';
    ci.queueIdx++;
    if (ci.queueIdx >= ci.queue.length) ci.step = 'done';
    if (this._checkinTimer) { clearInterval(this._checkinTimer); this._checkinTimer = null; }
    this.renderCheckinStep();
  },

  renderCheckinDone(overlay) {
    const ci = this._checkin;
    const today = Storage.todayStr();
    const checkinData = { completed: true, areas: {} };
    for (const cat of ['body', 'personal', 'spiritual']) {
      if (ci.areas[cat] === 'done') checkinData.areas[cat] = { status: 'done' };
      else if (ci.results[cat]) checkinData.areas[cat] = ci.results[cat];
      else if (ci.areas[cat] === 'missed') checkinData.areas[cat] = { status: 'missed' };
    }
    Storage.setCheckin(today, checkinData);
    Storage.updateStreaksAfterCheckin(checkinData.areas);

    const hasRedeemed = Object.values(checkinData.areas).some(a => a.status === 'redeemed');
    const allDone = Object.values(checkinData.areas).every(a => a.status === 'done');

    overlay.innerHTML = `
      <div class="checkin-container">
        <div class="checkin-header">
          <h2>${allDone ? '🔥 Perfekter Tag!' : hasRedeemed ? '💪 Kurs korrigiert!' : '📝 Check-in gespeichert'}</h2>
          ${hasRedeemed ? '<p class="ci-redeem-msg">Du hast deinen Kurs korrigiert. Weiter so!</p>' : ''}
        </div>
        <div class="ci-summary">
          ${CONFIG.CATEGORIES.map(cat => {
            const a = checkinData.areas[cat.id];
            const sIcon = a?.status === 'done' ? '✅' : a?.status === 'redeemed' ? '🔄' : '❌';
            const sLabel = a?.status === 'done' ? 'Erledigt' : a?.status === 'redeemed' ? 'Wiedergutgemacht' : 'Verpasst';
            return `<div class="ci-summary-row"><span>${cat.icon} ${cat.name}</span><span>${sIcon} ${sLabel}</span></div>`;
          }).join('')}
        </div>
        <button class="btn btn-primary btn-block" id="ci-close">Fertig</button>
      </div>
    `;
    overlay.querySelector('#ci-close')?.addEventListener('click', () => this.closeCheckin());
  }
};

