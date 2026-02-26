// ============================================================
// avatar.js – Simple Neon Stickman
// ============================================================

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function normalizeHexColor(value, fallback = '#22c55e') {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase();
  return fallback;
}

function ensureBuddy(buddy = {}) {
  return {
    neonColor: normalizeHexColor(buddy.neonColor || '#22c55e'),
    progress: clamp(Number.isFinite(+buddy.progress) ? +buddy.progress : 45, 0, 100)
  };
}

function getEvolutionStage(progress) {
  if (progress >= 85) return 4;
  if (progress >= 65) return 3;
  if (progress >= 45) return 2;
  if (progress >= 25) return 1;
  return 0;
}

function buildStateClass(areas, todayDone) {
  if (todayDone.body || todayDone.personal || todayDone.spiritual) return 'sm-state-active';
  const neglected = ['body', 'personal', 'spiritual'].some(k => areas[k]?.status === 'NEGLECTED');
  const low = ['body', 'personal', 'spiritual'].some(k => areas[k]?.status === 'LOW');
  if (neglected) return 'sm-state-down';
  if (low) return 'sm-state-low';
  return 'sm-state-neutral';
}

function renderBuddy(el, areas, buddy, todayDone) {
  if (!el) return;
  const b = ensureBuddy(buddy);
  const stage = getEvolutionStage(b.progress);
  const strokeW = 5 + stage;
  const bodyScale = 0.92 + stage * 0.03;
  const headR = 22 + stage * 1.2;

  el.style.setProperty('--sm-neon', b.neonColor);
  el.style.setProperty('--sm-stroke', `${strokeW}px`);

  el.innerHTML = `
  <svg viewBox="0 0 220 260" xmlns="http://www.w3.org/2000/svg" class="buddy-svg simple-stickman" role="img" aria-label="Neon Stickman">
    <g class="sm-reaction sm-reaction-body"><circle cx="42" cy="52" r="3"/><circle cx="30" cy="64" r="2.5"/><circle cx="54" cy="64" r="2.5"/></g>
    <g class="sm-reaction sm-reaction-personal"><circle cx="178" cy="52" r="3"/><circle cx="166" cy="64" r="2.5"/><circle cx="190" cy="64" r="2.5"/></g>
    <g class="sm-reaction sm-reaction-spiritual"><circle cx="110" cy="22" r="4"/><circle cx="98" cy="34" r="2.5"/><circle cx="122" cy="34" r="2.5"/></g>

    <ellipse class="sm-shadow" cx="110" cy="236" rx="42" ry="8"/>

    <g class="sm-body" transform="translate(110 145) scale(${bodyScale}) translate(-110 -145)">
      <circle class="sm-head" cx="110" cy="88" r="${headR}"/>

      <g class="sm-face sm-face-neutral">
        <circle cx="102" cy="88" r="2.7"/><circle cx="118" cy="88" r="2.7"/>
        <path d="M102 101 Q110 106 118 101"/>
      </g>
      <g class="sm-face sm-face-low">
        <line x1="98" y1="89" x2="106" y2="89"/><line x1="114" y1="89" x2="122" y2="89"/>
        <path d="M102 104 Q110 99 118 104"/>
      </g>
      <g class="sm-face sm-face-active">
        <path d="M98 88 Q102 83 106 88"/><path d="M114 88 Q118 83 122 88"/>
        <path d="M100 100 Q110 112 120 100"/>
      </g>

      <line x1="110" y1="112" x2="110" y2="176"/>
      <line class="sm-arm sm-arm-left" x1="110" y1="138" x2="86" y2="156"/>
      <line class="sm-arm sm-arm-right" x1="110" y1="138" x2="134" y2="156"/>
      <line x1="110" y1="176" x2="94" y2="212"/>
      <line x1="110" y1="176" x2="126" y2="212"/>
      <line x1="84" y1="212" x2="102" y2="212"/>
      <line x1="118" y1="212" x2="136" y2="212"/>

      <g class="sm-aura sm-stage-1"><circle cx="110" cy="64" r="34"/></g>
      <g class="sm-aura sm-stage-2"><circle cx="110" cy="64" r="44"/></g>
      <g class="sm-aura sm-stage-3"><circle cx="110" cy="64" r="54"/></g>
      <g class="sm-aura sm-stage-4"><circle cx="110" cy="64" r="66"/></g>

      <g class="sm-stage-extra sm-stage-3-mark"><path d="M74 76 L80 84 L70 84 Z"/><path d="M146 76 L150 84 L142 84 Z"/></g>
      <g class="sm-stage-extra sm-stage-4-mark"><circle cx="62" cy="70" r="2.7"/><circle cx="158" cy="70" r="2.7"/><circle cx="110" cy="34" r="2.7"/></g>
    </g>
  </svg>`;

  updateBuddyClasses(el, areas, b, todayDone);
  ensureBlinkLoop(el);
}

function updateBuddyClasses(el, areas, buddy, todayDone) {
  if (!el) return;
  const b = ensureBuddy(buddy);
  const stateClass = buildStateClass(areas, todayDone);
  const stage = getEvolutionStage(b.progress);

  Array.from(el.classList).forEach(cls => {
    if (cls.startsWith('sm-state-') || cls.startsWith('sm-stage-') || cls === 'do-blink') {
      el.classList.remove(cls);
    }
  });

  el.classList.add('buddy-wrap', stateClass, `sm-stage-${stage}`);
  el.style.setProperty('--sm-neon', b.neonColor);
}

function triggerBuddyReaction(category) {
  const targets = [document.getElementById('buddyContainer'), document.getElementById('buddyPreview')].filter(Boolean);
  const cls = category === 'spiritual' ? 'react-spiritual' : category === 'personal' ? 'react-personal' : 'react-body';
  targets.forEach(el => {
    el.classList.remove('react-body', 'react-personal', 'react-spiritual');
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), 700);
  });
}

function ensureBlinkLoop(el) {
  if (el._blinkTimer) return;
  const blink = () => {
    if (!document.body.contains(el)) {
      clearTimeout(el._blinkTimer);
      el._blinkTimer = null;
      return;
    }
    el.classList.add('do-blink');
    setTimeout(() => el.classList.remove('do-blink'), 120);
    el._blinkTimer = setTimeout(blink, 3600 + Math.random() * 2600);
  };
  el._blinkTimer = setTimeout(blink, 2100);
}

function getBuddyMood(areas, todayDone) {
  const done = [todayDone.body, todayDone.personal, todayDone.spiritual].filter(Boolean).length;
  const neglected = ['body', 'personal', 'spiritual'].filter(k => areas[k]?.status === 'NEGLECTED').length;
  const low = ['body', 'personal', 'spiritual'].filter(k => areas[k]?.status === 'LOW').length;

  if (done === 3) return { text: 'Starker Tag. Neon Buddy ist im Flow. ✨', level: 'great' };
  if (neglected >= 2) return { text: 'Buddy wird schwächer – heute wieder reinfinden.', level: 'critical' };
  if (neglected === 1) return { text: 'Ein Bereich braucht Fokus.', level: 'warning' };
  if (done >= 1) return { text: 'Guter Start, mach weiter.', level: 'good' };
  if (low >= 2) return { text: 'Ein paar Checks würden helfen.', level: 'caution' };
  return { text: 'Neon Buddy wartet auf den ersten Task.', level: 'ok' };
}
