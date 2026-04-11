import { AudioEngine } from "./engine/audioEngine.js";
import { VibeEngine } from "./engine/vibeEngine.js";

const audio = new AudioEngine();
const vibe = new VibeEngine(audio);

const orb = document.getElementById("orb");
const background = document.getElementById("background");

let intensity = 0.5;
let pulse = 0;
let currentMood = "calm";
let isAudioInitialized = false;

async function ensureAudioInitialized() {
  if (isAudioInitialized) return;
  await audio.init();
  isAudioInitialized = true;
}

function setActiveButton(groupSelector, activeBtn) {
  document.querySelectorAll(groupSelector).forEach(btn => btn.classList.remove("active"));
  if (activeBtn) activeBtn.classList.add("active");
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

startWeatherUpdates();

window.playMode = async (mode, btn) => {
  await ensureAudioInitialized();
  await vibe.play(mode);
  setActiveButton("#modes button", btn);

  vibe.applyMood(currentMood);

  try {
    const weather = await getWeather();
    const type = getWeatherType(weather);

    vibe.applyWeatherContext(type);
    applyWeatherVisuals(type);
  } catch {}

  // visuals tweak per mode
  if (mode === "deepFocus") createParticles(20);
  if (mode === "flowState") createParticles(60);
  if (mode === "energyBoost") createParticles(90);
};

window.playRain = async () => {
  await ensureAudioInitialized();

  await vibe.play("flowState"); // or deepFocus
  vibe.setTexture("rain");

  vibe.applyMood(currentMood);

  try {
    const weather = await getWeather();
    const weatherType = getWeatherType(weather);
    vibe.applyWeatherContext(weatherType);
  } catch (e) {
    console.warn("Weather failed, continuing without it");
  }

  createParticles(80);

  background.style.background =
    "radial-gradient(circle at center, #2a3a4f, #000814)";

  orb.style.background =
    "radial-gradient(circle, rgba(120,160,255,0.3), transparent)";

    
};

window.playSleep = async () => {
  await ensureAudioInitialized();

  await vibe.play("deepSleep");
  vibe.setTexture("rain"); // optional

  vibe.applyMood(currentMood);

  try {
    const weather = await getWeather();
    const weatherType = getWeatherType(weather);

    vibe.applyWeatherContext(weatherType);
    applyWeatherVisuals(weatherType); // 👈 keep visuals in sync
  } catch (e) {
    console.warn("Weather failed, continuing without it");
  }

  createParticles(40); // calmer than rain

  background.style.background =
    "radial-gradient(circle at center, #1a1025, #000)";

  orb.style.background =
    "radial-gradient(circle, rgba(180,120,255,0.25), transparent)";

};

window.stopAll = () => {
  clearInterval(timerInterval);
  vibe.stop();
};

window.setIntensity = (value) => {
  intensity = parseFloat(value);
  vibe.setIntensity(intensity);
};

function animate() {
  const audioLevel = getAudioLevel();
  const sessionTime = getSessionProgress();

  // 🌙 visuals calm down over time
  const calmFactor = Math.max(0.3, 1 - sessionTime / 1800);

  pulse += 0.01 * calmFactor + intensity * 0.02;

  const scale =
    1 +
    Math.sin(pulse) * 0.05 * calmFactor +
    audioLevel * 0.3;

  const opacity =
    0.5 +
    Math.sin(pulse) * 0.2 * calmFactor +
    audioLevel * 0.5;

  orb.style.transform = `translate(-50%, -50%) scale(${scale})`;
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

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let particles = [];

function createParticles(count = 60) {
  particles = [];

  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2 + 0.5,
      speedY: Math.random() * 0.3 + 0.1,
      opacity: Math.random() * 0.5
    });
  }
}

createParticles();

function drawParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const audioLevel = getAudioLevel();
  const sessionTime = getSessionProgress();
  const calmFactor = Math.max(0.3, 1 - sessionTime / 1800);

  particles.forEach(p => {
    p.y -= (p.speedY + audioLevel * 0.5) * calmFactor;

    if (p.y < 0) {
      p.y = canvas.height;
      p.x = Math.random() * canvas.width;
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
  switch (context) {
    case "morning":
      background.style.background =
        "radial-gradient(circle, #FFD580, #FF8C42)";
      break;

    case "evening":
      background.style.background =
        "radial-gradient(circle, #2a3a6f, #000)";
      break;

    case "night":
      background.style.background =
        "radial-gradient(circle, #120018, #000)";
      break;
  }
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

      vibe.applyWeatherContext(type);
      applyWeatherVisuals(type);

    } catch (e) {
      console.warn("Weather update failed");
    }
  }, 300000); // every 5 minutes
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

  createParticles(40);

  background.style.background =
    "radial-gradient(circle at center, #1a2a3a, #000)";

  orb.style.background =
    "radial-gradient(circle, rgba(120,200,255,0.3), transparent)";
}

async function onBreakStart() {
  await ensureAudioInitialized();
  await vibe.play("deepSleep");

  createParticles(20);

  background.style.background =
    "radial-gradient(circle at center, #1a1025, #000)";

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
  setActiveButton("#textures button", type === "none" ? null : btn);
  if (!vibe.current) {
    ensureAudioInitialized().then(() => vibe.playTextureAlone(type));
  } else {
    vibe.setTexture(type);
  }
};