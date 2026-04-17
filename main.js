import { AudioEngine } from "./engine/audioEngine.js";
import { VibeEngine } from "./engine/vibeEngine.js";
import { PresetManager } from "./presets.js";

const presets = new PresetManager();

const audio = new AudioEngine();
const vibe = new VibeEngine(audio);

const sphereCanvas = document.getElementById("wireframe-sphere");
const background = document.getElementById("background");
const topControls = document.getElementById("top");
const binauralOptions = document.getElementById("binaural-options");
const binauralModeButton = document.getElementById("binaural-mode-button");
const binauralHint = document.getElementById("binaural-hint");
const solfeggioSelect = document.getElementById("solfeggio-select");
const solfeggioMix = document.getElementById("solfeggio-mix");
const solfeggioHint = document.getElementById("solfeggio-hint");
const APP_VERSION = "20260415-02";
const BASE_BACKGROUND_GRADIENT =
  "radial-gradient(circle at 18% 12%, rgba(178, 207, 255, 0.16), transparent 30%), radial-gradient(circle at 82% 86%, rgba(124, 169, 255, 0.12), transparent 34%), linear-gradient(165deg, #0a44b2 0%, #062f8a 48%, #05286f 100%)";
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

const SPHERE_CONFIG = {
  pointCount: 92,
  baseLineWidth: 1.1,
  connectionDistance: 0.64
};

const SPHERE_MOOD_COLORS = {
  stressed: "rgba(255, 181, 181, 0.65)",
  tired: "rgba(213, 196, 255, 0.68)",
  focused: "rgba(190, 226, 255, 0.72)",
  calm: "rgba(188, 239, 212, 0.7)"
};

let sphereCtx = sphereCanvas ? sphereCanvas.getContext("2d") : null;
let spherePoints = [];
let sphereRotation = 0;
let sphereMoodColor = SPHERE_MOOD_COLORS.calm;
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

  if (topControls) {
    topControls.classList.toggle("binaural-open", show);
  }

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
    binauralHint.textContent = "Focus beat: 6 Hz. Ultra-soft single-layer binaural tone. Best with stereo headphones.";
    return;
  }

  if (type === "relax") {
    binauralHint.textContent = "Relax beat: 3 Hz. Ultra-soft single-layer binaural tone. Best with stereo headphones.";
    return;
  }

  binauralHint.textContent = "Best with stereo headphones.";
}

function getBinauralProfile(type) {
  if (type === "relax") {
    return {
      mode: "binauralRelax",
      texture: "none"
    };
  }

  return {
    mode: "binauralFocus",
    texture: "none"
  };
}

async function activateBinauralProfile(type, btn) {
  const profile = getBinauralProfile(type);
  posthog.capture("binaural_activated", { type, mode: profile.mode });

  manualTextureChoice = null;
  currentAutoTextureType = profile.texture;

  // Binaural mode is intentionally single-layer; clear any solfeggio overlay.
  vibe.setSolfeggioTone(null);
  if (solfeggioSelect) {
    solfeggioSelect.value = "";
  }
  updateSolfeggioHint("");

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
  posthog.capture("mood_selected", { mood, active_mode: vibe.currentMode || null });
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
  posthog.capture("mode_selected", { mode, mood: currentMood, intensity });

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
  posthog.capture("solfeggio_selected", { frequency: mode, active_mode: vibe.currentMode || null });
};

window.setSolfeggioMix = (value) => {
  const mix = parseFloat(value);
  if (Number.isNaN(mix)) return;
  vibe.setSolfeggioMix(mix);
};

window.playRain = async () => {
  await ensureAudioInitialized();
  posthog.capture("rain_shortcut_activated", { mood: currentMood, intensity });

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
  sphereMoodColor = SPHERE_MOOD_COLORS.focused;
};

window.playSleep = async () => {
  await ensureAudioInitialized();
  posthog.capture("sleep_mode_activated", { mood: currentMood, intensity });

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
  sphereMoodColor = SPHERE_MOOD_COLORS.tired;
};

window.stopAll = () => {
  clearInterval(timerInterval);
  posthog.capture("all_sounds_stopped", {
    mode: vibe.currentMode || null,
    mood: currentMood,
    session_seconds: Math.round(getSessionProgress())
  });

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
      audioLevel * 0.3
    );

  const opacity =
    0.5 +
    Math.sin(pulse) * 0.2 * calmFactor +
    audioLevel * 0.5;

  drawWireframeSphere(audioLevel, calmFactor, scale, opacity);

  requestAnimationFrame(animate);
}

animate();

function getAudioLevel() {
  if (!audio.analyser) return 0;

  const values = audio.analyser.getValue();
  if (!values || !values.length) return 0;

  // values are negative dB -> convert to usable level
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
  }

  const avg = sum / values.length;

  // normalize
  return Math.max(0, (avg + 100) / 100);
}

function rebuildSpherePoints() {
  spherePoints = [];
  const total = SPHERE_CONFIG.pointCount;

  for (let i = 0; i < total; i++) {
    const y = 1 - (i / (total - 1)) * 2;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = 2.399963229728653 * i;
    const x = Math.cos(theta) * radius;
    const z = Math.sin(theta) * radius;

    spherePoints.push({ x, y, z });
  }
}

