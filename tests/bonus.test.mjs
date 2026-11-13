import assert from "node:assert/strict";
import test from "node:test";
import { BONUS_RULES, BONUS_CANNON_RULES, calculateBonusQualification, calculateBonusScore } from "../src/bonus.js";
import { BALANCE } from "../src/config.js";
import { GameModel } from "../src/core.js";

const step = (model, seconds, input = {}) => {
  const frames = Math.ceil(seconds * 120);
  for (let index = 0; index < frames; index += 1) model.update(1 / 120, index === 0 ? input : {});
};

function victoriousModel({ playerLife = 4, altarLife = 4, eligible = true, demo = false } = {}) {
  const model = new GameModel({ random: () => 0 });
  model.startRun({ demo, progressionEligible: eligible });
  model.player.life = playerLife;
  model.altar.life = altarLife;
  model.altar.deposited = model.objective.soulsGoal;
  model.update(1 / 120, {});
  return model;
}

function enterBonus(options = {}) {
  const model = victoriousModel(options);
  const qualification = calculateBonusQualification(model.completedRun, {
    eligible: model.progressionEligible && !model.demoMode
  });
  assert.equal(model.queueBonusQualification(qualification), true);
  step(model, 1);
  assert.equal(model.state, "bonusTransition");
  step(model, 1.5);
  assert.equal(model.state, "bonusPlaying");
  return model;
}

test("qualificação usa resultados congelados, razões e limite inclusivo de 75", () => {
  assert.equal(calculateBonusQualification({ playerLife: 4, playerMaxLife: 4, altarLife: 4, altarMaxLife: 4 }).points, 100);
  assert.equal(calculateBonusQualification({ playerLife: 3, playerMaxLife: 4, altarLife: 2, altarMaxLife: 4 }).points, 75);
  assert.equal(calculateBonusQualification({ playerLife: 2, playerMaxLife: 4, altarLife: 3, altarMaxLife: 4 }).qualified, true);
  assert.equal(calculateBonusQualification({ playerLife: 5, playerMaxLife: 8, altarLife: 5, altarMaxLife: 8 }).qualified, false);
  assert.equal(calculateBonusQualification({ playerLife: 6, playerMaxLife: 8, altarLife: 0, altarMaxLife: 8 }).qualified, true);
  assert.equal(calculateBonusQualification({ playerLife: 4, playerMaxLife: 4, altarLife: 4, altarMaxLife: 4 }, { eligible: false }).qualified, false);

  const model = victoriousModel({ playerLife: 3, altarLife: 3 });
  const frozen = model.completedRun;
  model.player.life = 0;
  model.altar.life = 0;
  assert.equal(frozen.playerLife, 3);
  assert.equal(frozen.altarLife, 3);
  assert.equal(calculateBonusQualification(frozen).points, 100);
});

test("vitória qualificada entra automaticamente e pulo produz resultado zero", () => {
  const model = victoriousModel({ playerLife: 3, altarLife: 2 });
  const qualification = calculateBonusQualification(model.completedRun);
  assert.equal(qualification.points, 75);
  assert.equal(model.queueBonusQualification(qualification), true);
  step(model, 1);
  assert.equal(model.state, "bonusTransition");
  assert.equal(model.skipBonus(), true);
  assert.equal(model.state, "bonusComplete");
  assert.equal(model.bonusResult.score, 0);
  assert.equal(model.bonusResult.originLevelId, BALANCE.levels.currentId);
});

test("não qualificada segue vitória normal e demo/preview não recebe bônus", () => {
  const weak = victoriousModel({ playerLife: 2, altarLife: 2 });
  const weakQualification = calculateBonusQualification(weak.completedRun);
  assert.equal(weakQualification.points, 50);
  assert.equal(weak.queueBonusQualification(weakQualification), false);
  step(weak, 1);
  assert.equal(weak.state, "victory");

  const demo = victoriousModel({ demo: true });
  assert.equal(demo.queueBonusQualification(calculateBonusQualification(demo.completedRun)), false);
  const preview = victoriousModel({ eligible: false });
  assert.equal(preview.queueBonusQualification(calculateBonusQualification(preview.completedRun)), false);
});

