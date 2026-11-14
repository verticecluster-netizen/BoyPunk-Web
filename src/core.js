import { BALANCE, DEFAULT_DIFFICULTY, DIFFICULTIES, POWER_UPS, normalizeDifficulty, DEFAULT_CHARACTER, CHARACTERS, normalizeCharacter, resolveCharacter, resolveWeaponAnchor } from "./config.js";
import { getLevelDefinition, WORLD } from "./level-data.js";
import { advanceAnimationClock, chaserAnimationState, playerAnimationState } from "./animation.js";
import { BONUS_CANNON_RULES, BONUS_COMBAT_RULES, BONUS_RULES, calculateBonusScore } from "./bonus.js";

const EPSILON = 0.01;

/* --------------------------------------------------------------------------
 * Remasterização v0.7.0 — parâmetros autoritativos de impacto e dinâmica.
 * Todos os tempos em segundos e velocidades em px/s, no mesmo contrato das
 * demais tabelas de balanceamento.
 * ------------------------------------------------------------------------ */
const HIT_STOP_STATES = new Set(["playing", "survival", "bonusPlaying"]);

// Tempo máximo que um atirador pode ficar com a mira recusada antes de se
// retirar, em vez de ocupar o orçamento do encontro para sempre.
const SHOOTER_MAX_BLOCKED_AIM_SECONDS = 6;

const REMASTER = Object.freeze({
  hitStop: Object.freeze({
    enemyHit: 0.035,      // Congelamento curto ao conectar dano em inimigo
    enemyKill: 0.07,      // Congelamento mais longo na derrota confirmada
    playerHit: 0.09,      // Congelamento ao jogador receber dano
    maximum: 0.1          // Teto absoluto; impede acúmulo em multi-acerto
  }),
  knockback: Object.freeze({
    hit: 118,             // Impulso horizontal por acerto não letal
    kill: 215,            // Impulso na derrota (sem efeito de balanceamento)
    decaySpeed: 980,      // Desaceleração do recuo (px/s²)
    aiSuppress: 0.075     // Janela em que a IA não retoma o controle. Calibrada
                          // para manter o acerto legível sem anular o ciclo de
                          // contato do perseguidor.
  }),
  combo: Object.freeze({
    windowSeconds: 3.2,   // Tempo máximo entre derrotas para manter a sequência
    soulBonusEvery: 3,    // A cada N derrotas encadeadas, uma alma extra cai
    shakeStep: 0.35,      // Incremento de tremor por elo da sequência
    maxDisplay: 99
  }),
  dash: Object.freeze({
    speed: 332,           // Velocidade da investida
    duration: 0.16,       // ~53 px de deslocamento
    // Tempo de espera calibrado para que a invulnerabilidade da esquiva fique
    // em torno de 20% do tempo de jogo mesmo com o comando repetido sem pausa.
    cooldown: 0.72,
    // Janela do toque duplo. Medida em tempo de simulação, precisa cobrir com
    // folga a duração de um quadro em aparelhos lentos: a 30 FPS (ou menos, em
    // celular), dois toques legítimos caíam fora de uma janela de 0,22 s e a
    // investida simplesmente não saía.
    doubleTapWindow: 0.34,
    // A esquiva cobre apenas os quadros iniciais da investida: a cauda do
    // movimento é vulnerável. Isso transforma a investida numa janela de
    // sincronia, e não num escudo contínuo — com o comando repetido sem pausa,
    // a invulnerabilidade fica em ~17% do tempo, contra ~38% da calibragem
    // anterior, que anulava a dificuldade do encontro.
    invulnerability: 0.12,
    ghostInterval: 0.022
  }),
  shake: Object.freeze({
    decayPerSecond: 26,   // Decaimento por tempo real (antes era por quadro)
    maximum: 7
  }),
  ai: Object.freeze({
    advanceSpeedMultiplier: 0.62,  // Marcha sobre o altar: lenta o bastante
                                   // para o jogador interceptar a tempo
    huntSpeedMultiplier: 1.08,     // Caçadores vêm atrás e vêm com vontade
    maxSiege: 2,                   // Quantos podem sitiar o altar ao mesmo
                                   // tempo; o excedente caça o jogador
    siegeDwellSeconds: 3.4,        // Parado junto ao objetivo por este tempo
                                   // sem conseguir dano = vira caçador
    siegeDwellRadius: 46,          // Distância do objetivo que conta como
                                   // "já chegou"
    aggressionRampSeconds: 22,     // Tempo de vida para atingir a agressão
                                   // máxima; impede confronto estagnado
    aggressionMaxBonus: 0.3,       // Acréscimo máximo de velocidade (+30%)
    descentThreshold: 26,          // Desnível que caracteriza "alvo abaixo"
    descentProbeSeconds: 0.3,      // Intervalo entre buscas de borda (custo)
    descentProbeRange: 190,        // Alcance lateral da busca por borda
    ascentThreshold: 26,           // Desnível que caracteriza "alvo acima"
    routeCommitSeconds: 2.6,       // Compromisso com a rota escolhida. Sem ele
                                   // o inimigo reavaliava na beira e oscilava.
    ascentJumpCooldown: 0.45,      // Intervalo entre saltos de subida
    stuckSeconds: 1.1,             // Sem progresso horizontal por este tempo…
    stuckSpeed: 6,                 // …com velocidade abaixo disto = travado
    unstickSeconds: 0.5,           // Duração da manobra de desencalhe
    altarSpread: 26                // Dispersão lateral para não empilharem
  }),
  squash: Object.freeze({
    landSpeed: 180,       // Velocidade de queda mínima para achatar no pouso
    decayPerSecond: 7,
    jumpStretch: -0.6
  })
});
const FLOATING_POWER_UP_DEFINITIONS = Object.freeze([
  Object.freeze({ powerUpType: "rapid-fire", x: 96, y: 220, w: 20, h: 20, groundY: 240 }),
  Object.freeze({ powerUpType: "health", x: 264, y: 220, w: 20, h: 20, groundY: 240 }),
  Object.freeze({ powerUpType: "shield", x: 388, y: 220, w: 20, h: 20, groundY: 240 })
]);
const WEAPON_DROP_PREFIX = "weapon-";

const WEAPONS = Object.freeze({
  "scatter-coil": Object.freeze({
    id: "scatter-coil",
    nameKey: "weapon.scatterCoil.name",
    short: "DISPERSOR",
    accent: "#ff9b38",
    ammo: 8,                 // Disparos antes de quebrar
    holdSeconds: 22,         // Tempo máximo empunhada, mesmo sem atirar
    cooldown: 0.42,
    mode: "spread",
    pellets: 3,              // Três projéteis em leque
    spreadDegrees: 13,
    shotSpeed: 290,
    damage: 1,
    knockback: 190
  }),
  "rail-lance": Object.freeze({
    id: "rail-lance",
    nameKey: "weapon.railLance.name",
    short: "LANÇA",
    accent: "#37e6ee",
    ammo: 5,
    holdSeconds: 20,
    cooldown: 0.72,
    mode: "beam",            // Feixe instantâneo que atravessa a fileira
    beamHeight: 10,
    damage: 2,
    knockback: 120
  }),
  "grav-maul": Object.freeze({
    id: "grav-maul",
    nameKey: "weapon.gravMaul.name",
    short: "MARRETA",
    accent: "#ae62ff",
    ammo: 6,
    holdSeconds: 24,
    cooldown: 0.56,
    mode: "slam",            // Corpo a corpo em área, sem projétil
    radius: 46,
    damage: 2,
    knockback: 260
  })
});

const WEAPON_IDS = Object.freeze(Object.keys(WEAPONS));

const WEAPON_DROP_RULES = Object.freeze({
  firstDropSeconds: 7,     // A primeira arma cai depois da fase de aprendizado
  respawnSeconds: 16,      // Cada ponto repõe neste intervalo após ser pego
  width: 18,
  height: 18,
  bobAmplitude: 2.5
});

const RAPID_FIRE_DURATION_SECONDS = 10;
const RAPID_FIRE_COOLDOWN_MULTIPLIER = 0.5;
const SURVIVAL_SUPPORT_PICKUPS = Object.freeze([
  Object.freeze({ spawnId: "survival-rapid-fire", powerUpType: "rapid-fire", x: 96, y: 220, w: 20, h: 20, groundY: 240 }),
  Object.freeze({ spawnId: "survival-health", powerUpType: "health", x: 264, y: 220, w: 20, h: 20, groundY: 240 }),
  Object.freeze({ spawnId: "survival-shield", powerUpType: "shield", x: 388, y: 220, w: 20, h: 20, groundY: 240 }),
  Object.freeze({ spawnId: "survival-double-burst", powerUpType: "double-burst", x: 180, y: 160, w: 16, h: 16, groundY: 176 })
]);
const BLOCKED_SHOT_FEEDBACK = Object.freeze({
  durationSeconds: 0.34,
  mergeRadius: 24
});
export const CHASER_STATES = Object.freeze({
  PATROL: "patrol",
  ADVANCE: "advance",   // Marcha sobre o altar
  HUNT: "hunt",         // Procura o jogador em qualquer distância
  CHASE: "chase"        // Jogador à vista e ao alcance
});

const CHASER_ROLES = Object.freeze({ SIEGE: "siege", HUNTER: "hunter" });

export function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function sweptAabb(moving, dx, dy, target) {
  if (overlaps(moving, target)) return 0;
  let enterX = -Infinity;
  let exitX = Infinity;
  let enterY = -Infinity;
  let exitY = Infinity;
  if (dx > 0) {
    enterX = (target.x - (moving.x + moving.w)) / dx;
    exitX = (target.x + target.w - moving.x) / dx;
  } else if (dx < 0) {
    enterX = (target.x + target.w - moving.x) / dx;
    exitX = (target.x - (moving.x + moving.w)) / dx;
  } else if (moving.x + moving.w <= target.x || moving.x >= target.x + target.w) return null;
  if (dy > 0) {
    enterY = (target.y - (moving.y + moving.h)) / dy;
    exitY = (target.y + target.h - moving.y) / dy;
  } else if (dy < 0) {
    enterY = (target.y + target.h - moving.y) / dy;
    exitY = (target.y - (moving.y + moving.h)) / dy;
  } else if (moving.y + moving.h <= target.y || moving.y >= target.y + target.h) return null;
  const entry = Math.max(enterX, enterY);
  const exit = Math.min(exitX, exitY);
  if (entry > exit || exit < 0 || entry > 1) return null;
  return Math.max(0, entry);
}

function approach(value, target, amount) {
  if (value < target) return Math.min(value + amount, target);
  if (value > target) return Math.max(value - amount, target);
  return target;
}

function center(entity) {
  return { x: entity.x + (entity.w ?? 0) / 2, y: entity.y + (entity.h ?? 0) / 2 };
}

function distanceBetween(a, b) {
  const dx = a.x + (a.w ?? 0) / 2 - b.x - (b.w ?? 0) / 2;
  const dy = a.y + (a.h ?? 0) / 2 - b.y - (b.h ?? 0) / 2;
  return Math.hypot(dx, dy);
}

function snapshotPrevious(entity) {
  const previous = entity.previous ?? (entity.previous = { x: 0, y: 0, w: 0, h: 0 });
  previous.x = entity.x;
  previous.y = entity.y;
  previous.w = entity.w;
  previous.h = entity.h;
}

function compactRemovedInPlace(items) {
  let write = 0;
  for (let read = 0; read < items.length; read += 1) {
    const item = items[read];
    if (!item.removed) items[write++] = item;
  }
  items.length = write;
}

function compactLivingEffectsInPlace(items) {
  let write = 0;
  for (let read = 0; read < items.length; read += 1) {
    const item = items[read];
    if (item.life > 0) items[write++] = item;
  }
  items.length = write;
}

function applyDifficultyToEncounter(encounter, difficulty) {
  const tuning = difficulty.encounter;
  return {
    ...encounter,
    openingDelay: encounter.openingDelay * tuning.openingDelayMultiplier,
    maxEnemies: Math.max(1, encounter.maxEnemies + tuning.maxEnemiesDelta),
    maxProjectiles: Math.max(1, encounter.maxProjectiles + tuning.maxProjectilesDelta),
    phases: encounter.phases.map((phase) => ({
      ...phase,
      budget: Math.max(1, phase.budget + tuning.budgetDelta),
      maxEnemies: Math.max(1, phase.maxEnemies + tuning.maxEnemiesDelta),
      maxEnemyShots: Math.max(0, phase.maxEnemyShots + tuning.maxEnemyShotsDelta),
      spawnInterval: Math.max(0.4, phase.spawnInterval * tuning.spawnIntervalMultiplier)
    }))
  };
}

export class GameModel {
  constructor({ random = Math.random, debug = false, reducedMotion = false } = {}) {
    this.random = random;
    this.debug = Boolean(debug);
    this.reducedMotion = Boolean(reducedMotion);
    this.difficultyId = DEFAULT_DIFFICULTY;
    this.difficulty = DIFFICULTIES[DEFAULT_DIFFICULTY];
    this.playerMaxLife = this.difficulty.playerMaxLife;
    this.configureLevel(BALANCE.levels.currentId);
    this.damageDiagnostics = [];
    this.nextEntityNumber = 0;
    this.state = "menu";
    this.gameMode = "campaign";
    this.demoMode = false;
    this.progressionEligible = false;
    this.bonusQualificationEligible = false;
    this.runId = 0;
    this.events = [];
    this.elapsed = 0;
    this.defeatReason = "";
    this.player = null;
    this.altar = null;
    this.enemies = [];
    this.projectiles = [];
    this.souls = [];
    this.effects = [];
    this.defeatVisuals = [];
    this.presses = [];
    this.powerUps = [];
    this.powerUpPickup = null;
    this.activePowerUp = null;
    this.pendingPlayerShots = [];
    this.meleeHitbox = { x: 0, y: 0, w: 26, h: 20 };
    // Remasterização v0.7.0: impacto, sequência de derrotas e pedido de tremor.
    this.beamFlashes = [];
    this.slamRings = [];
    this.weaponDrops = [];
    this.weaponSpawns = [];
    this.hitStop = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.comboBest = 0;
    this.shakeRequest = 0;
    this.projectileStartRect = { x: 0, y: 0, w: 0, h: 0 };
    this.projectileImpactScratch = { time: 0, priority: 0, type: "", target: null };
    this.powerUpSpawnResolved = false;
    this.supportPickupSpawns = [];
    this.renderer = null;
    this.terminalResult = null;
    this.defeatPresentationRemaining = 0;
    this.victoryPresentationRemaining = 0;
    this.completedRun = null;
    this.bonusQualification = null;
    this.bonusTransitionRemaining = 0;
    this.bonusOriginStats = null;
    this.bonusRemaining = 0;
    this.bonusCollected = 0;
    this.bonusResult = null;
    this.bonusPreview = false;
    this.patrolShooterPreview = false;
    this.bonusCannon = null;
    this.bonusHitProtection = 0;
    this.bonusEnemySpawns = [];
    this.survivalWave = 0;
    this.survivalWaveDelay = null;
    this.survivalEnemySpeedMultiplier = 1;
    this.survivalResult = null;
    this.notice = null;
    this.characterId = DEFAULT_CHARACTER;
    this.character = resolveCharacter(this.characterId, this.playerMaxLife);
    this.clearTransientCharacterState();
    this.startRun = this.startRun.bind(this);
  }

  emit(type, detail = {}) {
    this.events.push({ type, runId: this.runId, ...detail });
  }

  consumeEvents() {
    return this.events.splice(0);
  }

  playerEntities({ livingOnly = false } = {}) {
    const players = this.coopPreview && Array.isArray(this.players)
      ? this.players
      : [this.player].filter(Boolean);
    return livingOnly ? players.filter((player) => player.life > 0 && !player.inactive) : players;
  }

  selectLivingPlayer(origin = this.player) {
    const originX = origin ? origin.x + (origin.w ?? 0) / 2 : WORLD.width / 2;
    const originY = origin ? origin.y + (origin.h ?? 0) / 2 : WORLD.height / 2;
    const players = this.coopPreview && Array.isArray(this.players) ? this.players : null;
    const count = players ? players.length : (this.player ? 1 : 0);
    let nearest = null;
    let nearestDistanceSq = Infinity;
    for (let index = 0; index < count; index += 1) {
      const player = players ? players[index] : this.player;
      if (!player || player.life <= 0 || player.inactive) continue;
      const dx = player.x + (player.w ?? 0) / 2 - originX;
      const dy = player.y + (player.h ?? 0) / 2 - originY;
      const distanceSq = dx * dx + dy * dy;
      if (distanceSq < nearestDistanceSq
        || (distanceSq === nearestDistanceSq && String(player.id).localeCompare(String(nearest?.id)) < 0)) {
        nearest = player;
        nearestDistanceSq = distanceSq;
      }
    }
    return nearest;
  }

  hasLivingPlayer() {
    if (this.coopPreview && Array.isArray(this.players)) {
      for (let index = 0; index < this.players.length; index += 1) {
        const player = this.players[index];
        if (player && player.life > 0 && !player.inactive) return true;
      }
      return false;
    }
    return Boolean(this.player && this.player.life > 0 && !this.player.inactive);
  }

  totalCarriedSouls() {
    if (this.coopPreview && Array.isArray(this.players)) {
      let total = 0;
      for (let index = 0; index < this.players.length; index += 1) {
        total += this.players[index].carriedSouls ?? 0;
      }
      return total;
    }
    return this.carriedSouls ?? 0;
  }

  configureLevel(levelId, difficultyId = this.difficultyId) {
    this.difficultyId = normalizeDifficulty(difficultyId);
    this.difficulty = DIFFICULTIES[this.difficultyId];
    this.playerMaxLife = this.difficulty.playerMaxLife;
    this.level = getLevelDefinition(levelId);
    this.levelId = this.level.id;
    this.platforms = this.level.platforms;
    this.objective = {
      ...this.level.objective,
      soulsGoal: this.difficulty.soulsGoal,
      altarMaxLife: this.difficulty.altarMaxLife
    };
    this.encounter = applyDifficultyToEncounter(
      { ...BALANCE.encounter, ...this.level.encounter },
      this.difficulty
    );
  }

  startRun({
    demo = false,
    progressionEligible = !demo,
    bonusQualificationEligible = progressionEligible,
    levelId = this.levelId,
    difficulty = DEFAULT_DIFFICULTY,
    characterId = this.characterId ?? DEFAULT_CHARACTER
  } = {}) {
    this.configureLevel(levelId, difficulty);
    this.runId += 1;
    this.nextEntityNumber = 0;
    this.damageDiagnostics = [];
    this.state = "playing";
    this.gameMode = "campaign";
    this.pausedFrom = null;
    this.hitStop = 0;
    this.beamFlashes = [];
    this.slamRings = [];
    this.combo = 0;
    this.comboTimer = 0;
    this.comboBest = 0;
    this.shakeRequest = 0;
    this.demoMode = Boolean(demo);
    this.initializeWeaponDrops();
    this.progressionEligible = Boolean(progressionEligible) && !this.demoMode;
    this.bonusQualificationEligible = Boolean(bonusQualificationEligible) && this.progressionEligible;
    this.characterId = this.demoMode ? DEFAULT_CHARACTER : normalizeCharacter(characterId);
    this.character = resolveCharacter(this.characterId, this.playerMaxLife);
    this.ability = (!this.demoMode && this.character.hasAbility)
      ? {
          id: this.character.ability.id,
          rechargeRemaining: this.character.ability.rechargeSeconds,
          rechargeDuration: this.character.ability.rechargeSeconds,
          ready: false
        }
      : null;
    this.defeatReason = "";
    this.terminalResult = null;
    this.defeatPresentationRemaining = 0;
    this.victoryPresentationRemaining = 0;
    this.completedRun = null;
    this.bonusQualification = null;
    this.bonusTransitionRemaining = 0;
    this.bonusOriginStats = null;
    this.bonusRemaining = 0;
    this.bonusCollected = 0;
    this.bonusResult = null;
    this.bonusPreview = false;
    this.patrolShooterPreview = false;
    this.bonusCannon = null;
    this.bonusHitProtection = 0;
    this.bonusEnemySpawns = [];
    this.survivalWave = 0;
    this.survivalWaveDelay = null;
    this.survivalEnemySpeedMultiplier = 1;
    this.survivalResult = null;
    this.elapsed = 0;
    this.spawnClock = 0;
    this.spawnCount = 0;
    this.rangedSpawnCount = 0;
    this.nextSpawnAt = this.encounter.openingDelay;
    this.lastEnemyShotAt = -Infinity;
    this.resetPowerUpState();
    this.encounterPhaseId = this.encounter.phases[0].id;
    this.player = {
      id: this.createEntityId("player"),
      x: this.level.playerStart.x,
      y: this.level.playerStart.y,
      w: BALANCE.player.width,
      h: BALANCE.player.height,
      vx: 0,
      vy: 0,
      facing: 1,
      life: this.playerMaxLife,
      onGround: true,
      coyote: BALANCE.player.coyoteTime,
      jumpBuffer: 0,
      jumpsUsed: 0,
      attackCooldown: 0,
      attackTimer: 0,
      meleeAttackId: 0,
      invulnerable: 0,
      hurtFlash: 0,
      variableJumpActive: false
    };
    this.altar = {
      id: this.createEntityId("altar"),
      ...this.level.altar,
      life: this.objective.altarMaxLife,
      invulnerable: 0,
      deposited: 0,
      phase: 1
    };
    this.carriedSouls = 0;
    this.kills = 0;
    this.enemies = [];
    this.projectiles = [];
    this.souls = [];
    this.effects = [];
    this.powerUps = [];
    this.defeatVisuals = [];
    this.updateAltarPhase();
    this.presses = this.level.presses.map((definition) => ({
      ...definition,
      phase: "idle",
      phaseTime: definition.initialIdle,
      cycle: 0,
      y: definition.idleY,
      lastPlayerContactCycle: -1
    }));
    this.notice = {
      text: this.levelId === BALANCE.levels.nextId
        ? "FÁBRICA DE SUCATA · OBSERVE A PRENSA ANTES DE CRUZAR"
        : "VIDA OU ALTAR EM ZERO = FIM DE JOGO",
      time: this.levelId === BALANCE.levels.nextId ? 4 : 3.2
    };
    this.souls = this.level.placedSouls.map((position, index) => ({
      ...position,
      w: 15,
      h: 16,
      bornAt: -index * 0.3,
      source: "placed",
      removed: false
    }));
    this.events = [];
    this.spawnFloatingPowerUps();
    this.emit("runStarted");
  }

