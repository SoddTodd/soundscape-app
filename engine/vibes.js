export const vibes = {
  rainFocus: {
    noise: { type: "brown", volume: -18 },

    texture: {
      type: "rain",
      url: "./assets/sounds/rain.mp3",
      volume: -15
    },

    drone: {
      freq: 220,
      volume: -30
    },

    filterRange: [300, 900],
    lfoSpeed: 0.05
  }, 
  
deepSleep: {
  noise: { type: "brown", volume: -10 },

  drone: {
    freq: 110,
    volume: -28
  },

  filterRange: [100, 300],
  lfoSpeed: 0.02
},

deepFocus: {
  noise: { type: "pink", volume: -35 },

  drone: {
    freq: 80,
    volume: -34
  },

  filterRange: [200, 400],
  lfoSpeed: 0.02
},

flowState: {
  noise: { type: "pink", volume: -25 },

  drone: {
    freq: 120,
    volume: -30
  },

  filterRange: [300, 1200],
  lfoSpeed: 0.08
},

energyBoost: {
  noise: { type: "pink", volume: -22 },

  drone: {
    freq: 180,
    volume: -28
  },

  filterRange: [400, 1600],
  lfoSpeed: 0.1
},

solfeggio528: {
  drone: { freq: 528, volume: -21 },
  noise: { type: "pink", volume: -43 },
  filterRange: [240, 920],
  lfoSpeed: 0.022
},

solfeggio396: {
  drone: { freq: 396, volume: -22 },
  noise: { type: "brown", volume: -34 },
  filterRange: [120, 420],
  lfoSpeed: 0.014
},

solfeggio417: {
  drone: { freq: 417, volume: -21 },
  noise: { type: "pink", volume: -37 },
  filterRange: [160, 560],
  lfoSpeed: 0.03
},

solfeggio639: {
  drone: { freq: 639, volume: -22 },
  noise: { type: "white", volume: -44 },
  filterRange: [340, 1250],
  lfoSpeed: 0.04
},

solfeggio741: {
  drone: { freq: 741, volume: -23 },
  noise: { type: "white", volume: -46 },
  filterRange: [420, 1480],
  lfoSpeed: 0.05
},

solfeggio852: {
  drone: { freq: 852, volume: -24 },
  noise: { type: "white", volume: -48 },
  filterRange: [520, 1800],
  lfoSpeed: 0.065
}
  
};