test("arena cria 30 almas com IDs únicos e pontua até 350", () => {
  const model = enterBonus();
  assert.equal(model.souls.length, 30);
  assert.equal(new Set(model.souls.map(({ id }) => id)).size, 30);
  assert.deepEqual(Object.fromEntries(["accessible", "intermediate", "advanced"].map((difficulty) => [
    difficulty,
    model.souls.filter((soul) => soul.difficulty === difficulty).length
  ])), { accessible: 8, intermediate: 14, advanced: 8 });
  assert.equal(calculateBonusScore(29), 290);
  assert.equal(calculateBonusScore(30), 350);
  for (const soul of [...model.souls]) {
    model.player.x = soul.x;
    model.player.y = soul.y;
    model.update(1 / 120, {});
  }
  assert.equal(model.state, "bonusComplete");
  assert.equal(model.bonusResult.collected, 30);
  assert.equal(model.bonusResult.score, BONUS_RULES.maximumScore);
});

test("coleta usa somente o AABB 15 × 16, sem raio oculto através da plataforma", () => {
  const model = new GameModel();
  model.startBonusPreview();
  const soul = model.souls[0];
  const initialCount = model.souls.length;
  assert.deepEqual({ w: soul.w, h: soul.h }, { w: 15, h: 16 });
  model.player.x = soul.x + soul.w;
  model.player.y = soul.y;
  model.update(1 / 120, {});
  assert.equal(model.souls.length, initialCount, "encostar exatamente na borda não coleta");
  model.player.x = soul.x + soul.w - 0.01;
  model.player.y = soul.y;
  model.update(1 / 120, {});
  assert.equal(model.souls.length, initialCount - 1, "sobreposição real coleta uma única alma");
});

test("timeout, pausa e recuperação de queda respeitam tempo ativo", () => {
  const model = enterBonus();
  step(model, 3);
  const beforePause = model.bonusRemaining;
  model.pause();
  step(model, 4);
  assert.equal(model.bonusRemaining, beforePause);
  model.resume();
  model.player.y = 400;
  const beforeFall = model.bonusRemaining;
  model.update(1 / 120, {});
  assert.equal(model.player.x, model.level.safePosition.x);
  assert.equal(model.player.y, model.level.safePosition.y);
  assert.ok(model.bonusRemaining < beforeFall, "queda não para o cronômetro");
  step(model, BONUS_RULES.durationSeconds);
  assert.equal(model.state, "bonusComplete");
  assert.equal(model.bonusResult.reason, "timeout");
});

test("arena reutiliza física e salto duplo, inicia sem inimigos nem altar", () => {
  const model = enterBonus();
  assert.equal(model.altar, null);
  assert.equal(model.enemies.length, 0);
  assert.equal(model.presses.length, 0);
  const startY = model.player.y;
  model.update(1 / 120, { jumpPressed: true });
  step(model, 0.12);
  model.update(1 / 120, { jumpPressed: true });
  assert.equal(model.player.jumpsUsed, 2);
  assert.ok(model.player.y < startY);
});