  startSurvival({ characterId = this.characterId ?? DEFAULT_CHARACTER } = {}) {
    this.configureLevel(BALANCE.levels.currentId, DEFAULT_DIFFICULTY);
    this.runId += 1;
    this.nextEntityNumber = 0;
    this.damageDiagnostics = [];
    this.state = "survival";
    this.gameMode = "survival";
    this.pausedFrom = null;
    this.demoMode = false;
    this.progressionEligible = false;
    this.bonusQualificationEligible = false;
    this.defeatReason = "";
    this.terminalResult = null;
    this.defeatPresentationRemaining = 0;
    this.victoryPresentationRemaining = 0;
    this.completedRun = null;
    this.bonusQualification = null;
    this.bonusTransitionRemaining = 0;
    this.bonusOriginStats = null;
    this.bonusRemaining = 0;
    this.bonusCollected = 0;
    this.bonusResult = null;
    this.bonusPreview = false;
    this.patrolShooterPreview = false;
    this.bonusCannon = null;
    this.bonusHitProtection = 0;
    this.bonusEnemySpawns = [];
    this.survivalResult = null;
    this.elapsed = 0;
    this.spawnClock = 0;
    this.spawnCount = 0;
    this.rangedSpawnCount = 0;
    this.lastEnemyShotAt = -Infinity;
    this.resetPowerUpState();
    this.encounterPhaseId = "survival";
    this.characterId = normalizeCharacter(characterId);
    this.character = resolveCharacter(this.characterId, BALANCE.survival.playerMaxLife);
    this.ability = this.character.hasAbility
      ? {
          id: this.character.ability.id,
          rechargeRemaining: this.character.ability.rechargeSeconds,
          rechargeDuration: this.character.ability.rechargeSeconds,
          ready: false
        }
      : null;
    this.playerMaxLife = BALANCE.survival.playerMaxLife;
    this.initializeWeaponDrops();
    this.player = {
      id: this.createEntityId("player"),
      x: this.level.playerStart.x,
      y: this.level.playerStart.y,
      w: BALANCE.player.width,
      h: BALANCE.player.height,
      vx: 0,
      vy: 0,
      facing: 1,
      life: BALANCE.survival.playerMaxLife,
      onGround: true,
      coyote: BALANCE.player.coyoteTime,
      jumpBuffer: 0,
      jumpsUsed: 0,
      attackCooldown: 0,
      attackTimer: 0,
      meleeAttackId: 0,
      invulnerable: 0,
      hurtFlash: 0,
      variableJumpActive: false,
      characterId: this.characterId,
      character: this.character,
      rapidFire: false,
      rapidFireRemaining: 0,
      shield: false,
      activePowerUp: null
    };
    this.altar = null;
    this.carriedSouls = 0;
    this.kills = 0;
    this.enemies = [];
    this.projectiles = [];
    this.souls = [];
    this.effects = [];
    this.defeatVisuals = [];
    this.presses = [];
    this.survivalWave = 0;
    this.survivalWaveDelay = null;
    this.survivalEnemySpeedMultiplier = 1;
    this.notice = null;
    this.events = [];
    this.initializeSurvivalSupportPickups();
    this.startSurvivalWave();
    this.emit("survivalStarted", { wave: this.survivalWave });
    return true;
  }

  startSurvivalWave() {
    if (this.state !== "survival") return false;
    this.survivalWave += 1;
    this.survivalWaveDelay = null;
    this.survivalEnemySpeedMultiplier = Math.min(
      BALANCE.survival.maxSpeedMultiplier,
      1 + (this.survivalWave - 1) * BALANCE.survival.speedIncreasePerWave
    );
    const enemyCount = Math.min(
      BALANCE.survival.maxEnemiesPerWave,
      BALANCE.survival.baseEnemyCount + (this.survivalWave - 1) * BALANCE.survival.enemiesPerWave
    );
    const shooterCount = this.survivalWave < BALANCE.survival.shooterStartsAtWave
      ? 0
      : Math.min(Math.floor(enemyCount / 3), Math.ceil((this.survivalWave - 1) / 2));
    for (let index = 0; index < enemyCount - shooterCount; index += 1) this.spawnChaser();
    for (let index = 0; index < shooterCount; index += 1) this.spawnShooter();
    this.spawnCount += enemyCount;
    this.notice = { key: "survival.wave", params: { wave: this.survivalWave }, text: `ONDA ${this.survivalWave}`, time: 1.25 };
    this.emit("survivalWaveStarted", {
      wave: this.survivalWave,
      enemies: enemyCount,
      speedMultiplier: this.survivalEnemySpeedMultiplier
    });
    return true;
  }

  goToMenu() {
    this.configureLevel(BALANCE.levels.currentId);
    this.state = "menu";
    this.demoMode = false;
    this.progressionEligible = false;
    this.bonusQualificationEligible = false;
    this.gameMode = "campaign";
    this.pausedFrom = null;
    this.elapsed = 0;
    this.player = null;
    this.altar = null;
    this.enemies = [];
    this.projectiles = [];
    this.souls = [];
    this.effects = [];
    this.defeatVisuals = [];
    this.presses = [];
    this.terminalResult = null;
    this.defeatPresentationRemaining = 0;
    this.victoryPresentationRemaining = 0;
    this.completedRun = null;
    this.bonusQualification = null;
    this.bonusTransitionRemaining = 0;
    this.bonusOriginStats = null;
    this.bonusRemaining = 0;
    this.bonusCollected = 0;
    this.bonusResult = null;
    this.bonusPreview = false;
    this.patrolShooterPreview = false;
    this.bonusCannon = null;
    this.bonusHitProtection = 0;
    this.bonusEnemySpawns = [];
    this.survivalWave = 0;
    this.survivalWaveDelay = null;
    this.survivalEnemySpeedMultiplier = 1;
    this.survivalResult = null;
    this.resetPowerUpState();
    this.ability = null;
    this.notice = null;
    this.events = [];
  }

  showOptions() { this.state = "options"; }
  showCredits() { this.state = "credits"; }

  resume() {
    if (this.state === "paused" && ["playing", "bonusPlaying", "survival"].includes(this.pausedFrom)) {
      this.state = this.pausedFrom;
    }
  }

  pause() {
    if (["playing", "bonusPlaying", "survival"].includes(this.state)) {
      this.pausedFrom = this.state;
      this.state = "paused";
    }
  }

  togglePause() {
    if (["playing", "bonusPlaying", "survival"].includes(this.state)) this.pause();
    else if (this.state === "paused") this.resume();
  }

  update(dt, input = {}) {
    dt = Math.min(Math.max(dt, 0), 0.05);
    if (input.pausePressed) this.togglePause();
    // Hit stop: congela a simulação por alguns quadros para dar peso ao
    // impacto. Nunca roda em demonstração nem com movimento reduzido, para
    // preservar o determinismo do modo atrativo.
    if (this.hitStop > 0 && HIT_STOP_STATES.has(this.state)) {
      this.hitStop = Math.max(0, this.hitStop - dt);
      return;
    }
    if (this.state === "bonusTransition") {
      this.updateBonusTransition(dt);
      return;
    }
    if (this.state === "bonusPlaying") {
      this.updateBonusArena(dt, input);
      return;
    }
    if (this.state === "survival") {
      this.updateSurvival(dt, input);
      return;
    }
    if (this.state === "defeatPresentation") {
      this.updateDefeatPresentation(dt);
      return;
    }
    if (this.state === "victoryPresentation") {
      this.updateVictoryPresentation(dt);
      return;
    }
    if (this.state !== "playing" || !this.player) return;

    this.elapsed += dt;
    this.updatePowerUpClocks(dt);
    this.updateCombo(dt);
    this.updateAbility(dt);
    this.player.attackCooldown = Math.max(0, this.player.attackCooldown - dt);
    this.player.attackTimer = Math.max(0, this.player.attackTimer - dt);
    this.player.invulnerable = Math.max(0, this.player.invulnerable - dt);
    this.player.hurtFlash = Math.max(0, this.player.hurtFlash - dt);
    this.altar.invulnerable = Math.max(0, this.altar.invulnerable - dt);
    if (this.notice) {
      this.notice.time -= dt;
      if (this.notice.time <= 0) this.notice = null;
    }
    for (const effect of this.effects) effect.life -= dt;
    this.updateDefeatVisuals(dt);

    snapshotPrevious(this.player);
    this.updatePlayer(dt, input);
    advanceAnimationClock(this.player, playerAnimationState(this.player), dt);
    if (this.resolveTerminalOutcome()) return;
    this.updatePendingPlayerShots(dt);
    this.updatePresses(dt);
    if (this.resolveTerminalOutcome()) return;
    this.updateSpawning(dt);
    this.updateWeaponDrops(dt);
    this.updateWeaponPickup();
    this.updatePowerUpCollection();
    this.updateFloatingPowerUpCollection();
    this.updateEnemies(dt);
    if (this.resolveTerminalOutcome()) return;
    this.updateProjectiles(dt);
    if (this.resolveTerminalOutcome()) return;
    this.updateSouls(input);
    this.cleanupEntities();
    if (this.resolveTerminalOutcome()) return;
    if (input.abilityPressed) {
      this.tryActivateAbility();
    }
  }

  updateSurvival(dt, input) {
    if (!this.player || this.state !== "survival") return;
    this.elapsed += dt;
    this.updatePowerUpClocks(dt);
    this.updateSupportPickupRespawns(dt);
    this.updateCombo(dt);
    this.updateAbility(dt);
    this.player.attackCooldown = Math.max(0, this.player.attackCooldown - dt);
    this.player.attackTimer = Math.max(0, this.player.attackTimer - dt);
    this.player.invulnerable = Math.max(0, this.player.invulnerable - dt);
    this.player.hurtFlash = Math.max(0, this.player.hurtFlash - dt);
    if (this.notice) {
      this.notice.time -= dt;
      if (this.notice.time <= 0) this.notice = null;
    }
    for (const effect of this.effects) effect.life -= dt;
    this.updateDefeatVisuals(dt);
    snapshotPrevious(this.player);
    this.updatePlayer(dt, input);
    advanceAnimationClock(this.player, playerAnimationState(this.player), dt);
    if (this.resolveTerminalOutcome()) return;
    this.updatePendingPlayerShots(dt);
    this.updateWeaponDrops(dt);
    this.updateWeaponPickup([this.player]);
    this.updateSupportPickupCollection([this.player]);
    this.updateEnemies(dt);
    if (this.resolveTerminalOutcome()) return;
    this.updateProjectiles(dt);
    if (this.resolveTerminalOutcome()) return;
    this.cleanupEntities();
    if (input.abilityPressed) this.tryActivateAbility();
    if (this.enemies.length > 0) return;
    if (this.survivalWaveDelay === null) {
      this.survivalWaveDelay = BALANCE.survival.intermissionSeconds;
      this.projectiles = [];
      this.emit("survivalWaveCleared", { wave: this.survivalWave });
    }
    this.survivalWaveDelay = Math.max(0, this.survivalWaveDelay - dt);
    if (this.survivalWaveDelay <= 0) this.startSurvivalWave();
  }

  updatePlayer(dt, input) {
    const player = this.player;
    const horizontal = Number.isFinite(input.horizontal)
      ? Math.sign(input.horizontal)
      : Number(Boolean(input.right)) - Number(Boolean(input.left));

    // ---- Investida por toque duplo direcional (não consome tecla nova, logo
    // vale igualmente para teclado, controle e toque). ----
    player.dashCooldown = Math.max(0, (player.dashCooldown ?? 0) - dt);
    player.dashTapWindow = Math.max(0, (player.dashTapWindow ?? 0) - dt);
    const previousHorizontal = player.prevHorizontal ?? 0;
    // Fonte autoritativa: a borda de pressão da direção. O recuo pela transição
    // do estado mantido atende quem alimenta o modelo com entradas sintéticas
    // (demonstração, API de teste) e não envia bordas.
    const dashEdge = input.leftPressed ? -1
      : input.rightPressed ? 1
      : (horizontal !== 0 && previousHorizontal === 0 ? horizontal : 0);
    // Dois toques registrados no mesmo quadro já formam o par completo.
    const edgeCount = dashEdge < 0 ? (input.leftPresses ?? 0)
      : dashEdge > 0 ? (input.rightPresses ?? 0)
      : 0;
    if (edgeCount >= 2) {
      player.dashTapDir = dashEdge;
      player.dashTapWindow = 0;
      this.tryDash(dashEdge);
    } else if (dashEdge !== 0) {
      if (player.dashTapDir === dashEdge && player.dashTapWindow > 0) this.tryDash(dashEdge);
      else {
        player.dashTapDir = dashEdge;
        player.dashTapWindow = REMASTER.dash.doubleTapWindow;
      }
    }
    player.prevHorizontal = horizontal;

    if ((player.dashTimer ?? 0) > 0) {
      player.dashTimer = Math.max(0, player.dashTimer - dt);
      player.vx = (player.dashDir ?? player.facing) * REMASTER.dash.speed;
      player.facing = player.dashDir ?? player.facing;
    } else if (horizontal !== 0) {
      // Inversão com atrito somado à aceleração. A versão anterior espelhava
      // a velocidade (player.vx *= -1), o que teleportava o corpo para a
      // velocidade máxima oposta em um único tique.
      const turning = player.vx * horizontal < 0;
      const rate = turning
        ? BALANCE.player.acceleration + BALANCE.player.friction
        : BALANCE.player.acceleration;
      player.vx = approach(player.vx, horizontal * BALANCE.player.maxSpeed, rate * dt);
      player.facing = horizontal;
    } else {
      player.vx = approach(player.vx, 0, BALANCE.player.friction * dt);
    }

    if (input.jumpPressed) player.jumpBuffer = BALANCE.player.jumpBuffer;
    else player.jumpBuffer = Math.max(0, player.jumpBuffer - dt);

    if (player.onGround) {
      player.coyote = BALANCE.player.coyoteTime;
      player.jumpsUsed = 0;
    } else {
      player.coyote = Math.max(0, player.coyote - dt);
    }

    if (player.jumpBuffer > 0) {
      // Saltar cancela a investida para que o impulso vertical não seja
      // anulado pela suspensão de gravidade abaixo.
      if (player.coyote > 0) {
        player.dashTimer = 0;
        player.vy = -BALANCE.player.jumpSpeed;
        player.onGround = false;
        player.coyote = 0;
        player.jumpBuffer = 0;
        player.jumpsUsed = 1;
        player.variableJumpActive = Boolean(input.jumpHeld);
        player.squash = REMASTER.squash.jumpStretch;
        this.emit("jump", { double: false });
      } else if (player.jumpsUsed < 2) {
        player.dashTimer = 0;
        player.vy = -BALANCE.player.doubleJumpSpeed;
        player.jumpBuffer = 0;
        player.jumpsUsed = 2;
        player.variableJumpActive = Boolean(input.jumpHeld);
        player.squash = REMASTER.squash.jumpStretch * 0.75;
        this.emit("jump", { double: true });
      }
    }

    if (player.variableJumpActive && !input.jumpHeld && player.vy < -BALANCE.player.variableJumpMinSpeed) {
      player.vy = -BALANCE.player.variableJumpMinSpeed;
      player.variableJumpActive = false;
    }
    if (player.onGround || player.vy >= 0) {
      player.variableJumpActive = false;
    }

    if (input.attackPressed && player.attackCooldown <= 0) this.playerAttack();

    // A investida é horizontal pura: a gravidade fica suspensa enquanto durar,
    // dando a ela função de esquiva e de alcance sobre vãos curtos.
    if ((player.dashTimer ?? 0) > 0) player.vy = 0;
    else player.vy = Math.min(player.vy + BALANCE.player.gravity * dt, BALANCE.player.maxFallSpeed);

    const wasAirborne = !player.onGround;
    const impactSpeed = player.vy;
    this.moveBody(player, dt);

    player.squash = approach(player.squash ?? 0, 0, REMASTER.squash.decayPerSecond * dt);
    if (wasAirborne && player.onGround && impactSpeed > REMASTER.squash.landSpeed) {
      player.squash = Math.min(1, impactSpeed / BALANCE.player.maxFallSpeed);
      this.requestShake(Math.min(2.2, impactSpeed / 240));
      this.emit("land", { speed: impactSpeed });
    }

    if (player.attackTimer > 0) {
      const hitbox = this.meleeHitbox;
      hitbox.x = player.facing > 0 ? player.x + player.w - 2 : player.x - 24;
      hitbox.y = player.y + 7;
      for (const enemy of this.enemies) {
        if (!enemy.removed && overlaps(hitbox, enemy) && enemy.lastMeleeAttackId !== player.meleeAttackId) {
          enemy.lastMeleeAttackId = player.meleeAttackId;
          this.damageEnemy(enemy, BALANCE.player.meleeDamage, {
            type: "ataque-corpo-a-corpo",
            sourceId: player.id,
            attackId: player.meleeAttackId,
            collision: { attack: { ...hitbox }, target: { ...enemy } }
          });
        }
      }
    }

    player.x = Math.max(1, Math.min(WORLD.width - player.w - 1, player.x));
    if (player.y > WORLD.height + 48) {
      if (this.gameMode === "bonus") this.recoverBonusFall();
      else this.damagePlayer(99, 0, {
        origin: "ambiente",
        type: "queda",
        entityId: "world:bottom-boundary",
        collision: { ...player }
      });
    }
  }

  playerAttack() {
    const player = this.player;

    // Arma empunhada substitui integralmente o ataque padrão.
    const equipped = this.heldWeapon(player);
    if (equipped) {
      const { config } = equipped;
      player.attackCooldown = config.cooldown;
      player.attackTimer = BALANCE.player.attackDuration;
      player.meleeAttackId += 1;
      const direction = player.facing >= 0 ? 1 : -1;
      if (config.mode === "spread") this.fireScatter(player, config, direction);
      else if (config.mode === "beam") this.fireBeam(player, config, direction);
      else this.fireSlam(player, config, direction);
      this.emit("attack");
      this.consumeWeaponAmmo(player);
      return;
    }

    const baseAttackCooldown = this.character ? this.character.attackCooldown : BALANCE.player.attackCooldown;
    const rapidFireActive = this.powerUpsAllowed()
      && player.rapidFire
      && (player.rapidFireRemaining ?? 0) > 0;
    player.attackCooldown = rapidFireActive
      ? baseAttackCooldown * RAPID_FIRE_COOLDOWN_MULTIPLIER
      : baseAttackCooldown;
    player.attackTimer = BALANCE.player.attackDuration;
    player.meleeAttackId += 1;
    this.emit("attack");

    const direction = player.facing >= 0 ? 1 : -1;
    const powerUp = POWER_UPS["double-burst"];
    const doubleBurstActive = this.powerUpsAllowed()
      && this.activePowerUp?.id === powerUp.id
      && this.activePowerUp.remaining > 0;
    const burstId = doubleBurstActive ? this.createEntityId("burst-double") : null;
    this.emitPlayerProjectile(direction, { burstId, burstIndex: 1 });
    if (!doubleBurstActive) return;

    for (let index = 2; index <= powerUp.projectilesPerAttack; index += 1) {
      this.pendingPlayerShots.push({
        id: `${burstId}:shot:${index}`,
        burstId,
        burstIndex: index,
        direction,
        remaining: powerUp.interShotDelaySeconds * (index - 1),
        acceptedAt: this.elapsed
      });
    }
    this.emit("doubleBurstAccepted", { burstId, direction, projectiles: powerUp.projectilesPerAttack });
  }

