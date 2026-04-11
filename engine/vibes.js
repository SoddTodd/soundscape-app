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
  
};