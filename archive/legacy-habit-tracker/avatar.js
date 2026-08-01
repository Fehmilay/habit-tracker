// ============================================================
// avatar.js – Avatar-Buddy Logik & Rendering v2
// ============================================================

const Avatar = {
  moods: {
    fire:    { emoji: '🔥', messages: ['Du bist on fire!', 'Streak läuft! 💪', 'Unaufhaltbar!'] },
    happy:   { emoji: '😄', messages: ['Super gemacht!', 'Weiter so! 🎉', 'Toll! Bisschen noch!'] },
    neutral: { emoji: '🙂', messages: ['Los geht\'s!', 'Heute wird\'s gut!', 'Pack\'s an!'] },
    sad:     { emoji: '😴', messages: ['Noch nichts geschafft', 'Fang klein an!', 'Ein Schritt genügt!'] }
  },

  getMood(progress, hasAny) {
    if (progress >= 0.75) return 'fire';
    if (progress >= 0.5 || hasAny) return 'happy';
    if (progress > 0) return 'neutral';
    return 'sad';
  },

  render(containerId, progress, hasAny) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const mood = this.getMood(progress, hasAny);
    const m = this.moods[mood];
    const msgIdx = new Date().getMinutes() % m.messages.length;
    el.innerHTML = `
      <div class="avatar-buddy">
        <span class="avatar-emoji">${m.emoji}</span>
        <p class="avatar-msg">${m.messages[msgIdx]}</p>
      </div>
    `;
  }
};

