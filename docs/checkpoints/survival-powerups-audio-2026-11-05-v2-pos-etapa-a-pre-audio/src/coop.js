import { BALANCE, DEFAULT_DIFFICULTY, resolveCharacter } from "./config.js";
import { GameModel, overlaps } from "./core.js";
import { advanceAnimationClock, playerAnimationState } from "./animation.js";

function distanceBetween(a, b) {
  const ax = a.x + a.w / 2;
  const ay = a.y + a.h / 2;
  const bx = b.x + b.w / 2;
  const by = b.y + b.h / 2;
  return Math.hypot(ax - bx, ay - by);
}

function createAbility(character) {
  if (!character.hasSelfHeal) return null;
  return {
    id: character.ability.id,
    rechargeRemaining: character.ability.rechargeSeconds,
    rechargeDuration: character.ability.rechargeSeconds,
    ready: false
  };
}

export class CoopGameModel extends GameModel {
  constructor(options = {}) {
    super(options);
    this.coopPreview = true;
    this.coopSurvival = false;
    this.players = [];
    this.coopResult = null;
    this.coopInterruptedPlayer = null;
    this.coopResumeBlocked = false;
  }

  enterCoopLobby() {
    super.goToMenu();
    this.coopPreview = true;
    this.coopSurvival = false;
    this.gameMode = "coop-preview";
    this.state = "coopLobby";
    this.players = [];
    this.player = null;
    this.coopResult = null;
    this.coopInterruptedPlayer = null;
    this.coopResumeBlocked = false;
    this.progressionEligible = false;
    this.bonusQualificationEligible = false;
    return true;
  }

  createCoopPlayer(slot, characterId, position, existing = null) {
    const character = resolveCharacter(characterId, this.playerMaxLife);
    const player = existing ?? {};
    Object.assign(player, {
      id: existing?.id ?? this.createEntityId(`player-p${slot}`),
      slot,
      characterId,
      character,
      x: position.x,
      y: position.y,
      w: BALANCE.player.width,
      h: BALANCE.player.height,
      vx: 0,
      vy: 0,
      facing: slot === 1 ? 1 : -1,
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
      variableJumpActive: false,
      animState: "idle",
      animTime: 0,
      inactive: false,
      carriedSouls: 0,
      ability: createAbility(character),
      activePowerUp: null,
      rapidFire: false,
      rapidFireRemaining: 0,
      shield: false,
      pendingPlayerShots: [],
      lastSafePosition: { x: position.x, y: position.y },
      defeatHandled: false
    });
    return player;
  }

  startCoopPreview() {
    super.startRun({
      levelId: BALANCE.levels.currentId,
      difficulty: DEFAULT_DIFFICULTY,
      characterId: "boypunk",
      progressionEligible: false,
      bonusQualificationEligible: false
    });
    this.coopPreview = true;
    this.coopSurvival = false;
    this.gameMode = "coop-preview";
    this.demoMode = false;
    this.progressionEligible = false;
    this.bonusQualificationEligible = false;
    this.bonusPreview = false;
    this.patrolShooterPreview = false;
    const first = this.createCoopPlayer(1, "boypunk", { x: 18, y: 208 }, this.player);
    const second = this.createCoopPlayer(2, "support", { x: 50, y: 208 });
    this.players = [first, second];
    this.player = first;
    this.characterId = first.characterId;
    this.character = first.character;
    this.ability = null;
    this.carriedSouls = 0;
    this.coopResult = null;
    this.coopInterruptedPlayer = null;
    this.coopResumeBlocked = false;
    this.resetPowerUpState();
    this.powerUpSpawnResolved = true;
    this.notice = { text: "COOP LOCAL · P1 BOYPUNK + P2 NILO", time: 3.2 };
    this.events = [];
    this.emit("coopPreviewStarted", { playerIds: this.players.map((player) => player.id) });
    return true;
  }

