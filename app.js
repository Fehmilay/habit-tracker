// ============================================================
// app.js – Hauptlogik: Views, Navigation, Day-Slide, Journal
// ============================================================

let state = null;
let chartInstance = null;
let currentView = 'today';
let viewDayOffset = 0;  // 0 = heute, -1 = gestern, +1 = morgen, ...

// Touch-Slide tracking
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;

// ===========================
//  INIT
// ===========================
document.addEventListener('DOMContentLoaded', async () => {
  state = await storage.getState();
  processDateLogic();
  renderCurrentView();
  setupSwipe();
  // Occasional blink loop
  setInterval(() => {
    const el = document.getElementById('buddyContainer');
    if (!el) return;
    el.classList.add('do-blink');
    setTimeout(() => el.classList.remove('do-blink'), 160);
  }, 4800 + Math.random() * 2400);
});

// ===========================
//  SWIPE / SLIDE (Today-View Tag-Wechsel)
// ===========================
function setupSwipe() {
  const app = document.getElementById('app');
  app.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchStartTime = Date.now();
  }, {passive: true});

  app.addEventListener('touchend', e => {
    if (currentView !== 'today') return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    const dt = Date.now() - touchStartTime;
    // Horizontal swipe: min 60px, max 300ms, more horizontal than vertical
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && dt < 400) {
      if (dx < 0) slideDay(1);   // swipe left → morgen
      else        slideDay(-1);  // swipe right → gestern
    }
  }, {passive: true});
}

function slideDay(dir) {
  viewDayOffset += dir;
  const app = document.getElementById('app');
  // Slide animation
  app.style.transition = 'transform 0.25s ease, opacity 0.2s ease';
  app.style.transform = `translateX(${dir > 0 ? '-' : ''}30px)`;
  app.style.opacity = '0.3';
  setTimeout(() => {
    renderCurrentView();
    app.style.transform = `translateX(${dir > 0 ? '' : '-'}30px)`;
    requestAnimationFrame(() => {
      app.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
      app.style.transform = 'translateX(0)';
      app.style.opacity = '1';
    });
  }, 150);
}

// ===========================
//  DATE LOGIC
// ===========================
function processDateLogic() {
  const today = todayStr();
  if (!state.lastUpdateDate) { state.lastUpdateDate = today; save(); return; }
  if (state.lastUpdateDate === today) { resetDailyGainIfNeeded(); return; }

  const last = new Date(state.lastUpdateDate + 'T00:00:00');
  const now  = new Date(today + 'T00:00:00');
  const diff = Math.round((now - last) / 86400000);
  if (diff <= 0) return;

  for (let d = 1; d <= diff; d++) {
    const dateObj = new Date(last.getTime() + d * 86400000);
    const dayNum  = dateObj.getDate();
    const mKey    = monthStr(dateObj);

    const donePerCat = { body:false, personal:false, spiritual:false };
    if (mKey === state.month) {
      for (const h of state.habits) {
        if (h.deleted) continue;
        if (state.checks[h.id]?.[dayNum]) donePerCat[h.category] = true;
      }
    }

    // ISO week reset
    const wk = isoWeek(dateObj);
    if (wk !== state.currentISOWeek) {
      state.currentISOWeek = wk;
      state.restDaysUsedThisWeek = 0;
    }

    // Decay + neglect
    for (const cat of ['body','personal','spiritual']) {
      if (!donePerCat[cat]) {
        state.areas[cat].value = Math.max(0, state.areas[cat].value - CONFIG.decay[cat]);
        state.areas[cat].daysMissed++;
        state.areas[cat].recoveryDays = 0;
        if (state.areas[cat].daysMissed >= 4 || state.areas[cat].value < CONFIG.neglect.neglected) {
          state.areas[cat].status = 'NEGLECTED';
        } else if (state.areas[cat].value <= CONFIG.neglect.low) {
          state.areas[cat].status = 'LOW';
        }
      } else {
        // Recovery
        if (state.areas[cat].status === 'NEGLECTED') {
          state.areas[cat].recoveryDays++;
          if (state.areas[cat].recoveryDays >= CONFIG.recoveryRequired) {
            state.areas[cat].status = state.areas[cat].value <= CONFIG.neglect.low ? 'LOW' : 'OK';
            state.areas[cat].daysMissed = 0;
            state.areas[cat].recoveryDays = 0;
          }
        } else {
          state.areas[cat].daysMissed = 0;
          state.areas[cat].status = state.areas[cat].value <= CONFIG.neglect.low ? 'LOW' : 'OK';
        }
      }
    }
  }

  // Month change
  const curMonth = monthStr();
  if (curMonth !== state.month) { state.month = curMonth; state.checks = {}; }

  updateStreaks();
  state.dailyGain = { body:0, personal:0, spiritual:0 };
  state.dailyGainDate = today;
  state.lastUpdateDate = today;
  save();
}

