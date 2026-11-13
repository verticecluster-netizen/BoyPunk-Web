import assert from "node:assert/strict";
import test from "node:test";
import { BALANCE } from "../src/config.js";
import { GameModel, overlaps, sweptAabb } from "../src/core.js";
import { InputController } from "../src/input.js";
import { AudioManager } from "../src/audio.js";

const step = (model, seconds, input = {}) => {
  const dt = 1 / 120;
  for (let elapsed = 0; elapsed < seconds; elapsed += dt) model.update(dt, input);
};

const finishPlayerDefeat = (model) => step(model, BALANCE.presentation.playerDefeatSeconds + 0.05, {});
const finishVictory = (model) => step(model, BALANCE.presentation.victorySeconds + 0.05, {});

test("inicialização cria uma partida limpa e completa", () => {
  const model = new GameModel({ random: () => 0 });
  model.startRun();
  const snapshot = model.snapshot();
  assert.equal(BALANCE.player.maxLife, 4);
  assert.equal(BALANCE.objective.altarMaxLife, 4);
  assert.equal(snapshot.state, "playing");
  assert.equal(snapshot.player.life, BALANCE.player.maxLife);
  assert.equal(snapshot.altar.life, BALANCE.objective.altarMaxLife);
  assert.equal(snapshot.altar.deposited, 0);
  assert.equal(snapshot.carriedSouls, 0);
  assert.equal(snapshot.enemies, 0);
  assert.equal(snapshot.projectiles, 0);
  assert.equal(snapshot.souls, 3);
});

test("trocar dificuldade altera vida, meta de almas e pressão de encontro por nova run", () => {
  const model = new GameModel({ random: () => 0 });

  model.startRun({ difficulty: "easy" });
  const easy = model.snapshot();
  const easySpawnInterval = model.getEncounterPhase().spawnInterval;
  assert.equal(easy.difficulty, "easy");
  assert.equal(easy.player.life, 6);
  assert.deepEqual(easy.objective, { soulsGoal: 10, altarMaxLife: 6, playerMaxLife: 6 });

  model.startRun({ difficulty: "normal" });
  const normal = model.snapshot();
  const normalSpawnInterval = model.getEncounterPhase().spawnInterval;
  assert.equal(normal.player.life, 4);
  assert.deepEqual(normal.objective, { soulsGoal: 15, altarMaxLife: 4, playerMaxLife: 4 });

  model.startRun({ difficulty: "hard" });
  const hard = model.snapshot();
  const hardSpawnInterval = model.getEncounterPhase().spawnInterval;
  assert.equal(hard.difficulty, "hard");
  assert.equal(hard.player.life, 3);
  assert.deepEqual(hard.objective, { soulsGoal: 20, altarMaxLife: 3, playerMaxLife: 3 });
  assert.ok(easySpawnInterval > normalSpawnInterval);
  assert.ok(hardSpawnInterval < normalSpawnInterval);
  assert.ok(model.encounter.maxEnemies > BALANCE.encounter.maxEnemies);
});

test("sobreviver a uma onda incrementa o contador e cria uma horda maior", () => {
  const model = new GameModel({ random: () => 0 });
  model.startSurvival();

  assert.equal(model.state, "survival");
  assert.equal(model.gameMode, "survival");
  assert.equal(model.player.life, 4);
  assert.equal(model.playerMaxLife, 4);
  assert.equal(model.altar, null);
  assert.equal(model.souls.length, 0);
  assert.equal(model.survivalWave, 1);
  assert.equal(model.enemies.length, 3);

  for (const enemy of [...model.enemies]) model.killEnemy(enemy);
  model.update(1 / 120, {});
  assert.equal(model.survivalWave, 1, "a intermissão mantém a onda recém-concluída no HUD");
  assert.equal(model.souls.length, 0, "inimigos da sobrevivência não geram almas");

  step(model, BALANCE.survival.intermissionSeconds + 0.05, {});
  assert.equal(model.survivalWave, 2);
  assert.equal(model.enemies.length, 4);
  assert.equal(model.enemies.some((enemy) => enemy.kind === "shooter"), true);
  assert.ok(model.survivalEnemySpeedMultiplier > 1);
});

test("movimento usa tempo e colisão impede atravessar o piso", () => {
  const model = new GameModel({ random: () => 0 });
  model.startRun();
  const initialX = model.player.x;
  step(model, 0.5, { right: true });
  assert.ok(model.player.x > initialX + 20);
  step(model, 1.5, {});
  assert.ok(model.player.y + model.player.h <= 240.1);
  assert.equal(model.player.onGround, true);
});

test("salto duplo funciona e não cria terceiro salto", () => {
  const model = new GameModel({ random: () => 0 });
  model.startRun();
  model.update(1 / 120, { jumpPressed: true });
  assert.equal(model.player.jumpsUsed, 1);
  step(model, 0.12, {});
  model.update(1 / 120, { jumpPressed: true });
  assert.equal(model.player.jumpsUsed, 2);
  const secondVelocity = model.player.vy;
  model.update(1 / 120, { jumpPressed: true });
  assert.ok(model.player.vy > secondVelocity);
});

