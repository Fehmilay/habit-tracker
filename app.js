// ============================================================
// app.js – Hauptlogik des Habit-Trackers
// ============================================================
// Enthält: Date-Logic, Decay/Gain, Neglect, Streak, UI-Rendering,
// Navigation, Chart, Drag & Drop (optional), Rest-Day, etc.
// ============================================================

let state = null;
let chartInstance = null;

// ===========================
//  INIT
// ===========================
document.addEventListener('DOMContentLoaded', async () => {
  // Storage initialisieren
  const auth = await storage.setup();

  if (config.enableSync && auth) {
    showSyncLogin(auth);
  } else {
    await loadApp();
  }
});

/** Optional: Google Sign-In UI */
function showSyncLogin(auth) {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      storage.setUserId(user.uid);
      await loadApp();
      // Live-Updates bei Sync
      storage.onRemoteUpdate((remoteState) => {
        state = remoteState;
        renderCurrentView();
      });
    } else {
      document.getElementById('app').innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:16px;">
          <h2>Habit Tracker</h2>
          <button id="btnGoogleLogin" class="btn btn-primary" style="font-size:1.1rem;">
            Mit Google anmelden
          </button>
        </div>`;
      document.getElementById('btnGoogleLogin').addEventListener('click', () => {
        auth.signInWithPopup(provider);
      });
    }
  });
}

/** App-Daten laden und rendern */
async function loadApp() {
  state = await storage.getState();
  processDateLogic();
  renderCurrentView();
}

// ===========================
//  DATE LOGIC – Decay / Neglect / Streaks
// ===========================

/** Prüft ob Tage vergangen sind und wendet Decay an */
function processDateLogic() {
  const today = _todayStr();
  if (!state.lastUpdateDate) { state.lastUpdateDate = today; save(); return; }
  if (state.lastUpdateDate === today) {
    resetDailyGainIfNeeded();
    return;
  }

  // Tage berechnen die vergangen sind
  const last = new Date(state.lastUpdateDate + 'T00:00:00');
  const now  = new Date(today + 'T00:00:00');
  const daysDiff = Math.round((now - last) / 86400000);

  if (daysDiff <= 0) return;

  for (let d = 1; d <= daysDiff; d++) {
    const dateObj = new Date(last.getTime() + d * 86400000);
    const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    const dayNum  = dateObj.getDate();

    // Prüfe ob an diesem Tag etwas in jedem Bereich erledigt wurde
    const donePerCat = { body: false, personal: false, spiritual: false };

    // Nur prüfen wenn es der gleiche Monat ist
    const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
    if (monthKey === state.month) {
      for (const habit of state.habits) {
        if (habit.deleted) continue;
        if (state.checks[habit.id] && state.checks[habit.id][dayNum]) {
          donePerCat[habit.category] = true;
        }
      }
    }

    // Rest-Day Prüfung (ISO week)
    const week = _isoWeek(dateObj);
    if (week !== state.currentISOWeek) {
      state.currentISOWeek = week;
      state.restDaysUsedThisWeek = 0;
    }

    // Decay anwenden pro Kategorie
    for (const cat of ['body', 'personal', 'spiritual']) {
      if (!donePerCat[cat]) {
        state.needs[cat] = Math.max(0, state.needs[cat] - config.decay[cat]);

        // Neglect tracking
        state.neglect[cat].daysMissed++;
        state.neglect[cat].recoveryDays = 0;

        // Status updaten
        if (state.neglect[cat].daysMissed >= 3 || state.needs[cat] < config.neglectThresholds.neglected) {
          state.neglect[cat].status = 'NEGLECTED';
        } else if (state.needs[cat] <= config.neglectThresholds.low) {
          state.neglect[cat].status = 'LOW';
        }
      } else {
        // Recovery-Logik
        if (state.neglect[cat].status === 'NEGLECTED') {
          state.neglect[cat].recoveryDays++;
          if (state.neglect[cat].recoveryDays >= config.recoveryDaysRequired) {
            state.neglect[cat].status = state.needs[cat] <= config.neglectThresholds.low ? 'LOW' : 'OK';
            state.neglect[cat].daysMissed = 0;
            state.neglect[cat].recoveryDays = 0;
          }
        } else if (state.neglect[cat].status === 'LOW') {
          state.neglect[cat].daysMissed = 0;
          if (state.needs[cat] > config.neglectThresholds.low) {
            state.neglect[cat].status = 'OK';
          }
        } else {
          state.neglect[cat].daysMissed = 0;
        }
      }
    }
  }

  // Monatswechsel-Prüfung
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  if (currentMonth !== state.month) {
    state.month = currentMonth;
    state.checks = {};
  }

  // Streaks aktualisieren
  updateStreaks();

  // Daily gain reset
  state.dailyGainToday = { body: 0, personal: 0, spiritual: 0 };
  state.dailyGainDate = today;
  state.lastUpdateDate = today;
  save();
}

/** Daily-Gain-Cap Reset wenn neuer Tag */
function resetDailyGainIfNeeded() {
  const today = _todayStr();
  if (state.dailyGainDate !== today) {
    state.dailyGainToday = { body: 0, personal: 0, spiritual: 0 };
    state.dailyGainDate = today;
    save();
  }
}

// ===========================
//  STREAKS
// ===========================

function updateStreaks() {
  const today = new Date();
  const dayOfMonth = today.getDate();

  for (const habit of state.habits) {
    if (habit.deleted) continue;
    let streak = 0;
    // Zähle konsekutive Tage rückwärts ab gestern
    for (let d = dayOfMonth - 1; d >= 1; d--) {
      if (state.checks[habit.id] && state.checks[habit.id][d]) {
        streak++;
      } else {
        break;
      }
    }
    // Wenn heute auch erledigt, + 1
    if (state.checks[habit.id] && state.checks[habit.id][dayOfMonth]) {
      streak++;
    }
    if (!state.streaks) state.streaks = {};
    state.streaks[habit.id] = streak;
  }
}

// ===========================
//  HABIT TOGGLE
// ===========================

function toggleHabit(habitId, dayNum) {
  if (!state.checks[habitId]) state.checks[habitId] = {};

  const wasChecked = !!state.checks[habitId][dayNum];
  state.checks[habitId][dayNum] = !wasChecked;

  const habit = state.habits.find(h => h.id === habitId);
  if (!habit) return;

  const today = new Date();
  const todayDayNum = today.getDate();
  const isToday = dayNum === todayDayNum;

  // Gain / Decay nur für heutige Checks
  if (isToday) {
    resetDailyGainIfNeeded();
    const cat = habit.category;
    const gainAmount = config.gain[habitId] || 8;

    if (!wasChecked) {
      // Habit wird abgehakt → Gain anwenden (mit Cap)
      const currentGain = state.dailyGainToday[cat] || 0;
      const remaining = config.dailyGainCap - currentGain;
      const actualGain = Math.min(gainAmount, remaining);
      if (actualGain > 0) {
        state.needs[cat] = Math.min(100, state.needs[cat] + actualGain);
        state.dailyGainToday[cat] = currentGain + actualGain;
      }
    } else {
      // Habit wird entfernt → Gain zurücknehmen
      state.needs[cat] = Math.max(0, state.needs[cat] - (config.gain[habitId] || 8));
      state.dailyGainToday[cat] = Math.max(0, (state.dailyGainToday[cat] || 0) - gainAmount);
    }

    // Neglect/Recovery aktualisieren
    updateNeglectForCategory(cat);
  }

  updateStreaks();
  save();
  renderCurrentView();
}

/** Aktualisiert Neglect-Status für eine Kategorie basierend auf heutigen Checks */
function updateNeglectForCategory(cat) {
  const today = new Date().getDate();
  const anyDone = state.habits.some(h =>
    !h.deleted && h.category === cat && state.checks[h.id] && state.checks[h.id][today]
  );

  if (anyDone) {
    if (state.neglect[cat].status === 'NEGLECTED') {
      state.neglect[cat].recoveryDays = Math.max(state.neglect[cat].recoveryDays, 1);
    } else {
      state.neglect[cat].daysMissed = 0;
      if (state.needs[cat] > config.neglectThresholds.low) {
        state.neglect[cat].status = 'OK';
      } else {
        state.neglect[cat].status = 'LOW';
      }
    }
  }
}

// ===========================
//  REST DAY
// ===========================

function useRestDay() {
  const week = _isoWeek(new Date());
  if (week !== state.currentISOWeek) {
    state.currentISOWeek = week;
    state.restDaysUsedThisWeek = 0;
  }
  if (state.restDaysUsedThisWeek >= config.maxRestDaysPerWeek) {
    showToast('Rest Day schon diese Woche genutzt!');
    return;
  }
  state.restDaysUsedThisWeek++;
  // Halbiere heutigen Decay (wird beim nächsten Öffnen berücksichtigt)
  // Simuliere durch halben Gain auf alle Bereiche
  for (const cat of ['body', 'personal', 'spiritual']) {
    state.needs[cat] = Math.min(100, state.needs[cat] + Math.floor(config.decay[cat] / 2));
  }
  save();
  renderCurrentView();
  showToast('Rest Day aktiviert! Decay halbiert. 🧘');
}

// ===========================
//  HABIT MANAGEMENT
// ===========================

function addHabit(name, category) {
  const id = 'h_' + Date.now();
  state.habits.push({ id, name, category, createdAt: Date.now(), deleted: false });

  // Gain-Wert für neuen Habit setzen
  if (!config.gain[id]) config.gain[id] = 8;

  save();
  renderCurrentView();
}

function deleteHabit(habitId) {
  const habit = state.habits.find(h => h.id === habitId);
  if (habit) {
    habit.deleted = true;
    save();
    renderCurrentView();
  }
}

// ===========================
//  SAVE
// ===========================

async function save() {
  await storage.saveState(state);
}

// ===========================
//  NAVIGATION
// ===========================

let currentView = 'today';

function navigate(view) {
  currentView = view;
  renderCurrentView();
  // Navigations-Buttons aktualisieren
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const activeBtn = document.querySelector(`[data-view="${view}"]`);
  if (activeBtn) activeBtn.classList.add('active');
}

function renderCurrentView() {
  if (!state) return;
  const app = document.getElementById('app');

  switch (currentView) {
    case 'today':    renderTodayView(app); break;
    case 'month':    renderMonthView(app); break;
    case 'insights': renderInsightsView(app); break;
    case 'settings': renderSettingsView(app); break;
  }
}

// ===========================
//  TODAY VIEW
// ===========================

function renderTodayView(container) {
  const today = new Date();
  const dayNum = today.getDate();
  const dayNames = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
  const monthNames = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

  const mood = getAvatarMood(state.needs, state.neglect);

  const activeHabits = state.habits.filter(h => !h.deleted);
  const doneToday = activeHabits.filter(h => state.checks[h.id]?.[dayNum]).length;
  const totalHabits = activeHabits.length;

  // ISO week check for rest day
  const week = _isoWeek(today);
  if (week !== state.currentISOWeek) {
    state.currentISOWeek = week;
    state.restDaysUsedThisWeek = 0;
  }
  const canRestDay = state.restDaysUsedThisWeek < config.maxRestDaysPerWeek;

  container.innerHTML = `
    <div class="today-view">
      <header class="today-header">
        <div>
          <h1 class="today-date">${dayNames[today.getDay()]}</h1>
          <p class="today-subdate">${today.getDate()}. ${monthNames[today.getMonth()]} ${today.getFullYear()}</p>
        </div>
        <div class="today-score">${doneToday}/${totalHabits}</div>
      </header>

      <!-- Avatar -->
      <div class="avatar-section">
        <div id="avatarContainer" class="avatar-container"></div>
        <p class="mood-text ${mood.level}">${mood.emoji} ${mood.text}</p>
      </div>

      <!-- Need Bars -->
      <div class="need-bars">
        ${renderNeedBar('Body', state.needs.body, state.neglect.body.status)}
        ${renderNeedBar('Personal', state.needs.personal, state.neglect.personal.status)}
        ${renderNeedBar('Spiritual', state.needs.spiritual, state.neglect.spiritual.status)}
      </div>

      <!-- Rest Day Button -->
      <div class="rest-day-row">
        <button class="btn btn-rest ${!canRestDay ? 'disabled' : ''}" onclick="useRestDay()" ${!canRestDay ? 'disabled' : ''}>
          🧘 Rest Day ${!canRestDay ? '(genutzt)' : ''}
        </button>
      </div>

      <!-- Today Habits -->
      <div class="today-habits">
        <h2>Heute</h2>
        ${activeHabits.map(h => {
          const checked = state.checks[h.id]?.[dayNum] || false;
          const streak = state.streaks?.[h.id] || 0;
          return `
          <div class="habit-row ${checked ? 'done' : ''}" onclick="toggleHabit('${h.id}', ${dayNum})">
            <div class="habit-check">${checked ? '✓' : ''}</div>
            <div class="habit-info">
              <span class="habit-name">${h.name}</span>
              <span class="habit-cat cat-${h.category}">${h.category}</span>
            </div>
            ${streak > 0 ? `<span class="habit-streak">🔥 ${streak}</span>` : ''}
          </div>`;
        }).join('')}
      </div>
    </div>`;

  // Avatar rendern
  renderAvatar(document.getElementById('avatarContainer'), state.needs, state.neglect);
}

function renderNeedBar(label, value, status) {
  let cls = 'bar-ok';
  if (status === 'NEGLECTED') cls = 'bar-neglected';
  else if (status === 'LOW') cls = 'bar-low';

  return `
    <div class="need-bar-wrap">
      <div class="need-bar-label">
        <span>${label}</span>
        <span class="need-bar-value">${Math.round(value)}</span>
      </div>
      <div class="need-bar">
        <div class="need-bar-fill ${cls}" style="width:${value}%"></div>
      </div>
      ${status !== 'OK' ? `<span class="need-status status-${status.toLowerCase()}">${status}</span>` : ''}
    </div>`;
}

// ===========================
//  MONTH VIEW
// ===========================

function renderMonthView(container) {
  const [year, month] = state.month.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  const todayDay = (today.getFullYear() === year && today.getMonth() + 1 === month) ? today.getDate() : -1;
  const monthNames = ['','Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

  const activeHabits = state.habits.filter(h => !h.deleted);

  // Tage Header
  let daysHeader = '<th class="sticky-col">Habit</th>';
  for (let d = 1; d <= daysInMonth; d++) {
    daysHeader += `<th class="${d === todayDay ? 'today-col' : ''}">${d}</th>`;
  }

  // Habit Rows
  let rows = '';
  for (const habit of activeHabits) {
    let cells = `<td class="sticky-col habit-name-cell">
      <span class="habit-dot cat-dot-${habit.category}"></span>
      ${habit.name}
      <span class="streak-badge">${state.streaks?.[habit.id] ? '🔥' + state.streaks[habit.id] : ''}</span>
    </td>`;
    for (let d = 1; d <= daysInMonth; d++) {
      const checked = state.checks[habit.id]?.[d] || false;
      const isPast = d < todayDay || todayDay === -1;
      const isToday = d === todayDay;
      cells += `<td class="check-cell ${isToday ? 'today-col' : ''} ${isPast && !checked ? 'missed' : ''}"
                    onclick="toggleHabit('${habit.id}', ${d})">
        <div class="check-box ${checked ? 'checked' : ''}">${checked ? '✓' : ''}</div>
      </td>`;
    }
    rows += `<tr>${cells}</tr>`;
  }

  container.innerHTML = `
    <div class="month-view">
      <header class="month-header">
        <button class="btn btn-icon" onclick="changeMonth(-1)">◀</button>
        <h2>${monthNames[month]} ${year}</h2>
        <button class="btn btn-icon" onclick="changeMonth(1)">▶</button>
      </header>

      <div class="calendar-scroll">
        <table class="calendar-table">
          <thead><tr>${daysHeader}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>

      <div class="add-habit-section">
        <h3>Habit hinzufügen</h3>
        <div class="add-habit-form">
          <input type="text" id="newHabitName" placeholder="Habit Name" class="input"/>
          <select id="newHabitCat" class="input">
            <option value="body">Body</option>
            <option value="personal">Personal</option>
            <option value="spiritual">Spiritual</option>
          </select>
          <button class="btn btn-primary" onclick="onAddHabit()">+</button>
        </div>
      </div>

      <div class="manage-habits">
        <h3>Habits verwalten</h3>
        ${activeHabits.map(h => `
          <div class="manage-habit-row">
            <span class="habit-dot cat-dot-${h.category}"></span>
            <span>${h.name}</span>
            <button class="btn btn-danger btn-sm" onclick="if(confirm('${h.name} löschen?')) deleteHabit('${h.id}')">✕</button>
          </div>
        `).join('')}
      </div>
    </div>`;
}

function changeMonth(delta) {
  const [year, month] = state.month.split('-').map(Number);
  let newMonth = month + delta;
  let newYear = year;
  if (newMonth > 12) { newMonth = 1; newYear++; }
  if (newMonth < 1)  { newMonth = 12; newYear--; }
  state.month = `${newYear}-${String(newMonth).padStart(2, '0')}`;
  // Checks für anderen Monat leeren (Daten bleiben in localStorage pro Monat)
  save();
  renderCurrentView();
}

function onAddHabit() {
  const name = document.getElementById('newHabitName').value.trim();
  const cat  = document.getElementById('newHabitCat').value;
  if (!name) { showToast('Bitte Name eingeben!'); return; }
  addHabit(name, cat);
  showToast(`"${name}" hinzugefügt!`);
}

// ===========================
//  INSIGHTS VIEW
// ===========================

function renderInsightsView(container) {
  const [year, month] = state.month.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  const todayDay = (today.getFullYear() === year && today.getMonth() + 1 === month) ? today.getDate() : daysInMonth;
  const activeHabits = state.habits.filter(h => !h.deleted);

  // Daily Scores berechnen
  const dailyScores = [];
  const labels = [];
  let totalChecks = 0;
  const totalPossible = todayDay * activeHabits.length;

  for (let d = 1; d <= todayDay; d++) {
    let score = 0;
    for (const h of activeHabits) {
      if (state.checks[h.id]?.[d]) { score++; totalChecks++; }
    }
    dailyScores.push(score);
    labels.push(d);
  }

  const monthlyProgress = totalPossible > 0 ? Math.round((totalChecks / totalPossible) * 100) : 0;

  // Wochen-Übersicht (aktuelle Woche)
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7)); // Montag
  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const wd = new Date(weekStart);
    wd.setDate(weekStart.getDate() + i);
    weekDays.push(wd);
  }

  const weekStats = { body: 0, personal: 0, spiritual: 0 };
  for (const wd of weekDays) {
    if (wd > today) continue;
    const d = wd.getDate();
    const wdMonth = `${wd.getFullYear()}-${String(wd.getMonth() + 1).padStart(2, '0')}`;
    if (wdMonth !== state.month) continue;
    for (const h of activeHabits) {
      if (state.checks[h.id]?.[d]) {
        weekStats[h.category]++;
      }
    }
  }

  // Streak-Ranking
  const streakList = activeHabits
    .map(h => ({ name: h.name, streak: state.streaks?.[h.id] || 0, category: h.category }))
    .sort((a, b) => b.streak - a.streak);

  container.innerHTML = `
    <div class="insights-view">
      <header class="insights-header">
        <h2>Insights</h2>
        <div class="monthly-progress">
          <span class="progress-number">${monthlyProgress}%</span>
          <span class="progress-label">Monthly Progress</span>
        </div>
      </header>

      <!-- Chart -->
      <div class="chart-container">
        <canvas id="dailyChart"></canvas>
      </div>

      <!-- Wochen-Übersicht -->
      <div class="week-overview">
        <h3>Diese Woche</h3>
        <div class="week-stats">
          ${renderWeekStat('Body', weekStats.body, 'body')}
          ${renderWeekStat('Personal', weekStats.personal, 'personal')}
          ${renderWeekStat('Spiritual', weekStats.spiritual, 'spiritual')}
        </div>
      </div>

      <!-- Streaks -->
      <div class="streaks-section">
        <h3>Streaks 🔥</h3>
        <div class="streak-list">
          ${streakList.map(s => `
            <div class="streak-row">
              <span class="habit-dot cat-dot-${s.category}"></span>
              <span class="streak-name">${s.name}</span>
              <span class="streak-val">${s.streak} Tag${s.streak !== 1 ? 'e' : ''}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Need History -->
      <div class="needs-summary">
        <h3>Need-Übersicht</h3>
        ${renderNeedBar('Body', state.needs.body, state.neglect.body.status)}
        ${renderNeedBar('Personal', state.needs.personal, state.neglect.personal.status)}
        ${renderNeedBar('Spiritual', state.needs.spiritual, state.neglect.spiritual.status)}
      </div>
    </div>`;

  // Chart rendern
  renderDailyChart(labels, dailyScores, activeHabits.length);
}

function renderWeekStat(label, count, cat) {
  const goal = 4;
  const pct = Math.min(100, Math.round((count / goal) * 100));
  return `
    <div class="week-stat">
      <div class="week-stat-label">${label}</div>
      <div class="week-stat-bar">
        <div class="week-stat-fill cat-fill-${cat}" style="width:${pct}%"></div>
      </div>
      <div class="week-stat-text">${count}/${goal}</div>
    </div>`;
}

function renderDailyChart(labels, data, maxScore) {
  const ctx = document.getElementById('dailyChart');
  if (!ctx) return;

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Daily Score',
        data,
        backgroundColor: data.map(v => {
          const ratio = maxScore > 0 ? v / maxScore : 0;
          if (ratio >= 0.8) return '#22c55e';
          if (ratio >= 0.5) return '#eab308';
          return '#6b7280';
        }),
        borderRadius: 4,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1f1f1f',
          titleColor: '#fff',
          bodyColor: '#ccc'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: maxScore,
          ticks: { color: '#9ca3af', stepSize: 1 },
          grid: { color: 'rgba(255,255,255,0.05)' }
        },
        x: {
          ticks: { color: '#9ca3af' },
          grid: { display: false }
        }
      }
    }
  });
}