  startCoopSurvival() {
    super.startSurvival({ characterId: "boypunk" });
    this.coopPreview = true;
    this.coopSurvival = true;
    this.gameMode = "survival-coop";
    this.progressionEligible = false;
    this.bonusQualificationEligible = false;
    const first = this.createCoopPlayer(1, "boypunk", { x: 18, y: 208 }, this.player);
    const second = this.createCoopPlayer(2, "support", { x: 50, y: 208 });
    this.players = [first, second];
    this.player = first;
    this.characterId = first.characterId;
    this.character = first.character;
    this.ability = first.ability;
    this.coopResult = null;
    this.coopInterruptedPlayer = null;
    this.coopResumeBlocked = false;
    this.notice = { text: "SOBREVIVÊNCIA COOP · P1 BOYPUNK + P2 NILO", time: 3.2 };
    this.events = [];
    this.emit("coopSurvivalStarted", { playerIds: this.players.map((player) => player.id), wave: this.survivalWave });
    return true;
  }

  powerUpsAllowed() {
    if (this.coopSurvival) return this.state === "survival" && this.gameMode === "survival-coop";
    if (this.coopPreview) return false;
    return super.powerUpsAllowed();
  }

  resume() {
    if (this.coopPreview && this.coopResumeBlocked) return false;
    super.resume();
    return ["playing", "survival"].includes(this.state);
  }

  withPlayerContext(player, callback) {
    const saved = {
      player: this.player,
      character: this.character,
      characterId: this.characterId,
      ability: this.ability,
      carriedSouls: this.carriedSouls,
      activePowerUp: this.activePowerUp,
      pendingPlayerShots: this.pendingPlayerShots
    };
    this._coopContextPlayer = player;
    this.player = player;
    this.character = player.character;
    this.characterId = player.characterId;
    this.ability = player.ability;
    this.carriedSouls = player.carriedSouls;
    this.activePowerUp = player.activePowerUp;
    this.pendingPlayerShots = player.pendingPlayerShots;
    try {
      return callback();
    } finally {
      player.ability = this.ability;
      player.carriedSouls = this.carriedSouls;
      player.activePowerUp = this.activePowerUp;
      player.pendingPlayerShots = this.pendingPlayerShots;
      Object.assign(this, saved);
      this._coopContextPlayer = null;
    }
  }

  withSupportPickupPlayerContext(player, callback) {
    return this.withPlayerContext(player, callback);
  }

  addEffect(kind, x, y, text = "", duration = 0.6) {
    super.addEffect(kind, x, y, text, duration);
    const effect = this.effects[this.effects.length - 1];
    if (effect && this._coopContextPlayer) {
      effect.ownerId = this._coopContextPlayer.id;
      effect.characterId = this._coopContextPlayer.characterId;
    }
  }

  updateCoopAbility(player, dt) {
    const ability = player.ability;
    if (!ability || player.inactive) return;
    if (ability.rechargeRemaining > 0) {
      ability.rechargeRemaining = Math.max(0, ability.rechargeRemaining - dt);
      if (ability.rechargeRemaining <= 0) {
        ability.ready = true;
        this.emit("abilityReady", { id: ability.id, playerId: player.id, slot: player.slot });
      }
    }
  }

  tryActivateCoopAbility(player) {
    const ability = player.ability;
    if (!ability || player.inactive || player.life <= 0) return false;
    if (ability.rechargeRemaining > 0 || !ability.ready || player.life >= this.playerMaxLife) return false;
    const lifeBefore = player.life;
    player.life = Math.min(this.playerMaxLife, player.life + player.character.ability.healAmount);
    const healed = player.life - lifeBefore;
    ability.ready = false;
    ability.rechargeRemaining = ability.rechargeDuration;
    this.withPlayerContext(player, () => {
      this.addEffect("heal", player.x + player.w / 2, player.y + player.h / 2, `+${healed} VIDA`, 0.75);
    });
    this.emit("playerHealed", {
      playerId: player.id,
      slot: player.slot,
      characterId: player.characterId,
      amount: healed,
      life: player.life,
      maxLife: this.playerMaxLife
    });
    return true;
  }