test("ataque preserva derrota imediata de inimigo sem HP e limita projétil", () => {
  const model = new GameModel({ random: () => 0 });
  model.startRun();
  const enemy = { kind: "shooter", x: model.player.x + model.player.w, y: model.player.y, w: 16, h: 32, vx: 0, vy: 0, onGround: true, removed: false };
  model.enemies.push(enemy);
  model.update(1 / 120, { attackPressed: true });
  assert.equal(model.enemies.length, 0);
  assert.equal(model.defeatVisuals.length, 0);
  assert.equal(model.souls.length, 4);
  assert.ok(model.projectiles.length <= 8);
});

test("Bola de Pulso preserva corpo, origem, velocidade e dano; efeitos são decorativos", () => {
  const model = new GameModel({ random: () => 0 });
  model.startRun();
  model.player.x = 80;
  model.player.y = 208;
  model.player.facing = 1;
  model.playerAttack();
  const shot = model.projectiles[0];
  assert.deepEqual({ x: shot.x, y: shot.y, w: shot.w, h: shot.h, vx: shot.vx }, {
    x: 114, y: 220, w: 8, h: 8, vx: BALANCE.player.shotSpeed
  });
  assert.equal(shot.life, 1.25);
  assert.deepEqual(shot.trail, []);
  model.updateProjectiles(1 / 120);
  assert.equal(shot.trail.length, 1);
  assert.equal(model.effects.some(({ kind }) => kind === "pulseImpact"), false, "trilha não simula impacto");

  const enemy = enemyAt(160, 208, "pulse-target");
  model.enemies = [enemy];
  model.updateProjectiles(0.2);
  assert.equal(enemy.removed, false);
  assert.equal(enemy.hp, 2);
  assert.equal(model.kills, 0, "um impacto unitário não derrota o Chaser de 3 HP");
  assert.equal(model.effects.filter(({ kind }) => kind === "pulseImpact").length, 1);
});

test("âncoras de arma geram top-left e centro corretos por personagem e facing", () => {
  const cases = [
    { characterId: "boypunk", facing: 1, topLeft: { x: 114, y: 220 }, center: { x: 118, y: 224 } },
    { characterId: "boypunk", facing: -1, topLeft: { x: 60, y: 220 }, center: { x: 64, y: 224 } },
    { characterId: "support", facing: 1, topLeft: { x: 108, y: 216 }, center: { x: 112, y: 220 } },
    { characterId: "support", facing: -1, topLeft: { x: 66, y: 216 }, center: { x: 70, y: 220 } }
  ];
  for (const expected of cases) {
    const model = new GameModel({ random: () => 0 });
    model.startRun({ characterId: expected.characterId });
    Object.assign(model.player, { x: 80, y: 208, facing: expected.facing });
    model.playerAttack();
    const shot = model.projectiles[0];
    assert.deepEqual(shot.spawnPosition, expected.topLeft);
    assert.deepEqual({ x: shot.x + shot.w / 2, y: shot.y + shot.h / 2 }, expected.center);
    assert.equal(shot.vx, expected.facing * BALANCE.player.shotSpeed);
  }
});

test("clearance da arma bloqueia parede antes do spawn e não pula alvo próximo", () => {
  for (const facing of [1, -1]) {
    const blocked = new GameModel({ random: () => 0 });
    blocked.startRun();
    Object.assign(blocked.player, { x: 160, y: 208, facing });
    const wall = facing > 0
      ? { x: 184, y: 208, w: 4, h: 32, oneWay: false }
      : { x: 154, y: 208, w: 4, h: 32, oneWay: false };
    const behindWall = enemyAt(facing > 0 ? 190 : 138, 208, `behind-${facing}`);
    blocked.platforms = [wall];
    blocked.enemies = [behindWall];
    blocked.playerAttack();
    assert.equal(blocked.projectiles[0].removed, true, `parede ${facing} bloqueia no clearance`);
    assert.equal(behindWall.removed, false, `alvo atrás da parede ${facing} permanece válido`);
    assert.equal(blocked.events.some((event) => event.type === "projectileBlocked"), true);

    const near = new GameModel({ random: () => 0 });
    near.startRun();
    Object.assign(near.player, { x: 160, y: 150, facing, onGround: false, vy: -80 });
    near.platforms = [];
    const closeTarget = { ...enemyAt(facing > 0 ? 184 : 148, 150, `near-${facing}`), kind: "shooter" };
    near.enemies = [closeTarget];
    near.playerAttack();
    assert.equal(closeTarget.removed, true, `alvo próximo aéreo ${facing} é atingido no clearance`);
    assert.equal(near.events.filter((event) => event.type === "projectileHit").length, 1);
    assert.equal(near.kills, 1, "clearance preserva dano/recompensa únicos");
  }
});

