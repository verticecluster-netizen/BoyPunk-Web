import { BALANCE, DEFAULT_DIFFICULTY, DIFFICULTIES, POWER_UPS, normalizeDifficulty, DEFAULT_CHARACTER, CHARACTERS, normalizeCharacter, resolveCharacter, resolveWeaponAnchor } from "./config.js";
import { getLevelDefinition, WORLD } from "./level-data.js";
import { advanceAnimationClock, chaserAnimationState, playerAnimationState } from "./animation.js";
import { BONUS_CANNON_RULES, BONUS_RULES, calculateBonusScore } from "./bonus.js";

const EPSILON = 0.01;
const FLOATING_POWER_UP_DEFINITIONS = Object.freeze([
  Object.freeze({ powerUpType: "rapid-fire", x: 96, y: 220, w: 20, h: 20, groundY: 240 }),
  Object.freeze({ powerUpType: "health", x: 264, y: 220, w: 20, h: 20, groundY: 240 }),
  Object.freeze({ powerUpType: "shield", x: 388, y: 220, w: 20, h: 20, groundY: 240 })
]);
const RAPID_FIRE_DURATION_SECONDS = 10;
const RAPID_FIRE_COOLDOWN_MULTIPLIER = 0.5;
export const CHASER_STATES = Object.freeze({
  PATROL: "patrol",
  CHASE: "chase"
});

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
  const ac = center(a);
  const bc = center(b);
  return Math.hypot(ac.x - bc.x, ac.y - bc.y);
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
    this.powerUpSpawnResolved = false;
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
    const candidates = this.playerEntities({ livingOnly: true });
    if (!candidates.length) return null;
    const point = origin ? center(origin) : { x: WORLD.width / 2, y: WORLD.height / 2 };
    return [...candidates].sort((left, right) => {
      const leftCenter = center(left);
      const rightCenter = center(right);
      const distanceDelta = Math.hypot(leftCenter.x - point.x, leftCenter.y - point.y)
        - Math.hypot(rightCenter.x - point.x, rightCenter.y - point.y);
      return distanceDelta || String(left.id).localeCompare(String(right.id));
    })[0];
  }

  totalCarriedSouls() {
    if (this.coopPreview && Array.isArray(this.players)) {
      return this.players.reduce((total, player) => total + (player.carriedSouls ?? 0), 0);
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
    this.demoMode = Boolean(demo);
    this.progressionEligible = Boolean(progressionEligible) && !this.demoMode;
    this.bonusQualificationEligible = Boolean(bonusQualificationEligible) && this.progressionEligible;
    this.characterId = this.demoMode ? DEFAULT_CHARACTER : normalizeCharacter(characterId);
    this.character = resolveCharacter(this.characterId, this.playerMaxLife);
    this.ability = (!this.demoMode && this.character.hasSelfHeal)
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

  startSurvival() {
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
    this.survivalResult = null;
    this.elapsed = 0;
    this.spawnClock = 0;
    this.spawnCount = 0;
    this.rangedSpawnCount = 0;
    this.lastEnemyShotAt = -Infinity;
    this.resetPowerUpState();
    this.encounterPhaseId = "survival";
    this.characterId = DEFAULT_CHARACTER;
    this.character = resolveCharacter(DEFAULT_CHARACTER, BALANCE.survival.playerMaxLife);
    this.ability = null;
    this.playerMaxLife = BALANCE.survival.playerMaxLife;
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
      variableJumpActive: false
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

    this.player.previous = { x: this.player.x, y: this.player.y, w: this.player.w, h: this.player.h };
    this.updatePlayer(dt, input);
    advanceAnimationClock(this.player, playerAnimationState(this.player), dt);
    if (this.resolveTerminalOutcome()) return;
    this.updatePendingPlayerShots(dt);
    this.updatePresses(dt);
    if (this.resolveTerminalOutcome()) return;
    this.updateSpawning(dt);
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
    this.player.previous = { x: this.player.x, y: this.player.y, w: this.player.w, h: this.player.h };
    this.updatePlayer(dt, input);
    advanceAnimationClock(this.player, playerAnimationState(this.player), dt);
    if (this.resolveTerminalOutcome()) return;
    this.updateEnemies(dt);
    if (this.resolveTerminalOutcome()) return;
    this.updateProjectiles(dt);
    if (this.resolveTerminalOutcome()) return;
    this.cleanupEntities();
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
    const horizontal = Number(Boolean(input.right)) - Number(Boolean(input.left));

    if (horizontal !== 0) {
      player.vx = approach(player.vx, horizontal * BALANCE.player.maxSpeed, BALANCE.player.acceleration * dt);
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
      if (player.coyote > 0) {
        player.vy = -BALANCE.player.jumpSpeed;
        player.onGround = false;
        player.coyote = 0;
        player.jumpBuffer = 0;
        player.jumpsUsed = 1;
        player.variableJumpActive = Boolean(input.jumpHeld);
        this.emit("jump", { double: false });
      } else if (player.jumpsUsed < 2) {
        player.vy = -BALANCE.player.doubleJumpSpeed;
        player.jumpBuffer = 0;
        player.jumpsUsed = 2;
        player.variableJumpActive = Boolean(input.jumpHeld);
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

    player.vy = Math.min(player.vy + BALANCE.player.gravity * dt, BALANCE.player.maxFallSpeed);
    this.moveBody(player, dt);

    if (player.attackTimer > 0) {
      const hitbox = {
        x: player.facing > 0 ? player.x + player.w - 2 : player.x - 24,
        y: player.y + 7,
        w: 26,
        h: 20
      };
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

  emitPlayerProjectile(direction, { burstId = null, burstIndex = 1 } = {}) {
    const activePlayerShots = this.projectiles.filter((shot) => shot.team === "player" && !shot.removed).length;
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
    this.emit("playerShotEmitted", { projectileId: shot.id, burstId, burstIndex, direction });
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
    if (this.player) {
      this.player.rapidFire = false;
      this.player.rapidFireRemaining = 0;
      this.player.shield = false;
    }
  }

  clearTransientPowerUps() {
    this.powerUpPickup = null;
    this.activePowerUp = null;
    this.pendingPlayerShots = [];
    this.powerUps = [];
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

  updateAbility(dt) {
    if (!this.ability || this.state !== "playing" || this.gameMode !== "campaign") return;
    if (this.ability.rechargeRemaining > 0) {
      this.ability.rechargeRemaining = Math.max(0, this.ability.rechargeRemaining - dt);
      if (this.ability.rechargeRemaining <= 0) {
        this.ability.ready = true;
        this.emit("abilityReady", { id: this.ability.id });
      }
    }
  }

  tryActivateAbility() {
    if (!this.ability || !this.character?.hasSelfHeal) return false;
    if (this.state !== "playing" || this.gameMode !== "campaign") return false;
    if (!this.player || this.player.life <= 0) return false;
    if (this.ability.rechargeRemaining > 0 || !this.ability.ready) return false;
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

  powerUpsAllowed() {
    return this.state === "playing"
      && this.gameMode === "campaign"
      && !this.demoMode
      && !this.patrolShooterPreview;
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
      powerUp.removed = true;
      collected = this.activateFloatingPowerUp(powerUp, player) || collected;
    }
    this.powerUps = this.powerUps.filter((powerUp) => !powerUp.removed);
    return collected;
  }

  activateFloatingPowerUp(powerUp, player = this.player) {
    const id = powerUp?.powerUpType ?? powerUp?.typeId;
    if (!player || !id) return false;
    if (id === "rapid-fire") {
      player.rapidFire = true;
      player.rapidFireRemaining = RAPID_FIRE_DURATION_SECONDS;
      this.notice = { text: "TIRO RÁPIDO OBTIDO", time: 1.0 };
    } else if (id === "health") {
      const lifeBefore = player.life;
      player.life = Math.min(this.playerMaxLife, player.life + 1);
      this.notice = { text: player.life > lifeBefore ? "+1 VIDA" : "VIDA CHEIA", time: 1.0 };
    } else if (id === "shield") {
      player.shield = true;
      this.notice = { text: "ESCUDO OBTIDO · 1 IMPACTO", time: 1.0 };
    } else {
      return false;
    }
    const x = powerUp.x + powerUp.w / 2;
    const y = powerUp.y + powerUp.h / 2;
    this.addEffect("powerUpCollect", x, y, id === "health" ? "+1" : id === "shield" ? "ESCUDO" : "RÁPIDO", 0.75);
    this.emit("powerUpCollected", { id, playerId: player.id });
    return true;
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
        this.emit("powerUpExpired", { id });
      }
    }
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
    this.emit("powerUpCollected", { id, refreshed, duration: config.durationSeconds });
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

  startBonusPreview(originLevelId = BALANCE.levels.currentId) {
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
    return this.startBonusArena({ preview: true });
  }

  startBonusArena({ preview = false } = {}) {
    if (!this.bonusOriginStats || this.demoMode || (!preview && !this.progressionEligible)) return false;
    this.configureLevel(BALANCE.levels.bonusId);
    this.runId += 1;
    this.nextEntityNumber = 0;
    this.state = "bonusPlaying";
    this.gameMode = "bonus";
    this.ability = null;
    this.elapsed = 0;
    this.bonusRemaining = BONUS_RULES.durationSeconds;
    this.bonusCollected = 0;
    this.bonusResult = null;
    this.bonusPreview = Boolean(preview);
    this.bonusHitProtection = 0;
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
      variableJumpActive: false
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

  updateBonusArena(dt, input) {
    if (!this.player || this.bonusResult) return;
    this.elapsed += dt;
    this.bonusRemaining = Math.max(0, this.bonusRemaining - dt);
    this.bonusHitProtection = Math.max(0, this.bonusHitProtection - dt);
    this.player.attackCooldown = Math.max(0, this.player.attackCooldown - dt);
    this.player.attackTimer = Math.max(0, this.player.attackTimer - dt);
    if (this.notice) {
      this.notice.time -= dt;
      if (this.notice.time <= 0) this.notice = null;
    }
    for (const effect of this.effects) effect.life -= dt;
    this.player.previous = { x: this.player.x, y: this.player.y, w: this.player.w, h: this.player.h };
    this.updatePlayer(dt, input);
    advanceAnimationClock(this.player, playerAnimationState(this.player), dt);
    this.updateBonusCannon(dt);
    this.updateProjectiles(dt);
    for (const soul of this.souls) {
      if (soul.removed || !overlaps(this.player, soul)) continue;
      soul.removed = true;
      this.bonusCollected += 1;
      this.addEffect("bonusCollect", soul.x + soul.w / 2, soul.y + soul.h / 2, "+10", 0.55);
      this.emit("bonusSoulCollected", { soulId: soul.id, collected: this.bonusCollected });
    }
    this.souls = this.souls.filter((soul) => !soul.removed);
    this.projectiles = this.projectiles.filter((shot) => !shot.removed);
    this.effects = this.effects.filter((effect) => effect.life > 0);
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
    this.projectiles = [];
    this.enemies = [];
    this.souls = [];
    this.effects = [];
    this.presses = [];
    this.bonusCannon = null;
    this.bonusHitProtection = 0;
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
    const patrol = this.resolveChaserPatrolBounds(spawn);
    this.enemies.push({
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
      aiState: CHASER_STATES.PATROL,
      spawnX: spawn.x,
      spawnY: spawn.y,
      patrolLeft: patrol.left,
      patrolRight: patrol.right,
      patrolDirection: spawn.x < WORLD.width / 2 ? 1 : -1,
      blockedTurnCooldown: 0,
      intendedVx: 0,
      animTime: 0,
      removed: false
    });
    this.emit("enemySpawned", { kind: "chaser" });
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
      if (!["playing", "survival"].includes(this.state)) break;
      enemy.previous = { x: enemy.x, y: enemy.y, w: enemy.w, h: enemy.h };
      if (enemy.removed) continue;
      if (enemy.kind === "chaser") this.updateChaser(enemy, dt);
      else if (enemy.kind === "patrol-shooter") this.updatePatrolShooter(enemy, dt);
      else this.updateShooter(enemy, dt);
      if (!enemy.removed && enemy.kind === "chaser") {
        advanceAnimationClock(enemy, chaserAnimationState(enemy), dt);
      }
      if (!this.playerEntities({ livingOnly: true }).length || (this.altar && this.altar.life <= 0)) break;
    }
  }

  updateChaser(enemy, dt) {
    enemy.hurtFlash = Math.max(0, (enemy.hurtFlash ?? 0) - dt);
    enemy.attackFlash = Math.max(0, (enemy.attackFlash ?? 0) - dt);
    enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
    enemy.altarAttackCooldown = Math.max(0, enemy.altarAttackCooldown - dt);
    enemy.blockedTurnCooldown = Math.max(0, (enemy.blockedTurnCooldown ?? 0) - dt);
    const targetPlayer = this.selectLivingPlayer(enemy);
    const enemyCenter = center(enemy);
    const previousState = enemy.aiState ?? CHASER_STATES.PATROL;
    let state = previousState;
    let playerCenter = null;
    let targetDistance = Infinity;
    if (targetPlayer) {
      playerCenter = center(targetPlayer);
      targetDistance = Math.hypot(playerCenter.x - enemyCenter.x, playerCenter.y - enemyCenter.y);
      // Histerese: entra em chase em <=150, sai somente em >=180. Na faixa
      // intermediária, cada instância preserva seu estado atual.
      if (state === CHASER_STATES.PATROL
        && targetDistance <= this.encounter.chaserDetectionEnterDistance + EPSILON) {
        state = CHASER_STATES.CHASE;
      } else if (state === CHASER_STATES.CHASE
        && targetDistance >= this.encounter.chaserDetectionExitDistance - EPSILON) {
        state = CHASER_STATES.PATROL;
      }
    } else {
      state = CHASER_STATES.PATROL;
    }
    enemy.aiState = state;
    if (state !== previousState) {
      this.emit("chaserStateChanged", {
        enemyId: enemy.id,
        from: previousState,
        to: state,
        targetPlayerId: targetPlayer?.id ?? null,
        distance: Number.isFinite(targetDistance) ? targetDistance : null
      });
    }

    const speedMultiplier = this.gameMode === "survival" ? this.survivalEnemySpeedMultiplier : 1;
    let direction;
    let speed = this.encounter.chaserSpeed;
    if (state === CHASER_STATES.CHASE && targetPlayer) {
      direction = Math.sign(playerCenter.x - enemyCenter.x) || enemy.facing || 1;
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
    enemy.intendedVx = direction * speed * speedMultiplier;
    enemy.vx = approach(
      enemy.vx,
      enemy.intendedVx,
      this.encounter.chaserAcceleration * speedMultiplier * dt
    );

    const playerAbove = playerCenter && playerCenter.y < enemyCenter.y - 26;
    if (state === CHASER_STATES.CHASE && enemy.onGround && playerAbove
      && Math.abs(playerCenter.x - enemyCenter.x) < 118) {
      enemy.vy = -this.encounter.chaserJumpSpeed;
      enemy.onGround = false;
    }

    enemy.vy = Math.min(enemy.vy + BALANCE.player.gravity * dt, BALANCE.player.maxFallSpeed);
    const movement = this.moveBody(enemy, dt);
    if (movement.hitX && enemy.onGround) {
      if (state === CHASER_STATES.CHASE) {
        enemy.vy = -this.encounter.chaserJumpSpeed * 0.86;
        enemy.onGround = false;
      } else if (enemy.blockedTurnCooldown <= 0) {
        enemy.patrolDirection *= -1;
        enemy.facing = enemy.patrolDirection;
        enemy.vx = 0;
        enemy.blockedTurnCooldown = this.encounter.chaserBlockedTurnSeconds;
      }
    }

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
      enemy.altarAttackCooldown = 1.7;
      this.damageAltar(1, {
        origin: "contato",
        type: "perseguidor",
        entityId: enemy.id,
        collision: { altar: { ...this.altar }, attacker: { ...enemy } }
      });
    }
  }

  updateShooter(enemy, dt) {
    enemy.phaseTime -= dt;
    if (enemy.phase === "telegraph" && enemy.phaseTime <= 0) {
      if (!this.fireEnemyShot(enemy)) {
        enemy.phaseTime = 0.12;
        return;
      }
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
    const enemyShots = this.projectiles.filter((shot) => shot.team === "enemy" && !shot.removed).length;
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
    const enemyShots = this.projectiles.filter((shot) => shot.team === "enemy" && !shot.removed).length;
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
        || !this.playerEntities({ livingOnly: true }).length
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
        for (const point of shot.trail) point.life -= dt;
        shot.trail = shot.trail.filter((point) => point.life > 0).slice(-(trailLimit - 1));
        shot.trail.push({ x: shot.x + shot.w / 2, y: shot.y + shot.h / 2, life: trailDuration, duration: trailDuration });
        if (shot.trail.length > trailLimit) shot.trail.shift();
      }

      const start = { x: shot.x, y: shot.y, w: shot.w, h: shot.h };
      shot.previousX = shot.x;
      shot.previousY = shot.y;
      const dx = shot.vx * dt;
      const dy = shot.vy * dt;
      const collisions = [];
      for (const platform of this.platforms) {
        if (platform.oneWay) continue;
        const time = sweptAabb(start, dx, dy, platform);
        if (time !== null) collisions.push({ time, priority: 0, type: "wall", target: platform });
      }

      const playerTargets = this.playerEntities({ livingOnly: true });
      const targets = shot.team === "player"
        ? this.enemies.filter((target) => !target.removed)
        : [...playerTargets, this.altar].filter(Boolean);
      for (const target of targets) {
        const previous = target.previous ?? { x: target.x, y: target.y, w: target.w, h: target.h };
        const relativeDx = dx - (target.x - previous.x);
        const relativeDy = dy - (target.y - previous.y);
        const time = sweptAabb(start, relativeDx, relativeDy, previous);
        if (time === null) continue;
        const type = playerTargets.includes(target) ? "player" : target === this.altar ? "altar" : "enemy";
        collisions.push({ time, priority: type === "wall" ? 0 : 1, type, target });
      }
      collisions.sort((a, b) => a.time - b.time || a.priority - b.priority);

      const impact = collisions[0];
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
    this.addEffect("hit", enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, "ACERTO", 0.42);
    if (this.gameMode !== "survival") {
      this.souls.push({
        x: enemy.x + enemy.w / 2 - 7.5,
        y: enemy.y + enemy.h / 2 - 8,
        w: 15,
        h: 16,
        bornAt: this.elapsed,
        source: enemy.kind,
        removed: false
      });
    }
    this.emit("enemyDefeated", { kind: enemy.kind, enemyId: enemy.id, cause });
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

  applyDamage(targetName, amount, cause = {}, direction = 0, playerTarget = null) {
    const isPlayer = targetName === "player";
    const target = isPlayer ? (playerTarget ?? this.player) : this.altar;
    if (!target || !["playing", "survival"].includes(this.state) || target.life <= 0) return false;
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
      this.addEffect("damage", target.x + target.w / 2, target.y + target.h / 2, "DANO", 0.72);
      this.renderer?.spawnFloatingText?.(`-${amount}`, target.x + target.w / 2, target.y + target.h / 2, "damage");
    } else {
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
    this.enemies = this.enemies.filter((enemy) => !enemy.removed);
    this.projectiles = this.projectiles.filter((shot) => !shot.removed);
    this.souls = this.souls.filter((soul) => !soul.removed);
    this.powerUps = this.powerUps.filter((powerUp) => !powerUp.removed);
    this.effects = this.effects.filter((effect) => effect.life > 0);
  }

  updateDefeatVisuals(dt) {
    for (const visual of this.defeatVisuals) {
      visual.life -= dt;
      advanceAnimationClock(visual, "dead", dt);
    }
    this.defeatVisuals = this.defeatVisuals.filter((visual) => visual.life > 0);
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

  addEffect(kind, x, y, text = "", duration = 0.6) {
    this.effects.push({ kind, x, y, text, life: duration, duration });
    if (this.effects.length > 36) this.effects.splice(0, this.effects.length - 36);
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
