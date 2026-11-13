import assert from "node:assert/strict";
import test from "node:test";
import { BALANCE } from "../src/config.js";
import { CoopGameModel } from "../src/coop.js";
import { CoopGamepadRouter, GamepadPreferencesStore } from "../src/gamepad.js";

const DT = 1 / 120;

function coop(random = () => 0) {
  const model = new CoopGameModel({ random });
  model.startCoopPreview();
  model.nextSpawnAt = Infinity;
  return model;
}

function step(model, frames, p1 = {}, p2 = {}) {
  for (let index = 0; index < frames; index += 1) {
    model.update(DT, { players: { 1: p1, 2: p2 } });
  }
}

function button(pressed = false) {
  return { pressed, value: pressed ? 1 : 0 };
}

function pad(index, { id = `Pad ${index}`, mapping = "standard", pressed = [], axes = [0, 0] } = {}) {
  return {
    index,
    id,
    mapping,
    buttons: Array.from({ length: 16 }, (_, buttonIndex) => button(pressed.includes(buttonIndex))),
    axes
  };
}

test("preview inicia Distrito normal com BoyPunk e Nilo em spawns distintos e sem power-up", () => {
  const model = coop();
  assert.equal(model.levelId, "district-neon");
  assert.equal(model.difficultyId, "normal");
  assert.equal(model.playerMaxLife, 4);
  assert.equal(model.altar.life, 4);
  assert.deepEqual(model.players.map(({ slot, characterId, life }) => ({ slot, characterId, life })), [
    { slot: 1, characterId: "boypunk", life: 4 },
    { slot: 2, characterId: "support", life: 4 }
  ]);
  assert.notEqual(model.players[0].id, model.players[1].id);
  assert.equal(model.players.some((left, index) => model.players.slice(index + 1).some((right) => (
    left.x < right.x + right.w && left.x + left.w > right.x
  ))), false);
  assert.equal(model.powerUpPickup, null);
  assert.equal(model.powerUpsAllowed(), false);
  assert.equal(model.progressionEligible, false);
  assert.equal(model.bonusQualificationEligible, false);
});

test("movimento, facing, salto e ataques são independentes e o mundo avança uma vez", () => {
  const model = coop();
  const [p1, p2] = model.players;
  const start1 = p1.x;
  const start2 = p2.x;
  step(model, 1, { right: true, jumpPressed: true, jumpHeld: true, attackPressed: true }, { left: true });
  step(model, 29, { right: true, jumpHeld: true }, { left: true });
  assert.ok(p1.x > start1);
  assert.ok(p2.x < start2);
  assert.equal(p1.facing, 1);
  assert.equal(p2.facing, -1);
  assert.ok(p1.y < 208);
  assert.equal(model.projectiles.filter((shot) => shot.sourceId === p1.id).length, 1);
  assert.equal(model.projectiles.filter((shot) => shot.sourceId === p2.id).length, 0);
  assert.ok(Math.abs(model.elapsed - 30 * DT) < 1e-12);
  assert.ok(Math.abs(model.spawnClock - 30 * DT) < 1e-12);
});

test("projéteis preservam owner e nunca colidem com o aliado", () => {
  const model = coop();
  const [p1, p2] = model.players;
  p1.x = 18;
  p2.x = 88;
  p1.facing = 1;
  step(model, 1, { attackPressed: true }, {});
  const shot = model.projectiles.find((candidate) => candidate.sourceId === p1.id);
  assert.ok(shot);
  step(model, 50);
  assert.equal(p2.life, 4);
  assert.equal(model.projectiles.some((candidate) => candidate.sourceId === p1.id && !candidate.removed), true);
});

test("âncoras de arma por personagem funcionam no contexto independente de P1 e P2", () => {
  const model = coop();
  const [p1, p2] = model.players;
  Object.assign(p1, { x: 80, y: 160, facing: 1, onGround: false });
  Object.assign(p2, { x: 260, y: 140, facing: -1, onGround: false });
  model.platforms = [];

  step(model, 1, { attackPressed: true }, { attackPressed: true });
  const p1Shot = model.projectiles.find((shot) => shot.sourceId === p1.id);
  const p2Shot = model.projectiles.find((shot) => shot.sourceId === p2.id);
  assert.deepEqual(p1Shot.spawnPosition, { x: 114, y: 172 });
  assert.deepEqual(p2Shot.spawnPosition, { x: 246, y: 148 });
  assert.equal(p1Shot.vx, BALANCE.player.shotSpeed);
  assert.equal(p2Shot.vx, -BALANCE.player.shotSpeed);
  assert.equal(p1.attackTimer > 0, true);
  assert.equal(p2.attackTimer > 0, true);
});

