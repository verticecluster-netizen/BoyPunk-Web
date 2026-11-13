import assert from "node:assert/strict";
import test from "node:test";
import { BALANCE } from "../src/config.js";
import { CHASER_STATES, GameModel } from "../src/core.js";
import { CoopGameModel } from "../src/coop.js";
import { Renderer } from "../src/renderer.js";

function isolatedRun() {
  const model = new GameModel({ random: () => 0 });
  model.startRun();
  model.nextSpawnAt = Infinity;
  model.enemies = [];
  model.projectiles = [];
  model.souls = [];
  return model;
}

function spawnChaser(model) {
  model.spawnChaser();
  const enemy = model.enemies.at(-1);
  enemy.attackCooldown = Infinity;
  enemy.altarAttackCooldown = Infinity;
  return enemy;
}

function placeChaser(model, x = 200, y = 208) {
  const enemy = spawnChaser(model);
  const patrol = model.resolveChaserPatrolBounds({ x, y });
  Object.assign(enemy, {
    x, y, spawnX: x, spawnY: y,
    patrolLeft: patrol.left, patrolRight: patrol.right,
    patrolDirection: 1, aiState: CHASER_STATES.PATROL,
    vx: 0, vy: 0, onGround: true
  });
  return enemy;
}

function placeTargetAtDistance(model, enemy, distance, direction = 1) {
  model.player.x = enemy.x + enemy.w / 2 + direction * distance - model.player.w / 2;
  model.player.y = enemy.y + enemy.h / 2 - model.player.h / 2;
  model.player.life = Math.max(1, model.player.life);
}

test("cada Chaser nasce com HP autoritativo em 3/3", () => {
  const model = isolatedRun();
  const enemy = spawnChaser(model);
  assert.equal(BALANCE.encounter.chaserMaxHp, 3);
  assert.deepEqual({ hp: enemy.hp, maxHp: enemy.maxHp }, { hp: 3, maxHp: 3 });
});

test("três danos unitários percorrem 3→2→1→0 e só então derrotam", () => {
  const model = isolatedRun();
  const enemy = spawnChaser(model);

  assert.equal(model.damageEnemy(enemy, 1, { type: "teste" }), true);
  assert.equal(enemy.hp, 2);
  assert.equal(enemy.removed, false);
  assert.equal(model.damageEnemy(enemy, 1, { type: "teste" }), true);
  assert.equal(enemy.hp, 1);
  assert.equal(enemy.removed, false);
  assert.equal(model.damageEnemy(enemy, 1, { type: "teste" }), true);
  assert.equal(enemy.hp, 0);
  assert.equal(enemy.removed, true);
});

test("dano maior que um é respeitado sem forçar três acertos", () => {
  const model = isolatedRun();
  const enemy = spawnChaser(model);
  model.damageEnemy(enemy, 2, { type: "projétil-teste" });
  assert.equal(enemy.hp, 1);
  model.damageEnemy(enemy, 2, { type: "projétil-teste" });
  assert.equal(enemy.hp, 0);
  assert.equal(enemy.removed, true);
});

test("morte, pontuação, drop e evento terminal são executados exatamente uma vez", () => {
  const model = isolatedRun();
  const enemy = spawnChaser(model);
  model.damageEnemy(enemy, 3, { type: "teste" });
  model.damageEnemy(enemy, 3, { type: "duplicado" });
  model.killEnemy(enemy, { type: "duplicado-direto" });

  assert.equal(model.kills, 1);
  assert.equal(model.souls.length, 1);
  assert.equal(model.defeatVisuals.length, 1);
  assert.equal(model.consumeEvents().filter(({ type }) => type === "enemyDefeated").length, 1);
});

test("projétil consome a colisão uma vez e aplica seu dano real", () => {
  const model = isolatedRun();
  const enemy = spawnChaser(model);
  Object.assign(enemy, { x: 160, y: 208, vx: 0, vy: 0, onGround: true });
  model.projectiles = [{
    id: "damage-two", sourceId: model.player.id, team: "player",
    x: 100, y: 220, w: 8, h: 8, vx: 300, vy: 0,
    damage: 2, life: 1, age: 0, removed: false, trail: []
  }];

  model.updateProjectiles(0.25);
  assert.equal(enemy.hp, 1);
  assert.equal(model.projectiles[0].removed, true);
  model.updateProjectiles(0.25);
  assert.equal(enemy.hp, 1, "projétil já consumido não repete a mesma colisão");
});

