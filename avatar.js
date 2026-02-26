// ============================================================
// avatar.js – 2D-Avatar ("Buddy") Rendering mit SVG
// ============================================================
// Der Avatar reagiert auf die 3 Need-Bereiche und deren Status.
// Keine Bodyshaming-Optik – stattdessen Haltung, Energie,
// Gesichtsausdruck, Aura/Glow und Outfit-Zustand.
// ============================================================

/**
 * Rendert den Avatar als SVG in das angegebene Container-Element.
 * @param {HTMLElement} container – Ziel-Element
 * @param {object} needs – { body: 0-100, personal: 0-100, spiritual: 0-100 }
 * @param {object} neglect – { body: {status}, personal: {status}, spiritual: {status} }
 */
function renderAvatar(container, needs, neglect) {
  const bodyVal = needs.body;
  const persVal = needs.personal;
  const spirVal = needs.spiritual;
  const avg = (bodyVal + persVal + spirVal) / 3;

  // ---- Farben/Zustände bestimmen ----
  const bodyStatus   = neglect.body.status;
  const persStatus   = neglect.personal.status;
  const spirStatus   = neglect.spiritual.status;

  // Aura-Farbe basierend auf Spiritual
  let auraColor = 'rgba(0,255,136,0.18)';   // grün
  let auraRadius = 90;
  if (spirStatus === 'NEGLECTED') { auraColor = 'rgba(255,60,60,0.12)'; auraRadius = 50; }
  else if (spirStatus === 'LOW')  { auraColor = 'rgba(255,200,50,0.14)'; auraRadius = 70; }

  // Haltung (body-abhängig): aufrecht vs gebeugt
  const bodyTilt = bodyStatus === 'NEGLECTED' ? 8 : bodyStatus === 'LOW' ? 4 : 0;

  // Gesicht
  let mouthPath, eyeExpr;
  if (avg >= 60) {
    mouthPath = 'M 85,155 Q 100,170 115,155';  // lächeln
    eyeExpr = 'happy';
  } else if (avg >= 30) {
    mouthPath = 'M 85,160 L 115,160';            // neutral
    eyeExpr = 'neutral';
  } else {
    mouthPath = 'M 85,165 Q 100,152 115,165';   // traurig
    eyeExpr = 'sad';
  }

  // Outfit-Farbe (Personal-abhängig)
  let shirtColor = '#22c55e';  // grün = gut
  if (persStatus === 'NEGLECTED') shirtColor = '#6b7280';  // grau
  else if (persStatus === 'LOW')  shirtColor = '#eab308';  // gelb

  // Energie-Partikel
  const particleCount = avg >= 60 ? 5 : avg >= 30 ? 2 : 0;

  // ---- SVG zusammenbauen ----
  let particles = '';
  for (let i = 0; i < particleCount; i++) {
    const cx = 60 + Math.random() * 80;
    const cy = 30 + Math.random() * 40;
    const r = 1.5 + Math.random() * 2;
    const delay = (Math.random() * 2).toFixed(1);
    particles += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#22c55e" opacity="0.7">
      <animate attributeName="cy" values="${cy};${cy - 20};${cy}" dur="2.5s" begin="${delay}s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.7;0;0.7" dur="2.5s" begin="${delay}s" repeatCount="indefinite"/>
    </circle>`;
  }

  // Augen
  let eyes = '';
  if (eyeExpr === 'happy') {
    eyes = `
      <path d="M 87,138 Q 90,134 93,138" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M 107,138 Q 110,134 113,138" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  } else if (eyeExpr === 'sad') {
    eyes = `
      <ellipse cx="90" cy="137" rx="3" ry="4" fill="white" opacity="0.7"/>
      <ellipse cx="110" cy="137" rx="3" ry="4" fill="white" opacity="0.7"/>`;
  } else {
    eyes = `
      <ellipse cx="90" cy="137" rx="3" ry="3.5" fill="white"/>
      <ellipse cx="110" cy="137" rx="3" ry="3.5" fill="white"/>`;
  }

  // Sweat drop wenn body neglected
  let sweat = '';
  if (bodyStatus === 'NEGLECTED') {
    sweat = `<path d="M 78,130 Q 76,138 78,142 Q 80,138 78,130" fill="#60a5fa" opacity="0.6">
      <animate attributeName="opacity" values="0.6;0;0.6" dur="1.8s" repeatCount="indefinite"/>
    </path>`;
  }

  // Z Z Z wenn spiritual neglected (müde/unruhig)
  let zzz = '';
  if (spirStatus === 'NEGLECTED') {
    zzz = `
      <text x="125" y="110" fill="#a78bfa" font-size="14" font-weight="bold" opacity="0.7">z
        <animate attributeName="opacity" values="0.7;0;0.7" dur="2s" repeatCount="indefinite"/>
      </text>
      <text x="133" y="100" fill="#a78bfa" font-size="11" font-weight="bold" opacity="0.5">z
        <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" begin="0.5s" repeatCount="indefinite"/>
      </text>`;
  }

  // Stresssymbol bei personal neglected
  let stressSymbol = '';
  if (persStatus === 'NEGLECTED') {
    stressSymbol = `<text x="70" y="110" fill="#f87171" font-size="16" font-weight="bold" opacity="0.8">!
      <animate attributeName="opacity" values="0.8;0.3;0.8" dur="1s" repeatCount="indefinite"/>
    </text>`;
  }

  const svg = `
  <svg viewBox="0 0 200 280" xmlns="http://www.w3.org/2000/svg" class="avatar-svg">
    <!-- Aura -->
    <ellipse cx="100" cy="160" rx="${auraRadius}" ry="${auraRadius + 20}" fill="${auraColor}">
      <animate attributeName="rx" values="${auraRadius};${auraRadius + 6};${auraRadius}" dur="3s" repeatCount="indefinite"/>
    </ellipse>

    <!-- Energie-Partikel -->
    ${particles}

    <g transform="rotate(${bodyTilt}, 100, 200)">
      <!-- Beine -->
      <rect x="85" y="210" width="12" height="40" rx="6" fill="#374151"/>
      <rect x="103" y="210" width="12" height="40" rx="6" fill="#374151"/>

      <!-- Schuhe -->
      <ellipse cx="91" cy="252" rx="9" ry="5" fill="${bodyStatus === 'NEGLECTED' ? '#4b5563' : '#1f2937'}"/>
      <ellipse cx="109" cy="252" rx="9" ry="5" fill="${bodyStatus === 'NEGLECTED' ? '#4b5563' : '#1f2937'}"/>

      <!-- Körper / Shirt -->
      <rect x="78" y="170" width="44" height="45" rx="10" fill="${shirtColor}"/>

      <!-- Arme -->
      <rect x="62" y="175" width="12" height="32" rx="6" fill="${shirtColor}" opacity="0.9"/>
      <rect x="126" y="175" width="12" height="32" rx="6" fill="${shirtColor}" opacity="0.9"/>

      <!-- Hände -->
      <circle cx="68" cy="210" r="5" fill="#d1d5db"/>
      <circle cx="132" cy="210" r="5" fill="#d1d5db"/>

      <!-- Kopf -->
      <circle cx="100" cy="135" r="28" fill="#9ca3af"/>

      <!-- Haare -->
      <path d="M 72,128 Q 80,100 100,105 Q 120,100 128,128" fill="#4b5563"/>

      <!-- Augen -->
      ${eyes}

      <!-- Mund -->
      <path d="${mouthPath}" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/>

      ${sweat}
    </g>

    ${zzz}
    ${stressSymbol}
  </svg>`;

  container.innerHTML = svg;
}

/**
 * Gibt eine kurze Text-Beschreibung des Avatar-Zustands zurück.
 */
function getAvatarMood(needs, neglect) {
  const avg = (needs.body + needs.personal + needs.spiritual) / 3;
  const neglectedCount = ['body', 'personal', 'spiritual'].filter(k => neglect[k].status === 'NEGLECTED').length;
  const lowCount = ['body', 'personal', 'spiritual'].filter(k => neglect[k].status === 'LOW').length;

  if (neglectedCount >= 2) return { text: 'Buddy braucht dringend Aufmerksamkeit!', emoji: '😟', level: 'critical' };
  if (neglectedCount === 1) return { text: 'Ein Bereich wird vernachlässigt...', emoji: '😕', level: 'warning' };
  if (lowCount >= 2) return { text: 'Buddy könnte mehr Pflege gebrauchen.', emoji: '😐', level: 'caution' };
  if (avg >= 80) return { text: 'Buddy fühlt sich großartig!', emoji: '😄', level: 'great' };
  if (avg >= 60) return { text: 'Buddy geht\'s gut.', emoji: '🙂', level: 'good' };
  return { text: 'Buddy ist okay, aber könnte besser sein.', emoji: '😐', level: 'ok' };
}
