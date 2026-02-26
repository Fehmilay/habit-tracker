// ============================================================
// avatar.js – Premium Chibi Buddy · Layer SVG System
// ============================================================
// Renders a full-body chibi character with:
//  - Layer groups controlled by CSS classes
//  - State classes set on the container for all 10 states
//  - Idle breathing + blink animations
//  - Micro-reaction triggers via triggerBuddyReaction()
//  - Customization: skinTone, hairStyle, accessories
// ============================================================

// ---- Colour palettes ----
const BUDDY_SKIN = {
  light:  { base:'#FDDBB4', shadow:'#F0BC80', ear:'#F5C895' },
  medium: { base:'#E8A96A', shadow:'#C88040', ear:'#DFA055' },
  tan:    { base:'#C9884A', shadow:'#A06530', ear:'#C07E40' },
  brown:  { base:'#8B5E3C', shadow:'#6A3E20', ear:'#804E2C' },
  dark:   { base:'#5C3320', shadow:'#3E2010', ear:'#522D1A' }
};

const BUDDY_HAIR = {
  short:  '#2A1708',
  messy:  '#2A1708',
  curly:  '#2A1708',
  cap:    '#2A1708'
};

// ============================================================
//  renderBuddy()  – main entry point
// ============================================================
function renderBuddy(el, areas, buddy, todayDone) {
  const skin = BUDDY_SKIN[buddy.skinTone] || BUDDY_SKIN.medium;
  const hairColor = '#2A1708';
  const hairHi    = '#4A3020';

  // Determine compound state (strongest signal wins per area)
  const bd = areas.body, pr = areas.personal, sp = areas.spiritual;
  const bodyState    = todayDone.body      ? 'body-fit'
                     : bd.daysMissed >= 4  ? 'body-neglected'
                     : bd.daysMissed >= 1  ? 'body-soft'     : 'neutral';
  const spiritState  = todayDone.spiritual ? 'spiritual-peaceful'
                     : sp.daysMissed >= 4  ? 'spiritual-stressed'
                     : sp.daysMissed >= 1  ? 'spiritual-sad' : 'neutral';
  const persState    = todayDone.personal  ? 'personal-focused'
                     : pr.daysMissed >= 4  ? 'personal-avoiding'
                     : pr.daysMissed >= 1  ? 'personal-foggy' : 'neutral';

  el.innerHTML = _buildSVG(skin, hairColor, hairHi, buddy);
  updateBuddyClasses(el, bodyState, spiritState, persState, buddy);
}

// ============================================================
//  updateBuddyClasses()  – fast path: only update classes
// ============================================================
function updateBuddyClasses(el, bodyState, spiritState, persState, buddy) {
  const allStates = [
    'state-neutral','state-body-fit','state-body-soft','state-body-neglected',
    'state-spiritual-peaceful','state-spiritual-sad','state-spiritual-stressed',
    'state-personal-focused','state-personal-foggy','state-personal-avoiding'
  ];
  el.classList.remove(...allStates);

  // Dominant visual state (one body/spiritual merged)
  const domState = bodyState !== 'neutral' ? bodyState
                 : spiritState !== 'neutral' ? spiritState
                 : persState !== 'neutral'   ? persState
                 : 'neutral';

  el.classList.add('buddy-wrap', `state-${domState}`);

  // Always add ALL active states so multiple layers can respond
  if (bodyState    !== 'neutral') el.classList.add(`state-${bodyState}`);
  if (spiritState  !== 'neutral') el.classList.add(`state-${spiritState}`);
  if (persState    !== 'neutral') el.classList.add(`state-${persState}`);

  // Accessory classes
  el.classList.toggle('buddy-has-glasses', buddy.signatureItem === 'glasses');
  el.classList.toggle('buddy-has-watch',   buddy.signatureItem === 'watch');
  el.classList.toggle('buddy-has-chain',   buddy.signatureItem === 'chain');
  el.classList.toggle('buddy-has-headphones', buddy.signatureItem === 'headphones');
  el.classList.toggle(`buddy-hair-${buddy.hairStyle || 'short'}`, true);
  el.classList.toggle('buddy-has-beard',   !!buddy.beard);
}

// ============================================================
//  Micro reactions (called from app.js on habit check)
// ============================================================
function triggerBuddyReaction(category) {
  const el = document.getElementById('buddyContainer');
  if (!el) return;
  const cls = {
    body:     'react-body',
    spiritual:'react-spiritual',
    personal: 'react-personal'
  }[category] || 'react-body';
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), 1200);
}

// ============================================================
//  Mood text helper
// ============================================================
function getBuddyMood(areas, todayDone) {
  const neg = ['body','personal','spiritual'].filter(k => areas[k].status === 'NEGLECTED').length;
  const low = ['body','personal','spiritual'].filter(k => areas[k].status === 'LOW').length;
  const done = [todayDone.body, todayDone.personal, todayDone.spiritual].filter(Boolean).length;
  if (done === 3) return { text:"Buddy ist stolz auf dich! 💪", level:'great' };
  if (neg >= 2)   return { text:"Buddy braucht dringend Aufmerksamkeit!", level:'critical' };
  if (neg === 1)  return { text:"Ein Bereich wird vernachlässigt...", level:'warning' };
  if (done >= 1)  return { text:"Guter Start, weiter so!", level:'good' };
  if (low >= 2)   return { text:"Buddy könnte Pflege gebrauchen.", level:'caution' };
  return { text:"Warte auf deine Habits.", level:'ok' };
}

