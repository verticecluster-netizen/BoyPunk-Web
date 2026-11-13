import { GAMEPLAY_MUSIC, ProceduralGameplayMusic } from "./music.js";

export const AUDIO_STORAGE_KEY = "boypunk-web-audio-v1";

export function validateAudioPreferences(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (!Number.isFinite(value.volume) || value.volume < 0 || value.volume > 1 || typeof value.muted !== "boolean") return null;
  return { volume: value.volume, muted: value.muted };
}

export class AudioManager {
  constructor(audioUrls, storage = undefined) {
    this.audioUrls = audioUrls;
    this.initialized = false;
    this.currentMusic = null;
    this.requestedMusic = null;
    this.music = new Map();
    this.context = null;
    this.gameplayMusic = null;
    this.transition = 0;
    this.unlockPromise = null;
    if (storage === undefined) {
      try { this.storage = globalThis.localStorage ?? null; }
      catch { this.storage = null; }
    } else {
      this.storage = storage;
    }
    this.storagePersistent = Boolean(this.storage) && this.storage.persistent !== false;
    this.preferences = this.loadPreferences();
  }

  loadPreferences() {
    try {
      const parsed = validateAudioPreferences(JSON.parse(this.storage?.getItem(AUDIO_STORAGE_KEY)));
      if (parsed) return parsed;
    } catch { /* armazenamento pode estar bloqueado */ }
    return { volume: 0.65, muted: false };
  }

  savePreferences() {
    try {
      this.storage?.setItem(AUDIO_STORAGE_KEY, JSON.stringify(this.preferences));
      if (!this.storage) return false;
      return this.storagePersistent;
    }
    catch { /* a preferência vale apenas para a sessão */ }
    return false;
  }

  outputVolume(multiplier = 1) {
    return this.preferences.muted ? 0 : this.preferences.volume * multiplier;
  }

  setVolume(value) {
    this.preferences.volume = Math.max(0, Math.min(1, value));
    this.applyPreferences();
    this.savePreferences();
  }

  setMuted(muted) {
    this.preferences.muted = Boolean(muted);
    this.applyPreferences();
    this.savePreferences();
  }

  exportPreferences() {
    return { volume: this.preferences.volume, muted: this.preferences.muted };
  }

  applyImportedPreferences(value) {
    const imported = validateAudioPreferences(value);
    if (!imported) return { valid: false, persisted: false };
    this.preferences = imported;
    this.applyPreferences();
    return { valid: true, persisted: this.savePreferences() };
  }

  applyPreferences() {
    for (const track of this.music.values()) {
      track.volume = this.outputVolume(0.62);
      track.muted = this.preferences.muted;
    }
    this.gameplayMusic?.setVolume(this.outputVolume(0.44));
  }

  unlock() {
    this.initialized = true;
    if (!this.context) {
      const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (AudioContext) {
        try {
          // This method is called synchronously from pointer/touch/keyboard
          // handlers. Never create Web Audio during the asset preload.
          this.context = new AudioContext();
          this.gameplayMusic = new ProceduralGameplayMusic(this.context);
        } catch (error) {
          console.warn("[BoyPunk audio] AudioContext indisponível:", error);
          this.context = null;
          this.gameplayMusic = null;
        }
      }
    }
    if (this.context?.state === "suspended" && !this.unlockPromise) {
      try {
        this.unlockPromise = Promise.resolve(this.context.resume())
          .catch((error) => {
            console.warn("[BoyPunk audio] AudioContext não retomado:", error);
            return false;
          })
          .finally(() => { this.unlockPromise = null; });
      } catch (error) {
        console.warn("[BoyPunk audio] AudioContext não retomado:", error);
        this.unlockPromise = null;
      }
    }
    return this.unlockPromise ?? Promise.resolve(Boolean(this.context));
  }

  getMusic(name) {
    if (!this.music.has(name)) {
      const url = this.audioUrls.get(name);
      if (!url) return null;
      const track = new Audio(url);
      track.loop = true;
      track.preload = "auto";
      track.playsInline = true;
      track.volume = this.outputVolume(0.62);
      track.muted = this.preferences.muted;
      track.addEventListener?.("error", () => {
        console.warn(`[BoyPunk audio] Arquivo ${name} indisponível ou não suportado pelo navegador.`);
      }, { once: true });
      this.music.set(name, track);
    }
    return this.music.get(name);
  }