  update(dt, inputs = {}) {
    if (!this.coopPreview) return super.update(dt, inputs?.[1] ?? inputs);
    dt = Math.min(Math.max(dt, 0), 0.05);
    const playerInputs = inputs?.players ?? inputs;
    if (playerInputs?.[1]?.pausePressed || playerInputs?.[2]?.pausePressed) this.togglePause();
    if (this.coopSurvival) {
      this.updateCoopSurvival(dt, playerInputs ?? {});
      return;
    }
    if (["victoryPresentation", "defeatPresentation"].includes(this.state)) {
      this.updateCoopPresentation(dt);
      return;
    }
    if (this.state !== "playing" || !this.players.length) return;

    this.elapsed += dt;
    this.altar.invulnerable = Math.max(0, this.altar.invulnerable - dt);
    if (this.notice) {
      this.notice.time -= dt;
      if (this.notice.time <= 0) this.notice = null;
    }
    for (const effect of this.effects) effect.life -= dt;
    this.updateDefeatVisuals(dt);

    for (const player of this.players) {
      if (player.inactive) {
        advanceAnimationClock(player, "die", dt);
        continue;
      }
      player.attackCooldown = Math.max(0, player.attackCooldown - dt);
      player.attackTimer = Math.max(0, player.attackTimer - dt);
      player.invulnerable = Math.max(0, player.invulnerable - dt);
      player.hurtFlash = Math.max(0, player.hurtFlash - dt);
      this.updateCoopAbility(player, dt);
      player.previous = { x: player.x, y: player.y, w: player.w, h: player.h };
      this.withPlayerContext(player, () => this.updatePlayer(dt, playerInputs?.[player.slot] ?? {}));
      advanceAnimationClock(player, playerAnimationState(player), dt);
      if (player.onGround && player.life > 0) player.lastSafePosition = { x: player.x, y: player.y };
    }
    this.handlePlayerDefeats();
    if (this.resolveTerminalOutcome()) return;

    this.updatePresses(dt);
    this.handlePlayerDefeats();
    if (this.resolveTerminalOutcome()) return;
    this.updateSpawning(dt);
    this.updateEnemies(dt);
    this.handlePlayerDefeats();
    if (this.resolveTerminalOutcome()) return;
    this.updateProjectiles(dt);
    this.handlePlayerDefeats();
    if (this.resolveTerminalOutcome()) return;
    this.updateCoopSouls(playerInputs ?? {});
    this.cleanupEntities();
    this.handlePlayerDefeats();
    if (this.resolveTerminalOutcome()) return;

    for (const player of this.players) {
      if (!player.inactive && playerInputs?.[player.slot]?.abilityPressed) this.tryActivateCoopAbility(player);
    }
    this.player = this.players[0];
    this.character = this.player.character;
    this.characterId = this.player.characterId;
    this.carriedSouls = this.totalCarriedSouls();
  }

  updateCoopSurvival(dt, playerInputs) {
    if (this.state !== "survival" || !this.players.length) return;
    this.elapsed += dt;
    this.updateSupportPickupRespawns(dt);
    if (this.notice) {
      this.notice.time -= dt;
      if (this.notice.time <= 0) this.notice = null;
    }
    for (const effect of this.effects) effect.life -= dt;
    this.updateDefeatVisuals(dt);

    for (const player of this.players) {
      if (player.inactive) {
        advanceAnimationClock(player, "die", dt);
        continue;
      }
      player.attackCooldown = Math.max(0, player.attackCooldown - dt);
      player.attackTimer = Math.max(0, player.attackTimer - dt);
      player.invulnerable = Math.max(0, player.invulnerable - dt);
      player.hurtFlash = Math.max(0, player.hurtFlash - dt);
      this.updateCoopAbility(player, dt);
      player.previous = { x: player.x, y: player.y, w: player.w, h: player.h };
      this.withPlayerContext(player, () => {
        this.updatePowerUpClocks(dt);
        this.updatePlayer(dt, playerInputs?.[player.slot] ?? {});
        this.updatePendingPlayerShots(dt);
      });
      advanceAnimationClock(player, playerAnimationState(player), dt);
      if (player.onGround && player.life > 0) player.lastSafePosition = { x: player.x, y: player.y };
    }
    this.handlePlayerDefeats();
    if (this.resolveTerminalOutcome()) return;
    this.updateSupportPickupCollection(this.playerEntities({ livingOnly: true }));
    this.updateEnemies(dt);
    this.handlePlayerDefeats();
    if (this.resolveTerminalOutcome()) return;
    this.updateProjectiles(dt);
    this.handlePlayerDefeats();
    if (this.resolveTerminalOutcome()) return;
    this.cleanupEntities();

    for (const player of this.players) {
      if (!player.inactive && playerInputs?.[player.slot]?.abilityPressed) this.tryActivateCoopAbility(player);
    }
    if (!this.enemies.length) {
      if (this.survivalWaveDelay === null) {
        this.survivalWaveDelay = BALANCE.survival.intermissionSeconds;
        this.projectiles = [];
        this.emit("survivalWaveCleared", { wave: this.survivalWave });
      }
      this.survivalWaveDelay = Math.max(0, this.survivalWaveDelay - dt);
      if (this.survivalWaveDelay <= 0) this.startSurvivalWave();
    }
    this.player = this.players[0];
    this.character = this.player.character;
    this.characterId = this.player.characterId;
    this.ability = this.player.ability;
  }