  playerShotOrigin(direction) {
    const anchor = resolveWeaponAnchor(this.player, this.character, direction);
    return {
      x: anchor.x - 4,
      y: anchor.y - 4
    };
  }

  resolvePlayerShotClearance(shot, direction) {
    const start = {
      x: direction > 0 ? this.player.x + this.player.w : this.player.x - shot.w,
      y: shot.y,
      w: shot.w,
      h: shot.h
    };
    const dx = shot.x - start.x;
    const collisions = [];
    for (const platform of this.platforms) {
      if (platform.oneWay) continue;
      const time = sweptAabb(start, dx, 0, platform);
      if (time !== null) collisions.push({ time, priority: 0, type: "wall", target: platform });
    }
    for (const enemy of this.enemies) {
      if (enemy.removed) continue;
      const time = sweptAabb(start, dx, 0, enemy);
      if (time !== null) collisions.push({ time, priority: 1, type: "enemy", target: enemy });
    }
    collisions.sort((a, b) => a.time - b.time || a.priority - b.priority);
    const impact = collisions[0];
    if (!impact) return true;

    shot.x = start.x + dx * impact.time;
    shot.y = start.y;
    shot.removed = true;
    const projectileRect = { x: shot.x, y: shot.y, w: shot.w, h: shot.h };
    const trajectory = {
      origin: { x: start.x, y: start.y },
      visualOrigin: { ...shot.spawnPosition },
      from: { x: start.x, y: start.y },
      to: { x: shot.x, y: shot.y },
      impactFraction: impact.time,
      flightSeconds: 0,
      velocity: { x: shot.vx, y: shot.vy }
    };
    if (impact.type === "wall") {
      this.addEffect("pulseImpact", shot.x + shot.w / 2, shot.y + shot.h / 2, "", 0.18);
      this.addEffect("blockedShot", shot.x + shot.w / 2, shot.y + shot.h / 2, "BLOQUEADO", 0.48);
      this.emit("projectileBlocked", {
        projectileId: shot.id,
        sourceId: shot.sourceId,
        rect: projectileRect,
        trajectory,
        obstacle: { ...impact.target }
      });
      return false;
    }

    this.addEffect("pulseImpact", shot.x + shot.w / 2, shot.y + shot.h / 2, "", 0.18);
    this.emit("projectileHit", {
      projectileId: shot.id,
      sourceId: shot.sourceId,
      targetId: impact.target.id,
      rect: projectileRect,
      targetRect: { ...impact.target }
    });
    this.damageEnemy(impact.target, shot.damage ?? BALANCE.player.shotDamage, {
      type: "projétil-jogador",
      projectileId: shot.id,
      sourceId: shot.sourceId,
      collision: { projectile: projectileRect, target: { ...impact.target }, trajectory }
    });
    return false;
  }

  countActiveProjectiles(team) {
    let count = 0;
    for (let index = 0; index < this.projectiles.length; index += 1) {
      const shot = this.projectiles[index];
      if (shot.team === team && !shot.removed) count += 1;
    }
    return count;
  }

  emitPlayerProjectile(direction, { burstId = null, burstIndex = 1 } = {}) {
    const activePlayerShots = this.countActiveProjectiles("player");
    if (activePlayerShots >= BALANCE.player.maxProjectiles) return false;
    const origin = this.playerShotOrigin(direction);
    const shot = {
      team: "player",
      id: this.createEntityId("projectile-player"),
      x: origin.x,
      y: origin.y,
      spawnPosition: { ...origin },
      w: 8,
      h: 8,
      vx: direction * BALANCE.player.shotSpeed,
      vy: 0,
      damage: BALANCE.player.shotDamage,
      life: 1.25,
      age: 0,
      sourceId: this.player.id,
      burstId,
      burstIndex,
      removed: false,
      trail: []
    };
    this.projectiles.push(shot);
    this.emit("playerShotEmitted", {
      projectileId: shot.id,
      sourceId: shot.sourceId,
      characterId: this.characterId ?? this.player.characterId ?? DEFAULT_CHARACTER,
      burstId,
      burstIndex,
      direction,
      rapidFire: Boolean(this.player.rapidFire && (this.player.rapidFireRemaining ?? 0) > 0),
      doubleBurst: Boolean(burstId)
    });
    this.resolvePlayerShotClearance(shot, direction);
    return true;
  }

  updatePendingPlayerShots(dt) {
    if (!this.pendingPlayerShots.length) return;
    const pending = [];
    for (const shot of this.pendingPlayerShots) {
      if (shot.acceptedAt === this.elapsed) {
        pending.push(shot);
        continue;
      }
      shot.remaining = Math.max(0, shot.remaining - dt);
      if (shot.remaining > 0) {
        pending.push(shot);
        continue;
      }
      if (!this.emitPlayerProjectile(shot.direction, shot)) {
        this.emit("burstShotDropped", {
          burstId: shot.burstId,
          burstIndex: shot.burstIndex,
          reason: "player-projectile-cap"
        });
      }
    }
    this.pendingPlayerShots = pending;
  }

  resetPowerUpState() {
    this.powerUpPickup = null;
    this.activePowerUp = null;
    this.pendingPlayerShots = [];
    this.powerUpSpawnResolved = false;
    this.powerUps = [];
    this.supportPickupSpawns = [];
    if (this.player) {
      this.player.rapidFire = false;
      this.player.rapidFireRemaining = 0;
      this.player.shield = false;
    }
  }

  clearHeldWeapons() {
    for (const player of this.playerEntities()) player.weapon = null;
    this.beamFlashes = [];
    this.slamRings = [];
  }

  clearTransientPowerUps() {
    this.powerUpPickup = null;
    this.activePowerUp = null;
    this.pendingPlayerShots = [];
    this.powerUps = [];
    this.supportPickupSpawns = [];
    if (this.player) {
      this.player.rapidFire = false;
      this.player.rapidFireRemaining = 0;
      this.player.shield = false;
    }
    if (this.effects) {
      this.effects = this.effects.filter((effect) => effect.kind !== "powerUpCollect");
    }
  }

  clearTransientCharacterState() {
    this.ability = null;
    if (this.effects) this.effects = this.effects.filter((effect) => effect.kind !== "heal");
  }

  characterAbilityAllowed() {
    return (this.state === "playing" && this.gameMode === "campaign")
      || (this.state === "survival" && this.gameMode === "survival");
  }

  updateAbility(dt) {
    if (!this.ability || !this.characterAbilityAllowed()) return;
    if (this.ability.rechargeRemaining > 0) {
      this.ability.rechargeRemaining = Math.max(0, this.ability.rechargeRemaining - dt);
      if (this.ability.rechargeRemaining <= 0) {
        this.ability.ready = true;
        this.emit("abilityReady", { id: this.ability.id });
      }
    }
  }

  tryActivateAbility() {
    if (!this.ability || !this.character?.hasAbility) return false;
    if (!this.characterAbilityAllowed()) return false;
    if (!this.player || this.player.life <= 0) return false;
    if (this.ability.rechargeRemaining > 0 || !this.ability.ready) return false;
    if (this.character.abilityId === "weapon-requisition") return this.activateRequisition();
    if (this.player.life >= this.playerMaxLife) return false;

    const healAmount = this.character.ability.healAmount;
    const lifeBefore = this.player.life;
    this.player.life = Math.min(this.playerMaxLife, lifeBefore + healAmount);
    const healed = this.player.life - lifeBefore;
    this.ability.ready = false;
    this.ability.rechargeRemaining = this.ability.rechargeDuration;
    this.addEffect("heal", this.player.x + this.player.w / 2, this.player.y + this.player.h / 2, `+${healed} VIDA`, 0.75);
    this.emit("playerHealed", {
      characterId: this.characterId,
      amount: healed,
      life: this.player.life,
      maxLife: this.playerMaxLife
    });
    return true;
  }

  // Requisição (Vex): sem arma na mão, materializa uma do arsenal; com arma,
  // recarrega a munição. É a habilidade que dá controle sobre o sistema de
  // armas temporárias, em vez de depender do que o nível larga no chão.
  activateRequisition() {
    const player = this.player;
    const config = player.weapon ? WEAPONS[player.weapon.id] : null;
    const refill = this.character.ability.refillAmmo;
    let resultado;
    if (config) {
      const antes = player.weapon.ammo;
      player.weapon.ammo = Math.min(config.ammo, antes + refill);
      if (player.weapon.ammo === antes) return false;   // já cheia: não gasta
      // O relógio de posse também é renovado, senão a recarga seria inútil
      // numa arma prestes a expirar por tempo.
      player.weapon.holdRemaining = config.holdSeconds;
      resultado = { tipo: "recarga", weaponId: player.weapon.id, municao: player.weapon.ammo };
    } else {
      const escolha = WEAPON_IDS[Math.floor(this.random() * WEAPON_IDS.length) % WEAPON_IDS.length];
      if (!this.equipWeapon(escolha)) return false;
      resultado = { tipo: "requisicao", weaponId: escolha, municao: player.weapon?.ammo ?? 0 };
    }
    this.ability.ready = false;
    this.ability.rechargeRemaining = this.ability.rechargeDuration;
    const rotulo = resultado.tipo === "recarga" ? "RECARGA" : "REQUISIÇÃO";
    this.addEffect("powerUpCollect", player.x + player.w / 2, player.y + player.h / 2, rotulo, 0.7);
    this.requestShake(1.4);
    this.emit("weaponRequisitioned", { characterId: this.characterId, ...resultado });
    return true;
  }

  powerUpsAllowed() {
    return ((this.state === "playing" && this.gameMode === "campaign")
      || (this.state === "survival" && this.gameMode === "survival")
      || (this.state === "bonusPlaying" && this.gameMode === "bonus"))
      && !this.demoMode
      && !this.patrolShooterPreview;
  }

  initializeSurvivalSupportPickups() {
    this.supportPickupSpawns = SURVIVAL_SUPPORT_PICKUPS.map((definition, index) => ({
      ...definition,
      respawnSeconds: BALANCE.survival.supportPickupRespawnSeconds[definition.powerUpType],
      respawnRemaining: 0,
      activeEntityId: null,
      preferredTieSlot: index % 2 === 0 ? 1 : 2
    }));
    this.powerUps = [];
    for (const spawn of this.supportPickupSpawns) this.spawnSupportPickup(spawn);
  }

  initializeBonusSupportPickups() {
    this.supportPickupSpawns = BONUS_COMBAT_RULES.pickups.map((definition, index) => ({
      ...definition,
      respawnRemaining: definition.initialDelay,
      activeEntityId: null,
      preferredTieSlot: index % 2 === 0 ? 1 : 2
    }));
    this.powerUps = [];
  }

  spawnSupportPickup(spawn) {
    if (!spawn || spawn.activeEntityId || spawn.respawnRemaining > 0) return false;
    const entity = {
      powerUpType: spawn.powerUpType,
      spawnId: spawn.spawnId,
      x: spawn.x,
      y: spawn.y,
      w: spawn.w,
      h: spawn.h,
      groundY: spawn.groundY,
      id: this.createEntityId(`powerup-${spawn.powerUpType}`),
      type: "powerup",
      removed: false
    };
    spawn.activeEntityId = entity.id;
    this.powerUps.push(entity);
    this.emit("floatingPowerUpSpawned", { id: entity.powerUpType, placementId: entity.id, spawnId: spawn.spawnId });
    return true;
  }

  spawnSurvivalSupportPickup(spawn) {
    return this.spawnSupportPickup(spawn);
  }

  updateSupportPickupRespawns(dt) {
    for (const spawn of this.supportPickupSpawns ?? []) {
      if (spawn.activeEntityId || spawn.respawnRemaining <= 0) continue;
      spawn.respawnRemaining = Math.max(0, spawn.respawnRemaining - dt);
      if (spawn.respawnRemaining <= 0) this.spawnSupportPickup(spawn);
    }
  }

  supportPickupEligible(powerUp, player) {
    if (!powerUp || !player || player.life <= 0 || player.inactive) return false;
    const id = powerUp.powerUpType;
    if (id === "health") return player.life < this.playerMaxLife;
    if (id === "shield") return !player.shield;
    return id === "rapid-fire" || id === "double-burst";
  }

  selectSupportPickupCollector(powerUp, players) {
    const candidates = players.filter((player) => this.supportPickupEligible(powerUp, player) && overlaps(player, powerUp));
    if (!candidates.length) return null;
    const spawn = this.supportPickupSpawns.find((candidate) => candidate.spawnId === powerUp.spawnId);
    const ranked = candidates.map((player) => ({ player, distance: distanceBetween(player, powerUp) }))
      .sort((left, right) => left.distance - right.distance || left.player.slot - right.player.slot);
    const nearest = ranked[0].distance;
    const tied = ranked.filter((candidate) => Math.abs(candidate.distance - nearest) <= EPSILON);
    if (tied.length === 1) return tied[0].player;
    return tied.find((candidate) => candidate.player.slot === spawn?.preferredTieSlot)?.player ?? tied[0].player;
  }

  updateSupportPickupCollection(players = [this.player]) {
    if (!Array.isArray(this.powerUps) || !this.supportPickupSpawns?.length) return false;
    let collected = false;
    for (const powerUp of this.powerUps) {
      if (powerUp.removed || !powerUp.spawnId) continue;
      const collector = this.selectSupportPickupCollector(powerUp, players);
      if (!collector) continue;
      const applied = this.withSupportPickupPlayerContext
        ? this.withSupportPickupPlayerContext(collector, () => this.activateFloatingPowerUp(powerUp, collector))
        : this.activateFloatingPowerUp(powerUp, collector);
      if (!applied) continue;
      powerUp.removed = true;
      const spawn = this.supportPickupSpawns.find((candidate) => candidate.spawnId === powerUp.spawnId);
      if (spawn) {
        spawn.activeEntityId = null;
        spawn.respawnRemaining = spawn.respawnSeconds;
        const slots = players.map((player) => player.slot).filter(Number.isFinite).sort((a, b) => a - b);
        if (slots.length > 1) {
          const current = slots.indexOf(collector.slot);
          spawn.preferredTieSlot = slots[(current + 1) % slots.length];
        }
      }
      collected = true;
    }
    this.powerUps = this.powerUps.filter((powerUp) => !powerUp.removed);
    return collected;
  }

  spawnFloatingPowerUps() {
    this.powerUps = [];
    if (!this.powerUpsAllowed()) return;
    this.powerUps = FLOATING_POWER_UP_DEFINITIONS.map((definition) => ({
      ...definition,
      id: this.createEntityId(`powerup-${definition.powerUpType}`),
      type: "powerup",
      removed: false
    }));
    for (const powerUp of this.powerUps) {
      this.emit("floatingPowerUpSpawned", { id: powerUp.powerUpType, placementId: powerUp.id });
    }
  }

  updateFloatingPowerUpCollection(player = this.player) {
    if (!player || !this.powerUpsAllowed() || !Array.isArray(this.powerUps)) return false;
    let collected = false;
    for (const powerUp of this.powerUps) {
      if (powerUp.removed || !overlaps(player, powerUp)) continue;
      if (!this.supportPickupEligible(powerUp, player)) continue;
      if (!this.activateFloatingPowerUp(powerUp, player)) continue;
      powerUp.removed = true;
      collected = true;
    }
    this.powerUps = this.powerUps.filter((powerUp) => !powerUp.removed);
    return collected;
  }

  activateFloatingPowerUp(powerUp, player = this.player) {
    const id = powerUp?.powerUpType ?? powerUp?.typeId;
    if (!player || !id) return false;
    if (id.startsWith(WEAPON_DROP_PREFIX)) {
      const weaponId = id.slice(WEAPON_DROP_PREFIX.length);
      // Encostar numa arma sempre troca a que estiver em mãos, como na arena:
      // pegar é uma decisão, não um acúmulo.
      return this.equipWeapon(weaponId, player, powerUp);
    }
    if (id === "rapid-fire") {
      player.rapidFire = true;
      player.rapidFireRemaining = RAPID_FIRE_DURATION_SECONDS;
      this.notice = { key: "powerup.rapidFire.acquired", time: 1.0 };
    } else if (id === "health") {
      if (player.life >= this.playerMaxLife) return false;
      player.life = Math.min(this.playerMaxLife, player.life + 1);
      this.notice = { key: "powerup.health.acquired", time: 1.0 };
    } else if (id === "shield") {
      if (player.shield) return false;
      player.shield = true;
      this.notice = { key: "powerup.shield.acquired", time: 1.0 };
    } else if (id === "double-burst") {
      const config = POWER_UPS[id];
      const refreshed = this.activePowerUp?.id === id;
      this.activePowerUp = { id, remaining: config.durationSeconds };
      player.activePowerUp = this.activePowerUp;
      this.notice = { key: "powerup.doubleBurst.acquired", time: 1.0 };
      const x = powerUp.x + powerUp.w / 2;
      const y = powerUp.y + powerUp.h / 2;
      this.addEffect("powerUpCollect", x, y, "×2", 0.75);
      this.emit("powerUpCollected", { id, playerId: player.id, refreshed, duration: config.durationSeconds });
      return true;
    } else {
      return false;
    }
    const x = powerUp.x + powerUp.w / 2;
    const y = powerUp.y + powerUp.h / 2;
    this.addEffect("powerUpCollect", x, y, id === "health" ? "+1" : id === "shield" ? "ESCUDO" : "RÁPIDO", 0.75);
    this.emit("powerUpCollected", { id, playerId: player.id });
    return true;
  }

  // ---- Quedas de arma no cenário ---------------------------------------

  initializeWeaponDrops() {
    const points = this.level?.weaponSpawns ?? [];
    this.weaponSpawns = points.map((point, index) => ({
      index,
      x: point.x,
      y: point.y,
      // Pontos diferentes entram em cena escalonados, para a arena não encher
      // de armas de uma vez.
      timer: WEAPON_DROP_RULES.firstDropSeconds + index * 5,
      activeId: null
    }));
    this.weaponDrops = [];
  }

  updateWeaponDrops(dt) {
    if (!this.weaponSpawns?.length || !this.powerUpsAllowed()) return;
    for (const spawn of this.weaponSpawns) {
      if (spawn.activeId) continue;
      spawn.timer -= dt;
      if (spawn.timer > 0) continue;
      spawn.timer = WEAPON_DROP_RULES.respawnSeconds;
      const weaponId = WEAPON_IDS[Math.floor(this.random() * WEAPON_IDS.length) % WEAPON_IDS.length];
      const drop = {
        id: this.createEntityId(`weapon-drop-${weaponId}`),
        weaponId,
        spawnIndex: spawn.index,
        x: spawn.x,
        y: spawn.y,
        w: WEAPON_DROP_RULES.width,
        h: WEAPON_DROP_RULES.height,
        bornAt: this.elapsed,
        removed: false
      };
      spawn.activeId = drop.id;
      this.weaponDrops.push(drop);
      this.emit("weaponDropped", { id: weaponId, placementId: drop.id });
    }
  }

  updateWeaponPickup(players = this.playerEntities({ livingOnly: true })) {
    if (!this.weaponDrops?.length) return false;
    let taken = false;
    for (const drop of this.weaponDrops) {
      if (drop.removed) continue;
      const collector = players.find((player) => player && player.life > 0 && overlaps(player, drop));
      if (!collector) continue;
      if (!this.equipWeapon(drop.weaponId, collector, drop)) continue;
      drop.removed = true;
      const spawn = this.weaponSpawns?.find((candidate) => candidate.index === drop.spawnIndex);
      if (spawn) spawn.activeId = null;
      taken = true;
    }
    if (taken) this.weaponDrops = this.weaponDrops.filter((drop) => !drop.removed);
    return taken;
  }