function resetDailyGainIfNeeded() {
  const t = todayStr();
  if (state.dailyGainDate !== t) {
    state.dailyGain = { body:0, personal:0, spiritual:0 };
    state.dailyGainDate = t;
    save();
  }
}

// ===========================
//  STREAKS
// ===========================
function updateStreaks() {
  const now = new Date();
  const day = now.getDate();
  if (!state.streaks) state.streaks = {};
  for (const h of state.habits) {
    if (h.deleted) continue;
    let s = 0;
    for (let d = day; d >= 1; d--) {
      if (state.checks[h.id]?.[d]) s++; else break;
    }
    state.streaks[h.id] = s;
  }
}

// ===========================
//  TOGGLE HABIT
// ===========================
function toggleHabit(habitId, dayNum) {
  if (!state.checks[habitId]) state.checks[habitId] = {};
  const was = !!state.checks[habitId][dayNum];
  state.checks[habitId][dayNum] = !was;

  const habit = state.habits.find(h => h.id === habitId);
  if (!habit) return;

  const today = new Date();
  // Apply gain/decay only for "real" today
  const viewDate = getViewDate();
  const isRealToday = todayStr(viewDate) === todayStr();

  if (isRealToday && dayNum === today.getDate()) {
    resetDailyGainIfNeeded();
    const cat = habit.category;
    const gain = CONFIG.gain[habitId] || CONFIG.defaultGain;
    if (!was) {
      const rem = CONFIG.dailyGainCap - (state.dailyGain[cat]||0);
      const actual = Math.min(gain, rem);
      if (actual > 0) {
        state.areas[cat].value = Math.min(100, state.areas[cat].value + actual);
        state.dailyGain[cat] = (state.dailyGain[cat]||0) + actual;
      }
    } else {
      state.areas[cat].value = Math.max(0, state.areas[cat].value - gain);
      state.dailyGain[cat] = Math.max(0, (state.dailyGain[cat]||0) - gain);
    }
    updateNeglect(cat);

    // Micro-animation on the row + buddy reaction
    setTimeout(() => {
      const row = document.querySelector(`[data-habit="${habitId}"]`);
      if (row && !was) row.classList.add('anim-done');
      if (!was) triggerBuddyReaction(cat);
    }, 30);
  }

  updateStreaks();
  save();
  renderCurrentView();
}

function updateNeglect(cat) {
  const today = new Date().getDate();
  const any = state.habits.some(h => !h.deleted && h.category===cat && state.checks[h.id]?.[today]);
  if (any) {
    if (state.areas[cat].status === 'NEGLECTED') {
      state.areas[cat].recoveryDays = Math.max(state.areas[cat].recoveryDays, 1);
    } else {
      state.areas[cat].daysMissed = 0;
      state.areas[cat].status = state.areas[cat].value <= CONFIG.neglect.low ? 'LOW' : 'OK';
    }
  }
}

