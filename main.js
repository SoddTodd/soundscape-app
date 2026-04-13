import { AudioEngine } from "./engine/audioEngine.js";
import { VibeEngine } from "./engine/vibeEngine.js";
import { PresetManager } from "./presets.js";

const presets = new PresetManager();

const audio = new AudioEngine();
const vibe = new VibeEngine(audio);

const orb = document.getElementById("orb");
const background = document.getElementById("background");
const binauralOptions = document.getElementById("binaural-options");
const binauralModeButton = document.getElementById("binaural-mode-button");
const binauralHint = document.getElementById("binaural-hint");
const solfeggioSelect = document.getElementById("solfeggio-select");
const solfeggioMix = document.getElementById("solfeggio-mix");
const solfeggioHint = document.getElementById("solfeggio-hint");
const BASE_BACKGROUND_GRADIENT =
  "radial-gradient(circle at 30% 30%, #1a2a3a, transparent), radial-gradient(circle at 70% 70%, #0a0f1a, #000)";
const SOLFEGGIO_HINTS = {
  solfeggio396: "396 Hz: low-band emphasis with slow modulation for stable, grounded perception.",
  solfeggio417: "417 Hz: warm mid-low profile with gentle movement to reduce static listening fatigue.",
  solfeggio528: "528 Hz: balanced spectral center with moderate dynamics for neutral sustained focus.",
  solfeggio639: "639 Hz: clearer upper-mid presence with broader openness and articulation.",
  solfeggio741: "741 Hz: brighter high-mid contour with faster movement and sharper definition.",
  solfeggio852: "852 Hz: upper-band airy profile with the widest openness and lightest perceived weight."
};

let intensity = 0.5;
let pulse = 0;
let currentMood = "calm";
let isAudioInitialized = false;
let lastWeatherType = null;
let lastTimeContext = null;
let currentParticleBaseCount = 60;
let manualTextureChoice = null;
let currentAutoTextureType = null;

async function ensureAudioInitialized() {
  if (isAudioInitialized) return;
  await audio.init();
  isAudioInitialized = true;
}



function setActiveButton(groupSelector, activeBtn) {
  document.querySelectorAll(groupSelector).forEach(btn => btn.classList.remove("active"));
  if (activeBtn) activeBtn.classList.add("active");
}

function setTextureButtonByType(type) {
  const buttons = Array.from(document.querySelectorAll("#textures button"));
  const activeBtn = buttons.find(btn => btn.textContent.toLowerCase().includes(type));
  setActiveButton("#textures button", activeBtn || null);
}

function findModeButton(mode) {
  return document.querySelector(`#modes .mode-btn[onclick*="'${mode}'"]`);
}

function findMoodButton(mood) {
  return document.querySelector(`#moods > button[onclick*="'${mood}'"]`);
}

function getCurrentTexture() {
  if (manualTextureChoice !== null) return manualTextureChoice;
  if (currentAutoTextureType) return currentAutoTextureType;
  return vibe.selectedTextureType || "none";
}

function updateSolfeggioHint(mode) {
  if (!solfeggioHint) return;
  solfeggioHint.textContent =
    SOLFEGGIO_HINTS[mode] || "Pick a frequency to see its vibe.";
}

function showBinauralOptions(show) {
  if (!binauralOptions) return;

  binauralOptions.classList.toggle("visible", show);
  binauralOptions.setAttribute("aria-hidden", show ? "false" : "true");

  if (binauralHint) {
    binauralHint.classList.toggle("visible", show);
  }

  if (binauralHint && !show) {
    binauralHint.textContent = "";
  }

  if (!show) {
    document
      .querySelectorAll("#binaural-options .binaural-option")
      .forEach(btn => btn.classList.remove("active"));
  }
}

function setBinauralHintText(type) {
  if (!binauralHint) return;

  if (type === "focus") {
    binauralHint.textContent = "Focus beat: 10 Hz. Best with stereo headphones.";
    return;
  }

  if (type === "relax") {
    binauralHint.textContent = "Relax beat: 4 Hz. Best with stereo headphones.";
    return;
  }

  binauralHint.textContent = "Best with stereo headphones.";
}

function getBinauralProfile(type) {
  if (type === "relax") {
    return {
      mode: "binauralRelax",
      texture: "rain"
    };
  }

  return {
    mode: "binauralFocus",
    texture: "cafe"
  };
}