  // ---- Armas temporárias ------------------------------------------------

  equipWeapon(weaponId, player = this.player, source = null) {
    const config = WEAPONS[weaponId];
    if (!config || !player) return false;
    player.weapon = {
      id: config.id,
      ammo: config.ammo,
      maxAmmo: config.ammo,
      remaining: config.holdSeconds,
      holdSeconds: config.holdSeconds
    };
    // Empunhar zera o tempo de recarga: a troca de arma é instantânea, como
    // num pega-e-usa de arena.
    player.attackCooldown = 0;
    const x = source ? source.x + source.w / 2 : player.x + player.w / 2;
    const y = source ? source.y + source.h / 2 : player.y + player.h / 2;
    this.addEffect("weaponPickup", x, y, config.short, 0.8);
    this.notice = { key: config.nameKey, time: 1.2 };
    this.requestShake(1.6);
    this.emit("weaponEquipped", { id: config.id, playerId: player.id, ammo: config.ammo });
    return true;
  }

  breakWeapon(player = this.player, reason = "ammo") {
    const held = player?.weapon;
    if (!held) return false;
    player.weapon = null;
    player.attackCooldown = 0;
    this.addEffect("weaponBreak", player.x + player.w / 2, player.y + player.h / 2, "", 0.6);
    this.requestShake(2);
    this.emit("weaponBroken", { id: held.id, playerId: player.id, reason });
    return true;
  }

  heldWeapon(player = this.player) {
    const held = player?.weapon;
    if (!held) return null;
    const config = WEAPONS[held.id];
    return config ? { held, config } : null;
  }

  updateWeaponClock(dt) {
    for (const player of this.playerEntities()) {
      const held = player.weapon;
      if (!held) continue;
      held.remaining = Math.max(0, held.remaining - dt);
      if (held.remaining <= 0) this.breakWeapon(player, "tempo");
    }
  }

  consumeWeaponAmmo(player) {
    const held = player?.weapon;
    if (!held) return;
    held.ammo -= 1;
    this.emit("weaponAmmoSpent", { id: held.id, playerId: player.id, ammo: held.ammo });
    if (held.ammo <= 0) this.breakWeapon(player, "munição");
  }

  // Leque de projéteis do Dispersor.
  fireScatter(player, config, direction) {
    const origin = this.playerShotOrigin(direction);
    const middle = (config.pellets - 1) / 2;
    for (let index = 0; index < config.pellets; index += 1) {
      const angle = ((index - middle) * config.spreadDegrees * Math.PI) / 180;
      this.projectiles.push({
        id: this.createEntityId("projectile-scatter"),
        team: "player",
        weaponId: config.id,
        x: origin.x,
        y: origin.y,
        w: 7,
        h: 7,
        vx: Math.cos(angle) * config.shotSpeed * direction,
        vy: Math.sin(angle) * config.shotSpeed,
        life: 0.72,
        damage: config.damage,
        knockback: config.knockback,
        age: 0,
        removed: false
      });
    }
    this.emit("weaponFired", { id: config.id, mode: config.mode, direction });
  }

  // Feixe instantâneo: atinge todos os inimigos na faixa horizontal à frente.
  fireBeam(player, config, direction) {
    const origin = this.playerShotOrigin(direction);
    const startX = direction > 0 ? origin.x : 0;
    const endX = direction > 0 ? WORLD.width : origin.x + 8;
    const band = { x: startX, y: origin.y - config.beamHeight / 2 + 4, w: Math.max(1, endX - startX), h: config.beamHeight };
    let hits = 0;
    for (const enemy of this.enemies) {
      if (enemy.removed || !overlaps(band, enemy)) continue;
      hits += 1;
      this.damageEnemy(enemy, config.damage, {
        type: "lanca-trilho", sourceId: player.id, knockbackDir: direction,
        collision: { attack: { ...band }, target: { ...enemy } }
      });
    }
    this.beamFlashes.push({ ...band, origin: origin.x, life: 0.22, duration: 0.22, accent: config.accent });
    if (this.beamFlashes.length > 4) this.beamFlashes.shift();
    this.requestShake(2.4);
    this.pulseHitStop(REMASTER.hitStop.enemyHit);
    this.emit("weaponFired", { id: config.id, mode: config.mode, direction, hits });
  }

  // Impacto em área da Marreta Gravitacional.
  fireSlam(player, config, direction) {
    const cx = player.x + player.w / 2 + direction * 14;
    const cy = player.y + player.h / 2;
    let hits = 0;
    for (const enemy of this.enemies) {
      if (enemy.removed) continue;
      const ex = enemy.x + enemy.w / 2;
      const ey = enemy.y + enemy.h / 2;
      if (Math.hypot(ex - cx, ey - cy) > config.radius) continue;
      hits += 1;
      this.damageEnemy(enemy, config.damage, {
        type: "marreta-gravitacional", sourceId: player.id,
        knockbackDir: Math.sign(ex - cx) || direction,
        collision: { attack: { x: cx - config.radius, y: cy - config.radius, w: config.radius * 2, h: config.radius * 2 }, target: { ...enemy } }
      });
    }
    this.slamRings.push({ x: cx, y: cy, radius: config.radius, life: 0.3, duration: 0.3, accent: config.accent });
    if (this.slamRings.length > 4) this.slamRings.shift();
    this.requestShake(3.4);
    this.pulseHitStop(REMASTER.hitStop.enemyKill);
    this.emit("weaponFired", { id: config.id, mode: config.mode, direction, hits });
  }

  isValidPowerUpSpawn(definition) {
    const config = POWER_UPS[definition?.typeId];
    if (!config) return false;
    const body = {
      x: definition.x,
      y: definition.y,
      w: definition.w ?? config.pickupWidth,
      h: definition.h ?? config.pickupHeight
    };
    if (body.x < 0 || body.y < 0 || body.x + body.w > WORLD.width || body.y + body.h > WORLD.height) return false;
    if (this.platforms.some((platform) => !platform.oneWay && overlaps(body, platform))) return false;
    const footY = body.y + body.h;
    const hasSupport = this.platforms.some((platform) => (
      Math.abs(platform.y - footY) <= EPSILON
      && body.x + 2 >= platform.x
      && body.x + body.w - 2 <= platform.x + platform.w
    ));
    if (!hasSupport) return false;
    const essential = [this.altar, ...this.level.placedSouls.map((soul) => ({ ...soul, w: 15, h: 16 }))].filter(Boolean);
    if (essential.some((entity) => overlaps(body, entity))) return false;
    return !this.level.presses.some((press) => overlaps(body, {
      x: press.x,
      y: Math.min(press.idleY, press.closedY),
      w: press.w,
      h: Math.abs(press.closedY - press.idleY) + press.headHeight
    }));
  }

  updatePowerUpAvailability(phase = this.getEncounterPhase()) {
    const config = POWER_UPS["double-burst"];
    if (this.powerUpSpawnResolved || !this.powerUpsAllowed()) return;
    const recovered = (this.altar?.deposited ?? 0) + this.totalCarriedSouls();
    if (recovered < config.unlockRecoveredSouls || phase.id === this.encounter.phases[0].id) return;
    this.powerUpSpawnResolved = true;
    const definition = this.level.powerUpSpawns?.find((spawn) => spawn.typeId === config.id);
    if (!definition || !this.isValidPowerUpSpawn(definition)) {
      this.emit("powerUpSpawnSkipped", { id: config.id, reason: "invalid-or-missing-placement" });
      return;
    }
    this.powerUpPickup = {
      ...definition,
      w: definition.w ?? config.pickupWidth,
      h: definition.h ?? config.pickupHeight,
      remaining: config.pickupLifetimeSeconds,
      spawnedAt: this.elapsed
    };
    this.emit("powerUpSpawned", { id: config.id, placementId: definition.id, remaining: config.pickupLifetimeSeconds });
  }

  updatePowerUpClocks(dt) {
    if (this.powerUpPickup) {
      this.powerUpPickup.remaining = Math.max(0, this.powerUpPickup.remaining - dt);
      if (this.powerUpPickup.remaining <= 0) {
        const { typeId, id } = this.powerUpPickup;
        this.powerUpPickup = null;
        this.emit("powerUpPickupExpired", { powerUpId: typeId, placementId: id });
      }
    }
    if (this.activePowerUp) {
      this.activePowerUp.remaining = Math.max(0, this.activePowerUp.remaining - dt);
      if (this.activePowerUp.remaining <= 0) {
        const { id } = this.activePowerUp;
        this.activePowerUp = null;
        if (this.player) this.player.activePowerUp = null;
        this.emit("powerUpExpired", { id });
      }
    }
    this.updateWeaponClock(dt);
    for (const flash of this.beamFlashes) flash.life -= dt;
    this.beamFlashes = this.beamFlashes.filter((flash) => flash.life > 0);
    for (const ring of this.slamRings) ring.life -= dt;
    this.slamRings = this.slamRings.filter((ring) => ring.life > 0);
    if (this.player?.rapidFire) {
      this.player.rapidFireRemaining = Math.max(0, (this.player.rapidFireRemaining ?? 0) - dt);
      if (this.player.rapidFireRemaining <= 0) {
        this.player.rapidFire = false;
        this.emit("powerUpExpired", { id: "rapid-fire" });
      }
    }
  }

  updatePowerUpCollection() {
    if (!this.powerUpsAllowed() || !this.powerUpPickup || !overlaps(this.player, this.powerUpPickup)) return false;
    const pickup = this.powerUpPickup;
    this.powerUpPickup = null;
    return this.activatePowerUp(pickup.typeId, pickup);
  }

  activatePowerUp(id, pickup = null) {
    const config = POWER_UPS[id];
    if (!config || !this.powerUpsAllowed()) return false;
    const refreshed = this.activePowerUp?.id === id;
    this.activePowerUp = { id, remaining: config.durationSeconds };
    this.notice = { key: "powerup.doubleBurst.acquired", time: 1.0 };
    const x = pickup ? pickup.x + pickup.w / 2 : this.player.x + this.player.w / 2;
    const y = pickup ? pickup.y + pickup.h / 2 : this.player.y + this.player.h / 2;
    this.addEffect("powerUpCollect", x, y, "×2", 0.75);
    this.emit("powerUpCollected", {
      id,
      playerId: this.player?.id ?? null,
      refreshed,
      duration: config.durationSeconds
    });
    return true;
  }

  queueBonusQualification(qualification, stats = this.completedRun) {
    if (this.demoMode || !this.progressionEligible || !this.bonusQualificationEligible || !qualification?.qualified || !stats) return false;
    if (this.state !== "victoryPresentation" || this.bonusQualification) return false;
    this.bonusQualification = Object.freeze({ ...qualification });
    this.bonusOriginStats = Object.freeze({ ...stats });
    return true;
  }

  updateBonusTransition(dt) {
    this.bonusTransitionRemaining = Math.max(0, this.bonusTransitionRemaining - dt);
    if (this.bonusTransitionRemaining <= 0) this.startBonusArena();
  }

  startBonusPreview(originLevelId = BALANCE.levels.currentId, characterId = this.characterId ?? DEFAULT_CHARACTER) {
    const origin = getLevelDefinition(originLevelId);
    if (origin.id === BALANCE.levels.bonusId) return false;
    this.demoMode = false;
    this.progressionEligible = false;
    this.bonusQualificationEligible = false;
    this.terminalResult = null;
    this.completedRun = null;
    this.bonusQualification = null;
    this.bonusTransitionRemaining = 0;
    this.bonusOriginStats = Object.freeze({ levelId: origin.id, levelTitle: origin.title });
    this.characterId = normalizeCharacter(characterId);
    this.character = resolveCharacter(this.characterId, this.playerMaxLife);
    return this.startBonusArena({ preview: true });
  }

  startBonusArena({ preview = false } = {}) {
    if (!this.bonusOriginStats || this.demoMode || (!preview && !this.progressionEligible)) return false;
    this.configureLevel(BALANCE.levels.bonusId);
    this.runId += 1;
    this.nextEntityNumber = 0;
    this.state = "bonusPlaying";
    this.gameMode = "bonus";
    this.character = resolveCharacter(this.characterId, this.playerMaxLife);
    this.ability = null;
    this.elapsed = 0;
    this.bonusRemaining = BONUS_RULES.durationSeconds;
    this.bonusCollected = 0;
    this.bonusResult = null;
    this.bonusPreview = Boolean(preview);
    this.bonusHitProtection = 0;
    this.bonusEnemySpawns = BONUS_COMBAT_RULES.enemySpawns.map((definition) => ({
      ...definition,
      state: "pending",
      selected: null,
      warningRemaining: 0,
      retryRemaining: 0,
      deferred: false
    }));
    this.bonusCannon = {
      id: BONUS_CANNON_RULES.id,
      ...BONUS_CANNON_RULES.body,
      muzzleX: BONUS_CANNON_RULES.muzzle.x,
      muzzleY: BONUS_CANNON_RULES.muzzle.y,
      phase: "wait",
      phaseTime: BONUS_CANNON_RULES.initialSafeSeconds,
      aimX: null,
      aimY: null
    };
    this.player = {
      id: this.createEntityId("player"),
      x: this.level.playerStart.x, y: this.level.playerStart.y,
      w: BALANCE.player.width, h: BALANCE.player.height,
      vx: 0, vy: 0, facing: 1, life: this.playerMaxLife,
      onGround: true, coyote: BALANCE.player.coyoteTime, jumpBuffer: 0, jumpsUsed: 0,
      attackCooldown: 0, attackTimer: 0, invulnerable: 0, hurtFlash: 0,
      meleeAttackId: 0,
      variableJumpActive: false,
      characterId: this.characterId,
      character: this.character,
      rapidFire: false,
      rapidFireRemaining: 0,
      shield: false,
      activePowerUp: null
    };
    this.altar = null;
    this.carriedSouls = 0;
    this.kills = 0;
    this.enemies = [];
    this.projectiles = [];
    this.presses = [];
    this.effects = [];
    this.defeatVisuals = [];
    this.resetPowerUpState();
    this.initializeBonusSupportPickups();
    this.notice = { text: "COLETE AS 30 ALMAS ANTES DO TEMPO ACABAR", time: 2.5 };
    this.souls = this.level.placedSouls.map((position, index) => ({
      ...position,
      id: `bonus-soul-${String(index + 1).padStart(2, "0")}`,
      w: 15, h: 16, bornAt: -index * 0.11, source: "bonus", removed: false
    }));
    this.events = [];
    this.emit("bonusStarted", { originLevelId: this.bonusOriginStats.levelId, preview: this.bonusPreview });
    return true;
  }

  bonusSpawnBody(point) {
    return { x: point.x, y: point.y, w: 16, h: 32 };
  }

  isSafeBonusEnemySpawn(point) {
    if (!point || this.state !== "bonusPlaying" || this.gameMode !== "bonus") return false;
    const body = this.bonusSpawnBody(point);
    if (body.x < 1 || body.y < 16 || body.x + body.w > WORLD.width - 1 || body.y + body.h > WORLD.height) return false;
    if (!this.hasChaserPatrolSupport(body.x, body.y, body.w, body.h)) return false;
    const playerCenter = center(this.player);
    const spawnCenter = center(body);
    if (Math.hypot(spawnCenter.x - playerCenter.x, spawnCenter.y - playerCenter.y) < BONUS_COMBAT_RULES.minimumPlayerDistance) return false;
    const occupied = [this.bonusCannon, ...this.enemies.filter((enemy) => !enemy.removed), ...this.powerUps.filter((pickup) => !pickup.removed)]
      .filter(Boolean);
    if (occupied.some((entity) => overlaps(body, entity))) return false;
    const clearance = BONUS_COMBAT_RULES.objectiveClearance;
    return !this.souls.some((soul) => !soul.removed && overlaps(body, {
      x: soul.x - clearance,
      y: soul.y - clearance,
      w: soul.w + clearance * 2,
      h: soul.h + clearance * 2
    }));
  }

  chooseSafeBonusEnemySpawn(schedule) {
    const candidates = schedule.candidates.filter((candidate) => this.isSafeBonusEnemySpawn(candidate));
    if (!candidates.length) return null;
    return candidates[Math.floor(this.random() * candidates.length) % candidates.length];
  }

  deferBonusEnemySpawn(schedule, reason) {
    schedule.state = "pending";
    schedule.selected = null;
    schedule.warningRemaining = 0;
    schedule.retryRemaining = BONUS_COMBAT_RULES.spawnRetrySeconds;
    if (!schedule.deferred) this.emit("bonusEnemySpawnDeferred", { scheduleId: schedule.id, reason });
    schedule.deferred = true;
  }

  updateBonusEnemySpawns(dt) {
    const active = () => this.enemies.filter((enemy) => !enemy.removed).length;
    for (const schedule of this.bonusEnemySpawns) {
      if (schedule.state === "spawned" || schedule.state === "skipped") continue;
      if (schedule.state === "warning") {
        if (active() >= BONUS_COMBAT_RULES.maximumMobileEnemies || !this.isSafeBonusEnemySpawn(schedule.selected)) {
          this.deferBonusEnemySpawn(schedule, "unsafe-during-warning");
          continue;
        }
        schedule.warningRemaining = Math.max(0, schedule.warningRemaining - dt);
        if (schedule.warningRemaining > 0) continue;
        const enemy = this.spawnChaserAt(schedule.selected, { bonusScheduleId: schedule.id });
        if (!enemy) {
          this.deferBonusEnemySpawn(schedule, "spawn-rejected");
          continue;
        }
        schedule.state = "spawned";
        schedule.deferred = false;
        this.emit("bonusEnemySpawned", { scheduleId: schedule.id, enemyId: enemy.id, kind: enemy.kind });
        continue;
      }

      schedule.retryRemaining = Math.max(0, schedule.retryRemaining - dt);
      if (this.elapsed < schedule.startsAtElapsed || schedule.retryRemaining > 0) continue;
      if (this.bonusRemaining < schedule.minimumRemaining) {
        schedule.state = "skipped";
        this.emit("bonusEnemySpawnSkipped", { scheduleId: schedule.id, reason: "insufficient-time" });
        continue;
      }
      if (active() >= BONUS_COMBAT_RULES.maximumMobileEnemies) continue;
      if (schedule.deferAtLowLife
        && this.player.life <= BONUS_COMBAT_RULES.lowLifeThreshold
        && !this.player.shield) continue;
      const selected = this.chooseSafeBonusEnemySpawn(schedule);
      if (!selected) {
        this.deferBonusEnemySpawn(schedule, "no-safe-point");
        continue;
      }
      schedule.state = "warning";
      schedule.selected = selected;
      schedule.warningRemaining = schedule.telegraphSeconds;
      schedule.deferred = false;
      this.emit("bonusEnemyWarning", {
        scheduleId: schedule.id,
        pointId: selected.id,
        x: selected.x,
        y: selected.y,
        seconds: schedule.telegraphSeconds
      });
    }
  }

  updateBonusArena(dt, input) {
    if (!this.player || this.bonusResult) return;
    this.elapsed += dt;
    this.bonusRemaining = Math.max(0, this.bonusRemaining - dt);
    this.bonusHitProtection = Math.max(0, this.bonusHitProtection - dt);
    this.updatePowerUpClocks(dt);
    this.updateSupportPickupRespawns(dt);
    this.player.attackCooldown = Math.max(0, this.player.attackCooldown - dt);
    this.player.attackTimer = Math.max(0, this.player.attackTimer - dt);
    this.player.invulnerable = Math.max(0, this.player.invulnerable - dt);
    this.player.hurtFlash = Math.max(0, this.player.hurtFlash - dt);
    if (this.notice) {
      this.notice.time -= dt;
      if (this.notice.time <= 0) this.notice = null;
    }
    for (const effect of this.effects) effect.life -= dt;
    this.updateDefeatVisuals(dt);
    snapshotPrevious(this.player);
    this.updatePlayer(dt, input);
    advanceAnimationClock(this.player, playerAnimationState(this.player), dt);
    this.updatePendingPlayerShots(dt);
    this.updateSupportPickupCollection([this.player]);
    this.updateBonusEnemySpawns(dt);
    this.updateEnemies(dt);
    for (const enemy of this.enemies) {
      if (!enemy.removed && enemy.y > WORLD.height + 48) {
        enemy.removed = true;
        this.emit("enemyExited", { kind: enemy.kind, enemyId: enemy.id, reason: "bonus-fall" });
      }
    }
    if (this.player.life <= 0) {
      this.finishBonus("death");
      return;
    }
    this.updateBonusCannon(dt);
    this.updateProjectiles(dt);
    if (this.player.life <= 0) {
      this.finishBonus("death");
      return;
    }
    for (const soul of this.souls) {
      if (soul.removed || !overlaps(this.player, soul)) continue;
      soul.removed = true;
      this.bonusCollected += 1;
      this.addEffect("bonusCollect", soul.x + soul.w / 2, soul.y + soul.h / 2, "+10", 0.55);
      this.emit("bonusSoulCollected", { soulId: soul.id, collected: this.bonusCollected });
    }
    this.souls = this.souls.filter((soul) => !soul.removed);
    this.cleanupEntities();
    if (this.bonusCollected >= BONUS_RULES.totalSouls) this.finishBonus("complete");
    else if (this.bonusRemaining <= 0) this.finishBonus("timeout");
  }