// ===========================
//  REST DAY
// ===========================
function useRestDay() {
  const wk = isoWeek(new Date());
  if (wk !== state.currentISOWeek) { state.currentISOWeek = wk; state.restDaysUsedThisWeek = 0; }
  if (state.restDaysUsedThisWeek >= CONFIG.maxRestDaysPerWeek) { toast('Rest Day schon genutzt! 🛑'); return; }
  state.restDaysUsedThisWeek++;
  for (const cat of ['body','personal','spiritual']) {
    state.areas[cat].value = Math.min(100, state.areas[cat].value + Math.floor(CONFIG.decay[cat]/2));
  }
  save(); renderCurrentView();
  toast('Rest Day aktiviert! 🧘');
}

// ===========================
//  HABITS CRUD
// ===========================
function addHabit(name, category) {
  const id = 'h_' + Date.now();
  state.habits.push({ id, name, category, createdAt: Date.now(), deleted: false });
  CONFIG.gain[id] = CONFIG.defaultGain;
  save(); renderCurrentView();
}
function deleteHabit(id) {
  const h = state.habits.find(x => x.id === id);
  if (h) { h.deleted = true; save(); renderCurrentView(); }
}

// ===========================
//  JOURNAL
// ===========================
function saveJournalEntry(dateKey, questionId, value) {
  if (!state.journal) state.journal = {};
  if (!state.journal[dateKey]) state.journal[dateKey] = {};
  state.journal[dateKey][questionId] = value;
  save();
}

// ===========================
//  BUDDY CUSTOMIZATION
// ===========================
function saveBuddyOption(key, value) {
  state.buddy[key] = value;
  save();
  renderCurrentView();
}

// ===========================
//  SAVE
// ===========================
async function save() { await storage.saveState(state); }

// ===========================
//  NAVIGATION
// ===========================
function navigate(view) {
  currentView = view;
  viewDayOffset = 0;
  renderCurrentView();
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`[data-view="${view}"]`);
  if (btn) btn.classList.add('active');
}

function renderCurrentView() {
  if (!state) return;
  const app = document.getElementById('app');
  switch(currentView) {
    case 'today':    renderTodayView(app); break;
    case 'month':    renderMonthView(app); break;
    case 'insights': renderInsightsView(app); break;
    case 'settings': renderSettingsView(app); break;
  }
}

// ===========================
//  HELPER: View-Date (mit Offset)
// ===========================
function getViewDate() {
  const d = new Date();
  d.setDate(d.getDate() + viewDayOffset);
  return d;
}

function getViewDayNum() { return getViewDate().getDate(); }