  async playMusic(name) {
    if (!this.initialized || (this.requestedMusic === name && this.currentMusic === name)) return;
    this.requestedMusic = name;
    const token = ++this.transition;
    this.stopCurrentTrack();
    await new Promise((resolve) => setTimeout(resolve, 180));
    if (token !== this.transition || this.requestedMusic !== name) return;

    if (name === "battle" && this.gameplayMusic) {
      try {
        const started = await this.gameplayMusic.start(this.outputVolume(0.44));
        if (token !== this.transition || this.requestedMusic !== name) {
          this.gameplayMusic.stop(0.08);
          return;
        }
        if (started) this.currentMusic = name;
      } catch (error) {
        console.error("[BoyPunk audio] Falha ao gerar música de gameplay:", error);
      }
      return;
    }

    const next = this.getMusic(name);
    if (!next) return;
    this.currentMusic = name;
    next.currentTime = 0;
    next.play().catch((error) => console.warn(`[BoyPunk audio] Música ${name} não iniciou:`, error));
  }

  stopCurrentTrack() {
    for (const track of this.music.values()) {
      track.pause();
      track.currentTime = 0;
    }
    this.gameplayMusic?.stop(0.16);
    this.currentMusic = null;
  }

  stopMusic() {
    this.transition += 1;
    this.requestedMusic = null;
    this.stopCurrentTrack();
  }

  playSfx(name, gain = 1) {
    if (!this.initialized || this.preferences.muted) return;
    const url = this.audioUrls.get(name);
    if (!url) return;
    const effect = new Audio(url);
    effect.preload = "auto";
    effect.playsInline = true;
    effect.volume = Math.max(0, Math.min(1, this.outputVolume(gain)));
    effect.addEventListener?.("error", () => {
      console.warn(`[BoyPunk audio] Efeito ${name} indisponível ou não suportado pelo navegador.`);
    }, { once: true });
    effect.play().catch((error) => console.warn(`[BoyPunk audio] Efeito ${name} não iniciou:`, error));
  }

  playAltarWarning() {
    const context = this.context;
    const level = this.outputVolume(1);
    if (!this.initialized || !context || level <= 0) return false;
    try {
      const now = context.currentTime;
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(740, now);
      oscillator.frequency.setValueAtTime(520, now + 0.12);
      oscillator.frequency.setValueAtTime(740, now + 0.24);
      envelope.gain.setValueAtTime(0, now);
      envelope.gain.linearRampToValueAtTime(0.055 * level, now + 0.012);
      envelope.gain.setValueAtTime(0.055 * level, now + 0.27);
      envelope.gain.linearRampToValueAtTime(0, now + 0.34);
      oscillator.connect(envelope);
      envelope.connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.35);
      return true;
    } catch (error) {
      console.warn("[BoyPunk audio] Aviso do altar indisponível:", error);
      return false;
    }
  }

  playBonusPenalty() {
    const context = this.context;
    const level = this.outputVolume(0.85);
    if (!this.initialized || !context || level <= 0) return false;
    try {
      const now = context.currentTime;
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      oscillator.type = "sawtooth";
      oscillator.frequency.setValueAtTime(320, now);
      oscillator.frequency.exponentialRampToValueAtTime(140, now + 0.16);
      envelope.gain.setValueAtTime(0, now);
      envelope.gain.linearRampToValueAtTime(0.06 * level, now + 0.01);
      envelope.gain.linearRampToValueAtTime(0, now + 0.18);
      oscillator.connect(envelope);
      envelope.connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.19);
      return true;
    } catch (error) {
      console.warn("[BoyPunk audio] Som de penalidade bônus indisponível:", error);
      return false;
    }
  }

  diagnostics() {
    return {
      initialized: this.initialized,
      music: this.currentMusic,
      requestedMusic: this.requestedMusic,
      contextState: this.context?.state ?? "unavailable",
      procedural: {
        ...GAMEPLAY_MUSIC,
        rendered: Boolean(this.gameplayMusic?.analysis),
        analysis: this.gameplayMusic?.analysis ?? null,
        activeSources: this.gameplayMusic?.source ? 1 : 0
      }
    };
  }
}