test("coleta e depósito de 15 almas concluem a fase", () => {
  const model = new GameModel({ random: () => 0 });
  model.startRun();
  model.souls = Array.from({ length: 15 }, () => ({ x: model.player.x, y: model.player.y, w: 15, h: 16, bornAt: 0, removed: false }));
  model.update(1 / 120, {});
  assert.equal(model.carriedSouls, 15);
  model.player.x = model.altar.x;
  model.player.y = model.altar.y;
  model.update(1 / 120, { interactPressed: true });
  assert.equal(model.altar.deposited, 15);
  assert.equal(model.carriedSouls, 0);
  assert.equal(model.state, "victoryPresentation");
  assert.equal(model.snapshot().terminalCommitted, true);
  assert.deepEqual(model.completedRun, {
    levelId: "district-neon",
    levelTitle: "Distrito Neon",
    activeSeconds: model.terminalResult.committedAt,
    soulsDeposited: BALANCE.objective.soulsGoal,
    soulsTarget: BALANCE.objective.soulsGoal,
    playerLife: BALANCE.player.maxLife,
    playerMaxLife: BALANCE.player.maxLife,
    altarLife: BALANCE.objective.altarMaxLife,
    altarMaxLife: BALANCE.objective.altarMaxLife,
    kills: 0
  });
  const frozen = structuredClone(model.completedRun);
  const victoryEvents = model.consumeEvents().filter((event) => event.type === "victory");
  assert.equal(victoryEvents.length, 1);
  assert.equal(victoryEvents[0].progressionEligible, true);
  assert.equal(model.damagePlayer(1), false);
  model.carriedSouls = 2;
  model.update(0.05, { interactPressed: true, attackPressed: true });
  assert.deepEqual(model.completedRun, frozen);
  assert.equal(model.altar.deposited, BALANCE.objective.soulsGoal);
  assert.equal(model.projectiles.length, 0);
  finishVictory(model);
  assert.equal(model.state, "victory");
  assert.equal(model.consumeEvents().filter((event) => event.type === "victory").length, 0);
});

test("tempo ativo da vitória exclui pausa e resumo permanece congelado", () => {
  const model = new GameModel({ random: () => 0 });
  model.startRun();
  step(model, 0.5, {});
  model.pause();
  step(model, 3, {});
  model.resume();
  step(model, 0.5, {});
  model.souls = Array.from({ length: BALANCE.objective.soulsGoal }, () => ({
    x: model.player.x, y: model.player.y, w: 15, h: 16, bornAt: 0, removed: false
  }));
  model.update(1 / 120, {});
  model.player.x = model.altar.x;
  model.player.y = 208;
  model.update(1 / 120, { interactPressed: true });
  assert.ok(model.completedRun.activeSeconds >= 1 && model.completedRun.activeSeconds < 1.05);
  const active = model.completedRun.activeSeconds;
  finishVictory(model);
  assert.equal(model.completedRun.activeSeconds, active);
});

test("movimento reduzido encurta resposta do altar e novo run limpa vitória", () => {
  const model = new GameModel({ reducedMotion: true });
  model.startRun();
  model.altar.deposited = BALANCE.objective.soulsGoal;
  model.resolveTerminalOutcome();
  assert.equal(model.state, "victoryPresentation");
  assert.equal(model.victoryPresentationRemaining, BALANCE.presentation.reducedMotionVictorySeconds);
  step(model, BALANCE.presentation.reducedMotionVictorySeconds + 0.01, {});
  assert.equal(model.state, "victory");
  model.startRun();
  assert.equal(model.completedRun, null);
  assert.equal(model.victoryPresentationRemaining, 0);
  assert.equal(model.terminalResult, null);
  assert.equal(model.effects.length, 0);
  assert.equal(model.player.life, 4);
  assert.equal(model.altar.life, 4);
});

test("precedência terminal continua jogador, altar e só então vitória", () => {
  const playerFirst = new GameModel();
  playerFirst.startRun();
  playerFirst.player.life = 0;
  playerFirst.altar.life = 0;
  playerFirst.altar.deposited = BALANCE.objective.soulsGoal;
  playerFirst.resolveTerminalOutcome();
  assert.equal(playerFirst.state, "defeatPresentation");
  assert.equal(playerFirst.defeatReason, "Você foi derrotado");

  const altarFirst = new GameModel();
  altarFirst.startRun();
  altarFirst.altar.life = 0;
  altarFirst.altar.deposited = BALANCE.objective.soulsGoal;
  altarFirst.resolveTerminalOutcome();
  assert.equal(altarFirst.state, "defeat");
  assert.equal(altarFirst.defeatReason, "Altar destruído");
});

