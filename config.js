// ============================================================
// config.js – Zentrale Konfiguration
// ============================================================

const CONFIG = {
  enableSync: false,
  firebase: { apiKey:'', authDomain:'', projectId:'', storageBucket:'', messagingSenderId:'', appId:'' },

  defaultHabits: [
    { id:'h1', name:'Daily Beten',        category:'spiritual' },
    { id:'h2', name:'Gym / Sport',        category:'body'      },
    { id:'h3', name:'-1000 kcal Defizit', category:'body'      },
    { id:'h4', name:'Uni / Arbeit',       category:'personal'  },
    { id:'h5', name:'Bewerbung',          category:'personal'  }
  ],

  decay:  { body: 3, personal: 2, spiritual: 2 },
  gain:   { h1:10, h2:10, h3:8, h4:8, h5:12 },
  defaultGain: 8,
  dailyGainCap: 15,

  neglect: { low: 59, neglected: 30 },
  recoveryRequired: 3,
  maxRestDaysPerWeek: 1,

  // Journal-Fragen (Tages-Reflexion)
  journalQuestions: [
    { id:'j1', text:'Wofür bin ich heute dankbar?',              category:'spiritual' },
    { id:'j2', text:'Was war heute mein größter Erfolg?',        category:'personal'  },
    { id:'j3', text:'Was hätte ich heute besser machen können?', category:'personal'  },
    { id:'j4', text:'Wie fühlt sich mein Körper heute?',         category:'body'      },
    { id:'j5', text:'Was ist mein wichtigstes Ziel für morgen?', category:'personal'  }
  ],

  // Buddy-Customization Defaults
  buddyDefaults: {
    hairStyle: 'short',    // short | curly | long | buzz | wavy | braids
    eyebrowStyle: 'normal',// normal | thick | thin
    beard: false,
    skinTone: 'medium',    // light | medium | tan | brown | dark
    outfitStyle: 'casual', // casual | sport | business
    signatureItem: 'none'  // none | glasses | cap | watch | headphones | chain
  }
};