test("rota serpenteada coleta as 30 pela física real e estabiliza pousos", () => {
  const model = enterBonus();
  const route = [
    [48, 216], [176, 216], [304, 216], [432, 216],
    [432, 176], [304, 176], [184, 176], [48, 176],
    [32, 136], [88, 136], [172, 136], [228, 136], [284, 136], [340, 136], [420, 136],
    [432, 96], [372, 96], [300, 96], [244, 96], [188, 96], [116, 96], [48, 96],
    [28, 56], [76, 56], [156, 56], [212, 56], [268, 56], [324, 56], [388, 56], [444, 56]
  ];
  let routeIndex = 0;
  let lastJumpStep = -99;
  let stabilizingLanding = false;
  for (let frame = 0; frame < BONUS_RULES.durationSeconds * 120 && model.state === "bonusPlaying"; frame += 1) {
    while (routeIndex < route.length && !model.souls.some((soul) => (
      soul.x === route[routeIndex][0] && soul.y === route[routeIndex][1]
    ))) routeIndex += 1;
    if (routeIndex >= route.length) break;
    const [targetX, targetY] = route[routeIndex];
    const playerCenter = model.player.x + model.player.w / 2;
    const targetCenter = targetX + 7.5;
    const input = {};
    if (model.player.attackCooldown <= 0) input.attackPressed = true;
    if (stabilizingLanding) {
      if (model.player.onGround) stabilizingLanding = false;
    } else {
      if (playerCenter < targetCenter - 4) input.right = true;
      else if (playerCenter > targetCenter + 4) input.left = true;
      if (targetY < model.player.y - 6
        && (model.player.onGround || (model.player.jumpsUsed < 2 && model.player.vy > -40 && frame - lastJumpStep > 15))) {
        input.jumpPressed = true;
        lastJumpStep = frame;
      }
    }
    const collectedBefore = model.bonusCollected;
    model.update(1 / 120, input);
    if (model.bonusCollected > collectedBefore && !model.player.onGround) stabilizingLanding = true;
    if (!model.souls.some((soul) => soul.x === targetX && soul.y === targetY)) routeIndex += 1;
  }
  assert.equal(model.state, "bonusComplete");
  assert.equal(model.bonusResult.score, 350);
  assert.ok(model.bonusResult.activeSeconds >= 15 && model.bonusResult.activeSeconds <= BONUS_RULES.durationSeconds,
    `rota conservadora levou ${model.bonusResult.activeSeconds.toFixed(2)}s`);
});

test("rota com 1 impacto de canhão (-1s de penalidade) completa as 30 almas dentro dos 20s", () => {
  const model = enterBonus();
  const route = [
    [48, 216], [176, 216], [304, 216], [432, 216],
    [432, 176], [304, 176], [184, 176], [48, 176],
    [32, 136], [88, 136], [172, 136], [228, 136], [284, 136], [340, 136], [420, 136],
    [432, 96], [372, 96], [300, 96], [244, 96], [188, 96], [116, 96], [48, 96],
    [28, 56], [76, 56], [156, 56], [212, 56], [268, 56], [324, 56], [388, 56], [444, 56]
  ];
  let routeIndex = 0;
  let lastJumpStep = -99;
  let stabilizingLanding = false;
  let cannonHitApplied = false;

  for (let frame = 0; frame < BONUS_RULES.durationSeconds * 120 && model.state === "bonusPlaying"; frame += 1) {
    while (routeIndex < route.length && !model.souls.some((soul) => (
      soul.x === route[routeIndex][0] && soul.y === route[routeIndex][1]
    ))) routeIndex += 1;
    if (routeIndex >= route.length) break;
    const [targetX, targetY] = route[routeIndex];
    const playerCenter = model.player.x + model.player.w / 2;
    const targetCenter = targetX + 7.5;
    const input = {};
    if (model.player.attackCooldown <= 0) input.attackPressed = true;
    if (stabilizingLanding) {
      if (model.player.onGround) stabilizingLanding = false;
    } else {
      if (playerCenter < targetCenter - 4) input.right = true;
      else if (playerCenter > targetCenter + 4) input.left = true;
      if (targetY < model.player.y - 6
        && (model.player.onGround || (model.player.jumpsUsed < 2 && model.player.vy > -40 && frame - lastJumpStep > 15))) {
        input.jumpPressed = true;
        lastJumpStep = frame;
      }
    }
    const collectedBefore = model.bonusCollected;
    model.update(1 / 120, input);
    if (!cannonHitApplied && model.elapsed > 3.0) {
      model.applyBonusCannonPenalty({ id: "energy-cannon-shot-01" });
      cannonHitApplied = true;
    }
    if (model.bonusCollected > collectedBefore && !model.player.onGround) stabilizingLanding = true;
    if (!model.souls.some((soul) => soul.x === targetX && soul.y === targetY)) routeIndex += 1;
  }
  assert.equal(model.state, "bonusComplete");
  assert.equal(model.bonusResult.score, 350);
  assert.equal(cannonHitApplied, true);
  assert.ok(model.bonusResult.activeSeconds <= BONUS_RULES.durationSeconds,
    `rota com impacto levou ${model.bonusResult.activeSeconds.toFixed(2)}s`);
});

