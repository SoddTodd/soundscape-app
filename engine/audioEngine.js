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

  createPlayer(url, volume = -20, crossfadeTime = 2) {
    const gain = new Tone.Gain(0);
    gain.connect(this.masterGain);

    const p0 = new Tone.Player({ url });
    const p1 = new Tone.Player({ url });
    p0.volume.value = volume;
    p1.volume.value = volume;
    p0.connect(gain);
    p1.connect(gain);

    let active = 0;
    let scheduleId = null;
    const pair = [p0, p1];

    const scheduleNext = () => {
      const current = pair[active];
      const next = pair[1 - active];
      const duration = current.buffer.duration;
      const delay = Math.max(0, (duration - crossfadeTime) * 1000);

      scheduleId = setTimeout(() => {
        current.volume.rampTo(-60, crossfadeTime);
        next.volume.value = volume - 60;
        next.start();
        next.volume.rampTo(volume, crossfadeTime);
        active = 1 - active;
        scheduleNext(); // schedule from now, while new player is fresh
        setTimeout(() => {
          try { current.stop(); } catch (_) {}
          current.volume.value = volume;
        }, crossfadeTime * 1000);
      }, delay);
    };

    p0.load(url).then(() => {
      p1.load(url).then(() => {
        p0.start();
        scheduleNext();
      });
    });

    return {
      player: {
        stop: () => {
          clearTimeout(scheduleId);
          try { p0.stop(); } catch (_) {}
          try { p1.stop(); } catch (_) {}
        },
        volume: {
          get value() { return pair[active].volume.value; },
          set value(v) { pair[active].volume.value = v; },
          rampTo: (v, t) => { pair[active].volume.rampTo(v, t); },
        },
      },
      gain,
    };
  }

  fadeIn(time = 3) {
    this.masterGain.gain.rampTo(1, time);
  }

  fadeOut(time = 2) {
    this.masterGain.gain.rampTo(0, time);
  }
}