test("preview coop ignora estados residuais de power-up e mantém cooldown e ownership por jogador", () => {
  const model = coop();
  const [p1, p2] = model.players;
  for (const player of [p1, p2]) {
    player.rapidFire = true;
    player.rapidFireRemaining = 10;
    player.activePowerUp = { id: "double-burst", remaining: 10 };
  }

  step(model, 1, { attackPressed: true }, { attackPressed: true });

  assert.equal(model.powerUpsAllowed(), false);
  assert.equal(p1.attackCooldown, p1.character.attackCooldown);
  assert.equal(p2.attackCooldown, p2.character.attackCooldown);
  assert.equal(p1.pendingPlayerShots.length, 0);
  assert.equal(p2.pendingPlayerShots.length, 0);
  assert.equal(model.projectiles.filter((shot) => shot.sourceId === p1.id).length, 1);
  assert.equal(model.projectiles.filter((shot) => shot.sourceId === p2.id).length, 1);

  p1.pendingPlayerShots.push({ id: "stale-burst", remaining: 0.12 });
  p1.life = 0;
  model.handlePlayerDefeats();
  assert.equal(p1.pendingPlayerShots.length, 0, "a morte do owner cancela sua fila");
  assert.equal(p2.pendingPlayerShots.length, 0, "o outro owner permanece isolado");
});

test("projétil inimigo acerta somente o primeiro jogador válido na trajetória", () => {
  const model = coop();
  const [p1, p2] = model.players;
  p2.x = 100;
  p2.y = 208;
  p1.x = 330;
  p1.y = 208;
  model.projectiles.push({
    id: "enemy-test-shot",
    team: "enemy",
    x: 60,
    y: 220,
    spawnPosition: { x: 60, y: 220 },
    w: 8,
    h: 8,
    vx: 330,
    vy: 0,
    life: 2,
    age: 0,
    sourceId: "enemy-test",
    removed: false
  });
  step(model, 20);
  assert.equal(p2.life, 3);
  assert.equal(p1.life, 4);
  assert.equal(model.projectiles.some((shot) => shot.id === "enemy-test-shot"), false);
});

test("atiradores escolhem jogador vivo determinístico e mantêm mira travada", () => {
  const model = coop();
  const [p1, p2] = model.players;
  p1.x = 30;
  p2.x = 300;
  const enemy = model.spawnShooter() ?? model.enemies.at(-1);
  assert.equal(enemy.targetPlayerId, p1.id);
  const locked = { x: enemy.aimX, y: enemy.aimY };
  p1.x = 180;
  model.updateShooter(enemy, DT);
  assert.deepEqual({ x: enemy.aimX, y: enemy.aimY }, locked);

  p1.life = 0;
  model.handlePlayerDefeats();
  enemy.phase = "recovery";
  enemy.phaseTime = 0;
  enemy.shots = 0;
  model.updateShooter(enemy, DT);
  assert.equal(enemy.targetPlayerId, p2.id);
});

test("uma alma é coletada uma vez e depósitos simultâneos respeitam capacidade compartilhada", () => {
  const model = coop();
  const [p1, p2] = model.players;
  const soul = model.souls[0];
  p1.x = soul.x;
  p1.y = soul.y;
  p2.x = soul.x;
  p2.y = soul.y;
  model.updateCoopSouls({ 1: {}, 2: {} });
  assert.equal(p1.carriedSouls + p2.carriedSouls, 1);
  assert.equal(soul.removed, true);

  p1.carriedSouls = 2;
  p2.carriedSouls = 3;
  model.altar.deposited = 13;
  for (const player of model.players) {
    player.x = model.altar.x;
    player.y = model.altar.y;
  }
  model.updateCoopSouls({ 1: { interactPressed: true }, 2: { interactPressed: true } });
  assert.equal(model.altar.deposited, 15);
  assert.equal(p1.carriedSouls + p2.carriedSouls, 3);
});

test("derrota individual mantém a sessão e devolve almas em posição alcançável", () => {
  const model = coop();
  const [p1, p2] = model.players;
  p1.carriedSouls = 3;
  p1.life = 0;
  model.handlePlayerDefeats();
  assert.equal(p1.inactive, true);
  assert.equal(p1.carriedSouls, 0);
  assert.equal(model.souls.filter((soul) => soul.source === "coop-defeat-drop").length, 3);
  assert.equal(model.resolveTerminalOutcome(), false);
  const before = p2.x;
  step(model, 10, { right: true }, { right: true });
  assert.equal(p1.x, p1.lastSafePosition.x);
  assert.ok(p2.x > before);
});

test("derrota da equipe, derrota do altar e vitória são únicas; perda vence empate terminal", () => {
  const bothDead = coop();
  bothDead.players.forEach((player) => { player.life = 0; });
  bothDead.handlePlayerDefeats();
  assert.equal(bothDead.resolveTerminalOutcome(), true);
  assert.equal(bothDead.coopResult.outcome, "defeat");
  assert.equal(bothDead.consumeEvents().filter((event) => event.type === "coopDefeat").length, 1);
  bothDead.resolveTerminalOutcome();
  assert.equal(bothDead.consumeEvents().filter((event) => event.type === "coopDefeat").length, 0);

  const altar = coop();
  altar.altar.life = 0;
  altar.altar.deposited = altar.objective.soulsGoal;
  altar.resolveTerminalOutcome();
  assert.equal(altar.coopResult.outcome, "defeat");
  assert.equal(altar.coopResult.reason, "Altar destruído");

  const victory = coop();
  victory.altar.deposited = victory.objective.soulsGoal;
  victory.resolveTerminalOutcome();
  assert.equal(victory.coopResult.outcome, "victory");
  assert.equal(victory.progressionEligible, false);
  assert.equal(victory.bonusQualificationEligible, false);
});