test("hurtFlash usa tempo de simulação, não bloqueia dano e expira", () => {
  const model = isolatedRun();
  const enemy = spawnChaser(model);
  model.damageEnemy(enemy, 1, { type: "primeiro" });
  assert.equal(enemy.hurtFlash, BALANCE.encounter.chaserHurtFlashSeconds);
  model.damageEnemy(enemy, 1, { type: "segundo" });
  assert.equal(enemy.hp, 1, "feedback não introduz invulnerabilidade");

  model.updateChaser(enemy, BALANCE.encounter.chaserHurtFlashSeconds / 2);
  assert.ok(enemy.hurtFlash > 0);
  model.updateChaser(enemy, BALANCE.encounter.chaserHurtFlashSeconds / 2 + 0.001);
  assert.equal(enemy.hurtFlash, 0);
});

test("inimigos sem HP preservam a derrota imediata anterior", () => {
  const model = isolatedRun();
  const shooter = {
    id: "shooter-test", kind: "shooter", x: 100, y: 100, w: 24, h: 24,
    removed: false
  };
  model.enemies = [shooter];
  model.damageEnemy(shooter, 1, { type: "teste" });
  assert.equal(shooter.removed, true);
  assert.equal(model.kills, 1);
  assert.equal("hp" in shooter, false);
});

test("contorno de dano do Chaser restaura o estado do Canvas", () => {
  const calls = [];
  const ctx = {
    save() { calls.push("save"); },
    restore() { calls.push("restore"); },
    strokeRect(...args) { calls.push(["strokeRect", ...args]); },
    set globalAlpha(value) { calls.push(["alpha", value]); },
    set strokeStyle(value) { calls.push(["strokeStyle", value]); },
    set lineWidth(value) { calls.push(["lineWidth", value]); }
  };
  const renderer = Object.create(Renderer.prototype);
  renderer.drawChaserDamageFeedback(ctx, {
    x: 20, y: 30, w: 16, h: 32,
    hurtFlash: BALANCE.encounter.chaserHurtFlashSeconds
  });
  assert.equal(calls[0], "save");
  assert.equal(calls.at(-1), "restore");
  assert.ok(calls.some((entry) => Array.isArray(entry) && entry[0] === "strokeRect"));
});

test("Chaser patrulha longe do jogador a 60% da velocidade de chase", () => {
  const model = isolatedRun();
  const enemy = placeChaser(model, 250);
  model.player.x = 18;
  model.updateChaser(enemy, 0.1);
  assert.equal(enemy.aiState, CHASER_STATES.PATROL);
  assert.equal(Math.abs(enemy.intendedVx), BALANCE.encounter.chaserSpeed * 0.6);
  assert.ok(Math.abs(enemy.vx) <= Math.abs(enemy.intendedVx));
});

test("transições usam entrada em 150, saída em 180 e preservam estado entre os limites", () => {
  const model = isolatedRun();
  const enemy = placeChaser(model, 100);

  placeTargetAtDistance(model, enemy, 150);
  model.updateChaser(enemy, 1 / 120);
  assert.equal(enemy.aiState, CHASER_STATES.CHASE, "150 entra em chase");

  placeTargetAtDistance(model, enemy, 160);
  model.updateChaser(enemy, 1 / 120);
  assert.equal(enemy.aiState, CHASER_STATES.CHASE, "chase é preservado na faixa 150–180");

  placeTargetAtDistance(model, enemy, 180);
  model.updateChaser(enemy, 1 / 120);
  assert.equal(enemy.aiState, CHASER_STATES.PATROL, "180 retorna à patrulha");

  placeTargetAtDistance(model, enemy, 160);
  model.updateChaser(enemy, 1 / 120);
  assert.equal(enemy.aiState, CHASER_STATES.PATROL, "patrol também é preservado na faixa intermediária");
});