test("dano respeita invulnerabilidade e permite derrota", () => {
  const model = new GameModel({ random: () => 0 });
  model.startRun();
  assert.equal(model.damagePlayer(1), true);
  assert.equal(model.damagePlayer(1), false);
  assert.equal(model.player.life, BALANCE.player.maxLife - 1);
  assert.equal(model.damageDiagnostics.length, 0, "diagnóstico fica desativado na partida normal");
  step(model, BALANCE.player.invulnerability + 0.05, {});
  model.damagePlayer(BALANCE.player.maxLife - 1);
  model.update(0, {});
  assert.equal(model.state, "defeatPresentation");
  assert.equal(model.snapshot().terminalCommitted, true);
  const position = { x: model.player.x, y: model.player.y };
  model.update(0.1, { right: true, jumpPressed: true, attackPressed: true });
  assert.deepEqual({ x: model.player.x, y: model.player.y }, position);
  assert.equal(model.projectiles.length, 0);
  assert.equal(model.damagePlayer(1), false);
  step(model, model.defeatPresentationRemaining - 0.02, {});
  assert.equal(model.state, "defeatPresentation", "Game Over não cobre o último quadro cedo demais");
  step(model, 0.03, {});
  assert.equal(model.state, "defeat");
});

test("pausa congela a simulação e retomada continua", () => {
  const model = new GameModel({ random: () => 0 });
  model.startRun();
  model.pause();
  const before = model.snapshot();
  step(model, 2, { right: true });
  assert.deepEqual(model.snapshot(), before);
  model.resume();
  step(model, 0.25, { right: true });
  assert.ok(model.player.x > before.player.x);
});

test("perda de foco limpa teclas presas e pausa uma partida ativa", () => {
  class EventTargetMock {
    listeners = new Map();
    addEventListener(type, callback) {
      const callbacks = this.listeners.get(type) ?? [];
      callbacks.push(callback);
      this.listeners.set(type, callbacks);
    }
    dispatch(type, event = {}) {
      for (const callback of this.listeners.get(type) ?? []) callback(event);
    }
    querySelectorAll() { return []; }
  }
  const oldWindow = globalThis.window;
  const oldDocument = globalThis.document;
  const windowMock = new EventTargetMock();
  const documentMock = new EventTargetMock();
  globalThis.window = windowMock;
  globalThis.document = documentMock;
  try {
    const model = new GameModel({ random: () => 0 });
    model.startRun();
    const input = new InputController(documentMock);
    input.onBlur = () => { if (model.state === "playing") model.pause(); };
    windowMock.dispatch("keydown", { code: "KeyD", preventDefault() {} });
    assert.equal(input.snapshot().right, true);
    windowMock.dispatch("blur");
    assert.equal(input.snapshot().right, false);
    assert.equal(model.state, "paused");
    model.resume();
    assert.equal(model.state, "playing");
  } finally {
    if (oldWindow === undefined) delete globalThis.window;
    else globalThis.window = oldWindow;
    if (oldDocument === undefined) delete globalThis.document;
    else globalThis.document = oldDocument;
  }
});

test("projéteis têm colisão retangular válida", () => {
  assert.equal(overlaps({ x: 0, y: 0, w: 10, h: 10 }, { x: 9, y: 9, w: 3, h: 3 }), true);
  assert.equal(overlaps({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 10, w: 3, h: 3 }), false);
  assert.equal(sweptAabb({ x: 0, y: 0, w: 8, h: 8 }, 100, 0, { x: 50, y: 0, w: 8, h: 8 }), 0.42);
  assert.equal(sweptAabb({ x: 0, y: 0, w: 8, h: 8 }, 100, 0, { x: 50, y: 20, w: 8, h: 8 }), null);
});

function enemyAt(x, y, id = "test-enemy") {
  return {
    id, kind: "chaser", x, y, w: 16, h: 32, vx: 0, vy: 0, facing: -1,
    onGround: true, attackCooldown: 10, altarAttackCooldown: 10,
    maxHp: BALANCE.encounter.chaserMaxHp, hp: BALANCE.encounter.chaserMaxHp,
    hurtFlash: 0, removed: false
  };
}

function enemyShot(model, { x, y, vx = 118, vy = 0, id = "test-shot" }) {
  model.projectiles.push({ id, sourceId: "test-source", team: "enemy", x, y, w: 8, h: 8, vx, vy, life: 2, removed: false });
}

test("tiro acerta inimigo parado e em movimento nos dois sentidos", () => {
  for (const facing of [1, -1]) {
    const model = new GameModel({ random: () => 0 });
    model.startRun();
    model.player.x = facing > 0 ? 80 : 350;
    model.player.y = 208;
    model.player.facing = facing;
    const enemy = enemyAt(facing > 0 ? 150 : 285, 208, `enemy-${facing}`);
    model.enemies.push(enemy);
    model.playerAttack();
    model.updateProjectiles(0.25);
    assert.equal(enemy.hp, 2, `tiro a ${facing} deve atingir alvo parado uma vez`);
    assert.equal(enemy.removed, false);
    assert.equal(model.damageDiagnostics.length, 0);

    const moving = enemyAt(facing > 0 ? 150 : 285, 208, `moving-${facing}`);
    moving.previous = { x: moving.x + facing * 24, y: moving.y, w: moving.w, h: moving.h };
    model.enemies = [moving];
    model.player.attackCooldown = 0;
    model.playerAttack();
    model.updateProjectiles(0.25);
    assert.equal(moving.hp, 2, `varredura relativa deve atingir alvo móvel a ${facing} uma vez`);
    assert.equal(moving.removed, false);
  }
});

