import { BALANCE } from "./config.js";

const EMPTY_INPUT = Object.freeze({
  left: false,
  right: false,
  jumpPressed: false,
  attackPressed: false,
  interactPressed: false,
  pausePressed: false
});

export function createSeededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

export class MenuInactivityTimer {
  constructor({ thresholdSeconds = BALANCE.demo.menuIdleSeconds, onElapsed = () => {} } = {}) {
    this.thresholdSeconds = thresholdSeconds;
    this.onElapsed = onElapsed;
    this.elapsed = 0;
    this.triggered = false;
  }

  reset() {
    this.elapsed = 0;
    this.triggered = false;
  }

  update(dt, { eligible = true, visible = true } = {}) {
    if (!visible || !eligible || this.triggered) return false;
    this.elapsed = Math.min(this.thresholdSeconds, this.elapsed + Math.max(0, dt));
    if (this.elapsed + Number.EPSILON < this.thresholdSeconds) return false;
    this.triggered = true;
    this.onElapsed();
    return true;
  }

  snapshot() {
    return { elapsed: this.elapsed, thresholdSeconds: this.thresholdSeconds, triggered: this.triggered };
  }
}

function center(entity) {
  return { x: entity.x + entity.w / 2, y: entity.y + entity.h / 2 };
}

function closest(items, player) {
  const origin = center(player);
  return items.reduce((best, item) => {
    const point = center(item);
    const score = Math.abs(point.x - origin.x) + Math.abs(point.y - origin.y) * 1.45;
    return !best || score < best.score ? { item, score } : best;
  }, null)?.item ?? null;
}

export class DemoController {
  constructor(model) {
    this.model = model;
    this.jumpCooldown = 0;
    this.attackCooldown = 0;
    this.airTime = 0;
    this.lastGoal = "";
    this.goalChanges = 0;
  }

  nextInput(dt) {
    const model = this.model;
    const player = model.player;
    if (!player || model.state !== "playing") return { ...EMPTY_INPUT };

    this.jumpCooldown = Math.max(0, this.jumpCooldown - dt);
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.airTime = player.onGround ? 0 : this.airTime + dt;

    const input = { ...EMPTY_INPUT };
    const nearbyThreat = model.projectiles.find((shot) => {
      if (shot.removed || shot.team !== "enemy") return false;
      const approaching = Math.sign(player.x - shot.x) === Math.sign(shot.vx);
      return approaching && Math.abs(shot.x - player.x) < 92 && Math.abs(shot.y - player.y) < 34;
    });
    const attackTarget = model.enemies
      .filter((enemy) => !enemy.removed)
      .sort((a, b) => Math.abs(a.x - player.x) - Math.abs(b.x - player.x))[0];

    if (attackTarget) {
      const vertical = Math.abs((attackTarget.y + attackTarget.h / 2) - (player.y + player.h / 2));
      const horizontal = attackTarget.x - player.x;
      if (vertical < 34 && Math.abs(horizontal) < 180
        && this.attackCooldown <= 0 && player.attackCooldown <= 0) {
        input.attackPressed = true;
        this.attackCooldown = 0.08;
      }
    }

    if (model.canDeposit()) {
      input.interactPressed = true;
      this.noteGoal("deposit");
      return input;
    }

    const objective = this.chooseObjective();
    if (!objective) return input;
    const waypoint = this.navigationWaypoint(objective);
    const deltaX = waypoint.x - (player.x + player.w / 2);
    if (Math.abs(deltaX) > 5) {
      input.left = deltaX < 0;
      input.right = deltaX > 0;
    }

    const targetAbove = waypoint.y < player.y - 10;
    const blockedAhead = model.enemies.some((enemy) => !enemy.removed && enemy.kind === "chaser"
      && Math.abs(enemy.x - player.x) < 30 && Math.abs(enemy.y - player.y) < 22);
    const shouldStartJump = (targetAbove || blockedAhead || nearbyThreat) && player.onGround;
    const shouldDoubleJump = targetAbove && !player.onGround && player.jumpsUsed === 1
      && this.airTime > 0.16 && player.vy > -155;
    if (this.jumpCooldown <= 0 && (shouldStartJump || shouldDoubleJump)) {
      input.jumpPressed = true;
      this.jumpCooldown = shouldDoubleJump ? 0.22 : 0.16;
    }

    return input;
  }

  chooseObjective() {
    const model = this.model;
    if (model.carriedSouls > 0) {
      this.noteGoal("altar");
      return { type: "altar", ...model.altar };
    }
    const soul = closest(model.souls.filter((item) => !item.removed), model.player);
    if (soul) {
      this.noteGoal(`soul:${soul.source}:${Math.round(soul.x)}:${Math.round(soul.y)}`);
      return { type: "soul", ...soul };
    }
    const enemy = closest(model.enemies.filter((item) => !item.removed), model.player);
    if (enemy) {
      this.noteGoal(`enemy:${enemy.id}`);
      return { type: "enemy", ...enemy };
    }
    this.noteGoal("patrol");
    return { type: "patrol", x: model.player.x < 240 ? 400 : 48, y: 208, w: 1, h: 1 };
  }