// ===========================
//  SETTINGS VIEW
// ===========================

function renderSettingsView(container) {
  container.innerHTML = `
    <div class="settings-view">
      <h2>Einstellungen</h2>

      <div class="setting-group">
        <h3>Daten</h3>
        <button class="btn btn-primary" onclick="exportData()">📤 Daten exportieren</button>
        <button class="btn btn-secondary" onclick="document.getElementById('importFile').click()">📥 Daten importieren</button>
        <input type="file" id="importFile" accept=".json" style="display:none" onchange="importData(event)"/>
        <button class="btn btn-danger" onclick="if(confirm('Alle Daten löschen?')){localStorage.clear();location.reload();}">🗑️ Alle Daten löschen</button>
      </div>

      <div class="setting-group">
        <h3>Sync</h3>
        <p class="setting-info">${config.enableSync ? '✅ Firebase Sync aktiv' : '❌ Sync deaktiviert (nur lokal)'}</p>
        <p class="setting-hint">Sync in <code>config.js</code> aktivieren.</p>
      </div>

      <div class="setting-group">
        <h3>App Info</h3>
        <p class="setting-info">Habit Tracker v1.0</p>
        <p class="setting-hint">PWA · Dark Mode · Made with ❤️</p>
      </div>
    </div>`;
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `habit-tracker-${state.month}.json`;
  a.click(); URL.revokeObjectURL(url);
  showToast('Daten exportiert!');
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      state = JSON.parse(e.target.result);
      await save();
      renderCurrentView();
      showToast('Daten importiert!');
    } catch {
      showToast('Fehler beim Importieren!');
    }
  };
  reader.readAsText(file);
}

// ===========================
//  TOAST
// ===========================

function showToast(message) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// ===========================
//  HELPERS (im globalen Scope)
// ===========================

function _todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function _isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}