  updateBonusCannon(dt) {
    const cannon = this.bonusCannon;
    if (!cannon || this.state !== "bonusPlaying") return;
    cannon.phaseTime = Math.max(0, cannon.phaseTime - dt);
    if (cannon.phaseTime > 0) return;

    if (cannon.phase === "wait" || cannon.phase === "recovery") {
      const target = center(this.player);
      cannon.aimX = target.x;
      cannon.aimY = target.y;
      cannon.phase = "telegraph";
      cannon.phaseTime = BONUS_CANNON_RULES.telegraphSeconds;
      this.emit("bonusCannonWarning", {
        cannonId: cannon.id,
        muzzle: { x: cannon.muzzleX, y: cannon.muzzleY },
        aim: { x: cannon.aimX, y: cannon.aimY }
      });
      return;
    }

    if (cannon.phase === "telegraph") {
      if (!this.fireBonusCannon()) {
        cannon.phaseTime = 0.05;
        return;
      }
      cannon.phase = "recovery";
      cannon.phaseTime = BONUS_CANNON_RULES.recoverySeconds;
    }
  }

  fireBonusCannon() {
    const cannon = this.bonusCannon;
    if (!cannon || this.state !== "bonusPlaying") return false;
    const active = this.projectiles.filter((shot) => shot.team === "bonusCannon" && !shot.removed).length;
    if (active >= BONUS_CANNON_RULES.maximumActiveProjectiles) return false;
    const dx = cannon.aimX - cannon.muzzleX;
    const dy = cannon.aimY - cannon.muzzleY;
    const magnitude = Math.max(1, Math.hypot(dx, dy));
    const { w, h, speed, lifetimeSeconds } = BONUS_CANNON_RULES.projectile;
    this.projectiles.push({
      id: this.createEntityId("projectile-bonus-cannon"),
      team: "bonusCannon",
      x: cannon.muzzleX - w / 2,
      y: cannon.muzzleY - h / 2,
      spawnPosition: { x: cannon.muzzleX - w / 2, y: cannon.muzzleY - h / 2 },
      w,
      h,
      vx: (dx / magnitude) * speed,
      vy: (dy / magnitude) * speed,
      life: lifetimeSeconds,
      age: 0,
      sourceId: cannon.id,
      removed: false
    });
    this.emit("bonusCannonFired", {
      cannonId: cannon.id,
      aim: { x: cannon.aimX, y: cannon.aimY }
    });
    return true;
  }

  applyBonusCannonPenalty(shot, collision) {
    if (this.state !== "bonusPlaying" || this.gameMode !== "bonus") return false;
    if (this.bonusHitProtection > 0) {
      this.emit("bonusCannonHitIgnored", { projectileId: shot.id, reason: "protected" });
      return false;
    }
    const before = this.bonusRemaining;
    this.bonusRemaining = Math.max(0, before - BONUS_CANNON_RULES.timePenaltySeconds);
    this.bonusHitProtection = BONUS_CANNON_RULES.hitProtectionSeconds;
    this.addEffect("bonusTimePenalty", this.player.x + this.player.w / 2, this.player.y + 8, "−1 s", 0.62);
    this.emit("bonusCannonHit", {
      projectileId: shot.id,
      penaltySeconds: BONUS_CANNON_RULES.timePenaltySeconds,
      remainingBefore: before,
      remainingAfter: this.bonusRemaining,
      collision
    });
    return true;
  }

  recoverBonusFall() {
    if (this.gameMode !== "bonus" || !this.player) return;
    const safe = this.level.safePosition ?? this.level.playerStart;
    this.player.x = safe.x;
    this.player.y = safe.y;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.onGround = true;
    this.player.jumpsUsed = 0;
    this.addEffect("bonusRecover", safe.x + 12, safe.y + 12, "RETORNO SEGURO", 0.7);
    this.emit("bonusFallRecovered");
  }

  skipBonus() {
    if (this.state !== "bonusTransition") return false;
    this.gameMode = "bonus";
    this.bonusCollected = 0;
    this.bonusRemaining = BONUS_RULES.durationSeconds;
    this.finishBonus("skipped");
    return true;
  }

  finishBonus(reason = "timeout") {
    if (this.bonusResult || !this.bonusOriginStats || this.demoMode || (!this.progressionEligible && !this.bonusPreview)) return false;
    const collected = Math.max(0, Math.min(BONUS_RULES.totalSouls, this.bonusCollected));
    this.bonusResult = Object.freeze({
      originLevelId: this.bonusOriginStats.levelId,
      originLevelTitle: this.bonusOriginStats.levelTitle,
      collected,
      totalSouls: BONUS_RULES.totalSouls,
      score: calculateBonusScore(collected),
      completedAll: collected === BONUS_RULES.totalSouls,
      reason,
      activeSeconds: Math.max(0, BONUS_RULES.durationSeconds - this.bonusRemaining)
    });
    this.state = "bonusComplete";
    this.clearTransientPowerUps();
    this.projectiles = [];
    this.enemies = [];
    this.souls = [];
    this.effects = [];
    this.presses = [];
    this.bonusCannon = null;
    this.bonusHitProtection = 0;
    this.bonusEnemySpawns = [];
    this.notice = null;
    this.emit("bonusComplete", {
      result: this.bonusResult,
      progressionEligible: this.progressionEligible && !this.bonusPreview,
      demoMode: false,
      preview: this.bonusPreview
    });
    return true;
  }

  updatePresses(dt) {
    for (const press of this.presses) {
      press.phaseTime = Math.max(0, press.phaseTime - dt);
      const duration = press.phases[press.phase];
      const progress = duration > 0 ? 1 - press.phaseTime / duration : 1;
      if (press.phase === "closing") {
        press.y = press.idleY + (press.closedY - press.idleY) * Math.max(0, Math.min(1, progress));
      } else if (press.phase === "recovery") {
        press.y = press.closedY + (press.idleY - press.closedY) * Math.max(0, Math.min(1, progress));
      } else {
        press.y = press.idleY;
      }

      if (press.phase === "closing") {
        const hitbox = { x: press.x, y: press.y, w: press.w, h: press.headHeight };
        if (overlaps(hitbox, this.player) && press.lastPlayerContactCycle !== press.cycle) {
          press.lastPlayerContactCycle = press.cycle;
          this.damagePlayer(press.damage, Math.sign(this.player.x - press.x) || 1, {
            origin: "perigo-industrial",
            type: "prensa-industrial",
            entityId: press.id,
            collision: { player: { ...this.player }, press: hitbox, phase: press.phase, cycle: press.cycle }
          });
          this.emit("pressImpact", { pressId: press.id, cycle: press.cycle, hitbox });
        }
      }

      if (press.phaseTime > 0) continue;
      this.advancePressPhase(press);
    }
  }

  advancePressPhase(press) {
    const next = { idle: "warning", warning: "closing", closing: "recovery", recovery: "idle" }[press.phase];
    press.phase = next;
    press.phaseTime = press.phases[next];
    if (next === "warning") {
      press.cycle += 1;
      this.notice = { text: "ATENÇÃO: PRENSA EM MOVIMENTO", time: press.phases.warning };
      this.emit("pressWarning", { pressId: press.id, cycle: press.cycle, seconds: press.phases.warning });
    }
    if (next === "closing") this.emit("pressClosing", { pressId: press.id, cycle: press.cycle });
    if (next === "recovery") {
      press.y = press.closedY;
      this.emit("pressRecovery", { pressId: press.id, cycle: press.cycle });
    }
    if (next === "idle") press.y = press.idleY;
    this.emit("pressPhaseChanged", { pressId: press.id, phase: next, cycle: press.cycle });
  }

  updateSpawning(dt) {
    this.spawnClock += dt;
    const phase = this.getEncounterPhase();
    this.updatePowerUpAvailability(phase);
    if (phase.id !== this.encounterPhaseId) {
      this.encounterPhaseId = phase.id;
      const messages = {
        alerta: "NOVO SINAL: ATIRADORES À DISTÂNCIA",
        confronto: "AMEAÇAS COMBINADAS",
        "reta-final": "RETA FINAL: RESTAURE O ALTAR",
        separacao: "SEPARAÇÃO: PRIMEIRO ATIRADOR",
        compactacao: "COMPACTAÇÃO: USE AS ROTAS ALTAS",
        expedicao: "EXPEDIÇÃO: RETORNE AO ALTAR"
      };
      this.notice = { text: messages[phase.id] ?? "PRESSÃO AUMENTANDO", time: 2.2 };
      this.emit("encounterPhaseChanged", { phase: phase.id });
    }

    const active = this.enemies.filter((enemy) => !enemy.removed);
    const usedBudget = active.reduce((total, enemy) => total + (
      ["shooter", "patrol-shooter"].includes(enemy.kind) ? BALANCE.encounter.patrolShooter.encounterCost : 1
    ), 0);
    if (active.length >= phase.maxEnemies || active.length >= this.encounter.maxEnemies || this.spawnClock < this.nextSpawnAt) return;

    const shooterCount = active.filter((enemy) => ["shooter", "patrol-shooter"].includes(enemy.kind)).length;
    const shouldSpawnShooter = phase.shooterEvery > 0
      && this.spawnCount > 0
      && this.spawnCount % phase.shooterEvery === 0
      && shooterCount < BALANCE.encounter.patrolShooter.maxActiveRanged;
    const cost = shouldSpawnShooter ? BALANCE.encounter.patrolShooter.encounterCost : 1;
    if (usedBudget + cost > phase.budget) {
      this.nextSpawnAt = this.spawnClock + 0.35;
      return;
    }
    if (shouldSpawnShooter) {
      const replaced = this.shouldReplaceShooterWithPatrol(phase) && this.spawnPatrolShooter();
      if (!replaced) this.spawnShooter();
      this.rangedSpawnCount += 1;
    } else this.spawnChaser();
    this.spawnCount += 1;
    this.nextSpawnAt = this.spawnClock + phase.spawnInterval;
  }

  getEncounterPhase() {
    if (this.gameMode === "survival") {
      const finalPhase = this.encounter.phases[this.encounter.phases.length - 1];
      return {
        ...finalPhase,
        maxEnemies: BALANCE.survival.maxEnemiesPerWave,
        maxEnemyShots: Math.min(8, 2 + Math.floor(this.survivalWave / 2))
      };
    }
    const recovered = (this.altar?.deposited ?? 0) + (this.carriedSouls ?? 0);
    let selected = this.encounter.phases[0];
    for (const phase of this.encounter.phases) {
      if (recovered >= phase.from) selected = phase;
    }
    return selected;
  }

  chooseDistantSpawn(points, minimumDistance = 76) {
    const players = this.playerEntities({ livingOnly: true });
    const candidates = points.filter((point) => players.every((player) => {
      const playerCenter = center(player);
      return Math.hypot(point.x - playerCenter.x, point.y - playerCenter.y) >= minimumDistance;
    }));
    const pool = candidates.length ? candidates : points;
    return pool[Math.floor(this.random() * pool.length) % pool.length];
  }

  hasChaserPatrolSupport(x, y, width = 16, height = 32) {
    const footY = y + height;
    const inset = 2;
    const supported = (probeX) => this.platforms.some((platform) => (
      Math.abs(platform.y - footY) <= 1
      && probeX >= platform.x - EPSILON
      && probeX <= platform.x + platform.w + EPSILON
    ));
    const body = { x, y, w: width, h: height };
    return supported(x + inset)
      && supported(x + width - inset)
      && !this.platforms.some((platform) => !platform.oneWay && overlaps(body, platform));
  }

  resolveChaserPatrolBounds(spawn, width = 16, height = 32) {
    const radius = this.encounter.chaserPatrolRadius;
    let left = Math.max(1, spawn.x - radius);
    let right = Math.min(WORLD.width - width - 1, spawn.x + radius);

    for (let x = spawn.x; x >= left; x -= 1) {
      if (!this.hasChaserPatrolSupport(x, spawn.y, width, height)) {
        left = x + 1;
        break;
      }
    }
    for (let x = spawn.x; x <= right; x += 1) {
      if (!this.hasChaserPatrolSupport(x, spawn.y, width, height)) {
        right = x - 1;
        break;
      }
    }

    // Margem para a distância de frenagem sem empurrar o corpo além da borda.
    if (left < spawn.x) left = Math.min(spawn.x, left + 2);
    if (right > spawn.x) right = Math.max(spawn.x, right - 2);
    return { left, right };
  }

  spawnChaser() {
    const spawn = this.chooseDistantSpawn(this.level.chaserSpawns);
    return this.spawnChaserAt(spawn);
  }

  spawnChaserAt(spawn, metadata = {}) {
    if (!spawn) return null;
    const patrol = this.resolveChaserPatrolBounds(spawn);
    const enemy = {
      id: this.createEntityId("enemy-chaser"),
      kind: "chaser",
      x: spawn.x,
      y: spawn.y,
      w: 16,
      h: 32,
      vx: 0,
      vy: 0,
      facing: spawn.x < (this.selectLivingPlayer(spawn)?.x ?? this.player.x) ? 1 : -1,
      onGround: false,
      attackCooldown: 0.6,
      altarAttackCooldown: 1.4,
      maxHp: this.encounter.chaserMaxHp,
      hp: this.encounter.chaserMaxHp,
      hurtFlash: 0,
      aiState: CHASER_STATES.ADVANCE,
      chaserRole: null,
      spawnedAt: this.elapsed,
      siegeDwell: 0,
      spawnX: spawn.x,
      spawnY: spawn.y,
      patrolLeft: patrol.left,
      patrolRight: patrol.right,
      patrolDirection: spawn.x < WORLD.width / 2 ? 1 : -1,
      blockedTurnCooldown: 0,
      intendedVx: 0,
      animTime: 0,
      removed: false,
      ...metadata
    };
    this.enemies.push(enemy);
    this.emit("enemySpawned", { kind: "chaser", enemyId: enemy.id, bonusScheduleId: metadata.bonusScheduleId ?? null });
    return enemy;
  }

  spawnShooter() {
    const spawn = this.chooseDistantSpawn(this.level.shooterSpawns, 92);
    const targetPlayer = this.selectLivingPlayer(spawn) ?? this.player;
    const aim = center(targetPlayer);
    this.enemies.push({
      id: this.createEntityId("enemy-shooter"),
      kind: "shooter",
      x: spawn.x,
      y: spawn.y,
      w: 24,
      h: 24,
      vx: 0,
      vy: 0,
      facing: aim.x >= spawn.x ? 1 : -1,
      phase: "telegraph",
      phaseTime: this.encounter.shooterTelegraph,
      aimX: aim.x,
      aimY: aim.y,
      targetPlayerId: targetPlayer.id,
      shots: 0,
      removed: false
    });
    this.emit("enemySpawned", { kind: "shooter" });
  }

  shouldReplaceShooterWithPatrol(phase) {
    const config = BALANCE.encounter.patrolShooter;
    if (!config.campaignEnabled || this.gameMode !== "campaign" || this.demoMode) return false;
    return this.isPatrolShooterReplacementSlot(phase);
  }

  isPatrolShooterReplacementSlot(phase) {
    const config = BALANCE.encounter.patrolShooter;
    return config.eligiblePhaseIds.includes(phase.id)
      && (this.rangedSpawnCount + 1) % config.replacementEvery === 0;
  }

  hasPatrolSupport(x, footY) {
    return this.platforms.some((platform) => (
      Math.abs(platform.y - footY) <= 3
      && x > platform.x + EPSILON
      && x < platform.x + platform.w - EPSILON
    ));
  }

  isValidPatrolRoute(definition) {
    const config = BALANCE.encounter.patrolShooter;
    if (!definition || definition.patrolLeft > definition.x || definition.x > definition.patrolRight) return false;
    if (definition.patrolLeft < 0 || definition.patrolRight + config.width > WORLD.width) return false;
    const footY = definition.y + config.height;
    for (let x = definition.patrolLeft; x <= definition.patrolRight; x += 4) {
      const body = { x, y: definition.y, w: config.width, h: config.height };
      if (!this.hasPatrolSupport(x + config.edgeClearance, footY)
        || !this.hasPatrolSupport(x + config.width - config.edgeClearance, footY)) return false;
      if (this.platforms.some((platform) => !platform.oneWay && overlaps(body, platform))) return false;
    }
    const finalBody = { x: definition.patrolRight, y: definition.y, w: config.width, h: config.height };
    return this.hasPatrolSupport(definition.patrolRight + config.width - config.edgeClearance, footY)
      && !this.platforms.some((platform) => !platform.oneWay && overlaps(finalBody, platform));
  }

  spawnPatrolShooter(definition = null) {
    const config = BALANCE.encounter.patrolShooter;
    const routes = (definition ? [definition] : this.level.patrolShooterSpawns)
      .filter((route) => this.isValidPatrolRoute(route))
      .filter((route) => {
        const body = { x: route.x, y: route.y, w: config.width, h: config.height };
        return ![...this.playerEntities({ livingOnly: true }), this.altar, ...this.enemies.filter((enemy) => !enemy.removed)]
          .filter(Boolean)
          .some((entity) => overlaps(body, entity));
      });
    if (!routes.length) return null;
    const spawn = this.chooseDistantSpawn(routes, 92);
    const direction = center(this.selectLivingPlayer(spawn) ?? this.player).x >= spawn.x + config.width / 2 ? 1 : -1;
    const enemy = {
      id: this.createEntityId("enemy-patrol-shooter"),
      kind: "patrol-shooter",
      routeId: spawn.id,
      x: spawn.x,
      y: spawn.y,
      w: config.width,
      h: config.height,
      vx: direction * config.patrolSpeed,
      vy: 0,
      facing: direction,
      onGround: true,
      phase: "patrol",
      phaseTime: 0,
      patrolElapsed: 0,
      patrolDirection: direction,
      patrolLeft: spawn.patrolLeft,
      patrolRight: spawn.patrolRight,
      aimX: null,
      aimY: null,
      shots: 0,
      recoilTime: 0,
      fireFeedbackTime: 0,
      animTime: 0,
      removed: false
    };
    this.enemies.push(enemy);
    this.emit("enemySpawned", { kind: enemy.kind, routeId: enemy.routeId });
    return enemy;
  }

  startPatrolShooterPreview() {
    this.startRun({
      levelId: BALANCE.levels.currentId,
      difficulty: DEFAULT_DIFFICULTY,
      characterId: DEFAULT_CHARACTER,
      progressionEligible: false,
      bonusQualificationEligible: false
    });
    this.patrolShooterPreview = true;
    this.nextSpawnAt = Infinity;
    this.souls = [];
    this.enemies = [];
    this.projectiles = [];
    this.player.x = 140;
    this.player.y = 208;
    this.altar.deposited = 12;
    const route = this.level.patrolShooterSpawns.find((candidate) => candidate.id === "district-ground-left");
    const enemy = this.spawnPatrolShooter(route);
    if (!enemy) return false;
    this.notice = { text: "PREVIEW ATIRADOR DE PATRULHA · COLISORES ATIVOS", time: 4 };
    this.emit("patrolShooterPreviewStarted", { enemyId: enemy.id, routeId: enemy.routeId });
    return true;
  }

  updateEnemies(dt) {
    for (const enemy of this.enemies) {
      if (!["playing", "bonusPlaying", "survival"].includes(this.state)) break;
      snapshotPrevious(enemy);
      if (enemy.removed) continue;
      if (enemy.kind === "chaser") this.updateChaser(enemy, dt);
      else if (enemy.kind === "patrol-shooter") this.updatePatrolShooter(enemy, dt);
      else this.updateShooter(enemy, dt);
      if (!enemy.removed && enemy.kind === "chaser") {
        advanceAnimationClock(enemy, chaserAnimationState(enemy), dt);
      }
      if (!this.hasLivingPlayer() || (this.altar && this.altar.life <= 0)) break;
    }
  }

