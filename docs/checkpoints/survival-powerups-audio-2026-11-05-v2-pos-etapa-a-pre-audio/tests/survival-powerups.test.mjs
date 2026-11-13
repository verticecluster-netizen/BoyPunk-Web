import assert from "node:assert/strict";
import test from "node:test";
import { BALANCE } from "../src/config.js";
import { GameModel } from "../src/core.js";
import { CoopGameModel } from "../src/coop.js";

function solo(characterId = "boypunk") {
  const model = new GameModel({ random: () => 0 });
  model.startSurvival({ characterId });
  model.enemies = [];
  return model;
}

function coop() {
  const model = new CoopGameModel({ random: () => 0 });
  model.startCoopSurvival();
  model.enemies = [];
  return model;
}

function pickup(model, type) {
  return model.powerUps.find((item) => item.powerUpType === type);
}

function overlapCenters(player, item) {
  player.x = item.x + (item.w - player.w) / 2;
  player.y = item.y + (item.h - player.h) / 2;
}

test("Sobrevivência solo honra BoyPunk/Nilo e inicia um pickup por spawn estável", () => {
  for (const characterId of ["boypunk", "support"]) {
    const model = solo(characterId);
    assert.equal(model.characterId, characterId);
    assert.equal(Boolean(model.ability), characterId === "support");
    assert.deepEqual(model.powerUps.map((item) => item.powerUpType).sort(), [
      "double-burst", "health", "rapid-fire", "shield"
    ]);
    assert.equal(new Set(model.powerUps.map((item) => item.spawnId)).size, 4);
    assert.equal(model.supportPickupSpawns.every((spawn) => spawn.activeEntityId), true);
  }
});

test("cura cheia e escudo já carregado não são consumidos", () => {
  const model = solo();
  const health = pickup(model, "health");
  overlapCenters(model.player, health);
  assert.equal(model.updateSupportPickupCollection([model.player]), false);
  assert.equal(model.powerUps.includes(health), true);

  const shield = pickup(model, "shield");
  model.player.shield = true;
  overlapCenters(model.player, shield);
  assert.equal(model.updateSupportPickupCollection([model.player]), false);
  assert.equal(model.powerUps.includes(shield), true);

  model.player.life = 3;
  overlapCenters(model.player, health);
  assert.equal(model.updateSupportPickupCollection([model.player]), true);
  assert.equal(model.player.life, 4);
});

test("respawn usa tempo de simulação, pausa congela e não duplica entidades", () => {
  const model = solo();
  const rapid = pickup(model, "rapid-fire");
  overlapCenters(model.player, rapid);
  assert.equal(model.updateSupportPickupCollection([model.player]), true);
  const spawn = model.supportPickupSpawns.find((item) => item.powerUpType === "rapid-fire");
  assert.equal(spawn.respawnRemaining, BALANCE.survival.supportPickupRespawnSeconds["rapid-fire"]);
  assert.equal(model.powerUps.filter((item) => item.spawnId === spawn.spawnId).length, 0);

  model.pause();
  const frozen = spawn.respawnRemaining;
  model.update(0.05, {});
  assert.equal(spawn.respawnRemaining, frozen);
  model.resume();
  model.updateSupportPickupRespawns(frozen - 0.01);
  assert.equal(model.powerUps.filter((item) => item.spawnId === spawn.spawnId).length, 0);
  model.updateSupportPickupRespawns(0.02);
  assert.equal(model.powerUps.filter((item) => item.spawnId === spawn.spawnId).length, 1);
  for (let cycle = 0; cycle < 5; cycle += 1) model.updateSupportPickupRespawns(99);
  assert.equal(model.powerUps.filter((item) => item.spawnId === spawn.spawnId).length, 1);
});

test("retry recria estado inicial e Rapid Fire combina com Rajada Dupla", () => {
  const model = solo();
  for (const type of ["rapid-fire", "double-burst"]) {
    const item = pickup(model, type);
    overlapCenters(model.player, item);
    assert.equal(model.updateSupportPickupCollection([model.player]), true);
  }
  assert.equal(model.player.rapidFire, true);
  assert.equal(model.activePowerUp.id, "double-burst");
  model.playerAttack();
  assert.equal(model.player.attackCooldown, model.character.attackCooldown * 0.5);
  assert.equal(model.pendingPlayerShots.length, 1);

  model.startSurvival({ characterId: "boypunk" });
  assert.equal(model.player.rapidFire, false);
  assert.equal(model.activePowerUp, null);
  assert.equal(model.pendingPlayerShots.length, 0);
  assert.equal(model.powerUps.length, 4);
  assert.equal(model.supportPickupSpawns.every((spawn) => spawn.respawnRemaining === 0), true);
});

test("coop mantém efeitos por jogador e coleta simultânea alterna desempate estável", () => {
  const model = coop();
  const [p1, p2] = model.players;
  const rapid = pickup(model, "rapid-fire");
  overlapCenters(p1, rapid);
  overlapCenters(p2, rapid);
  assert.equal(model.updateSupportPickupCollection([p1, p2]), true);
  assert.equal(p1.rapidFire, true);
  assert.equal(p2.rapidFire, false);

  const spawn = model.supportPickupSpawns.find((item) => item.powerUpType === "rapid-fire");
  spawn.respawnRemaining = 0;
  model.spawnSurvivalSupportPickup(spawn);
  const secondRapid = pickup(model, "rapid-fire");
  overlapCenters(p1, secondRapid);
  overlapCenters(p2, secondRapid);
  assert.equal(model.updateSupportPickupCollection([p1, p2]), true);
  assert.equal(p2.rapidFire, true, "o empate seguinte prefere o outro slot");

  const burst = pickup(model, "double-burst");
  overlapCenters(p2, burst);
  p1.x = 18;
  p1.y = 208;
  assert.equal(model.updateSupportPickupCollection([p1, p2]), true);
  assert.equal(p2.activePowerUp.id, "double-burst");
  assert.equal(p1.activePowerUp, null);
});

test("coop preserva pickup sem beneficiário e termina somente após ambos caírem", () => {
  const model = coop();
  const [p1, p2] = model.players;
  const health = pickup(model, "health");
  overlapCenters(p1, health);
  overlapCenters(p2, health);
  assert.equal(model.updateSupportPickupCollection([p1, p2]), false);
  assert.equal(model.powerUps.includes(health), true);

  p1.life = 0;
  model.handlePlayerDefeats();
  assert.equal(model.resolveTerminalOutcome(), false);
  p2.life = 0;
  model.handlePlayerDefeats();
  assert.equal(model.resolveTerminalOutcome(), true);
  assert.equal(model.state, "survivalDefeat");
  assert.equal(model.supportPickupSpawns.length, 0);
});
