// ============================================================
// avatar.js – Avatar-Buddy Logik & Rendering
// ============================================================

const Avatar = {
  moods: {
    happy:   { emoji: '😄', message: 'Super gemacht! Weiter so!' },
    neutral: { emoji: '😐', message: 'Los geht\'s! Trag deine kcal ein.' },
    sad:     { emoji: '😢', message: 'Nicht aufgeben! Morgen wird besser.' },
    fire:    { emoji: '🔥', message: 'Du bist on fire! Streak läuft!' }
  },

  getMood(progress, todayLogged) {
    if (progress >= 0.75) return 'fire';
    if (todayLogged) return 'happy';
    if (progress >= 0.25) return 'neutral';
    return 'sad';
  },

  render(containerId, progress, todayLogged) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const mood = this.getMood(progress, todayLogged);
    const m = this.moods[mood];
    el.innerHTML = `
      <div class="avatar-buddy">
        <span class="avatar-emoji">${m.emoji}</span>
        <p class="avatar-msg">${m.message}</p>
      </div>
    `;
  }
};