// ===========================
//  TODAY VIEW (mit Day-Slide)
// ===========================
function renderTodayView(container) {
  const viewDate = getViewDate();
  const dayNum = viewDate.getDate();
  const dayNames = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
  const monthNames = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];

  const isToday = viewDayOffset === 0;
  const isFuture = viewDayOffset > 0;
  const dateLabel = isToday ? 'Heute' : viewDayOffset === -1 ? 'Gestern' : viewDayOffset === 1 ? 'Morgen' :
    `${dayNames[viewDate.getDay()]}, ${viewDate.getDate()}. ${monthNames[viewDate.getMonth()]}`;

  const activeHabits = state.habits.filter(h => !h.deleted);
  const doneToday = activeHabits.filter(h => state.checks[h.id]?.[dayNum]).length;
  const total = activeHabits.length;

  // Today-done per category (for avatar)
  const todayDone = { body:false, personal:false, spiritual:false };
  for (const h of activeHabits) {
    if (state.checks[h.id]?.[dayNum]) todayDone[h.category] = true;
  }

  const mood = getBuddyMood(state.areas, todayDone);
  const canRest = (state.restDaysUsedThisWeek||0) < CONFIG.maxRestDaysPerWeek;

  // Journal for this date
  const jDateKey = todayStr(viewDate);
  const jEntries = state.journal?.[jDateKey] || {};

  container.innerHTML = `
    <div class="today-view">
      <!-- Day Navigator -->
      <div class="day-nav">
        <button class="btn btn-icon day-arrow" onclick="slideDay(-1)">‹</button>
        <div class="day-nav-center">
          <h1 class="day-label">${dateLabel}</h1>
          <p class="day-subdate">${dayNames[viewDate.getDay()]}, ${viewDate.getDate()}. ${monthNames[viewDate.getMonth()]} ${viewDate.getFullYear()}</p>
        </div>
        <button class="btn btn-icon day-arrow" onclick="slideDay(1)">›</button>
      </div>

      <div class="today-score-row">
        <div class="today-score">${doneToday}/${total}</div>
      </div>

      <!-- Avatar -->
      <div class="avatar-section">
        <div id="buddyContainer" class="avatar-container"></div>
        <p class="mood-text mood-${mood.level}">${mood.text}</p>
      </div>

      <!-- Need Bars -->
      <div class="need-bars">
        ${needBar('Body', state.areas.body)}
        ${needBar('Personal', state.areas.personal)}
        ${needBar('Spiritual', state.areas.spiritual)}
      </div>

      ${isToday ? `<div class="rest-row">
        <button class="btn btn-rest ${!canRest?'disabled':''}" onclick="useRestDay()" ${!canRest?'disabled':''}>
          🧘 Rest Day ${!canRest?'(genutzt)':''}
        </button>
      </div>` : ''}

      <!-- Habits -->
      <div class="today-habits">
        <h2>Habits</h2>
        ${activeHabits.map(h => {
          const ck = !!state.checks[h.id]?.[dayNum];
          const stk = state.streaks?.[h.id] || 0;
          return `
          <div class="habit-row ${ck?'done':''}" data-habit="${h.id}" onclick="toggleHabit('${h.id}',${dayNum})">
            <div class="habit-check">${ck?'✓':''}</div>
            <div class="habit-info">
              <span class="habit-name">${h.name}</span>
              <span class="habit-cat cat-${h.category}">${h.category}</span>
            </div>
            ${stk>0?`<span class="habit-streak">🔥${stk}</span>`:''}
          </div>`;
        }).join('')}
      </div>

      <!-- Journal -->
      <div class="journal-section">
        <h2>📓 Tagesreflexion</h2>
        ${CONFIG.journalQuestions.map(q => `
          <div class="journal-q">
            <label class="journal-label">${q.text}</label>
            <textarea class="journal-input" rows="2" placeholder="..."
              oninput="saveJournalEntry('${jDateKey}','${q.id}',this.value)"
            >${jEntries[q.id]||''}</textarea>
          </div>
        `).join('')}
      </div>
    </div>`;

  // Render buddy
  renderBuddy(document.getElementById('buddyContainer'), state.areas, state.buddy, todayDone);
}

function needBar(label, area) {
  let cls = 'bar-ok';
  if (area.status==='NEGLECTED') cls='bar-neglected';
  else if (area.status==='LOW') cls='bar-low';
  return `
    <div class="need-bar-wrap">
      <div class="need-bar-label"><span>${label}</span><span class="need-val">${Math.round(area.value)}</span></div>
      <div class="need-bar"><div class="need-bar-fill ${cls}" style="width:${area.value}%"></div></div>
      ${area.status!=='OK'?`<span class="need-status st-${area.status.toLowerCase()}">${area.status}</span>`:''}
    </div>`;
}

