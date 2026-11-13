import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { BONUS_COMBAT_RULES, BONUS_RULES } from "../src/bonus.js";
import { BALANCE } from "../src/config.js";
import { GameModel, overlaps } from "../src/core.js";

const DT = 1 / 120;

function step(model, seconds, input = {}) {
  const frames = Math.ceil(seconds * 120);
  for (let frame = 0; frame < frames && model.state === "bonusPlaying"; frame += 1) {
    model.update(DT, frame === 0 ? input : {});
  }
}

function bonus(characterId = "boypunk") {
  const model = new GameModel({ random: () => 0 });
  assert.equal(model.startBonusPreview(undefined, characterId), true);
  return model;
}

function center(entity) {
  return { x: entity.x + entity.w / 2, y: entity.y + entity.h / 2 };
}

test("entrada é escalonada, avisada e cancelada se o ponto deixar de ser seguro", () => {
  const model = bonus();
  assert.equal(BONUS_RULES.durationSeconds, 20);
  assert.equal(BONUS_RULES.totalSouls, 30);
  assert.equal(model.enemies.length, 0);
  step(model, BONUS_COMBAT_RULES.enemySpawns[0].startsAtElapsed - 0.05);
  assert.equal(model.enemies.length, 0, "janela inicial não cria inimigo");

  step(model, 0.1);
  const schedule = model.bonusEnemySpawns[0];
  assert.equal(schedule.state, "warning");
  assert.equal(model.enemies.length, 0, "aviso antecede o corpo físico");
  const selected = { ...schedule.selected };
  const playerCenter = center(model.player);
  const spawnCenter = center(model.bonusSpawnBody(selected));
  assert.ok(Math.hypot(spawnCenter.x - playerCenter.x, spawnCenter.y - playerCenter.y) >= BONUS_COMBAT_RULES.minimumPlayerDistance);

  model.player.x = selected.x;
  model.player.y = selected.y;
  model.update(DT, {});
  assert.equal(schedule.state, "pending");
  assert.equal(model.enemies.length, 0, "jogador que ocupa o aviso adia o spawn");

  model.player.x = model.level.safePosition.x;
  model.player.y = model.level.safePosition.y;
  model.player.invulnerable = Infinity;
  step(model, BONUS_COMBAT_RULES.spawnRetrySeconds + schedule.telegraphSeconds + 0.2);
  assert.equal(schedule.state, "spawned");
  assert.equal(model.enemies.length, 1);
  assert.equal(model.enemies[0].hp, BALANCE.encounter.chaserMaxHp);
});

test("composição é finita e nunca excede dois Chasers além do canhão", () => {
  const model = bonus();
  model.player.invulnerable = Infinity;
  step(model, 12);
  assert.ok(model.bonusCannon, "canhão original permanece ativo");
  assert.equal(model.bonusEnemySpawns.length, 2);
  assert.equal(model.bonusEnemySpawns.every(({ state }) => state === "spawned"), true);
  assert.equal(model.enemies.length, 2);
  assert.equal(model.enemies.every(({ kind, hp }) => kind === "chaser" && hp === 3), true);
  assert.ok(model.enemies.length <= BONUS_COMBAT_RULES.maximumMobileEnemies);
  assert.equal(model.projectiles.filter(({ team }) => team === "enemy").length, 0, "Chasers não acrescentam barragem de tiros");
});

test("Chaser que cai fora da geometria sai sem respawn nem alma residual", () => {
  const model = bonus();
  model.bonusEnemySpawns.forEach((schedule) => { schedule.state = "spawned"; });
  const enemy = model.spawnChaserAt({ x: 336, y: 208 }, { bonusScheduleId: "fall-test" });
  enemy.y = 400;
  const soulsBefore = model.souls.length;
  model.update(DT, {});
  assert.equal(model.enemies.length, 0);
  assert.equal(model.souls.length, soulsBefore);
  assert.equal(model.events.some(({ type, reason }) => type === "enemyExited" && reason === "bonus-fall"), true);
});

test("pontos candidatos têm apoio e não sobrepõem sólidos, almas ou pickups ativos", () => {
  const model = bonus();
  for (const schedule of model.bonusEnemySpawns) {
    const safeCandidates = schedule.candidates.filter((point) => model.isSafeBonusEnemySpawn(point));
    assert.ok(safeCandidates.length >= 2, `${schedule.id} mantém alternativas seguras`);
    for (const point of safeCandidates) {
      const body = model.bonusSpawnBody(point);
      assert.equal(model.hasChaserPatrolSupport(body.x, body.y, body.w, body.h), true);
      assert.equal(model.platforms.some((platform) => !platform.oneWay && overlaps(body, platform)), false);
      assert.equal(model.souls.some((soul) => overlaps(body, soul)), false);
      assert.equal(model.powerUps.some((pickup) => overlaps(body, pickup)), false);
    }
  }
});