test("tiro em outra altura não acerta artificialmente; parede bloqueia antes do alvo", () => {
  const model = new GameModel({ random: () => 0 });
  model.startRun();
  model.player.x = 80;
  model.player.y = 208;
  const high = enemyAt(120, 100, "high-target");
  model.enemies = [high];
  model.playerAttack();
  model.updateProjectiles(0.2);
  assert.equal(high.removed, false);

  model.projectiles = [{ id: "wall-shot", sourceId: model.player.id, team: "player", x: 100, y: 180, w: 8, h: 8, vx: 500, vy: 0, life: 1, removed: false }];
  const behindWall = enemyAt(330, 164, "behind-wall");
  model.enemies = [behindWall];
  model.updateProjectiles(0.5);
  assert.equal(behindWall.removed, false);
  assert.ok(model.consumeEvents().some((event) => event.type === "projectileBlocked" && event.projectileId === "wall-shot"));
  assert.ok(model.effects.some((effect) => effect.kind === "blockedShot"));
});

test("tiro rápido não atravessa alvo entre passos nem acerta duas vezes", () => {
  const model = new GameModel({ random: () => 0 });
  model.startRun();
  model.enemies = [enemyAt(180, 208)];
  model.projectiles.push({ id: "fast", sourceId: model.player.id, team: "player", x: 80, y: 220, w: 8, h: 8, vx: 5000, vy: 0, life: 1, removed: false });
  model.updateProjectiles(0.05);
  assert.equal(model.enemies[0].hp, 2);
  assert.equal(model.enemies[0].removed, false);
  assert.equal(model.projectiles[0].removed, true);
});

test("nenhum dano sem colisão, tiro perigoso causa um impacto e respeita invulnerabilidade", () => {
  const model = new GameModel({ random: () => 0, debug: true });
  model.startRun();
  model.nextSpawnAt = Infinity;
  step(model, 1, {});
  assert.equal(model.damageDiagnostics.length, 0);
  enemyShot(model, { x: model.player.x - 14, y: model.player.y + 12, id: "impact-1" });
  step(model, 0.2, {});
  assert.equal(model.player.life, BALANCE.player.maxLife - 1);
  assert.equal(model.damageDiagnostics.length, 1);
  assert.equal(model.damageDiagnostics[0].projectileId, "impact-1");
  enemyShot(model, { x: model.player.x - 14, y: model.player.y + 12, id: "impact-2" });
  step(model, 0.2, {});
  assert.equal(model.player.life, BALANCE.player.maxLife - 1);
  assert.ok(model.consumeEvents().some((event) => event.type === "damageIgnored"));
});

test("contato tem cooldown, sinal visível, e pausa congela dano", () => {
  const model = new GameModel({ random: () => 0 });
  model.startRun();
  model.nextSpawnAt = Infinity;
  const chaser = enemyAt(model.player.x + 4, model.player.y, "contact");
  chaser.attackCooldown = 0;
  chaser.altarAttackCooldown = Infinity;
  model.enemies.push(chaser);
  model.update(1 / 120, {});
  assert.equal(model.player.life, BALANCE.player.maxLife - 1);
  assert.ok(model.effects.some((effect) => effect.kind === "contactAttack"));
  step(model, 0.4, {});
  assert.equal(model.player.life, BALANCE.player.maxLife - 1);
  model.pause();
  const life = model.player.life;
  chaser.x = model.player.x;
  step(model, 2, {});
  assert.equal(model.player.life, life);
  model.resume();
});