test("patrulha deriva limites da superfície e troca direção sem sair da área", () => {
  const model = isolatedRun();
  const upper = model.resolveChaserPatrolBounds({ x: 32, y: 80 });
  assert.ok(upper.left >= 1);
  assert.ok(upper.right <= 32 + BALANCE.encounter.chaserPatrolRadius);
  assert.equal(model.hasChaserPatrolSupport(upper.left, 80), true);
  assert.equal(model.hasChaserPatrolSupport(upper.right, 80), true);

  const enemy = placeChaser(model, 250);
  model.player.x = 18;
  enemy.x = enemy.patrolRight;
  enemy.patrolDirection = 1;
  model.updateChaser(enemy, 1 / 120);
  assert.equal(enemy.patrolDirection, -1);

  let minimum = enemy.x;
  let maximum = enemy.x;
  let directionChanges = 0;
  let previousDirection = enemy.patrolDirection;
  for (let step = 0; step < 4 * 120; step += 1) {
    model.updateChaser(enemy, 1 / 120);
    minimum = Math.min(minimum, enemy.x);
    maximum = Math.max(maximum, enemy.x);
    if (enemy.patrolDirection !== previousDirection) directionChanges += 1;
    previousDirection = enemy.patrolDirection;
  }
  assert.ok(minimum >= enemy.patrolLeft - 1.5);
  assert.ok(maximum <= enemy.patrolRight + 1.5);
  assert.ok(directionChanges >= 1);
});

test("alvo morto encerra chase e coop escolhe o vivo mais próximo deterministicamente", () => {
  const single = isolatedRun();
  const loneEnemy = placeChaser(single, 100);
  loneEnemy.aiState = CHASER_STATES.CHASE;
  single.player.life = 0;
  single.updateChaser(loneEnemy, 1 / 120);
  assert.equal(loneEnemy.aiState, CHASER_STATES.PATROL);

  const coop = new CoopGameModel({ random: () => 0 });
  coop.startCoopPreview();
  coop.nextSpawnAt = Infinity;
  coop.enemies = [];
  const enemy = placeChaser(coop, 200);
  Object.assign(coop.players[0], { id: "p1", x: 158 - coop.players[0].w / 2, y: 208, life: 4 });
  Object.assign(coop.players[1], { id: "p2", x: 258 - coop.players[1].w / 2, y: 208, life: 4 });
  assert.equal(coop.selectLivingPlayer(enemy).id, coop.players[0].id, "empate usa o menor id estável");
  coop.updateChaser(enemy, 1 / 120);
  assert.ok(enemy.intendedVx < 0);
  coop.players[0].life = 0;
  coop.updateChaser(enemy, 1 / 120);
  assert.ok(enemy.intendedVx > 0, "jogador morto deixa de ser perseguido");
});

test("chase preserva o teto de velocidade anterior", () => {
  const model = isolatedRun();
  const enemy = placeChaser(model, 100);
  placeTargetAtDistance(model, enemy, 100);
  for (let step = 0; step < 120; step += 1) {
    model.updateChaser(enemy, 1 / 120);
    assert.ok(Math.abs(enemy.vx) <= BALANCE.encounter.chaserSpeed + 1e-9);
  }
});

test("suavização por aceleração é consistente em passos de tempo diferentes", () => {
  const makeScenario = () => {
    const model = isolatedRun();
    const enemy = placeChaser(model, 100);
    enemy.aiState = CHASER_STATES.CHASE;
    placeTargetAtDistance(model, enemy, 100);
    return { model, enemy };
  };
  const fine = makeScenario();
  const coarse = makeScenario();
  for (let step = 0; step < 6; step += 1) fine.model.updateChaser(fine.enemy, 1 / 120);
  for (let step = 0; step < 3; step += 1) coarse.model.updateChaser(coarse.enemy, 1 / 60);
  assert.ok(Math.abs(fine.enemy.vx - coarse.enemy.vx) < 1e-9);
  assert.ok(Math.abs(fine.enemy.x - coarse.enemy.x) < 0.2);
});