test("ataque de Nilo preserva cadência, sons por personagem, TR/RD e abate não cria alma", () => {
  const model = bonus("support");
  model.player.invulnerable = Infinity;
  model.enemies = [];
  model.player.x = 60;
  model.player.y = 208;
  model.player.facing = 1;
  const enemy = model.spawnChaserAt({ x: 120, y: 208 });
  const objectiveSouls = model.souls.length;

  for (let hit = 0; hit < 3; hit += 1) {
    model.playerAttack();
    model.updateProjectiles(0.1);
    model.cleanupEntities();
    model.player.attackCooldown = 0;
  }
  assert.equal(enemy.hp, 0);
  assert.equal(model.kills, 1);
  assert.equal(model.souls.length, objectiveSouls, "abate no bônus não solta alma de objetivo");
  const shotEvents = model.events.filter(({ type }) => type === "playerShotEmitted");
  assert.equal(shotEvents.length, 3);
  assert.equal(shotEvents.every(({ characterId }) => characterId === "support"), true);

  model.activateFloatingPowerUp({ powerUpType: "rapid-fire", x: 0, y: 0, w: 20, h: 20 }, model.player);
  model.activateFloatingPowerUp({ powerUpType: "double-burst", x: 0, y: 0, w: 16, h: 16 }, model.player);
  model.playerAttack();
  assert.equal(model.player.attackCooldown, model.character.attackCooldown * 0.5);
  assert.equal(model.pendingPlayerShots.length, 1);
});

test("dano usa escudo e invulnerabilidade; morte conclui o bônus uma única vez", () => {
  const model = bonus();
  model.bonusCollected = 5;
  const fullLife = model.player.life;
  model.player.shield = true;
  assert.equal(model.damagePlayer(1, 1, { type: "teste" }), false);
  assert.equal(model.player.life, fullLife);
  assert.equal(model.player.shield, false);
  assert.ok(model.player.invulnerable > 0);
  assert.equal(model.damagePlayer(1, 1, { type: "teste-repetido" }), false);

  model.player.invulnerable = 0;
  assert.equal(model.damagePlayer(1, 1, { type: "teste-real" }), true);
  assert.equal(model.player.life, fullLife - 1);
  model.player.life = 1;
  model.player.invulnerable = 0;
  assert.equal(model.damagePlayer(1, 1, { type: "teste-fatal" }), true);
  model.update(DT, {});

  assert.equal(model.state, "bonusComplete");
  assert.equal(model.bonusResult.reason, "death");
  assert.equal(model.bonusResult.collected, 5);
  assert.equal(model.bonusResult.score, 50);
  assert.deepEqual({ enemies: model.enemies.length, projectiles: model.projectiles.length, schedules: model.bonusEnemySpawns.length, pickups: model.powerUps.length }, {
    enemies: 0, projectiles: 0, schedules: 0, pickups: 0
  });
  assert.equal(model.finishBonus("death"), false);
  assert.equal(model.consumeEvents().filter(({ type }) => type === "bonusComplete").length, 1);
});

test("pickups entram em etapas, respeitam elegibilidade, respawn curto e pausa", () => {
  const model = bonus();
  model.player.invulnerable = Infinity;
  assert.equal(model.powerUps.length, 0, "nenhum pickup aparece na entrada");
  step(model, 2.3);
  assert.deepEqual(model.powerUps.map(({ powerUpType }) => powerUpType), ["rapid-fire"]);

  const healthTimer = model.supportPickupSpawns.find(({ powerUpType }) => powerUpType === "health");
  model.pause();
  const frozenHealth = healthTimer.respawnRemaining;
  const frozenSchedule = model.bonusEnemySpawns[0].retryRemaining;
  model.update(0.05, {});
  assert.equal(healthTimer.respawnRemaining, frozenHealth);
  assert.equal(model.bonusEnemySpawns[0].retryRemaining, frozenSchedule);
  model.resume();

  const rapid = model.powerUps.find(({ powerUpType }) => powerUpType === "rapid-fire");
  model.player.x = rapid.x;
  model.player.y = rapid.y;
  assert.equal(model.updateSupportPickupCollection([model.player]), true);
  const rapidSpawn = model.supportPickupSpawns.find(({ powerUpType }) => powerUpType === "rapid-fire");
  assert.equal(rapidSpawn.respawnRemaining, 6);
  model.updateSupportPickupRespawns(5.9);
  assert.equal(model.powerUps.some(({ powerUpType }) => powerUpType === "rapid-fire"), false);
  model.updateSupportPickupRespawns(0.11);
  assert.equal(model.powerUps.some(({ powerUpType }) => powerUpType === "rapid-fire"), true);

  for (const spawn of model.supportPickupSpawns) {
    spawn.respawnRemaining = 0;
    model.spawnSupportPickup(spawn);
  }
  const health = model.powerUps.find(({ powerUpType }) => powerUpType === "health");
  model.player.x = health.x;
  model.player.y = health.y;
  model.player.life = model.playerMaxLife;
  assert.equal(model.updateSupportPickupCollection([model.player]), false, "cura cheia não é desperdiçada");
  model.player.life -= 1;
  assert.equal(model.updateSupportPickupCollection([model.player]), true);
  assert.equal(model.player.life, model.playerMaxLife);
});

test("teclado, mouse esquerdo e gamepad convergem para a ação de ataque", async () => {
  const [inputSource, mainSource, gamepadSource] = await Promise.all([
    readFile(new URL("../src/input.js", import.meta.url), "utf8"),
    readFile(new URL("../src/main.js", import.meta.url), "utf8"),
    readFile(new URL("../src/gamepad.js", import.meta.url), "utf8")
  ]);
  assert.match(inputSource, /\["KeyJ", "attack"\]/);
  assert.match(mainSource, /event\.target !== canvas[\s\S]*?!isPrimaryMouseAttackPointer\(event\)[\s\S]*?input\.pulse\("attack"\)/);
  assert.match(gamepadSource, /addButtonAction\(held, gamepad, 2, "attack"\)/);
});