test("altar e jogador têm derrotas distintas, incluindo dano simultâneo", () => {
  const altarRun = new GameModel({ random: () => 0, debug: true });
  altarRun.startRun();
  altarRun.nextSpawnAt = Infinity;
  for (let hit = 0; hit < BALANCE.objective.altarMaxLife; hit += 1) {
    enemyShot(altarRun, { x: altarRun.altar.x - 12, y: altarRun.altar.y + 18, id: `altar-${hit}` });
    step(altarRun, 0.2, {});
    if (hit < BALANCE.objective.altarMaxLife - 1) step(altarRun, BALANCE.objective.altarInvulnerability + 0.05, {});
  }
  assert.equal(altarRun.state, "defeat");
  assert.equal(altarRun.defeatReason, "Altar destruído");
  assert.equal(altarRun.player.life, BALANCE.player.maxLife);
  assert.ok(altarRun.damageDiagnostics.every((entry) => entry.target === "altar"));

  const playerRun = new GameModel({ random: () => 0, debug: true });
  playerRun.startRun();
  playerRun.nextSpawnAt = Infinity;
  for (let hit = 0; hit < BALANCE.player.maxLife; hit += 1) {
    enemyShot(playerRun, { x: playerRun.player.x - 14, y: playerRun.player.y + 12, id: `player-${hit}` });
    step(playerRun, 0.2, {});
    if (hit < BALANCE.player.maxLife - 1) step(playerRun, BALANCE.player.invulnerability + 0.05, {});
  }
  assert.equal(playerRun.state, "defeatPresentation");
  assert.equal(playerRun.defeatReason, "Você foi derrotado");
  assert.equal(playerRun.altar.life, BALANCE.objective.altarMaxLife);
  finishPlayerDefeat(playerRun);
  assert.equal(playerRun.state, "defeat");

  const simultaneous = new GameModel({ random: () => 0 });
  simultaneous.startRun();
  simultaneous.player.x = 208;
  simultaneous.player.y = 208;
  simultaneous.player.life = 1;
  simultaneous.altar.life = 1;
  const attacker = enemyAt(212, simultaneous.player.y, "simultaneous");
  attacker.attackCooldown = 0;
  attacker.altarAttackCooldown = 0;
  simultaneous.enemies = [attacker];
  simultaneous.update(1 / 120, {});
  assert.equal(simultaneous.player.life, 0);
  assert.equal(simultaneous.altar.life, 0);
  assert.equal(simultaneous.defeatReason, "Você foi derrotado");
  assert.equal(simultaneous.state, "defeatPresentation");
  assert.equal(simultaneous.consumeEvents().filter((event) => event.type === "defeat").length, 1);
  finishPlayerDefeat(simultaneous);
  assert.equal(simultaneous.state, "defeat");
});

test("tiro telegrafado que fica travado no centro atinge legitimamente o altar após fuga ao canto", () => {
  const model = new GameModel({ random: () => 0.7, debug: true });
  model.startRun();
  model.nextSpawnAt = Infinity;
  model.carriedSouls = 4;
  model.player.x = 179;
  model.player.y = 208;
  model.player.life = 2;
  model.player.onGround = true;

  for (let hit = 0; hit < BALANCE.objective.altarMaxLife; hit += 1) {
    // A mira é capturada ao surgir o atirador, enquanto o jogador está no
    // centro inferior. O jogador então corre ao canto antes do disparo.
    model.player.x = 179;
    const before = model.damageDiagnostics.length;
    model.spawnShooter();
    const turret = model.enemies.at(-1);
    assert.deepEqual({ x: turret.x, y: turret.y }, { x: 24, y: 144 });
    assert.deepEqual({ x: turret.aimX, y: turret.aimY }, { x: 190, y: 224 });
    model.update(0.05, {});
    assert.equal(model.altar.life, BALANCE.objective.altarMaxLife - hit);
    assert.equal(model.projectiles.length, 0, "o telegraph, sozinho, não causa dano");

    model.player.x = 442;
    model.player.y = 208;
    model.player.onGround = true;
    if (hit > 0) model.altar.invulnerable = 0;
    turret.phaseTime = 0.001;
    model.update(1 / 120, {});
    assert.equal(model.projectiles.length, 1, "o tiro só existe ao terminar a preparação");
    turret.removed = true;

    let steps = 0;
    while (model.damageDiagnostics.length === before && model.state === "playing" && steps < 300) {
      model.update(1 / 120, {});
      steps += 1;
    }
    const damage = model.damageDiagnostics.at(-1);
    assert.equal(damage.target, "altar");
    assert.equal(damage.type, "projétil-inimigo");
    assert.ok(damage.projectileId);
    assert.deepEqual(damage.lifeBefore, BALANCE.objective.altarMaxLife - hit);
    assert.deepEqual(damage.lifeAfter, BALANCE.objective.altarMaxLife - hit - 1);
    assert.deepEqual(damage.collision.target.id, model.altar.id);
    assert.ok(damage.collision.trajectory.flightSeconds > 1.4);
    assert.deepEqual(damage.collision.trajectory.origin, { x: 32, y: 152 });
    assert.ok(damage.collision.trajectory.impactFraction >= 0 && damage.collision.trajectory.impactFraction <= 1);
    assert.ok(damage.collision.trajectory.to.y > 192, "o tiro passa abaixo da plataforma sólida central");
    assert.equal(model.player.life, 2, "o projétil não atingiu o jogador no canto direito");
    assert.equal(model.projectiles.length, 0, "um projétil removido após seu primeiro contato");
    if (hit < BALANCE.objective.altarMaxLife - 1) step(model, BALANCE.objective.altarInvulnerability + 0.05, {});
  }

  assert.equal(model.state, "defeat");
  assert.equal(model.defeatReason, "Altar destruído");
  assert.equal(model.player.life, 2);
  assert.equal(model.altar.life, 0);
});

