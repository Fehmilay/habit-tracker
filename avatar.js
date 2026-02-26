// ============================================================
// avatar.js – Chibi/Cute Avatar mit Personalisierung + States
// ============================================================
// Layers: aura → body → outfit → arms → head → hair → face
//         → eyes → eyebrows → mouth → beard → items → effects
// ============================================================

const SKIN_TONES = {
  light:  { base:'#fde8d0', shadow:'#f0d0b0' },
  medium: { base:'#e8b88a', shadow:'#d4a070' },
  tan:    { base:'#c68c5a', shadow:'#b07840' },
  brown:  { base:'#8d5e3c', shadow:'#7a4e30' },
  dark:   { base:'#5c3a28', shadow:'#4a2e1e' }
};

const HAIR_COLORS = { main:'#1a1a2e', highlight:'#2d2d44' };

/**
 * Rendert den Buddy-Avatar als SVG.
 * @param {HTMLElement} el       - Container
 * @param {object}      areas    - { body:{value,daysMissed,status}, personal:{...}, spiritual:{...} }
 * @param {object}      buddy    - { hairStyle, eyebrowStyle, beard, skinTone, outfitStyle, signatureItem }
 * @param {object}      todayDone- { body:bool, personal:bool, spiritual:bool }
 */
function renderBuddy(el, areas, buddy, todayDone) {
  const skin = SKIN_TONES[buddy.skinTone] || SKIN_TONES.medium;
  const bd = areas.body, pr = areas.personal, sp = areas.spiritual;

  // ---- Determine visual states ----
  const bodyState   = todayDone.body ? 'pumped' : bd.daysMissed>=4 ? 'soft' : bd.daysMissed>=2 ? 'tired' : bd.daysMissed>=1 ? 'slight' : 'ok';
  const spiritState = todayDone.spiritual ? 'peaceful' : sp.daysMissed>=4 ? 'stressed' : sp.daysMissed>=2 ? 'sad' : sp.daysMissed>=1 ? 'neutral' : 'calm';
  const persState   = todayDone.personal ? 'focused' : pr.daysMissed>=4 ? 'avoidant' : pr.daysMissed>=2 ? 'foggy' : pr.daysMissed>=1 ? 'distracted' : 'ok';

  // ---- Posture tilt (body-dependent) ----
  const tilt = bodyState==='soft'?6 : bodyState==='tired'?3 : bodyState==='pumped'?-2 : 0;
  // Body width modifier (subtle cartoon, not mean)
  const bodyW = bodyState==='soft'?48 : bodyState==='tired'?46 : bodyState==='pumped'?42 : 44;
  const bodyR = bodyState==='soft'?14 : 10;

  // ---- Aura ----
  let aura = '';
  if (spiritState==='peaceful') {
    aura = `<ellipse cx="100" cy="155" rx="85" ry="100" fill="rgba(34,197,94,0.12)">
      <animate attributeName="rx" values="85;92;85" dur="3s" repeatCount="indefinite"/>
    </ellipse>`;
    // calm particles
    for(let i=0;i<6;i++){
      const cx=55+Math.random()*90, cy=40+Math.random()*60, r=1+Math.random()*1.5, dl=(Math.random()*2).toFixed(1);
      aura+=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="#22c55e" opacity="0.6">
        <animate attributeName="cy" values="${cy};${cy-18};${cy}" dur="2.8s" begin="${dl}s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.6;0;0.6" dur="2.8s" begin="${dl}s" repeatCount="indefinite"/>
      </circle>`;
    }
  } else if (spiritState==='stressed') {
    aura = `<ellipse cx="100" cy="155" rx="70" ry="85" fill="rgba(239,68,68,0.08)">
      <animate attributeName="rx" values="70;65;70" dur="1.2s" repeatCount="indefinite"/>
    </ellipse>`;
  } else if (spiritState==='sad') {
    // small cloud
    aura = `<g opacity="0.3" transform="translate(60,55)">
      <circle cx="10" cy="10" r="8" fill="#6b7280"/>
      <circle cx="22" cy="7" r="10" fill="#6b7280"/>
      <circle cx="35" cy="10" r="7" fill="#6b7280"/>
    </g>`;
  }

  // ---- Outfit color by state ----
  let shirtColor, pantsColor;
  if (buddy.outfitStyle==='sport') {
    shirtColor = bodyState==='pumped'?'#22c55e' : '#3b82f6';
    pantsColor = '#1e293b';
  } else if (buddy.outfitStyle==='business') {
    shirtColor = persState==='focused'?'#1e40af' : '#374151';
    pantsColor = '#111827';
  } else {
    shirtColor = '#4b5563'; pantsColor = '#1f2937';
  }
  if (persState==='avoidant') { shirtColor='#374151'; }
  if (bodyState==='soft') { shirtColor = _dimColor(shirtColor); }

  // ---- Eyes ----
  let eyes = '';
  const eyeY = 130;
  if (persState==='foggy' || persState==='avoidant') {
    // eye bags + half closed
    eyes = `
      <ellipse cx="89" cy="${eyeY}" rx="4" ry="3" fill="white" opacity="0.6"/>
      <ellipse cx="111" cy="${eyeY}" rx="4" ry="3" fill="white" opacity="0.6"/>
      <ellipse cx="89" cy="${eyeY+4}" rx="5" ry="1.5" fill="${skin.shadow}" opacity="0.4"/>
      <ellipse cx="111" cy="${eyeY+4}" rx="5" ry="1.5" fill="${skin.shadow}" opacity="0.4"/>`;
  } else if (spiritState==='peaceful' || persState==='focused') {
    // happy curved eyes
    eyes = `
      <path d="M 85,${eyeY} Q 89,${eyeY-5} 93,${eyeY}" stroke="#1a1a2e" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M 107,${eyeY} Q 111,${eyeY-5} 115,${eyeY}" stroke="#1a1a2e" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
  } else if (spiritState==='stressed') {
    // wide worried eyes
    eyes = `
      <ellipse cx="89" cy="${eyeY}" rx="4.5" ry="5" fill="white"/>
      <circle cx="89" cy="${eyeY}" r="2.5" fill="#1a1a2e"/>
      <ellipse cx="111" cy="${eyeY}" rx="4.5" ry="5" fill="white"/>
      <circle cx="111" cy="${eyeY}" r="2.5" fill="#1a1a2e"/>`;
  } else {
    // normal cute eyes
    eyes = `
      <ellipse cx="89" cy="${eyeY}" rx="4" ry="4.5" fill="white"/>
      <circle cx="89" cy="${eyeY+0.5}" r="2.5" fill="#1a1a2e"/>
      <circle cx="88" cy="${eyeY-1}" r="1" fill="white" opacity="0.8"/>
      <ellipse cx="111" cy="${eyeY}" rx="4" ry="4.5" fill="white"/>
      <circle cx="111" cy="${eyeY+0.5}" r="2.5" fill="#1a1a2e"/>
      <circle cx="110" cy="${eyeY-1}" r="1" fill="white" opacity="0.8"/>`;
  }

  // ---- Eyebrows ----
  let brows = '';
  const browY = eyeY - 10;
  if (buddy.eyebrowStyle==='thick') {
    brows = `
      <path d="M 84,${browY} Q 89,${browY-3} 94,${browY}" stroke="#1a1a2e" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M 106,${browY} Q 111,${browY-3} 116,${browY}" stroke="#1a1a2e" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  } else if (buddy.eyebrowStyle==='thin') {
    brows = `
      <path d="M 85,${browY}" stroke="#1a1a2e" stroke-width="1.2" fill="none" stroke-linecap="round" d="M 85,${browY} Q 89,${browY-2} 93,${browY}"/>
      <path d="M 107,${browY} Q 111,${browY-2} 115,${browY}" stroke="#1a1a2e" stroke-width="1.2" fill="none" stroke-linecap="round"/>`;
  } else {
    brows = `
      <path d="M 84,${browY} Q 89,${browY-2.5} 94,${browY}" stroke="#1a1a2e" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M 106,${browY} Q 111,${browY-2.5} 116,${browY}" stroke="#1a1a2e" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  }
  // Worried brows if stressed
  if (spiritState==='stressed') {
    brows = `
      <path d="M 84,${browY-1} Q 89,${browY+2} 94,${browY-2}" stroke="#1a1a2e" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M 106,${browY-2} Q 111,${browY+2} 116,${browY-1}" stroke="#1a1a2e" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  }

  // ---- Mouth ----
  let mouth = '';
  const mY = 142;
  const avg = (bd.value+pr.value+sp.value)/3;
  if (todayDone.body || todayDone.personal || todayDone.spiritual) {
    // smiling
    mouth = `<path d="M 91,${mY} Q 100,${mY+10} 109,${mY}" stroke="#1a1a2e" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  } else if (spiritState==='sad' || persState==='avoidant') {
    // frown
    mouth = `<path d="M 92,${mY+4} Q 100,${mY-3} 108,${mY+4}" stroke="#1a1a2e" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  } else if (avg < 35) {
    mouth = `<path d="M 93,${mY+3} Q 100,${mY} 107,${mY+3}" stroke="#1a1a2e" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  } else {
    // neutral slight smile
    mouth = `<path d="M 93,${mY} Q 100,${mY+5} 107,${mY}" stroke="#1a1a2e" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  }

  // ---- Blush (cute chibi touch) ----
  let blush = '';
  if (spiritState==='peaceful' || bodyState==='pumped') {
    blush = `
      <ellipse cx="80" cy="137" rx="6" ry="3.5" fill="#f87171" opacity="0.2"/>
      <ellipse cx="120" cy="137" rx="6" ry="3.5" fill="#f87171" opacity="0.2"/>`;
  }

  // ---- Puffy cheeks when body slightly off ----
  let cheeks = '';
  if (bodyState==='slight' || bodyState==='tired') {
    cheeks = `
      <ellipse cx="78" cy="136" rx="5" ry="3" fill="${skin.base}" opacity="0.5"/>
      <ellipse cx="122" cy="136" rx="5" ry="3" fill="${skin.base}" opacity="0.5"/>`;
  }

  // ---- Hair ----
  let hair = _renderHair(buddy.hairStyle, persState);

  // ---- Beard ----
  let beardSvg = '';
  if (buddy.beard) {
    beardSvg = `
      <path d="M 88,145 Q 92,158 100,160 Q 108,158 112,145" fill="${HAIR_COLORS.main}" opacity="0.7"/>
      <path d="M 85,138 L 85,145 Q 87,143 88,145" fill="${HAIR_COLORS.main}" opacity="0.5"/>
      <path d="M 115,138 L 115,145 Q 113,143 112,145" fill="${HAIR_COLORS.main}" opacity="0.5"/>`;
  }

  // ---- Signature Item ----
  let item = _renderItem(buddy.signatureItem, persState, bodyState);

  // ---- Body-specific effects ----
  let bodyEffects = '';
  if (bodyState==='pumped') {
    // flex sparkles
    bodyEffects = `
      <g class="anim-pump">
        <circle cx="58" cy="175" r="2" fill="#22c55e" opacity="0"><animate attributeName="opacity" values="0;0.8;0" dur="1.5s" repeatCount="indefinite"/></circle>
        <circle cx="142" cy="175" r="2" fill="#22c55e" opacity="0"><animate attributeName="opacity" values="0;0.8;0" dur="1.5s" begin="0.5s" repeatCount="indefinite"/></circle>
        <path d="M 55,168 L 52,164" stroke="#22c55e" stroke-width="1.5" opacity="0"><animate attributeName="opacity" values="0;0.7;0" dur="1.2s" repeatCount="indefinite"/></path>
        <path d="M 145,168 L 148,164" stroke="#22c55e" stroke-width="1.5" opacity="0"><animate attributeName="opacity" values="0;0.7;0" dur="1.2s" begin="0.3s" repeatCount="indefinite"/></path>
      </g>`;
  }
  if (bodyState==='soft') {
    // sweat drop
    bodyEffects += `<path d="M 76,120 Q 74,128 76,132 Q 78,128 76,120" fill="#60a5fa" opacity="0.5">
      <animate attributeName="opacity" values="0.5;0.1;0.5" dur="2s" repeatCount="indefinite"/>
    </path>`;
  }

  // ---- Personal effects ----
  let persEffects = '';
  if (persState==='focused') {
    // sparkle near head
    persEffects = `
      <text x="128" y="108" fill="#fbbf24" font-size="10" opacity="0">✨<animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite"/></text>`;
  }
  if (persState==='distracted') {
    // phone in hand
    persEffects = `<rect x="130" cy="200" y="195" width="8" height="14" rx="2" fill="#374151" stroke="#6b7280" stroke-width="0.5"/>
      <rect x="131" y="197" width="6" height="8" rx="1" fill="#1e40af" opacity="0.5"/>`;
  }
  if (persState==='avoidant') {
    // zzz
    persEffects = `
      <text x="125" y="108" fill="#9ca3af" font-size="12" font-weight="bold" opacity="0.6">z<animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite"/></text>
      <text x="135" y="98" fill="#9ca3af" font-size="9" font-weight="bold" opacity="0.4">z<animate attributeName="opacity" values="0.4;0;0.4" dur="2s" begin="0.5s" repeatCount="indefinite"/></text>`;
  }

  // ---- Spiritual effects ----
  let spirEffects = '';
  if (spiritState==='stressed') {
    // jitter lines
    spirEffects = `
      <path d="M 73,115 L 70,112" stroke="#ef4444" stroke-width="1.5" opacity="0"><animate attributeName="opacity" values="0;0.7;0" dur="0.8s" repeatCount="indefinite"/></path>
      <path d="M 127,115 L 130,112" stroke="#ef4444" stroke-width="1.5" opacity="0"><animate attributeName="opacity" values="0;0.7;0" dur="0.8s" begin="0.3s" repeatCount="indefinite"/></path>`;
  }

  // ---- Arms ----
  let armL, armR;
  if (bodyState==='pumped') {
    // flexed arms
    armL = `<path d="M 78,170 Q 60,165 58,178 Q 56,185 62,190" fill="${shirtColor}" stroke="${skin.base}" stroke-width="0"/>
            <circle cx="58" cy="178" r="6" fill="${skin.base}"/>
            <ellipse cx="58" cy="172" rx="5" ry="7" fill="${shirtColor}"/>`;
    armR = `<path d="M 122,170 Q 140,165 142,178 Q 144,185 138,190" fill="${shirtColor}" stroke="${skin.base}" stroke-width="0"/>
            <circle cx="142" cy="178" r="6" fill="${skin.base}"/>
            <ellipse cx="142" cy="172" rx="5" ry="7" fill="${shirtColor}"/>`;
  } else if (persState==='avoidant') {
    // arms down, slumped
    armL = `<rect x="63" y="172" width="12" height="35" rx="6" fill="${shirtColor}" transform="rotate(10,69,172)"/>
            <circle cx="65" cy="210" r="5" fill="${skin.base}"/>`;
    armR = `<rect x="125" y="172" width="12" height="35" rx="6" fill="${shirtColor}" transform="rotate(-10,131,172)"/>
            <circle cx="135" cy="210" r="5" fill="${skin.base}"/>`;
  } else {
    armL = `<rect x="63" y="172" width="12" height="30" rx="6" fill="${shirtColor}"/>
            <circle cx="69" cy="205" r="5" fill="${skin.base}"/>`;
    armR = `<rect x="125" y="172" width="12" height="30" rx="6" fill="${shirtColor}"/>
            <circle cx="131" cy="205" r="5" fill="${skin.base}"/>`;
  }

  // ---- Shoes ----
  let shoes = '';
  if (buddy.outfitStyle==='sport' && bodyState==='pumped') {
    shoes = `<ellipse cx="90" cy="252" rx="10" ry="5" fill="#22c55e"/>
             <ellipse cx="110" cy="252" rx="10" ry="5" fill="#22c55e"/>`;
  } else {
    shoes = `<ellipse cx="90" cy="252" rx="9" ry="5" fill="#1f2937"/>
             <ellipse cx="110" cy="252" rx="9" ry="5" fill="#1f2937"/>`;
  }

  const svg = `
  <svg viewBox="0 0 200 270" xmlns="http://www.w3.org/2000/svg" class="buddy-svg" role="img" aria-label="Buddy Avatar">
    ${aura}
    <g transform="rotate(${tilt}, 100, 200)" class="buddy-body-group ${bodyState==='pumped'?'anim-bounce':''}">
      <!-- Legs -->
      <rect x="84" y="215" width="13" height="35" rx="6" fill="${pantsColor}"/>
      <rect x="103" y="215" width="13" height="35" rx="6" fill="${pantsColor}"/>
      ${shoes}

      <!-- Body/Shirt -->
      <rect x="${100-bodyW/2}" y="168" width="${bodyW}" height="50" rx="${bodyR}" fill="${shirtColor}"/>

      <!-- Arms -->
      ${armL}${armR}

      <!-- Neck -->
      <rect x="94" y="155" width="12" height="16" rx="4" fill="${skin.base}"/>

      <!-- Head -->
      <ellipse cx="100" cy="128" rx="28" ry="30" fill="${skin.base}"/>

      <!-- Hair -->
      ${hair}

      <!-- Face -->
      ${brows}
      ${eyes}
      ${cheeks}
      ${blush}
      ${mouth}
      ${beardSvg}
    </g>

    <!-- Effects (outside tilt group) -->
    ${bodyEffects}
    ${persEffects}
    ${spirEffects}
    ${item}
  </svg>`;

  el.innerHTML = svg;
  // Set CSS classes for animations
  el.className = 'avatar-container';
  el.classList.add(`body-${bodyState}`, `spirit-${spiritState}`, `pers-${persState}`);
}

// ---- Hair Styles ----
function _renderHair(style, persState) {
  const c = HAIR_COLORS.main;
  const h = HAIR_COLORS.highlight;
  const messy = persState==='distracted' || persState==='foggy';

  switch(style) {
    case 'buzz':
      return `<ellipse cx="100" cy="112" rx="27" ry="20" fill="${c}" opacity="0.6"/>`;
    case 'curly':
      return `
        <path d="M 72,120 Q 72,95 90,92 Q 100,88 110,92 Q 128,95 128,120" fill="${c}"/>
        <circle cx="75" cy="112" r="7" fill="${c}"/><circle cx="125" cy="112" r="7" fill="${c}"/>
        <circle cx="80" cy="100" r="5" fill="${h}" opacity="0.3"/><circle cx="115" cy="100" r="5" fill="${h}" opacity="0.3"/>
        ${messy ? '<circle cx="70" cy="105" r="5" fill="'+c+'"/><circle cx="130" cy="105" r="5" fill="'+c+'"/>' : ''}`;
    case 'long':
      return `
        <path d="M 70,125 Q 68,95 85,88 Q 100,82 115,88 Q 132,95 130,125" fill="${c}"/>
        <path d="M 70,125 Q 68,150 72,170" fill="${c}" opacity="0.8"/>
        <path d="M 130,125 Q 132,150 128,170" fill="${c}" opacity="0.8"/>
        <path d="M 80,93 Q 100,86 120,93" fill="${h}" opacity="0.2"/>`;
    case 'wavy':
      return `
        <path d="M 72,122 Q 70,98 88,90 Q 100,85 112,90 Q 130,98 128,122" fill="${c}"/>
        <path d="M 72,122 Q 68,140 73,155 Q 75,140 72,122" fill="${c}"/>
        <path d="M 128,122 Q 132,140 127,155 Q 125,140 128,122" fill="${c}"/>
        ${messy ? '<path d="M 85,90 Q 78,85 82,80" fill="'+c+'" opacity="0.7"/>' : ''}`;
    case 'braids':
      return `
        <path d="M 72,118 Q 72,95 90,90 Q 100,86 110,90 Q 128,95 128,118" fill="${c}"/>
        <path d="M 74,118 Q 70,145 68,175" stroke="${c}" stroke-width="8" fill="none" stroke-linecap="round"/>
        <path d="M 126,118 Q 130,145 132,175" stroke="${c}" stroke-width="8" fill="none" stroke-linecap="round"/>
        <circle cx="68" cy="177" r="4" fill="#eab308"/><circle cx="132" cy="177" r="4" fill="#eab308"/>`;
    default: // short
      return `
        <path d="M 72,125 Q 70,100 85,93 Q 100,87 115,93 Q 130,100 128,125" fill="${c}"/>
        <path d="M 85,93 Q 95,88 105,90" fill="${h}" opacity="0.25"/>
        ${messy ? '<path d="M 90,90 Q 85,82 88,78" fill="'+c+'" opacity="0.6"/><path d="M 110,92 Q 118,84 115,80" fill="'+c+'" opacity="0.5"/>' : ''}`;
  }
}

// ---- Signature Items ----
function _renderItem(item, persState, bodyState) {
  switch(item) {
    case 'glasses':
      return `<g transform="translate(0,0)">
        <circle cx="89" cy="130" r="8" fill="none" stroke="#9ca3af" stroke-width="1.5"/>
        <circle cx="111" cy="130" r="8" fill="none" stroke="#9ca3af" stroke-width="1.5"/>
        <path d="M 97,130 L 103,130" stroke="#9ca3af" stroke-width="1.5"/>
        <path d="M 81,128 L 75,126" stroke="#9ca3af" stroke-width="1.2"/>
        <path d="M 119,128 L 125,126" stroke="#9ca3af" stroke-width="1.2"/>
      </g>`;
    case 'cap':
      return `<g>
        <path d="M 70,112 Q 72,95 100,92 Q 128,95 130,112" fill="#1e40af"/>
        <rect x="65" y="110" width="70" height="6" rx="3" fill="#1e40af"/>
        <rect x="125" y="107" width="18" height="5" rx="2" fill="#1e3a8a"/>
      </g>`;
    case 'watch':
      return `<g>
        <rect x="54" y="199" width="10" height="12" rx="3" fill="#374151" stroke="#9ca3af" stroke-width="0.8"/>
        <circle cx="59" cy="205" r="3" fill="#0f172a" stroke="#22c55e" stroke-width="0.5"/>
      </g>`;
    case 'headphones':
      return `<g>
        <path d="M 72,118 Q 68,95 100,90 Q 132,95 128,118" fill="none" stroke="#4b5563" stroke-width="4" stroke-linecap="round"/>
        <rect x="66" y="115" width="10" height="14" rx="5" fill="#4b5563"/>
        <rect x="124" y="115" width="10" height="14" rx="5" fill="#4b5563"/>
      </g>`;
    case 'chain':
      return `<g>
        <path d="M 92,158 Q 95,168 100,170 Q 105,168 108,158" fill="none" stroke="#eab308" stroke-width="1.5"/>
        <circle cx="100" cy="172" r="3" fill="#eab308"/>
      </g>`;
    default: return '';
  }
}

function _dimColor(hex) {
  // Slightly darken a hex color
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `rgb(${Math.max(0,r-30)},${Math.max(0,g-30)},${Math.max(0,b-30)})`;
}

// ---- Mood text for display ----
function getBuddyMood(areas, todayDone) {
  const neg = ['body','personal','spiritual'].filter(k => areas[k].status==='NEGLECTED').length;
  const low = ['body','personal','spiritual'].filter(k => areas[k].status==='LOW').length;
  const doneCnt = [todayDone.body, todayDone.personal, todayDone.spiritual].filter(Boolean).length;

  if (doneCnt===3) return {text:'Buddy ist stolz auf dich! 💪', level:'great'};
  if (neg>=2) return {text:'Buddy braucht dich!', level:'critical'};
  if (neg===1) return {text:'Ein Bereich wird vernachlässigt...', level:'warning'};
  if (doneCnt>=1) return {text:'Good progress, weiter so!', level:'good'};
  if (low>=2) return {text:'Buddy könnte Aufmerksamkeit brauchen.', level:'caution'};
  return {text:'Buddy wartet auf deine Habits.', level:'ok'};
}