// ============================================================
//  SVG TEMPLATE  (all layers, all states)
// ============================================================
function _buildSVG(skin, hairColor, hairHi, buddy) {
  const S = skin.base, SS = skin.shadow, SE = skin.ear;
  const H = hairColor, HH = hairHi;

  // Hoodie colors
  const HOOD   = '#363636';
  const HOOD_D = '#242424';
  const HOOD_L = '#484848';
  const PANTS  = '#1A1A2E';
  const PANTS_D= '#111120';
  const SHOE_W = '#EBEBEB';
  const OL     = '#1A1008'; // outline color

  return `<svg viewBox="0 0 200 290" xmlns="http://www.w3.org/2000/svg"
    class="buddy-svg" role="img" aria-label="Buddy Avatar"
    style="overflow:visible">

  <defs>
    <!-- Face glow filter -->
    <filter id="glow-green" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="5" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="glow-gold" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="fog-blur">
      <feGaussianBlur stdDeviation="2"/>
    </filter>
    <radialGradient id="grad-face" cx="45%" cy="35%" r="60%">
      <stop offset="0%" stop-color="${_lighten(S,18)}"/>
      <stop offset="100%" stop-color="${S}"/>
    </radialGradient>
    <radialGradient id="grad-hoodie" cx="30%" cy="20%" r="70%">
      <stop offset="0%" stop-color="${HOOD_L}"/>
      <stop offset="100%" stop-color="${HOOD_D}"/>
    </radialGradient>
    <radialGradient id="grad-pants" cx="30%" cy="15%" r="70%">
      <stop offset="0%" stop-color="#2a2a3e"/>
      <stop offset="100%" stop-color="${PANTS_D}"/>
    </radialGradient>
  </defs>

  <!-- ============================= -->
  <!--   LAYER: AURA (behind all)    -->
  <!-- ============================= -->
  <g class="layer-aura">
    <!-- peaceful warm aura -->
    <g class="aura-peaceful">
      <ellipse cx="100" cy="160" rx="90" ry="105" fill="rgba(253,186,116,0.10)"/>
      <ellipse cx="100" cy="160" rx="72" ry="85"  fill="rgba(253,186,116,0.08)"/>
      <!-- Gold sparkle particles -->
      ${_sparkleParticles(6, '#FBBF24', 0.8)}
    </g>
    <!-- stressed dark aura -->
    <g class="aura-stressed">
      <ellipse cx="100" cy="160" rx="80" ry="95" fill="rgba(55,10,10,0.18)"/>
      ${_darkParticles(5)}
    </g>
    <!-- green after body-check -->
    <g class="aura-react-body">
      ${_sparkleParticles(4, '#22C55E', 0.9)}
    </g>
    <!-- blue after personal-check -->
    <g class="aura-react-personal">
      ${_sparkleParticles(4, '#60A5FA', 0.9)}
    </g>
  </g>

  <!-- ============================= -->
  <!--   BREATHING GROUP             -->
  <!-- ============================= -->
  <g class="buddy-breathe">

  <!-- Ground shadow -->
  <ellipse cx="100" cy="283" rx="42" ry="6"
    fill="rgba(0,0,0,0.25)" class="ground-shadow"/>

  <!-- ============================= -->
  <!--   LAYER: LEGS                 -->
  <!-- ============================= -->
  <g class="layer-legs">
    <!-- Left leg -->
    <path d="M 79,214 Q 78,215 77,258 Q 77,265 84,265 Q 91,265 91,258 L 91,214 Z"
      fill="url(#grad-pants)" stroke="${OL}" stroke-width="1.5" stroke-linejoin="round"/>
    <!-- Right leg -->
    <path d="M 109,214 Q 110,215 111,258 Q 111,265 118,265 Q 125,265 124,258 L 124,214 Z"
      fill="url(#grad-pants)" stroke="${OL}" stroke-width="1.5" stroke-linejoin="round"/>
    <!-- Inner leg crease -->
    <line x1="91" y1="218" x2="91" y2="255" stroke="${PANTS_D}" stroke-width="0.8" opacity="0.6"/>
    <line x1="109" y1="218" x2="109" y2="255" stroke="${PANTS_D}" stroke-width="0.8" opacity="0.6"/>
  </g>

  <!-- ============================= -->
  <!--   LAYER: SHOES                -->
  <!-- ============================= -->
  <g class="layer-shoes">
    <!-- LEFT SHOE -->
    <path d="M 68,262 Q 66,263 65,268 Q 64,274 68,276 Q 70,278 80,278 L 94,278
             Q 98,278 98,273 Q 98,268 95,264 Q 92,261 88,261 L 73,261 Q 70,261 68,262 Z"
      fill="${SHOE_W}" stroke="${OL}" stroke-width="1.5" stroke-linejoin="round"/>
    <!-- Left sole stripe -->
    <path d="M 67,272 Q 70,273 80,273 L 95,273"
      stroke="#22C55E" stroke-width="2.5" stroke-linecap="round" fill="none"/>
    <!-- Left toe cap -->
    <path d="M 65,268 Q 64,271 68,274"
      stroke="#CCCCCC" stroke-width="1" fill="none" opacity="0.6"/>

    <!-- RIGHT SHOE -->
    <path d="M 105,261 Q 102,261 100,264 Q 97,268 97,273 Q 97,278 101,278 L 120,278
             Q 130,278 132,276 Q 136,274 135,268 Q 134,263 132,262 Q 130,261 127,261 Z"
      fill="${SHOE_W}" stroke="${OL}" stroke-width="1.5" stroke-linejoin="round"/>
    <!-- Right sole stripe -->
    <path d="M 105,273 L 133,273"
      stroke="#22C55E" stroke-width="2.5" stroke-linecap="round" fill="none"/>
    <!-- Right toe cap -->
    <path d="M 135,268 Q 136,271 132,274"
      stroke="#CCCCCC" stroke-width="1" fill="none" opacity="0.6"/>

    <!-- FIT state: shoe glow accent -->
    <g class="shoes-fit-accent">
      <path d="M 67,272 Q 70,273 80,273 L 95,273"
        stroke="#4ADE80" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.5"
        class="shoe-glow"/>
      <path d="M 105,273 L 133,273"
        stroke="#4ADE80" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.5"
        class="shoe-glow"/>
    </g>
  </g>

  <!-- ============================= -->
  <!--   LAYER: TORSO / HOODIE       -->
  <!-- ============================= -->
  <g class="layer-torso">
    <!-- Main hoodie body -->
    <path d="M 68,140 Q 64,142 62,150 L 60,215 Q 60,220 65,220 L 135,220
             Q 140,220 140,215 L 138,150 Q 136,142 132,140
             Q 120,133 100,133 Q 80,133 68,140 Z"
      fill="url(#grad-hoodie)" stroke="${OL}" stroke-width="1.8" stroke-linejoin="round"/>
    <!-- Hoodie highlight (shoulder) -->
    <path d="M 68,140 Q 76,135 88,133 Q 94,132 100,132"
      stroke="${HOOD_L}" stroke-width="2.5" stroke-linecap="round"
      fill="none" opacity="0.5"/>
    <!-- Kangaroo pocket -->
    <path d="M 80,194 Q 80,188 85,188 L 115,188 Q 120,188 120,194
             L 120,212 Q 120,216 115,216 L 85,216 Q 80,216 80,212 Z"
      fill="${HOOD_D}" stroke="${_darken(OL,5)}" stroke-width="1.2"/>
    <!-- Pocket divider -->
    <line x1="100" y1="188" x2="100" y2="216"
      stroke="${HOOD}" stroke-width="0.8" opacity="0.6"/>
    <!-- Hoodie drawstring knot -->
    <circle cx="96" cy="152" r="2.5" fill="${HOOD_D}" stroke="${OL}" stroke-width="0.8"/>
    <circle cx="104" cy="152" r="2.5" fill="${HOOD_D}" stroke="${OL}" stroke-width="0.8"/>
    <path d="M 96,152 L 93,170 M 104,152 L 107,170"
      stroke="${HOOD_D}" stroke-width="1.2" stroke-linecap="round"/>
    <!-- Center seam -->
    <line x1="100" y1="133" x2="100" y2="187"
      stroke="${HOOD_D}" stroke-width="0.8" opacity="0.5"/>
    <!-- BODY-FIT: sport stripe overlay -->
    <g class="outfit-fit-stripes">
      <path d="M 61,168 L 67,168 M 133,168 L 139,168"
        stroke="#22C55E" stroke-width="3" stroke-linecap="round"/>
      <path d="M 60,175 L 67,175 M 133,175 L 140,175"
        stroke="#22C55E" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
    </g>
    <!-- PERSONAL-FOCUSED: business jacket lapels -->
    <g class="outfit-business">
      <path d="M 100,133 L 88,155 L 80,155 L 80,133"
        fill="#1E3A5F" stroke="${OL}" stroke-width="1" opacity="0"/>
      <path d="M 100,133 L 112,155 L 120,155 L 120,133"
        fill="#1E3A5F" stroke="${OL}" stroke-width="1" opacity="0"/>
    </g>
  </g>

  <!-- ============================= -->
  <!--   LAYER: HOOD (neglected)     -->
  <!-- ============================= -->
  <g class="layer-hood">
    <path d="M 66,138 Q 58,120 60,95 Q 62,68 80,56 Q 92,48 100,48
             Q 108,48 120,56 Q 138,68 140,95 Q 142,120 134,138
             Q 126,130 118,127 Q 108,124 100,124 Q 92,124 82,127 Q 74,130 66,138 Z"
      fill="${HOOD_D}" stroke="${OL}" stroke-width="1.5" stroke-linejoin="round"/>
    <!-- Hood shadow edge -->
    <path d="M 66,138 Q 62,118 64,98 Q 66,76 80,62"
      stroke="${_darken(HOOD_D,10)}" stroke-width="1" fill="none" opacity="0.7"/>
    <path d="M 134,138 Q 138,118 136,98 Q 134,76 120,62"
      stroke="${_darken(HOOD_D,10)}" stroke-width="1" fill="none" opacity="0.7"/>
  </g>

  <!-- ============================= -->
  <!--   LAYER: ARMS                 -->
  <!-- ============================= -->
  <!-- Default arms: hanging naturally -->
  <g class="layer-arms-default">
    <!-- Left arm -->
    <path d="M 68,142 Q 58,148 54,170 Q 50,192 53,210 Q 55,218 60,220 Q 65,222 68,218 Q 71,214 70,206 Q 68,192 70,172 Q 72,158 72,145 Z"
      fill="${HOOD}" stroke="${OL}" stroke-width="1.5" stroke-linejoin="round"/>
    <!-- Left hand -->
    <ellipse cx="61" cy="220" rx="8" ry="7"
      fill="${S}" stroke="${OL}" stroke-width="1.5"/>
    <path d="M 56,216 Q 54,212 56,210 M 59,215 Q 57,210 59,208 M 63,215 Q 62,210 63,208 M 67,216 Q 66,212 67,210"
      stroke="${SS}" stroke-width="1" stroke-linecap="round" fill="none" opacity="0.6"/>

    <!-- Right arm -->
    <path d="M 132,142 Q 142,148 146,170 Q 150,192 147,210 Q 145,218 140,220 Q 135,222 132,218 Q 129,214 130,206 Q 132,192 130,172 Q 128,158 128,145 Z"
      fill="${HOOD}" stroke="${OL}" stroke-width="1.5" stroke-linejoin="round"/>
    <!-- Right hand -->
    <ellipse cx="139" cy="220" rx="8" ry="7"
      fill="${S}" stroke="${OL}" stroke-width="1.5"/>
    <path d="M 134,216 Q 132,212 134,210 M 137,215 Q 135,210 137,208 M 141,215 Q 140,210 141,208 M 145,216 Q 144,212 145,210"
      stroke="${SS}" stroke-width="1" stroke-linecap="round" fill="none" opacity="0.6"/>
  </g>

  <!-- FIT arms: flexed up/outward -->
  <g class="layer-arms-fit">
    <!-- Left arm flexed -->
    <path d="M 68,142 Q 54,138 46,125 Q 40,115 46,108 Q 50,104 55,106 Q 60,108 62,116 Q 64,124 68,130 Z"
      fill="${HOOD}" stroke="${OL}" stroke-width="1.5" stroke-linejoin="round"/>
    <!-- Left forearm -->
    <path d="M 46,108 Q 40,100 38,92 Q 36,84 40,80 Q 44,76 48,78 Q 52,80 53,88 Q 54,96 55,106 Z"
      fill="url(#grad-hoodie)" stroke="${OL}" stroke-width="1.5" stroke-linejoin="round"/>
    <!-- Left fist -->
    <rect x="34" y="72" width="16" height="14" rx="5"
      fill="${S}" stroke="${OL}" stroke-width="1.5"/>
    <line x1="34" y1="78" x2="50" y2="78" stroke="${SS}" stroke-width="0.8" opacity="0.5"/>

    <!-- Right arm flexed (mirror) -->
    <path d="M 132,142 Q 146,138 154,125 Q 160,115 154,108 Q 150,104 145,106 Q 140,108 138,116 Q 136,124 132,130 Z"
      fill="${HOOD}" stroke="${OL}" stroke-width="1.5" stroke-linejoin="round"/>
    <!-- Right forearm -->
    <path d="M 154,108 Q 160,100 162,92 Q 164,84 160,80 Q 156,76 152,78 Q 148,80 147,88 Q 146,96 145,106 Z"
      fill="url(#grad-hoodie)" stroke="${OL}" stroke-width="1.5" stroke-linejoin="round"/>
    <!-- Right fist -->
    <rect x="150" y="72" width="16" height="14" rx="5"
      fill="${S}" stroke="${OL}" stroke-width="1.5"/>
    <line x1="150" y1="78" x2="166" y2="78" stroke="${SS}" stroke-width="0.8" opacity="0.5"/>
  </g>

  <!-- NEGLECTED arms: hands in pocket -->
  <g class="layer-arms-neglected">
    <!-- Short arm stubs showing going into pocket -->
    <path d="M 68,148 Q 64,158 68,170 Q 72,182 80,188"
      stroke="${HOOD}" stroke-width="14" stroke-linecap="round" fill="none"/>
    <path d="M 132,148 Q 136,158 132,170 Q 128,182 120,188"
      stroke="${HOOD}" stroke-width="14" stroke-linecap="round" fill="none"/>
    <!-- outline -->
    <path d="M 68,148 Q 64,158 68,170 Q 72,182 80,188"
      stroke="${OL}" stroke-width="1.5" stroke-linecap="round" fill="none"/>
    <path d="M 132,148 Q 136,158 132,170 Q 128,182 120,188"
      stroke="${OL}" stroke-width="1.5" stroke-linecap="round" fill="none"/>
  </g>

  <!-- SPIRITUAL-PEACEFUL: prayer hands -->
  <g class="layer-arms-prayer">
    <!-- Left arm bent inward -->
    <path d="M 68,148 Q 62,156 68,168 Q 74,178 84,182"
      stroke="${HOOD}" stroke-width="12" stroke-linecap="round" fill="none"/>
    <path d="M 68,148 Q 62,156 68,168 Q 74,178 84,182"
      stroke="${OL}" stroke-width="1.5" stroke-linecap="round" fill="none"/>
    <!-- Right arm bent inward -->
    <path d="M 132,148 Q 138,156 132,168 Q 126,178 116,182"
      stroke="${HOOD}" stroke-width="12" stroke-linecap="round" fill="none"/>
    <path d="M 132,148 Q 138,156 132,168 Q 126,178 116,182"
      stroke="${OL}" stroke-width="1.5" stroke-linecap="round" fill="none"/>
    <!-- Clasped prayer hands -->
    <ellipse cx="100" cy="190" rx="18" ry="12"
      fill="${S}" stroke="${OL}" stroke-width="1.5"/>
    <line x1="100" y1="178" x2="100" y2="202"
      stroke="${SS}" stroke-width="1" opacity="0.5"/>
    <!-- Fingers suggestion -->
    <path d="M 84,185 Q 86,182 88,185 M 88,183 Q 90,180 92,183 M 92,182 Q 94,179 96,182"
      stroke="${SS}" stroke-width="1" stroke-linecap="round" fill="none" opacity="0.5"/>
    <path d="M 116,185 Q 114,182 112,185 M 112,183 Q 110,180 108,183 M 108,182 Q 106,179 104,182"
      stroke="${SS}" stroke-width="1" stroke-linecap="round" fill="none" opacity="0.5"/>
  </g>

  <!-- PERSONAL-FOCUSED: arms with laptop -->
  <g class="layer-arms-laptop">
    <!-- Arms resting on desk angle -->
    <path d="M 68,148 Q 60,160 58,182 Q 57,195 62,200"
      stroke="${HOOD}" stroke-width="12" stroke-linecap="round" fill="none"/>
    <path d="M 68,148 Q 60,160 58,182 Q 57,195 62,200"
      stroke="${OL}" stroke-width="1.5" stroke-linecap="round" fill="none"/>
    <path d="M 132,148 Q 140,160 142,182 Q 143,195 138,200"
      stroke="${HOOD}" stroke-width="12" stroke-linecap="round" fill="none"/>
    <path d="M 132,148 Q 140,160 142,182 Q 143,195 138,200"
      stroke="${OL}" stroke-width="1.5" stroke-linecap="round" fill="none"/>
    <!-- Laptop -->
    <rect x="62" y="196" width="76" height="50" rx="5"
      fill="#1A1A2E" stroke="${OL}" stroke-width="1.5"/>
    <rect x="66" y="200" width="68" height="38" rx="3"
      fill="#0F172A"/>
    <!-- Screen glow -->
    <rect x="67" y="201" width="66" height="36" rx="2"
      fill="#1E3A5F" opacity="0.7"/>
    <!-- Screen content lines -->
    <rect x="70" y="207" width="40" height="2.5" rx="1" fill="#60A5FA" opacity="0.6"/>
    <rect x="70" y="212" width="30" height="2" rx="1" fill="#60A5FA" opacity="0.4"/>
    <rect x="70" y="217" width="45" height="2" rx="1" fill="#60A5FA" opacity="0.3"/>
    <!-- Laptop hinge -->
    <rect x="62" y="244" width="76" height="4" rx="2"
      fill="#111827" stroke="${OL}" stroke-width="1"/>
    <!-- Keyboard suggestion -->
    <rect x="62" y="248" width="76" height="18" rx="3"
      fill="#1A1A2E" stroke="${OL}" stroke-width="1.2"/>
    <path d="M 72,252 L 128,252 M 72,256 L 128,256 M 72,260 L 128,260"
      stroke="#2A2A3E" stroke-width="1"/>
    <!-- Laptop trackpad -->
    <rect x="92" y="262" width="16" height="10" rx="3"
      fill="#242438"/>
    <!-- Left hand fingers on keyboard -->
    <ellipse cx="78" cy="254" rx="6" ry="4" fill="${S}" stroke="${OL}" stroke-width="1"/>
    <!-- Right hand fingers -->
    <ellipse cx="122" cy="254" rx="6" ry="4" fill="${S}" stroke="${OL}" stroke-width="1"/>
  </g>

  <!-- PERSONAL-AVOIDING: phone in hand -->
  <g class="layer-arms-phone">
    <path d="M 68,148 Q 60,162 62,182 Q 63,198 68,208"
      stroke="${HOOD}" stroke-width="12" stroke-linecap="round" fill="none"/>
    <path d="M 68,148 Q 60,162 62,182 Q 63,198 68,208"
      stroke="${OL}" stroke-width="1.5" stroke-linecap="round" fill="none"/>
    <path d="M 132,148 Q 140,162 138,182 Q 137,198 132,208"
      stroke="${HOOD}" stroke-width="12" stroke-linecap="round" fill="none"/>
    <path d="M 132,148 Q 140,162 138,182 Q 137,198 132,208"
      stroke="${OL}" stroke-width="1.5" stroke-linecap="round" fill="none"/>
    <!-- Phone held in right hand -->
    <rect x="126" y="198" width="18" height="28" rx="4"
      fill="#1A1A2E" stroke="${OL}" stroke-width="1.5"/>
    <rect x="128" y="201" width="14" height="20" rx="2"
      fill="#172554"/>
    <!-- Phone screen content (scrolling) -->
    <rect x="129" y="203" width="10" height="2" rx="1" fill="#60A5FA" opacity="0.5"/>
    <rect x="129" y="207" width="12" height="2" rx="1" fill="#60A5FA" opacity="0.4"/>
    <rect x="129" y="211" width="8" height="2" rx="1"  fill="#60A5FA" opacity="0.3"/>
    <rect x="129" y="215" width="11" height="2" rx="1" fill="#60A5FA" opacity="0.3"/>
    <!-- Home indicator -->
    <rect x="133" y="224" width="6" height="1.5" rx="1" fill="#374151"/>
    <!-- Right hand holding phone -->
    <ellipse cx="135" cy="220" rx="7" ry="5" fill="${S}" stroke="${OL}" stroke-width="1"/>
    <!-- Left hand resting -->
    <ellipse cx="65" cy="212" rx="7" ry="5"  fill="${S}" stroke="${OL}" stroke-width="1"/>
  </g>

  <!-- SIGNATURE ITEM: Watch on left wrist -->
  <g class="layer-item-watch">
    <rect x="54" y="211" width="14" height="12" rx="4"
      fill="#1C1C2E" stroke="#4B5563" stroke-width="1.2"/>
    <circle cx="61" cy="217" r="4" fill="#0F172A" stroke="#22C55E" stroke-width="0.8"/>
    <!-- Watch hands -->
    <line x1="61" y1="217" x2="61" y2="214" stroke="#22C55E" stroke-width="0.8" stroke-linecap="round"/>
    <line x1="61" y1="217" x2="63" y2="218" stroke="#22C55E" stroke-width="0.8" stroke-linecap="round"/>
    <!-- Watch strap -->
    <rect x="56" y="208"  width="10" height="3" rx="1.5" fill="#374151"/>
    <rect x="56" y="223" width="10" height="3" rx="1.5" fill="#374151"/>
  </g>

  <!-- WRISTBAND (body-fit) -->
  <g class="layer-item-wristband">
    <rect x="34" y="74" width="16" height="6" rx="3" fill="#22C55E" opacity="0.9"/>
  </g>

  <!-- CHAIN (accessory) -->
  <g class="layer-item-chain">
    <path d="M 82,150 Q 86,158 100,162 Q 114,158 118,150"
      fill="none" stroke="#EAB308" stroke-width="1.8"/>
    <circle cx="100" cy="163" r="3.5" fill="#EAB308" stroke="${OL}" stroke-width="0.8"/>
  </g>

  <!-- HEADBAND (body-fit) -->
  <g class="layer-item-headband">
    <path d="M 64,82 Q 66,72 100,70 Q 134,72 136,82"
      fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round"
      opacity="0.9"/>
    <path d="M 78,73 Q 82,70 88,70"
      fill="none" stroke="#D1D5DB" stroke-width="3" stroke-linecap="round"
      opacity="0.6"/>
  </g>

  <!-- ============================= -->
  <!--   LAYER: NECK                 -->
  <!-- ============================= -->
  <rect x="90" y="122" width="20" height="14" rx="6"
    fill="${S}" stroke="${OL}" stroke-width="1.2"/>
  <!-- Neck shadow -->
  <rect x="90" y="130" width="20" height="6" rx="3"
    fill="${SS}" opacity="0.4"/>

  <!-- ============================= -->
  <!--   LAYER: HEAD                 -->
  <!-- ============================= -->
  <g class="layer-head">

    <!-- ---- EARS ---- -->
    <!-- Left ear (back) -->
    <path d="M 60,82 Q 54,78 52,88 Q 50,98 56,104 Q 60,108 64,104 Q 64,96 62,89 Z"
      fill="${SE}" stroke="${OL}" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M 58,86 Q 55,88 55,96 Q 55,102 59,103"
      fill="${SS}" opacity="0.3" stroke="none"/>
    <!-- Left ear inner -->
    <path d="M 58,88 Q 55,90 55,96 Q 56,101 59,102"
      fill="none" stroke="${SS}" stroke-width="1" opacity="0.5"/>
    <!-- SIGNATURE: Left ear stud -->
    <circle cx="58" cy="104" r="2.5"
      fill="#EAB308" stroke="${OL}" stroke-width="0.8"/>
    <circle cx="58" cy="104" r="1" fill="#FEF08A"/>

    <!-- Right ear (back) -->
    <path d="M 140,82 Q 146,78 148,88 Q 150,98 144,104 Q 140,108 136,104 Q 136,96 138,89 Z"
      fill="${SE}" stroke="${OL}" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M 142,86 Q 145,88 145,96 Q 145,102 141,103"
      fill="${SS}" opacity="0.3" stroke="none"/>

    <!-- ---- HEAD SHAPE ---- -->
    <!-- Head base (hair color shows if extends beyond face) -->
    <ellipse cx="100" cy="84" rx="42" ry="44"
      fill="${H}" stroke="${OL}" stroke-width="1.8"/>

    <!-- ---- HAIR BACK (short fade default) ---- -->
    <g class="hair-short hair-layer-back">
      <!-- Clean top shape -->
      <path d="M 62,84 Q 60,58 72,44 Q 82,32 100,30
               Q 118,32 128,44 Q 140,58 138,84
               Q 136,66 128,54 Q 118,42 100,40
               Q 82,42 72,54 Q 64,66 62,84 Z"
        fill="${H}"/>
      <!-- Hair highlight -->
      <path d="M 80,34 Q 90,28 100,28 Q 110,28 118,32"
        stroke="${HH}" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.5"/>
    </g>
    <g class="hair-messy hair-layer-back" style="display:none">
      <path d="M 62,84 Q 58,58 68,42 Q 78,30 100,28
               Q 122,30 132,42 Q 142,58 138,84
               Q 134,66 124,52 Q 112,40 100,38
               Q 88,40 76,52 Q 66,66 62,84 Z" fill="${H}"/>
      <!-- Messy spikes -->
      <path d="M 72,44 Q 68,34 72,28 Q 74,36 78,40"   fill="${H}" stroke="${OL}" stroke-width="1.2" stroke-linejoin="round"/>
      <path d="M 88,32 Q 86,22 92,20 Q 91,28 95,33"   fill="${H}" stroke="${OL}" stroke-width="1.2" stroke-linejoin="round"/>
      <path d="M 108,33 Q 112,22 118,24 Q 114,30 112,36" fill="${H}" stroke="${OL}" stroke-width="1.2" stroke-linejoin="round"/>
      <path d="M 122,42 Q 130,32 134,28 Q 130,38 126,44" fill="${H}" stroke="${OL}" stroke-width="1.2" stroke-linejoin="round"/>
    </g>
    <g class="hair-curly hair-layer-back" style="display:none">
      <path d="M 62,84 Q 58,60 70,45 Q 82,30 100,28
               Q 118,30 130,45 Q 142,60 138,84
               Q 136,64 126,50 Q 114,38 100,36
               Q 86,38 74,50 Q 64,64 62,84 Z" fill="${H}"/>
      <!-- Curly rings -->
      ${_curlyHair()}
    </g>
    <g class="hair-cap hair-layer-back" style="display:none">
      <!-- Just flat fade sides with cap on top -->
      <path d="M 62,84 Q 62,70 68,58 Q 78,44 100,40
               Q 122,44 132,58 Q 138,70 138,84" fill="${H}"/>
    </g>

    <!-- ---- FACE ---- -->
    <ellipse cx="100" cy="86" rx="38" ry="40"
      fill="url(#grad-face)" stroke="${OL}" stroke-width="1.8"/>
    <!-- Jawline shadow -->
    <path d="M 68,100 Q 72,120 100,125 Q 128,120 132,100"
      fill="${SS}" opacity="0.18" stroke="none"/>

    <!-- ---- HAIR FRONT (fringe over forehead) ---- -->
    <g class="hair-short hair-layer-front">
      <path d="M 62,80 Q 64,60 74,50
               Q 82,40 100,38
               Q 118,40 126,50
               Q 136,60 138,80
               Q 128,70 118,62 Q 110,56 100,55
               Q 90,56 82,62 Q 72,70 62,80 Z"
        fill="${H}" stroke="${OL}" stroke-width="1.2" stroke-linejoin="round"/>
      <!-- Top hair highlight sweep -->
      <path d="M 80,51 Q 90,42 106,42 Q 114,44 120,50"
        stroke="${HH}" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.5"/>
      <!-- Fringe strands -->
      <path d="M 78,62 Q 76,72 74,80" stroke="${_darken(H,8)}" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.4"/>
      <path d="M 84,58 Q 82,68 80,76" stroke="${_darken(H,8)}" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.3"/>
      <path d="M 116,62 Q 118,72 120,80" stroke="${_darken(H,8)}" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.4"/>
    </g>
    <g class="hair-messy hair-layer-front" style="display:none">
      <path d="M 62,80 Q 63,62 72,50 Q 80,40 100,38
               Q 120,40 128,50 Q 137,62 138,80
               Q 128,68 118,60 Q 108,54 100,54
               Q 92,54 82,60 Q 72,68 62,80 Z"
        fill="${H}" stroke="${OL}" stroke-width="1.2" stroke-linejoin="round"/>
      <!-- Messy fringe strands going different ways -->
      <path d="M 82,60 Q 78,68 74,74 Q 72,68 76,62" fill="${H}" stroke="${OL}" stroke-width="1" stroke-linejoin="round"/>
      <path d="M 92,56 Q 86,62 84,72 Q 86,64 92,58" fill="${H}" stroke="${OL}" stroke-width="1" stroke-linejoin="round"/>
      <path d="M 110,56 Q 116,62 118,72 Q 116,64 110,58" fill="${H}" stroke="${OL}" stroke-width="1" stroke-linejoin="round"/>
    </g>
    <g class="hair-curly hair-layer-front" style="display:none">
      <path d="M 63,80 Q 63,64 74,52 Q 84,40 100,38
               Q 116,40 126,52 Q 137,64 137,80
               Q 127,68 116,60 Q 108,55 100,55
               Q 92,55 84,60 Q 73,68 63,80 Z"
        fill="${H}" stroke="${OL}" stroke-width="1.2" stroke-linejoin="round"/>
    </g>
    <g class="hair-cap hair-layer-front" style="display:none">
      <!-- Fade sides visible -->
      <path d="M 62,82 Q 62,66 68,56 L 70,62 Q 64,72 63,82 Z" fill="${H}"/>
      <path d="M 138,82 Q 138,66 132,56 L 130,62 Q 136,72 137,82 Z" fill="${H}"/>
    </g>

    <!-- ---- CAP (hair style = cap) ---- -->
    <g class="hair-cap layer-cap">
      <!-- Cap brim -->
      <rect x="60" y="66" width="80" height="6" rx="3"
        fill="#1E1E2E" stroke="${OL}" stroke-width="1.5"/>
      <!-- Cap brim extended front -->
      <path d="M 60,66 Q 54,66 50,70 Q 52,74 60,72 Z"
        fill="#1E1E2E" stroke="${OL}" stroke-width="1"/>
      <!-- Cap body -->
      <path d="M 62,68 Q 60,52 66,42 Q 76,30 100,28
               Q 124,30 134,42 Q 140,52 138,68 Z"
        fill="#1E1E2E" stroke="${OL}" stroke-width="1.5" stroke-linejoin="round"/>
      <!-- Cap button on top -->
      <circle cx="100" cy="32" r="4" fill="#2A2A3E" stroke="${OL}" stroke-width="1"/>
      <!-- Cap seam -->
      <path d="M 100,32 L 100,68" stroke="#2A2A3E" stroke-width="0.8"/>
      <!-- Cap logo (small star) -->
      <text x="92" y="58" font-size="10" fill="#22C55E" font-family="sans-serif">✦</text>
    </g>

    <!-- ---- HOOD CAP (hood state - part of hood layer) ---- -->
    <g class="layer-hood-front">
      <!-- Hood edge visible around face -->
      <path d="M 64,88 Q 62,68 72,54 Q 82,42 100,40
               Q 118,42 128,54 Q 138,68 136,88"
        fill="none" stroke="${HOOD}" stroke-width="8" stroke-linecap="round"/>
      <path d="M 64,88 Q 62,68 72,54 Q 82,42 100,40
               Q 118,42 128,54 Q 138,68 136,88"
        fill="none" stroke="${OL}" stroke-width="1.2" stroke-linecap="round"/>
    </g>

    <!-- ---- EYEBROWS ---- -->
    <g class="layer-brows">
      <!-- Default brows (thick, clean, slight attitude) -->
      <g class="brows-default">
        <!-- Left brow -->
        <path d="M 76,74 Q 82,70 88,72 Q 90,73 91,75"
          stroke="${H}" stroke-width="3.5" stroke-linecap="round" fill="none"
          stroke-linejoin="round"/>
        <!-- Signature: brow slit on left (small gap) -->
        <line x1="83" y1="71.5" x2="83" y2="74"
          stroke="${S}" stroke-width="2.2"/>
        <!-- Right brow -->
        <path d="M 109,75 Q 111,73 118,70 Q 122,71 124,74"
          stroke="${H}" stroke-width="3.5" stroke-linecap="round" fill="none"
          stroke-linejoin="round"/>
      </g>
      <!-- Worried brows (angled, stressed) -->
      <g class="brows-worried" style="display:none">
        <path d="M 76,73 Q 80,76 88,71 Q 90,70 91,72"
          stroke="${H}" stroke-width="3.5" stroke-linecap="round" fill="none"/>
        <line x1="83" y1="72" x2="83" y2="74.5" stroke="${S}" stroke-width="2.2"/>
        <path d="M 109,72 Q 113,70 118,73 Q 120,74 124,72"
          stroke="${H}" stroke-width="3.5" stroke-linecap="round" fill="none"/>
      </g>
      <!-- Focused/concentrated brows (slight V) -->
      <g class="brows-focused" style="display:none">
        <path d="M 76,74 Q 81,69 88,71 Q 90,72 92,74"
          stroke="${H}" stroke-width="3.5" stroke-linecap="round" fill="none"/>
        <line x1="83" y1="70" x2="83" y2="73" stroke="${S}" stroke-width="2.2"/>
        <path d="M 108,74 Q 111,72 118,69 Q 121,70 124,74"
          stroke="${H}" stroke-width="3.5" stroke-linecap="round" fill="none"/>
      </g>
    </g>

    <!-- ---- EYES ---- -->
    <g class="layer-eyes">
      <!-- BASE EYES (default) -->
      <g class="eyes-default">
        <!-- Left eye white -->
        <ellipse cx="84" cy="88" rx="8" ry="9"
          fill="white" stroke="${OL}" stroke-width="1.2"/>
        <!-- Left iris -->
        <circle cx="84.5" cy="89" r="5.5" fill="#1A1A2E"/>
        <!-- Left iris color ring -->
        <circle cx="84.5" cy="89" r="5" fill="#2C2C4E"/>
        <!-- Left highlight large -->
        <circle cx="82" cy="86" r="2" fill="white" opacity="0.9"/>
        <!-- Left highlight small -->
        <circle cx="87" cy="85" r="1" fill="white" opacity="0.7"/>
        <!-- Left lower lash line -->
        <path d="M 76.5,92 Q 84.5,95 92.5,92"
          stroke="${OL}" stroke-width="1" fill="none" stroke-linecap="round"/>
        <!-- Left upper lash line -->
        <path d="M 76,84 Q 84,80 92,84"
          stroke="${OL}" stroke-width="1.5" fill="none" stroke-linecap="round"/>

        <!-- Right eye white -->
        <ellipse cx="116" cy="88" rx="8" ry="9"
          fill="white" stroke="${OL}" stroke-width="1.2"/>
        <!-- Right iris -->
        <circle cx="116.5" cy="89" r="5.5" fill="#1A1A2E"/>
        <circle cx="116.5" cy="89" r="5" fill="#2C2C4E"/>
        <!-- Right highlights -->
        <circle cx="114" cy="86" r="2" fill="white" opacity="0.9"/>
        <circle cx="119" cy="85" r="1" fill="white" opacity="0.7"/>
        <!-- Right lash lines -->
        <path d="M 108.5,92 Q 116.5,95 124.5,92"
          stroke="${OL}" stroke-width="1" fill="none" stroke-linecap="round"/>
        <path d="M 108,84 Q 116,80 124,84"
          stroke="${OL}" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      </g>

      <!-- HAPPY eyes (squint, curved) - peaceful + fit -->
      <g class="eyes-happy" style="display:none">
        <path d="M 76,88 Q 84,80 92,88"
          stroke="${OL}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <path d="M 76,88 Q 84,92 92,88"
          stroke="${OL}" stroke-width="1" fill="none" stroke-linecap="round" opacity="0.3"/>
        <path d="M 108,88 Q 116,80 124,88"
          stroke="${OL}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <path d="M 108,88 Q 116,92 124,88"
          stroke="${OL}" stroke-width="1" fill="none" stroke-linecap="round" opacity="0.3"/>
      </g>

      <!-- TIRED eyes (half-lid droopy) - foggy + soft + neglected -->
      <g class="eyes-tired" style="display:none">
        <!-- Half-closed lids as overlapping rects -->
        <ellipse cx="84" cy="88" rx="8" ry="9" fill="white" stroke="${OL}" stroke-width="1.2"/>
        <circle cx="84.5" cy="90" r="5.5" fill="#1A1A2E"/>
        <circle cx="82" cy="87" r="1.5" fill="white" opacity="0.7"/>
        <path d="M 76,85 Q 84,82 92,85 Q 84,84 76,85 Z"
          fill="${SE}" opacity="0.7"/>
        <!-- Upper lid droop -->
        <path d="M 76,85 Q 84,83 92,85"
          stroke="${OL}" stroke-width="1.8" fill="none"/>

        <ellipse cx="116" cy="88" rx="8" ry="9" fill="white" stroke="${OL}" stroke-width="1.2"/>
        <circle cx="116.5" cy="90" r="5.5" fill="#1A1A2E"/>
        <circle cx="114" cy="87" r="1.5" fill="white" opacity="0.7"/>
        <path d="M 108,85 Q 116,82 124,85 Q 116,84 108,85 Z"
          fill="${SE}" opacity="0.7"/>
        <path d="M 108,85 Q 116,83 124,85"
          stroke="${OL}" stroke-width="1.8" fill="none"/>
      </g>

      <!-- STRESSED eyes (wider, worried) -->
      <g class="eyes-stressed" style="display:none">
        <ellipse cx="84" cy="87" rx="9" ry="10"
          fill="white" stroke="${OL}" stroke-width="1.5"/>
        <circle cx="84.5" cy="88" r="6" fill="#1A1A2E"/>
        <circle cx="82" cy="85" r="2" fill="white" opacity="0.9"/>

        <ellipse cx="116" cy="87" rx="9" ry="10"
          fill="white" stroke="${OL}" stroke-width="1.5"/>
        <circle cx="116.5" cy="88" r="6" fill="#1A1A2E"/>
        <circle cx="114" cy="85" r="2" fill="white" opacity="0.9"/>
      </g>

      <!-- BLINK overlay (CSS animated) -->
      <g class="eyes-blink" style="display:none">
        <rect x="76" y="84" width="16" height="8" rx="4" fill="${S}"/>
        <rect x="108" y="84" width="16" height="8" rx="4" fill="${S}"/>
      </g>
    </g><!-- end eyes -->

    <!-- ---- NOSE ---- -->
    <g class="layer-nose">
      <ellipse cx="96.5" cy="100" rx="2.2" ry="1.4"
        fill="${SS}" opacity="0.5"/>
      <ellipse cx="103.5" cy="100" rx="2.2" ry="1.4"
        fill="${SS}" opacity="0.5"/>
      <!-- Bridge suggestion -->
      <path d="M 99,96 Q 100,99 101,96"
        stroke="${SS}" stroke-width="0.8" fill="none" opacity="0.4"/>
    </g>

    <!-- ---- MOUTHS (only one visible at a time via CSS) ---- -->
    <g class="layer-mouth">
      <!-- Neutral slight smile (default) -->
      <path class="mouth-neutral"
        d="M 90,109 Q 100,116 110,109"
        stroke="${OL}" stroke-width="2" fill="none" stroke-linecap="round"/>

      <!-- Big happy smile - FIT + FOCUSED -->
      <g class="mouth-smile-big" style="display:none">
        <path d="M 87,108 Q 100,120 113,108"
          stroke="${OL}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
        <!-- Teeth -->
        <path d="M 88,109 Q 100,118 112,109 Q 100,116 88,109 Z"
          fill="white" opacity="0.9"/>
        <!-- Lower lip line -->
        <path d="M 88,109 Q 100,116 112,109"
          stroke="${SS}" stroke-width="0.6" fill="none" opacity="0.4"/>
      </g>

      <!-- Warm gentle smile - PEACEFUL -->
      <g class="mouth-smile-warm" style="display:none">
        <path d="M 90,109 Q 100,117 110,109"
          stroke="${OL}" stroke-width="2" fill="none" stroke-linecap="round"/>
        <!-- Subtle teeth glint -->
        <path d="M 91,110 Q 100,115 109,110 Q 100,114 91,110 Z"
          fill="white" opacity="0.6"/>
      </g>

      <!-- Sad mouth - SAD + NEGLECTED -->
      <g class="mouth-sad" style="display:none">
        <path d="M 90,113 Q 100,107 110,113"
          stroke="${OL}" stroke-width="2" fill="none" stroke-linecap="round"/>
      </g>

      <!-- Stressed/tight mouth -->
      <g class="mouth-stressed" style="display:none">
        <path d="M 91,111 Q 96,108 100,110 Q 104,108 109,111"
          stroke="${OL}" stroke-width="2" fill="none" stroke-linecap="round"/>
      </g>
    </g>

    <!-- ---- BLUSH ---- -->
    <g class="layer-blush">
      <ellipse cx="73" cy="97" rx="8" ry="4.5"
        fill="#F87171" opacity="0.22"/>
      <ellipse cx="127" cy="97" rx="8" ry="4.5"
        fill="#F87171" opacity="0.22"/>
    </g>

    <!-- ---- EYE BAGS ---- -->
    <g class="layer-eyebags" style="display:none">
      <ellipse cx="84" cy="97" rx="7" ry="2.5"
        fill="${SS}" opacity="0.35"/>
      <ellipse cx="116" cy="97" rx="7" ry="2.5"
        fill="${SS}" opacity="0.35"/>
    </g>

    <!-- ---- GLASSES (accessory / personal-focused) ---- -->
    <g class="layer-glasses" style="display:none">
      <!-- Frame left -->
      <rect x="74" y="82" width="20" height="14" rx="5"
        fill="none" stroke="#1F2937" stroke-width="2.2"/>
      <!-- Frame right -->
      <rect x="106" y="82" width="20" height="14" rx="5"
        fill="none" stroke="#1F2937" stroke-width="2.2"/>
      <!-- Bridge -->
      <line x1="94" y1="89" x2="106" y2="89"
        stroke="#1F2937" stroke-width="1.8"/>
      <!-- Left arm -->
      <line x1="74" y1="87" x2="64" y2="84"
        stroke="#1F2937" stroke-width="1.8" stroke-linecap="round"/>
      <!-- Right arm -->
      <line x1="126" y1="87" x2="136" y2="84"
        stroke="#1F2937" stroke-width="1.8" stroke-linecap="round"/>
      <!-- Lens shine -->
      <path d="M 77,84 L 80,84" stroke="white" stroke-width="1" opacity="0.5" stroke-linecap="round"/>
      <path d="M 109,84 L 112,84" stroke="white" stroke-width="1" opacity="0.5" stroke-linecap="round"/>
    </g>

    <!-- ---- HEADPHONES ---- -->
    <g class="layer-item-headphones" style="display:none">
      <path d="M 65,88 Q 62,64 100,58 Q 138,64 135,88"
        fill="none" stroke="#374151" stroke-width="5" stroke-linecap="round"/>
      <rect x="58" y="84" width="12" height="16" rx="6" fill="#374151" stroke="${OL}" stroke-width="1"/>
      <rect x="130" y="84" width="12" height="16" rx="6" fill="#374151" stroke="${OL}" stroke-width="1"/>
      <ellipse cx="64"  cy="92" rx="4" ry="5" fill="#1F2937"/>
      <ellipse cx="136" cy="92" rx="4" ry="5" fill="#1F2937"/>
    </g>

    <!-- ---- FOG CLOUD (personal-foggy) ---- -->
    <g class="layer-fog" style="display:none" filter="url(#fog-blur)">
      <ellipse cx="140" cy="65" rx="18" ry="11" fill="#4B5563" opacity="0.5"/>
      <ellipse cx="152" cy="70" rx="12" ry="8"  fill="#4B5563" opacity="0.4"/>
      <ellipse cx="145" cy="74" rx="14" ry="8"  fill="#4B5563" opacity="0.35"/>
    </g>

    <!-- ---- BEARD ---- -->
    <g class="layer-beard" style="display:none">
      <path d="M 80,118 Q 84,128 100,130 Q 116,128 120,118"
        fill="${_darken(H,5)}" opacity="0.7" stroke="none"/>
      <!-- Beard texture lines -->
      <path d="M 84,120 Q 86,126 90,128" stroke="${H}" stroke-width="0.8" fill="none" opacity="0.4"/>
      <path d="M 100,122 L 100,130"       stroke="${H}" stroke-width="0.8" fill="none" opacity="0.4"/>
      <path d="M 116,120 Q 114,126 110,128" stroke="${H}" stroke-width="0.8" fill="none" opacity="0.4"/>
    </g>

  </g><!-- end head -->

  </g><!-- end breathing group -->

  <!-- ============================= -->
  <!--   LAYER: EFFECTS              -->
  <!-- ============================= -->
  <g class="layer-effects">

    <!-- FIT sparkles (green) -->
    <g class="effect-sparkles-fit">
      <g class="spark" style="transform-origin:55px 80px">
        <path d="M 55,72 L 57,80 L 55,88 L 53,80 Z" fill="#22C55E" opacity="0.9"/>
      </g>
      <g class="spark spark-delay1" style="transform-origin:145px 80px">
        <path d="M 145,72 L 147,80 L 145,88 L 143,80 Z" fill="#22C55E" opacity="0.9"/>
      </g>
      <g class="spark spark-delay2" style="transform-origin:100px 30px">
        <path d="M 100,22 L 102,30 L 100,38 L 98,30 Z" fill="#22C55E" opacity="0.8"/>
      </g>
    </g>

    <!-- PERSONAL focus sparkles (blue) -->
    <g class="effect-sparkles-personal">
      <g class="spark" style="transform-origin:48px 60px">
        <path d="M 48,52 L 50,60 L 48,68 L 46,60 Z" fill="#60A5FA" opacity="0.9"/>
      </g>
      <g class="spark spark-delay1" style="transform-origin:155px 50px">
        <path d="M 155,42 L 157,50 L 155,58 L 153,50 Z" fill="#60A5FA" opacity="0.9"/>
      </g>
    </g>

    <!-- SPIRITUAL gold sparkles -->
    <g class="effect-sparkles-spiritual">
      <g class="spark" style="transform-origin:50px 70px">
        <path d="M 50,62 L 52,70 L 50,78 L 48,70 Z" fill="#FBBF24" opacity="0.9"/>
      </g>
      <g class="spark spark-delay1" style="transform-origin:150px 65px">
        <path d="M 150,57 L 152,65 L 150,73 L 148,65 Z" fill="#FBBF24" opacity="0.9"/>
      </g>
      <g class="spark spark-delay2" style="transform-origin:100px 22px">
        <path d="M 100,14 L 102,22 L 100,30 L 98,22 Z" fill="#FBBF24" opacity="0.8"/>
      </g>
    </g>

    <!-- BODY sweat drop -->
    <g class="effect-sweat">
      <path d="M 64,80 Q 62,88 64,94 Q 66,88 64,80 Z"
        fill="#93C5FD" opacity="0.7"/>
    </g>

    <!-- STRESSED dark particles -->
    <g class="effect-dark-particles">
      ${_darkParticleSVG(5)}
    </g>

  </g><!-- end effects -->

</svg>`;
}