test("tiro inimigo apontado ao canto é bloqueado pela plataforma antes de qualquer alvo", () => {
  const model = new GameModel({ random: () => 0, debug: true });
  model.startRun();
  model.nextSpawnAt = Infinity;
  model.carriedSouls = 4;
  model.player.x = 442;
  model.player.y = 208;
  const turret = { id: "wall-test-turret", kind: "shooter", x: 24, y: 144, w: 24, h: 24, aimX: 453, aimY: 224, removed: false };
  assert.equal(model.fireEnemyShot(turret), true);
  const shot = model.projectiles[0];
  let blocked = null;
  for (let i = 0; i < 300 && !shot.removed; i += 1) {
    model.update(1 / 120, {});
    blocked ??= model.consumeEvents().find((event) => event.type === "projectileBlocked") ?? null;
  }
  assert.ok(blocked, "plataforma é a primeira colisão válida");
  assert.equal(blocked.obstacle.x, 144);
  assert.equal(blocked.obstacle.y, 176);
  assert.equal(model.altar.life, BALANCE.objective.altarMaxLife);
  assert.equal(model.player.life, BALANCE.player.maxLife);
});

test("entidade removida e projétil de execução anterior não danificam o altar", () => {
  const model = new GameModel({ random: () => 0, debug: true });
  model.startRun();
  model.nextSpawnAt = Infinity;
  model.projectiles.push({ id: "old-shot", team: "enemy", x: model.altar.x, y: model.altar.y, w: 8, h: 8, vx: 0, vy: 0, life: 3, sourceId: "old-turret", removed: true });
  model.enemies.push({ id: "old-enemy", kind: "chaser", x: model.altar.x, y: model.altar.y, w: 16, h: 32, vx: 0, vy: 0, removed: true, altarAttackCooldown: 0 });
  step(model, 0.1, {});
  assert.equal(model.altar.life, BALANCE.objective.altarMaxLife);
  model.startRun();
  model.nextSpawnAt = Infinity;
  step(model, 0.1, {});
  assert.equal(model.altar.life, BALANCE.objective.altarMaxLife);
  assert.equal(model.projectiles.length, 0);
  assert.equal(model.enemies.length, 0);
  assert.equal(model.damageDiagnostics.length, 0);
});

test("aviso crítico do altar é distinto e respeita volume/mudo", () => {
  const parameter = () => ({
    value: 0,
    values: [],
    setValueAtTime(value) { this.value = value; this.values.push(value); },
    linearRampToValueAtTime(value) { this.value = value; this.values.push(value); }
  });
  const oscillators = [];
  const gains = [];
  const audio = new AudioManager(new Map());
  audio.context = {
    currentTime: 4,
    destination: {},
    createOscillator() {
      const oscillator = { frequency: parameter(), connect() {}, start() {}, stop() {} };
      oscillators.push(oscillator);
      return oscillator;
    },
    createGain() { const node = { gain: parameter(), connect() {} }; gains.push(node); return node; }
  };
  audio.initialized = true;
  audio.preferences = { volume: 0.5, muted: false };
  assert.equal(audio.playAltarWarning(), true);
  assert.deepEqual(oscillators[0].frequency.values, [740, 520, 740]);
  assert.equal(gains.length, 2, "barramento global e envelope local permanecem separados");
  assert.ok(Math.abs(gains[0].gain.value * gains[1].gain.values[1] - 0.0275) < 0.000001);
  assert.equal(oscillators.length, 1);
  audio.preferences.muted = true;
  assert.equal(audio.playAltarWarning(), false);
  assert.equal(oscillators.length, 1);
});

test("atirador anuncia e trava a mira antes do disparo", () => {
  const model = new GameModel({ random: () => 0 });
  model.startRun();
  model.carriedSouls = 4;
  model.spawnShooter();
  const shooter = model.enemies[0];
  const lockedAim = { x: shooter.aimX, y: shooter.aimY };
  model.player.x = 420;
  model.player.y = 208;
  step(model, BALANCE.encounter.shooterTelegraph + 0.05, {});
  assert.equal(model.projectiles.length, 1);
  assert.equal(shooter.phase, "recovery");
  assert.equal(shooter.aimX, lockedAim.x);
  assert.equal(shooter.aimY, lockedAim.y);
});

test("diretor de encontros aumenta pressão por progresso sem ultrapassar orçamento", () => {
  const model = new GameModel({ random: () => 0.25 });
  model.startRun();
  assert.equal(model.getEncounterPhase().id, "aprendizado");
  model.carriedSouls = 8;
  assert.equal(model.getEncounterPhase().id, "confronto");
  step(model, 16, {});
  const cost = model.enemies.reduce((total, enemy) => total + (enemy.kind === "shooter" ? 2 : 1), 0);
  assert.ok(cost <= model.getEncounterPhase().budget);
  assert.ok(model.enemies.length <= model.getEncounterPhase().maxEnemies);
});

test("cadência global impede rajada simultânea de atiradores", () => {
  const model = new GameModel({ random: () => 0 });
  model.startRun();
  model.carriedSouls = 12;
  model.spawnShooter();
  model.spawnShooter();
  step(model, BALANCE.encounter.shooterTelegraph + 0.05, {});
  assert.equal(model.projectiles.filter((shot) => shot.team === "enemy").length, 1);
  step(model, BALANCE.encounter.minimumShotGap + 0.15, {});
  assert.ok(model.projectiles.filter((shot) => shot.team === "enemy").length <= 2);
});