test("cinco ciclos bônus → campanha → menu descartam entidades, timers e efeitos", () => {
  const model = new GameModel();
  for (let cycle = 0; cycle < 5; cycle += 1) {
    model.startRun({ progressionEligible: true, levelId: cycle % 2 ? "scrap-factory" : "district-neon" });
    model.altar.deposited = model.objective.soulsGoal;
    model.update(1 / 120, {});
    assert.equal(model.queueBonusQualification(calculateBonusQualification(model.completedRun)), true);
    step(model, 1);
    assert.equal(model.skipBonus(), true);
    model.startRun({ progressionEligible: true, levelId: model.bonusOriginStats.levelId });
    assert.equal(model.gameMode, "campaign");
    assert.equal(model.bonusResult, null);
    assert.equal(model.bonusRemaining, 0);
    model.goToMenu();
    assert.deepEqual({ enemies: model.enemies.length, projectiles: model.projectiles.length, souls: model.souls.length, effects: model.effects.length }, {
      enemies: 0, projectiles: 0, souls: 0, effects: 0
    });
  }
});

test("prévia direta reutiliza a arena completa e nunca fica elegível a recompensas", () => {
  const model = new GameModel();
  assert.equal(model.startBonusPreview(), true);
  assert.equal(model.state, "bonusPlaying");
  assert.equal(model.gameMode, "bonus");
  assert.equal(model.bonusPreview, true);
  assert.equal(model.progressionEligible, false);
  assert.equal(model.bonusQualificationEligible, false);
  assert.equal(model.bonusRemaining, 20);
  assert.equal(model.souls.length, 30);
  assert.equal(new Set(model.souls.map(({ id }) => id)).size, 30);

  step(model, 20.1);
  assert.equal(model.state, "bonusComplete");
  const completion = model.consumeEvents().find(({ type }) => type === "bonusComplete");
  assert.equal(completion.preview, true);
  assert.equal(completion.progressionEligible, false);

  const firstRunId = model.runId;
  assert.equal(model.startBonusPreview(), true);
  assert.ok(model.runId > firstRunId);
  assert.equal(model.state, "bonusPlaying");
  assert.equal(model.bonusRemaining, 20);
  assert.equal(model.souls.length, 30);
  model.goToMenu();
  assert.equal(model.state, "menu");
  assert.equal(model.bonusPreview, false);
});

test("canhão bônus telegrafa com mira travada antes de disparar", () => {
  const model = new GameModel();
  model.startBonusPreview();
  assert.ok(model.bonusCannon);
  const cannon = model.bonusCannon;
  assert.equal(cannon.phase, "wait");
  assert.equal(cannon.phaseTime, BONUS_CANNON_RULES.initialSafeSeconds);

  // Advance to telegraph phase
  step(model, BONUS_CANNON_RULES.initialSafeSeconds + 0.01);
  assert.equal(cannon.phase, "telegraph");
  assert.ok(cannon.phaseTime > 0);
  const lockedAimX = cannon.aimX;
  const lockedAimY = cannon.aimY;

  // Move player during telegraph: aim coordinates must remain locked
  model.player.x += 60;
  model.player.y -= 40;
  model.update(1 / 120, {});
  assert.equal(cannon.aimX, lockedAimX);
  assert.equal(cannon.aimY, lockedAimY);

  // Complete telegraph: cannon fires projectile toward locked aim
  step(model, BONUS_CANNON_RULES.telegraphSeconds);
  assert.equal(cannon.phase, "recovery");
  const firedShot = model.projectiles.find((p) => p.team === "bonusCannon");
  assert.ok(firedShot, "projétil do canhão bônus deve ser gerado");
  assert.equal(firedShot.sourceId, cannon.id);
});