  updateChaser(enemy, dt) {
    enemy.hurtFlash = Math.max(0, (enemy.hurtFlash ?? 0) - dt);
    enemy.attackFlash = Math.max(0, (enemy.attackFlash ?? 0) - dt);
    enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
    enemy.altarAttackCooldown = Math.max(0, enemy.altarAttackCooldown - dt);
    enemy.blockedTurnCooldown = Math.max(0, (enemy.blockedTurnCooldown ?? 0) - dt);
    const targetPlayer = this.selectLivingPlayer(enemy);
    const enemyCenterX = enemy.x + (enemy.w ?? 0) / 2;
    const enemyCenterY = enemy.y + (enemy.h ?? 0) / 2;
    if (!enemy.chaserRole) this.assignChaserRole(enemy);
    // Permanência junto ao objetivo: quem chega ao altar e fica parado lá vira
    // caçador, para que manter distância do altar deixe de ser abrigo seguro.
    if (enemy.chaserRole === CHASER_ROLES.SIEGE && this.altar) {
      const goal = this.chaserGoal(enemy);
      const noObjetivo = Math.abs(goal.x - enemyCenterX) <= REMASTER.ai.siegeDwellRadius;
      const golpeouRecente = this.elapsed - (enemy.lastAltarHitAt ?? -Infinity)
        < REMASTER.ai.siegeDwellSeconds;
      // Parado no objetivo E sem causar dano = cerco improdutivo.
      enemy.siegeDwell = (noObjetivo && !golpeouRecente) ? (enemy.siegeDwell ?? 0) + dt : 0;
      if (enemy.siegeDwell >= REMASTER.ai.siegeDwellSeconds) {
        this.escalateToHunter(enemy, "cerco-improdutivo");
      }
    }
    const previousState = enemy.aiState ?? CHASER_STATES.ADVANCE;
    let state = previousState;
    let playerCenterX = 0;
    let playerCenterY = 0;
    let targetDistanceSq = Infinity;
    if (targetPlayer) {
      playerCenterX = targetPlayer.x + (targetPlayer.w ?? 0) / 2;
      playerCenterY = targetPlayer.y + (targetPlayer.h ?? 0) / 2;
      const dx = playerCenterX - enemyCenterX;
      const dy = playerCenterY - enemyCenterY;
      targetDistanceSq = dx * dx + dy * dy;
      // Histerese: entra em chase em <=150, sai somente em >=180. Na faixa
      // intermediária, cada instância preserva seu estado atual.
      const enterDistance = this.encounter.chaserDetectionEnterDistance + EPSILON;
      const exitDistance = this.encounter.chaserDetectionExitDistance - EPSILON;
      if (state !== CHASER_STATES.CHASE && targetDistanceSq <= enterDistance * enterDistance) {
        state = CHASER_STATES.CHASE;
      } else if (state === CHASER_STATES.CHASE && targetDistanceSq >= exitDistance * exitDistance) {
        // Fora do alcance de vista: o caçador continua atrás do jogador; o
        // sitiante volta a marchar sobre o altar.
        state = enemy.chaserRole === CHASER_ROLES.HUNTER
          ? CHASER_STATES.HUNT
          : CHASER_STATES.ADVANCE;
      } else if (state !== CHASER_STATES.CHASE) {
        state = enemy.chaserRole === CHASER_ROLES.HUNTER
          ? CHASER_STATES.HUNT
          : CHASER_STATES.ADVANCE;
      }
    } else {
      state = CHASER_STATES.ADVANCE;
    }
    if (state === CHASER_STATES.PATROL) state = CHASER_STATES.ADVANCE;
    enemy.aiState = state;
    if (state !== previousState) {
      this.emit("chaserStateChanged", {
        enemyId: enemy.id,
        from: previousState,
        to: state,
        targetPlayerId: targetPlayer?.id ?? null,
        distance: Number.isFinite(targetDistanceSq) ? Math.sqrt(targetDistanceSq) : null
      });
    }

    const speedMultiplier = this.gameMode === "survival" ? this.survivalEnemySpeedMultiplier : 1;
    let direction;
    let speed = this.encounter.chaserSpeed;
    if (state === CHASER_STATES.HUNT && targetPlayer) {
      // Caça: mesma navegação do perseguir, sem porta de distância. O inimigo
      // atravessa o nível inteiro atrás do jogador.
      direction = Math.sign(playerCenterX - enemyCenterX) || enemy.facing || 1;
      speed *= REMASTER.ai.huntSpeedMultiplier;
      direction = this.resolveNavigation(enemy, dt, direction, playerCenterX, playerCenterY, enemyCenterX, enemyCenterY);
    } else if (state === CHASER_STATES.ADVANCE) {
      // Avanço sobre o objetivo. Cada inimigo mira um ponto levemente distinto
      // do altar para que o grupo não se empilhe numa coluna só.
      const goal = this.chaserGoal(enemy);
      direction = Math.sign(goal.x - enemyCenterX) || enemy.facing || 1;
      speed *= REMASTER.ai.advanceSpeedMultiplier;
      direction = this.resolveNavigation(enemy, dt, direction, goal.x, goal.y, enemyCenterX, enemyCenterY);
    } else if (state === CHASER_STATES.CHASE && targetPlayer) {
      direction = Math.sign(playerCenterX - enemyCenterX) || enemy.facing || 1;
      direction = this.resolveNavigation(enemy, dt, direction, playerCenterX, playerCenterY, enemyCenterX, enemyCenterY);
    } else {
      speed *= this.encounter.chaserPatrolSpeedMultiplier;
      const acceleration = this.encounter.chaserAcceleration * speedMultiplier;
      const stoppingDistance = (enemy.vx * enemy.vx) / Math.max(1, 2 * acceleration);
      direction = enemy.patrolDirection || enemy.facing || 1;
      if (enemy.x < enemy.patrolLeft) direction = 1;
      else if (enemy.x > enemy.patrolRight) direction = -1;
      else if (direction > 0 && enemy.x + stoppingDistance >= enemy.patrolRight) direction = -1;
      else if (direction < 0 && enemy.x - stoppingDistance <= enemy.patrolLeft) direction = 1;

      if (Math.abs(enemy.y - enemy.spawnY) <= 4) {
        const probeX = enemy.x + direction * (Math.abs(enemy.vx) * dt + 2);
        if (probeX >= enemy.patrolLeft && probeX <= enemy.patrolRight
          && !this.hasChaserPatrolSupport(probeX, enemy.y, enemy.w, enemy.h)) {
          direction *= -1;
        }
      }
      enemy.patrolDirection = direction;
    }

    enemy.facing = direction;
    enemy.intendedVx = direction * speed * speedMultiplier * this.chaserAggression(enemy);
    enemy.knockback = Math.max(0, (enemy.knockback ?? 0) - dt);
    if (enemy.knockback > 0) {
      // Durante o recuo a IA não reassume a velocidade: o impulso de dano é
      // autoritativo até decair, o que torna o acerto legível em tela.
      enemy.vx = approach(enemy.vx, 0, REMASTER.knockback.decaySpeed * dt);
    } else {
      enemy.vx = approach(
        enemy.vx,
        enemy.intendedVx,
        this.encounter.chaserAcceleration * speedMultiplier * dt
      );
    }

    // O salto é decidido pela navegação, que só o autoriza onde existe espaço
    // livre acima. O gatilho anterior ("jogador está acima e perto") disparava
    // mesmo embaixo de plataforma sólida: o perseguidor batia a cabeça e
    // repetia o pulo no lugar, sem nunca andar até o vão por onde subir.
    if (enemy.onGround && enemy.wantsAscend) {
      enemy.vy = -this.encounter.chaserJumpSpeed;
      enemy.onGround = false;
      enemy.wantsAscend = false;
    }

    enemy.vy = Math.min(enemy.vy + BALANCE.player.gravity * dt, BALANCE.player.maxFallSpeed);
    const movement = this.moveBody(enemy, dt);
    if (movement.hitX && enemy.onGround) {
      if (state === CHASER_STATES.CHASE || state === CHASER_STATES.ADVANCE || state === CHASER_STATES.HUNT) {
        enemy.vy = -this.encounter.chaserJumpSpeed * 0.86;
        enemy.onGround = false;
      } else if (enemy.blockedTurnCooldown <= 0) {
        enemy.patrolDirection *= -1;
        enemy.facing = enemy.patrolDirection;
        enemy.vx = 0;
        enemy.blockedTurnCooldown = this.encounter.chaserBlockedTurnSeconds;
      }
    }

    // Com a navegação agora buscando bordas para descer, a borda do MUNDO também
    // passou a ser um candidato: sem este limite o perseguidor saía do mapa pela
    // esquerda. O corpo fica contido como o do jogador.
    enemy.x = Math.max(1, Math.min(WORLD.width - enemy.w - 1, enemy.x));

    if (targetPlayer && overlaps(enemy, targetPlayer) && enemy.attackCooldown <= 0) {
      enemy.attackCooldown = this.encounter.chaserAttackCooldown;
      enemy.attackFlash = 0.18;
      this.addEffect("contactAttack", enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, "GOLPE", 0.42);
      this.emit("contactAttack", { enemyId: enemy.id, playerId: targetPlayer.id, playerRect: { ...targetPlayer }, enemyRect: { ...enemy } });
      this.damagePlayerTarget(targetPlayer, 1, direction, {
        origin: "contato",
        type: "perseguidor",
        entityId: enemy.id,
        collision: { player: { ...targetPlayer }, attacker: { ...enemy } }
      });
    }
    if (targetPlayer && this.altar && overlaps(enemy, this.altar) && enemy.altarAttackCooldown <= 0) {
      // Janela de resposta: com os inimigos agora marchando sobre o altar, um
      // intervalo de 1,7 s destruía o altar em ~5 s de contato, sem tempo de
      // o jogador voltar e limpar. 3,2 s dão ~13 s de contato até a queda.
      enemy.altarAttackCooldown = 3.2;
      enemy.lastAltarHitAt = this.elapsed;
      this.damageAltar(1, {
        origin: "contato",
        type: "perseguidor",
        entityId: enemy.id,
        collision: { altar: { ...this.altar }, attacker: { ...enemy } }
      });
    }
  }

  // Ponto que este perseguidor quer alcançar quando não está em perseguição.
  // Sem altar (arena bônus, sobrevivência) ele cai de volta sobre o jogador.
  // Quantos perseguidores exercem cada papel neste instante.
  countChaserRole(role, excluding = null) {
    let total = 0;
    for (const enemy of this.enemies) {
      if (enemy.removed || enemy.kind !== "chaser" || enemy === excluding) continue;
      if (enemy.chaserRole === role) total += 1;
    }
    return total;
  }

  siegeCount(excluding = null) {
    return this.countChaserRole(CHASER_ROLES.SIEGE, excluding);
  }

  // O papel é atribuído na entrada: as primeiras vagas sitiam o altar, o
  // excedente já nasce caçando. Sem altar (sobrevivência, arena), todos caçam.
  assignChaserRole(enemy) {
    if (!this.altar || this.gameMode !== "campaign") {
      enemy.chaserRole = CHASER_ROLES.HUNTER;
      return enemy.chaserRole;
    }
    // Há sempre ao menos um caçador em campo, e no máximo `maxSiege` cercando
    // o altar. Assim as duas pressões coexistem: o objetivo sob ataque e
    // alguém vindo atrás do jogador, onde quer que ele esteja.
    const hunters = this.countChaserRole(CHASER_ROLES.HUNTER, enemy);
    const sieges = this.countChaserRole(CHASER_ROLES.SIEGE, enemy);
    enemy.chaserRole = (hunters === 0 || sieges >= REMASTER.ai.maxSiege)
      ? CHASER_ROLES.HUNTER
      : CHASER_ROLES.SIEGE;
    return enemy.chaserRole;
  }

  // Converte um sitiante estacionado em caçador. É isto que impede o jogador
  // de se manter longe do altar atirando sem nunca ser procurado.
  escalateToHunter(enemy, reason) {
    if (enemy.chaserRole === CHASER_ROLES.HUNTER) return;
    enemy.chaserRole = CHASER_ROLES.HUNTER;
    enemy.siegeDwell = 0;
    this.emit("chaserRoleChanged", { enemyId: enemy.id, to: CHASER_ROLES.HUNTER, reason });
  }

  // Multiplicador de agressão por tempo de vida: quanto mais tempo o inimigo
  // sobrevive, mais rápido ele vem. Evita impasses longos.
  chaserAggression(enemy) {
    const age = Math.max(0, this.elapsed - (enemy.spawnedAt ?? this.elapsed));
    const ramp = Math.min(1, age / REMASTER.ai.aggressionRampSeconds);
    return 1 + ramp * REMASTER.ai.aggressionMaxBonus;
  }

  chaserGoal(enemy) {
    if (enemy && enemy.chaserRole === CHASER_ROLES.HUNTER) {
      const hunted = this.selectLivingPlayer(enemy);
      if (hunted) return { x: hunted.x + hunted.w / 2, y: hunted.y + hunted.h / 2 };
    }
    const altar = this.altar;
    if (altar) {
      if (enemy.altarBias === undefined) {
        enemy.altarBias = (this.random() * 2 - 1) * REMASTER.ai.altarSpread;
      }
      return { x: altar.x + altar.w / 2 + enemy.altarBias, y: altar.y + altar.h / 2 };
    }
    const target = this.selectLivingPlayer(enemy);
    if (!target) return { x: enemy.x + enemy.w / 2, y: enemy.y + enemy.h / 2 };
    return { x: target.x + target.w / 2, y: target.y + target.h / 2 };
  }

  // Procura o lado mais próximo onde o apoio acaba, para que o inimigo possa
  // DESCER até um alvo abaixo. Sem isto o perseguidor só andava na horizontal
  // e ficava preso em cima de plataformas ou contra paredes.
  findDescentDirection(enemy, preferred) {
    const dirs = preferred >= 0 ? [1, -1] : [-1, 1];
    for (let distance = 4; distance <= REMASTER.ai.descentProbeRange; distance += 4) {
      for (const dir of dirs) {
        const probeX = enemy.x + dir * distance;
        // Margem maior que o limite do corpo: a ausência de apoio junto à borda
        // do mundo não é uma rota de descida, é uma queda para fora do mapa.
        if (probeX < 6 || probeX > WORLD.width - enemy.w - 6) continue;
        if (!this.hasChaserPatrolSupport(probeX, enemy.y, enemy.w, enemy.h)) return dir;
      }
    }
    return 0;
  }

  // Há espaço livre acima para o salto subir sem bater em plataforma sólida?
  hasHeadroom(x, y, width, height, clearance) {
    const column = { x, y: y - clearance, w: width, h: height + clearance };
    return !this.platforms.some((platform) => !platform.oneWay && overlaps(column, platform));
  }

  // Lado mais próximo onde o salto não bate em teto, para então SUBIR um andar.
  // Com controle aéreo, saltar na borda e derivar coloca o corpo no andar de
  // cima; sem isto o perseguidor batia a cabeça e voltava ao mesmo ponto.
  findAscentDirection(enemy, preferred, clearance) {
    const dirs = preferred >= 0 ? [1, -1] : [-1, 1];
    for (let distance = 4; distance <= REMASTER.ai.descentProbeRange; distance += 4) {
      for (const dir of dirs) {
        const probeX = enemy.x + dir * distance;
        if (probeX < 1 || probeX > WORLD.width - enemy.w - 1) continue;
        if (this.hasHeadroom(probeX, enemy.y, enemy.w, enemy.h, clearance)) return dir;
      }
    }
    return 0;
  }

  chaserJumpApex() {
    const speed = this.encounter.chaserJumpSpeed;
    return (speed * speed) / (2 * BALANCE.player.gravity);
  }

  // Decide a direção final do passo: desvia para a borda quando precisa descer
  // e aplica a manobra de desencalhe quando o corpo para de progredir.
  resolveNavigation(enemy, dt, direction, targetX, targetY, enemyCenterX, enemyCenterY) {
    const ai = REMASTER.ai;

    // --- desencalhe: sem progresso horizontal por tempo demais ---
    if (enemy.onGround && Math.abs(enemy.vx) < ai.stuckSpeed
      && Math.abs(targetX - enemyCenterX) > enemy.w) {
      enemy.stuckClock = (enemy.stuckClock ?? 0) + dt;
    } else {
      enemy.stuckClock = 0;
    }
    if ((enemy.unstickTimer ?? 0) > 0) {
      enemy.unstickTimer -= dt;
      return enemy.unstickDir || direction;
    }
    if (enemy.stuckClock >= ai.stuckSeconds) {
      enemy.stuckClock = 0;
      enemy.unstickTimer = ai.unstickSeconds;
      // Vai para a borda mais próxima; na falta dela, inverte e pula.
      const escape = this.findDescentDirection(enemy, -Math.sign(direction) || 1);
      enemy.unstickDir = escape || -direction;
      if (enemy.onGround) {
        enemy.vy = -this.encounter.chaserJumpSpeed * 0.9;
        enemy.onGround = false;
      }
      return enemy.unstickDir;
    }

    enemy.ascentJumpClock = Math.max(0, (enemy.ascentJumpClock ?? 0) - dt);
    enemy.wantsAscend = false;

    if (!enemy.onGround) {
      // No ar a rota não é reavaliada: o corpo segue para o alvo com controle
      // aéreo, que é o que o coloca no andar de cima depois do salto de borda.
      enemy.routeDir = 0;
      enemy.routeCommit = 0;
      return direction;
    }

    // --- descida deliberada quando o alvo está abaixo ---
    if (targetY > enemyCenterY + ai.descentThreshold) {
      if (!enemy.routeDir) {
        enemy.routeDir = this.findDescentDirection(enemy, direction);
        enemy.routeCommit = ai.routeCommitSeconds;
      } else {
        enemy.routeCommit = (enemy.routeCommit ?? 0) - dt;
        if (enemy.routeCommit <= 0) enemy.routeDir = 0;
      }
      if (enemy.routeDir) return enemy.routeDir;
      return direction;
    }

    // --- subida deliberada quando o alvo está acima ---
    if (targetY < enemyCenterY - ai.ascentThreshold) {
      const clearance = this.chaserJumpApex();
      if (this.hasHeadroom(enemy.x, enemy.y, enemy.w, enemy.h, clearance)) {
        enemy.routeDir = 0;
        enemy.routeCommit = 0;
        if (enemy.ascentJumpClock <= 0) {
          enemy.wantsAscend = true;
          enemy.ascentJumpClock = ai.ascentJumpCooldown;
        }
        return direction;
      }
      if (!enemy.routeDir) {
        enemy.routeDir = this.findAscentDirection(enemy, direction, clearance);
        enemy.routeCommit = ai.routeCommitSeconds;
      } else {
        enemy.routeCommit = (enemy.routeCommit ?? 0) - dt;
        if (enemy.routeCommit <= 0) enemy.routeDir = 0;
      }
      if (enemy.routeDir) return enemy.routeDir;
      return direction;
    }

    enemy.routeDir = 0;
    enemy.routeCommit = 0;
    return direction;
  }

  updateShooter(enemy, dt) {
    enemy.phaseTime -= dt;
    if (enemy.phase === "telegraph" && enemy.phaseTime <= 0) {
      if (!this.fireEnemyShot(enemy)) {
        enemy.blockedAim = (enemy.blockedAim ?? 0) + 0.12;
        if (enemy.blockedAim >= SHOOTER_MAX_BLOCKED_AIM_SECONDS) {
          enemy.removed = true;
          this.emit("enemyExited", { kind: "shooter", reason: "mira-bloqueada" });
          return;
        }
        enemy.phaseTime = 0.12;
        return;
      }
      enemy.blockedAim = 0;
      enemy.shots += 1;
      enemy.phase = "recovery";
      enemy.phaseTime = this.encounter.shooterRecovery;
      return;
    }
    if (enemy.phase === "recovery" && enemy.phaseTime <= 0) {
      if (enemy.shots >= this.encounter.shooterShotsBeforeExit) {
        enemy.removed = true;
        this.emit("enemyExited", { kind: "shooter" });
      } else {
        const targetPlayer = this.selectLivingPlayer(enemy);
        if (!targetPlayer) return;
        const aim = center(targetPlayer);
        enemy.targetPlayerId = targetPlayer.id;
        enemy.aimX = aim.x;
        enemy.aimY = aim.y;
        enemy.facing = aim.x >= enemy.x ? 1 : -1;
        enemy.phase = "telegraph";
        enemy.phaseTime = this.encounter.shooterTelegraph;
      }
    }
  }