// ===========================
//  MONTH VIEW
// ===========================
function renderMonthView(container) {
  const [yr,mo] = state.month.split('-').map(Number);
  const daysIn = new Date(yr,mo,0).getDate();
  const now = new Date();
  const todayD = (now.getFullYear()===yr && now.getMonth()+1===mo) ? now.getDate() : -1;
  const mNames = ['','Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
  const active = state.habits.filter(h => !h.deleted);

  let hdr = '<th class="sticky-col">Habit</th>';
  for (let d=1;d<=daysIn;d++) hdr+=`<th class="${d===todayD?'today-col':''}">${d}</th>`;

  let rows = '';
  for (const h of active) {
    let cells = `<td class="sticky-col hname-cell"><span class="cat-dot cat-dot-${h.category}"></span>${h.name}
      ${state.streaks?.[h.id]?'<span class="sbadge">🔥'+state.streaks[h.id]+'</span>':''}</td>`;
    for (let d=1;d<=daysIn;d++) {
      const ck = !!state.checks[h.id]?.[d];
      const past = d<todayD;
      cells += `<td class="ck-cell ${d===todayD?'today-col':''} ${past&&!ck?'missed':''}" onclick="toggleHabit('${h.id}',${d})">
        <div class="ck-box ${ck?'checked':''}">${ck?'✓':''}</div></td>`;
    }
    rows += `<tr>${cells}</tr>`;
  }

  container.innerHTML = `
    <div class="month-view">
      <header class="month-hdr">
        <button class="btn btn-icon" onclick="changeMonth(-1)">◀</button>
        <h2>${mNames[mo]} ${yr}</h2>
        <button class="btn btn-icon" onclick="changeMonth(1)">▶</button>
      </header>
      <div class="cal-scroll"><table class="cal-table"><thead><tr>${hdr}</tr></thead><tbody>${rows}</tbody></table></div>
      <div class="add-habit-sec">
        <h3>Habit hinzufügen</h3>
        <div class="add-form">
          <input type="text" id="newHabitName" placeholder="Name" class="input"/>
          <select id="newHabitCat" class="input"><option value="body">Body</option><option value="personal">Personal</option><option value="spiritual">Spiritual</option></select>
          <button class="btn btn-primary" onclick="onAddHabit()">+</button>
        </div>
      </div>
      <div class="manage-sec">
        <h3>Verwalten</h3>
        ${active.map(h=>`<div class="manage-row"><span class="cat-dot cat-dot-${h.category}"></span><span class="mr-name">${h.name}</span>
          <button class="btn btn-danger btn-sm" onclick="if(confirm('Löschen?'))deleteHabit('${h.id}')">✕</button></div>`).join('')}
      </div>
    </div>`;
}

function changeMonth(d){
  let [yr,mo]=state.month.split('-').map(Number);
  mo+=d;
  if(mo>12){mo=1;yr++;}if(mo<1){mo=12;yr--;}
  state.month=`${yr}-${String(mo).padStart(2,'0')}`;
  save(); renderCurrentView();
}

function onAddHabit(){
  const n=document.getElementById('newHabitName').value.trim();
  const c=document.getElementById('newHabitCat').value;
  if(!n){toast('Name eingeben!');return;}
  addHabit(n,c); toast(`"${n}" hinzugefügt!`);
}

// ===========================
//  INSIGHTS VIEW
// ===========================
function renderInsightsView(container) {
  const [yr,mo]=state.month.split('-').map(Number);
  const daysIn=new Date(yr,mo,0).getDate();
  const now=new Date();
  const upTo=(now.getFullYear()===yr&&now.getMonth()+1===mo)?now.getDate():daysIn;
  const active=state.habits.filter(h=>!h.deleted);

  const scores=[], labels=[];
  let total=0, possible=upTo*active.length;
  for(let d=1;d<=upTo;d++){
    let s=0;
    for(const h of active){if(state.checks[h.id]?.[d]){s++;total++;}}
    scores.push(s); labels.push(d);
  }
  const pct=possible>0?Math.round(total/possible*100):0;

  // Woche
  const ws=new Date(now); ws.setDate(now.getDate()-((now.getDay()+6)%7));
  const weekS={body:0,personal:0,spiritual:0};
  for(let i=0;i<7;i++){
    const wd=new Date(ws); wd.setDate(ws.getDate()+i);
    if(wd>now)continue;
    const d=wd.getDate(), mk=monthStr(wd);
    if(mk!==state.month)continue;
    for(const h of active){if(state.checks[h.id]?.[d])weekS[h.category]++;}
  }

  const streaks=active.map(h=>({name:h.name,streak:state.streaks?.[h.id]||0,cat:h.category})).sort((a,b)=>b.streak-a.streak);

  container.innerHTML = `
    <div class="insights-view">
      <header class="ins-hdr"><h2>Insights</h2><div class="monthly-pct"><span class="pct-num">${pct}%</span><span class="pct-lbl">Monthly</span></div></header>
      <div class="chart-wrap"><canvas id="dailyChart"></canvas></div>
      <div class="week-ov"><h3>Diese Woche</h3>
        <div class="week-stats">${weekStat('Body',weekS.body,'body')}${weekStat('Personal',weekS.personal,'personal')}${weekStat('Spiritual',weekS.spiritual,'spiritual')}</div>
      </div>
      <div class="streaks-sec"><h3>Streaks 🔥</h3>
        ${streaks.map(s=>`<div class="streak-row"><span class="cat-dot cat-dot-${s.cat}"></span><span class="sk-name">${s.name}</span><span class="sk-val">${s.streak}d</span></div>`).join('')}
      </div>
      <div class="needs-summary"><h3>Bereiche</h3>
        ${needBar('Body',state.areas.body)}${needBar('Personal',state.areas.personal)}${needBar('Spiritual',state.areas.spiritual)}
      </div>
    </div>`;
  drawChart(labels,scores,active.length);
}

function weekStat(label,count,cat){
  const pct=Math.min(100,Math.round(count/4*100));
  return `<div class="ws"><div class="ws-lbl">${label}</div><div class="ws-bar"><div class="ws-fill cat-fill-${cat}" style="width:${pct}%"></div></div><div class="ws-txt">${count}/4</div></div>`;
}

function drawChart(labels,data,max){
  const ctx=document.getElementById('dailyChart');
  if(!ctx)return;
  if(chartInstance)chartInstance.destroy();
  chartInstance=new Chart(ctx,{
    type:'bar',
    data:{labels,datasets:[{label:'Score',data,backgroundColor:data.map(v=>{const r=max>0?v/max:0;return r>=0.8?'#22c55e':r>=0.5?'#eab308':'#6b7280';}),borderRadius:4,borderSkipped:false}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:'#1f1f1f'}},
      scales:{y:{beginAtZero:true,max,ticks:{color:'#9ca3af',stepSize:1},grid:{color:'rgba(255,255,255,0.05)'}},x:{ticks:{color:'#9ca3af'},grid:{display:false}}}}
  });
}