test("cura de Nilo é isolada, não cura aliado e mortos não ativam", () => {
  const model = coop();
  const [p1, p2] = model.players;
  p1.life = 2;
  p2.life = 2;
  p2.ability.rechargeRemaining = 0;
  p2.ability.ready = true;
  assert.equal(model.tryActivateCoopAbility(p2), true);
  assert.equal(p2.life, 3);
  assert.equal(p1.life, 2);
  p2.life = 0;
  model.handlePlayerDefeats();
  assert.equal(model.tryActivateCoopAbility(p2), false);
});

test("pausa congela simulação e retry limpa estado temporário sem trocar IDs de slot", () => {
  const model = coop();
  const firstIds = model.players.map((player) => player.id);
  step(model, 10);
  model.pause();
  const elapsed = model.elapsed;
  step(model, 30, { right: true }, { left: true });
  assert.equal(model.elapsed, elapsed);
  model.resume();
  model.players[1].life = 1;
  model.projectiles.push({ id: "stale", team: "enemy", sourceId: "old" });
  model.startCoopPreview();
  assert.equal(model.players.every((player) => player.life === 4 && !player.inactive), true);
  assert.equal(model.projectiles.length, 0);
  assert.notDeepEqual(model.players.map((player) => player.id), firstIds);
});

test("roteador atribui por botão, ignora drift, mantém exclusividade e trata reuso de índice", () => {
  let pads = [pad(0, { axes: [0.9, 0] }), pad(1)];
  const navigatorRef = { getGamepads: () => pads };
  const preferences = new GamepadPreferencesStore(null);
  const router = new CoopGamepadRouter({ navigatorRef, preferences });
  router.setLayout("two-gamepads");
  router.poll();
  assert.equal(router.ready(), false);

  pads = [pad(0, { pressed: [0] }), pad(1)];
  router.poll();
  assert.equal(router.status().assignments[1].index, 0);
  assert.equal(router.status().assignments[2], undefined);
  pads = [pad(0), pad(1)];
  router.poll();
  pads = [pad(0), pad(1, { pressed: [2] })];
  router.poll();
  assert.equal(router.ready(), true);
  assert.notEqual(router.status().assignments[1].runtimeId, router.status().assignments[2].runtimeId);

  pads = [null, pad(1)];
  router.poll();
  const disconnected = router.drainEvents().find((event) => event.type === "disconnected" && event.assignedSlot === 1);
  assert.ok(disconnected);
  assert.equal(router.ready(), false);
  pads = [pad(0, { id: "Replacement" }), pad(1)];
  router.poll();
  pads = [pad(0, { id: "Replacement", pressed: [0] }), pad(1)];
  router.poll();
  assert.equal(router.status().assignments[1].id, "Replacement");
});

test("roteador mantém ações simultâneas por slot e limpa held ao desconectar", () => {
  let pads = [pad(0), pad(1)];
  const router = new CoopGamepadRouter({
    navigatorRef: { getGamepads: () => pads },
    preferences: new GamepadPreferencesStore(null)
  });
  router.setLayout("two-gamepads");
  router.poll();
  pads = [pad(0, { pressed: [0] }), pad(1)];
  router.poll();
  pads = [pad(0), pad(1)];
  router.poll();
  pads = [pad(0), pad(1, { pressed: [0] })];
  router.poll();
  pads = [pad(0), pad(1)];
  router.poll();
  router.poll();

  pads = [pad(0, { pressed: [2], axes: [0.8, 0] }), pad(1, { pressed: [0], axes: [-0.8, 0] })];
  router.poll();
  assert.equal(router.snapshot(1).held.has("right"), true);
  assert.equal(router.snapshot(1).pressed.has("attack"), true);
  assert.equal(router.snapshot(2).held.has("left"), true);
  assert.equal(router.snapshot(2).pressed.has("jump"), true);

  pads = [pad(0, { pressed: [2], axes: [0.8, 0] }), null];
  router.poll();
  assert.equal(router.snapshot(2).held.size, 0);
  assert.equal(router.snapshot(1).held.has("right"), true);
});

test("controle genérico atribuído só fica pronto com perfil salvo completo", () => {
  let pads = [pad(0, { mapping: "" })];
  const router = new CoopGamepadRouter({
    navigatorRef: { getGamepads: () => pads },
    preferences: new GamepadPreferencesStore(null)
  });
  router.poll();
  pads = [pad(0, { mapping: "", pressed: [0] })];
  router.poll();
  assert.equal(router.status().assignments[2].profileConfigured, false);
  assert.equal(router.ready(), false);
});
