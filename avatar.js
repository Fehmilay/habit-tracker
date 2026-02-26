// ============================================================
// avatar.js – Stable Cool Stickman Buddy
// ============================================================

const BUDDY_ALLOWED = {
  hairStyle: ['short', 'messy', 'curly', 'cap'],
  skinTone: ['light', 'medium', 'tan', 'brown', 'dark'],
  outfitStyle: ['casual', 'sport', 'business'],
  signatureItem: ['none', 'glasses', 'watch', 'headphones', 'chain']
};

function sanitizeBuddy(buddy = {}) {
  return {
    hairStyle: BUDDY_ALLOWED.hairStyle.includes(buddy.hairStyle) ? buddy.hairStyle : 'short',
    eyebrowStyle: buddy.eyebrowStyle || 'normal',
    beard: !!buddy.beard,
    skinTone: BUDDY_ALLOWED.skinTone.includes(buddy.skinTone) ? buddy.skinTone : 'medium',
    outfitStyle: BUDDY_ALLOWED.outfitStyle.includes(buddy.outfitStyle) ? buddy.outfitStyle : 'casual',
    signatureItem: BUDDY_ALLOWED.signatureItem.includes(buddy.signatureItem) ? buddy.signatureItem : 'none'
  };
}

function deriveStateClasses(areas, todayDone) {
  const classes = [];

  if (todayDone.body) classes.push('state-body-fit');
  else if (areas.body?.daysMissed >= 4 || areas.body?.status === 'NEGLECTED') classes.push('state-body-neglected');
  else if (areas.body?.daysMissed >= 1 || areas.body?.status === 'LOW') classes.push('state-body-soft');

  if (todayDone.spiritual) classes.push('state-spiritual-peaceful');
  else if (areas.spiritual?.daysMissed >= 4 || areas.spiritual?.status === 'NEGLECTED') classes.push('state-spiritual-stressed');
  else if (areas.spiritual?.daysMissed >= 1 || areas.spiritual?.status === 'LOW') classes.push('state-spiritual-sad');

  if (todayDone.personal) classes.push('state-personal-focused');
  else if (areas.personal?.daysMissed >= 4 || areas.personal?.status === 'NEGLECTED') classes.push('state-personal-avoiding');
  else if (areas.personal?.daysMissed >= 1 || areas.personal?.status === 'LOW') classes.push('state-personal-foggy');

  if (!classes.length) classes.push('state-neutral');
  return classes;
}

function renderBuddy(el, areas, buddy, todayDone) {
  if (!el) return;
  const b = sanitizeBuddy(buddy);

  el.innerHTML = `
  <svg viewBox="0 0 220 260" xmlns="http://www.w3.org/2000/svg" class="buddy-svg stickman-svg" role="img" aria-label="Cool Stickman Buddy">
    <g class="fx fx-body"><circle cx="38" cy="48" r="3"/><circle cx="30" cy="63" r="2.5"/><circle cx="47" cy="63" r="2.5"/></g>
    <g class="fx fx-spiritual"><circle cx="110" cy="20" r="5"/><circle cx="86" cy="34" r="3"/><circle cx="134" cy="34" r="3"/></g>
    <g class="fx fx-personal"><circle cx="180" cy="45" r="3"/><circle cx="168" cy="58" r="2.5"/><circle cx="192" cy="58" r="2.5"/></g>
    <g class="fx fx-stress"><ellipse cx="110" cy="28" rx="24" ry="10"/><circle cx="90" cy="31" r="7"/><circle cx="128" cy="31" r="8"/></g>

    <g class="buddy-bounce">
      <g class="buddy-breathe">
        <ellipse cx="110" cy="236" rx="44" ry="8" class="shadow"/>

        <g class="stickman-hair hair-short"><path d="M86 72 Q110 52 134 72"/></g>
        <g class="stickman-hair hair-messy"><path d="M84 74 L92 58 L100 72 L108 56 L116 72 L124 58 L132 74"/></g>
        <g class="stickman-hair hair-curly"><circle cx="90" cy="68" r="6"/><circle cx="102" cy="62" r="6"/><circle cx="116" cy="62" r="6"/><circle cx="128" cy="68" r="6"/></g>
        <g class="stickman-hair hair-cap"><path d="M82 74 Q110 50 138 74"/><rect x="82" y="74" width="56" height="9" rx="4"/></g>

        <circle cx="110" cy="92" r="28" class="head"/>

        <g class="eyes eyes-default"><circle cx="100" cy="90" r="3"/><circle cx="120" cy="90" r="3"/></g>
        <g class="eyes eyes-happy"><path d="M95 90 Q100 84 105 90"/><path d="M115 90 Q120 84 125 90"/></g>
        <g class="eyes eyes-tired"><line x1="95" y1="91" x2="105" y2="91"/><line x1="115" y1="91" x2="125" y2="91"/></g>
        <g class="eyes eyes-stressed"><circle cx="100" cy="90" r="3.8"/><circle cx="120" cy="90" r="3.8"/></g>
        <g class="eyes eyes-blink"><line x1="95" y1="91" x2="105" y2="91"/><line x1="115" y1="91" x2="125" y2="91"/></g>

        <g class="mouth mouth-neutral"><path d="M102 104 Q110 109 118 104"/></g>
        <g class="mouth mouth-smile"><path d="M100 102 Q110 114 120 102"/></g>
        <g class="mouth mouth-sad"><path d="M100 110 Q110 101 120 110"/></g>
        <g class="mouth mouth-tight"><line x1="101" y1="106" x2="119" y2="106"/></g>

        <g class="item glasses"><rect x="92" y="84" width="15" height="10" rx="3"/><rect x="113" y="84" width="15" height="10" rx="3"/><line x1="107" y1="89" x2="113" y2="89"/></g>
        <g class="item headphones"><path d="M88 88 Q88 70 110 70 Q132 70 132 88"/><rect x="84" y="84" width="6" height="12" rx="3"/><rect x="130" y="84" width="6" height="12" rx="3"/></g>
        <g class="item chain"><path d="M95 124 Q110 136 125 124"/></g>

        <g class="torso outfit-casual">
          <line x1="110" y1="120" x2="110" y2="176"/>
          <line x1="92" y1="132" x2="128" y2="132"/>
        </g>
        <g class="torso outfit-sport"><line x1="110" y1="120" x2="110" y2="176"/><line x1="92" y1="132" x2="128" y2="132"/><line x1="102" y1="132" x2="102" y2="175"/></g>
        <g class="torso outfit-business"><line x1="110" y1="120" x2="110" y2="176"/><path d="M102 126 L110 140 L118 126"/></g>

        <g class="arms arms-default"><line x1="110" y1="138" x2="84" y2="156"/><line x1="110" y1="138" x2="136" y2="156"/></g>
        <g class="arms arms-fit"><line x1="110" y1="138" x2="86" y2="122"/><line x1="110" y1="138" x2="134" y2="122"/></g>
        <g class="arms arms-prayer"><line x1="110" y1="138" x2="103" y2="160"/><line x1="110" y1="138" x2="117" y2="160"/><line x1="103" y1="160" x2="117" y2="160"/></g>
        <g class="arms arms-laptop"><line x1="110" y1="138" x2="95" y2="170"/><line x1="110" y1="138" x2="125" y2="170"/><rect x="80" y="170" width="60" height="24" rx="4"/></g>
        <g class="arms arms-phone"><line x1="110" y1="138" x2="90" y2="158"/><line x1="110" y1="138" x2="128" y2="156"/><rect x="128" y="146" width="12" height="20" rx="2"/></g>
        <g class="arms arms-pocket"><line x1="110" y1="138" x2="98" y2="154"/><line x1="110" y1="138" x2="122" y2="154"/></g>

        <g class="legs"><line x1="110" y1="176" x2="94" y2="212"/><line x1="110" y1="176" x2="126" y2="212"/></g>
        <g class="shoes"><line x1="85" y1="212" x2="102" y2="212"/><line x1="118" y1="212" x2="135" y2="212"/></g>

        <g class="item watch"><rect x="82" y="151" width="8" height="8" rx="2"/></g>
        <g class="beard"><path d="M98 110 Q110 120 122 110"/></g>
      </g>
    </g>
  </svg>`;

  updateBuddyClasses(el, areas, b, todayDone);
  ensureBlinkLoop(el);
}