// ===========================
//  SETTINGS VIEW (+ Buddy Customization)
// ===========================
function renderSettingsView(container) {
  const b = state.buddy;
  container.innerHTML = `
    <div class="settings-view">
      <h2>Einstellungen</h2>

      <!-- Buddy Customization -->
      <div class="setting-card">
        <h3>✏️ Buddy anpassen</h3>
        <div class="buddy-preview" id="buddyPreview"></div>

        <div class="cust-grid">
          ${custSelect('Frisur','hairStyle',b.hairStyle,[
            {v:'short',l:'Kurz'},{v:'curly',l:'Lockig'},{v:'long',l:'Lang'},{v:'buzz',l:'Buzz'},{v:'wavy',l:'Wellig'},{v:'braids',l:'Braids'}
          ])}
          ${custSelect('Augenbrauen','eyebrowStyle',b.eyebrowStyle,[
            {v:'normal',l:'Normal'},{v:'thick',l:'Dick'},{v:'thin',l:'Dünn'}
          ])}
          ${custToggle('Bart','beard',b.beard)}
          ${custSelect('Hautton','skinTone',b.skinTone,[
            {v:'light',l:'Hell'},{v:'medium',l:'Mittel'},{v:'tan',l:'Tan'},{v:'brown',l:'Braun'},{v:'dark',l:'Dunkel'}
          ])}
          ${custSelect('Outfit','outfitStyle',b.outfitStyle,[
            {v:'casual',l:'Casual'},{v:'sport',l:'Sport'},{v:'business',l:'Business'}
          ])}
          ${custSelect('Accessoire','signatureItem',b.signatureItem,[
            {v:'none',l:'Keins'},{v:'glasses',l:'Brille'},{v:'cap',l:'Cap'},{v:'watch',l:'Uhr'},{v:'headphones',l:'Kopfhörer'},{v:'chain',l:'Kette'}
          ])}
        </div>
      </div>

      <!-- Kategorie-Zuordnung -->
      <div class="setting-card">
        <h3>📂 Habit-Kategorien ändern</h3>
        ${state.habits.filter(h=>!h.deleted).map(h=>`
          <div class="cat-change-row">
            <span>${h.name}</span>
            <select class="input input-sm" onchange="changeHabitCat('${h.id}',this.value)">
              <option value="body" ${h.category==='body'?'selected':''}>Body</option>
              <option value="personal" ${h.category==='personal'?'selected':''}>Personal</option>
              <option value="spiritual" ${h.category==='spiritual'?'selected':''}>Spiritual</option>
            </select>
          </div>`).join('')}
      </div>

      <!-- Data -->
      <div class="setting-card">
        <h3>💾 Daten</h3>
        <button class="btn btn-primary" onclick="exportData()">📤 Export</button>
        <button class="btn btn-secondary" onclick="document.getElementById('impFile').click()">📥 Import</button>
        <input type="file" id="impFile" accept=".json" style="display:none" onchange="importData(event)"/>
        <button class="btn btn-danger" onclick="if(confirm('Alle Daten löschen?')){localStorage.clear();location.reload();}">🗑️ Reset</button>
      </div>

      <div class="setting-card">
        <h3>ℹ️ Info</h3>
        <p class="dim">Habit Tracker v2.0 · PWA · Dark Mode</p>
      </div>
    </div>`;

  // Render preview
  const prev = document.getElementById('buddyPreview');
  if (prev) {
    const dummyDone = { body:true, personal:true, spiritual:true };
    renderBuddy(prev, state.areas, state.buddy, dummyDone);
  }
}