  navigationWaypoint(objective) {
    const player = this.model.player;
    const target = center(objective);

    if (objective.type === "altar" && player.y < 194) {
      if (player.y < 130) {
        return { x: player.x < 220 ? 194 : 276, y: 150 };
      }
      if (player.x < 140) return { x: 112, y: 208 };
      if (player.x > 308) return { x: 350, y: 208 };
      return { x: player.x < 224 ? 112 : 338, y: 208 };
    }

    const centerPlatformTarget = objective.type === "soul" && objective.x >= 140 && objective.x <= 304 && objective.y >= 130;
    const underCenterPlatform = player.y > 190 && player.x + player.w > 140 && player.x < 308;
    if (centerPlatformTarget && underCenterPlatform) {
      return { x: player.x < 224 ? 108 : 340, y: 208 };
    }
    if (centerPlatformTarget && player.y > 190) {
      return { x: target.x, y: 140 };
    }

    const upperTarget = objective.y < 120;
    if (upperTarget && player.y > 130) {
      const stagingX = objective.x < 200 ? 62 : 410;
      return { x: stagingX, y: 76 };
    }
    return target;
  }

  noteGoal(goal) {
    if (goal === this.lastGoal) return;
    this.lastGoal = goal;
    this.goalChanges += 1;
  }

  diagnostics() {
    return { goal: this.lastGoal, goalChanges: this.goalChanges };
  }
}

export class AttractDirector {
  constructor(model, {
    config = BALANCE.demo,
    onRunStart = () => {},
    onRestartPending = () => {},
    onAbort = () => {}
  } = {}) {
    this.model = model;
    this.config = config;
    this.onRunStart = onRunStart;
    this.onRestartPending = onRestartPending;
    this.onAbort = onAbort;
    this.active = false;
    this.runSerial = 0;
    this.consecutiveFailures = 0;
    this.controller = null;
    this.history = [];
  }

  start(entry = "manual") {
    this.active = true;
    this.entry = entry;
    this.runSerial = 0;
    this.consecutiveFailures = 0;
    this.history = [];
    this.beginRun("entry");
  }

  stop() {
    this.active = false;
    this.controller = null;
    this.restartRemaining = 0;
  }

  beginRun(reason) {
    this.runSerial += 1;
    this.model.random = createSeededRandom((this.config.seed + this.runSerial - 1) >>> 0);
    this.model.startRun({ demo: true, levelId: BALANCE.levels.currentId });
    this.controller = new DemoController(this.model);
    this.runTime = 0;
    this.stagnation = 0;
    this.restartRemaining = 0;
    this.bestProgress = this.progressScore();
    this.runStartDeposited = this.model.altar.deposited;
    this.history.push({ type: "run", serial: this.runSerial, reason, runId: this.model.runId });
    this.onRunStart({ serial: this.runSerial, reason });
  }

  step(dt) {
    if (!this.active) return;
    dt = Math.max(0, dt);
    if (this.restartRemaining > 0) {
      this.restartRemaining = Math.max(0, this.restartRemaining - dt);
      if (this.restartRemaining === 0) this.beginRun(this.pendingReason);
      return;
    }

    this.runTime += dt;
    const input = this.model.state === "playing" ? this.controller.nextInput(dt) : EMPTY_INPUT;
    this.model.update(dt, input);

    const progress = this.progressScore();
    if (progress > this.bestProgress) {
      this.bestProgress = progress;
      this.stagnation = 0;
      if (this.model.altar?.deposited > 0) this.consecutiveFailures = 0;
    } else {
      this.stagnation += dt;
    }

    if (["victory", "defeat"].includes(this.model.state)) {
      this.scheduleRestart(this.model.state);
    } else if (["victoryPresentation", "defeatPresentation"].includes(this.model.state)) {
      return;
    } else if (this.runTime >= this.config.maxRunSeconds) {
      this.scheduleRestart("maximum-duration");
    } else if (this.stagnation >= this.config.stagnationSeconds) {
      this.scheduleRestart("stagnation");
    }
  }

  progressScore() {
    if (!this.model.player || !this.model.altar) return 0;
    const collected = this.model.altar.deposited + this.model.carriedSouls;
    return this.model.altar.deposited * 1000 + collected * 100 + this.model.kills * 10;
  }

  scheduleRestart(reason) {
    if (!this.active || this.restartRemaining > 0) return;
    const madeObjectiveProgress = (this.model.altar?.deposited ?? 0) > this.runStartDeposited;
    const failed = reason === "stagnation" || (reason === "defeat" && !madeObjectiveProgress);
    this.consecutiveFailures = failed ? this.consecutiveFailures + 1 : 0;
    this.history.push({
      type: "recovery",
      reason,
      serial: this.runSerial,
      runId: this.model.runId,
      deposited: this.model.altar?.deposited ?? 0
    });
    if (this.consecutiveFailures >= this.config.maxConsecutiveFailures) {
      this.active = false;
      this.controller = null;
      this.onAbort({ reason: "persistent-failure", lastReason: reason, failures: this.consecutiveFailures });
      return;
    }
    this.pendingReason = reason;
    this.restartRemaining = this.config.restartDelaySeconds;
    this.onRestartPending({ reason, delay: this.restartRemaining });
  }

  diagnostics() {
    return {
      active: this.active,
      entry: this.entry,
      runSerial: this.runSerial,
      runTime: this.runTime ?? 0,
      stagnation: this.stagnation ?? 0,
      restartRemaining: this.restartRemaining ?? 0,
      pendingReason: this.pendingReason ?? null,
      consecutiveFailures: this.consecutiveFailures,
      controller: this.controller?.diagnostics() ?? null,
      history: this.history.slice()
    };
  }
}