async function activateBinauralProfile(type, btn) {
  const profile = getBinauralProfile(type);

  manualTextureChoice = null;
  currentAutoTextureType = profile.texture;

  showBinauralOptions(true);
  setBinauralHintText(type);
  setActiveButton("#modes .mode-btn", binauralModeButton);
  setActiveButton("#binaural-options .binaural-option", btn || null);

  await window.playMode(profile.mode, binauralModeButton);

  vibe.setTexture(profile.texture, false);
  setTextureButtonByType(profile.texture);
  showBinauralOptions(true);
}

window.setMood = (mood, btn) => {
  currentMood = mood;
  setActiveButton("#moods > button", btn);
  vibe.applyMood(mood);
  applyMoodVisuals(mood);
};

window.startApp = async () => {
  await ensureAudioInitialized();
};

if (solfeggioMix) {
  vibe.setSolfeggioMix(parseFloat(solfeggioMix.value));
}

startWeatherUpdates();
startTimeUpdates();

window.playMode = async (mode, btn) => {
  await ensureAudioInitialized();
  await vibe.play(mode);
  setActiveButton("#modes .mode-btn", btn);

  if (!mode.startsWith("binaural")) {
    showBinauralOptions(false);
  }

  updateSolfeggioHint(solfeggioSelect?.value || "");

  vibe.applyMood(currentMood);
  vibe.setIntensity(intensity);
  applyCurrentTimeContext();

  try {
    const weather = await getWeather();
    const type = getWeatherType(weather);

    applyWeatherChange(type, true);
  } catch {}

  // visuals tweak per mode
  if (mode === "deepFocus") createParticles(20);
  if (mode === "flowState") createParticles(60);
  if (mode === "energyBoost") createParticles(90);
  if (mode === "binauralFocus") createParticles(40);
  if (mode === "binauralRelax") createParticles(25);
};

window.setSolfeggio = async (mode) => {
  await ensureAudioInitialized();

  if (!mode) {
    vibe.setSolfeggioTone(null);
    updateSolfeggioHint("");
    return;
  }

  vibe.setSolfeggioTone(mode);
  updateSolfeggioHint(mode);
};

window.setSolfeggioMix = (value) => {
  const mix = parseFloat(value);
  if (Number.isNaN(mix)) return;
  vibe.setSolfeggioMix(mix);
};

window.playRain = async () => {
  await ensureAudioInitialized();

  await vibe.play("flowState"); // or deepFocus
  manualTextureChoice = "rain";
  currentAutoTextureType = null;
  setTextureButtonByType("rain");
  vibe.setTexture("rain");

  vibe.applyMood(currentMood);
  vibe.setIntensity(intensity);
  applyCurrentTimeContext();

  try {
    const weather = await getWeather();
    const weatherType = getWeatherType(weather);
    applyWeatherChange(weatherType, true);
  } catch (e) {
    console.warn("Weather failed, continuing without it");
  }

  createParticles(80);

  background.style.background = BASE_BACKGROUND_GRADIENT;

  orb.style.background =
    "radial-gradient(circle, rgba(120,160,255,0.3), transparent)";

    
};

window.playSleep = async () => {
  await ensureAudioInitialized();

  await vibe.play("deepSleep");
  manualTextureChoice = "rain";
  currentAutoTextureType = null;
  setTextureButtonByType("rain");
  vibe.setTexture("rain"); // optional

  vibe.applyMood(currentMood);
  vibe.setIntensity(intensity);
  applyCurrentTimeContext();

  try {
    const weather = await getWeather();
    const weatherType = getWeatherType(weather);

    applyWeatherChange(weatherType, true);
  } catch (e) {
    console.warn("Weather failed, continuing without it");
  }

  createParticles(40); // calmer than rain

  background.style.background = BASE_BACKGROUND_GRADIENT;

  orb.style.background =
    "radial-gradient(circle, rgba(180,120,255,0.25), transparent)";

};

window.stopAll = () => {
  clearInterval(timerInterval);

  const doStop = () => {
    vibe.stop();
  };

  if (isAudioInitialized) {
    audio.fadeOut(1.4);
    setTimeout(doStop, 1400);
  } else {
    doStop();
  }

  vibe.clearTextureSelection();
  manualTextureChoice = null;
  currentAutoTextureType = null;

  if (solfeggioSelect) {
    solfeggioSelect.value = "";
  }
  updateSolfeggioHint("");

  document.querySelectorAll("#moods > button, #textures button, #modes button")
    .forEach(btn => btn.classList.remove("active"));

  showBinauralOptions(false);
};

window.setIntensity = (value) => {
  intensity = parseFloat(value);
  vibe.setIntensity(intensity);
};