  patrolShooterMuzzle(enemy) {
    const config = BALANCE.encounter.patrolShooter;
    return {
      x: enemy.x + enemy.w / 2 + enemy.facing * config.muzzleForward,
      y: enemy.y + config.muzzleY
    };
  }

  hasClearShot(origin, target) {
    const probe = { x: origin.x - 0.5, y: origin.y - 0.5, w: 1, h: 1 };
    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    return !this.platforms.some((platform) => !platform.oneWay && sweptAabb(probe, dx, dy, platform) !== null);
  }

  canPatrolShooterAim(enemy) {
    const targetPlayer = this.selectLivingPlayer(enemy);
    if (!targetPlayer || !enemy.onGround) return false;
    const target = center(targetPlayer);
    const origin = this.patrolShooterMuzzle(enemy);
    return Math.hypot(target.x - origin.x, target.y - origin.y) <= BALANCE.encounter.patrolShooter.range
      && this.hasClearShot(origin, target);
  }

  beginPatrolShooterAim(enemy) {
    const targetPlayer = this.selectLivingPlayer(enemy);
    if (!targetPlayer) return false;
    const target = center(targetPlayer);
    enemy.phase = "aim";
    enemy.phaseTime = BALANCE.encounter.patrolShooter.aimSeconds;
    enemy.aimX = target.x;
    enemy.aimY = target.y;
    enemy.targetPlayerId = targetPlayer.id;
    enemy.facing = target.x >= enemy.x + enemy.w / 2 ? 1 : -1;
    enemy.vx = 0;
    this.emit("patrolShooterWarning", {
      enemyId: enemy.id,
      aim: { x: enemy.aimX, y: enemy.aimY },
      duration: enemy.phaseTime
    });
  }

  updatePatrolShooter(enemy, dt) {
    const config = BALANCE.encounter.patrolShooter;
    enemy.recoilTime = Math.max(0, enemy.recoilTime - dt);
    enemy.fireFeedbackTime = Math.max(0, (enemy.fireFeedbackTime ?? 0) - dt);

    if (enemy.phase === "patrol") {
      enemy.patrolElapsed += dt;
      const nextX = enemy.x + enemy.patrolDirection * config.patrolSpeed * dt;
      const probeX = enemy.patrolDirection > 0
        ? nextX + enemy.w - config.edgeClearance
        : nextX + config.edgeClearance;
      const outsideRoute = nextX < enemy.patrolLeft || nextX > enemy.patrolRight;
      const missingSupport = !this.hasPatrolSupport(probeX, enemy.y + enemy.h);
      if (outsideRoute || missingSupport) enemy.patrolDirection *= -1;
      enemy.facing = enemy.patrolDirection;
      enemy.vx = enemy.patrolDirection * config.patrolSpeed;
      enemy.vy = Math.min(enemy.vy + BALANCE.player.gravity * dt, BALANCE.player.maxFallSpeed);
      const movement = this.moveBody(enemy, dt);
      if (movement.hitX) {
        enemy.patrolDirection *= -1;
        enemy.facing = enemy.patrolDirection;
      }
      enemy.x = Math.min(enemy.patrolRight, Math.max(enemy.patrolLeft, enemy.x));
      if (enemy.patrolElapsed >= config.minimumPatrolSeconds && this.canPatrolShooterAim(enemy)) {
        this.beginPatrolShooterAim(enemy);
      }
    } else if (enemy.phase === "aim") {
      enemy.vx = 0;
      enemy.phaseTime = Math.max(0, enemy.phaseTime - dt);
      if (enemy.phaseTime <= 0) {
        enemy.phase = "fire";
        enemy.phaseTime = config.fireSeconds;
      }
    } else if (enemy.phase === "fire") {
      enemy.vx = 0;
      enemy.phaseTime = Math.max(0, enemy.phaseTime - dt);
      if (enemy.phaseTime <= 0) {
        const fired = this.firePatrolShooterShot(enemy);
        enemy.phase = "recovery";
        enemy.phaseTime = config.recoverySeconds;
        enemy.recoilTime = fired ? 0.28 : 0;
        enemy.fireFeedbackTime = fired ? config.fireFeedbackSeconds : 0;
        if (fired) enemy.shots += 1;
        else this.emit("patrolShooterShotDenied", { enemyId: enemy.id });
      }
    } else if (enemy.phase === "recovery") {
      enemy.vx = 0;
      enemy.phaseTime = Math.max(0, enemy.phaseTime - dt);
      if (enemy.phaseTime <= 0) {
        enemy.phase = "patrol";
        enemy.patrolElapsed = 0;
      }
    }

    if (!enemy.removed) advanceAnimationClock(enemy, enemy.phase, dt);
  }

  firePatrolShooterShot(enemy) {
    const config = BALANCE.encounter.patrolShooter;
    const enemyShots = this.countActiveProjectiles("enemy");
    const phase = this.getEncounterPhase();
    if (enemyShots >= phase.maxEnemyShots || this.projectiles.length >= this.encounter.maxProjectiles) return false;
    if (this.elapsed - this.lastEnemyShotAt < this.encounter.minimumShotGap) return false;
    const origin = this.patrolShooterMuzzle(enemy);
    const target = { x: enemy.aimX, y: enemy.aimY };
    if (!this.hasClearShot(origin, target)) return false;
    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    const magnitude = Math.max(1, Math.hypot(dx, dy));
    this.projectiles.push({
      id: this.createEntityId("projectile-enemy"),
      team: "enemy",
      x: origin.x - 4,
      y: origin.y - 4,
      spawnPosition: { x: origin.x - 4, y: origin.y - 4 },
      w: 8,
      h: 8,
      vx: (dx / magnitude) * config.projectileSpeed,
      vy: (dy / magnitude) * config.projectileSpeed,
      life: 4.5,
      age: 0,
      sourceId: enemy.id,
      removed: false
    });
    this.lastEnemyShotAt = this.elapsed;
    this.emit("enemyShot", { kind: enemy.kind, enemyId: enemy.id });
    return true;
  }

  fireEnemyShot(enemy) {
    const enemyShots = this.countActiveProjectiles("enemy");
    const phase = this.getEncounterPhase();
    if (enemyShots >= phase.maxEnemyShots || this.projectiles.length >= this.encounter.maxProjectiles) return false;
    if (this.elapsed - this.lastEnemyShotAt < this.encounter.minimumShotGap) return false;
    const origin = center(enemy);
    const dx = enemy.aimX - origin.x;
    const dy = enemy.aimY - origin.y;
    const magnitude = Math.max(1, Math.hypot(dx, dy));
    this.projectiles.push({
      id: this.createEntityId("projectile-enemy"),
      team: "enemy",
      x: origin.x - 4,
      y: origin.y - 4,
      spawnPosition: { x: origin.x - 4, y: origin.y - 4 },
      w: 8,
      h: 8,
      vx: (dx / magnitude) * this.encounter.shooterShotSpeed * (this.gameMode === "survival" ? this.survivalEnemySpeedMultiplier : 1),
      vy: (dy / magnitude) * this.encounter.shooterShotSpeed * (this.gameMode === "survival" ? this.survivalEnemySpeedMultiplier : 1),
      life: 4.5,
      age: 0,
      sourceId: enemy.id,
      removed: false
    });
    this.lastEnemyShotAt = this.elapsed;
    this.emit("enemyShot");
    return true;
  }

  updateProjectiles(dt) {
    for (const shot of this.projectiles) {
      if (!["playing", "bonusPlaying", "survival"].includes(this.state)
        || !this.hasLivingPlayer()
        || (this.altar && this.altar.life <= 0)) break;
      if (shot.removed) continue;
      shot.life -= dt;
      if (shot.life <= 0) {
        shot.removed = true;
        continue;
      }
      shot.age = (shot.age ?? 0) + dt;
      if (shot.team === "player") {
        const trailLimit = this.reducedMotion ? 2 : 6;
        const trailDuration = this.reducedMotion ? 0.07 : 0.12;
        shot.trail ??= [];
        let reusablePoint = null;
        let write = 0;
        for (let read = 0; read < shot.trail.length; read += 1) {
          const point = shot.trail[read];
          point.life -= dt;
          if (point.life > 0) shot.trail[write++] = point;
          else if (!reusablePoint) reusablePoint = point;
        }
        shot.trail.length = write;
        while (shot.trail.length > trailLimit - 1) reusablePoint = shot.trail.shift();
        const point = reusablePoint ?? { x: 0, y: 0, life: 0, duration: 0 };
        point.x = shot.x + shot.w / 2;
        point.y = shot.y + shot.h / 2;
        point.life = trailDuration;
        point.duration = trailDuration;
        shot.trail.push(point);
      }

      const start = this.projectileStartRect ?? (this.projectileStartRect = { x: 0, y: 0, w: 0, h: 0 });
      start.x = shot.x;
      start.y = shot.y;
      start.w = shot.w;
      start.h = shot.h;
      shot.previousX = shot.x;
      shot.previousY = shot.y;
      const dx = shot.vx * dt;
      const dy = shot.vy * dt;
      let impactTime = Infinity;
      let impactPriority = Infinity;
      let impactType = "";
      let impactTarget = null;
      for (const platform of this.platforms) {
        if (platform.oneWay) continue;
        const time = sweptAabb(start, dx, dy, platform);
        if (time !== null && (time < impactTime || (time === impactTime && impactPriority > 0))) {
          impactTime = time;
          impactPriority = 0;
          impactType = "wall";
          impactTarget = platform;
        }
      }

      if (shot.team === "player") {
        for (let index = 0; index < this.enemies.length; index += 1) {
          const target = this.enemies[index];
          if (target.removed) continue;
          const previous = target.previous ?? target;
          const relativeDx = dx - (target.x - previous.x);
          const relativeDy = dy - (target.y - previous.y);
          const time = sweptAabb(start, relativeDx, relativeDy, previous);
          if (time !== null && time < impactTime) {
            impactTime = time;
            impactPriority = 1;
            impactType = "enemy";
            impactTarget = target;
          }
        }
      } else {
        const players = this.coopPreview && Array.isArray(this.players) ? this.players : null;
        const playerCount = players ? players.length : (this.player ? 1 : 0);
        for (let index = 0; index < playerCount; index += 1) {
          const target = players ? players[index] : this.player;
          if (!target || target.life <= 0 || target.inactive) continue;
          const previous = target.previous ?? target;
          const relativeDx = dx - (target.x - previous.x);
          const relativeDy = dy - (target.y - previous.y);
          const time = sweptAabb(start, relativeDx, relativeDy, previous);
          if (time !== null && time < impactTime) {
            impactTime = time;
            impactPriority = 1;
            impactType = "player";
            impactTarget = target;
          }
        }
        const target = this.altar;
        if (target) {
          const previous = target.previous ?? target;
          const relativeDx = dx - (target.x - previous.x);
          const relativeDy = dy - (target.y - previous.y);
          const time = sweptAabb(start, relativeDx, relativeDy, previous);
          if (time !== null && time < impactTime) {
            impactTime = time;
            impactPriority = 1;
            impactType = "altar";
            impactTarget = target;
          }
        }
      }

      let impact = null;
      if (impactTarget) {
        impact = this.projectileImpactScratch ?? (this.projectileImpactScratch = { time: 0, priority: 0, type: "", target: null });
        impact.time = impactTime;
        impact.priority = impactPriority;
        impact.type = impactType;
        impact.target = impactTarget;
      }
      if (impact) {
        shot.x = start.x + dx * impact.time;
        shot.y = start.y + dy * impact.time;
        shot.removed = true;
        const projectileRect = { x: shot.x, y: shot.y, w: shot.w, h: shot.h };
        const trajectory = {
          origin: shot.spawnPosition ?? { x: start.x, y: start.y },
          from: { x: start.x, y: start.y },
          to: { x: shot.x, y: shot.y },
          impactFraction: impact.time,
          flightSeconds: shot.age,
          velocity: { x: shot.vx, y: shot.vy }
        };
        if (impact.type === "wall") {
          if (shot.team === "player") {
            this.addEffect("pulseImpact", shot.x + shot.w / 2, shot.y + shot.h / 2, "", 0.18);
            this.addEffect("blockedShot", shot.x + shot.w / 2, shot.y + shot.h / 2, "BLOQUEADO", 0.48);
          } else if (shot.team === "bonusCannon") this.addEffect("bonusCannonImpact", shot.x + shot.w / 2, shot.y + shot.h / 2, "", 0.2);
          else this.addEffect("blockedShot", shot.x + shot.w / 2, shot.y + shot.h / 2, "BLOQUEADO", 0.48);
          this.emit("projectileBlocked", {
            projectileId: shot.id,
            sourceId: shot.sourceId,
            rect: projectileRect,
            trajectory,
            obstacle: { ...impact.target }
          });
          continue;
        }
        if (impact.type === "enemy") {
          if (shot.team === "player") this.addEffect("pulseImpact", shot.x + shot.w / 2, shot.y + shot.h / 2, "", 0.18);
          this.emit("projectileHit", {
            projectileId: shot.id,
            sourceId: shot.sourceId,
            targetId: impact.target.id,
            rect: projectileRect,
            targetRect: { ...impact.target }
          });
          if (this.enemies.includes(impact.target) && !impact.target.removed) {
            this.damageEnemy(impact.target, shot.damage ?? BALANCE.player.shotDamage, {
              type: "projétil-jogador",
              projectileId: shot.id,
              sourceId: shot.sourceId,
              collision: { projectile: projectileRect, target: { ...impact.target }, trajectory }
            });
          }
          continue;
        }
        if (impact.type === "player") {
          if (shot.team === "bonusCannon") {
            this.applyBonusCannonPenalty(shot, { projectile: projectileRect, target: { ...this.player }, trajectory });
            continue;
          }
          this.damagePlayerTarget(impact.target, 1, Math.sign(shot.vx), {
            origin: "projétil",
            type: "projétil-inimigo",
            entityId: shot.sourceId,
            projectileId: shot.id,
            collision: { projectile: projectileRect, target: { ...impact.target }, trajectory }
          });
          continue;
        }
        if (impact.type === "altar") {
          this.damageAltar(1, {
            origin: "projétil",
            type: "projétil-inimigo",
            entityId: shot.sourceId,
            projectileId: shot.id,
            collision: { projectile: projectileRect, target: { ...this.altar }, trajectory }
          });
        }
        continue;
      }

      shot.x += dx;
      shot.y += dy;
      if (shot.x < -24 || shot.x > WORLD.width + 24 || shot.y < -24 || shot.y > WORLD.height + 24) {
        shot.removed = true;
        this.emit("projectileExpired", { projectileId: shot.id, sourceId: shot.sourceId, rect: { ...shot } });
      }
    }
  }

  updateSouls(input) {
    for (const soul of this.souls) {
      if (soul.removed) continue;
      if (overlaps(this.player, soul) && this.carriedSouls < this.objective.soulsGoal) {
        soul.removed = true;
        this.carriedSouls += 1;
        this.addEffect("collect", soul.x + soul.w / 2, soul.y + soul.h / 2, "+1 CARREGADA", 0.75);
        this.renderer?.spawnFloatingText?.("+1 SOUL", soul.x + soul.w / 2, soul.y + soul.h / 2, "soul");
        this.notice = { text: `ALMAS CARREGADAS ${this.carriedSouls} · DEPÓSITO ${this.altar.deposited}/${this.objective.soulsGoal}`, time: 1.1 };
        this.emit("soulCollected");
      }
    }

    if (input.interactPressed && distanceBetween(this.player, this.altar) <= this.objective.depositRadius && this.carriedSouls > 0) {
      const capacity = this.objective.soulsGoal - this.altar.deposited;
      const amount = Math.min(capacity, this.carriedSouls);
      this.carriedSouls -= amount;
      this.altar.deposited += amount;
      this.updateAltarPhase();
      this.addEffect("deposit", this.altar.x + this.altar.w / 2, this.altar.y + 12, `+${amount} NO ALTAR`, 1.15);
      this.notice = { text: `ALTAR ${this.altar.deposited}/${this.objective.soulsGoal}`, time: 1.45 };
      this.emit("soulsDeposited", { amount });
    }
  }

  killEnemy(enemy, cause = { type: "ataque-corpo-a-corpo", sourceId: this.player?.id }) {
    if (enemy.removed) return;
    enemy.removed = true;
    if (enemy.kind === "chaser") {
      this.defeatVisuals.push({
        id: `${enemy.id}:defeat`,
        sourceId: enemy.id,
        kind: "chaser",
        x: enemy.x,
        y: enemy.y,
        facing: enemy.facing,
        dying: true,
        animState: "dead",
        animTime: 0,
        life: BALANCE.presentation.chaserDefeatSeconds
      });
      if (this.defeatVisuals.length > BALANCE.presentation.maxDefeatVisuals) {
        this.defeatVisuals.splice(0, this.defeatVisuals.length - BALANCE.presentation.maxDefeatVisuals);
      }
    }
    this.kills += 1;
    const comboCount = this.registerComboKill();
    this.applyKnockback(enemy, this.knockbackDirection(enemy, cause), REMASTER.knockback.kill);
    this.pulseHitStop(REMASTER.hitStop.enemyKill);
    this.requestShake(2.6 + comboCount * REMASTER.combo.shakeStep);
    this.addEffect("hit", enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, "ACERTO", 0.42);
    if (this.gameMode === "campaign") {
      // Recompensa de sequência: a cada N derrotas encadeadas dentro da janela
      // de combo, a derrota libera uma alma extra. É o único multiplicador que
      // altera o objetivo, e ele premia agressividade sem encurtar a meta.
      const comboReward = comboCount > 0 && comboCount % REMASTER.combo.soulBonusEvery === 0;
      const drops = comboReward ? 2 : 1;
      const soulWidth = 15;
      const soulHeight = 16;
      const baseX = enemy.x + enemy.w / 2 - soulWidth / 2;
      // A alma extra sai para o lado que tiver espaço: perto da borda direita
      // do mundo, um deslocamento fixo a colocaria parcialmente fora da tela.
      const spread = baseX + 12 + soulWidth <= WORLD.width - 2 ? 12 : -12;
      for (let index = 0; index < drops; index += 1) {
        const offsetX = index === 0 ? 0 : spread;
        this.souls.push({
          x: Math.max(2, Math.min(WORLD.width - soulWidth - 2, baseX + offsetX)),
          y: Math.max(2, Math.min(WORLD.height - soulHeight - 2, enemy.y + enemy.h / 2 - soulHeight / 2)),
          w: soulWidth,
          h: soulHeight,
          bornAt: this.elapsed,
          source: index === 0 ? enemy.kind : "combo",
          removed: false
        });
      }
      if (comboReward) {
        this.addEffect("comboReward", enemy.x + enemy.w / 2, enemy.y - 6, `COMBO x${comboCount}`, 0.75);
        this.emit("comboReward", { combo: comboCount, souls: drops });
      }
    }
    this.emit("enemyDefeated", { kind: enemy.kind, enemyId: enemy.id, cause });
  }

  // Projéteis de arma carregam o próprio dano e recuo.
  projectileDamage(shot) {
    return Number.isFinite(shot?.damage) ? shot.damage : BALANCE.player.shotDamage;
  }

  damageEnemy(enemy, amount, cause = {}) {
    if (!enemy || enemy.removed) return false;
    const damage = Number.isFinite(amount) ? Math.max(0, amount) : 0;
    if (damage <= 0) return false;

    // As demais classes preservam o contrato anterior de derrota no primeiro
    // ataque válido. HP autoritativo pertence somente ao Chaser nesta etapa.
    if (enemy.kind !== "chaser") {
      this.killEnemy(enemy, cause);
      return true;
    }

    if (!Number.isFinite(enemy.maxHp)) enemy.maxHp = this.encounter.chaserMaxHp;
    if (!Number.isFinite(enemy.hp)) enemy.hp = enemy.maxHp;
    const hpBefore = enemy.hp;
    enemy.hp = Math.max(0, enemy.hp - damage);
    enemy.hurtFlash = this.encounter.chaserHurtFlashSeconds;
    this.applyKnockback(enemy, this.knockbackDirection(enemy, cause), REMASTER.knockback.hit);
    this.pulseHitStop(REMASTER.hitStop.enemyHit);
    this.requestShake(1.7);
    this.addEffect("enemyDamage", enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, `-${damage}`, 0.32);
    this.renderer?.spawnFloatingText?.(`-${damage}`, enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, "damage");
    this.emit("enemyDamaged", {
      kind: enemy.kind,
      enemyId: enemy.id,
      amount: damage,
      hpBefore,
      hpAfter: enemy.hp,
      cause
    });
    if (enemy.hp <= 0) this.killEnemy(enemy, cause);
    return true;
  }