function setupSphereCanvas() {
  if (!sphereCanvas || !sphereCtx) return;

  const rect = sphereCanvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;

  sphereCanvas.width = Math.max(1, Math.floor(rect.width * ratio));
  sphereCanvas.height = Math.max(1, Math.floor(rect.height * ratio));

  sphereCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function projectPoint(p, cx, cy, radius, rotationX, rotationY) {
  const cosY = Math.cos(rotationY);
  const sinY = Math.sin(rotationY);
  const cosX = Math.cos(rotationX);
  const sinX = Math.sin(rotationX);

  const x1 = p.x * cosY - p.z * sinY;
  const z1 = p.x * sinY + p.z * cosY;
  const y1 = p.y * cosX - z1 * sinX;
  const z2 = p.y * sinX + z1 * cosX;

  const perspective = 1 / (1 + z2 * 0.75);

  return {
    x: cx + x1 * radius * perspective,
    y: cy + y1 * radius * perspective,
    z: z2,
    perspective
  };
}

function drawWireframeSphere(audioLevel, calmFactor, scale, opacity) {
  if (!sphereCanvas || !sphereCtx || !spherePoints.length) return;

  const width = sphereCanvas.clientWidth;
  const height = sphereCanvas.clientHeight;
  if (!width || !height) return;

  sphereCtx.clearRect(0, 0, width, height);

  sphereRotation += 0.003 * calmFactor + audioLevel * 0.02;

  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.36 * scale;
  const wobble = 1 + Math.sin(pulse * 0.8) * 0.04 + audioLevel * 0.12;
  const rotationX = sphereRotation * 0.63;
  const rotationY = sphereRotation;

  const projected = spherePoints.map((p) => {
    const amp = 1 + audioLevel * 0.18 * Math.sin((p.x + p.y + p.z) * 7 + pulse * 2);
    return projectPoint(
      { x: p.x * amp * wobble, y: p.y * amp * wobble, z: p.z * amp * wobble },
      cx,
      cy,
      radius,
      rotationX,
      rotationY
    );
  });

  sphereCtx.lineWidth = SPHERE_CONFIG.baseLineWidth + audioLevel * 0.9;
  sphereCtx.strokeStyle = sphereMoodColor;
  sphereCtx.globalAlpha = Math.max(0.25, Math.min(1, opacity));

  const maxDist = radius * SPHERE_CONFIG.connectionDistance;
  for (let i = 0; i < projected.length; i++) {
    const a = projected[i];
    for (let j = i + 1; j < projected.length; j++) {
      const b = projected[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > maxDist) continue;

      const fade = 1 - dist / maxDist;
      sphereCtx.globalAlpha = (0.08 + fade * 0.52) * Math.max(0.28, Math.min(1, opacity));
      sphereCtx.beginPath();
      sphereCtx.moveTo(a.x, a.y);
      sphereCtx.lineTo(b.x, b.y);
      sphereCtx.stroke();
    }
  }

  sphereCtx.globalAlpha = 1;
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

  setupSphereCanvas();
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

rebuildSpherePoints();
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
  sphereMoodColor = SPHERE_MOOD_COLORS[mood] || SPHERE_MOOD_COLORS.calm;
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
  posthog.capture("flow_timer_started", { cycle: flow.cycle, phase: flow.isWork ? "work" : "break", active_mode: vibe.currentMode || null });

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
  sphereMoodColor = SPHERE_MOOD_COLORS.focused;
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
  sphereMoodColor = SPHERE_MOOD_COLORS.tired;
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
  posthog.capture("texture_selected", { texture: type, active_mode: vibe.currentMode || null, mood: currentMood });

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

  if (mode === "binauralFocus") return "none";
  if (mode === "binauralRelax") return "none";
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
  posthog.capture("preset_saved", {
    preset_name: name,
    mode,
    texture: preset.texture,
    mood: preset.mood,
    intensity: preset.intensity,
    solfeggio_mode: preset.solfeggioMode || null
  });

  renderPresets();
};

window.loadPreset = async (preset) => {
  if (!preset) return;
  posthog.capture("preset_loaded", {
    preset_name: preset.name || null,
    mode: preset.mode || null,
    texture: preset.texture || null,
    mood: preset.mood || null
  });

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
  const all = presets.getAll();
  const deleted = all[index];
  posthog.capture("preset_deleted", { preset_name: deleted?.name || null, index });
  presets.delete(index);
  renderPresets();
};

function getCurrentBinauralType() {
  if (vibe.currentMode === "binauralFocus") return "focus";
  if (vibe.currentMode === "binauralRelax") return "relax";
  return null;
}

function initFeedbackTracking() {
  const feedbackDetails = document.getElementById("feedback-details");
  const feedbackLink = document.getElementById("feedback-tally-link");

  if (feedbackDetails) {
    feedbackDetails.addEventListener("toggle", () => {
      if (!feedbackDetails.open) return;
      posthog.capture("feedback_form_opened", {
        source: "panel_toggle",
        app_version: APP_VERSION,
        mode: vibe.currentMode || null,
        mood: currentMood,
        intensity
      });
    });
  }

  if (feedbackLink) {
    feedbackLink.addEventListener("click", () => {
      posthog.capture("feedback_form_opened", {
        source: "cta_click",
        destination: feedbackLink.href,
        app_version: APP_VERSION,
        mode: vibe.currentMode || null,
        mood: currentMood,
        intensity
      });
    });
  }
}

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

initFeedbackTracking();
renderPresets();