  updateCoopSouls(inputs) {
    for (const soul of this.souls) {
      if (soul.removed) continue;
      for (const player of this.playerEntities({ livingOnly: true })) {
        if (!overlaps(player, soul)) continue;
        soul.removed = true;
        player.carriedSouls += 1;
        this.withPlayerContext(player, () => {
          this.addEffect("collect", soul.x + soul.w / 2, soul.y + soul.h / 2, "+1 CARREGADA", 0.75);
        });
        this.renderer?.spawnFloatingText?.("+1 SOUL", soul.x + soul.w / 2, soul.y + soul.h / 2, "soul");
        this.emit("soulCollected", { playerId: player.id, slot: player.slot, soulId: soul.id ?? null });
        break;
      }
    }

    for (const player of this.playerEntities({ livingOnly: true })) {
      if (!inputs?.[player.slot]?.interactPressed || player.carriedSouls <= 0) continue;
      if (distanceBetween(player, this.altar) > this.objective.depositRadius) continue;
      const capacity = Math.max(0, this.objective.soulsGoal - this.altar.deposited);
      const amount = Math.min(capacity, player.carriedSouls);
      if (amount <= 0) continue;
      player.carriedSouls -= amount;
      this.altar.deposited += amount;
      this.updateAltarPhase();
      this.addEffect("deposit", this.altar.x + this.altar.w / 2, this.altar.y + 12, `+${amount} NO ALTAR`, 1.15);
      this.emit("soulsDeposited", { playerId: player.id, slot: player.slot, amount });
    }
    this.carriedSouls = this.totalCarriedSouls();
  }

  handlePlayerDefeats() {
    for (const player of this.players) {
      if (player.life > 0 || player.defeatHandled) continue;
      player.defeatHandled = true;
      player.inactive = true;
      player.vx = 0;
      player.vy = 0;
      player.attackCooldown = 0;
      player.attackTimer = 0;
      player.hurtFlash = 0;
      player.animState = "die";
      player.animTime = 0;
      player.ability = null;
      player.activePowerUp = null;
      player.pendingPlayerShots = [];
      this.projectiles = this.projectiles.filter((shot) => shot.sourceId !== player.id);
      this.effects = this.effects.filter((effect) => effect.ownerId !== player.id || effect.kind === "damage");
      if (player.y > this.level.world.height) {
        player.x = player.lastSafePosition.x;
        player.y = player.lastSafePosition.y;
      }
      this.dropCarriedSouls(player);
      this.emit("coopPlayerDefeated", { playerId: player.id, slot: player.slot });
    }
  }

  dropCarriedSouls(player) {
    const count = Math.max(0, player.carriedSouls ?? 0);
    if (!count) return;
    const safe = player.lastSafePosition ?? { x: 18 + (player.slot - 1) * 32, y: 208 };
    for (let index = 0; index < count; index += 1) {
      this.souls.push({
        id: this.createEntityId(`dropped-soul-p${player.slot}`),
        x: Math.max(18, Math.min(447, safe.x + (index % 4) * 6 - 9)),
        y: Math.min(224, safe.y + Math.floor(index / 4) * 2),
        w: 15,
        h: 16,
        bornAt: this.elapsed,
        source: "coop-defeat-drop",
        removed: false
      });
    }
    player.carriedSouls = 0;
    this.emit("coopSoulsDropped", { playerId: player.id, slot: player.slot, count });
  }

  resolveTerminalOutcome() {
    if (!this.coopPreview) return super.resolveTerminalOutcome();
    if (this.coopSurvival) {
      if (this.state !== "survival") return true;
      if (this.players.every((player) => player.inactive || player.life <= 0)) this.endCoopSurvival();
      return this.state !== "survival";
    }
    if (this.state !== "playing") return true;
    if (this.altar.life <= 0) this.commitCoopOutcome("defeat", "Altar destruído");
    else if (this.players.every((player) => player.inactive || player.life <= 0)) {
      this.commitCoopOutcome("defeat", "Ambos os jogadores foram derrotados");
    } else if (this.altar.deposited >= this.objective.soulsGoal) {
      this.commitCoopOutcome("victory", "Objetivo compartilhado concluído");
    }
    return this.state !== "playing";
  }