// ============================================================
//  SVG helpers
// ============================================================
function _sparkleParticles(count, color, maxOpacity) {
  let out = '';
  const positions = [[48,55],[152,48],[100,20],[40,100],[160,100],[100,288]];
  for (let i = 0; i < Math.min(count, positions.length); i++) {
    const [cx, cy] = positions[i];
    const delay = (i * 0.4).toFixed(1);
    out += `<path d="M${cx},${cy-7} L${cx+1.5},${cy} L${cx},${cy+7} L${cx-1.5},${cy} Z"
      fill="${color}" opacity="0">
      <animate attributeName="opacity" values="0;${maxOpacity};0" dur="2.5s" begin="${delay}s" repeatCount="indefinite"/>
      <animateTransform attributeName="transform" type="scale" values="0.8;1.2;0.8" dur="2.5s" begin="${delay}s" repeatCount="indefinite" additive="sum"/>
    </path>`;
  }
  return out;
}

function _darkParticles(count) {
  let out = '';
  const positions = [[55,50],[145,55],[40,90],[160,90],[100,25]];
  for (let i = 0; i < Math.min(count, positions.length); i++) {
    const [cx,cy] = positions[i], dl = (i*0.5).toFixed(1);
    out += `<circle cx="${cx}" cy="${cy}" r="${3+i%2}" fill="#374151" opacity="0">
      <animate attributeName="opacity" values="0;0.5;0" dur="1.8s" begin="${dl}s" repeatCount="indefinite"/>
      <animate attributeName="cy" values="${cy};${cy-8};${cy}" dur="1.8s" begin="${dl}s" repeatCount="indefinite"/>
    </circle>`;
  }
  return out;
}

