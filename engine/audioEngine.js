// Basic audio engine wrapper
export class AudioEngine {
  constructor() {
    this.layers = [];
    this.masterGain = new Tone.Gain(0).toDestination();
    this.masterGain.gain.value = 0;
    this.masterGain.toDestination();
    this.analyser = new Tone.Analyser("fft", 32);
    this.masterGain.connect(this.analyser);
  }

  async init() {
    await Tone.start();
    console.log("Audio ready");
  }

  createNoise(type = "brown", volume = -20) {
    const noise = new Tone.Noise(type).start();
    noise.volume.value = volume;
    const filter = new Tone.Filter(500, "lowpass");
    const gain = new Tone.Gain(0);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    return { noise, filter, gain };
  }

  createDrone(freq = 200, volume = -35) {
    const osc = new Tone.Oscillator(freq, "sine").start();
    osc.volume.value = volume;
    const filter = new Tone.Filter(500, "lowpass");
    const gain = new Tone.Gain(0);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    return { osc, filter, gain };
  }

  addLFO(target, min = 300, max = 800, speed = 0.05) {
    const lfo = new Tone.LFO(speed, min, max).start();
    lfo.connect(target);
    return lfo;
  }

  stopAll() {
    Tone.Transport.stop();
    Tone.Transport.cancel();
  }

  createPlayer(url, volume = -20) {
    const gain = new Tone.Gain(0);
    gain.connect(this.masterGain);

    const player = new Tone.Player({
      url,
      loop: true,
    });
    player.volume.value = volume;
    player.connect(gain);

    player.load(url).then(() => {
      player.start();
    });

    return {
      player: {
        stop: () => {
          try { player.stop(); } catch (_) {}
        },
        volume: {
          get value() { return player.volume.value; },
          set value(v) { player.volume.value = v; },
          rampTo: (v, t) => { player.volume.rampTo(v, t); },
        },
      },
      gain,
    };
  }

  fadeIn(time = 3) {
    try {
      this.masterGain.gain.rampTo(1, time);
    } catch {
      this.masterGain.gain.value = 1;
    }
  }

  fadeOut(time = 2) {
    try {
      this.masterGain.gain.rampTo(0, time);
    } catch {
      this.masterGain.gain.value = 0;
    }
  }

  createBinaural(baseFreq, beatFreq, volume = -25) {
  const leftOsc = new Tone.Oscillator(baseFreq, "sine").start();
  const rightOsc = new Tone.Oscillator(baseFreq + beatFreq, "sine").start();

  // Keep carriers very gentle before they even hit gain staging.
  leftOsc.volume.value = -12;
  rightOsc.volume.value = -12;

  const targetGain = Tone.dbToGain(volume) * 0.35;
  const leftGain = new Tone.Gain(0);
  const rightGain = new Tone.Gain(0);

  const leftPanner = new Tone.Panner(-1); // full left
  const rightPanner = new Tone.Panner(1); // full right

  leftOsc.connect(leftGain).connect(leftPanner).connect(this.masterGain);
  rightOsc.connect(rightGain).connect(rightPanner).connect(this.masterGain);

  return {
    leftOsc,
    rightOsc,
    leftGain,
    rightGain,
    targetGain
  };
}

}


