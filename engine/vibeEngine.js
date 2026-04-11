import { vibes } from "./vibes.js";

export class VibeEngine {
  constructor(audioEngine) {
    this.audio = audioEngine;
    this.current = null;
    this.evolutionInterval = null;
    this.textureStopTimeout = null;
  }

async play(vibeName) {
  const config = vibes[vibeName];
  if (!config) return;

  this.startSession();
  this.currentMode = vibeName;

  // 🌊 fade out current sound
  if (this.current) {
    this.audio.fadeOut(2);
    await new Promise(r => setTimeout(r, 2000));
    this.stop();
  }

  this.startEvolution(config);

  // build new vibe
  const { noise, filter, gain: noiseGain } = this.audio.createNoise(
  config.noise.type,
  config.noise.volume
);

noiseGain.gain.rampTo(1, 3);

  const lfo = this.audio.addLFO(
    filter.frequency,
    config.filterRange[0],
    config.filterRange[1],
    config.lfoSpeed
  );

  let texture;
  let textureGain;
  if (config.texture) {
    const t = this.audio.createPlayer(
  config.texture.url,
  config.texture.volume
);

texture = t.player;
textureGain = t.gain;

textureGain.gain.rampTo(1, 4);
    
  }

  let drone;
  let droneGain;
  if (config.drone) {
    const d = this.audio.createDrone(
  config.drone.freq,
  config.drone.volume
);

drone = d.osc;
    this.audio.addLFO(d.filter.frequency, 200, 600, 0.03);
    droneGain = d.gain;

droneGain.gain.rampTo(1, 5);
  }

  this.current = { noise, filter, lfo, texture, drone, noiseGain, textureGain, droneGain };

  // 🌅 fade in new vibe
  this.audio.masterGain.gain.value = 0.0001;
  this.audio.fadeIn(3);

  const timeContext = this.getTimeContext();
this.applyTimeContext(timeContext);
}

  stop() {
  if (!this.current) return;

  if (this.textureStopTimeout) {
    clearTimeout(this.textureStopTimeout);
    this.textureStopTimeout = null;
  }

  const current = this.current;
  const fadeTime = 2;

  current.noiseGain?.gain.rampTo(0, fadeTime);
  current.textureGain?.gain.rampTo(0, fadeTime);
  current.droneGain?.gain.rampTo(0, fadeTime);

  setTimeout(() => {
    current.noise?.stop();
    current.texture?.stop();
    current.drone?.stop();
    current.lfo?.stop();
  }, fadeTime * 1000);

  this.current = null;

  if (this.evolutionInterval) {
    clearInterval(this.evolutionInterval);
    this.evolutionInterval = null;
  }
}

setIntensity(value) {
  if (!this.current) return;

  // Scale noise volume
  this.current.noise.volume.value = -30 + value * 20;

  // Open filter more = brighter
  this.current.filter.frequency.value = 200 + value * 1000;

  // Optional: affect texture
  if (this.current.texture) {
    this.current.texture.volume.value = -30 + value * 15;
  }
}

startEvolution(config) {
  this.evolutionInterval = setInterval(() => {
    if (!this.current) return;

    const t = this.getSessionTime();

    let intensityFactor = 1;
    let movementSpeed = config.lfoSpeed;

    // ⏳ Phase logic
    if (t < 300) {
      // first 5 min → settling
      intensityFactor = 1;
    } else if (t < 900) {
      // 5–15 min → stable
      intensityFactor = 0.8;
      movementSpeed *= 0.8;
    } else if (t < 1800) {
      // 15–30 min → deeper
      intensityFactor = 0.6;
      movementSpeed *= 0.5;
    } else {
      // 30+ min → very calm
      intensityFactor = 0.4;
      movementSpeed *= 0.3;
    }

    // 🎚️ Apply filter movement (slower over time)
    const newFreq =
      config.filterRange[0] +
      Math.random() *
        (config.filterRange[1] - config.filterRange[0]) *
        intensityFactor;

    this.current.filter.frequency.rampTo(newFreq, 15);

    // 🔊 Reduce noise intensity over time
    if (this.current.noise) {
      const baseVol = -20;
      const newVol = baseVol - (1 - intensityFactor) * 10;
      this.current.noise.volume.rampTo(newVol, 10);
    }

    // 🌫️ Drone becomes more dominant over time
    if (this.current.drone) {
      const droneVol = -35 + (1 - intensityFactor) * 10;
      this.current.drone.volume.rampTo(droneVol, 10);
    }

  }, 10000); // every 10 sec

  if (this.currentMode === "deepFocus") {
  // almost no randomness
  return;
}
}

startSession() {
  this.sessionStart = Date.now();
}

getSessionTime() {
  return (Date.now() - this.sessionStart) / 1000; // seconds
}

getTimeContext() {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 23) return "evening";
  return "night";
}