function _darkParticleSVG(count) {
  let out = '';
  const positions = [[50,52],[148,48],[38,95],[162,88],[100,22]];
  for (let i = 0; i < count; i++) {
    const [cx,cy] = positions[i%positions.length], dl = (i*0.4).toFixed(1);
    out += `<circle cx="${cx}" cy="${cy}" r="3.5" fill="#1F2937" opacity="0">
      <animate attributeName="opacity" values="0;0.6;0" dur="1.5s" begin="${dl}s" repeatCount="indefinite"/>
      <animate attributeName="cy" values="${cy};${cy-10};${cy}" dur="1.5s" begin="${dl}s" repeatCount="indefinite"/>
    </circle>`;
  }
  return out;
}

function _curlyHair() {
  let out = '';
  const curls = [
    [68,44,6],[80,34,5],[96,30,5],[114,32,5],[128,42,6],[138,58,5],
    [62,68,5],[138,68,5]
  ];
  for (const [cx,cy,r] of curls) {
    out += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#2A1708" stroke-width="4.5" opacity="0.9"/>`;
  }
  return out;
}

function _lighten(hex, amount) {
  const r = Math.min(255, parseInt(hex.slice(1,3),16) + amount);
  const g = Math.min(255, parseInt(hex.slice(3,5),16) + amount);
  const b = Math.min(255, parseInt(hex.slice(5,7),16) + amount);
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

function _darken(hex, amount) {
  const r = Math.max(0, parseInt(hex.slice(1,3),16) - amount);
  const g = Math.max(0, parseInt(hex.slice(3,5),16) - amount);
  const b = Math.max(0, parseInt(hex.slice(5,7),16) - amount);
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}