  endCoopSurvival() {
    if (this.state !== "survival" || this.terminalResult) return false;
    const result = Object.freeze({ wave: this.survivalWave, activeSeconds: this.elapsed, kills: this.kills });
    this.survivalResult = result;
    this.terminalResult = { state: "survivalDefeat", reason: "players", committedAt: this.elapsed, stats: result };
    this.state = "survivalDefeat";
    this.projectiles = [];
    this.powerUps = [];
    this.supportPickupSpawns = [];
    for (const player of this.players) {
      player.vx = 0;
      player.vy = 0;
      player.attackTimer = 0;
      player.attackCooldown = 0;
      player.pendingPlayerShots = [];
      player.activePowerUp = null;
      player.rapidFire = false;
      player.rapidFireRemaining = 0;
      player.shield = false;
    }
    this.emit("survivalEnded", { result, coop: true });
    return true;
  }

  commitCoopOutcome(outcome, reason) {
    if (this.terminalResult || this.state !== "playing") return false;
    this.coopResult = Object.freeze({
      outcome,
      reason,
      activeSeconds: this.elapsed,
      soulsDeposited: this.altar.deposited,
      soulsTarget: this.objective.soulsGoal,
      altarLife: this.altar.life,
      players: this.players.map((player) => ({
        id: player.id,
        slot: player.slot,
        characterId: player.characterId,
        life: player.life,
        carriedSouls: player.carriedSouls,
        inactive: player.inactive
      }))
    });
    this.terminalResult = { state: `coop-${outcome}`, reason, committedAt: this.elapsed, stats: this.coopResult };
    this.state = outcome === "victory" ? "victoryPresentation" : "defeatPresentation";
    this.victoryPresentationRemaining = outcome === "victory" ? BALANCE.presentation.victorySeconds : 0;
    this.defeatPresentationRemaining = outcome === "defeat" ? BALANCE.presentation.playerDefeatSeconds : 0;
    this.projectiles = [];
    this.powerUpPickup = null;
    for (const player of this.players) {
      player.vx = 0;
      player.vy = 0;
      player.attackTimer = 0;
      player.attackCooldown = 0;
      player.pendingPlayerShots = [];
      player.activePowerUp = null;
    }
    this.notice = { text: outcome === "victory" ? "COOP CONCLUÍDO" : "COOP INTERROMPIDO", time: 1.2 };
    this.emit(outcome === "victory" ? "coopVictory" : "coopDefeat", { result: this.coopResult });
    return true;
  }

  updateCoopPresentation(dt) {
    for (const effect of this.effects) effect.life -= dt;
    this.effects = this.effects.filter((effect) => effect.life > 0);
    for (const player of this.players) {
      if (player.life <= 0) advanceAnimationClock(player, "die", dt);
    }
    if (this.state === "victoryPresentation") {
      this.victoryPresentationRemaining = Math.max(0, this.victoryPresentationRemaining - dt);
      if (this.victoryPresentationRemaining <= 0) this.state = "coopResult";
    } else {
      this.defeatPresentationRemaining = Math.max(0, this.defeatPresentationRemaining - dt);
      if (this.defeatPresentationRemaining <= 0) this.state = "coopResult";
    }
  }

  canDeposit() {
    if (!this.coopPreview) return super.canDeposit();
    return this.playerEntities({ livingOnly: true }).some((player) => (
      player.carriedSouls > 0 && distanceBetween(player, this.altar) <= this.objective.depositRadius
    ));
  }

  snapshot() {
    const snapshot = super.snapshot();
    return {
      ...snapshot,
      coopPreview: this.coopPreview,
      coopSurvival: this.coopSurvival,
      coopResult: this.coopResult ? { ...this.coopResult } : null,
      players: this.players.map((player) => ({
        id: player.id,
        slot: player.slot,
        characterId: player.characterId,
        x: player.x,
        y: player.y,
        life: player.life,
        inactive: player.inactive,
        carriedSouls: player.carriedSouls,
        ability: player.ability ? { ...player.ability } : null
      }))
    };
  }
}