function animate() {
  const audioLevel = getAudioLevel();
  const sessionTime = getSessionProgress();
  const viewportScale = getViewportScale();

  // 🌙 visuals calm down over time
  const calmFactor = Math.max(0.3, 1 - sessionTime / 1800);

  pulse += 0.01 * calmFactor + intensity * 0.02;

  const scale =
    viewportScale * (
    1 +
    Math.sin(pulse) * 0.05 * calmFactor +
    audioLevel * 0.3);

  const opacity =
    0.5 +
    Math.sin(pulse) * 0.2 * calmFactor +
    audioLevel * 0.5;

  orb.style.transform = `scale(${scale})`;
  orb.style.opacity = opacity;

  requestAnimationFrame(animate);
}

animate();

function getAudioLevel() {
  if (!audio.analyser) return 0;

  const values = audio.analyser.getValue();
  if (!values || !values.length) return 0;

  // values are negative dB → convert to usable level
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
  }

  const avg = sum / values.length;

  // normalize
  return Math.max(0, (avg + 100) / 100);
}

const canvas = document.getElementById("particles");
const ctx = canvas.getContext("2d");

let particles = [];

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * ratio);
  canvas.height = Math.floor(window.innerHeight * ratio);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function getViewportScale() {
  const minSide = Math.min(window.innerWidth, window.innerHeight);
  return Math.max(0.72, Math.min(1, minSide / 820));
}

function getResponsiveParticleCount(baseCount) {
  const areaRatio = (window.innerWidth * window.innerHeight) / (1440 * 900);
  return Math.max(18, Math.round(baseCount * Math.max(0.45, Math.min(1.2, areaRatio))));
}

function createParticles(count = 60) {
  currentParticleBaseCount = count;
  particles = [];
  const responsiveCount = getResponsiveParticleCount(count);

  for (let i = 0; i < responsiveCount; i++) {
    particles.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: Math.random() * 2 + 0.5,
      speedY: Math.random() * 0.3 + 0.1,
      opacity: Math.random() * 0.5
    });
  }
}

createParticles();
resizeCanvas();

window.addEventListener("resize", () => {
  resizeCanvas();
  createParticles(currentParticleBaseCount);
});