test("limites de encontro impedem crescimento sem controle", () => {
  const model = new GameModel({ random: () => 0.25 });
  model.startRun();
  step(model, 24, {});
  assert.ok(model.enemies.length <= BALANCE.encounter.maxEnemies);
  assert.ok(model.projectiles.length <= BALANCE.encounter.maxProjectiles);
});

test("derrota do chaser separa combate do visual, recompensa uma vez e limpa resíduos", () => {
  const model = new GameModel({ random: () => 0 });
  model.startRun();
  model.nextSpawnAt = Infinity;
  const enemy = enemyAt(model.player.x + model.player.w, model.player.y, "defeat-visual");
  enemy.attackCooldown = Infinity;
  enemy.altarAttackCooldown = Infinity;
  model.enemies = [enemy];
  const initialSouls = model.souls.length;
  const initialLife = model.player.life;

  model.update(1 / 120, { attackPressed: true });
  model.damageEnemy(enemy, 1, { type: "teste-finalizacao" });
  model.update(1 / 120, {});
  assert.equal(model.enemies.length, 0, "o inimigo sai do conjunto de combate no tick da derrota");
  assert.equal(model.defeatVisuals.length, 1, "somente a representação visual temporária permanece");
  assert.equal(model.souls.length, initialSouls + 1);
  assert.equal(model.kills, 1);
  assert.equal(model.player.life, initialLife, "o visual de derrota não causa dano de contato");
  assert.equal(model.consumeEvents().filter((event) => event.type === "enemyDefeated").length, 1);

  model.projectiles = [{
    id: "passes-through-defeat-visual", sourceId: model.player.id, team: "player",
    x: enemy.x - 24, y: enemy.y + 12, w: 8, h: 8, vx: 120, vy: 0, life: 1, removed: false
  }];
  model.updateProjectiles(0.25);
  assert.equal(model.projectiles[0].removed, false, "o visual derrotado não bloqueia projéteis");

  model.killEnemy(enemy);
  assert.equal(model.souls.length, initialSouls + 1, "recompensa não duplica");
  assert.equal(model.kills, 1);
  step(model, BALANCE.presentation.chaserDefeatSeconds + 0.05, {});
  assert.equal(model.defeatVisuals.length, 0, "o visual expira sem callback de animação");

  for (let index = 0; index < BALANCE.presentation.maxDefeatVisuals + 3; index += 1) {
    model.killEnemy(enemyAt(100 + index, 208, `bounded-${index}`));
  }
  assert.equal(model.defeatVisuals.length, BALANCE.presentation.maxDefeatVisuals);
  model.startRun();
  assert.equal(model.defeatVisuals.length, 0, "retry limpa restos visuais");
  model.killEnemy(enemyAt(120, 208, "menu-clear"));
  model.goToMenu();
  assert.equal(model.defeatVisuals.length, 0, "saída ao menu limpa restos visuais");
});

test("cinco ciclos de derrota por dano real e reinício não retêm estado anterior", () => {
  const model = new GameModel({ random: () => 0 });
  for (let cycle = 1; cycle <= 5; cycle += 1) {
    model.startRun();
    model.nextSpawnAt = Infinity;
    for (let hit = 0; hit < BALANCE.player.maxLife; hit += 1) {
      enemyShot(model, { x: model.player.x - 14, y: model.player.y + 12, id: `cycle-${cycle}-hit-${hit}` });
      step(model, 0.2, {});
      if (hit < BALANCE.player.maxLife - 1) step(model, BALANCE.player.invulnerability + 0.05, {});
    }
    assert.equal(model.state, "defeatPresentation");
    assert.equal(model.consumeEvents().filter((event) => event.type === "defeat").length, 1);
    finishPlayerDefeat(model);
    assert.equal(model.state, "defeat");
    assert.equal(model.player.life, 0);
    model.startRun();
    const snapshot = model.snapshot();
    assert.equal(snapshot.runId, cycle * 2);
    assert.equal(snapshot.player.life, BALANCE.player.maxLife);
    assert.equal(snapshot.altar.life, BALANCE.objective.altarMaxLife);
    assert.equal(snapshot.altar.deposited, 0);
    assert.equal(snapshot.carriedSouls, 0);
    assert.equal(snapshot.enemies, 0);
    assert.equal(snapshot.projectiles, 0);
    assert.equal(snapshot.souls, 3);
    assert.equal(snapshot.spawnClock, 0);
    assert.equal(snapshot.spawnCount, 0);
    assert.equal(snapshot.effects, 0);
    assert.equal(snapshot.encounterPhase, "aprendizado");
    assert.equal(model.damageDiagnostics.length, 0);
    assert.equal(model.events.filter((event) => event.type === "defeat").length, 0);
  }
});