  createEntityId(type) {
    this.nextEntityNumber += 1;
    return `${this.runId}:${type}:${this.nextEntityNumber}`;
  }

  /* ----------------------------------------------------------------------
   * Remasterização v0.7.0 — camada de impacto (hit stop, recuo, tremor),
   * sequência de derrotas e investida direcional.
   * -------------------------------------------------------------------- */

  pulseHitStop(seconds) {
    if (this.demoMode || this.reducedMotion) return;
    this.hitStop = Math.min(REMASTER.hitStop.maximum, Math.max(this.hitStop, seconds));
  }

  requestShake(amount) {
    if (this.reducedMotion) return;
    this.shakeRequest = Math.min(REMASTER.shake.maximum, Math.max(this.shakeRequest, amount));
  }

  knockbackDirection(entity, cause = {}) {
    if (Number.isFinite(cause.knockbackDir) && cause.knockbackDir !== 0) {
      return Math.sign(cause.knockbackDir);
    }
    const targetX = entity.x + (entity.w ?? 0) / 2;
    if (Number.isFinite(cause.originX)) return Math.sign(targetX - cause.originX) || 1;
    const player = this.player;
    if (!player) return 1;
    return Math.sign(targetX - (player.x + (player.w ?? 0) / 2)) || player.facing || 1;
  }

  applyKnockback(enemy, direction, strength) {
    if (!enemy || enemy.removed) return;
    const dir = direction >= 0 ? 1 : -1;
    enemy.vx = dir * strength;
    enemy.knockback = REMASTER.knockback.aiSuppress;
    if (enemy.onGround && strength >= REMASTER.knockback.kill) {
      enemy.vy = -90;
      enemy.onGround = false;
    }
  }

  registerComboKill() {
    this.combo = Math.min(REMASTER.combo.maxDisplay, this.combo + 1);
    this.comboTimer = REMASTER.combo.windowSeconds;
    if (this.combo > this.comboBest) this.comboBest = this.combo;
    this.emit("comboAdvanced", { combo: this.combo, best: this.comboBest });
    return this.combo;
  }

  updateCombo(dt) {
    if (this.comboTimer <= 0) return;
    this.comboTimer = Math.max(0, this.comboTimer - dt);
    if (this.comboTimer > 0) return;
    const ended = this.combo;
    this.combo = 0;
    if (ended >= 2) this.emit("comboEnded", { combo: ended, best: this.comboBest });
  }

  comboRatio() {
    if (this.combo <= 0) return 0;
    return Math.max(0, Math.min(1, this.comboTimer / REMASTER.combo.windowSeconds));
  }

  dashAllowed() {
    const player = this.player;
    if (!player || player.life <= 0) return false;
    if (this.state !== "playing" && this.state !== "survival" && this.state !== "bonusPlaying") return false;
    return (player.dashCooldown ?? 0) <= 0 && (player.dashTimer ?? 0) <= 0;
  }

  tryDash(direction) {
    if (!this.dashAllowed()) return false;
    const player = this.player;
    player.dashTimer = REMASTER.dash.duration;
    player.dashCooldown = REMASTER.dash.cooldown;
    player.dashDir = direction >= 0 ? 1 : -1;
    player.facing = player.dashDir;
    player.dashTapWindow = 0;
    player.dashTapDir = 0;
    player.vy = 0;
    // A investida é uma esquiva real: os i-frames cobrem toda a duração mais
    // uma pequena folga de recuperação.
    player.invulnerable = Math.max(player.invulnerable ?? 0, REMASTER.dash.invulnerability);
    this.requestShake(1.1);
    this.emit("dash", { direction: player.dashDir });
    return true;
  }

  applyDamage(targetName, amount, cause = {}, direction = 0, playerTarget = null) {
    const isPlayer = targetName === "player";
    const target = isPlayer ? (playerTarget ?? this.player) : this.altar;
    if (!target || !["playing", "bonusPlaying", "survival"].includes(this.state) || target.life <= 0) return false;
    if (target.invulnerable > 0) {
      this.emit("damageIgnored", { target: targetName, reason: "invulnerable", cause });
      return false;
    }
    if (isPlayer && target.shield) {
      target.shield = false;
      target.invulnerable = BALANCE.player.invulnerability;
      this.addEffect("blockedShot", target.x + target.w / 2, target.y + target.h / 2, "BLOQUEADO", 0.62);
      this.emit("damageIgnored", { target: targetName, playerId: target.id, reason: "shield", cause });
      this.emit("powerUpExpired", { id: "shield", playerId: target.id });
      return false;
    }

    const lifeBefore = target.life;
    target.life = Math.max(0, target.life - amount);
    target.invulnerable = isPlayer ? BALANCE.player.invulnerability : this.objective.altarInvulnerability;
    const targetRect = { x: target.x, y: target.y, w: target.w, h: target.h };
    if (isPlayer) {
      target.hurtFlash = 0.24;
      target.vx = (direction || -target.facing) * 115;
      target.vy = -145;
      // Levar dano interrompe a investida e zera a sequência de derrotas: o
      // combo passa a ser um recurso que se arrisca, não um acúmulo passivo.
      target.dashTimer = 0;
      target.squash = 0;
      const brokenCombo = this.combo;
      this.combo = 0;
      this.comboTimer = 0;
      if (brokenCombo >= 2) this.emit("comboBroken", { combo: brokenCombo });
      this.pulseHitStop(REMASTER.hitStop.playerHit);
      this.requestShake(4.2);
      this.addEffect("damage", target.x + target.w / 2, target.y + target.h / 2, "DANO", 0.72);
      this.renderer?.spawnFloatingText?.(`-${amount}`, target.x + target.w / 2, target.y + target.h / 2, "damage");
    } else {
      this.requestShake(3);
      this.updateAltarPhase();
      this.addEffect("altarDamage", target.x + target.w / 2, target.y + 10, "ALTAR ATINGIDO", 0.82);
      if (target.life === 1) {
        this.notice = { text: "ALTAR EM PERIGO — 1 IMPACTO PARA CAIR", time: 2.2 };
      }
    }

    let diagnostic;
    if (this.debug) {
      diagnostic = {
        timestamp: new Date().toISOString(),
        performanceTime: globalThis.performance?.now?.() ?? null,
        matchTime: this.elapsed,
        runId: this.runId,
        target: targetName,
        origin: cause.origin ?? "desconhecida",
        type: cause.type ?? "desconhecido",
        entityId: cause.entityId ?? cause.sourceId ?? null,
        projectileId: cause.projectileId ?? null,
        amount,
        lifeBefore,
        lifeAfter: target.life,
        targetRect,
        collision: cause.collision ?? null
      };
      this.damageDiagnostics.push(diagnostic);
      if (this.damageDiagnostics.length > 200) this.damageDiagnostics.shift();
      console.info("[BoyPunk damage]", diagnostic);
    }
    this.emit(isPlayer ? "playerDamaged" : "altarDamaged", {
      amount,
      cause,
      diagnostic,
      ...(isPlayer ? { playerId: target.id } : {})
    });
    if (!isPlayer && target.life === 1) this.emit("altarCritical", { life: target.life, cause });

    return true;
  }

  damagePlayer(amount, direction = 0, cause = {}) {
    return this.applyDamage("player", amount, cause, direction);
  }

  damagePlayerTarget(player, amount, direction = 0, cause = {}) {
    return this.applyDamage("player", amount, cause, direction, player);
  }

  damageAltar(amount, cause = {}) {
    return this.applyDamage("altar", amount, cause);
  }

  moveBody(body, dt) {
    const result = { hitX: false, hitY: false };
    const oldX = body.x;
    const dx = body.vx * dt;
    const dy = body.vy * dt;
    body.x += dx;
    for (const platform of this.platforms) {
      if (platform.oneWay || !overlaps(body, platform)) continue;
      let horizontalEntryTime = 0;
      if (dx > 0 && oldX + body.w <= platform.x) {
        horizontalEntryTime = (platform.x - (oldX + body.w)) / dx;
      } else if (dx < 0 && oldX >= platform.x + platform.w) {
        horizontalEntryTime = (oldX - (platform.x + platform.w)) / -dx;
      }
      let verticalExitTime = Infinity;
      if (dy < 0 && body.y + body.h > platform.y && body.y + body.h + dy <= platform.y) {
        verticalExitTime = (body.y + body.h - platform.y) / -dy;
      } else if (dy > 0 && body.y < platform.y + platform.h && body.y + dy >= platform.y + platform.h) {
        verticalExitTime = (platform.y + platform.h - body.y) / dy;
      }
      if (verticalExitTime <= horizontalEntryTime) continue;
      if (body.vx > 0) body.x = platform.x - body.w - EPSILON;
      else if (body.vx < 0) body.x = platform.x + platform.w + EPSILON;
      body.vx = 0;
      result.hitX = true;
    }

    const oldY = body.y;
    const oldBottom = oldY + body.h;
    body.y += dy;
    body.onGround = false;
    for (const platform of this.platforms) {
      if (!overlaps(body, platform)) continue;
      if (body.vy >= 0 && oldBottom <= platform.y + 3) {
        body.y = platform.y - body.h;
        body.vy = 0;
        body.onGround = true;
        result.hitY = true;
      } else if (!platform.oneWay && body.vy < 0 && oldY >= platform.y + platform.h - 3) {
        body.y = platform.y + platform.h;
        body.vy = 0;
        result.hitY = true;
      }
    }
    return result;
  }

  cleanupEntities() {
    compactRemovedInPlace(this.enemies);
    compactRemovedInPlace(this.projectiles);
    compactRemovedInPlace(this.souls);
    compactRemovedInPlace(this.powerUps);
    compactLivingEffectsInPlace(this.effects);
  }

  updateDefeatVisuals(dt) {
    for (const visual of this.defeatVisuals) {
      visual.life -= dt;
      advanceAnimationClock(visual, "dead", dt);
    }
    compactLivingEffectsInPlace(this.defeatVisuals);
  }

  resolveTerminalOutcome() {
    if (this.state === "survival") {
      if (this.player.life <= 0) this.endSurvival();
      return this.state !== "survival";
    }
    if (this.state !== "playing") return true;
    if (this.player.life <= 0) this.beginPlayerDefeat("Você foi derrotado");
    else if (this.altar.life <= 0) this.endRun("defeat", "Altar destruído");
    else if (this.altar.deposited >= this.objective.soulsGoal) this.beginVictory();
    return this.state !== "playing";
  }

  endSurvival() {
    if (this.state !== "survival" || this.terminalResult) return false;
    const result = Object.freeze({
      wave: this.survivalWave,
      activeSeconds: this.elapsed,
      kills: this.kills
    });
    this.survivalResult = result;
    this.terminalResult = { state: "survivalDefeat", reason: "player", committedAt: this.elapsed, stats: result };
    this.state = "survivalDefeat";
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.attackTimer = 0;
    this.player.attackCooldown = 0;
    this.player.animState = "die";
    this.player.animTime = 0;
    this.projectiles = [];
    this.clearTransientPowerUps();
    this.clearTransientCharacterState();
    this.emit("survivalEnded", { result });
    return true;
  }

  addEffect(kind, x, y, text = "", duration = 0.6, metadata = {}) {
    if (kind === "blockedShot") {
      const existing = this.effects.find((effect) => (
        effect.kind === kind
        && effect.life > 0
        && effect.ownerId === metadata.ownerId
        && Math.hypot(effect.x - x, effect.y - y) <= BLOCKED_SHOT_FEEDBACK.mergeRadius
      ));
      if (existing) {
        existing.repeatCount = (existing.repeatCount ?? 1) + 1;
        return existing;
      }
      duration = Math.min(duration, BLOCKED_SHOT_FEEDBACK.durationSeconds);
    }
    const effect = { kind, x, y, text, life: duration, duration, ...metadata };
    this.effects.push(effect);
    if (this.effects.length > 36) this.effects.splice(0, this.effects.length - 36);
    return effect;
  }

  canDeposit() {
    return Boolean(this.player && this.altar && this.carriedSouls > 0 && distanceBetween(this.player, this.altar) <= this.objective.depositRadius);
  }

  updateAltarPhase() {
    if (!this.altar) return;
    const soulsGoal = this.objective?.soulsGoal || 12;
    const ratio = Math.max(0, Math.min(1, (this.altar.deposited ?? 0) / soulsGoal));
    let phase = 1;
    if (ratio >= 0.75) phase = 4;
    else if (ratio >= 0.5) phase = 3;
    else if (ratio >= 0.25) phase = 2;
    else phase = 1;

    if (this.altar.life === 1) {
      phase = Math.max(phase, 4);
    } else if (this.altar.life === 2) {
      phase = Math.max(phase, 3);
    }
    this.altar.phase = phase;
  }

  endRun(state, reason = "") {
    if (state === "victory") {
      this.beginVictory();
      return;
    }
    if (this.state !== "playing") return;
    this.terminalResult = { state, reason, committedAt: this.elapsed };
    this.state = state;
    this.defeatReason = reason;
    this.projectiles = [];
    this.defeatVisuals = [];
    this.clearTransientPowerUps();
    this.clearTransientCharacterState();
    this.emit("defeat", { reason });
  }

  beginVictory() {
    if (this.state !== "playing" || this.terminalResult) return;
    const stats = Object.freeze({
      levelId: this.levelId,
      levelTitle: this.level.title,
      activeSeconds: this.elapsed,
      soulsDeposited: this.altar.deposited,
      soulsTarget: this.objective.soulsGoal,
      playerLife: this.player.life,
      playerMaxLife: this.playerMaxLife,
      altarLife: this.altar.life,
      altarMaxLife: this.objective.altarMaxLife,
      kills: this.kills
    });
    this.completedRun = stats;
    this.terminalResult = { state: "victory", reason: "", committedAt: this.elapsed, stats };
    this.state = "victoryPresentation";
    this.victoryPresentationRemaining = this.reducedMotion
      ? BALANCE.presentation.reducedMotionVictorySeconds
      : BALANCE.presentation.victorySeconds;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.attackTimer = 0;
    this.player.attackCooldown = 0;
    this.projectiles = [];
    this.defeatVisuals = [];
    this.clearTransientPowerUps();
    this.clearTransientCharacterState();
    this.notice = {
      text: this.levelId === BALANCE.levels.nextId
        ? "FÁBRICA DE SUCATA CONCLUÍDA"
        : "DISTRITO NEON CONCLUÍDO",
      time: this.victoryPresentationRemaining
    };
    this.addEffect("victory", this.altar.x + this.altar.w / 2, this.altar.y + 14, "ALTAR RESTAURADO", this.victoryPresentationRemaining);
    this.emit("victory", {
      stats,
      demoMode: this.demoMode,
      progressionEligible: this.progressionEligible,
      bonusQualificationEligible: this.bonusQualificationEligible
    });
  }

  beginPlayerDefeat(reason) {
    if (this.state !== "playing" || this.terminalResult) return;
    this.terminalResult = { state: "defeat", reason, committedAt: this.elapsed };
    this.state = "defeatPresentation";
    this.defeatReason = reason;
    this.defeatPresentationRemaining = BALANCE.presentation.playerDefeatSeconds;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.attackTimer = 0;
    this.player.attackCooldown = 0;
    this.player.hurtFlash = 0;
    this.player.animState = "die";
    this.player.animTime = 0;
    this.projectiles = [];
    this.clearTransientPowerUps();
    this.clearTransientCharacterState();
    this.emit("defeat", { reason, presentation: true });
  }

  updateDefeatPresentation(dt) {
    if (!this.player || !this.terminalResult) return;
    this.elapsed += dt;
    advanceAnimationClock(this.player, "die", dt);
    this.updateDefeatVisuals(dt);
    this.defeatPresentationRemaining = Math.max(0, this.defeatPresentationRemaining - dt);
    if (this.defeatPresentationRemaining > 0) return;
    this.state = "defeat";
    this.defeatVisuals = [];
  }

  updateVictoryPresentation(dt) {
    if (!this.player || !this.terminalResult || !this.completedRun) return;
    for (const effect of this.effects) effect.life -= dt;
    this.effects = this.effects.filter((effect) => effect.life > 0);
    this.victoryPresentationRemaining = Math.max(0, this.victoryPresentationRemaining - dt);
    if (this.victoryPresentationRemaining > 0) return;
    if (this.bonusQualification?.qualified && this.bonusOriginStats) {
      this.state = "bonusTransition";
      this.bonusTransitionRemaining = this.reducedMotion
        ? BONUS_RULES.reducedMotionTransitionSeconds
        : BONUS_RULES.transitionSeconds;
      this.effects = [];
      this.notice = null;
      this.emit("bonusQualified", { qualification: this.bonusQualification, stats: this.bonusOriginStats });
      return;
    }
    this.state = "victory";
    this.effects = [];
    this.notice = null;
  }

  snapshot() {
    return {
      state: this.state,
      gameMode: this.gameMode,
      difficulty: this.difficultyId,
      levelId: this.levelId,
      levelTitle: this.level.title,
      demoMode: this.demoMode,
      progressionEligible: this.progressionEligible,
      bonusQualificationEligible: this.bonusQualificationEligible,
      survivalWave: this.survivalWave,
      survivalWaveDelay: this.survivalWaveDelay,
      survivalSpeedMultiplier: this.survivalEnemySpeedMultiplier,
      survivalResult: this.survivalResult,
      runId: this.runId,
      elapsed: this.elapsed,
      player: this.player ? { x: this.player.x, y: this.player.y, life: this.player.life, invulnerable: this.player.invulnerable } : null,
      altar: this.altar ? { life: this.altar.life, deposited: this.altar.deposited } : null,
      carriedSouls: this.carriedSouls ?? 0,
      kills: this.kills ?? 0,
      enemies: this.enemies.length,
      projectiles: this.projectiles.length,
      souls: this.souls.length,
      spawnClock: this.spawnClock ?? 0,
      spawnCount: this.spawnCount ?? 0,
      encounterPhase: this.encounterPhaseId ?? null,
      encounterBudget: this.player ? this.getEncounterPhase().budget : 0,
      objective: {
        soulsGoal: this.objective.soulsGoal,
        altarMaxLife: this.objective.altarMaxLife,
        playerMaxLife: this.playerMaxLife
      },
      enemyShots: this.projectiles.filter((shot) => shot.team === "enemy").length,
      presses: this.presses.map((press) => ({
        id: press.id, phase: press.phase, phaseTime: press.phaseTime, cycle: press.cycle,
        x: press.x, y: press.y, w: press.w, h: press.headHeight,
        dangerous: press.phase === "closing"
      })),
      effects: this.effects.length,
      defeatVisuals: this.defeatVisuals.length,
      defeatPresentationRemaining: this.defeatPresentationRemaining,
      victoryPresentationRemaining: this.victoryPresentationRemaining,
      bonusTransitionRemaining: this.bonusTransitionRemaining,
      bonusRemaining: this.bonusRemaining,
      bonusCollected: this.bonusCollected,
      bonusScore: calculateBonusScore(this.bonusCollected),
      bonusResult: this.bonusResult ? { ...this.bonusResult } : null,
      bonusPreview: this.bonusPreview,
      patrolShooterPreview: this.patrolShooterPreview,
      characterId: this.characterId,
      ability: this.ability ? { ...this.ability } : null,
      powerUpPickup: this.powerUpPickup ? { ...this.powerUpPickup } : null,
      powerUps: this.powerUps.map((powerUp) => ({ ...powerUp })),
      activePowerUp: this.activePowerUp ? { ...this.activePowerUp } : null,
      pendingPlayerShots: this.pendingPlayerShots.length,
      powerUpSpawnResolved: this.powerUpSpawnResolved,
      bonusHitProtection: this.bonusHitProtection,
      bonusCannon: this.bonusCannon ? {
        id: this.bonusCannon.id,
        phase: this.bonusCannon.phase,
        phaseTime: this.bonusCannon.phaseTime,
        aimX: this.bonusCannon.aimX,
        aimY: this.bonusCannon.aimY
      } : null,
      bonusQualification: this.bonusQualification ? { ...this.bonusQualification } : null,
      terminalCommitted: Boolean(this.terminalResult),
      completedRun: this.completedRun ? { ...this.completedRun } : null,
      canDeposit: this.canDeposit(),
      defeatReason: this.defeatReason
    };
  }
}