applyTimeContext(context) {
  if (!this.current) return;

  switch (context) {
    case "morning":
      this.current.filter.frequency.value *= 1.3;
      break;

    case "afternoon":
      // neutral
      break;

    case "evening":
      this.current.filter.frequency.value *= 0.8;
      break;

    case "night":
      this.current.filter.frequency.value *= 0.6;

      if (this.current.noise) {
        this.current.noise.volume.value -= 5;
      }
      break;
  }
}

applyWeatherContext(type) {
  if (!this.current) return;

  switch (type) {
    case "clear":
      // more tonal, less noise
      if (this.current.noise) {
        this.current.noise.volume.value -= 10;
      }
      break;

    case "cloudy":
      // balanced
      break;

    case "rain":
      // boost noise layer
      if (this.current.noise) {
        this.current.noise.volume.value += 5;
      }
      break;

    case "storm":
      // deeper + darker
      this.current.filter.frequency.value *= 0.7;

      if (this.current.noise) {
        this.current.noise.volume.value += 8;
      }
      break;
  }
}

applyMood(mood) {
  if (!this.current) return;

  // All values are absolute targets so moods don't stack on each other.
  // rampTo gives a smooth audible transition when switching moods.
  switch (mood) {
    case "stressed":
      // Dark, heavy, slow — grounding and de-escalating
      if (this.current.noise) this.current.noise.volume.rampTo(-12, 2);
      if (this.current.drone) this.current.drone.volume.rampTo(-22, 2);
      this.current.filter.frequency.rampTo(220, 2);
      if (this.current.lfo) this.current.lfo.frequency.rampTo(0.02, 2);
      break;

    case "tired":
      // Very warm, muffled, minimal movement — like being wrapped in a blanket
      if (this.current.noise) this.current.noise.volume.rampTo(-24, 2);
      if (this.current.drone) this.current.drone.volume.rampTo(-20, 2);
      this.current.filter.frequency.rampTo(160, 2);
      if (this.current.lfo) this.current.lfo.frequency.rampTo(0.015, 2);
      break;

    case "focused":
      // Clear, bright, very little noise — open and alert
      if (this.current.noise) this.current.noise.volume.rampTo(-32, 2);
      if (this.current.drone) this.current.drone.volume.rampTo(-36, 2);
      this.current.filter.frequency.rampTo(1000, 2);
      if (this.current.lfo) this.current.lfo.frequency.rampTo(0.08, 2);
      break;

    case "calm":
      // Balanced default — moderate everything
      if (this.current.noise) this.current.noise.volume.rampTo(-20, 2);
      if (this.current.drone) this.current.drone.volume.rampTo(-30, 2);
      this.current.filter.frequency.rampTo(500, 2);
      if (this.current.lfo) this.current.lfo.frequency.rampTo(0.05, 2);
      break;
  }
}

async playTextureAlone(type) {
  // Start a minimal base if nothing is playing
  if (!this.current) {
    await this.playMinimalBase();
  }
  
  this.setTexture(type);
}

async playMinimalBase() {
  // Minimal ambient base: just soft brown noise + quiet drone
  const { noise, filter, gain: noiseGain } = this.audio.createNoise("brown", -40);
  noiseGain.gain.value = 0;
  noiseGain.gain.rampTo(0.3, 1);

  const lfo = this.audio.addLFO(filter.frequency, 100, 300, 0.02);

  const d = this.audio.createDrone(80, -45);
  const droneGain = d.gain;
  droneGain.gain.value = 0;
  droneGain.gain.rampTo(0.2, 1);

  this.current = { noise, filter, lfo, drone: d.osc, droneGain, noiseGain };
  this.audio.masterGain.gain.value = 0.0001;
  this.audio.fadeIn(2);
}

setTexture(type) {
  if (!this.current) return;

  if (this.textureStopTimeout) {
    clearTimeout(this.textureStopTimeout);
    this.textureStopTimeout = null;
  }

  // fade out old texture
  if (this.current.textureGain) {
    const oldTexture = this.current.texture;
    const oldTextureGain = this.current.textureGain;

    oldTextureGain.gain.rampTo(0, 1);

    this.textureStopTimeout = setTimeout(() => {
      oldTexture?.stop();
      this.textureStopTimeout = null;
    }, 1000);
  }

  const textureMap = {
    rain: { url: "./assets/sounds/rain.mp3", volume: -20 },
    ocean: { url: "./assets/sounds/ocean.mp3", volume: -18 },
    wind: { url: "./assets/sounds/wind.mp3", volume: -25 },
    cafe: { url: "./assets/sounds/cafe.mp3", volume: -22 }
  };

  if (type === "none") {
    this.current.texture = null;
    this.current.textureGain = null;
    return;
  }

  const config = textureMap[type];
  if (!config) return;

  const t = this.audio.createPlayer(config.url, config.volume);

  this.current.texture = t.player;
  this.current.textureGain = t.gain;

  // smooth fade in
  this.current.textureGain.gain.value = 0;
  this.current.textureGain.gain.rampTo(1, 2);
}

}