test("impacto do canhão bônus desconta exatamente 1s sem dano, sem perda de almas e sem knockback", () => {
  const model = new GameModel();
  model.startBonusPreview();
  const initialLife = model.player.life;
  const initialCollected = model.bonusCollected;
  const initialVx = 0;
  const initialVy = 0;
  model.player.vx = initialVx;
  model.player.vy = initialVy;
  const beforeRemaining = model.bonusRemaining;
  const dt = 1 / 120;

  // Position cannon projectile directly overlapping player
  model.projectiles.push({
    id: "test-cannon-shot",
    team: "bonusCannon",
    x: model.player.x,
    y: model.player.y,
    w: 8,
    h: 8,
    vx: -100,
    vy: 0,
    life: 2,
    removed: false,
    sourceId: "energy-cannon-01"
  });

  model.update(dt, {});

  // Time penalty of 1s applied (plus 1 frame elapsed)
  assert.equal(model.bonusRemaining, beforeRemaining - dt - BONUS_CANNON_RULES.timePenaltySeconds);
  assert.equal(model.player.life, initialLife, "vida do jogador não deve ser alterada");
  assert.equal(model.bonusCollected, initialCollected, "almas coletadas não devem ser perdidas");
  assert.equal(model.player.vx, initialVx, "nenhum knockback horizontal");
  assert.equal(model.bonusHitProtection, BONUS_CANNON_RULES.hitProtectionSeconds);
});

test("proteção contra impacto consecutivo do canhão ignora novos tiros durante 0.8s", () => {
  const model = new GameModel();
  model.startBonusPreview();
  model.bonusHitProtection = BONUS_CANNON_RULES.hitProtectionSeconds;
  const remaining = model.bonusRemaining;
  const dt = 1 / 120;

  model.projectiles.push({
    id: "shot-during-protection",
    team: "bonusCannon",
    x: model.player.x,
    y: model.player.y,
    w: 8,
    h: 8,
    vx: -100,
    vy: 0,
    life: 2,
    removed: false,
    sourceId: "energy-cannon-01"
  });

  model.update(dt, {});

  assert.equal(model.bonusRemaining, remaining - dt, "tempo restante não deve sofrer penalidade durante proteção");
  const ignoredEvent = model.consumeEvents().find((e) => e.type === "bonusCannonHitIgnored");
  assert.ok(ignoredEvent, "evento bonusCannonHitIgnored deve ser emitido");
});

test("disparo do canhão bônus é bloqueado por plataformas sólidas e paredes", () => {
  const model = enterBonus();
  model.projectiles.push({
    id: "cannon-wall-shot",
    team: "bonusCannon",
    x: 20,
    y: 208,
    w: 8,
    h: 8,
    vx: -200,
    vy: 0,
    life: 2,
    removed: false,
    sourceId: "energy-cannon-01"
  });

  // Step projectile into left wall at x=16
  model.updateProjectiles(0.1);
  const shot = model.projectiles.find((p) => p.id === "cannon-wall-shot");
  assert.ok(!shot || shot.removed, "tiro do canhão deve ser removido após colidir com a parede");
});

test("penalidade de tempo do canhão que zera o relógio encerra a arena em timeout", () => {
  const model = enterBonus();
  model.bonusRemaining = 0.5; // Less than 1s penalty

  model.projectiles.push({
    id: "fatal-penalty-shot",
    team: "bonusCannon",
    x: model.player.x,
    y: model.player.y,
    w: 8,
    h: 8,
    vx: 0,
    vy: 0,
    life: 2,
    removed: false,
    sourceId: "energy-cannon-01"
  });

  model.update(1 / 120, {});

  assert.equal(model.bonusRemaining, 0);
  assert.equal(model.state, "bonusComplete");
  assert.equal(model.bonusResult.reason, "timeout");
});

test("pausa congela contadores do canhão bônus", () => {
  const model = enterBonus();
  step(model, BONUS_CANNON_RULES.initialSafeSeconds + 0.01);
  const phaseTimeBefore = model.bonusCannon.phaseTime;

  model.pause();
  step(model, 1.5);
  assert.equal(model.bonusCannon.phaseTime, phaseTimeBefore);

  model.resume();
  step(model, 0.1);
  assert.ok(model.bonusCannon.phaseTime < phaseTimeBefore);
});

