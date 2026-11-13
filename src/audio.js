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
    this.sfxPools = new Map();
    this.maxSfxVoicesPerSound = 4;
    this.context = null;
    this.gameplayMusic = null;
    this.effectsBus = null;
    this.weaponNoiseBuffer = null;
    this.activeWeaponVoices = new Set();
    this.maxWeaponVoices = 8;
    this.reportedWarnings = new Set();
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
    if (this.effectsBus?.gain) {
      const value = this.outputVolume(1);
      if (typeof this.effectsBus.gain.setValueAtTime === "function" && this.context) {
        this.effectsBus.gain.setValueAtTime(value, this.context.currentTime);
      } else {
        this.effectsBus.gain.value = value;
      }
    }
  }

  warnOnce(key, message, error) {
    if (this.reportedWarnings.has(key)) return;
    this.reportedWarnings.add(key);
    console.warn(message, error);
  }

  ensureEffectsBus() {
    if (this.effectsBus) return this.effectsBus;
    const context = this.context;
    if (!context || typeof context.createGain !== "function" || !context.destination) return null;
    const bus = context.createGain();
    bus.gain.value = this.outputVolume(1);
    bus.connect(context.destination);
    this.effectsBus = bus;
    return bus;
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
          this.ensureEffectsBus();
          this.getWeaponNoiseBuffer();
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
    let pool = this.sfxPools.get(name);
    if (!pool) {
      pool = { voices: [], cursor: 0 };
      this.sfxPools.set(name, pool);
    }
    let effect = null;
    for (let index = 0; index < pool.voices.length; index += 1) {
      const candidate = pool.voices[index];
      if (candidate.paused || candidate.ended) {
        effect = candidate;
        break;
      }
    }
    if (!effect && pool.voices.length < this.maxSfxVoicesPerSound) {
      effect = new Audio(url);
      effect.preload = "auto";
      effect.playsInline = true;
      effect.addEventListener?.("error", () => {
        console.warn(`[BoyPunk audio] Efeito ${name} indisponível ou não suportado pelo navegador.`);
      }, { once: true });
      pool.voices.push(effect);
    }
    if (!effect) {
      effect = pool.voices[pool.cursor];
      pool.cursor = (pool.cursor + 1) % pool.voices.length;
      effect.pause?.();
    }
    effect.currentTime = 0;
    effect.volume = Math.max(0, Math.min(1, this.outputVolume(gain)));
    effect.play().catch((error) => console.warn(`[BoyPunk audio] Efeito ${name} não iniciou:`, error));
  }

  getWeaponNoiseBuffer() {
    if (this.weaponNoiseBuffer) return this.weaponNoiseBuffer;
    const context = this.context;
    if (!context || typeof context.createBuffer !== "function") return null;
    const frameCount = Math.max(1, Math.floor((context.sampleRate || 44100) * 0.18));
    const buffer = context.createBuffer(1, frameCount, context.sampleRate || 44100);
    const channel = buffer.getChannelData(0);
    let state = 0x5a17;
    for (let index = 0; index < channel.length; index += 1) {
      state = (state * 1103515245 + 12345) & 0x7fffffff;
      channel[index] = (state / 0x3fffffff - 1) * 0.55;
    }
    this.weaponNoiseBuffer = buffer;
    return buffer;
  }

  releaseWeaponVoice(voice) {
    if (!voice || !this.activeWeaponVoices.delete(voice)) return;
    for (const node of voice.nodes) {
      if (typeof node?.disconnect !== "function") continue;
      try { node.disconnect(); }
      catch (error) { this.warnOnce("weapon-disconnect", "[BoyPunk audio] Falha ao liberar uma voz de tiro:", error); }
    }
  }

  playPlayerShot(characterId, { burstIndex = 1, rapidFire = false, doubleBurst = false } = {}) {
    if (!this.initialized || this.preferences.muted) return false;
    const context = this.context;
    const bus = this.ensureEffectsBus();
    if (!context || !bus || typeof context.createOscillator !== "function" || typeof context.createGain !== "function") {
      this.playSfx("attack", characterId === "support" ? 0.48 : 0.55);
      return false;
    }
    if (this.activeWeaponVoices.size >= this.maxWeaponVoices) return false;

    const nilo = characterId === "support";
    const duration = nilo ? 0.17 : 0.115;
    const pitchVariation = doubleBurst && burstIndex > 1 ? 0.92 : rapidFire ? 1.035 : 1;
    const voice = { nodes: [] };
    try {
      const now = context.currentTime;
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      voice.nodes.push(oscillator, envelope);
      oscillator.type = nilo ? "sawtooth" : "triangle";
      const startFrequency = (nilo ? 390 : 1040) * pitchVariation;
      const endFrequency = (nilo ? 135 : 430) * pitchVariation;
      oscillator.frequency.setValueAtTime(startFrequency, now);
      if (typeof oscillator.frequency.exponentialRampToValueAtTime === "function") {
        oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + duration);
      } else {
        oscillator.frequency.setValueAtTime(endFrequency, now + duration);
      }
      envelope.gain.setValueAtTime(0, now);
      envelope.gain.linearRampToValueAtTime(nilo ? 0.07 : 0.052, now + 0.006);
      envelope.gain.exponentialRampToValueAtTime?.(0.0001, now + duration);
      oscillator.connect(envelope);
      envelope.connect(bus);

      const noiseBuffer = this.getWeaponNoiseBuffer();
      if (noiseBuffer && typeof context.createBufferSource === "function") {
        const noise = context.createBufferSource();
        const noiseGain = context.createGain();
        voice.nodes.push(noise, noiseGain);
        noise.buffer = noiseBuffer;
        noiseGain.gain.setValueAtTime(nilo ? 0.018 : 0.012, now);
        noiseGain.gain.exponentialRampToValueAtTime?.(0.0001, now + duration * 0.72);
        if (typeof context.createBiquadFilter === "function") {
          const filter = context.createBiquadFilter();
          voice.nodes.push(filter);
          filter.type = nilo ? "lowpass" : "highpass";
          filter.frequency.setValueAtTime(nilo ? 1250 : 1800, now);
          noise.connect(filter);
          filter.connect(noiseGain);
        } else {
          noise.connect(noiseGain);
        }
        noiseGain.connect(bus);
        noise.start(now);
        noise.stop(now + duration);
      }

      this.activeWeaponVoices.add(voice);
      oscillator.onended = () => this.releaseWeaponVoice(voice);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.01);
      return true;
    } catch (error) {
      this.activeWeaponVoices.delete(voice);
      for (const node of voice.nodes) {
        try { node?.disconnect?.(); }
        catch (disconnectError) {
          this.warnOnce("weapon-failed-disconnect", "[BoyPunk audio] Falha ao limpar uma síntese interrompida:", disconnectError);
        }
      }
      this.warnOnce("weapon-synthesis", "[BoyPunk audio] Síntese de tiro indisponível; usando fallback:", error);
      this.playSfx("attack", nilo ? 0.48 : 0.55);
      return false;
    }
  }

  playAltarWarning() {
    const context = this.context;
    const bus = this.ensureEffectsBus();
    if (!this.initialized || !context || !bus || this.preferences.muted) return false;
    try {
      const now = context.currentTime;
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(740, now);
      oscillator.frequency.setValueAtTime(520, now + 0.12);
      oscillator.frequency.setValueAtTime(740, now + 0.24);
      envelope.gain.setValueAtTime(0, now);
      envelope.gain.linearRampToValueAtTime(0.055, now + 0.012);
      envelope.gain.setValueAtTime(0.055, now + 0.27);
      envelope.gain.linearRampToValueAtTime(0, now + 0.34);
      oscillator.connect(envelope);
      envelope.connect(bus);
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
    const bus = this.ensureEffectsBus();
    if (!this.initialized || !context || !bus || this.preferences.muted) return false;
    try {
      const now = context.currentTime;
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      oscillator.type = "sawtooth";
      oscillator.frequency.setValueAtTime(320, now);
      oscillator.frequency.exponentialRampToValueAtTime(140, now + 0.16);
      envelope.gain.setValueAtTime(0, now);
      envelope.gain.linearRampToValueAtTime(0.051, now + 0.01);
      envelope.gain.linearRampToValueAtTime(0, now + 0.18);
      oscillator.connect(envelope);
      envelope.connect(bus);
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
      weaponVoices: this.activeWeaponVoices.size,
      maxWeaponVoices: this.maxWeaponVoices,
      weaponNoiseBufferReady: Boolean(this.weaponNoiseBuffer),
      procedural: {
        ...GAMEPLAY_MUSIC,
        rendered: Boolean(this.gameplayMusic?.analysis),
        analysis: this.gameplayMusic?.analysis ?? null,
        activeSources: this.gameplayMusic?.source ? 1 : 0
      }
    };
  }
}
