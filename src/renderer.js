import { BALANCE, POWER_UPS, resolveWeaponAnchor } from "./config.js";
import { WORLD } from "./level-data.js";
import { BONUS_CANNON_RULES, BONUS_RULES, calculateBonusScore } from "./bonus.js";
import { t } from "./i18n.js";
import {
  animationFrame,
  CHASER_ANIMATIONS,
  chaserAnimationState,
  PATROL_SHOOTER_ANIMATIONS,
  PLAYER_ANIMATIONS,
  playerAnimationState
} from "./animation.js";

function frameKey(prefix, animation, frame) {
  return `${prefix}.${animation}.${frame}`;
}

function formatHudTime(seconds) {
  const totalSeconds = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function hudSeconds(value) {
  return Math.max(0, Number(value) || 0).toFixed(1);
}

export function resolveHudNotice(notice) {
  if (!notice || typeof notice !== "object") return null;
  const resolved = typeof notice.key === "string" && notice.key.trim()
    ? t(notice.key, notice.params ?? {})
    : notice.text;
  return typeof resolved === "string" && resolved.trim() ? resolved : null;
}

// Identidade de cada habilidade no HUD: sigla curta, nome acessível e cor.
const ABILITY_HUD = Object.freeze({
  "self-heal": Object.freeze({ code: "CURA", label: "Cura própria", accent: "#2ee6a8" }),
  "weapon-requisition": Object.freeze({ code: "REQ", label: "Requisição de arma", accent: "#ffb14a" }),
  default: Object.freeze({ code: "HAB", label: "Habilidade", accent: "#2ee6a8" })
});

export function buildHudEffectIndicators(model) {
  const coopPlayers = model?.coopPreview && Array.isArray(model.players) ? model.players : null;
  const players = coopPlayers ?? (model?.player ? [model.player] : []);
  const powerUpsVisible = !coopPlayers || model?.powerUpsAllowed?.() !== false;
  const indicators = [];
  for (const [index, player] of players.entries()) {
    const slot = Number(player?.slot) || index + 1;
    const owner = `P${slot}`;
    if (powerUpsVisible && player?.rapidFire && Number(player.rapidFireRemaining) > 0) {
      indicators.push({
        id: "rapid-fire", owner, code: "TR", label: "Tiro Rápido",
        remaining: Number(player.rapidFireRemaining), compact: `TR${hudSeconds(player.rapidFireRemaining)}`,
        accent: Number(player.rapidFireRemaining) <= 2.5 ? "#ff5f51" : "#ff7a28"
      });
    }
    const activePowerUp = player?.activePowerUp ?? (!coopPlayers && index === 0 ? model.activePowerUp : null);
    if (powerUpsVisible && activePowerUp?.id === POWER_UPS["double-burst"].id && Number(activePowerUp.remaining) > 0) {
      indicators.push({
        id: "double-burst", owner, code: "RD", label: "Rajada Dupla",
        remaining: Number(activePowerUp.remaining), compact: `RD${hudSeconds(activePowerUp.remaining)}`,
        accent: Number(activePowerUp.remaining) <= 2.5 ? "#ff5f51" : "#ffb14a"
      });
    }
    const shieldCharges = Number.isFinite(player?.shieldCharges)
      ? Math.max(0, Math.floor(player.shieldCharges))
      : player?.shield ? 1 : 0;
    if (powerUpsVisible && shieldCharges > 0) {
      indicators.push({
        id: "shield", owner, code: "◈", label: "Escudo", charges: shieldCharges,
        compact: `◈×${shieldCharges}`, accent: "#37e6ee"
      });
    }
    const ability = player?.ability ?? (!coopPlayers && index === 0 ? model.ability : null);
    if (ability && !player?.inactive) {
      const ready = Boolean(ability.ready) || Number(ability.rechargeRemaining) <= 0;
      // A sigla identifica a habilidade DAQUELE personagem; antes era sempre
      // "HAB" com a descrição de cura, mesmo para quem não cura.
      const meta = ABILITY_HUD[ability.id] ?? ABILITY_HUD.default;
      indicators.push({
        id: ability.id ?? "ability", owner, code: meta.code, label: meta.label, ready,
        remaining: ready ? 0 : Math.max(0, Number(ability.rechargeRemaining) || 0),
        compact: ready ? `${meta.code}✓` : `${meta.code}${hudSeconds(ability.rechargeRemaining)}`,
        accent: ready ? meta.accent : "#8aa0b8"
      });
    }
  }
  return indicators;
}

export function layoutHudEffectIndicators(indicators, {
  x = 0, y = 0, width = WORLD.width, gap = 4, rowHeight = 9,
  measureText = (text) => String(text).length * 4
} = {}) {
  const layout = [];
  let cursorX = x;
  let cursorY = y;
  for (const indicator of indicators ?? []) {
    const itemWidth = Math.max(1, Math.ceil(measureText(indicator.compact)));
    if (cursorX > x && cursorX + itemWidth > x + width) {
      cursorX = x;
      cursorY += rowHeight;
    }
    layout.push({ ...indicator, x: cursorX, y: cursorY, width: itemWidth });
    cursorX += itemWidth + gap;
  }
  return layout;
}

const DISTRICT_PARALLAX_KEYS = Object.freeze({
  far: "world.background.district.far",
  mid: "world.background.district.mid",
  near: "world.background.district.near"
});

const WORLD_RENDER_STATES = new Set([
  "playing", "survival", "survivalDefeat", "paused", "defeatPresentation",
  "victoryPresentation", "victory", "defeat", "bonusTransition", "bonusPlaying", "bonusComplete"
]);
const SCREEN_SHAKE_STATES = new Set(["playing", "survival"]);
const ANIMATED_SIMULATION_STATES = new Set(["playing", "bonusPlaying", "paused"]);
const LASER_PLANES = Object.freeze([52, 108, 162, 214]);
const TOXIC_POOLS = Object.freeze([
  Object.freeze({ x: 34, y: 242, w: 72, h: 8 }),
  Object.freeze({ x: 146, y: 242, w: 58, h: 8 }),
  Object.freeze({ x: 326, y: 242, w: 86, h: 9 })
]);
const HYDRAULIC_PISTONS = Object.freeze([
  Object.freeze({ x: 50, w: 34, offset: 0 }),
  Object.freeze({ x: 426, w: 34, offset: 1.8 })
]);
const NEON_PUDDLES = Object.freeze([
  Object.freeze({ x: 65, y: 242, w: 44, h: 5, color: "rgba(55, 230, 238, 0.28)" }),
  Object.freeze({ x: 160, y: 242, w: 56, h: 6, color: "rgba(174, 98, 255, 0.26)" }),
  Object.freeze({ x: 320, y: 242, w: 52, h: 6, color: "rgba(55, 230, 238, 0.26)" }),
  Object.freeze({ x: 412, y: 242, w: 40, h: 5, color: "rgba(255, 122, 40, 0.24)" })
]);
const DEATH_FRAGMENT_COLORS = Object.freeze(["#37e6ee", "#ae62ff", "#ff2e88", "#ffffff", "#37e6ee", "#c084fc"]);
const RESPAWN_BEAM_COLORS = Object.freeze(["#37e6ee", "#00ffcc", "#ae62ff", "#7928ca", "#37e6ee"]);
const MAX_LANDING_PARTICLES = 200;
const MAX_FLOATING_COMBAT_TEXTS = 30;

export const DISTRICT_PARALLAX = Object.freeze({
  farAmplitude: 3,
  midAmplitude: 6,
  nearAmplitude: 0,
  overscanSourcePixels: 24,
  smoothingRate: 6
});

function lifePips(current, maximum, filled = "◆", empty = "◇") {
  // Satura a contagem: repeat() lança RangeError com valor negativo, e esse
  // erro acontecia dentro do render, derrubando o laço de quadros inteiro.
  const total = Math.max(0, Math.floor(Number(maximum) || 0));
  const have = Math.max(0, Math.min(total, Math.floor(Number(current) || 0)));
  return filled.repeat(have) + empty.repeat(total - have);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export class Renderer {
  constructor(canvas, images, { debug = false, renderScale = null, imageSmoothing = null, cyberlabPreview = false } = {}) {
    this.canvas = canvas;
    this.logicalWidth = WORLD.width;
    this.logicalHeight = WORLD.height;
    const detectedScale = canvas?.width ? canvas.width / this.logicalWidth : 1;
    this.renderScale = Math.max(1, Math.min(4, Number(renderScale || detectedScale) || 1));
    this.context = canvas.getContext("2d", { alpha: false });
    this.imageSmoothing = imageSmoothing !== null ? Boolean(imageSmoothing) : this.renderScale > 1;
    if (this.context) {
      this.context.imageSmoothingEnabled = this.imageSmoothing;
      if (this.context.imageSmoothingQuality) {
        this.context.imageSmoothingQuality = "high";
      }
    }
    this.images = images;
    this.cyberlabPreview = Boolean(cyberlabPreview);
    this.screenShake = 0;
    this.debug = debug;
    this.animationSamples = debug ? [] : null;
    this.landingParticles = [];
    this.landingParticlePool = [];
    this.floatingCombatTexts = [];
    this.floatingCombatTextPool = [];
    this.processedEffects = new WeakSet();
    this.lastPlayerGrounded = true;
    this.lastPlayerVy = 0;
    this.playerMotionHistory = new Map();
    this.motionHistoryRunId = null;
    this.animationImageCache = new Map();
    this.parallaxLayersResolved = false;
    this.parallaxLayers = null;
    this.districtParallax = {
      far: 0,
      mid: 0,
      sceneKey: null,
      lastElapsed: null,
      disabled: false
    };
  }

  setRenderScale(scale) {
    const nextScale = Math.max(1, Math.min(4, Number(scale) || 1));
    if (nextScale === this.renderScale) return;
    this.renderScale = nextScale;
    this.animationImageCache?.clear();
    if (this.canvas) {
      this.canvas.width = Math.round(this.logicalWidth * nextScale);
      this.canvas.height = Math.round(this.logicalHeight * nextScale);
    }
    if (this.context) {
      this.context.imageSmoothingEnabled = this.renderScale > 1;
      if (this.context.imageSmoothingQuality) {
        this.context.imageSmoothingQuality = "high";
      }
    }
  }

  shake(amount = 3) {
    this.screenShake = Math.min(REMASTER.shake.maximum, Math.max(this.screenShake, amount));
  }

  // Silhuetas residuais da investida. Guardadas no renderer para não poluir o
  // modelo com estado puramente visual.
  spawnDashGhost(image, x, y, mirrored) {
    if (!image) return;
    this.dashGhosts ??= [];
    if (this.dashGhosts.length >= 8) this.dashGhosts.shift();
    this.dashGhosts.push({ image, x, y, mirrored, life: 0.2, duration: 0.2 });
  }

  drawDashGhosts(ctx) {
    if (!this.dashGhosts?.length) return;
    const dt = this.frameDelta ?? 0.016;
    ctx.save();
    for (let index = this.dashGhosts.length - 1; index >= 0; index -= 1) {
      const ghost = this.dashGhosts[index];
      ghost.life -= dt;
      if (ghost.life <= 0) { this.dashGhosts.splice(index, 1); continue; }
      const alpha = ghost.life / ghost.duration;
      ctx.globalAlpha = alpha * 0.45;
      ctx.shadowColor = "rgba(55, 230, 238, 0.8)";
      ctx.shadowBlur = 6;
      this.drawMirrored(ctx, ghost.image, ghost.x, ghost.y, 64, 96, ghost.mirrored);
    }
    ctx.restore();
  }

  recordAnimationSample(sample) {
    if (!this.animationSamples) return;
    this.animationSamples.push(sample);
    if (this.animationSamples.length > 480) this.animationSamples.splice(0, this.animationSamples.length - 480);
  }

  isAnimationSamplingEnabled() {
    return Boolean(this.animationSamples)
      || this.recordAnimationSample !== Renderer.prototype.recordAnimationSample;
  }

  render(model, now = performance.now() / 1000) {
    const ctx = this.context;
    // Delta real do quadro. Vários efeitos descontavam tempo por quadro
    // renderizado, o que os encurtava em telas de 120/144 Hz e os alongava
    // abaixo de 60 Hz.
    this.frameDelta = this.lastRenderNow != null
      ? Math.max(0, Math.min(0.1, now - this.lastRenderNow))
      : 1 / 60;
    this.lastRenderNow = now;
    if (model && model.shakeRequest > 0) {
      this.shake(model.shakeRequest);
      model.shakeRequest = 0;
    }
    if (this.motionHistoryRunId !== model?.runId) {
      this.playerMotionHistory.clear();
      this.motionHistoryRunId = model?.runId ?? null;
    }
    // Start every frame from a known physical-buffer state. The background is
    // logically 480x270, so relying on it to erase a translated previous frame
    // leaves stale edge pixels whenever screen shake is active.
    ctx.setTransform?.(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect?.(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    if (this.renderScale && this.renderScale !== 1) {
      ctx.scale?.(this.renderScale, this.renderScale);
    }
    this.drawBackground(ctx, model, now);

    if (model.player && WORLD_RENDER_STATES.has(model.state)) {
      ctx.save();
      if (this.screenShake > 0 && SCREEN_SHAKE_STATES.has(model.state)) {
        ctx.translate((Math.random() - 0.5) * this.screenShake, (Math.random() - 0.5) * this.screenShake);
        this.screenShake = Math.max(0, this.screenShake - REMASTER.shake.decayPerSecond * this.frameDelta);
      }
      this.drawWorld(ctx, model, now);
      ctx.restore();
      this.drawBonusSpeedRush(ctx, model, now);
      // The HUD is an authoritative screen-space pass. It must never inherit
      // world shake, clipping, alpha or transforms from scene rendering.
      this.drawHud(ctx, model, now);

      const isVictory = model.state === "victory" || model.state === "victoryPresentation" || model.gameState === "victory";
      const isDefeat = model.state === "defeat" || model.state === "defeatPresentation" || model.state === "survivalDefeat" || model.gameState === "defeat";
      if (isVictory) {
        this.drawVictoryCelebration(ctx, model, now);
      } else if (isDefeat) {
        this.drawDefeatDecay(ctx, model, now);
      }
    } else {
      this.drawMenuAtmosphere(ctx, now);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.shadowBlur = 0;
    if ("filter" in ctx) ctx.filter = "none";
  }

  resetDistrictParallax(sceneKey = null, elapsed = null) {
    this.districtParallax.far = 0;
    this.districtParallax.mid = 0;
    this.districtParallax.sceneKey = sceneKey;
    this.districtParallax.lastElapsed = Number.isFinite(elapsed) ? elapsed : null;
  }

  districtParallaxAssets() {
    if (this.districtParallax.disabled) return null;
    if (this.parallaxLayersResolved) return this.parallaxLayers;
    const far = this.images.get(DISTRICT_PARALLAX_KEYS.far);
    const mid = this.images.get(DISTRICT_PARALLAX_KEYS.mid);
    const near = this.images.get(DISTRICT_PARALLAX_KEYS.near);
    this.parallaxLayersResolved = true;
    if (!far || !mid || !near) {
      this.parallaxLayers = null;
      return null;
    }
    const validSize = far.width > 0 && far.height > 0
      && mid.width === far.width && mid.height === far.height
      && near.width === far.width && near.height === far.height;
    this.parallaxLayers = validSize ? { far, mid, near } : null;
    return this.parallaxLayers;
  }

  districtParallaxReferenceX(model) {
    const coopPlayers = Array.isArray(model?.players) ? model.players : null;
    if (coopPlayers) {
      let sum = 0;
      let count = 0;
      for (let index = 0; index < coopPlayers.length; index += 1) {
        const player = coopPlayers[index];
        if (!Number.isFinite(player?.x)) continue;
        sum += player.x + (player.w ?? 0) / 2;
        count += 1;
      }
      if (count > 0) return sum / count;
    }
    const player = model?.player;
    return Number.isFinite(player?.x) ? player.x + (player.w ?? 0) / 2 : WORLD.width / 2;
  }

  updateDistrictParallax(model) {
    const elapsed = Number.isFinite(model?.elapsed) ? model.elapsed : 0;
    const sceneKey = `${model?.levelId ?? model?.level?.theme ?? "district"}:${model?.runId ?? 0}`;
    const state = this.districtParallax;
    if (state.sceneKey !== sceneKey || state.lastElapsed === null || elapsed < state.lastElapsed) {
      this.resetDistrictParallax(sceneKey, elapsed);
      return state;
    }

    const canAdvance = !model?.reducedMotion && ["playing", "survival"].includes(model?.state);
    const dt = canAdvance ? Math.max(0, elapsed - state.lastElapsed) : 0;
    state.lastElapsed = elapsed;
    if (model?.reducedMotion) {
      state.far = 0;
      state.mid = 0;
      return state;
    }
    if (dt <= 0) return state;

    const reference = clamp(this.districtParallaxReferenceX(model), 0, WORLD.width);
    const normalized = clamp((reference - WORLD.width / 2) / (WORLD.width / 2), -1, 1);
    const blend = 1 - Math.exp(-DISTRICT_PARALLAX.smoothingRate * dt);
    state.far += (normalized * DISTRICT_PARALLAX.farAmplitude - state.far) * blend;
    state.mid += (normalized * DISTRICT_PARALLAX.midAmplitude - state.mid) * blend;
    state.far = clamp(state.far, -DISTRICT_PARALLAX.farAmplitude, DISTRICT_PARALLAX.farAmplitude);
    state.mid = clamp(state.mid, -DISTRICT_PARALLAX.midAmplitude, DISTRICT_PARALLAX.midAmplitude);
    return state;
  }

  drawCoverImage(ctx, image) {
    const sourceRatio = image.width / image.height;
    const targetRatio = WORLD.width / WORLD.height;
    let sx = 0;
    let sy = 0;
    let sw = image.width;
    let sh = image.height;
    if (sourceRatio > targetRatio) {
      sw = image.height * targetRatio;
      sx = (image.width - sw) / 2;
    } else {
      sh = image.width / targetRatio;
      sy = (image.height - sh) / 2;
    }
    ctx.drawImage(image, sx, sy, sw, sh, 0, 0, WORLD.width, WORLD.height);
  }

  drawDistrictParallaxBackground(ctx, model) {
    const layers = this.districtParallaxAssets();
    if (!layers) return false;
    const hasReference = Boolean(model?.player) || (Array.isArray(model?.players) && model.players.length > 0);
    const staticComposition = model?.reducedMotion || !hasReference;
    const state = staticComposition
      ? (this.resetDistrictParallax(null, model?.elapsed), this.districtParallax)
      : this.updateDistrictParallax(model);

    ctx.save();
    try {
      if (staticComposition) {
        this.drawCoverImage(ctx, layers.far);
        this.drawCoverImage(ctx, layers.mid);
        this.drawCoverImage(ctx, layers.near);
      } else {
        const targetRatio = WORLD.width / WORLD.height;
        const sw = layers.far.width - DISTRICT_PARALLAX.overscanSourcePixels * 2;
        const sh = sw / targetRatio;
        const baseSx = (layers.far.width - sw) / 2;
        const sy = (layers.far.height - sh) / 2;
        const sourcePixelsPerLogicalPixel = sw / WORLD.width;
        ctx.drawImage(layers.far, baseSx + state.far * sourcePixelsPerLogicalPixel, sy, sw, sh, 0, 0, WORLD.width, WORLD.height);
        ctx.drawImage(layers.mid, baseSx + state.mid * sourcePixelsPerLogicalPixel, sy, sw, sh, 0, 0, WORLD.width, WORLD.height);
        ctx.drawImage(layers.near, baseSx, sy, sw, sh, 0, 0, WORLD.width, WORLD.height);
      }
      ctx.restore();
      return true;
    } catch {
      ctx.restore();
      this.districtParallax.disabled = true;
      return false;
    }
  }

  drawBackground(ctx, model, now = 0) {
    const isFactory = model.level?.theme === "scrap-factory";
    const isBonus = model.level?.theme === "energy-chamber";
    const isDistrict = model.level?.theme === "neon-district" || model.levelId === "district-neon";
    const isCyberLab = model.level?.theme === "cyber-lab" || model.levelId === "cyber-lab";
    const background = (isCyberLab || (this.cyberlabPreview && isDistrict))
      ? (this.images.get("world.background.cyberlab") || this.images.get("world.background"))
      : isBonus
      ? (this.images.get("world.background.bonus") || this.images.get("world.background.factory") || this.images.get("world.background"))
      : isFactory
      ? (this.images.get("world.background.factory") || this.images.get("world.background"))
      : this.images.get("world.background");
    ctx.fillStyle = "#090714";
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    const drewDistrictLayers = isDistrict && this.drawDistrictParallaxBackground(ctx, model);
    if (!isDistrict) this.resetDistrictParallax();
    if (!drewDistrictLayers && background) this.drawCoverImage(ctx, background);
    if (isBonus) {
      this.drawEnergyChamberAtmosphere(ctx, model, now);
      this.drawFloatingEmbers(ctx, model, now, "bonus");
    } else if (isFactory) {
      this.drawFactoryAtmosphere(ctx);
      this.drawFloatingEmbers(ctx, model, now, "factory");
      this.drawHydraulicPistons(ctx, model, now);
      this.drawFactoryOverlord(ctx, model, now);
    } else {
      ctx.fillStyle = "rgba(6, 5, 18, 0.38)";
      ctx.fillRect(0, 0, WORLD.width, WORLD.height);
      const gradient = ctx.createLinearGradient(0, 0, 0, WORLD.height);
      gradient.addColorStop(0, "rgba(16, 13, 35, 0.08)");
      gradient.addColorStop(1, "rgba(8, 5, 18, 0.68)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, WORLD.width, WORLD.height);
      if (this.renderScale > 1) {
        const haze = ctx.createLinearGradient(0, 0, 0, 140);
        haze.addColorStop(0, "rgba(157, 78, 221, 0.05)");
        haze.addColorStop(0.5, "rgba(55, 230, 238, 0.03)");
        haze.addColorStop(1, "rgba(6, 5, 18, 0)");
        ctx.fillStyle = haze;
        ctx.fillRect(0, 0, WORLD.width, 140);
      }
      const atmosphereTime = model?.player && Number.isFinite(model.elapsed) ? model.elapsed : now;
      if (isDistrict) this.drawNeonAtmosphericLayers(ctx, model, atmosphereTime);
      this.drawCyberpunkRain(ctx, model, atmosphereTime);
      this.drawSweepingLaserGrid(ctx, model, atmosphereTime);
    }
    this.drawAltarReactiveLighting(ctx, model, now);
  }

  drawAltarReactiveLighting(ctx, model, now = 0) {
    if (!model) return;
    const altar = model.altar;
    if (!altar && !model.altarLightingTest) return;

    const maxLife = model.objective?.altarMaxLife ?? 4;
    const life = altar?.life ?? maxLife;
    const phase = altar?.phase ?? (life <= 1 ? 4 : life <= 2 ? 3 : life <= 3 ? 2 : 1);
    const isLowHealth = life <= 2 || phase >= 3;

    ctx.save();
    const cx = WORLD.width / 2;
    const cy = WORLD.height / 2;
    const radius = Math.max(WORLD.width, WORLD.height) * 0.75;

    if (typeof ctx.createRadialGradient === "function") {
      const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, radius);
      if (isLowHealth) {
        // Altar Health Low (Phase 3-4): Pulsing, intense crimson/orange urgency overlay
        const pulse = model.reducedMotion ? 0.12 : 0.11 + Math.sin(now * 5.5) * 0.05;
        grad.addColorStop(0, `rgba(255, 45, 30, ${pulse * 1.4})`);
        grad.addColorStop(0.45, `rgba(255, 122, 40, ${pulse * 0.95})`);
        grad.addColorStop(0.8, `rgba(180, 20, 30, ${pulse * 0.5})`);
        grad.addColorStop(1, "rgba(9, 7, 20, 0)");
      } else {
        // Altar Health High (Phase 1-2): Faint, calm cyan/violet overlay
        const calmBreath = model.reducedMotion ? 0 : Math.sin(now * 1.5) * 0.01;
        grad.addColorStop(0, `rgba(55, 230, 238, ${0.06 + calmBreath})`);
        grad.addColorStop(0.5, `rgba(174, 98, 255, ${0.04 + calmBreath * 0.5})`);
        grad.addColorStop(1, "rgba(9, 7, 20, 0)");
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    }
    ctx.restore();
  }

  drawEnergyChamberAtmosphere(ctx, model, now = 0) {
    ctx.save();
    // 1. Dark ambient contrast pass ensuring high foreground entity separation
    ctx.fillStyle = "rgba(6, 5, 18, 0.28)";
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);

    // Speed rush tension check (bonus timer < 5s)
    const bonusTime = model?.bonusTimer ?? model?.bonusRemaining ?? model?.bonus?.timer;
    const isSpeedRush = (model?.speedRush === true) || ((model?.level?.theme === "energy-chamber" || model?.gameMode === "bonus" || model?.state === "bonusPlaying" || model?.state === "bonusTransition") && typeof bonusTime === "number" && bonusTime < 5);

    // 2. Soft central radial reactor glow (pulse frequency accelerates in Speed Rush)
    const reduced = model?.reducedMotion;
    const pulseFreq = isSpeedRush ? 8.0 : 1.5;
    const pulseAmp = isSpeedRush ? 0.06 : 0.02;
    const pulse = reduced ? 0 : Math.sin(now * pulseFreq) * pulseAmp;
    if (typeof ctx.createRadialGradient === "function") {
      const glow = ctx.createRadialGradient(240, 135, 10, 240, 135, 220);
      if (isSpeedRush) {
        glow.addColorStop(0, `rgba(255, 55, 75, ${0.16 + pulse})`);
        glow.addColorStop(0.48, "rgba(255, 110, 40, 0.12)");
        glow.addColorStop(1, "rgba(18, 5, 14, 0.45)");
      } else {
        glow.addColorStop(0, `rgba(55, 230, 238, ${0.12 + pulse})`);
        glow.addColorStop(0.48, "rgba(174, 98, 255, 0.08)");
        glow.addColorStop(1, "rgba(6, 5, 18, 0.42)");
      }
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    }

    // 3. Vignette on left and right borders to frame the containment chamber
    const leftVignette = ctx.createLinearGradient(0, 0, 48, 0);
    leftVignette.addColorStop(0, "rgba(6, 5, 16, 0.45)");
    leftVignette.addColorStop(1, "rgba(6, 5, 16, 0)");
    ctx.fillStyle = leftVignette;
    ctx.fillRect(0, 0, 48, WORLD.height);

    const rightVignette = ctx.createLinearGradient(WORLD.width, 0, WORLD.width - 48, 0);
    rightVignette.addColorStop(0, "rgba(6, 5, 16, 0.45)");
    rightVignette.addColorStop(1, "rgba(6, 5, 16, 0)");
    ctx.fillStyle = rightVignette;
    ctx.fillRect(WORLD.width - 48, 0, 48, WORLD.height);

    // 4. Subtle vertical energy containment conduit bus lines framing the side walls
    ctx.strokeStyle = "rgba(55, 230, 238, 0.22)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, 20);
    ctx.lineTo(20, 236);
    ctx.moveTo(460, 20);
    ctx.lineTo(460, 204); // ends above the cannon mounting gantry
    ctx.stroke();

    ctx.strokeStyle = "rgba(174, 98, 255, 0.16)";
    ctx.beginPath();
    ctx.moveTo(23, 28);
    ctx.lineTo(23, 232);
    ctx.moveTo(457, 28);
    ctx.lineTo(457, 200);
    ctx.stroke();

    ctx.restore();
  }

  drawFactoryAtmosphere(ctx) {
    ctx.save();
    // Atmospheric ambient darkening pass to ensure high contrast for foreground entities
    ctx.fillStyle = "rgba(8, 10, 16, 0.22)";
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);

    // Subtle vertical environmental gradient (violet skylight at top -> clear center -> warm furnace bounce at bottom)
    const gradient = ctx.createLinearGradient(0, 0, 0, WORLD.height);
    gradient.addColorStop(0, "rgba(50, 32, 85, 0.16)");
    gradient.addColorStop(0.35, "rgba(10, 12, 18, 0.05)");
    gradient.addColorStop(0.82, "rgba(22, 16, 24, 0.15)");
    gradient.addColorStop(1, "rgba(220, 75, 20, 0.10)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);

    // Subtle vignetting along far left and right edges (framing the factory hall)
    const leftVignette = ctx.createLinearGradient(0, 0, 48, 0);
    leftVignette.addColorStop(0, "rgba(6, 7, 12, 0.40)");
    leftVignette.addColorStop(1, "rgba(6, 7, 12, 0)");
    ctx.fillStyle = leftVignette;
    ctx.fillRect(0, 0, 48, WORLD.height);

    const rightVignette = ctx.createLinearGradient(WORLD.width, 0, WORLD.width - 48, 0);
    rightVignette.addColorStop(0, "rgba(6, 7, 12, 0.40)");
    rightVignette.addColorStop(1, "rgba(6, 7, 12, 0)");
    ctx.fillStyle = rightVignette;
    ctx.fillRect(WORLD.width - 48, 0, 48, WORLD.height);

    ctx.restore();
  }

  drawCyberpunkRain(ctx, model, now = 0) {
    if (model?.reducedMotion) return;
    ctx.save();
    ctx.lineWidth = 1;
    const rainCount = 65;
    for (let i = 0; i < rainCount; i++) {
      const speed = 400 + (i % 6) * 40;
      const xBase = (i * 43.7) % WORLD.width;
      const y = ((i * 29.3 + now * speed) % (WORLD.height + 40)) - 20;
      const slant = 10;
      const x = (xBase + y * 0.22) % WORLD.width;
      const len = 10 + (i % 4) * 4;
      const alpha = 0.08 + (i % 5) * 0.025;
      ctx.strokeStyle = i % 3 === 0 ? `rgba(174, 98, 255, ${alpha})` : `rgba(55, 230, 238, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + slant * (len / 22), y + len);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawNeonAtmosphericLayers(ctx, model, simulationTime = 0) {
    const time = model?.reducedMotion ? 0 : (Number.isFinite(simulationTime) ? simulationTime : 0);
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    if ("filter" in ctx) ctx.filter = "blur(6px)";

    // Três planos de névoa muito leves criam profundidade em câmera fixa. As
    // formas são calculadas, sem canvases, imagens, gradientes ou arrays por frame.
    for (let layer = 0; layer < 3; layer += 1) {
      const radiusX = 142 - layer * 18;
      const radiusY = 15 - layer * 3;
      const y = 62 + layer * 75;
      const speed = 2.2 + layer * 1.7;
      const direction = layer === 1 ? -1 : 1;
      const cycle = WORLD.width + radiusX * 2;
      ctx.globalAlpha = 0.026 + layer * 0.009;
      ctx.fillStyle = layer === 1 ? "#ae62ff" : "#37e6ee";

      for (let bank = 0; bank < 4; bank += 1) {
        const phase = direction * time * speed + bank * (cycle / 4) + layer * 53;
        const wrapped = ((phase % cycle) + cycle) % cycle;
        const x = wrapped - radiusX;
        ctx.beginPath();
        if (typeof ctx.ellipse === "function") {
          ctx.ellipse(x, y + (bank % 2) * 7, radiusX, radiusY, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(x - radiusX, y - radiusY, radiusX * 2, radiusY * 2);
        }
      }
    }
    ctx.restore();
  }

  drawFloatingEmbers(ctx, model, now = 0, theme = "factory") {
    if (model?.reducedMotion) return;
    ctx.save();
    const emberCount = 50;
    const isBonus = theme === "bonus";
    for (let i = 0; i < emberCount; i++) {
      const speed = 20 + (i % 4) * 10;
      const xBase = (i * 37.7) % WORLD.width;
      const y = WORLD.height - ((i * 19.3 + now * speed) % (WORLD.height + 20));
      const wobble = Math.sin(now * 1.8 + i * 1.5) * 6;
      const x = (xBase + wobble + WORLD.width) % WORLD.width;
      const size = 1 + (i % 3) * 0.6;
      const normY = Math.max(0, Math.min(1, y / WORLD.height));
      const alpha = Math.sin(normY * Math.PI) * (isBonus ? 0.38 : 0.32);
      if (isBonus) {
        ctx.fillStyle = i % 2 === 0 ? `rgba(55, 230, 238, ${alpha})` : `rgba(174, 98, 255, ${alpha})`;
      } else {
        ctx.fillStyle = i % 3 === 0 ? `rgba(255, 210, 90, ${alpha})` : `rgba(255, 110, 40, ${alpha})`;
      }
      ctx.fillRect(Math.round(x), Math.round(y), Math.round(size), Math.round(size));
    }
    ctx.restore();
  }

  drawSweepingLaserGrid(ctx, model, now = 0) {
    ctx.save();
    const reduced = model?.reducedMotion;

    for (let i = 0; i < LASER_PLANES.length; i++) {
      const y = LASER_PLANES[i];
      const speed = 90 + (i % 2) * 50;
      const direction = i % 2 === 0 ? 1 : -1;
      const offset = i * 110;

      // Base glowing laser line across whole width
      ctx.strokeStyle = "rgba(255, 30, 60, 0.28)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WORLD.width, y);
      ctx.stroke();

      if (reduced) {
        ctx.fillStyle = "rgba(255, 40, 70, 0.45)";
        ctx.fillRect(40 + i * 100, y - 1, 24, 3);
        continue;
      }

      // Sweep node position
      const cycleW = WORLD.width + 120;
      const rawX = ((now * speed * direction + offset) % cycleW + cycleW) % cycleW;
      const sweepX = rawX - 60;

      // Scanning glow flare around sweepX
      if (typeof ctx.createRadialGradient === "function") {
        const flare = ctx.createRadialGradient(sweepX, y, 1, sweepX, y, 18);
        flare.addColorStop(0, "rgba(255, 230, 240, 0.95)");
        flare.addColorStop(0.25, "rgba(255, 30, 65, 0.75)");
        flare.addColorStop(0.7, "rgba(220, 10, 40, 0.25)");
        flare.addColorStop(1, "rgba(255, 0, 40, 0)");
        ctx.fillStyle = flare;
        ctx.fillRect(sweepX - 20, y - 10, 40, 20);
      }

      // Horizontal laser beam streak around node
      if (typeof ctx.createLinearGradient === "function") {
        const beamGrad = ctx.createLinearGradient(sweepX - 45, y, sweepX + 45, y);
        beamGrad.addColorStop(0, "rgba(255, 20, 50, 0)");
        beamGrad.addColorStop(0.5, "rgba(255, 40, 75, 0.85)");
        beamGrad.addColorStop(1, "rgba(255, 20, 50, 0)");
        ctx.strokeStyle = beamGrad;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(Math.max(0, sweepX - 45), y);
        ctx.lineTo(Math.min(WORLD.width, sweepX + 45), y);
        ctx.stroke();
      }

      // Brilliant white-hot core at the node center
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(Math.round(sweepX - 2), y - 1, 4, 3);

      // Vertical scanner tick marks
      ctx.fillStyle = "rgba(255, 60, 90, 0.7)";
      ctx.fillRect(Math.round(sweepX - 1), y - 4, 2, 2);
      ctx.fillRect(Math.round(sweepX - 1), y + 3, 2, 2);
    }
    ctx.restore();
  }

  drawToxicSludge(ctx, model, now = 0) {
    ctx.save();
    const reduced = model?.reducedMotion;

    for (let pIndex = 0; pIndex < TOXIC_POOLS.length; pIndex++) {
      const p = TOXIC_POOLS[pIndex];
      const centerX = p.x + p.w / 2;
      const centerY = p.y + p.h / 2;

      // 1. Dark acidic pool basin
      ctx.fillStyle = "#07170a";
      if (typeof ctx.ellipse === "function") {
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, p.w / 2, p.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(p.x, p.y, p.w, p.h);
      }

      // 2. Toxic sludge gradient (acid emerald to amber edge)
      if (typeof ctx.createRadialGradient === "function") {
        const sludgeGrad = ctx.createRadialGradient(centerX, centerY - 1, 2, centerX, centerY, p.w / 2);
        sludgeGrad.addColorStop(0, "rgba(65, 235, 75, 0.65)");
        sludgeGrad.addColorStop(0.55, "rgba(28, 160, 45, 0.55)");
        sludgeGrad.addColorStop(0.85, "rgba(195, 140, 20, 0.45)");
        sludgeGrad.addColorStop(1, "rgba(10, 30, 12, 0.3)");
        ctx.fillStyle = sludgeGrad;
      } else {
        ctx.fillStyle = "rgba(45, 200, 60, 0.55)";
      }
      if (typeof ctx.ellipse === "function") {
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, p.w / 2 - 2, p.h / 2 - 1, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(p.x + 2, p.y + 1, p.w - 4, p.h - 2);
      }

      // 3. Chemical surface scum sheen
      ctx.fillStyle = "rgba(215, 255, 110, 0.45)";
      ctx.fillRect(p.x + 6, p.y + 1, p.w - 12, 1);

      // 4. Bubbling VFX (4-5 bubbles per pool)
      const bubbleCount = reduced ? 2 : 5;
      for (let b = 0; b < bubbleCount; b++) {
        const bSpeed = 0.5 + (b % 3) * 0.25;
        const bProgress = reduced ? 0.5 : ((now * bSpeed + b * 0.31 + pIndex * 0.47) % 1.0);
        const bx = p.x + 8 + ((b * 17.3 + pIndex * 13) % (p.w - 16));
        const by = p.y + p.h - 1 - (bProgress * (p.h - 2));
        const radius = 1.0 + (b % 2) * 0.6 + (reduced ? 0 : bProgress * 0.8);

        // Bubble core
        ctx.fillStyle = "rgba(90, 255, 100, 0.85)";
        if (typeof ctx.arc === "function") {
          ctx.beginPath();
          ctx.arc(bx, by, radius, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(bx - radius, by - radius, radius * 2, radius * 2);
        }

        // Pop ripple when bubble reaches top
        if (!reduced && bProgress > 0.82) {
          const popAlpha = (1 - bProgress) * 4.5;
          ctx.strokeStyle = `rgba(180, 255, 80, ${popAlpha})`;
          ctx.lineWidth = 1;
          if (typeof ctx.ellipse === "function") {
            ctx.beginPath();
            ctx.ellipse(bx, p.y + 1, radius * 2, radius * 0.8, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      }

      // 5. Rising toxic vapor wisp
      if (!reduced) {
        const vaporX = centerX + Math.sin(now * 1.5 + pIndex) * 8;
        const vaporY = p.y - 4 + Math.sin(now * 2 + pIndex) * 2;
        ctx.fillStyle = "rgba(80, 240, 90, 0.12)";
        if (typeof ctx.ellipse === "function") {
          ctx.beginPath();
          ctx.ellipse(vaporX, vaporY, 10, 3, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  drawHydraulicPistons(ctx, model, now = 0) {
    ctx.save();
    const reduced = model?.reducedMotion;

    for (let i = 0; i < HYDRAULIC_PISTONS.length; i++) {
      const p = HYDRAULIC_PISTONS[i];
      const centerX = p.x + p.w / 2;
      const period = 3.6;
      const phaseTime = (now + p.offset) % period;

      let headY = 22;
      let isDescent = false;
      let isSlam = false;

      if (!reduced) {
        if (phaseTime < 2.0) {
          headY = 22;
        } else if (phaseTime < 2.25) {
          headY = 22 + Math.sin(phaseTime * 45) * 1.5;
          isDescent = true;
        } else if (phaseTime < 2.42) {
          const slamProgress = (phaseTime - 2.25) / 0.17;
          headY = 22 + slamProgress * slamProgress * 66;
          isDescent = true;
        } else if (phaseTime < 2.75) {
          headY = 88;
          isSlam = true;
        } else {
          const returnProgress = (phaseTime - 2.75) / (period - 2.75);
          headY = 88 - Math.sin(returnProgress * Math.PI * 0.5) * 66;
        }
      }

      const drawHeadY = Math.round(headY);

      // 1. Ceiling mount bracket (Y=0..16)
      ctx.fillStyle = "#181b24";
      ctx.fillRect(p.x - 3, 0, p.w + 6, 16);
      ctx.fillStyle = "#4a5568";
      ctx.fillRect(p.x - 3, 15, p.w + 6, 2);
      ctx.fillStyle = "#8a9ab4";
      ctx.fillRect(p.x, 3, 3, 3);
      ctx.fillRect(p.x + p.w - 3, 3, 3, 3);

      // 2. Telescopic hydraulic cylinder rod (Y=16 to drawHeadY)
      const rodW = 12;
      const rodX = centerX - rodW / 2;
      if (typeof ctx.createLinearGradient === "function") {
        const rodGrad = ctx.createLinearGradient(rodX, 0, rodX + rodW, 0);
        rodGrad.addColorStop(0, "#4a5568");
        rodGrad.addColorStop(0.4, "#cbd5e1");
        rodGrad.addColorStop(1, "#2d3748");
        ctx.fillStyle = rodGrad;
      } else {
        ctx.fillStyle = "#718096";
      }
      ctx.fillRect(rodX, 16, rodW, Math.max(0, drawHeadY - 16));

      // 3. Heavy metal block (piston head) (height 26)
      const headH = 26;
      ctx.fillStyle = "#1b202c";
      ctx.fillRect(p.x, drawHeadY, p.w, headH);
      ctx.fillStyle = "#718096";
      ctx.fillRect(p.x, drawHeadY, p.w, 2);
      ctx.fillRect(p.x, drawHeadY, 2, headH);
      ctx.fillStyle = "#0f131a";
      ctx.fillRect(p.x, drawHeadY + headH - 2, p.w, 2);
      ctx.fillRect(p.x + p.w - 2, drawHeadY, 2, headH);

      // Hazard chevrons on piston head (black and amber stripes)
      if (typeof ctx.rect === "function" && typeof ctx.clip === "function") {
        ctx.save();
        ctx.beginPath();
        ctx.rect(p.x + 3, drawHeadY + 5, p.w - 6, 12);
        ctx.clip();
        ctx.fillStyle = "#ffb14a";
        ctx.fillRect(p.x + 3, drawHeadY + 5, p.w - 6, 12);
        ctx.fillStyle = "#161922";
        for (let sx = p.x - 6; sx < p.x + p.w + 6; sx += 8) {
          ctx.beginPath();
          ctx.moveTo(sx, drawHeadY + 17);
          ctx.lineTo(sx + 5, drawHeadY + 5);
          ctx.lineTo(sx + 8, drawHeadY + 5);
          ctx.lineTo(sx + 3, drawHeadY + 17);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      } else {
        ctx.fillStyle = "#ffb14a";
        ctx.fillRect(p.x + 3, drawHeadY + 5, p.w - 6, 12);
      }

      // Corner rivets
      ctx.fillStyle = "#94a3b8";
      ctx.fillRect(p.x + 2, drawHeadY + 2, 2, 2);
      ctx.fillRect(p.x + p.w - 4, drawHeadY + 2, 2, 2);
      ctx.fillRect(p.x + 2, drawHeadY + headH - 4, 2, 2);
      ctx.fillRect(p.x + p.w - 4, drawHeadY + headH - 4, 2, 2);

      // Status indicator light
      const ledColor = isSlam ? "#ffffff" : (isDescent ? "#ff8522" : "#37e6ee");
      ctx.fillStyle = ledColor;
      ctx.fillRect(centerX - 3, drawHeadY + headH - 5, 6, 3);

      // 4. Steam venting puffs upon slam
      if (!reduced && isSlam) {
        ctx.fillStyle = "rgba(225, 235, 245, 0.45)";
        if (typeof ctx.arc === "function") {
          ctx.beginPath();
          ctx.arc(p.x - 4, drawHeadY + headH - 2, 5, 0, Math.PI * 2);
          ctx.arc(p.x + p.w + 4, drawHeadY + headH - 2, 5, 0, Math.PI * 2);
          ctx.arc(p.x - 8, drawHeadY + headH - 7, 7, 0, Math.PI * 2);
          ctx.arc(p.x + p.w + 8, drawHeadY + headH - 7, 7, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(p.x - 10, drawHeadY + headH - 6, 8, 6);
          ctx.fillRect(p.x + p.w + 2, drawHeadY + headH - 6, 8, 6);
        }
      }
    }
    ctx.restore();
  }

  drawFactoryOverlord(ctx, model, now = 0) {
    const isFactory = model?.level?.theme === "scrap-factory" || model?.levelId === "scrap-factory";
    const isEndPhase2 = isFactory && ((model?.altar?.phase ?? 1) >= 2 && (model?.altar?.deposited ?? 0) >= 6);
    const show = model?.bossOverlord || model?.showFactoryOverlord || model?.bossActive || isEndPhase2;
    if (!show) return;

    ctx.save();
    const reduced = model?.reducedMotion;
    const bob = reduced ? 0 : Math.sin(now * 1.6) * 1.5;
    const ox = 310;
    const oy = 40 + bob;

    // 1. Billowing exhaust smoke from shoulder chimneys
    const smokePuffs = reduced ? 2 : 6;
    for (let s = 0; s < smokePuffs; s++) {
      const sProgress = reduced ? 0.5 : ((now * 0.7 + s * 0.16) % 1.0);
      const sAlpha = (1 - sProgress) * 0.35;
      const sRadius = 5 + sProgress * 14;
      const sLift = sProgress * 42;
      const sDrift = Math.sin(now * 1.2 + s) * 8 + sProgress * 12;

      ctx.fillStyle = `rgba(24, 20, 32, ${sAlpha})`;
      if (typeof ctx.arc === "function") {
        ctx.beginPath();
        ctx.arc(ox + 16 + sDrift, oy + 4 - sLift, sRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ox + 88 + sDrift, oy + 4 - sLift, sRadius, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(ox + 16 + sDrift - sRadius, oy + 4 - sLift - sRadius, sRadius * 2, sRadius * 2);
        ctx.fillRect(ox + 88 + sDrift - sRadius, oy + 4 - sLift - sRadius, sRadius * 2, sRadius * 2);
      }
    }

    // 2. Heavy Obsidian/Steel Chassis Silhouette
    ctx.fillStyle = "#0a0c14";
    ctx.fillRect(ox + 10, oy + 2, 12, 22);
    ctx.fillRect(ox + 82, oy + 2, 12, 22);
    ctx.fillStyle = "#1e2433";
    ctx.fillRect(ox + 8, oy, 16, 3);
    ctx.fillRect(ox + 80, oy, 16, 3);

    // Pauldrons (massive shoulder armor)
    ctx.fillStyle = "#0c0e18";
    ctx.beginPath();
    ctx.moveTo(ox, oy + 26);
    ctx.lineTo(ox + 28, oy + 12);
    ctx.lineTo(ox + 34, oy + 54);
    ctx.lineTo(ox - 6, oy + 48);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(ox + 104, oy + 26);
    ctx.lineTo(ox + 76, oy + 12);
    ctx.lineTo(ox + 70, oy + 54);
    ctx.lineTo(ox + 110, oy + 48);
    ctx.closePath();
    ctx.fill();

    // Central torso / armor chassis
    ctx.fillStyle = "#080a12";
    ctx.beginPath();
    ctx.moveTo(ox + 24, oy + 20);
    ctx.lineTo(ox + 80, oy + 20);
    ctx.lineTo(ox + 88, oy + 76);
    ctx.lineTo(ox + 52, oy + 88);
    ctx.lineTo(ox + 16, oy + 76);
    ctx.closePath();
    ctx.fill();

    // Chest armor plate bevel
    ctx.strokeStyle = "#1b2333";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Menacing head crest / horned silhouette
    ctx.fillStyle = "#06080e";
    ctx.beginPath();
    ctx.moveTo(ox + 40, oy + 16);
    ctx.lineTo(ox + 52, oy + 8);
    ctx.lineTo(ox + 64, oy + 16);
    ctx.lineTo(ox + 62, oy + 36);
    ctx.lineTo(ox + 42, oy + 36);
    ctx.closePath();
    ctx.fill();

    // 3. Glowing Red Cyclopean Eye / Visor
    const eyeBaseX = ox + 52;
    const eyeBaseY = oy + 24;
    const eyeScan = reduced ? 0 : Math.sin(now * 2.5) * 4;
    const eyeX = eyeBaseX + eyeScan;
    const eyeY = eyeBaseY;

    // Visor dark socket
    ctx.fillStyle = "#1e0408";
    ctx.fillRect(ox + 43, oy + 22, 18, 4);

    // Glowing red eye core
    const eyePulse = reduced ? 0.8 : 0.75 + Math.sin(now * 4) * 0.25;
    ctx.fillStyle = `rgba(255, 30, 60, ${eyePulse})`;
    ctx.fillRect(eyeX - 3, eyeY - 1, 6, 3);
    ctx.fillStyle = "#ffeef0";
    ctx.fillRect(eyeX - 1, eyeY, 2, 1);

    // Horizontal anamorphic laser flare
    if (!reduced) {
      if (typeof ctx.createLinearGradient === "function") {
        const flareGrad = ctx.createLinearGradient(eyeX - 28, eyeY, eyeX + 28, eyeY);
        flareGrad.addColorStop(0, "rgba(255, 20, 50, 0)");
        flareGrad.addColorStop(0.5, `rgba(255, 40, 70, ${eyePulse * 0.8})`);
        flareGrad.addColorStop(1, "rgba(255, 20, 50, 0)");
        ctx.fillStyle = flareGrad;
        ctx.fillRect(eyeX - 28, eyeY, 56, 1);
      }
      if (typeof ctx.createRadialGradient === "function") {
        const glow = ctx.createRadialGradient(eyeX, eyeY, 1, eyeX, eyeY, 16);
        glow.addColorStop(0, "rgba(255, 30, 60, 0.65)");
        glow.addColorStop(0.5, "rgba(255, 10, 40, 0.2)");
        glow.addColorStop(1, "rgba(255, 0, 0, 0)");
        ctx.fillStyle = glow;
        ctx.fillRect(eyeX - 16, eyeY - 16, 32, 32);
      }
    }
    ctx.restore();
  }

  drawBossHealthBar(ctx, model, now = 0) {
    ctx.save();
    // Dedicated second-row HUD lane. The primary objective panel occupies
    // x=136..356/y=7..45, so the boss must never be drawn over it.
    const bx = 152;
    const by = 51;
    const bw = 320;
    const bh = 22;

    // 1. Frame panel backing
    ctx.fillStyle = "rgba(10, 8, 20, 0.94)";
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = "#ff2a4b";
    ctx.lineWidth = 1;
    ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);

    // Hazard corner tabs
    ctx.fillStyle = "#ff8522";
    ctx.fillRect(bx, by, 4, 4);
    ctx.fillRect(bx + bw - 4, by, 4, 4);
    ctx.fillRect(bx, by + bh - 4, 4, 4);
    ctx.fillRect(bx + bw - 4, by + bh - 4, 4, 4);

    // 2. Boss header text
    ctx.font = "bold 8px 'Pixelify Sans'";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#ff2a4b";
    ctx.fillText("☠", bx + 6, by + 3);
    ctx.fillStyle = "#fff5dc";
    ctx.fillText("FACTORY OVERLORD", bx + 18, by + 3);
    ctx.font = "6px 'Pixelify Sans'";
    ctx.fillStyle = "#ff8522";
    ctx.fillText("// MK.IV HEAVY MECH", bx + 115, by + 4);

    // 3. Health bar track
    const trackX = bx + 6;
    const trackY = by + 12;
    const trackW = bw - 12;
    const trackH = 6;

    ctx.fillStyle = "#151224";
    ctx.fillRect(trackX, trackY, trackW, trackH);
    ctx.strokeStyle = "rgba(255, 42, 75, 0.4)";
    ctx.strokeRect(trackX + 0.5, trackY + 0.5, trackW - 1, trackH - 1);

    const currentHealth = Number(model?.bossHealth);
    const maxHealth = Number(model?.bossMaxHealth);
    const explicitRatio = Number(model?.bossHealthRatio);
    const bossRatio = Math.max(0, Math.min(1,
      Number.isFinite(currentHealth) && Number.isFinite(maxHealth) && maxHealth > 0
        ? currentHealth / maxHealth
        : Number.isFinite(explicitRatio) ? explicitRatio : 0
    ));
    const fillW = Math.round(trackW * bossRatio);

    if (fillW > 0) {
      if (typeof ctx.createLinearGradient === "function") {
        const fillGrad = ctx.createLinearGradient(trackX, 0, trackX + fillW, 0);
        fillGrad.addColorStop(0, "#ff1e40");
        fillGrad.addColorStop(0.65, "#ff5722");
        fillGrad.addColorStop(1, "#ffb14a");
        ctx.fillStyle = fillGrad;
      } else {
        ctx.fillStyle = "#ff2a4b";
      }
      ctx.fillRect(trackX, trackY, fillW, trackH);

      // Segment dividers every 16px
      ctx.fillStyle = "rgba(10, 8, 20, 0.45)";
      for (let sx = trackX + 16; sx < trackX + fillW; sx += 16) {
        ctx.fillRect(sx, trackY, 1, trackH);
      }

      // Scanning sweep line
      if (!model?.reducedMotion) {
        const sweepX = trackX + Math.round(((now * 80) % trackW));
        if (sweepX < trackX + fillW) {
          ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
          ctx.fillRect(sweepX, trackY, 2, trackH);
        }
      }
    }
    ctx.restore();
  }

  drawBonusSpeedRush(ctx, model, now = 0) {
    const bonusTime = model?.bonusTimer ?? model?.bonusRemaining ?? model?.bonus?.timer;
    const isSpeedRush = (model?.speedRush === true) || ((model?.level?.theme === "energy-chamber" || model?.gameMode === "bonus" || model?.state === "bonusPlaying" || model?.state === "bonusTransition") && typeof bonusTime === "number" && bonusTime < 5);
    if (!isSpeedRush) return;

    ctx.save();
    const reduced = model?.reducedMotion;

    // 1. Horizontal Speed Lines across screen
    const lineCount = reduced ? 6 : 18;
    for (let i = 0; i < lineCount; i++) {
      const speed = 1200 + (i % 5) * 150;
      const y = 14 + ((i * 14.7) % (WORLD.height - 28));
      const len = 40 + (i % 6) * 18;
      const cycleW = WORLD.width + len + 80;
      const x = reduced ? (i * 35) % WORLD.width : (cycleW - ((now * speed + i * 95) % cycleW) - 40);

      if (typeof ctx.createLinearGradient === "function") {
        const grad = ctx.createLinearGradient(x, y, x + len, y);
        grad.addColorStop(0, "rgba(255, 30, 60, 0)");
        grad.addColorStop(0.65, "rgba(255, 75, 45, 0.65)");
        grad.addColorStop(1, "rgba(255, 235, 180, 0.85)");
        ctx.strokeStyle = grad;
      } else {
        ctx.strokeStyle = "rgba(255, 75, 45, 0.65)";
      }
      ctx.lineWidth = (i % 3 === 0) ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + len, y);
      ctx.stroke();
    }

    // 2. Subtle Red Chromatic Aberration & Tension Vignette Overlay
    if (!reduced) {
      const tensionPulse = 0.08 + Math.sin(now * 14) * 0.04;
      if (typeof ctx.createLinearGradient === "function") {
        const leftVignette = ctx.createLinearGradient(0, 0, 40, 0);
        leftVignette.addColorStop(0, `rgba(255, 20, 50, ${tensionPulse * 1.5})`);
        leftVignette.addColorStop(1, "rgba(255, 20, 50, 0)");
        ctx.fillStyle = leftVignette;
        ctx.fillRect(0, 0, 40, WORLD.height);

        const rightVignette = ctx.createLinearGradient(WORLD.width, 0, WORLD.width - 40, 0);
        rightVignette.addColorStop(0, `rgba(255, 20, 50, ${tensionPulse * 1.5})`);
        rightVignette.addColorStop(1, "rgba(255, 20, 50, 0)");
        ctx.fillStyle = rightVignette;
        ctx.fillRect(WORLD.width - 40, 0, 40, WORLD.height);
      }

      ctx.fillStyle = `rgba(255, 20, 60, ${tensionPulse * 0.5})`;
      ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    }
    ctx.restore();
  }

  drawMenuAtmosphere(ctx, now) {
    ctx.fillStyle = "rgba(6, 4, 14, 0.35)";
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    ctx.strokeStyle = `rgba(55, 230, 238, ${0.24 + Math.sin(now * 2) * 0.06})`;
    ctx.lineWidth = 1;
    for (let x = 10; x < WORLD.width; x += 28) {
      ctx.beginPath();
      ctx.moveTo(x, WORLD.height - 28);
      ctx.lineTo(x + 18, WORLD.height - 28);
      ctx.stroke();
    }
  }

  drawWorld(ctx, model, now) {
    this.drawPlatforms(ctx, model, now);
    this.drawBonusCannon(ctx, model, now);
    if (model.altar) this.drawAltar(ctx, model, now);
    this.drawPowerUps(ctx, model, now);
    this.drawSouls(ctx, model, now);
    this.drawBonusSpawnWarnings(ctx, model, now);
    this.drawEnemies(ctx, model, now);
    this.drawProjectiles(ctx, model);
    if (model.coopPreview && Array.isArray(model.players)) {
      for (const player of model.players) this.drawPlayer(ctx, model, now, player, player.character);
    } else {
      this.drawPlayer(ctx, model, now);
    }
    this.drawWeaponDrops(ctx, model, now);
    this.drawWeaponEffects(ctx, model);
    this.drawLandingParticles(ctx);
    this.drawPresses(ctx, model, now);
    this.drawEffects(ctx, model, now);
    if (this.debug) this.drawCollisionDebug(ctx, model);
  }

  drawPowerUps(ctx, model, now) {
    const pickup = model.powerUpPickup;
    if (model.gameMode === "campaign" && pickup) {
      const bob = model.reducedMotion ? 0 : Math.sin(now * 3.5) * 1.5;
      const x = Math.round(pickup.x);
      const y = Math.round(pickup.y + bob);
      const frame = Math.floor(now * 7) % 4;
      const image = this.images?.get(`powerUp.${pickup.typeId}.idle.${frame}`)
        || this.images?.get(`powerUp.${pickup.typeId}.idle.0`)
        || this.images?.get("powerUp.double-burst.idle");

      ctx.save();
      if (image) {
        if (!model.reducedMotion && bob < -0.2) {
          ctx.fillStyle = "rgba(5, 4, 10, 0.35)";
          ctx.fillRect(x + 3, pickup.y + pickup.h - 1, 10, 1);
        }
        ctx.drawImage(image, x, y);
      } else {
        ctx.fillStyle = "rgba(5, 4, 10, 0.88)";
        ctx.fillRect(x, y, pickup.w, pickup.h);
        ctx.strokeStyle = "#37e6ee";
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, pickup.w - 1, pickup.h - 1);
        ctx.fillStyle = "#ffb14a";
        ctx.fillRect(x + 3, y + 4, 3, 3);
        ctx.fillRect(x + 10, y + 4, 3, 3);
        ctx.fillStyle = "#fff5dc";
        ctx.font = "bold 7px 'Pixelify Sans'";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText("×2", x + pickup.w / 2, y + 8);
      }
      ctx.restore();
    }

    // Independently rendered gameplay pickups. They remain visible before the
    // legacy Double Burst pickup is available and after it has been collected.
    const powerUpsList = model.powerUps || model.powerups || [];
    for (const item of powerUpsList) {
      this.drawFloatingPowerUp(ctx, item, now, model.reducedMotion);
    }
    if (Array.isArray(model.entities)) {
      for (const ent of model.entities) {
        if (ent.type === "powerup" || ent.kind === "powerup") {
          this.drawFloatingPowerUp(ctx, ent, now, model.reducedMotion);
        }
      }
    }
  }

  drawFloatingPowerUp(ctx, powerup, now = 0, reducedMotion = false) {
    if (!powerup) return;
    const type = powerup.powerUpType || powerup.typeId || powerup.id || "rapid-fire";
    const x = powerup.x ?? 0;
    const y = powerup.y ?? 0;
    const w = powerup.w ?? 20;
    const h = powerup.h ?? 20;

    const bob = reducedMotion ? 0 : Math.sin(now * 3.5) * 3;
    const drawX = Math.round(x);
    const drawY = Math.round(y + bob);
    const centerX = drawX + w / 2;
    const centerY = drawY + h / 2;

    // Ground platform soft glow below the floating power-up
    const groundY = powerup.groundY ?? Math.min(240, y + h + 16);
    ctx.save();
    let primaryGlow = "rgba(255, 122, 40, 0.35)";
    if (type === "health" || type === "heal") {
      primaryGlow = "rgba(46, 230, 144, 0.35)";
    } else if (type === "shield" || type === "defense") {
      primaryGlow = "rgba(55, 230, 238, 0.35)";
    }

    if (typeof ctx.ellipse === "function") {
      ctx.fillStyle = primaryGlow;
      ctx.beginPath();
      ctx.ellipse(centerX, groundY, 14, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (typeof ctx.fillRect === "function") {
      ctx.fillStyle = primaryGlow;
      ctx.fillRect(centerX - 10, groundY - 1, 20, 2);
    }
    ctx.restore();

    ctx.save();
    if (type === "double-burst") {
      const frame = Math.floor(now * 7) % 4;
      const image = this.images?.get(`powerUp.double-burst.idle.${frame}`)
        || this.images?.get("powerUp.double-burst.idle.0")
        || this.images?.get("powerUp.double-burst.idle");
      if (image) {
        ctx.drawImage(image, drawX, drawY, w, h);
      } else {
        ctx.fillStyle = "rgba(18, 10, 6, 0.92)";
        ctx.fillRect(drawX, drawY, w, h);
        ctx.strokeStyle = "#ffb14a";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(drawX + 0.5, drawY + 0.5, w - 1, h - 1);
        ctx.fillStyle = "#fff5dc";
        ctx.font = "bold 8px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("×2", centerX, centerY);
      }
    } else if (type === "rapid-fire" || type === "rapidFire") {
      // 1. Rapid Fire: Amber/Orange glowing lightning bolt with a fiery aura
      const auraPulse = reducedMotion ? 1 : 1 + Math.sin(now * 8) * 0.25;
      if (typeof ctx.createRadialGradient === "function" && typeof ctx.arc === "function" && typeof ctx.fill === "function") {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const auraGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 16 * auraPulse);
        auraGrad.addColorStop(0, "rgba(255, 177, 74, 0.55)");
        auraGrad.addColorStop(0.5, "rgba(255, 122, 40, 0.25)");
        auraGrad.addColorStop(1, "rgba(255, 95, 30, 0)");
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 16 * auraPulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.fillStyle = "rgba(18, 10, 6, 0.92)";
      ctx.fillRect(drawX, drawY, w, h);
      ctx.strokeStyle = "#ff7a28";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(drawX + 0.5, drawY + 0.5, w - 1, h - 1);

      if (typeof ctx.beginPath === "function" && typeof ctx.moveTo === "function") {
        ctx.save();
        ctx.fillStyle = "#ffd280";
        ctx.strokeStyle = "#ff7a28";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(centerX + 1, drawY + 3);
        ctx.lineTo(centerX - 4, centerY + 1);
        ctx.lineTo(centerX, centerY + 1);
        ctx.lineTo(centerX - 2, drawY + h - 3);
        ctx.lineTo(centerX + 4, centerY - 1);
        ctx.lineTo(centerX, centerY - 1);
        ctx.closePath();
        if (typeof ctx.fill === "function") ctx.fill();
        if (typeof ctx.stroke === "function") ctx.stroke();
        ctx.restore();
      }
    } else if (type === "health" || type === "heal") {
      // 2. Health: Emerald green glowing medical cross with a soothing pulse
      const pulse = reducedMotion ? 1 : 1 + Math.sin(now * 3) * 0.18;
      if (typeof ctx.createRadialGradient === "function" && typeof ctx.arc === "function" && typeof ctx.fill === "function") {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const healthGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 15 * pulse);
        healthGrad.addColorStop(0, "rgba(56, 239, 125, 0.50)");
        healthGrad.addColorStop(0.5, "rgba(46, 230, 144, 0.22)");
        healthGrad.addColorStop(1, "rgba(46, 230, 144, 0)");
        ctx.fillStyle = healthGrad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 15 * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.fillStyle = "rgba(6, 22, 14, 0.92)";
      ctx.fillRect(drawX, drawY, w, h);
      ctx.strokeStyle = "#2ee6a8";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(drawX + 0.5, drawY + 0.5, w - 1, h - 1);

      ctx.fillStyle = "#38ef7d";
      ctx.fillRect(centerX - 2, drawY + 4, 4, h - 8);
      ctx.fillRect(drawX + 4, centerY - 2, w - 8, 4);
      ctx.fillStyle = "#e6fff0";
      ctx.fillRect(centerX - 1, centerY - 1, 2, 2);
    } else {
      // 3. Shield: Cyan glowing hexagonal shield with a rotating outer ring
      const angle = reducedMotion ? 0 : now * 2.2;
      if (typeof ctx.createRadialGradient === "function" && typeof ctx.arc === "function" && typeof ctx.fill === "function") {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const shieldGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 15);
        shieldGrad.addColorStop(0, "rgba(55, 230, 238, 0.45)");
        shieldGrad.addColorStop(0.5, "rgba(55, 230, 238, 0.18)");
        shieldGrad.addColorStop(1, "rgba(55, 230, 238, 0)");
        ctx.fillStyle = shieldGrad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (typeof ctx.arc === "function" && typeof ctx.stroke === "function") {
        ctx.save();
        ctx.strokeStyle = "rgba(55, 230, 238, 0.65)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(centerX, centerY, w / 2 + 2, angle, angle + Math.PI * 1.5);
        ctx.stroke();

        const nodeX = centerX + Math.cos(angle) * (w / 2 + 2);
        const nodeY = centerY + Math.sin(angle) * (w / 2 + 2);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(nodeX - 1, nodeY - 1, 2, 2);
        ctx.restore();
      }

      if (typeof ctx.beginPath === "function" && typeof ctx.moveTo === "function") {
        ctx.save();
        ctx.fillStyle = "rgba(8, 20, 28, 0.94)";
        ctx.strokeStyle = "#37e6ee";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const hexRadius = w / 2 - 2;
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3 - Math.PI / 2;
          const hx = centerX + Math.cos(a) * hexRadius;
          const hy = centerY + Math.sin(a) * hexRadius;
          if (i === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        if (typeof ctx.fill === "function") ctx.fill();
        if (typeof ctx.stroke === "function") ctx.stroke();

        ctx.fillStyle = "#8cf5fa";
        ctx.fillRect(centerX - 2, centerY - 2, 4, 4);
        ctx.restore();
      }
    }
    ctx.restore();
  }

  drawBonusCannon(ctx, model, now) {
    const cannon = model.bonusCannon;
    if (!cannon || model.gameMode !== "bonus") return;

    const isTelegraph = cannon.phase === "telegraph";
    const isRecovery = cannon.phase === "recovery";
    const telegraphDuration = BONUS_CANNON_RULES.telegraphSeconds; // 0.8s
    const recoveryDuration = BONUS_CANNON_RULES.recoverySeconds; // 2.4s

    // Normalized progress within active phases
    const charge = isTelegraph ? Math.max(0, Math.min(1, 1 - cannon.phaseTime / telegraphDuration)) : 0;
    const recoveryElapsed = isRecovery ? Math.max(0, recoveryDuration - cannon.phaseTime) : 0;

    // Recoil offset: quick backward snap at firing, returning smoothly in 0.25s
    let recoilOffset = 0;
    if (isRecovery && recoveryElapsed < 0.26) {
      const recoilT = 1 - recoveryElapsed / 0.26;
      recoilOffset = model.reducedMotion ? 0 : Math.sin(recoilT * Math.PI * 0.5) * 3.5;
    }

    // Aim direction: faces locked target during telegraph and recovery; defaults to horizontal left in idle
    const hasAim = Number.isFinite(cannon.aimX) && Number.isFinite(cannon.aimY);
    const aimAngle = hasAim
      ? Math.atan2(cannon.aimY - cannon.muzzleY, cannon.aimX - cannon.muzzleX)
      : Math.PI;

    // Pivot center of the rotary turret socket
    const pivotX = 454;
    const pivotY = 220;

    ctx.save();

    // =========================================================================
    // 1. TELEGRAPH TARGETING LASER & RETICLE (Drawn behind the weapon housing)
    // =========================================================================
    if (isTelegraph && hasAim) {
      const beamPulse = model.reducedMotion ? 0.75 : 0.65 + Math.sin(now * (16 + charge * 24)) * 0.25;
      const isLocked = charge > 0.85;

      // Outer laser aura
      ctx.save();
      ctx.strokeStyle = isLocked ? "rgba(255, 95, 81, 0.40)" : "rgba(255, 122, 40, 0.28)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cannon.muzzleX, cannon.muzzleY);
      ctx.lineTo(cannon.aimX, cannon.aimY);
      ctx.stroke();

      // Core targeting beam
      ctx.strokeStyle = isLocked ? "#ffffff" : `rgba(255, 177, 74, ${beamPulse})`;
      ctx.lineWidth = 1;
      if (!model.reducedMotion && !isLocked) {
        ctx.setLineDash([4, 3]);
        ctx.lineDashOffset = -(now * 50) % 7;
      }
      ctx.beginPath();
      ctx.moveTo(cannon.muzzleX, cannon.muzzleY);
      ctx.lineTo(cannon.aimX, cannon.aimY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Locked Target Reticle (11 × 11 bracket box centered at aimX, aimY)
      const rx = Math.round(cannon.aimX);
      const ry = Math.round(cannon.aimY);
      const reticleColor = isLocked ? "#ffffff" : charge > 0.5 ? "#ffaa28" : "#37e6ee";
      ctx.strokeStyle = reticleColor;
      ctx.fillStyle = reticleColor;

      // 4 corner brackets
      // Top-left
      ctx.strokeRect(rx - 5.5, ry - 5.5, 3, 1);
      ctx.strokeRect(rx - 5.5, ry - 5.5, 1, 3);
      // Top-right
      ctx.strokeRect(rx + 2.5, ry - 5.5, 3, 1);
      ctx.strokeRect(rx + 4.5, ry - 5.5, 1, 3);
      // Bottom-left
      ctx.strokeRect(rx - 5.5, ry + 4.5, 3, 1);
      ctx.strokeRect(rx - 5.5, ry + 2.5, 1, 3);
      // Bottom-right
      ctx.strokeRect(rx + 2.5, ry + 4.5, 3, 1);
      ctx.strokeRect(rx + 4.5, ry + 2.5, 1, 3);
      // Center pip
      ctx.fillRect(rx - 1, ry - 1, 2, 2);

      ctx.restore();
    }

    // =========================================================================
    // 2. WALL MOUNTING GANTRY & STRUCTURAL BRACKETS (Anchored to East Wall x=464)
    // =========================================================================
    // Heavy backplate flange against the wall (x=457..464, y=205..235)
    ctx.fillStyle = "#0c0f16";
    ctx.fillRect(457, 205, 7, 30); // dark perimeter outline
    ctx.fillStyle = "#181d28";
    ctx.fillRect(458, 206, 6, 28); // main steel plate
    ctx.fillStyle = "#46536c";
    ctx.fillRect(458, 206, 6, 1);  // top specular bevel
    ctx.fillStyle = "#10131c";
    ctx.fillRect(458, 233, 6, 1);  // bottom shadow

    // 4 Heavy hex anchor bolts
    ctx.fillStyle = "#8ea0bc";
    ctx.fillRect(459, 208, 2, 2);
    ctx.fillRect(462, 208, 2, 2);
    ctx.fillRect(459, 230, 2, 2);
    ctx.fillRect(462, 230, 2, 2);

    // Diagonal structural support gussets (triangular braces toward pivot)
    ctx.fillStyle = "#222a3a";
    // Upper strut
    ctx.beginPath();
    ctx.moveTo(458, 212);
    ctx.lineTo(453, 217);
    ctx.lineTo(458, 217);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#5a6b8a";
    ctx.fillRect(458, 212, 1, 5); // edge highlight

    // Lower strut
    ctx.fillStyle = "#222a3a";
    ctx.beginPath();
    ctx.moveTo(458, 227);
    ctx.lineTo(453, 223);
    ctx.lineTo(458, 223);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#10141e";
    ctx.fillRect(458, 226, 1, 1);

    // Heavy power/coolant feed conduit entering from wall into lower turret
    ctx.fillStyle = "#ff7a28";
    ctx.fillRect(461, 225, 2, 2); // safety orange coupling ring
    ctx.fillStyle = "#283142";
    ctx.fillRect(458, 226, 4, 2);

    // =========================================================================
    // 3. GIMBAL BEARING SOCKET (Fixed spherical housing at pivot point)
    // =========================================================================
    // Outer socket collar
    ctx.fillStyle = "#10141e";
    ctx.beginPath();
    ctx.arc(pivotX, pivotY, 6.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#263042";
    ctx.beginPath();
    ctx.arc(pivotX, pivotY, 5.5, 0, Math.PI * 2);
    ctx.fill();

    // Specular highlight on socket rim
    ctx.strokeStyle = "#647798";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(pivotX, pivotY, 5, Math.PI * 0.75, Math.PI * 1.5);
    ctx.stroke();

    // =========================================================================
    // 4. ARTICULATED TURRET HOUSING & STEPPED CANNON BARREL
    // =========================================================================
    ctx.save();
    ctx.translate(pivotX, pivotY);
    ctx.rotate(aimAngle);

    // Local coordinates:
    // +X is forward (aim vector toward arena)
    // -X is backward (toward wall mount)
    // +Y is downward, -Y is upward

    const muzzleAtRestX = 6; // distance from pivot(454) to muzzle(448) is 6px
    const tipX = muzzleAtRestX - recoilOffset;

    // --- A. Armored Breech Housing ---
    // Housing shadow border
    ctx.fillStyle = "#0c0f16";
    ctx.fillRect(-6, -4.5, 8, 9);

    // Main graphite armor block
    ctx.fillStyle = "#1c2230";
    ctx.fillRect(-5.5, -4, 7, 8);

    // Top chamfer highlight
    ctx.fillStyle = "#5c6e8e";
    ctx.fillRect(-5.5, -4, 7, 1);

    // Bottom dark shadow
    ctx.fillStyle = "#10131c";
    ctx.fillRect(-5.5, 3, 7, 1);

    // Dorsal heat dissipation micro-vents (3 vertical slots)
    ctx.fillStyle = "#0e111a";
    ctx.fillRect(-4, -4, 1, 2);
    ctx.fillRect(-2, -4, 1, 2);
    ctx.fillRect(0, -4, 1, 2);

    // Overlapping front cowl armor plate
    ctx.fillStyle = "#2a3446";
    ctx.fillRect(-1, -4.5, 3, 9);
    ctx.fillStyle = "#7084a6";
    ctx.fillRect(-1, -4.5, 3, 1); // cowl highlight

    // Orange industrial identification stripe
    ctx.fillStyle = "#ff7a28";
    ctx.fillRect(-3, 1, 3, 1.5);

    // --- B. Cyan Energy Chamber / Plasma Core ---
    // Chamber cavity slot (-4 to 0, height 3: y=-1.5 to +1.5)
    ctx.fillStyle = "#080c14";
    ctx.fillRect(-4, -1.5, 4, 3);

    // Energy glow state logic
    let coreAlpha = 0.5;
    let coreColor = "#37e6ee";
    let filamentColor = "#e8fcfe";

    if (isTelegraph) {
      // Charge buildup: accelerates and intensifies to incandescent white-cyan
      const chargeFlicker = model.reducedMotion ? 1 : (Math.sin(now * (18 + charge * 30)) * 0.15 + 0.85);
      coreAlpha = (0.55 + charge * 0.45) * chargeFlicker;
      coreColor = charge > 0.8 ? "#ffffff" : charge > 0.4 ? "#98f7fb" : "#37e6ee";
      filamentColor = "#ffffff";
    } else if (isRecovery) {
      // Thermal dissipation: amber cooling back to cyan
      const heatT = Math.max(0, 1 - recoveryElapsed / 1.5);
      coreAlpha = 0.4 + heatT * 0.5;
      coreColor = heatT > 0.3 ? "#ff9b38" : "#37e6ee";
      filamentColor = heatT > 0.6 ? "#ffe8b0" : "#d8fcfe";
    } else {
      // Idle breathing pulse
      coreAlpha = model.reducedMotion ? 0.5 : 0.38 + Math.sin(now * 3.5) * 0.18;
      coreColor = "#37e6ee";
      filamentColor = "#c8f8fa";
    }

    ctx.save();
    ctx.fillStyle = coreColor;
    ctx.globalAlpha = Math.min(1, coreAlpha);
    ctx.fillRect(-3.5, -1, 3, 2);
    ctx.fillStyle = filamentColor;
    ctx.fillRect(-3, -0.5, 2, 1); // bright center filament
    ctx.restore();

    // Cooling steam puffs during early recovery
    if (isRecovery && recoveryElapsed > 0.08 && recoveryElapsed < 0.45 && !model.reducedMotion) {
      const puffT = (recoveryElapsed - 0.08) / 0.37;
      const puffAlpha = (1 - puffT) * 0.6;
      ctx.save();
      ctx.fillStyle = `rgba(215, 235, 255, ${puffAlpha})`;
      ctx.fillRect(-2, -5 - puffT * 3, 2, 2);
      ctx.fillRect(0, -6 - puffT * 4, 1.5, 1.5);
      ctx.restore();
    }

    // --- C. Heavy Stepped Gun Barrel & Compensator Muzzle ---
    // Barrel body (slides back during recoil)
    const barrelStartX = 1.5;
    const barrelLen = Math.max(1, tipX - barrelStartX);

    // Barrel dark outline
    ctx.fillStyle = "#0c0f16";
    ctx.fillRect(barrelStartX, -2.5, barrelLen, 5);

    // Machined gunmetal barrel core
    ctx.fillStyle = "#222a3a";
    ctx.fillRect(barrelStartX, -2, barrelLen, 4);

    // Top specular cylindrical reflection
    ctx.fillStyle = "#6e82a4";
    ctx.fillRect(barrelStartX, -2, barrelLen, 1);

    // Bottom shadow
    ctx.fillStyle = "#121620";
    ctx.fillRect(barrelStartX, 1, barrelLen, 1);

    // Heavy Muzzle Brake / Crown (at tipX)
    ctx.fillStyle = "#0a0d14";
    ctx.fillRect(tipX - 2, -3, 2.5, 6); // brake block
    ctx.fillStyle = "#3e4c66";
    ctx.fillRect(tipX - 1.5, -2.5, 1.5, 5);
    ctx.fillStyle = "#788cae";
    ctx.fillRect(tipX - 1.5, -2.5, 1.5, 1); // top brake highlight

    // Gas expansion compensator ports (top and bottom notches)
    ctx.fillStyle = "#080a10";
    ctx.fillRect(tipX - 1, -2.5, 1, 1);
    ctx.fillRect(tipX - 1, 1.5, 1, 1);

    // Bore cavity face at tip
    ctx.fillStyle = "#05060a";
    ctx.fillRect(tipX, -1.5, 1, 3);
    if (isTelegraph) {
      // Glow inside bore when charged
      ctx.fillStyle = charge > 0.7 ? "#ffffff" : "#37e6ee";
      ctx.fillRect(tipX, -0.5, 1, 1);
    }

    // --- D. Central Rotary Hub Face Pin ---
    ctx.fillStyle = "#141822";
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#3b4860";
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ff7a28";
    ctx.fillRect(-1, -1, 2, 2); // orange central bearing dot

    ctx.restore(); // Restore rotated turret frame

    // =========================================================================
    // 5. MUZZLE FLASH ON FIRING (Rendered at exact muzzleX, muzzleY)
    // =========================================================================
    if (isRecovery && recoveryElapsed <= 0.09) {
      const flashT = recoveryElapsed / 0.09;
      const flashAlpha = 1 - flashT;
      const mx = cannon.muzzleX;
      const my = cannon.muzzleY;

      ctx.save();
      // Outer fiery corona
      ctx.fillStyle = `rgba(255, 155, 56, ${flashAlpha * 0.85})`;
      ctx.fillRect(mx - 4, my - 4, 8, 8);

      // 4-point star flash core
      ctx.fillStyle = `rgba(255, 245, 220, ${flashAlpha})`;
      ctx.fillRect(mx - 5, my - 1, 10, 2);
      ctx.fillRect(mx - 1, my - 5, 2, 10);

      // Incandescent white center
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(mx - 2, my - 2, 4, 4);

      // Lateral gas compensation jets
      const perpX = -Math.sin(aimAngle);
      const perpY = Math.cos(aimAngle);
      ctx.fillStyle = `rgba(255, 200, 100, ${flashAlpha * 0.9})`;
      ctx.fillRect(mx + perpX * 3 - 1, my + perpY * 3 - 1, 2, 2);
      ctx.fillRect(mx - perpX * 3 - 1, my - perpY * 3 - 1, 2, 2);

      ctx.restore();
    }

    ctx.restore();
  }

  drawPlatforms(ctx, model, now = 0) {
    const isBonus = model.level?.theme === "energy-chamber";
    const factory = model.level?.theme === "scrap-factory";
    const cyberLab = model.level?.theme === "cyber-lab" || model.levelId === "cyber-lab";
    const tiles = (cyberLab || (this.cyberlabPreview && !isBonus && !factory))
      ? (this.images.get("world.tiles.cyberlab") || this.images.get("world.tiles"))
      : isBonus
      ? (this.images.get("world.tiles.bonus") || this.images.get("world.tiles"))
      : factory
      ? (this.images.get("world.tiles.factory") || this.images.get("world.tiles"))
      : this.images.get("world.tiles");

    for (const platform of model.platforms) {
      if (isBonus) {
        ctx.fillStyle = platform.oneWay ? "rgba(18, 16, 34, 0.96)" : "rgba(12, 10, 24, 0.98)";
      } else if (factory) {
        ctx.fillStyle = platform.oneWay ? "rgba(22, 26, 36, 0.98)" : "rgba(16, 18, 26, 0.98)";
      } else {
        ctx.fillStyle = platform.oneWay ? "rgba(22, 18, 38, 0.96)" : "rgba(14, 11, 24, 0.98)";
      }
      ctx.fillRect(platform.x, platform.y, platform.w, platform.h);

      if (tiles) {
        ctx.save();
        ctx.globalAlpha = isBonus ? 0.94 : factory ? 0.92 : 0.88;
        ctx.beginPath();
        ctx.rect(platform.x, platform.y, platform.w, platform.h);
        ctx.clip();
        for (let x = platform.x; x < platform.x + platform.w; x += 16) {
          for (let y = platform.y; y < platform.y + platform.h; y += 16) {
            ctx.drawImage(tiles, platform.oneWay ? 0 : 16, 0, 16, 16, x, y, 16, 16);
          }
        }
        ctx.restore();
      }

      if (isBonus) {
        if (platform.oneWay) {
          // Elevated superconductor rails (y=200, 160, 120, 80)
          // Crisp high-voltage cyan top edge with specular points
          ctx.fillStyle = "#37e6ee";
          ctx.fillRect(platform.x, platform.y, platform.w, 1);
          ctx.fillStyle = "rgba(235, 253, 255, 0.82)";
          for (let x = platform.x + 2; x < platform.x + platform.w - 2; x += 16) {
            ctx.fillRect(x, platform.y, 4, 1);
          }
          // Subtle violet/cyan capacitor glow on underside
          ctx.fillStyle = "rgba(174, 98, 255, 0.18)";
          ctx.fillRect(platform.x, platform.y + 1, platform.w, 1);
          ctx.fillStyle = "rgba(55, 230, 238, 0.08)";
          ctx.fillRect(platform.x, platform.y + platform.h - 1, platform.w, 1);
        } else {
          // Solid platforms: floor (y=240), left wall (x=0..16), right wall (x=464..480)
          // Reinforced containment deck with violet energy threshold
          ctx.fillStyle = "#ae62ff";
          ctx.fillRect(platform.x, platform.y, platform.w, 2);
          ctx.fillStyle = "rgba(235, 210, 255, 0.75)";
          ctx.fillRect(platform.x, platform.y, platform.w, 1);
          ctx.fillStyle = "rgba(174, 98, 255, 0.16)";
          ctx.fillRect(platform.x, platform.y + 2, platform.w, 2);

          // Side wall vertical conduit grooves and containment status nodes
          if (platform.h > 48) {
            ctx.save();
            ctx.fillStyle = "#37e6ee";
            const colX = platform.x === 0 ? 8 : platform.x + 8;
            for (let ry = platform.y + 20; ry < platform.y + platform.h - 16; ry += 24) {
              ctx.fillRect(colX - 1, ry, 2, 8);
              ctx.fillStyle = "rgba(174, 98, 255, 0.85)";
              ctx.fillRect(colX, ry + 10, 1, 2);
              ctx.fillStyle = "#37e6ee";
            }
            ctx.restore();
          }
        }
      } else if (factory) {
        if (platform.oneWay) {
          // Industrial catwalks (y=176, 112, 64)
          // Crisp industrial cyan maintenance edge with specular points
          ctx.fillStyle = "#2ec8d4";
          ctx.fillRect(platform.x, platform.y, platform.w, 1);
          ctx.fillStyle = "rgba(212, 251, 255, 0.75)";
          for (let x = platform.x + 2; x < platform.x + platform.w - 2; x += 16) {
            ctx.fillRect(x, platform.y, 4, 1);
          }
          // Subtle cyan maintenance ambient line
          ctx.fillStyle = "rgba(46, 200, 212, 0.16)";
          ctx.fillRect(platform.x, platform.y + 1, platform.w, 2);

          // Under-catwalk architectural brackets at platform ends
          if (platform.w >= 48) {
            ctx.save();
            ctx.fillStyle = "#161922";
            ctx.strokeStyle = "#384358";
            ctx.lineWidth = 1;
            // Left bracket
            ctx.beginPath();
            ctx.moveTo(platform.x + 2, platform.y + platform.h);
            ctx.lineTo(platform.x + 8, platform.y + platform.h + 5);
            ctx.lineTo(platform.x + 8, platform.y + platform.h);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            // Right bracket
            ctx.beginPath();
            ctx.moveTo(platform.x + platform.w - 2, platform.y + platform.h);
            ctx.lineTo(platform.x + platform.w - 8, platform.y + platform.h + 5);
            ctx.lineTo(platform.x + platform.w - 8, platform.y + platform.h);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          }
        } else {
          // Solid platforms: floor (y=240), left wall (x=0..16), right wall (x=464..480)
          // Industrial amber safety line
          ctx.fillStyle = "#ff8522";
          ctx.fillRect(platform.x, platform.y, platform.w, 2);
          ctx.fillStyle = "rgba(255, 224, 160, 0.75)";
          ctx.fillRect(platform.x, platform.y, platform.w, 1);
          ctx.fillStyle = "rgba(255, 133, 34, 0.15)";
          ctx.fillRect(platform.x, platform.y + 2, platform.w, 2);

          // Vertical wall column rivets
          if (platform.h > 48) {
            ctx.save();
            ctx.fillStyle = "#70809c";
            const colX = platform.x === 0 ? 8 : platform.x + 8;
            for (let ry = platform.y + 24; ry < platform.y + platform.h - 16; ry += 32) {
              ctx.fillRect(colX - 1, ry - 1, 2, 2);
            }
            ctx.restore();
          }
        }
      } else {
        // Glowing neon edge strip (Distrito Neon)
        if (this.renderScale > 1 && platform.oneWay) {
          ctx.save();
          const shadowGrad = ctx.createLinearGradient(0, platform.y + platform.h, 0, platform.y + platform.h + 6);
          shadowGrad.addColorStop(0, "rgba(0, 0, 0, 0.38)");
          shadowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
          ctx.fillStyle = shadowGrad;
          ctx.fillRect(platform.x - 2, platform.y + platform.h, platform.w + 4, 6);
          if (platform.w >= 48) {
            ctx.fillStyle = "#161526";
            ctx.strokeStyle = "#383257";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(platform.x + 3, platform.y + platform.h);
            ctx.lineTo(platform.x + 8, platform.y + platform.h + 5);
            ctx.lineTo(platform.x + 8, platform.y + platform.h);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(platform.x + platform.w - 3, platform.y + platform.h);
            ctx.lineTo(platform.x + platform.w - 8, platform.y + platform.h + 5);
            ctx.lineTo(platform.x + platform.w - 8, platform.y + platform.h);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
          ctx.restore();
        }
        ctx.fillStyle = platform.oneWay ? "#37e6ee" : "#ff7a28";
        ctx.fillRect(platform.x, platform.y, platform.w, platform.oneWay ? 1 : 2);
        ctx.fillStyle = platform.oneWay ? "rgba(235, 253, 255, 0.85)" : "rgba(255, 238, 200, 0.85)";
        ctx.fillRect(platform.x, platform.y, platform.w, 1);
        ctx.fillStyle = "rgba(174, 98, 255, 0.16)";
        ctx.fillRect(platform.x, platform.y + 3, platform.w, 2);
      }
    }

    // Floor deck reflection and detailing
    ctx.save();
    if (isBonus) {
      // High-energy chamber floor reflection
      const groundGrad = ctx.createLinearGradient(0, 240, 0, 270);
      groundGrad.addColorStop(0, "rgba(55, 230, 238, 0.12)");
      groundGrad.addColorStop(0.35, "rgba(174, 98, 255, 0.08)");
      groundGrad.addColorStop(1, "rgba(8, 6, 18, 0)");
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, 240, WORLD.width, 30);

      // Energy pit styling at x=216..264
      // Containment edge hazard markers framing the pit
      ctx.fillStyle = "rgba(255, 177, 74, 0.45)";
      ctx.fillRect(214, 240, 2, 12);
      ctx.fillRect(264, 240, 2, 12);
      // Soft abyss containment glow at the pit opening
      const pitGrad = ctx.createLinearGradient(240, 240, 240, 270);
      pitGrad.addColorStop(0, "rgba(7, 5, 18, 0.90)");
      pitGrad.addColorStop(0.6, "rgba(20, 10, 40, 0.70)");
      pitGrad.addColorStop(1, "rgba(55, 230, 238, 0.15)");
      ctx.fillStyle = pitGrad;
      ctx.fillRect(216, 240, 48, 30);
    } else if (factory) {
      // Metallic floor reflection pass in Factory (subtle warm furnace amber and cool cyan reflection)
      const groundGrad = ctx.createLinearGradient(0, 240, 0, 270);
      groundGrad.addColorStop(0, "rgba(255, 110, 30, 0.12)");
      groundGrad.addColorStop(0.4, "rgba(46, 200, 212, 0.05)");
      groundGrad.addColorStop(1, "rgba(10, 12, 18, 0)");
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, 240, WORLD.width, 30);

      // Recessed floor hazard stripes (y=256..262), flanking the altar and press
      ctx.fillStyle = "rgba(214, 136, 34, 0.35)";
      for (const [start, end] of [[90, 200], [280, 450]]) {
        for (let x = start; x < end; x += 18) {
          ctx.save();
          ctx.translate(x, 256);
          ctx.rotate(-0.7);
          ctx.fillRect(0, 0, 4, 12);
          ctx.restore();
        }
      }
      this.drawToxicSludge(ctx, model, now);
    } else {
      // Subtle wet deck reflection pass on ground deck (Distrito Neon)
      const groundGrad = ctx.createLinearGradient(0, 240, 0, 270);
      groundGrad.addColorStop(0, "rgba(255, 122, 40, 0.14)");
      groundGrad.addColorStop(0.35, "rgba(55, 230, 238, 0.05)");
      groundGrad.addColorStop(1, "rgba(10, 8, 20, 0)");
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, 240, WORLD.width, 30);
      this.drawNeonPuddles(ctx, model);
    }
    ctx.restore();
  }

  drawNeonPuddles(ctx, model) {
    ctx.save();
    for (const p of NEON_PUDDLES) {
      ctx.fillStyle = "rgba(4, 3, 10, 0.72)";
      if (typeof ctx.ellipse === "function") {
        ctx.beginPath();
        ctx.ellipse(p.x + p.w / 2, p.y + p.h / 2, p.w / 2, p.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(p.x, p.y, p.w, p.h);
      }

      ctx.fillStyle = p.color;
      if (typeof ctx.ellipse === "function") {
        ctx.beginPath();
        ctx.ellipse(p.x + p.w / 2, p.y + p.h / 2, p.w / 2 - 2, p.h / 2 - 1, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(p.x + 2, p.y + 1, p.w - 4, p.h - 2);
      }

      ctx.fillStyle = "rgba(240, 250, 255, 0.45)";
      ctx.fillRect(p.x + 6, p.y, p.w - 12, 1);
    }
    ctx.restore();
  }

  drawAltar(ctx, model, now) {
    const altar = model.altar;
    const ratio = altar.deposited / model.objective.soulsGoal;
    const frame = Math.min(6, Math.floor(ratio * 7));
    const levelKey = model.levelId === "scrap-factory" ? "scrap-factory" : "distrito-neon";
    const image = (this.renderScale > 1 && this.images.get(`altar.${levelKey}.illustrated.${frame}`))
      || this.images.get(`altar.${levelKey}.${frame}`)
      || this.images.get(`altar.${frame}`)
      || this.images.get("altar.0");
    const pulse = 3 + Math.sin(now * 4) * 1.5;

    ctx.save();
    const altarCritical = altar.life === 1;
    const altarDamaged = altar.life === 2;
    ctx.shadowColor = altar.invulnerable > 0 ? "#ff5f51"
      : altarCritical ? "#ff5f51"
      : altarDamaged ? "#ffb14a"
      : ratio > 0 ? "#37e6ee" : "#ae62ff";
    ctx.shadowBlur = altarCritical ? 10 : 6 + ratio * 8;
    if (image) ctx.drawImage(image, altar.x, altar.y, altar.w, altar.h);
    else {
      ctx.fillStyle = "#5f3b75";
      ctx.fillRect(altar.x, altar.y, altar.w, altar.h);
    }

    // In-world Altar Integrity Status Indicators on the Casing (Distinguishable by Shape/Symbol & Color)
    const maxLife = model.objective.altarMaxLife || 4;
    const currentLife = Math.max(0, altar.life);
    const ledBaseY = altar.y + 43;
    const ledSpacing = 4;
    const startX = altar.x + 9;

    for (let i = 0; i < maxLife; i++) {
      const isLit = i < currentLife;
      const lx = startX + i * ledSpacing;
      if (isLit) {
        if (altarCritical) {
          const flash = model.reducedMotion ? true : (Math.sin(now * 16) > 0);
          ctx.fillStyle = flash ? "#ff5f51" : "#4a1216";
        } else if (altarDamaged) {
          ctx.fillStyle = "#ffb14a";
        } else {
          ctx.fillStyle = "#37e6ee";
        }
      } else {
        ctx.fillStyle = "#12151e";
      }
      ctx.fillRect(lx, ledBaseY, 3, 2);
    }

    // Structural warning symbol on altar when damaged or critical
    if (altarCritical) {
      const flash = model.reducedMotion ? 0.8 : (0.5 + Math.sin(now * 14) * 0.4);
      ctx.fillStyle = `rgba(255, 95, 81, ${flash})`;
      ctx.font = "bold 8px 'Pixelify Sans'";
      ctx.textAlign = "center";
      ctx.fillText("!", altar.x + altar.w / 2, altar.y + 4);
      ctx.textAlign = "left";
    } else if (altarDamaged) {
      ctx.fillStyle = "#ffb14a";
      ctx.fillRect(altar.x + altar.w / 2 - 1, altar.y + 4, 2, 2);
    }

    if (altar.invulnerable > 0) {
      ctx.save();
      ctx.strokeStyle = `rgba(255, 95, 81, ${0.56 + Math.sin(now * 38) * 0.36})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(altar.x - 2, altar.y - 2, altar.w + 4, altar.h + 4);
      ctx.restore();
    }
    ctx.restore();

    // In-world Deposit Energy Pulse & Column Surge
    const hasDeposit = model.effects.some((effect) => effect.kind === "deposit");
    if (hasDeposit) {
      ctx.save();
      const surgeAlpha = model.reducedMotion ? 0.6 : 0.4 + Math.sin(now * 22) * 0.3;
      ctx.fillStyle = `rgba(55, 230, 238, ${surgeAlpha})`;
      ctx.fillRect(altar.x + 13, altar.y + 12, 6, 26);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(altar.x + 14, altar.y + 16, 4, 18);
      ctx.strokeStyle = `rgba(55, 230, 238, ${0.45 + Math.sin(now * 18) * 0.25})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(altar.x - 6, altar.y - 6, altar.w + 12, altar.h + 12);
      ctx.restore();
    }

    if (model.state === "victoryPresentation") {
      const duration = model.reducedMotion
        ? BALANCE.presentation.reducedMotionVictorySeconds
        : BALANCE.presentation.victorySeconds;
      const progress = 1 - model.victoryPresentationRemaining / Math.max(duration, 0.001);
      const radius = model.reducedMotion ? 7 : 5 + progress * 15;
      ctx.save();
      ctx.globalAlpha = model.reducedMotion ? 0.68 : Math.max(0.18, 0.72 - progress * 0.42);
      ctx.strokeStyle = "#37e6ee";
      ctx.lineWidth = 2;
      ctx.strokeRect(altar.x - radius, altar.y - radius, altar.w + radius * 2, altar.h + radius * 2);
      ctx.restore();
    }

    if (model.canDeposit()) {
      ctx.strokeStyle = "#ffb64a";
      ctx.lineWidth = 1;
      ctx.strokeRect(altar.x - pulse, altar.y - pulse, altar.w + pulse * 2, altar.h + pulse * 2);
      ctx.fillStyle = "#fff5dc";
      ctx.font = "8px 'Pixelify Sans'";
      ctx.textAlign = "center";
      ctx.fillText("E: DEPOSITAR", altar.x + altar.w / 2, altar.y - 7);
    }

    if (model.altar?.phase) {
      this.drawAltarPhases(ctx, model.altar.phase, altar, now);
    }
  }

  drawAltarPhases(ctx, phase, altar = { x: 208, y: 192, w: 32, h: 48 }, now = 0) {
    const ax = altar?.x ?? 208;
    const ay = altar?.y ?? 192;
    const aw = altar?.w ?? 32;
    const ah = altar?.h ?? 48;
    const centerX = ax + aw / 2;
    const centerY = ay + ah / 2;
    const baseY = ay + ah;

    ctx.save();
    switch (Number(phase)) {
      case 1: {
        // Phase 1: Violet base, steady glow
        ctx.fillStyle = "#ae62ff";
        ctx.fillRect(ax - 2, baseY - 2, aw + 4, 3);
        if (typeof ctx.createRadialGradient === "function" && typeof ctx.arc === "function" && typeof ctx.fill === "function") {
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          const glow = ctx.createRadialGradient(centerX, baseY - 2, 0, centerX, baseY - 2, 22);
          glow.addColorStop(0, "rgba(174, 98, 255, 0.45)");
          glow.addColorStop(0.5, "rgba(174, 98, 255, 0.18)");
          glow.addColorStop(1, "rgba(174, 98, 255, 0)");
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(centerX, baseY - 2, 22, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        ctx.strokeStyle = "rgba(174, 98, 255, 0.4)";
        ctx.lineWidth = 1;
        ctx.strokeRect(ax - 1, ay - 1, aw + 2, ah + 2);
        break;
      }
      case 2: {
        // Phase 2: Cyan base, pulsing energy ring
        ctx.fillStyle = "#37e6ee";
        ctx.fillRect(ax - 3, baseY - 2, aw + 6, 3);
        const pulse = Math.sin(now * 3.5) * 3;
        const ringRx = aw / 2 + 5 + pulse;
        const ringRy = 6 + pulse * 0.4;
        ctx.save();
        ctx.strokeStyle = "rgba(55, 230, 238, 0.85)";
        ctx.lineWidth = 1.5;
        if (typeof ctx.ellipse === "function") {
          ctx.beginPath();
          ctx.ellipse(centerX, centerY, ringRx, ringRy, 0, 0, Math.PI * 2);
          ctx.stroke();
        } else if (typeof ctx.strokeRect === "function") {
          ctx.strokeRect(centerX - ringRx, centerY - ringRy, ringRx * 2, ringRy * 2);
        }
        if (typeof ctx.createRadialGradient === "function" && typeof ctx.arc === "function" && typeof ctx.fill === "function") {
          ctx.globalCompositeOperation = "lighter";
          const glow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 24);
          glow.addColorStop(0, "rgba(55, 230, 238, 0.45)");
          glow.addColorStop(0.6, "rgba(55, 230, 238, 0.15)");
          glow.addColorStop(1, "rgba(55, 230, 238, 0)");
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(centerX, centerY, 24, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        break;
      }
      case 3: {
        // Phase 3: Orange base, erratic electric arcs (lightning effects) around the core
        ctx.fillStyle = "#ff7a28";
        ctx.fillRect(ax - 4, baseY - 2, aw + 8, 3);
        ctx.save();
        ctx.strokeStyle = "#ffd280";
        ctx.lineWidth = 1.2;
        for (let i = 0; i < 3; i++) {
          const arcAngle = (now * 5 + i * 2.1) % (Math.PI * 2);
          const r1 = 12 + ((now * 15 + i * 7) % 6);
          const r2 = 20 + ((now * 17 + i * 5) % 8);
          const startX = centerX + Math.cos(arcAngle) * r1;
          const startY = centerY + Math.sin(arcAngle) * r1;
          const midX = centerX + Math.cos(arcAngle + 0.3) * (r1 + r2) / 2 + (Math.sin(now * 30 + i) * 3);
          const midY = centerY + Math.sin(arcAngle + 0.3) * (r1 + r2) / 2 + (Math.cos(now * 30 + i) * 3);
          const endX = centerX + Math.cos(arcAngle + 0.6) * r2;
          const endY = centerY + Math.sin(arcAngle + 0.6) * r2;
          if (typeof ctx.beginPath === "function" && typeof ctx.moveTo === "function") {
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(midX, midY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
          }
        }
        if (typeof ctx.createRadialGradient === "function" && typeof ctx.arc === "function" && typeof ctx.fill === "function") {
          ctx.globalCompositeOperation = "lighter";
          const glow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 26);
          glow.addColorStop(0, "rgba(255, 177, 74, 0.48)");
          glow.addColorStop(0.5, "rgba(255, 122, 40, 0.22)");
          glow.addColorStop(1, "rgba(255, 122, 40, 0)");
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(centerX, centerY, 26, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        break;
      }
      case 4: {
        // Phase 4: Crimson base, floating particles and intense pulsating aura
        ctx.fillStyle = "#ff3b69";
        ctx.fillRect(ax - 5, baseY - 3, aw + 10, 4);
        const auraPulse = Math.sin(now * 6) * 5;
        ctx.save();
        if (typeof ctx.createRadialGradient === "function" && typeof ctx.arc === "function" && typeof ctx.fill === "function") {
          ctx.globalCompositeOperation = "lighter";
          const auraGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 28 + auraPulse);
          auraGrad.addColorStop(0, "rgba(255, 59, 105, 0.65)");
          auraGrad.addColorStop(0.45, "rgba(220, 20, 60, 0.30)");
          auraGrad.addColorStop(1, "rgba(180, 10, 40, 0)");
          ctx.fillStyle = auraGrad;
          ctx.beginPath();
          ctx.arc(centerX, centerY, 28 + auraPulse, 0, Math.PI * 2);
          ctx.fill();
        }

        for (let i = 0; i < 8; i++) {
          const pSpeed = 24 + (i % 3) * 8;
          const py = baseY - ((now * pSpeed + i * 14.3) % (ah + 24));
          const px = ax + 3 + (i * 4.7 + Math.sin(now * 2.5 + i) * 4) % (aw - 6);
          const pSize = 1.5 + (i % 2) * 0.8;
          ctx.fillStyle = i % 2 === 0 ? "#ffd2d9" : "#ff3b69";
          ctx.fillRect(Math.round(px), Math.round(py), Math.round(pSize), Math.round(pSize));
        }
        ctx.restore();
        break;
      }
    }
    ctx.restore();
  }

  drawSouls(ctx, model, now) {
    const frame = Math.floor(now * 10) % 4;
    const cyberImage = this.images.get(`soul.cyber.${frame}`) || this.images.get("soul.cyber.0");
    const legacyCampaignImage = this.images.get(`soul.${frame}`) || this.images.get("soul.0");
    const campaignImage = cyberImage || legacyCampaignImage;
    const bonusImage = this.images.get(`bonusSoul.${frame}`) || this.images.get("bonusSoul.0") || campaignImage;
    ctx.save();
    ctx.shadowBlur = 5;
    for (const soul of model.souls) {
      const bob = Math.sin((now - soul.bornAt) * 4 + soul.x) * 2;
      const bonus = soul.source === "bonus";
      ctx.shadowColor = bonus ? "#ae62ff" : "#37e6ee";
      if (bonus) {
        ctx.strokeStyle = "rgba(255,177,74,.72)";
        ctx.strokeRect(Math.round(soul.x - 2), Math.round(soul.y + bob - 2), 19, 20);
      }
      const image = bonus ? bonusImage : (soul.source === "campaign" && !cyberImage ? legacyCampaignImage : campaignImage);
      if (image) ctx.drawImage(image, Math.round(soul.x), Math.round(soul.y + bob), 15, 16);
      else {
        ctx.fillStyle = bonus ? "#ffb14a" : "#37e6ee";
        ctx.fillRect(soul.x + 4, soul.y + bob + 4, 7, 7);
      }
    }
    ctx.restore();
  }

  drawEnemies(ctx, model, now) {
    const isPaused = model.state === "paused";
    const simTime = ["playing", "bonusPlaying"].includes(model.state) || isPaused ? (model.elapsed ?? now) : now;

    for (const enemy of model.enemies) {
      if (enemy.isElite) {
        this.drawEliteEnemyAura(ctx, enemy, now);
      }
      if (enemy.kind === "chaser") {
        const state = chaserAnimationState(enemy);
        const anim = CHASER_ANIMATIONS[state];
        const frameIndex = animationFrame(enemy, anim);
        const { image, assetKey } = this.resolveAnimationImage("chaser", state, frameIndex, "chaser.idle");
        if (this.isAnimationSamplingEnabled()) this.recordAnimationSample({ runId: model.runId, entityId: enemy.id, archetype: "chaser", state, frame: frameIndex, assetKey, facing: enemy.facing, animTime: enemy.animTime ?? 0, simTime });
        const illustrated = assetKey.startsWith("chaser.illustrated.");
        this.drawMirrored(
          ctx,
          image,
          illustrated ? enemy.x + enemy.w / 2 - 16 : enemy.x,
          enemy.y,
          illustrated ? 32 : 16,
          illustrated ? 64 : 32,
          enemy.facing < 0
        );
        this.drawChaserDamageFeedback(ctx, enemy, illustrated);
        const isAttacking = (enemy.attackFlash ?? 0) > 0 || state === "attack";
        const isLunging = (!enemy.onGround && enemy.vy < 0) || state === "jump";
        if (isAttacking || isLunging) {
          this.drawChaserTelegraph(ctx, enemy, illustrated, isAttacking);
        }
      } else if (enemy.kind === "patrol-shooter") {
        let assetKey = "patrolShooter.patrol.0";
        let image = null;
        let currentFrame = 0;
        let shouldDraw = true;
        let visualState = enemy.phase;

        if (enemy.phase === "patrol") {
          const anim = PATROL_SHOOTER_ANIMATIONS?.patrol ?? { frames: 8, speed: 12 };
          currentFrame = animationFrame(enemy, anim);
          ({ image, assetKey } = this.resolveAnimationImage("patrolShooter", "patrol", currentFrame, "patrolShooter.patrol.0"));
          shouldDraw = Boolean(image);
        } else if (enemy.phase === "aim") {
          const anim = PATROL_SHOOTER_ANIMATIONS?.aim ?? { frames: 4, speed: 4 / 0.9, loop: false };
          currentFrame = animationFrame(enemy, anim);
          ({ image, assetKey } = this.resolveAnimationImage("patrolShooter", "aim", currentFrame, "patrolShooter.patrol.0"));
          shouldDraw = Boolean(image);
        } else if ((enemy.fireFeedbackTime ?? 0) > 0) {
          currentFrame = 0;
          visualState = "fire-feedback";
          ({ image, assetKey } = this.resolveAnimationImage("patrolShooter", "fire", currentFrame, "patrolShooter.patrol.0"));
          shouldDraw = Boolean(image);
        } else if (enemy.phase === "fire") {
          currentFrame = 3;
          visualState = "fire-commit";
          ({ image, assetKey } = this.resolveAnimationImage("patrolShooter", "aim", currentFrame, "patrolShooter.patrol.0"));
          shouldDraw = Boolean(image);
        } else if (enemy.phase === "recovery") {
          const firing = enemy.recoilTime > 0;
          const recoveryVisualSeconds = 0.28;
          const visibleRecoverySeconds = recoveryVisualSeconds - BALANCE.encounter.patrolShooter.fireFeedbackSeconds;
          const recoilElapsed = Math.max(0, recoveryVisualSeconds - enemy.recoilTime - BALANCE.encounter.patrolShooter.fireFeedbackSeconds);
          const firingFrame = Math.min(3, Math.max(0, Math.floor((recoilElapsed / visibleRecoverySeconds) * 4)));
          currentFrame = firingFrame;
          ({ image, assetKey } = this.resolveAnimationImage("patrolShooter", "recovery", firing ? firingFrame : 3, "patrolShooter.patrol.0"));
          shouldDraw = Boolean(image);
        }

        if (this.isAnimationSamplingEnabled()) this.recordAnimationSample({
          runId: model.runId,
          entityId: enemy.id,
          archetype: "patrol-shooter",
          state: enemy.phase,
          visualState,
          frame: currentFrame,
          assetKey,
          facing: enemy.facing,
          animTime: enemy.animTime ?? 0,
          simTime
        });

        if (enemy.phase === "aim") {
          const progress = 1 - enemy.phaseTime / BALANCE.encounter.patrolShooter.aimSeconds;
          const muzzleX = enemy.x + enemy.w / 2 + enemy.facing * BALANCE.encounter.patrolShooter.muzzleForward;
          const muzzleY = enemy.y + BALANCE.encounter.patrolShooter.muzzleY;
          ctx.save();
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = progress > 0.68 ? "#ff7a28" : "rgba(55,230,238,.76)";
          ctx.lineWidth = progress > 0.68 ? 2 : 1;
          ctx.beginPath();
          ctx.moveTo(muzzleX, muzzleY);
          ctx.lineTo(enemy.aimX, enemy.aimY);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.strokeStyle = "#ff7a28";
          ctx.strokeRect(enemy.x - 2 - progress * 2, enemy.y - 2 - progress * 2, enemy.w + 4 + progress * 4, enemy.h + 4 + progress * 4);
          ctx.restore();

          if (progress > 0.5 && typeof ctx.arc === "function" && typeof ctx.fill === "function") {
            const chargeProgress = (progress - 0.5) / 0.5;
            const chargeRadius = 1.5 + chargeProgress * 4.5;
            ctx.save();
            if (typeof ctx.createRadialGradient === "function") {
              const grad = ctx.createRadialGradient(muzzleX, muzzleY, 0, muzzleX, muzzleY, chargeRadius);
              grad.addColorStop(0, "#ffffff");
              grad.addColorStop(0.35, "#ffe066");
              grad.addColorStop(0.7, "#ff5f28");
              grad.addColorStop(1, "rgba(255, 60, 40, 0)");
              ctx.fillStyle = grad;
            } else {
              ctx.fillStyle = "#ff5f28";
            }
            ctx.beginPath();
            ctx.arc(muzzleX, muzzleY, chargeRadius, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = progress > 0.75 ? "rgba(255, 60, 50, 0.85)" : "rgba(255, 122, 40, 0.65)";
            ctx.beginPath();
            ctx.arc(enemy.aimX, enemy.aimY, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }

        if (shouldDraw) {
          const illustrated = assetKey.startsWith("patrolShooter.illustrated.");
          this.drawMirrored(
            ctx,
            image,
            enemy.x + enemy.w / 2 - (illustrated ? 32 : 16),
            enemy.y,
            illustrated ? 64 : 32,
            illustrated ? 64 : 32,
            enemy.facing > 0
          );
        }
      } else {
        const firing = enemy.phase === "recovery" && enemy.phaseTime > model.encounter.shooterRecovery - 0.28;
        let image = this.images.get("turret.ready.0");
        if (firing) {
          const recoilElapsed = model.encounter.shooterRecovery - enemy.phaseTime;
          const frame = Math.min(3, Math.floor((recoilElapsed / 0.28) * 4));
          image = this.images.get(`turret.shooting.${frame}`) || image;
        }
        if (this.isAnimationSamplingEnabled()) this.recordAnimationSample({ runId: model.runId, entityId: enemy.id, archetype: "shooter", state: firing ? "shooting" : enemy.phase === "telegraph" ? "telegraph" : "ready", frame: firing ? Math.min(3, Math.floor(((model.encounter.shooterRecovery - enemy.phaseTime) / 0.28) * 4)) : 0, assetKey: firing ? `turret.shooting.${Math.min(3, Math.floor(((model.encounter.shooterRecovery - enemy.phaseTime) / 0.28) * 4))}` : "turret.ready.0", facing: enemy.facing, phaseTime: enemy.phaseTime, simTime });

        if (enemy.phase === "telegraph") {
          const progress = 1 - enemy.phaseTime / model.encounter.shooterTelegraph;
          ctx.save();
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = progress > 0.68 ? "#ff7a28" : "rgba(55,230,238,.76)";
          ctx.lineWidth = progress > 0.68 ? 2 : 1;
          ctx.beginPath();
          ctx.moveTo(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2);
          ctx.lineTo(enemy.aimX, enemy.aimY);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.strokeStyle = "#ff7a28";
          ctx.strokeRect(enemy.x - 2 - progress * 2, enemy.y - 2 - progress * 2, enemy.w + 4 + progress * 4, enemy.h + 4 + progress * 4);
          ctx.restore();

          if (progress > 0.5 && typeof ctx.arc === "function" && typeof ctx.fill === "function") {
            const barrelX = enemy.x + (enemy.facing > 0 ? enemy.w + 2 : -2);
            const barrelY = enemy.y + enemy.h / 2;
            const chargeProgress = (progress - 0.5) / 0.5;
            const chargeRadius = 1.5 + chargeProgress * 4.5;
            ctx.save();
            if (typeof ctx.createRadialGradient === "function") {
              const grad = ctx.createRadialGradient(barrelX, barrelY, 0, barrelX, barrelY, chargeRadius);
              grad.addColorStop(0, "#ffffff");
              grad.addColorStop(0.35, "#ffe066");
              grad.addColorStop(0.7, "#ff5f28");
              grad.addColorStop(1, "rgba(255, 60, 40, 0)");
              ctx.fillStyle = grad;
            } else {
              ctx.fillStyle = "#ff5f28";
            }
            ctx.beginPath();
            ctx.arc(barrelX, barrelY, chargeRadius, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = progress > 0.75 ? "rgba(255, 60, 50, 0.85)" : "rgba(255, 122, 40, 0.65)";
            ctx.beginPath();
            ctx.arc(enemy.aimX, enemy.aimY, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
        this.drawMirrored(ctx, image, enemy.x - 4, enemy.y - 4, 32, 32, enemy.facing > 0);
      }
    }

    for (const visual of model.defeatVisuals) {
      const animation = CHASER_ANIMATIONS.dead;
      const frame = animationFrame(visual, animation);
      const { image, assetKey } = this.resolveAnimationImage("chaser", "dead", frame, "chaser.idle");
      if (this.isAnimationSamplingEnabled()) this.recordAnimationSample({ runId: model.runId, entityId: visual.sourceId, visualId: visual.id, archetype: "chaser", state: "dead", frame, assetKey, facing: visual.facing, animTime: visual.animTime ?? 0, simTime });
      const illustrated = assetKey.startsWith("chaser.illustrated.");
      this.drawMirrored(
        ctx,
        image,
        illustrated ? visual.x - 8 : visual.x,
        visual.y,
        illustrated ? 32 : 16,
        illustrated ? 64 : 32,
        visual.facing < 0
      );
    }
  }

  drawBonusSpawnWarnings(ctx, model, now = 0) {
    if (model.gameMode !== "bonus" || !Array.isArray(model.bonusEnemySpawns)) return;
    for (const schedule of model.bonusEnemySpawns) {
      if (schedule.state !== "warning" || !schedule.selected) continue;
      const point = schedule.selected;
      const centerX = point.x + 8;
      const centerY = point.y + 16;
      const pulse = model.reducedMotion ? 0.5 : 0.5 + Math.sin(now * 18) * 0.5;
      ctx.save();
      ctx.globalAlpha = 0.64 + pulse * 0.24;
      ctx.strokeStyle = "#ff7a28";
      ctx.fillStyle = "rgba(255, 95, 81, 0.14)";
      ctx.lineWidth = 1;
      ctx.setLineDash?.([3, 2]);
      ctx.strokeRect(point.x - 4, point.y - 4, 24, 40);
      ctx.setLineDash?.([]);
      ctx.beginPath();
      ctx.arc(centerX, centerY, 11 + pulse * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#fff5dc";
      ctx.font = "bold 8px 'Pixelify Sans'";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("!", centerX, centerY);
      ctx.restore();
    }
  }

  drawChaserDamageFeedback(ctx, enemy, illustrated = false) {
    if ((enemy.hurtFlash ?? 0) <= 0) return;
    const duration = BALANCE.encounter.chaserHurtFlashSeconds;
    const intensity = Math.min(1, enemy.hurtFlash / duration);
    const x = illustrated ? enemy.x + enemy.w / 2 - 17 : enemy.x - 1;
    const y = illustrated ? enemy.y - 1 : enemy.y - 1;
    const width = illustrated ? 34 : enemy.w + 2;
    const height = illustrated ? 66 : enemy.h + 2;
    ctx.save();
    ctx.globalAlpha = 0.35 + intensity * 0.5;
    ctx.strokeStyle = "#ff5f6d";
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, width - 1, height - 1);
    ctx.restore();
  }

  drawChaserTelegraph(ctx, enemy, illustrated, isAttacking) {
    const eyeX = illustrated
      ? (enemy.facing < 0 ? enemy.x + enemy.w / 2 - 6 : enemy.x + enemy.w / 2 + 6)
      : (enemy.facing < 0 ? enemy.x + 3 : enemy.x + enemy.w - 3);
    const eyeY = enemy.y + (illustrated ? 11 : 7);

    ctx.save();
    // 1. Red Eye Flash: glowing crimson flare
    if (typeof ctx.fillRect === "function") {
      ctx.fillStyle = "rgba(255, 30, 60, 0.88)";
      ctx.fillRect(eyeX - 4, eyeY, 9, 1);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(eyeX - 1, eyeY, 2, 1);
    }
    if (typeof ctx.arc === "function" && typeof ctx.fill === "function") {
      const haloRadius = isAttacking ? 4.5 : 3.5;
      if (typeof ctx.createRadialGradient === "function") {
        const grad = ctx.createRadialGradient(eyeX, eyeY, 0, eyeX, eyeY, haloRadius);
        grad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
        grad.addColorStop(0.35, "rgba(255, 35, 65, 0.85)");
        grad.addColorStop(1, "rgba(255, 20, 50, 0)");
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = "rgba(255, 35, 65, 0.75)";
      }
      ctx.beginPath();
      ctx.arc(eyeX, eyeY, haloRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Visual Growl: sonic warning arc in facing direction
    if (typeof ctx.arc === "function" && typeof ctx.stroke === "function") {
      const growlDir = enemy.facing < 0 ? -1 : 1;
      const mouthX = eyeX + growlDir * 4;
      const mouthY = eyeY + 4;
      const wave = ((enemy.animTime ?? 0) * 16) % 6;
      ctx.strokeStyle = "rgba(255, 70, 50, 0.75)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      const startAngle = growlDir > 0 ? -0.55 : Math.PI - 0.55;
      const endAngle = growlDir > 0 ? 0.55 : Math.PI + 0.55;
      ctx.arc(mouthX, mouthY, 4 + wave, startAngle, endAngle);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawEliteEnemyAura(ctx, enemy, now = 0) {
    if (!enemy || !enemy.isElite) return;
    const cx = enemy.x + enemy.w / 2;
    const cy = enemy.y + enemy.h / 2;
    const radius = Math.max(enemy.w, enemy.h) * 0.75 + 5 + Math.sin(now * 4) * 2;

    ctx.save();

    // 1. Rotating hexagonal aura
    ctx.save();
    if (typeof ctx.translate === "function" && typeof ctx.rotate === "function") {
      ctx.translate(cx, cy);
      const angle = now * 1.8;
      ctx.rotate(angle);
    }
    ctx.strokeStyle = "rgba(255, 95, 40, 0.85)";
    ctx.lineWidth = 1.5;
    ctx.shadowColor = "#ff3b1e";
    ctx.shadowBlur = 8;
    if (typeof ctx.beginPath === "function" && typeof ctx.stroke === "function") {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        const hx = Math.cos(a) * radius;
        const hy = Math.sin(a) * radius;
        if (i === 0 && typeof ctx.moveTo === "function") ctx.moveTo(hx, hy);
        else if (typeof ctx.lineTo === "function") ctx.lineTo(hx, hy);
      }
      if (typeof ctx.closePath === "function") ctx.closePath();
      ctx.stroke();
    }

    // Hexagonal energy node vertices
    ctx.fillStyle = "#ffd280";
    if (typeof ctx.fillRect === "function") {
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        const hx = Math.cos(a) * radius;
        const hy = Math.sin(a) * radius;
        ctx.fillRect(hx - 1.5, hy - 1.5, 3, 3);
      }
    }
    ctx.restore();

    // 2. Glowing, pulsing red/orange crown above enemy head
    const crownBob = Math.sin(now * 3.2) * 1.5;
    const crownX = cx;
    const crownY = enemy.y - 8 + crownBob;

    ctx.save();
    ctx.shadowColor = "rgba(255, 60, 40, 0.9)";
    ctx.shadowBlur = 6;
    ctx.fillStyle = "#ff5f28";
    ctx.strokeStyle = "#ffd280";
    ctx.lineWidth = 1;

    // 3-pointed crown path
    if (typeof ctx.beginPath === "function" && typeof ctx.fill === "function") {
      ctx.beginPath();
      if (typeof ctx.moveTo === "function") ctx.moveTo(crownX - 7, crownY + 4);
      if (typeof ctx.lineTo === "function") {
        ctx.lineTo(crownX - 7, crownY - 2);
        ctx.lineTo(crownX - 3, crownY + 1);
        ctx.lineTo(crownX, crownY - 5);
        ctx.lineTo(crownX + 3, crownY + 1);
        ctx.lineTo(crownX + 7, crownY - 2);
        ctx.lineTo(crownX + 7, crownY + 4);
      }
      if (typeof ctx.closePath === "function") ctx.closePath();
      ctx.fill();
      if (typeof ctx.stroke === "function") ctx.stroke();
    }

    // Crown jewels (amber / white dots on peaks)
    if (typeof ctx.fillRect === "function") {
      ctx.fillStyle = "#fff5dc";
      ctx.fillRect(crownX - 8, crownY - 3, 2, 2);
      ctx.fillRect(crownX - 1, crownY - 6, 2, 2);
      ctx.fillRect(crownX + 6, crownY - 3, 2, 2);

      // Crown base band
      ctx.fillStyle = "#ff2a2a";
      ctx.fillRect(crownX - 6, crownY + 2, 12, 2);
    }

    ctx.restore();

    ctx.restore();
  }

  drawProjectiles(ctx, model) {
    ctx.save();
    for (const shot of model.projectiles) {
      const cannonShot = shot.team === "bonusCannon";
      const image = cannonShot ? null : (
        (this.renderScale > 1 && this.images.get(shot.team === "player" ? "player.bullet.illustrated" : "enemy.bullet.illustrated"))
        || this.images.get(shot.team === "player" ? "player.bullet" : "enemy.bullet")
      );
      // Dynamic Projectile Lighting with additive blending (Task 4)
      if (typeof ctx.createRadialGradient === "function" && typeof ctx.arc === "function" && typeof ctx.fill === "function") {
        ctx.globalCompositeOperation = "lighter";
        const lightRadius = shot.team === "bonusCannon" ? 22 : shot.team === "player" ? 16 : 14;
        const centerX = shot.x + shot.w / 2;
        const centerY = shot.y + shot.h / 2;
        const lightGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, lightRadius);
        if (shot.team === "player") {
          lightGrad.addColorStop(0, "rgba(55, 230, 238, 0.40)");
          lightGrad.addColorStop(0.45, "rgba(55, 230, 238, 0.16)");
          lightGrad.addColorStop(1, "rgba(55, 230, 238, 0)");
        } else if (cannonShot) {
          lightGrad.addColorStop(0, "rgba(255, 155, 56, 0.48)");
          lightGrad.addColorStop(0.45, "rgba(255, 122, 40, 0.20)");
          lightGrad.addColorStop(1, "rgba(255, 95, 30, 0)");
        } else {
          lightGrad.addColorStop(0, "rgba(255, 79, 129, 0.42)");
          lightGrad.addColorStop(0.45, "rgba(255, 60, 90, 0.16)");
          lightGrad.addColorStop(1, "rgba(255, 40, 60, 0)");
        }
        ctx.fillStyle = lightGrad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, lightRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = "source-over";
      }
      if (shot.team === "player") {
        for (const point of shot.trail ?? []) {
          const alpha = Math.max(0, point.life / point.duration) * 0.52;
          ctx.fillStyle = `rgba(55,230,238,${alpha})`;
          ctx.fillRect(Math.round(point.x - 1), Math.round(point.y - 1), 3, 3);
        }
      }
      const color = shot.team === "player" ? "#ffb14a" : cannonShot ? "#ff9b38" : "#ff4f81";
      ctx.shadowColor = color;
      ctx.shadowBlur = shot.team === "enemy" ? 8 : cannonShot ? 4 : 5;
      ctx.fillStyle = shot.team === "enemy" ? "rgba(255,79,129,.42)" : cannonShot ? "rgba(255,155,56,.34)" : "rgba(255,177,74,.28)";
      ctx.beginPath();
      ctx.arc(shot.x + shot.w / 2, shot.y + shot.h / 2, shot.team === "enemy" ? 6 : 5, 0, Math.PI * 2);
      ctx.fill();
      if (image) ctx.drawImage(image, Math.round(shot.x), Math.round(shot.y), shot.w, shot.h);
      else { ctx.fillStyle = color; ctx.fillRect(shot.x, shot.y, shot.w, shot.h); }
      if (cannonShot) {
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#35180c";
        ctx.fillRect(Math.round(shot.x + 1), Math.round(shot.y + 1), 6, 6);
        ctx.fillStyle = "#ffb14a";
        ctx.fillRect(Math.round(shot.x + 2), Math.round(shot.y + 2), 4, 4);
        ctx.fillStyle = "#fff5dc";
        ctx.fillRect(Math.round(shot.x + 3), Math.round(shot.y + 3), 2, 2);
      }
      if (shot.team === "player") {
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#37e6ee";
        ctx.fillRect(Math.round(shot.x + 2), Math.round(shot.y + 2), 4, 4);
        ctx.fillStyle = "#fff5dc";
        ctx.fillRect(Math.round(shot.x + 3), Math.round(shot.y + 3), 2, 2);
      }
    }
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
  }

  drawPlayer(ctx, model, now, player = model.player, character = model.character) {
    const state = playerAnimationState(player);
    const animation = PLAYER_ANIMATIONS[state];
    const time = ANIMATED_SIMULATION_STATES.has(model.state) ? (model.elapsed ?? now) : now;
    const frame = animationFrame(player, animation);
    const spritePrefix = character?.spritePrefix ?? "player";
    const fallbackSpritePrefix = character?.fallbackSpritePrefix ?? "player";
    const { image, assetKey } = this.resolveAnimationImage(
      spritePrefix,
      state,
      frame,
      "player.idle.0",
      fallbackSpritePrefix === spritePrefix ? null : fallbackSpritePrefix
    );
    const provisionalVisual = Boolean(character?.provisionalVisual && assetKey.startsWith(`${fallbackSpritePrefix}.`));
    if (this.isAnimationSamplingEnabled()) this.recordAnimationSample({
      runId: model.runId,
      entityId: player.id,
      archetype: "player",
      characterId: player.characterId ?? model.characterId,
      spritePrefix,
      state,
      frame,
      assetKey,
      facing: player.facing,
      animTime: player.animTime ?? 0,
      simTime: time
    });
    const drawX = player.x + player.w / 2 - 16;
    const drawY = player.y + player.h - 64;
    // Player frames keep the body around local X=16 inside a 64px-wide canvas.
    // Shift the generic full-canvas mirror so both facings retain that body anchor.
    const renderX = player.facing < 0 ? drawX - 32 : drawX;

    if ((player.dashTimer ?? 0) > 0) {
      this.dashGhostClock = (this.dashGhostClock ?? 0) - (this.frameDelta ?? 0.016);
      if (this.dashGhostClock <= 0) {
        this.dashGhostClock = REMASTER.dash.ghostInterval;
        this.spawnDashGhost(image, renderX, drawY, player.facing < 0);
      }
    } else {
      this.dashGhostClock = 0;
    }
    this.drawDashGhosts(ctx);

    ctx.save();
    // Achatamento no pouso e alongamento no salto, ancorados nos pés para que
    // o corpo nunca atravesse a plataforma.
    const squash = player.squash ?? 0;
    if (squash !== 0) {
      const feetY = player.y + player.h;
      const bodyX = player.x + player.w / 2;
      ctx.translate(bodyX, feetY);
      ctx.scale(1 + squash * 0.2, 1 - squash * 0.24);
      ctx.translate(-bodyX, -feetY);
    }
    if (player.life > 0 && player.invulnerable > 0 && Math.floor(time * 16) % 2 === 0) ctx.globalAlpha = 0.38;
    ctx.shadowColor = provisionalVisual ? "rgba(46, 230, 168, 0.55)" : "rgba(255,122,40,.45)";
    ctx.shadowBlur = 3;
    this.drawMirrored(ctx, image, renderX, drawY, 64, 96, player.facing < 0);
    if (provisionalVisual && player.life > 0) {
      // Restrained provisional tactical insignia on shoulder (medical cross 5x5)
      const markerX = player.facing > 0 ? drawX + 33 : drawX + 27;
      const markerY = drawY + 45;
      ctx.fillStyle = "#2ee6a8";
      ctx.fillRect(markerX - 2, markerY, 5, 1);
      ctx.fillRect(markerX, markerY - 2, 1, 5);
      ctx.fillStyle = "#fff5dc";
      ctx.fillRect(markerX, markerY, 1, 1);
    }
    ctx.restore();

    if (player.life <= 0 || state === "die") {
      this.drawPlayerDeathVFX(ctx, player, now);
    }
    if (player.respawning || player.isRespawning || (player.respawnTime && player.respawnTime > 0) || (player.invulnerable > 0.8 * BALANCE.player.invulnerability && player.life > 0)) {
      this.drawPlayerRespawnVFX(ctx, player, now);
    }

    // Landing dust trigger & rendering
    this.playerMotionHistory ??= new Map();
    let motionHistory = this.playerMotionHistory.get(player.id);
    if (!motionHistory) {
      motionHistory = { grounded: true, vy: 0 };
      this.playerMotionHistory.set(player.id, motionHistory);
    }
    if (!motionHistory.grounded && player.onGround && motionHistory.vy > 90) {
      const feetY = player.y + player.h;
      this.spawnLandingParticle(player.x + 3, feetY - 2, -14, -6, 0.22);
      this.spawnLandingParticle(player.x + 7, feetY - 1, -8, -10, 0.18);
      this.spawnLandingParticle(player.x + player.w - 7, feetY - 1, 8, -10, 0.18);
      this.spawnLandingParticle(player.x + player.w - 3, feetY - 2, 14, -6, 0.22);
    }
    motionHistory.grounded = player.onGround;
    motionHistory.vy = player.vy;
    this.lastPlayerGrounded = player.onGround;
    this.lastPlayerVy = player.vy;

    // Arma empunhada: desenhada na âncora da arma do personagem, para que o
    // jogador veja de relance o que está em mãos.
    const heldWeapon = player.weapon ? WEAPONS[player.weapon.id] : null;
    if (heldWeapon && player.life > 0) {
      const anchor = resolveWeaponAnchor(player, character, player.facing);
      ctx.save();
      ctx.shadowColor = heldWeapon.accent;
      ctx.shadowBlur = 5;
      this.drawWeaponGlyph(ctx, heldWeapon, anchor.x - player.facing * 6, anchor.y, player.facing);
      ctx.restore();
    }

    if (player.attackTimer > 0) {
      const progress = 1 - player.attackTimer / BALANCE.player.attackDuration;
      if (progress < 0.28) {
        // Enhanced Cinematic Muzzle Flash & Kinetic Strike Spark at weapon discharge point
        const weaponAnchor = resolveWeaponAnchor(player, character, player.facing);
        const muzzleX = weaponAnchor.x;
        const muzzleY = weaponAnchor.y;
        const flashT = progress / 0.28;
        const flashAlpha = 1 - flashT;
        const isSupport = character.id === "support";
        const primaryColor = isSupport ? "rgba(55, 230, 238," : "rgba(255, 122, 40,";
        const secondaryColor = isSupport ? "rgba(46, 230, 168," : "rgba(255, 177, 74,";
        const facing = player.facing;

        ctx.save();
        // 1. Outer radial bloom / energy halo
        ctx.fillStyle = `${primaryColor} ${flashAlpha * 0.35})`;
        ctx.beginPath();
        ctx.arc(muzzleX, muzzleY, 8 * (1 + flashT * 0.5), 0, Math.PI * 2);
        ctx.fill();

        // 2. Multi-point starburst spark elongated in facing direction
        ctx.fillStyle = `${primaryColor} ${flashAlpha * 0.85})`;
        ctx.fillRect(facing > 0 ? muzzleX - 2 : muzzleX - 8, muzzleY - 2, 10, 4);
        ctx.fillRect(muzzleX - 2, muzzleY - 5, 4, 10);

        // 3. Diagonal secondary flare spikes
        ctx.fillStyle = `${secondaryColor} ${flashAlpha * 0.75})`;
        ctx.fillRect(muzzleX + facing * 3 - 1, muzzleY - 3, 2, 2);
        ctx.fillRect(muzzleX + facing * 3 - 1, muzzleY + 2, 2, 2);
        ctx.fillRect(muzzleX - facing * 2 - 1, muzzleY - 2, 2, 2);
        ctx.fillRect(muzzleX - facing * 2 - 1, muzzleY + 1, 2, 2);

        // 4. Incandescent high-voltage white core
        ctx.fillStyle = isSupport ? "#e2faff" : "#fff5dc";
        ctx.fillRect(muzzleX - 1, muzzleY - 1, 3, 3);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(muzzleX, muzzleY, 1, 1);
        ctx.restore();
      }
      if (progress >= 0.08 && progress <= 0.88) {
        const centerX = player.x + player.w / 2 + player.facing * 9;
        const centerY = player.y + 15;
        ctx.save();
        ctx.globalAlpha = model.reducedMotion ? 0.52 : Math.sin(Math.PI * progress) * 0.76;
        ctx.strokeStyle = "#ff7a28";
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (player.facing > 0) ctx.arc(centerX, centerY, 17, -0.9, 0.72);
        else ctx.arc(centerX, centerY, 17, Math.PI - 0.72, Math.PI + 0.9);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  spawnLandingParticle(x, y, vx, vy, duration) {
    this.landingParticles ??= [];
    this.landingParticlePool ??= [];
    if (this.landingParticles.length >= MAX_LANDING_PARTICLES) return false;
    const particle = this.landingParticlePool.pop() ?? { x: 0, y: 0, vx: 0, vy: 0, life: 0, duration: 0 };
    particle.x = x;
    particle.y = y;
    particle.vx = vx;
    particle.vy = vy;
    particle.life = duration;
    particle.duration = duration;
    this.landingParticles.push(particle);
    return true;
  }

  // Queda de arma no cenário: caixa flutuante com a silhueta da arma.
  drawWeaponDrops(ctx, model, now) {
    if (!model.weaponDrops?.length) return;
    ctx.save();
    for (const drop of model.weaponDrops) {
      if (drop.removed) continue;
      const config = WEAPONS[drop.weaponId];
      if (!config) continue;
      const bob = Math.sin((now + drop.bornAt) * 3) * WEAPON_DROP_RULES.bobAmplitude;
      const x = drop.x;
      const y = drop.y + bob;
      ctx.fillStyle = "rgba(6, 5, 14, 0.8)";
      ctx.fillRect(x, y, drop.w, drop.h);
      ctx.strokeStyle = config.accent;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, drop.w - 1, drop.h - 1);
      ctx.shadowColor = config.accent;
      ctx.shadowBlur = 7;
      this.drawWeaponGlyph(ctx, config, x + drop.w / 2, y + drop.h / 2, 1);
      ctx.shadowBlur = 0;
      // Seta de atenção acima, para a arma ser notada no meio do combate.
      ctx.fillStyle = config.accent;
      ctx.globalAlpha = 0.55 + Math.sin(now * 6) * 0.35;
      ctx.fillRect(x + drop.w / 2 - 2, y - 5, 4, 2);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  // Silhueta compacta de cada arma, usada na queda e na mão do personagem.
  drawWeaponGlyph(ctx, config, cx, cy, facing) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(facing >= 0 ? 1 : -1, 1);
    ctx.fillStyle = config.accent;
    if (config.mode === "spread") {
      ctx.fillRect(-7, -2, 12, 4);
      ctx.fillRect(4, -4, 4, 8);
      ctx.fillRect(-8, 1, 5, 3);
    } else if (config.mode === "beam") {
      ctx.fillRect(-8, -1, 14, 3);
      ctx.fillRect(2, -4, 3, 9);
      ctx.fillStyle = "#fff5dc";
      ctx.fillRect(6, -1, 3, 2);
    } else {
      ctx.fillRect(-2, -6, 3, 13);
      ctx.fillRect(1, -7, 7, 6);
      ctx.fillStyle = "#fff5dc";
      ctx.fillRect(3, -6, 3, 2);
    }
    ctx.restore();
  }

  // Rastro do feixe e anel de impacto da marreta.
  drawWeaponEffects(ctx, model) {
    const dt = this.frameDelta ?? 0.016;
    if (model.beamFlashes?.length) {
      ctx.save();
      for (const flash of model.beamFlashes) {
        const alpha = Math.max(0, flash.life / flash.duration);
        const midY = flash.y + flash.h / 2;
        // O degradê anterior ficava transparente justamente no cano, que é
        // onde o olho procura o disparo. Agora o feixe nasce sólido na boca da
        // arma e se dissipa para longe.
        const nearX = flash.origin ?? flash.x;
        const grad = ctx.createLinearGradient(nearX, 0, flash.x + (nearX === flash.x ? flash.w : 0), 0);
        grad.addColorStop(0, flash.accent);
        grad.addColorStop(1, "rgba(55, 230, 238, 0.05)");
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = alpha * 0.5;
        ctx.fillStyle = grad;
        ctx.fillRect(flash.x, flash.y - 2, flash.w, flash.h + 4);
        ctx.globalAlpha = alpha;
        ctx.fillRect(flash.x, midY - 2.5, flash.w, 5);
        ctx.fillStyle = "#ffffff";
        ctx.globalAlpha = alpha * 0.95;
        ctx.fillRect(flash.x, midY - 1, flash.w, 2);
        ctx.globalCompositeOperation = "source-over";
      }
      ctx.restore();
    }
    if (model.slamRings?.length) {
      ctx.save();
      for (const ring of model.slamRings) {
        const progress = 1 - Math.max(0, ring.life / ring.duration);
        ctx.globalAlpha = (1 - progress) * 0.85;
        ctx.strokeStyle = ring.accent;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, Math.max(2, ring.radius * progress), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  drawLandingParticles(ctx) {
    if (!this.landingParticles?.length) return;
    const dt = this.frameDelta ?? 0.016;
    ctx.save();
    for (let index = this.landingParticles.length - 1; index >= 0; index -= 1) {
      const particle = this.landingParticles[index];
      particle.life -= dt;
      if (particle.life <= 0) {
        const last = this.landingParticles.pop();
        if (index < this.landingParticles.length) this.landingParticles[index] = last;
        if (this.landingParticlePool.length < MAX_LANDING_PARTICLES) this.landingParticlePool.push(particle);
        continue;
      }
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      const alpha = Math.max(0, particle.life / particle.duration);
      ctx.fillStyle = `rgba(196, 184, 217, ${alpha * 0.72})`;
      if (this.renderScale > 1) {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, Math.max(1, 2.2 * alpha), 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(Math.round(particle.x), Math.round(particle.y), 2, 2);
      }
    }
    ctx.restore();
  }

  drawPlayerDeathVFX(ctx, player, now = 0) {
    if (!player) return;
    const cx = player.x + player.w / 2;
    const cy = player.y + player.h / 2;
    const t = Math.min(1, Math.max(0, (player.animTime ?? (now * 1.5)) % 1.5));

    ctx.save();
    // 1. Cyberpunk pixelated fragments scattering outwards
    const fragmentCount = 18;
    for (let i = 0; i < fragmentCount; i++) {
      const angle = (i * 20 + i * i * 3) * (Math.PI / 180);
      const speed = 15 + (i % 6) * 7;
      const dist = speed * (t * 0.9 + 0.1);
      const fx = cx + Math.cos(angle) * dist;
      const fy = cy + Math.sin(angle) * dist - t * 10;
      const size = (i % 3) + 2;
      const alpha = Math.max(0, 1 - t * 0.9);

      ctx.globalAlpha = alpha;
      ctx.fillStyle = DEATH_FRAGMENT_COLORS[i % DEATH_FRAGMENT_COLORS.length];
      if (typeof ctx.fillRect === "function") {
        ctx.fillRect(Math.round(fx), Math.round(fy), size, size);
      }
    }

    // 2. Cyan & Violet scattering sparks
    const sparkCount = 10;
    ctx.lineWidth = 1;
    for (let i = 0; i < sparkCount; i++) {
      const a = (i * Math.PI * 2) / sparkCount + (now * 2);
      const r1 = 6 + t * 8;
      const r2 = 14 + t * 24;
      const sx1 = cx + Math.cos(a) * r1;
      const sy1 = cy + Math.sin(a) * r1;
      const sx2 = cx + Math.cos(a) * r2;
      const sy2 = cy + Math.sin(a) * r2;

      ctx.strokeStyle = (i % 2 === 0) ? `rgba(55, 230, 238, ${Math.max(0, 1 - t)})` : `rgba(174, 98, 255, ${Math.max(0, 1 - t)})`;
      if (typeof ctx.beginPath === "function" && typeof ctx.stroke === "function") {
        ctx.beginPath();
        if (typeof ctx.moveTo === "function") ctx.moveTo(sx1, sy1);
        if (typeof ctx.lineTo === "function") ctx.lineTo(sx2, sy2);
        ctx.stroke();
      }
    }

    // 3. Glitch scanline displacement on player body
    const sliceCount = 4;
    for (let s = 0; s < sliceCount; s++) {
      const sliceY = player.y + (s * player.h) / sliceCount;
      const jitter = (Math.sin(now * 30 + s * 5) * 4);
      ctx.fillStyle = s % 2 === 0 ? "rgba(55, 230, 238, 0.45)" : "rgba(174, 98, 255, 0.45)";
      if (typeof ctx.fillRect === "function") {
        ctx.fillRect(player.x + jitter, sliceY, player.w, player.h / sliceCount - 2);
      }
    }
    ctx.restore();
  }

  drawPlayerRespawnVFX(ctx, player, now = 0) {
    if (!player) return;
    const targetX = player.x + player.w / 2;
    const targetY = player.y + player.h;
    const spawnY = player.y + player.h / 2;

    ctx.save();
    // 1. Vertical neon light beams descending from top of screen (y = 0) converging on player spawn point
    const beamCount = 9;
    for (let i = 0; i < beamCount; i++) {
      const spread = (i - (beamCount - 1) / 2) * 16;
      const startX = targetX + spread;
      const color = RESPAWN_BEAM_COLORS[i % RESPAWN_BEAM_COLORS.length];

      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = i === Math.floor(beamCount / 2) ? 2 : 1;
      ctx.globalAlpha = 0.85;

      if (typeof ctx.setLineDash === "function") {
        ctx.setLineDash([5, 3]);
        ctx.lineDashOffset = -now * 140; // streaming neon light dashes descending
      }

      if (typeof ctx.beginPath === "function" && typeof ctx.stroke === "function") {
        ctx.beginPath();
        if (typeof ctx.moveTo === "function") ctx.moveTo(startX, 0); // descending from top of screen
        if (typeof ctx.lineTo === "function") ctx.lineTo(targetX + (i - (beamCount - 1) / 2) * 2, targetY - 2); // converging on player spawn point
        ctx.stroke();
      }

      if (typeof ctx.setLineDash === "function") {
        ctx.setLineDash([]);
      }

      // Descending data stream bits
      const bitProgress = (now * 3 + i * 0.22) % 1;
      const bitY = bitProgress * (targetY - 4);
      const bitX = startX + (targetX - startX) * bitProgress;
      ctx.fillStyle = "#ffffff";
      if (typeof ctx.fillRect === "function") {
        ctx.fillRect(Math.round(bitX - 1), Math.round(bitY - 1), 2, 4);
      }

      ctx.restore();
    }

    // 2. Converging floor energy ring at player spawn point
    ctx.save();
    const ringRadius = 14 + Math.sin(now * 6) * 3;
    ctx.strokeStyle = "#37e6ee";
    ctx.lineWidth = 1.5;
    if (typeof ctx.ellipse === "function") {
      ctx.beginPath();
      ctx.ellipse(targetX, targetY - 1, ringRadius, ringRadius * 0.35, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (typeof ctx.strokeRect === "function") {
      ctx.strokeRect(targetX - ringRadius, targetY - 3, ringRadius * 2, 4);
    }

    // 3. Bright flash burst converging on player's spawn point
    if (typeof ctx.createRadialGradient === "function") {
      const flashRadius = 22 + Math.sin(now * 8) * 4;
      const flashGrad = ctx.createRadialGradient(targetX, spawnY, 0, targetX, spawnY, flashRadius);
      flashGrad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
      flashGrad.addColorStop(0.3, "rgba(55, 230, 238, 0.75)");
      flashGrad.addColorStop(0.65, "rgba(174, 98, 255, 0.35)");
      flashGrad.addColorStop(1, "rgba(55, 230, 238, 0)");
      ctx.fillStyle = flashGrad;
      if (typeof ctx.beginPath === "function" && typeof ctx.arc === "function" && typeof ctx.fill === "function") {
        ctx.beginPath();
        ctx.arc(targetX, spawnY, flashRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (typeof ctx.fillRect === "function") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(targetX - 8, spawnY - 8, 16, 16);
    }
    ctx.restore();

    ctx.restore();
  }

  drawPresses(ctx, model, now) {
    for (const press of model.presses) {
      const warning = press.phase === "warning";
      const dangerous = press.phase === "closing";
      const recovery = press.phase === "recovery";
      const jitter = warning && !model.reducedMotion ? Math.round(Math.sin(now * 38) * 1.5) : 0;
      const headY = Math.round(press.y + jitter);
      const centerX = press.x + press.w / 2; // 240

      ctx.save();

      // =======================================================================
      // 1. FLOOR ANVIL & CRUSH IMPACT BED (Behind & Under the Press)
      // =======================================================================
      // Anvil strike plate on the floor (x=214..266, y=238..244)
      ctx.fillStyle = "#252b38";
      ctx.fillRect(press.x - 4, 238, press.w + 8, 6);
      ctx.fillStyle = "#525f78";
      ctx.fillRect(press.x - 4, 238, press.w + 8, 1); // top edge chamfer
      ctx.fillStyle = "#141720";
      ctx.fillRect(press.x - 4, 243, press.w + 8, 1);

      // Four corner foundation bolts on the anvil
      ctx.fillStyle = "#8a9ab4";
      ctx.fillRect(press.x - 2, 240, 2, 2);
      ctx.fillRect(press.x + press.w, 240, 2, 2);

      // Perimeter floor hazard boundaries (left and right of the anvil)
      ctx.save();
      for (let x = press.x - 14; x < press.x - 4; x += 5) {
        ctx.fillStyle = (x % 10 === 0) ? "#d48822" : "#1a1d26";
        ctx.fillRect(x, 238, 4, 4);
      }
      for (let x = press.x + press.w + 4; x < press.x + press.w + 14; x += 5) {
        ctx.fillStyle = (x % 10 === 0) ? "#d48822" : "#1a1d26";
        ctx.fillRect(x, 238, 4, 4);
      }
      ctx.restore();

      // Warning Phase: Projected danger boundaries dropping to the floor
      if (warning) {
        const pulse = model.reducedMotion ? 0.7 : 0.4 + Math.sin(now * 12) * 0.3;
        ctx.save();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = `rgba(255, 178, 54, ${pulse})`;
        ctx.lineWidth = 1;
        // Left boundary guideline
        ctx.beginPath();
        ctx.moveTo(press.x, headY + press.headHeight);
        ctx.lineTo(press.x, 238);
        ctx.stroke();
        // Right boundary guideline
        ctx.beginPath();
        ctx.moveTo(press.x + press.w, headY + press.headHeight);
        ctx.lineTo(press.x + press.w, 238);
        ctx.stroke();
        ctx.setLineDash([]);

        // Downward projection warning chevrons in the crush corridor
        ctx.strokeStyle = `rgba(255, 178, 54, ${pulse * 0.85})`;
        ctx.lineWidth = 1;
        for (let row = 0; row < 3; row += 1) {
          const cy = headY + press.headHeight + 12 + row * 18;
          if (cy < 232) {
            ctx.beginPath();
            ctx.moveTo(press.x + 12, cy - 3);
            ctx.lineTo(centerX, cy + 4);
            ctx.lineTo(press.x + press.w - 12, cy - 3);
            ctx.stroke();
          }
        }
        ctx.restore();
      }

      // Closing impact dust/spark effect when reaching bottom
      if (dangerous && headY >= 204) {
        ctx.save();
        ctx.fillStyle = "#ffaa30";
        ctx.fillRect(press.x - 6, 236, 3, 2);
        ctx.fillRect(press.x + press.w + 3, 236, 3, 2);
        ctx.fillStyle = "#ffe0a0";
        ctx.fillRect(press.x - 4, 237, 2, 1);
        ctx.fillRect(press.x + press.w + 2, 237, 2, 1);
        ctx.restore();
      }

      // =======================================================================
      // 2. FIXED SUPPORT STRUCTURE (Gantry Mount, Guide Rails, Cylinder)
      // =======================================================================
      // Overhead gantry mounting bracket (x=208..272, y=14..24)
      ctx.fillStyle = "#1c202a";
      ctx.fillRect(centerX - 32, 14, 64, 10);
      ctx.fillStyle = "#4a576f";
      ctx.fillRect(centerX - 32, 14, 64, 1); // top highlight
      ctx.fillStyle = "#12151e";
      ctx.fillRect(centerX - 32, 23, 64, 1); // bottom bevel
      // Four anchor bolts
      ctx.fillStyle = "#8ea0bc";
      ctx.fillRect(centerX - 28, 17, 2, 2);
      ctx.fillRect(centerX - 18, 17, 2, 2);
      ctx.fillRect(centerX + 16, 17, 2, 2);
      ctx.fillRect(centerX + 26, 17, 2, 2);

      // Twin Vertical Guide Rails (x=214..217 and x=263..266, y=16..216)
      for (const rx of [press.x - 4, press.x + press.w + 1]) {
        ctx.fillStyle = "#1a1d26";
        ctx.fillRect(rx, 16, 3, 202);
        ctx.fillStyle = "#8fa2be";
        ctx.fillRect(rx + 1, 16, 1, 202); // chrome specular line
      }

      // Main Hydraulic Cylinder Housing (x=228..252, y=24..106, width 24)
      const cylX = centerX - 12; // 228
      const cylW = 24;
      // Cylinder barrel with cylindrical shading
      ctx.fillStyle = "#161924";
      ctx.fillRect(cylX, 24, cylW, 82);
      ctx.fillStyle = "#272e3d";
      ctx.fillRect(cylX + 2, 24, 18, 82);
      ctx.fillStyle = "#4e5d7a";
      ctx.fillRect(cylX + 6, 24, 10, 82);
      ctx.fillStyle = "#788cae";
      ctx.fillRect(cylX + 9, 24, 3, 82); // specular column highlight
      // Structural reinforcement rings on cylinder
      for (const ry of [34, 68]) {
        ctx.fillStyle = "#12151e";
        ctx.fillRect(cylX - 1, ry, cylW + 2, 3);
        ctx.fillStyle = "#8fa2be";
        ctx.fillRect(cylX - 1, ry, cylW + 2, 1);
      }

      // High-pressure hydraulic fluid feed lines (left & right)
      ctx.save();
      ctx.strokeStyle = "#2e3444";
      ctx.lineWidth = 2;
      // Left line
      ctx.beginPath();
      ctx.moveTo(centerX - 24, 16);
      ctx.bezierCurveTo(centerX - 20, 36, centerX - 18, 50, cylX, 52);
      ctx.stroke();
      // Right line
      ctx.beginPath();
      ctx.moveTo(centerX + 24, 16);
      ctx.bezierCurveTo(centerX + 20, 36, centerX + 18, 50, cylX + cylW, 52);
      ctx.stroke();
      // Brass coupling nuts
      ctx.fillStyle = "#b88228";
      ctx.fillRect(cylX - 2, 51, 3, 3);
      ctx.fillRect(cylX + cylW - 1, 51, 3, 3);
      ctx.restore();

      // Industrial Pressure & Status Gauge (centered at x=240, y=44..56)
      ctx.fillStyle = "#141720";
      ctx.fillRect(centerX - 6, 44, 12, 12);
      ctx.fillStyle = "#526078";
      ctx.strokeRect(centerX - 6, 44, 12, 12);
      // Status needle / LED in center of gauge
      if (dangerous) {
        ctx.fillStyle = "#ff3624"; // peak danger red
      } else if (warning) {
        const blink = model.reducedMotion ? 1 : Math.floor(now * 10) % 2;
        ctx.fillStyle = blink ? "#ffaa28" : "#804810"; // amber pulsing
      } else if (recovery) {
        ctx.fillStyle = "#5a8ca0"; // pressure venting
      } else {
        ctx.fillStyle = "#37e6ee"; // steady nominal cyan
      }
      ctx.fillRect(centerX - 3, 47, 6, 6);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(centerX - 1, 49, 2, 2);

      // Lower Cylinder Gland Collar (y=104..114, width 20)
      ctx.fillStyle = "#1e232e";
      ctx.fillRect(centerX - 10, 104, 20, 10);
      ctx.fillStyle = "#48556c";
      ctx.fillRect(centerX - 10, 104, 20, 1);
      ctx.fillStyle = "#12151e";
      ctx.fillRect(centerX - 10, 113, 20, 1);

      // =======================================================================
      // 3. HYDRAULIC PISTON ROD (Telescopic Moving Shaft)
      // =======================================================================
      const rodTop = 114;
      const rodBottom = headY;
      if (rodBottom > rodTop) {
        const rodH = rodBottom - rodTop;
        const rodW = 12;
        const rodX = centerX - 6; // 234

        // Chrome piston rod gradient
        ctx.fillStyle = "#1c202a";
        ctx.fillRect(rodX, rodTop, rodW, rodH);
        ctx.fillStyle = "#3a4456";
        ctx.fillRect(rodX + 1, rodTop, 10, rodH);
        ctx.fillStyle = "#9eb2d0";
        ctx.fillRect(rodX + 3, rodTop, 6, rodH);
        ctx.fillStyle = "#f0f6ff"; // specular reflection stripe
        ctx.fillRect(rodX + 5, rodTop, 2, rodH);
        ctx.fillStyle = "#62728e";
        ctx.fillRect(rodX + 8, rodTop, 3, rodH);

        // Machined micro-grooves / oil rings
        ctx.fillStyle = "rgba(18, 21, 28, 0.55)";
        for (let gy = rodTop + 14; gy < rodBottom - 4; gy += 16) {
          ctx.fillRect(rodX, gy, rodW, 1);
        }

        // Piston-to-Head Coupling Yoke (headY - 4 .. headY)
        ctx.fillStyle = "#252b38";
        ctx.fillRect(centerX - 9, headY - 4, 18, 4);
        ctx.fillStyle = "#6b7a94";
        ctx.fillRect(centerX - 9, headY - 4, 18, 1);
        // Hex locking nuts
        ctx.fillStyle = "#9cb0ce";
        ctx.fillRect(centerX - 7, headY - 3, 2, 2);
        ctx.fillRect(centerX + 5, headY - 3, 2, 2);
      }

      // =======================================================================
      // 4. MOVING PRESS HEAD (Hitbox: press.x, headY, 44, 16)
      // =======================================================================
      // Side guide shoes (x=214..218 and x=262..266, sliding along guide rails)
      ctx.fillStyle = "#222734";
      ctx.fillRect(press.x - 4, headY + 3, 4, 10);
      ctx.fillRect(press.x + press.w, headY + 3, 4, 10);
      ctx.fillStyle = "#505f78";
      ctx.fillRect(press.x - 4, headY + 3, 4, 1);
      ctx.fillRect(press.x + press.w, headY + 3, 4, 1);

      // Side steam/relief venting jets during warning
      if (warning && !model.reducedMotion) {
        const puffLen = 2 + (Math.floor(now * 14) % 3);
        ctx.fillStyle = "rgba(220, 235, 255, 0.65)";
        ctx.fillRect(press.x - 4 - puffLen, headY + 7, puffLen, 2);
        ctx.fillRect(press.x + press.w + 4, headY + 7, puffLen, 2);
      }

      // Head Main Body (44 x 16)
      // Glow aura during active closing or warning
      ctx.shadowColor = dangerous ? "#ff3624" : warning ? "#ffaa28" : "transparent";
      ctx.shadowBlur = dangerous ? 8 : warning ? 5 : 0;

      // Top Chamfer (height 2)
      ctx.fillStyle = dangerous ? "#5a1b18" : warning ? "#3e3220" : "#2a303e";
      ctx.fillRect(press.x, headY, press.w, 2);
      ctx.fillStyle = dangerous ? "#ff756a" : warning ? "#ffc864" : "#606f8a";
      ctx.fillRect(press.x, headY, press.w, 1); // top specular rim

      // Center Armor Face & Hazard Chevron Plate (height 10: headY+2 .. headY+12)
      ctx.fillStyle = dangerous ? "#361210" : "#1a1d26";
      ctx.fillRect(press.x, headY + 2, press.w, 10);

      // Angled Hazard Chevron Stripes
      const stripeColor = dangerous ? "#ff3d2e" : warning ? "#ffb236" : recovery ? "#b85c20" : "#8c6224";
      ctx.save();
      for (let sx = press.x + 3; sx < press.x + press.w - 3; sx += 8) {
        ctx.fillStyle = stripeColor;
        ctx.beginPath();
        ctx.moveTo(sx, headY + 11);
        ctx.lineTo(sx + 4, headY + 3);
        ctx.lineTo(sx + 6, headY + 3);
        ctx.lineTo(sx + 2, headY + 11);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // Shape-based downward warning arrows ▼ ▼ ▼
      ctx.save();
      const arrowActive = warning || dangerous;
      for (let i = 0; i < 3; i += 1) {
        const ax = centerX - 12 + i * 12;
        const ay = headY + 5;
        const arrowLit = arrowActive && (dangerous || ((Math.floor(now * 12) + i) % 3 === 0));
        ctx.fillStyle = arrowLit ? (dangerous ? "#ffffff" : "#fff2a0") : "rgba(30, 34, 46, 0.75)";
        ctx.beginPath();
        ctx.moveTo(ax - 3, ay);
        ctx.lineTo(ax + 3, ay);
        ctx.lineTo(ax, ay + 4);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // Side Warning Beacon Pods (x=219..222 and x=258..261, y=headY+4..headY+8)
      const beaconColor = dangerous
        ? "#ff2614"
        : warning
        ? (model.reducedMotion || Math.floor(now * 12) % 2 ? "#ffaa28" : "#804810")
        : "#44321c";
      ctx.fillStyle = beaconColor;
      ctx.fillRect(press.x + 1, headY + 4, 3, 4);
      ctx.fillRect(press.x + press.w - 4, headY + 4, 3, 4);
      ctx.fillStyle = dangerous || warning ? "#ffffff" : "#6a5438";
      ctx.fillRect(press.x + 2, headY + 5, 1, 2);
      ctx.fillRect(press.x + press.w - 3, headY + 5, 1, 2);

      // Bottom Crushing Strike Face (height 4: headY+12 .. headY+16)
      // This is the EXACT damaging surface!
      ctx.shadowBlur = 0;
      ctx.fillStyle = dangerous ? "#5e1a14" : "#262b36";
      ctx.fillRect(press.x, headY + 12, press.w, 4);

      // Bottom impact rim line
      if (dangerous) {
        // Incandescent friction heat danger line
        ctx.fillStyle = "#ff3624";
        ctx.fillRect(press.x, headY + 14, press.w, 2);
        ctx.fillStyle = "#fff0c0"; // bright hot core
        ctx.fillRect(press.x + 2, headY + 15, press.w - 4, 1);
      } else if (warning) {
        ctx.fillStyle = "#ffaa30";
        ctx.fillRect(press.x, headY + 15, press.w, 1);
      } else {
        ctx.fillStyle = "#8fa0ba"; // hardened steel edge
        ctx.fillRect(press.x, headY + 15, press.w, 1);
      }

      // Outer Structural Frame Border
      ctx.strokeStyle = "#10131a";
      ctx.lineWidth = 1;
      ctx.strokeRect(press.x + 0.5, headY + 0.5, press.w - 1, press.headHeight - 1);

      ctx.restore();
    }
  }

  resolveAnimationImage(prefix, state, frame, fallbackKey, secondaryPrefix = null) {
    const prefixKey = Array.isArray(prefix) ? prefix.join("|") : prefix;
    const cacheKey = `${this.renderScale > 1 ? 2 : 1}|${prefixKey}|${secondaryPrefix ?? ""}|${state}|${frame}|${fallbackKey}`;
    const cached = this.animationImageCache?.get(cacheKey);
    if (cached) return cached;

    const prefixCount = Array.isArray(prefix) ? prefix.length : 1;
    const totalPrefixes = prefixCount + (secondaryPrefix ? 1 : 0);
    const illustratedPasses = this.renderScale > 1 ? 2 : 1;
    for (let pass = 0; pass < illustratedPasses; pass += 1) {
      const illustrated = this.renderScale > 1 && pass === 0;
      for (let index = 0; index < totalPrefixes; index += 1) {
        const rawPrefix = index < prefixCount
          ? (Array.isArray(prefix) ? prefix[index] : prefix)
          : secondaryPrefix;
        const candidatePrefix = illustrated ? `${rawPrefix}.illustrated` : rawPrefix;
        for (let candidate = frame; candidate >= 0; candidate -= 1) {
          const key = frameKey(candidatePrefix, state, candidate);
          if (!this.images.has(key)) continue;
          const resolved = { image: this.images.get(key), assetKey: key };
          this.animationImageCache?.set(cacheKey, resolved);
          return resolved;
        }
        const legacyKey = `${candidatePrefix}.${state}`;
        if (this.images.has(legacyKey)) {
          const resolved = { image: this.images.get(legacyKey), assetKey: legacyKey };
          this.animationImageCache?.set(cacheKey, resolved);
          return resolved;
        }
      }
    }
    const resolved = { image: this.images.get(fallbackKey), assetKey: fallbackKey };
    this.animationImageCache?.set(cacheKey, resolved);
    return resolved;
  }

  drawMirrored(ctx, image, x, y, width, height, mirrored) {
    if (!image) {
      ctx.fillStyle = "#ff7a28";
      ctx.fillRect(x, y, width, height);
      return;
    }
    if (!mirrored) {
      ctx.drawImage(image, Math.round(x), Math.round(y), width, height);
      return;
    }
    ctx.save();
    ctx.translate(Math.round(x + width), Math.round(y));
    ctx.scale(-1, 1);
    ctx.drawImage(image, 0, 0, width, height);
    ctx.restore();
  }

  // Mantém um texto centralizado inteiramente dentro da área jogável.
  clampTextX(ctx, text, x, margin = 3) {
    const half = (ctx.measureText?.(text)?.width ?? 0) / 2;
    const min = margin + half;
    const max = WORLD.width - margin - half;
    if (min > max) return WORLD.width / 2;
    return Math.max(min, Math.min(max, x));
  }

  drawEffects(ctx, model, now = 0) {
    if (Array.isArray(model.effects)) {
      this.processedEffects ??= new WeakSet();
      for (const effect of model.effects) {
        if (!this.processedEffects.has(effect)) {
          this.processedEffects.add(effect);
          if (effect.kind === "hit") {
            this.spawnFloatingText("HIT", effect.x, effect.y, "hit");
          } else if (effect.kind === "damage" || effect.kind === "altarDamage") {
            this.spawnFloatingText("-1", effect.x, effect.y, "damage");
          } else if (effect.kind === "collect" || effect.kind === "soul") {
            this.spawnFloatingText("+1 SOUL", effect.x, effect.y, "soul");
          }
        }
      }
    }

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "7px 'Pixelify Sans'";
    for (const effect of model.effects) {
      const progress = 1 - effect.life / effect.duration;
      const alpha = Math.max(0, Math.min(1, effect.life / Math.min(effect.duration, 0.32)));
      ctx.globalAlpha = alpha;
      const color = effect.kind === "damage" || effect.kind === "altarDamage" || effect.kind === "contactAttack" ? "#ff5f6d"
        : effect.kind === "bonusTimePenalty" || effect.kind === "bonusCannonImpact" ? "#ff9b38"
        : effect.kind === "blockedShot" ? "#ffb14a" : effect.kind === "hit" ? "#ffb14a"
        : effect.kind === "powerUpCollect" ? "#ffaa33"
        : effect.kind === "heal" ? "#2ee6a8"
        : "#37e6ee";
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      const radius = 3 + progress * (effect.kind === "deposit" || effect.kind === "victory" ? 24
        : effect.kind === "pulseImpact" || effect.kind === "bonusCannonImpact" ? 5
        : effect.kind === "heal" ? 14 : 11);
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
      ctx.stroke();

      if (effect.kind === "heal") {
        ctx.save();
        const healRad = Math.max(1, 16 * (1 - progress));
        const glow = ctx.createRadialGradient(effect.x, effect.y, 0, effect.x, effect.y, healRad);
        glow.addColorStop(0, "rgba(46, 230, 168, 0.55)");
        glow.addColorStop(0.6, "rgba(55, 230, 238, 0.25)");
        glow.addColorStop(1, "rgba(46, 230, 168, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, healRad, 0, Math.PI * 2);
        ctx.fill();

        const vfxFrame = Math.min(3, Math.floor(progress * 4));
        const vfxImage = this.images?.get(`nilo.heal.${vfxFrame}`);
        if (vfxImage) {
          ctx.drawImage(vfxImage, Math.round(effect.x - 16), Math.round(effect.y - 16), 32, 32);
        }
        ctx.restore();
      }

      if (effect.kind === "collect" || effect.kind === "bonusCollect" || effect.kind === "powerUpCollect") {
        ctx.save();
        const glowRad = Math.max(1, (effect.kind === "powerUpCollect" ? 18 : 14) * (1 - progress));
        const glow = ctx.createRadialGradient(effect.x, effect.y, 0, effect.x, effect.y, glowRad);
        if (effect.kind === "powerUpCollect") {
          glow.addColorStop(0, "rgba(255, 170, 51, 0.60)");
          glow.addColorStop(0.5, "rgba(55, 230, 238, 0.35)");
          glow.addColorStop(1, "rgba(255, 170, 51, 0)");
        } else {
          glow.addColorStop(0, "rgba(55, 230, 238, 0.45)");
          glow.addColorStop(0.5, "rgba(174, 98, 255, 0.20)");
          glow.addColorStop(1, "rgba(55, 230, 238, 0)");
        }
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, glowRad, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (effect.kind === "powerUpCollect") {
        ctx.save();
        ctx.strokeStyle = "#ffcd50";
        ctx.lineWidth = 1;
        const sparkCount = model.reducedMotion ? 4 : 8;
        for (let i = 0; i < sparkCount; i++) {
          const a = (i * Math.PI * 2) / sparkCount + (model.reducedMotion ? 0 : progress * 2);
          const r1 = radius * 0.4;
          const r2 = radius * 1.3;
          ctx.beginPath();
          ctx.moveTo(effect.x + Math.cos(a) * r1, effect.y + Math.sin(a) * r1);
          ctx.lineTo(effect.x + Math.cos(a) * r2, effect.y + Math.sin(a) * r2);
          ctx.stroke();
        }
        ctx.restore();
      }

      if (effect.kind === "hit" || effect.kind === "damage" || effect.kind === "altarDamage") {
        ctx.save();
        ctx.strokeStyle = effect.kind === "hit" ? "#ffe090" : "#ff857a";
        ctx.lineWidth = 1;
        const sparkCount = model.reducedMotion ? 3 : 5;
        for (let i = 0; i < sparkCount; i++) {
          const a = (i * Math.PI * 2) / sparkCount + 0.3;
          const r1 = radius * 0.5;
          const r2 = radius * 1.35;
          ctx.beginPath();
          ctx.moveTo(effect.x + Math.cos(a) * r1, effect.y + Math.sin(a) * r1);
          ctx.lineTo(effect.x + Math.cos(a) * r2, effect.y + Math.sin(a) * r2);
          ctx.stroke();
        }
        ctx.restore();
      }
      const particleCount = effect.kind === "pulseImpact" ? (model.reducedMotion ? 2 : 4) : 5;
      for (let index = 0; index < particleCount; index += 1) {
        const angle = index * Math.PI * 2 / particleCount + (effect.kind === "pulseImpact" ? 0 : now * 0.8);
        ctx.fillRect(effect.x + Math.cos(angle) * radius - 1, effect.y + Math.sin(angle) * radius - 1, 2, 2);
      }
      if (effect.text) {
        ctx.save();
        const isPenalty = effect.kind === "bonusTimePenalty" || effect.text === "−1 s";
        const isHit = effect.kind === "hit";
        const isDamage = effect.kind === "damage" || effect.kind === "altarDamage";
        const isHeal = effect.kind === "heal";
        const isCollect = effect.kind === "collect";
        const isDeposit = effect.kind === "deposit";

        let displayText = effect.text;
        if (isHit && effect.text === "ACERTO") displayText = "−1";
        else if (isDamage && effect.text === "DANO") displayText = "−1";
        else if (isDamage && effect.text === "ALTAR ATINGIDO") displayText = "ALTAR −1";
        else if (isHeal && effect.text === "+1 VIDA") displayText = "+1";
        else if (isCollect && effect.text === "+1 CARREGADA") displayText = "+1";
        else if (isDeposit && effect.text.includes("NO ALTAR")) {
          const match = effect.text.match(/\+(\d+)/);
          if (match) displayText = `+${match[1]}`;
        }

        ctx.font = effect.kind === "blockedShot"
          ? "bold 8px system-ui, sans-serif"
          : isPenalty ? "bold 10px 'Pixelify Sans'"
            : (isHit || isDamage || isHeal ? "bold 9px 'Pixelify Sans'" : "bold 8px 'Pixelify Sans'");
        const textY = Math.max(10, effect.y - 12 - progress * 10);
        const textX = this.clampTextX(ctx, displayText, effect.x);
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#090711";
        ctx.strokeText(displayText, textX, textY);
        ctx.fillStyle = isPenalty ? "#ff5f51"
          : isHit ? "#ffe090"
          : isDamage ? "#ff5f51"
          : isHeal ? "#2ee6a8"
          : isCollect ? "#37e6ee"
          : isDeposit ? "#ffb14a"
          : color;
        ctx.fillText(displayText, textX, textY);
        ctx.restore();
      }
    }
    ctx.restore();

    const dt = this.lastEffectNow != null ? Math.max(0.001, Math.min(0.1, now - this.lastEffectNow)) : 0.016;
    this.lastEffectNow = now;
    this.drawFloatingCombatTexts(ctx, dt, now);
  }

  spawnFloatingText(text, x, y, style = "hit") {
    this.floatingCombatTexts ??= [];
    this.floatingCombatTextPool ??= [];
    const duration = 0.6;
    const drift = (Math.random() - 0.5) * 16;
    const item = this.floatingCombatTexts.length >= MAX_FLOATING_COMBAT_TEXTS
      ? this.floatingCombatTexts.shift()
      : (this.floatingCombatTextPool.pop() ?? {});
    item.text = String(text);
    item.x = Number(x) || 0;
    item.y = Number(y) || 0;
    item.startX = item.x;
    item.startY = item.y;
    item.vx = drift;
    item.vy = -28;
    item.style = style;
    item.life = duration;
    item.duration = duration;
    this.floatingCombatTexts.push(item);
  }

  drawFloatingCombatTexts(ctx, dt = 0.016, now = 0) {
    if (!this.floatingCombatTexts || this.floatingCombatTexts.length === 0) return;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 8px 'Pixelify Sans'";

    for (let i = this.floatingCombatTexts.length - 1; i >= 0; i--) {
      const item = this.floatingCombatTexts[i];
      item.life -= dt;
      if (item.life <= 0) {
        this.floatingCombatTexts.splice(i, 1);
        if (this.floatingCombatTextPool.length < MAX_FLOATING_COMBAT_TEXTS) {
          this.floatingCombatTextPool.push(item);
        }
        continue;
      }
      item.x += item.vx * dt;
      item.y += item.vy * dt;

      const alpha = Math.max(0, Math.min(1, item.life / item.duration));
      ctx.globalAlpha = alpha;

      const isSoul = item.style === "soul" || item.text.includes("SOUL");
      const isDamage = item.style === "damage" || item.text === "-1" || item.text === "−1";
      const isCombo = item.style === "combo";
      // Styles: "HIT" or "-1" in amber/red for enemies; "+1 SOUL" in cyan for
      // souls; sequência em âmbar-ouro, com corpo crescente conforme o elo.
      const textColor = isCombo ? "#ffd24a" : isSoul ? "#37e6ee" : isDamage ? "#ff5f51" : "#ffb14a";
      if (isCombo) {
        const magnitude = Math.min(5, Number(item.text.replace(/[^0-9]/g, "")) || 2);
        ctx.font = `bold ${7 + magnitude}px 'Pixelify Sans'`;
      } else {
        ctx.font = "bold 8px 'Pixelify Sans'";
      }

      const drawX = Math.round(this.clampTextX(ctx, item.text, item.x));
      const drawY = Math.round(Math.max(10, item.y));
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#090714";
      if (typeof ctx.strokeText === "function") {
        ctx.strokeText(item.text, drawX, drawY);
      }
      ctx.fillStyle = textColor;
      if (typeof ctx.fillText === "function") {
        ctx.fillText(item.text, drawX, drawY);
      }
    }
    ctx.restore();
  }

  drawCollisionDebug(ctx, model) {
    const box = (rect, color, label) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w, rect.h);
      ctx.setLineDash([]);
      ctx.fillStyle = color;
      ctx.font = "6px monospace";
      ctx.fillText(label, rect.x, Math.max(7, rect.y - 2));
    };
    ctx.save();
    for (const platform of model.platforms) box(platform, platform.oneWay ? "#37e6ee" : "#ff7a28", platform.oneWay ? "PLATAFORMA" : "PAREDE");
    if (model.bonusCannon) box(model.bonusCannon, "#ff9b38", `CANHÃO ${model.bonusCannon.phase}`);
    for (const press of model.presses) box({ x: press.x, y: press.y, w: press.w, h: press.headHeight }, press.phase === "closing" ? "#ff5f51" : "#ffb64a", `PRENSA ${press.phase}`);
    if (model.coopPreview && Array.isArray(model.players)) {
      for (const player of model.players) box(player, player.slot === 1 ? "#ff7a28" : "#2ee6a8", `P${player.slot} ${player.life}HP`);
    } else if (model.player) box(model.player, "#37e6ee", `JOGADOR ${model.player.life}HP`);
    if (model.altar) box(model.altar, "#ae62ff", `ALTAR ${model.altar.life}HP`);
    for (const enemy of model.enemies) box(enemy, "#ff5f6d", `${enemy.kind} ${enemy.id}`);
    if (model.powerUpPickup) box(model.powerUpPickup, "#ffb14a", `POWER-UP ${model.powerUpPickup.typeId}`);
    for (const shot of model.projectiles) {
      box(shot, shot.team === "player" ? "#ffb14a" : "#ff4f81", `${shot.team} ${shot.id}`);
      if (Number.isFinite(shot.previousX)) {
        ctx.strokeStyle = shot.team === "player" ? "rgba(255,177,74,.55)" : "rgba(255,79,129,.55)";
        ctx.beginPath();
        ctx.moveTo(shot.previousX + shot.w / 2, shot.previousY + shot.h / 2);
        ctx.lineTo(shot.x + shot.w / 2, shot.y + shot.h / 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // Medidor de sequência: só aparece a partir do segundo elo e esvazia em
  // tempo real, para que o jogador leia quanto resta da janela de combo.
  // Indicador da investida: recarrega junto do tempo de espera e acende em
  drawHudPanel(ctx, x, y, width, height, accent) {
    ctx.fillStyle = "rgba(5, 4, 10, 0.78)";
    ctx.fillRect(x + 3, y + 3, width, height);
    const glass = ctx.createLinearGradient(x, y, x, y + height);
    glass.addColorStop(0, "rgba(24, 19, 43, 0.94)");
    glass.addColorStop(1, "rgba(8, 6, 18, 0.92)");
    ctx.fillStyle = glass;
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
    ctx.globalAlpha = 0.32;
    ctx.fillStyle = accent;
    ctx.fillRect(x + 2, y + 2, width - 4, 1);
    ctx.globalAlpha = 1;
    ctx.fillStyle = accent;
    ctx.fillRect(x + 2, y + 4, 2, height - 8);
  }

  drawHudBanner(ctx, text, y, { danger = false, left = 0, right = WORLD.width } = {}) {
    if (typeof text !== "string" || !text.trim()) return false;
    ctx.save();
    ctx.font = "bold 7px 'Pixelify Sans'";
    ctx.textBaseline = "top";
    const regionLeft = Math.max(0, Math.min(WORLD.width, left));
    const regionRight = Math.max(regionLeft, Math.min(WORLD.width, right));
    const textWidth = Math.ceil(ctx.measureText(text).width);
    const width = Math.min(regionRight - regionLeft, 250, textWidth + 16);
    const x = Math.round(regionLeft + (regionRight - regionLeft - width) / 2);
    const accent = danger ? "#ff5f51" : "#37e6ee";
    const height = 12;
    // Fundo discreto só sob o texto, sem moldura: o acento à esquerda carrega
    // a leitura de urgência que o contorno fazia com muito mais tinta.
    ctx.fillStyle = danger ? "rgba(40, 6, 14, 0.78)" : "rgba(6, 5, 14, 0.7)";
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = accent;
    ctx.fillRect(x, y, 2, height);
    ctx.fillStyle = danger ? "#ffb14a" : "#fff5dc";
    ctx.textAlign = "center";
    ctx.fillText(text, x + 2 + (width - 2) / 2, y + 3);
    ctx.textAlign = "left";
    ctx.restore();
    return true;
  }

  isBossHudVisible(model) {
    const health = Number(model?.bossHealth);
    const maxHealth = Number(model?.bossMaxHealth);
    return model?.bossActive === true
      && Number.isFinite(health)
      && Number.isFinite(maxHealth)
      && maxHealth > 0;
  }

  drawHudEffectLine(ctx, indicators, x, y, width, owner = null) {
    if (!indicators?.length) return [];
    ctx.save();
    ctx.font = "bold 7px 'Pixelify Sans'";
    ctx.textBaseline = "top";
    let cursorX = x;
    let cursorY = y;
    let drawn = 0;
    for (let index = 0; index < indicators.length; index += 1) {
      const item = indicators[index];
      if (owner && item.owner !== owner) continue;
      const itemWidth = Math.max(1, Math.ceil(typeof ctx.measureText === "function"
        ? ctx.measureText(item.compact).width
        : String(item.compact).length * 4));
      if (cursorX > x && cursorX + itemWidth > x + width) {
        cursorX = x;
        cursorY += 9;
      }
      ctx.fillStyle = item.accent;
      ctx.fillText(item.compact, cursorX, cursorY);
      cursorX += itemWidth + 4;
      drawn += 1;
    }
    ctx.restore();
    return drawn;
  }

  drawHud(ctx, model, now) {
    if (model.coopPreview) {
      this.drawCoopHud(ctx, model, now);
      return;
    }
    if (model.gameMode === "bonus") {
      this.drawBonusHud(ctx, model);
      return;
    }
    if (model.gameMode === "survival") {
      this.drawSurvivalHud(ctx, model);
      return;
    }
    // ---------------------------------------------------------------------
    // HUD compacto (v0.7). Princípios aplicados:
    //  · Scrim no lugar de molduras: três painéis opacos viravam uma faixa de
    //    45 px de cromo sobre uma tela de 270 px. Um degradê sutil dá o mesmo
    //    contraste de leitura ocupando o espaço visual de quase nada.
    //  · Razão dado/tinta: rótulos que o ícone já diz ("VIDA", "ALTAR",
    //    "TEMPO") saem; ficam os próprios valores.
    //  · Exibição progressiva: sequência, investida e efeitos só aparecem
    //    quando estão acontecendo.
    //  · Três zonas fixas — estado à esquerda, objetivo ao centro, integridade
    //    à direita — para o olho sempre saber onde procurar.
    // Altura total: 22 px contra 45 px (87 px com os medidores) da versão
    // anterior.
    // ---------------------------------------------------------------------
    ctx.save();
    ctx.textBaseline = "top";

    const lowLife = model.player.life === 1;
    const altarCritical = model.altar.life === 1;
    const isSupport = model.characterId === "support";
    const bossHudVisible = this.isBossHudVisible(model);
    const effectIndicators = buildHudEffectIndicators(model);

    this.drawHudScrim(ctx, 34);

    // ---- Zona A: estado do jogador (esquerda) ----
    ctx.textAlign = "left";
    ctx.font = "bold 9px 'Pixelify Sans'";
    ctx.fillStyle = lowLife ? "#ff5f51" : "#fff5dc";
    ctx.fillText(lifePips(model.player.life, model.playerMaxLife), 30, 7);

    // ---- Zona B: objetivo (centro) — o número que decide a partida ----
    const goal = model.objective.soulsGoal || 15;
    const depositRatio = Math.max(0, Math.min(1, model.altar.deposited / goal));
    const barX = 170;
    const barW = 150;
    ctx.font = "bold 7px 'Pixelify Sans'";
    ctx.fillStyle = "rgba(255, 245, 220, 0.55)";
    ctx.fillText(t("hud.souls"), barX, 5);
    ctx.font = "bold 9px 'Pixelify Sans'";
    ctx.fillStyle = "#fff5dc";
    ctx.fillText(`${model.altar.deposited}/${goal}`, barX + 34, 4);
    if (model.carriedSouls > 0) {
      ctx.fillStyle = "#37e6ee";
      ctx.fillText(`+${model.carriedSouls}`, barX + 74, 4);
    }

    ctx.fillStyle = "rgba(5, 4, 10, 0.72)";
    ctx.fillRect(barX, 15, barW, 4);
    if (depositRatio > 0) {
      const fillW = Math.max(1, Math.round(barW * depositRatio));
      const fillGrad = ctx.createLinearGradient(barX, 0, barX + fillW, 0);
      fillGrad.addColorStop(0, "#20b2aa");
      fillGrad.addColorStop(1, "#8cf5fa");
      ctx.fillStyle = fillGrad;
      ctx.fillRect(barX, 15, fillW, 4);
    }
    // Carga em mãos: prolonga a barra em ciano translúcido, mostrando o quanto
    // o jogador ganha se chegar ao altar — informação que antes era só um
    // número solto.
    if (model.carriedSouls > 0 && depositRatio < 1) {
      const pendingRatio = Math.min(1, (model.altar.deposited + model.carriedSouls) / goal);
      const fromX = barX + barW * depositRatio;
      const toX = barX + barW * pendingRatio;
      ctx.fillStyle = "rgba(55, 230, 238, 0.38)";
      ctx.fillRect(fromX, 15, Math.max(1, toX - fromX), 4);
    }

    // ---- Zona C: integridade do altar + tempo (direita) ----
    ctx.textAlign = "right";
    ctx.font = "bold 9px 'Pixelify Sans'";
    const altarInk = altarCritical ? "#ff5f51" : "#ae62ff";
    const pips = lifePips(model.altar.life, model.objective.altarMaxLife, "▰", "▱");
    ctx.fillStyle = altarInk;
    ctx.fillText(pips, 472, 6);
    this.drawAltarGlyph(ctx, 472 - Math.ceil(ctx.measureText(pips).width) - 10, 6, altarInk, altarCritical, now);
    // O tempo é referência, não decisão: menor e mais apagado que tudo ao redor.
    ctx.font = "bold 6px 'Pixelify Sans'";
    ctx.fillStyle = "rgba(255, 177, 74, 0.52)";
    ctx.fillText(formatHudTime(model.elapsed), 472, 18);
    ctx.textAlign = "left";

    // ---- Linha secundária: só o que estiver ativo agora ----
    let chipX = 30;
    chipX = this.drawWeaponChip(ctx, model, now, chipX, 19);
    chipX = this.drawComboChip(ctx, model, now, chipX, 19);
    chipX = this.drawDashChip(ctx, model, chipX, 19);
    if (effectIndicators.length) {
      this.drawHudEffectLine(ctx, effectIndicators, chipX, 19, Math.max(20, 150 - chipX), "P1");
    }

    const noticeText = resolveHudNotice(model.notice);
    if (noticeText || altarCritical) {
      const text = altarCritical
        ? "ALTAR EM PERIGO — 1 IMPACTO PARA CAIR"
        : noticeText;
      this.drawHudBanner(ctx, text, bossHudVisible ? 62 : 36, { danger: altarCritical, left: 152, right: 472 });
    } else if (model.elapsed < 7) {
      this.drawHudBanner(ctx, t("hud.tutorial"), bossHudVisible ? 62 : 36, { left: 152, right: 472 });
    } else if (model.canDeposit()) {
      ctx.textAlign = "center";
      ctx.font = "bold 9px 'Pixelify Sans'";
      ctx.fillStyle = `rgba(255, 177, 74, ${0.72 + Math.sin(now * 5) * 0.2})`;
      ctx.fillText(t("hud.deposit"), WORLD.width / 2, 251);
    }
    if (bossHudVisible) {
      this.drawBossHealthBar(ctx, model, now);
    }
    ctx.restore();
  }

  // Degradê de leitura no topo: substitui as três molduras opacas.
  // Marca do altar: obelisco de 7x8 que identifica a zona de integridade sem
  // gastar uma palavra. Pulsa apenas no estado crítico, onde o alarme importa.
  drawAltarGlyph(ctx, x, y, color, critical, now = 0) {
    ctx.save();
    ctx.globalAlpha = critical ? 0.7 + Math.sin(now * 8) * 0.3 : 0.85;
    ctx.fillStyle = color;
    ctx.fillRect(x + 2, y, 3, 2);        // topo
    ctx.fillRect(x + 1, y + 2, 5, 5);    // corpo
    ctx.fillRect(x, y + 7, 7, 1);        // base
    ctx.restore();
  }

  drawHudScrim(ctx, height = 34) {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, "rgba(6, 5, 14, 0.82)");
    grad.addColorStop(0.65, "rgba(6, 5, 14, 0.45)");
    grad.addColorStop(1, "rgba(6, 5, 14, 0)");
    ctx.save();
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, WORLD.width, height);
    ctx.restore();
  }

  // Arma empunhada: nome curto + munição restante, com a cor da própria arma.
  // Aparece apenas enquanto houver arma — exibição progressiva.
  drawWeaponChip(ctx, model, now, x, y) {
    const held = model.player?.weapon;
    const config = held ? WEAPONS[held.id] : null;
    if (!config) return x;
    const label = `${config.short} ${held.ammo}`;
    ctx.save();
    ctx.font = "bold 8px 'Pixelify Sans'";
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    const width = Math.ceil(ctx.measureText(label).width) + 8;
    const low = held.ammo <= 1 || held.remaining <= 3;
    ctx.globalAlpha = low ? 0.6 + Math.sin(now * 10) * 0.35 : 1;
    ctx.fillStyle = "rgba(6, 5, 14, 0.7)";
    ctx.fillRect(x, y, width, 10);
    ctx.fillStyle = config.accent;
    ctx.fillRect(x, y, 2, 10);
    // Traço inferior = tempo de posse restante.
    const ratio = Math.max(0, Math.min(1, held.remaining / held.holdSeconds));
    ctx.fillRect(x, y + 9, Math.max(1, Math.round(width * ratio)), 1);
    ctx.fillText(label, x + 5, y + 1);
    ctx.restore();
    return x + width + 4;
  }

  // Sequência: aparece só a partir do segundo elo. Retorna o X seguinte.
  drawComboChip(ctx, model, now, x, y) {
    const combo = model.combo ?? 0;
    if (combo < 2) return x;
    const ratio = typeof model.comboRatio === "function" ? model.comboRatio() : 0;
    const label = `x${combo}`;
    ctx.save();
    ctx.font = "bold 8px 'Pixelify Sans'";
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    const width = Math.max(16, Math.ceil(ctx.measureText(label).width) + 6);
    ctx.fillStyle = "rgba(255, 210, 74, 0.16)";
    ctx.fillRect(x, y, width, 10);
    ctx.fillStyle = "rgba(255, 210, 74, 0.9)";
    ctx.fillRect(x, y + 9, Math.max(1, Math.round(width * ratio)), 1);
    ctx.fillStyle = combo % REMASTER.combo.soulBonusEvery === 0 ? "#fff5dc" : "#ffd24a";
    ctx.fillText(label, x + 3, y + 1);
    ctx.restore();
    return x + width + 4;
  }

  // Investida: aparece só enquanto recarrega — pronta, não ocupa espaço.
  drawDashChip(ctx, model, x, y) {
    const cooldown = model.player?.dashCooldown ?? 0;
    if (cooldown <= 0) return x;
    const ratio = Math.max(0, Math.min(1, 1 - cooldown / REMASTER.dash.cooldown));
    const width = 22;
    ctx.save();
    ctx.fillStyle = "rgba(55, 230, 238, 0.16)";
    ctx.fillRect(x, y, width, 10);
    ctx.fillStyle = "rgba(55, 230, 238, 0.85)";
    ctx.fillRect(x + 2, y + 4, Math.max(1, Math.round((width - 4) * ratio)), 3);
    ctx.restore();
    return x + width + 4;
  }

  drawCoopHud(ctx, model, now) {
    if (model.coopSurvival) {
      this.drawCoopSurvivalHud(ctx, model);
      return;
    }
    const [p1, p2] = model.players ?? [];
    if (!p1 || !p2 || !model.altar) return;
    const effectIndicators = buildHudEffectIndicators(model);
    ctx.save();
    ctx.font = "bold 7px 'Pixelify Sans'";
    ctx.textBaseline = "top";

    this.drawHudPanel(ctx, 6, 6, 112, 37, p1.inactive ? "#ff5f51" : "#ff7a28");
    ctx.fillStyle = p1.inactive ? "#ff5f51" : "#ff7a28";
    ctx.fillText("P1 BOYPUNK", 12, 10);
    ctx.fillStyle = "#fff5dc";
    ctx.fillText(p1.inactive ? "INATIVO" : `VIDA ${lifePips(p1.life, model.playerMaxLife)}`, 12, 20);
    ctx.fillText(`CARGA ${p1.carriedSouls}`, 12, 30);
    this.drawHudEffectLine(ctx, effectIndicators, 66, 30, 46, "P1");

    this.drawHudPanel(ctx, 122, 6, 142, 37, p2.inactive ? "#ff5f51" : "#2ee6a8");
    ctx.fillStyle = p2.inactive ? "#ff5f51" : "#2ee6a8";
    ctx.fillText("P2 NILO", 128, 10);
    ctx.fillStyle = "#fff5dc";
    ctx.fillText(p2.inactive ? "INATIVO" : `VIDA ${lifePips(p2.life, model.playerMaxLife)}`, 128, 20);
    ctx.fillText(`CARGA ${p2.carriedSouls}`, 128, 30);
    this.drawHudEffectLine(ctx, effectIndicators, 186, 30, 72, "P2");

    const altarCritical = model.altar.life === 1;
    this.drawHudPanel(ctx, 268, 6, 206, 37, altarCritical ? "#ff5f51" : "#37e6ee");
    ctx.fillStyle = altarCritical ? "#ff5f51" : "#37e6ee";
    ctx.fillText(`ALTAR ${lifePips(model.altar.life, model.objective.altarMaxLife, "▰", "▱")}`, 274, 10);
    ctx.fillStyle = "#fff5dc";
    ctx.fillText(`ALMAS ${model.altar.deposited}/${model.objective.soulsGoal}`, 274, 20);
    ctx.fillStyle = "#ffb14a";
    ctx.fillText(`TEMPO ${formatHudTime(model.elapsed)}`, 374, 20);
    const ratio = Math.max(0, Math.min(1, model.altar.deposited / model.objective.soulsGoal));
    ctx.fillStyle = "rgba(255,245,220,.15)";
    ctx.fillRect(274, 31, 192, 5);
    ctx.fillStyle = "#37e6ee";
    ctx.fillRect(275, 32, Math.round(190 * ratio), 3);

    const bossHudVisible = this.isBossHudVisible(model);
    const noticeText = resolveHudNotice(model.notice);
    if (noticeText || altarCritical) {
      const text = altarCritical ? "ALTAR EM PERIGO" : noticeText;
      this.drawHudBanner(ctx, text, bossHudVisible ? 77 : 48, { danger: altarCritical });
    } else if (model.elapsed < 7 && model.state === "playing") {
      this.drawHudBanner(ctx, "P1 TECLADO/CONTROLE · P2 CONTROLE · E/△ DEPOSITA", bossHudVisible ? 77 : 48);
    } else if (model.canDeposit()) {
      this.drawHudBanner(ctx, "DEPÓSITO DISPONÍVEL NO ALTAR", 246);
    }
    if (bossHudVisible) {
      this.drawBossHealthBar(ctx, model, now);
    }
    ctx.restore();
  }

  drawSurvivalHud(ctx, model) {
    ctx.save();
    ctx.font = "bold 9px 'Pixelify Sans'";
    ctx.textBaseline = "top";
    const lowLife = model.player.life === 1;
    const isSupport = model.characterId === "support";
    const effectIndicators = buildHudEffectIndicators(model);
    this.drawHudPanel(ctx, 8, 7, 142, 38, lowLife ? "#ff5f51" : "#ae62ff");
    ctx.fillStyle = isSupport ? "#2ee6a8" : "#ff7a28";
    ctx.fillText(isSupport ? "NILO" : "BOYPUNK", 15, 10);
    ctx.fillStyle = lowLife ? "#ff5f51" : "#fff5dc";
    ctx.fillText(`${t("survival.health")} ${lifePips(model.player.life, model.playerMaxLife)}`, 15, 21);
    this.drawHudEffectLine(ctx, effectIndicators, 15, 34, 130, "P1");

    this.drawHudPanel(ctx, 156, 7, 130, 38, "#37e6ee");
    ctx.fillStyle = "#37e6ee";
    ctx.fillText(t("survival.waveLabel"), 163, 12);
    ctx.fillStyle = "#fff5dc";
    ctx.fillText(String(model.survivalWave), 163, 25);

    this.drawHudPanel(ctx, 292, 7, 180, 38, "#ffb14a");
    ctx.fillStyle = "#ffb14a";
    ctx.fillText(t("survival.timeLabel"), 299, 12);
    ctx.fillStyle = "#fff5dc";
    ctx.fillText(formatHudTime(model.elapsed), 299, 25);

    const noticeText = resolveHudNotice(model.notice);
    if (noticeText) {
      this.drawHudBanner(ctx, noticeText, 51);
    }
    ctx.restore();
  }

  drawCoopSurvivalHud(ctx, model) {
    const [p1, p2] = model.players ?? [];
    if (!p1 || !p2) return;
    const indicators = buildHudEffectIndicators(model);
    ctx.save();
    ctx.font = "bold 7px 'Pixelify Sans'";
    ctx.textBaseline = "top";

    this.drawHudPanel(ctx, 6, 6, 132, 38, p1.inactive ? "#ff5f51" : "#ff7a28");
    ctx.fillStyle = p1.inactive ? "#ff5f51" : "#ff7a28";
    ctx.fillText("P1 BOYPUNK", 12, 10);
    ctx.fillStyle = "#fff5dc";
    ctx.fillText(p1.inactive ? "INATIVO" : `VIDA ${lifePips(p1.life, model.playerMaxLife)}`, 12, 20);
    this.drawHudEffectLine(ctx, indicators, 12, 32, 120, "P1");

    this.drawHudPanel(ctx, 142, 6, 132, 38, p2.inactive ? "#ff5f51" : "#2ee6a8");
    ctx.fillStyle = p2.inactive ? "#ff5f51" : "#2ee6a8";
    ctx.fillText("P2 NILO", 148, 10);
    ctx.fillStyle = "#fff5dc";
    ctx.fillText(p2.inactive ? "INATIVO" : `VIDA ${lifePips(p2.life, model.playerMaxLife)}`, 148, 20);
    this.drawHudEffectLine(ctx, indicators, 148, 32, 120, "P2");

    this.drawHudPanel(ctx, 278, 6, 196, 38, "#37e6ee");
    ctx.fillStyle = "#37e6ee";
    ctx.fillText(`${t("survival.waveLabel")} ${model.survivalWave}`, 284, 11);
    ctx.fillStyle = "#ffb14a";
    ctx.fillText(`${t("survival.timeLabel")} ${formatHudTime(model.elapsed)}`, 284, 24);
    const noticeText = resolveHudNotice(model.notice);
    if (noticeText) {
      this.drawHudBanner(ctx, noticeText, 51);
    }
    ctx.restore();
  }

  drawBonusHud(ctx, model) {
    ctx.save();
    ctx.font = "bold 9px 'Pixelify Sans'";
    ctx.textBaseline = "top";
    const lowTime = model.bonusRemaining < 5;
    const lowLife = model.player.life === 1;
    const effectIndicators = buildHudEffectIndicators(model);
    this.drawHudPanel(ctx, 8, 7, 214, 38, lowTime ? "#ff5f51" : "#ffb14a");
    ctx.fillStyle = "#ffb14a";
    ctx.fillText(model.bonusPreview ? "CÂMARA · PRÉVIA" : "CÂMARA DE ENERGIA", 15, 10);
    ctx.fillStyle = lowTime ? "#ff5f51" : "#fff5dc";
    ctx.fillText(`TEMPO ${Math.max(0, model.bonusRemaining).toFixed(1)}s`, 15, 22);
    ctx.fillStyle = lowLife ? "#ff5f51" : "#fff5dc";
    ctx.fillText(`VIDA ${lifePips(model.player.life, model.playerMaxLife)}`, 112, 22);
    this.drawHudEffectLine(ctx, effectIndicators, 15, 34, 200, "P1");

    this.drawHudPanel(ctx, 228, 7, 116, 38, "#37e6ee");
    ctx.fillStyle = "#37e6ee";
    ctx.fillText("ALMAS BÔNUS", 235, 12);
    ctx.fillStyle = "#fff5dc";
    ctx.fillText(`${model.bonusCollected}/${BONUS_RULES.totalSouls}`, 235, 27);

    this.drawHudPanel(ctx, 350, 7, 122, 38, "#ae62ff");
    ctx.fillStyle = "#ae62ff";
    ctx.fillText("PONTOS", 357, 12);
    ctx.fillStyle = "#fff5dc";
    ctx.fillText(String(calculateBonusScore(model.bonusCollected)), 357, 27);
    const noticeText = resolveHudNotice(model.notice);
    if (noticeText) {
      this.drawHudBanner(ctx, noticeText, 51);
    }
    ctx.restore();
  }

  drawVictoryCelebration(ctx, model, now = 0) {
    if (model?.reducedMotion) return;
    ctx.save();
    const particleCount = 65;
    for (let i = 0; i < particleCount; i++) {
      const speed = 45 + (i % 5) * 22;
      const xBase = (i * 29.7) % WORLD.width;
      const wobble = Math.sin(now * 2.5 + i * 1.8) * 14;
      const x = (xBase + wobble + WORLD.width) % WORLD.width;
      const y = WORLD.height - ((now * speed + i * 23.3) % (WORLD.height + 40));
      const size = 2 + (i % 3) * 1.5;
      const rot = now * 3 + i;

      const color = i % 3 === 0
        ? "rgba(55, 230, 238, 0.85)"
        : i % 3 === 1
        ? "rgba(255, 210, 80, 0.85)"
        : "rgba(174, 98, 255, 0.85)";

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.fillStyle = color;
      ctx.fillRect(-size / 2, -size / 2, size, size);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-0.5, -0.5, 1, 1);
      ctx.restore();
    }
    ctx.restore();
  }

  drawDefeatDecay(ctx, model, now = 0) {
    ctx.save();
    if (typeof ctx.createRadialGradient === "function" && typeof ctx.fillRect === "function") {
      const pulse = model?.reducedMotion ? 0.6 : 0.55 + Math.sin(now * 6) * 0.15;
      const vignette = ctx.createRadialGradient(WORLD.width / 2, WORLD.height / 2, 40, WORLD.width / 2, WORLD.height / 2, WORLD.width / 2);
      vignette.addColorStop(0, "rgba(8, 6, 16, 0.25)");
      vignette.addColorStop(0.65, `rgba(140, 15, 35, ${pulse * 0.5})`);
      vignette.addColorStop(1, `rgba(200, 10, 30, ${pulse * 0.85})`);
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    }

    if (!model?.reducedMotion && typeof ctx.fillRect === "function") {
      const tearCount = 4;
      for (let i = 0; i < tearCount; i++) {
        const tearY = (i * 68 + Math.floor(now * 120)) % WORLD.height;
        const tearH = 2 + (i % 3) * 2;
        ctx.fillStyle = i % 2 === 0 ? "rgba(255, 30, 60, 0.35)" : "rgba(140, 10, 25, 0.28)";
        ctx.fillRect(0, tearY, WORLD.width, tearH);
      }
    }
    ctx.restore();
  }
}