function custSelect(label, key, current, opts) {
  return `<div class="cust-item">
    <label class="cust-label">${label}</label>
    <select class="input input-sm" onchange="saveBuddyOption('${key}',this.value)">
      ${opts.map(o=>`<option value="${o.v}" ${current===o.v?'selected':''}>${o.l}</option>`).join('')}
    </select>
  </div>`;
}

function custToggle(label, key, current) {
  return `<div class="cust-item">
    <label class="cust-label">${label}</label>
    <button class="btn btn-sm ${current?'btn-primary':'btn-secondary'}" onclick="saveBuddyOption('${key}',${!current})">
      ${current ? 'An' : 'Aus'}
    </button>
  </div>`;
}

function changeHabitCat(id, cat) {
  const h = state.habits.find(x=>x.id===id);
  if (h) { h.category = cat; save(); renderCurrentView(); }
}

// ===========================
//  DATA EXPORT/IMPORT
// ===========================
function exportData() {
  const blob = new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
  const a = document.createElement('a');
  a.href=URL.createObjectURL(blob); a.download=`habits-${state.month}.json`; a.click();
  toast('Exportiert!');
}
function importData(ev) {
  const f=ev.target.files[0]; if(!f)return;
  const r=new FileReader();
  r.onload=async e=>{try{state=JSON.parse(e.target.result);await save();renderCurrentView();toast('Importiert!');}catch{toast('Fehler!');}};
  r.readAsText(f);
}

// ===========================
//  TOAST
// ===========================
function toast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t=document.createElement('div'); t.id='toast'; document.body.appendChild(t); }
  t.textContent=msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2500);
}

