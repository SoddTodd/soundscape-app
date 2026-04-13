export class PresetManager {
  constructor() {
    this.key = "vibe_presets";
  }

  getAll() {
    const raw = localStorage.getItem(this.key);
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  save(preset) {
    if (!preset || typeof preset !== "object") return;

    const cleaned = {
      name: String(preset.name || "Untitled").trim() || "Untitled",
      mode: typeof preset.mode === "string" ? preset.mode : null,
      texture: typeof preset.texture === "string" ? preset.texture : "none",
      mood: typeof preset.mood === "string" ? preset.mood : "calm",
      intensity: Number.isFinite(Number(preset.intensity))
        ? Math.max(0, Math.min(1, Number(preset.intensity)))
        : 0.5,
      solfeggioMode:
        typeof preset.solfeggioMode === "string" ? preset.solfeggioMode : "",
      solfeggioMix: Number.isFinite(Number(preset.solfeggioMix))
        ? Math.max(0, Math.min(1, Number(preset.solfeggioMix)))
        : 0.55
    };

    const presets = this.getAll();
    presets.push(cleaned);
    localStorage.setItem(this.key, JSON.stringify(presets));
  }

  delete(index) {
    const presets = this.getAll();
    presets.splice(index, 1);
    localStorage.setItem(this.key, JSON.stringify(presets));
  }
}