function updateBuddyClasses(el, areas, buddy, todayDone) {
  if (!el) return;
  const b = sanitizeBuddy(buddy);

  Array.from(el.classList).forEach(cls => {
    if (
      cls.startsWith('state-') ||
      cls.startsWith('hair-') ||
      cls.startsWith('outfit-') ||
      cls.startsWith('item-') ||
      cls.startsWith('skin-') ||
      cls === 'beard-on' || cls === 'do-blink'
    ) el.classList.remove(cls);
  });

  const stateClasses = deriveStateClasses(areas, todayDone);
  el.classList.add('buddy-wrap', ...stateClasses, `hair-${b.hairStyle}`, `outfit-${b.outfitStyle}`, `skin-${b.skinTone}`);

  if (b.beard) el.classList.add('beard-on');
  if (b.signatureItem !== 'none') el.classList.add(`item-${b.signatureItem}`);
}

function triggerBuddyReaction(category) {
  const targets = [document.getElementById('buddyContainer'), document.getElementById('buddyPreview')].filter(Boolean);
  const cls = category === 'spiritual' ? 'react-spiritual' : category === 'personal' ? 'react-personal' : 'react-body';
  targets.forEach(el => {
    el.classList.remove('react-body', 'react-personal', 'react-spiritual');
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), 650);
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
    el._blinkTimer = setTimeout(blink, 3400 + Math.random() * 2600);
  };
  el._blinkTimer = setTimeout(blink, 2000);
}

function getBuddyMood(areas, todayDone) {
  const done = [todayDone.body, todayDone.personal, todayDone.spiritual].filter(Boolean).length;
  const neglected = ['body', 'personal', 'spiritual'].filter(k => areas[k]?.status === 'NEGLECTED').length;
  const low = ['body', 'personal', 'spiritual'].filter(k => areas[k]?.status === 'LOW').length;

  if (done === 3) return { text: 'Legendär heute. Buddy feiert dich. 😎', level: 'great' };
  if (neglected >= 2) return { text: 'Buddy ist im Alarmmodus. Zeit für Fokus.', level: 'critical' };
  if (neglected === 1) return { text: 'Ein Bereich kippt gerade. Kurz gegensteuern.', level: 'warning' };
  if (done >= 1) return { text: 'Solider Start. Bleib im Flow.', level: 'good' };
  if (low >= 2) return { text: 'Heute ein kleines Reset wäre stark.', level: 'caution' };
  return { text: 'Buddy wartet auf den ersten Check-in.', level: 'ok' };
}