function drawParticles() {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  const audioLevel = getAudioLevel();
  const sessionTime = getSessionProgress();
  const calmFactor = Math.max(0.3, 1 - sessionTime / 1800);

  particles.forEach(p => {
    p.y -= (p.speedY + audioLevel * 0.5) * calmFactor;

    if (p.y < 0) {
      p.y = window.innerHeight;
      p.x = Math.random() * window.innerWidth;
    }

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size + audioLevel * 2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${p.opacity})`;
    ctx.fill();
  });

  requestAnimationFrame(drawParticles);
}

drawParticles();

function getSessionProgress() {
  if (!vibe.sessionStart) return 0;
  return (Date.now() - vibe.sessionStart) / 1000;
}

async function getWeather() {
  try {
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });

    const lat = position.coords.latitude;
    const lon = position.coords.longitude;

    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
    );

    const data = await res.json();
    return data.current_weather;

  } catch (e) {
    console.warn("Geolocation failed, using fallback");

    // fallback (Berlin)
    const res = await fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current_weather=true"
    );

    const data = await res.json();
    return data.current_weather;
  }
}

function getWeatherType(weather) {
  if (!weather) return "clear";

  const code = weather.weathercode;

  if (code < 3) return "clear";
  if (code < 50) return "cloudy";
  if (code < 70) return "rain";
  return "storm";
}

function applyTimeVisuals(context) {
  background.style.background = BASE_BACKGROUND_GRADIENT;
}

function applyWeatherVisuals(type) {
  switch (type) {
    case "rain":
      createParticles(100); // more particles
      break;

    case "clear":
      createParticles(30); // minimal
      break;

    case "storm":
      createParticles(120);
      break;
  }
}

function startWeatherUpdates() {
  setInterval(async () => {
    try {
      const weather = await getWeather();
      const type = getWeatherType(weather);

      console.log("Weather update:", type);

      applyWeatherChange(type);

    } catch (e) {
      console.warn("Weather update failed");
    }
  }, 300000); // every 5 minutes
}

function applyWeatherChange(type, force = false) {
  if (!force && type === lastWeatherType) return;
  lastWeatherType = type;

  if (vibe.current) {
    vibe.applyWeatherContext(type);
  }
  applyAdaptiveTexture(force);
  applyWeatherVisuals(type);
}

function startTimeUpdates() {
  applyCurrentTimeContext();

  setInterval(() => {
    syncTimeContext();
  }, 60000);
}

function applyCurrentTimeContext() {
  lastTimeContext = vibe.getTimeContext();
  applyTimeVisuals(lastTimeContext);
  applyAdaptiveTexture(true);
}

async function syncTimeContext(force = false) {
  const nextContext = vibe.getTimeContext();
  if (!force && nextContext === lastTimeContext) return;

  lastTimeContext = nextContext;
  applyTimeVisuals(nextContext);

  if (!vibe.current || !vibe.currentMode || !isAudioInitialized) return;

  await vibe.play(vibe.currentMode);
  vibe.applyMood(currentMood);
  vibe.setIntensity(intensity);

  if (lastWeatherType) {
    vibe.applyWeatherContext(lastWeatherType);
  }
}

function applyMoodVisuals(mood) {
  switch (mood) {
    case "stressed":
      orb.style.background =
        "radial-gradient(circle, rgba(255,120,120,0.3), transparent)";
      break;

    case "tired":
      orb.style.background =
        "radial-gradient(circle, rgba(200,160,255,0.2), transparent)";
      break;

    case "focused":
      orb.style.background =
        "radial-gradient(circle, rgba(120,200,255,0.3), transparent)";
      break;

    case "calm":
      orb.style.background =
        "radial-gradient(circle, rgba(180,255,200,0.25), transparent)";
      break;
  }
}

let timerInterval;

let flow = {
  timeLeft: 1500, // 25 min
  isWork: true,
  cycle: 1,
  maxCycles: 4
};

function updateDisplay() {
  const min = Math.floor(flow.timeLeft / 60);
  const sec = flow.timeLeft % 60;

  document.getElementById("time").innerText =
    `${min}:${sec.toString().padStart(2, "0")}`;

  document.getElementById("phase").innerText =
    flow.isWork ? `Focus • Cycle ${flow.cycle}` : "Break";
}

window.startFlow = async () => {
  await ensureAudioInitialized();
  clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    flow.timeLeft--;
    updateDisplay();

    if (flow.timeLeft <= 0) {
      nextPhase();
    }
  }, 1000);
};

async function nextPhase() {
  clearInterval(timerInterval);

  if (flow.isWork) {
    // → switch to break
    flow.isWork = false;

    // long break after 4 cycles
    flow.timeLeft = flow.cycle % 4 === 0 ? 900 : 300;

    await onBreakStart();

  } else {
    // → back to work
    flow.isWork = true;
    flow.cycle++;

    flow.timeLeft = 1500;

    await onWorkStart();
  }

  updateDisplay();
  startFlow();
}

async function onWorkStart() {
  await ensureAudioInitialized();
  await vibe.play("deepFocus"); // or keep last selected mode
  vibe.applyMood(currentMood);
  vibe.setIntensity(intensity);
  applyCurrentTimeContext();

  if (lastWeatherType) {
    vibe.applyWeatherContext(lastWeatherType);
  }

  createParticles(40);

  background.style.background = BASE_BACKGROUND_GRADIENT;

  orb.style.background =
    "radial-gradient(circle, rgba(120,200,255,0.3), transparent)";
}

async function onBreakStart() {
  await ensureAudioInitialized();
  await vibe.play("deepSleep");
  vibe.applyMood(currentMood);
  vibe.setIntensity(intensity);
  applyCurrentTimeContext();

  if (lastWeatherType) {
    vibe.applyWeatherContext(lastWeatherType);
  }

  createParticles(20);

  background.style.background = BASE_BACKGROUND_GRADIENT;

  orb.style.background =
    "radial-gradient(circle, rgba(200,150,255,0.25), transparent)";
}

window.resetFlow = () => {
  clearInterval(timerInterval);

  flow = {
    timeLeft: 1500,
    isWork: true,
    cycle: 1,
    maxCycles: 4
  };

  updateDisplay();
};

function notify(text) {
  console.log(text);
  // later: toast UI or sound cue
}

function setActive(buttons, activeText) {
  buttons.forEach(btn => {
    btn.style.background =
      btn.innerText === activeText
        ? "rgba(255,255,255,0.3)"
        : "rgba(255,255,255,0.1)";
  });
}

window.setTexture = (type, btn) => {
  manualTextureChoice = type;
  currentAutoTextureType = null;
  setActiveButton("#textures button", btn);

  if (!vibe.current) {
    ensureAudioInitialized().then(() => vibe.playTextureAlone(type));
  } else {
    vibe.setTexture(type);
  }
};

function getAdaptiveTextureType() {
  const mode = vibe.currentMode;
  const weather = lastWeatherType;
  const time = lastTimeContext;

  if (mode === "binauralFocus") return "cafe";
  if (mode === "binauralRelax") return "rain";
  if (weather === "storm" || weather === "rain") return "rain";
  if (time === "night") return mode === "deepSleep" ? "ocean" : "wind";
  if (time === "evening") return mode === "energyBoost" ? "cafe" : "ocean";
  if (mode === "energyBoost") return "cafe";
  if (mode === "flowState") return weather === "clear" ? "ocean" : "cafe";
  if (mode === "deepSleep") return "ocean";
  if (mode === "deepFocus") return time === "morning" ? "wind" : "rain";
  return weather === "clear" ? "wind" : "ocean";
}

function applyAdaptiveTexture(force = false) {
  if (manualTextureChoice !== null || !vibe.current) return;

  const nextTexture = getAdaptiveTextureType();
  if (!nextTexture) return;
  if (!force && nextTexture === currentAutoTextureType) return;

  currentAutoTextureType = nextTexture;
  vibe.setTexture(nextTexture);
  setTextureButtonByType(nextTexture);
}

window.setBinaural = async (type, btn) => {
  if (!binauralModeButton) return;

  await activateBinauralProfile(type, btn);
};

window.playBinaural = async (btn) => {
  const defaultOption = document.querySelector(
    "#binaural-options .binaural-option"
  );

  await activateBinauralProfile("focus", defaultOption || btn);
};

window.savePreset = () => {
  const name = prompt("Name your preset:");
  if (!name) return;

  const mode = vibe.currentMode || null;
  if (!mode) {
    alert("Start a mode first, then save a preset.");
    return;
  }

  const preset = {
    name,
    mode,
    texture: getCurrentTexture(),
    mood: currentMood,
    intensity,
    solfeggioMode: vibe.selectedSolfeggioType || solfeggioSelect?.value || "",
    solfeggioMix: Number(vibe.solfeggioMix)
  };

  presets.save(preset);

  renderPresets();
};

window.loadPreset = async (preset) => {
  if (!preset) return;

  try {
  if (preset.mode) {
    await window.playMode(preset.mode, findModeButton(preset.mode));
  }

  if (typeof preset.mood === "string") {
    window.setMood(preset.mood, findMoodButton(preset.mood));
  }

  const parsedIntensity = Number(preset.intensity);
  if (!Number.isNaN(parsedIntensity)) {
    intensity = Math.max(0, Math.min(1, parsedIntensity));
    vibe.setIntensity(intensity);

    const slider = document.getElementById("intensity-slider");
    if (slider) {
      slider.value = String(intensity);
    }
  }

  const texture = typeof preset.texture === "string" ? preset.texture : "none";
  manualTextureChoice = texture;
  currentAutoTextureType = null;
  vibe.setTexture(texture);
  setTextureButtonByType(texture);

  const nextSolfeggioMode =
    typeof preset.solfeggioMode === "string" ? preset.solfeggioMode : "";
  await window.setSolfeggio(nextSolfeggioMode);

  if (solfeggioSelect) {
    solfeggioSelect.value = nextSolfeggioMode;
  }

  const parsedSolfeggioMix = Number(preset.solfeggioMix);
  if (!Number.isNaN(parsedSolfeggioMix)) {
    const clampedMix = Math.max(0, Math.min(1, parsedSolfeggioMix));
    window.setSolfeggioMix(String(clampedMix));
    if (solfeggioMix) {
      solfeggioMix.value = String(clampedMix);
    }
  }

  } catch (err) {
    console.error("[Preset load failed]", err);
  }
};

window.deletePreset = (index) => {
  presets.delete(index);
  renderPresets();
};

function renderPresets() {
  const container = document.getElementById("presetList");
  if (!container) return;

  const all = presets.getAll();

  container.innerHTML = "";

  if (!all.length) {
    const empty = document.createElement("div");
    empty.className = "preset-empty";
    empty.textContent = "No presets yet. Save your current setup.";
    container.appendChild(empty);
    return;
  }

  all.forEach((p, i) => {
    const row = document.createElement("div");
    row.className = "preset-row";

    const loadBtn = document.createElement("button");
    loadBtn.className = "preset-load";
    loadBtn.textContent = p.name || `Preset ${i + 1}`;
    loadBtn.title = `Mode: ${p.mode}  |  Texture: ${p.texture}  |  Mood: ${p.mood}`;

    const detail = document.createElement("span");
    detail.className = "preset-detail";
    detail.textContent = `${p.mode} · ${p.texture} · ${p.mood}`;

    loadBtn.addEventListener("click", () => {
      window.loadPreset(p);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "preset-delete";
    deleteBtn.textContent = "X";
    deleteBtn.addEventListener("click", () => {
      window.deletePreset(i);
    });

    row.appendChild(loadBtn);
    row.appendChild(deleteBtn);
    loadBtn.appendChild(detail);
    container.appendChild(row);
  });
}

renderPresets();