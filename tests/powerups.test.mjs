import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { BALANCE, POWER_UPS } from "../src/config.js";
import { GameModel, overlaps } from "../src/core.js";
import { getLevelDefinition } from "../src/level-data.js";
import { Renderer } from "../src/renderer.js";
import { setLocale, t } from "../src/i18n.js";

const DT = 1 / 120;
const DOUBLE_BURST = POWER_UPS["double-burst"];

function campaign(levelId = BALANCE.levels.currentId, options = {}) {
  const model = new GameModel({ random: () => 0, ...options });
  model.startRun({ levelId });
  model.nextSpawnAt = Infinity;
  model.enemies = [];
  model.souls = [];
  model.presses = [];
  return model;
}

function campaignCharacter(characterId) {
  const model = new GameModel({ random: () => 0 });
  model.startRun({ levelId: BALANCE.levels.currentId, characterId });
  model.nextSpawnAt = Infinity;
  model.enemies = [];
  model.souls = [];
  model.presses = [];
  return model;
}

function step(model, seconds, input = {}) {
  for (let elapsed = 0; elapsed < seconds; elapsed += DT) model.update(DT, input);
}

function enemyAt(x, id) {
  return {
    id,
    kind: "chaser",
    x,
    y: 208,
    w: 16,
    h: 32,
    vx: 0,
    vy: 0,
    facing: -1,
    onGround: true,
    attackCooldown: 99,
    altarAttackCooldown: 99,
    maxHp: BALANCE.encounter.chaserMaxHp,
    hp: BALANCE.encounter.chaserMaxHp,
    hurtFlash: 0,
    removed: false
  };
}

test("registro autoritativo mantém duração, rajada e atraso compatível com a cadência existente", () => {
  assert.deepEqual(DOUBLE_BURST, {
    id: "double-burst",
    publicName: "Rajada Dupla",
    nameKey: "powerup.doubleBurst.name",
    durationSeconds: 10,
    projectilesPerAttack: 2,
    interShotDelaySeconds: 0.12,
    pickupLifetimeSeconds: 12,
    pickupWidth: 16,
    pickupHeight: 16,
    unlockRecoveredSouls: 4
  });
  assert.ok(DOUBLE_BURST.interShotDelaySeconds > 0);
  assert.ok(DOUBLE_BURST.interShotDelaySeconds < BALANCE.player.attackCooldown);
  assert.equal(BALANCE.player.maxProjectiles, 8);
});

test("campanha não consome Cura cheia nem Escudo já carregado", () => {
  const model = campaign();
  const health = model.powerUps.find((item) => item.powerUpType === "health");
  model.player.x = health.x;
  model.player.y = health.y;
  assert.equal(model.updateFloatingPowerUpCollection(), false);
  assert.equal(model.powerUps.includes(health), true);

  model.player.life -= 1;
  assert.equal(model.updateFloatingPowerUpCollection(), true);
  assert.equal(model.player.life, model.playerMaxLife);
  assert.equal(model.powerUps.includes(health), false);

  const shield = model.powerUps.find((item) => item.powerUpType === "shield");
  model.player.shield = true;
  model.player.x = shield.x;
  model.player.y = shield.y;
  assert.equal(model.updateFloatingPowerUpCollection(), false);
  assert.equal(model.powerUps.includes(shield), true);
});

test("eventos de coleta carregam tipo e identidade válidos do coletor", () => {
  const model = campaign();
  const rapid = model.powerUps.find((item) => item.powerUpType === "rapid-fire");
  model.player.x = rapid.x;
  model.player.y = rapid.y;
  assert.equal(model.updateFloatingPowerUpCollection(), true);
  const event = model.consumeEvents().find((entry) => entry.type === "powerUpCollected");
  assert.equal(event.id, "rapid-fire");
  assert.equal(event.playerId, model.player.id);

  model.activatePowerUp("double-burst");
  const burstEvent = model.consumeEvents().find((entry) => entry.type === "powerUpCollected");
  assert.equal(burstEvent.id, "double-burst");
  assert.equal(burstEvent.playerId, model.player.id);
});

test("ataque normal continua um único tiro e a cadência ignora comandos duplicados", () => {
  const model = campaign();
  model.update(DT, { attackPressed: true });
  assert.equal(model.projectiles.filter((shot) => shot.team === "player").length, 1);
  assert.equal(model.pendingPlayerShots.length, 0);
  model.update(DT, { attackPressed: true });
  assert.equal(model.projectiles.filter((shot) => shot.team === "player").length, 1);
  assert.ok(model.player.attackCooldown > BALANCE.player.attackCooldown - DT * 3);
});

test("Rapid Fire isolado reduz cooldown sem enfileirar o segundo tiro de Double Burst", () => {
  const model = campaign();
  model.player.rapidFire = true;
  model.player.rapidFireRemaining = 10;

  model.playerAttack();

  assert.equal(model.player.attackCooldown, BALANCE.player.attackCooldown * 0.5);
  assert.equal(model.projectiles.length, 1);
  assert.equal(model.pendingPlayerShots.length, 0);
  assert.equal(model.events.some((event) => event.type === "doubleBurstAccepted"), false);
});

test("matriz de aceitação separa cooldown Rapid Fire da fila Double Burst para BoyPunk e Nilo", () => {
  const cases = [
    { label: "nenhum", rapid: false, burst: false, cooldownFactor: 1, projectiles: 1 },
    { label: "Rapid Fire", rapid: true, burst: false, cooldownFactor: 0.5, projectiles: 1 },
    { label: "Double Burst", rapid: false, burst: true, cooldownFactor: 1, projectiles: 2 },
    { label: "ambos", rapid: true, burst: true, cooldownFactor: 0.5, projectiles: 2 }
  ];

  for (const characterId of ["boypunk", "support"]) {
    for (const scenario of cases) {
      const model = campaignCharacter(characterId);
      if (scenario.rapid) {
        model.player.rapidFire = true;
        model.player.rapidFireRemaining = 10;
      }
      if (scenario.burst) model.activatePowerUp(DOUBLE_BURST.id);

      model.playerAttack();
      const expectedCooldown = model.character.attackCooldown * scenario.cooldownFactor;
      assert.equal(model.player.attackCooldown, expectedCooldown, `${characterId}/${scenario.label}: cooldown`);
      assert.equal(model.projectiles.length, 1, `${characterId}/${scenario.label}: primeiro tiro imediato`);
      assert.equal(model.pendingPlayerShots.length, scenario.projectiles - 1, `${characterId}/${scenario.label}: fila`);
      assert.equal(model.events.some((event) => event.type === "doubleBurstAccepted"), scenario.burst,
        `${characterId}/${scenario.label}: evento de burst`);

      model.elapsed += DT;
      model.updatePendingPlayerShots(DOUBLE_BURST.interShotDelaySeconds);
      assert.equal(model.projectiles.length, scenario.projectiles, `${characterId}/${scenario.label}: total emitido`);
      assert.equal(model.pendingPlayerShots.length, 0, `${characterId}/${scenario.label}: fila consumida`);
      assert.equal(model.projectiles.every((shot) => shot.sourceId === model.player.id), true,
        `${characterId}/${scenario.label}: ownership`);
      assert.deepEqual(model.projectiles.map((shot) => shot.burstIndex),
        scenario.burst ? [1, 2] : [1], `${characterId}/${scenario.label}: índices`);
      assert.equal(model.projectiles.every((shot) => Math.abs(shot.vx) === BALANCE.player.shotSpeed), true,
        `${characterId}/${scenario.label}: velocidade preservada`);
      assert.equal(model.projectiles.every((shot) => shot.life === 1.25), true,
        `${characterId}/${scenario.label}: lifetime preservado`);
    }
  }
});

test("um ataque energizado gera exatamente dois tiros no atraso correto sem reiniciar cooldown", () => {
  const model = campaign();
  assert.equal(model.activatePowerUp(DOUBLE_BURST.id), true);
  model.update(DT, { attackPressed: true });
  assert.equal(model.projectiles.length, 1);
  assert.equal(model.pendingPlayerShots.length, 1);
  const cooldownAfterAcceptance = model.player.attackCooldown;

  step(model, DOUBLE_BURST.interShotDelaySeconds - DT * 2, {});
  assert.equal(model.projectiles.length, 1, "o segundo tiro não antecipa a janela de 120 ms");
  step(model, DT * 2, {});
  assert.equal(model.projectiles.length, 2);
  assert.equal(model.pendingPlayerShots.length, 0);
  assert.ok(model.player.attackCooldown < cooldownAfterAcceptance, "o segundo tiro não reinicia a cadência");
  assert.equal(model.consumeEvents().filter((event) => event.type === "doubleBurstAccepted").length, 1);
  step(model, 0.4, {});
  assert.equal(model.projectiles.length, 2, "uma aceitação não cria tiros adicionais");
});

test("direção é travada na aceitação e a segunda origem acompanha a posição atual da arma", () => {
  const model = campaign();
  model.player.x = 80;
  model.player.facing = 1;
  model.activatePowerUp(DOUBLE_BURST.id);
  model.playerAttack();
  const first = model.projectiles[0];
  assert.equal(first.vx, BALANCE.player.shotSpeed);

  model.player.x = 112;
  model.player.facing = -1;
  model.elapsed += DT;
  model.updatePendingPlayerShots(DOUBLE_BURST.interShotDelaySeconds);
  const shots = model.projectiles.filter((shot) => shot.team === "player");
  assert.equal(shots.length, 2);
  const second = shots[1];
  assert.equal(model.player.facing, -1, "o jogador virou entre os tiros");
  assert.equal(second.vx, BALANCE.player.shotSpeed, "a rajada preserva a direção aceita");
  assert.notEqual(second.spawnPosition.x, first.spawnPosition.x, "a origem acompanha o deslocamento do jogador");
  assert.equal(second.spawnPosition.x, model.player.x + 34);
});

test("os dois projéteis mantêm colisão e dano independentes no Chaser", () => {
  const model = campaign();
  model.player.x = 18;
  model.activatePowerUp(DOUBLE_BURST.id);
  model.playerAttack();
  model.elapsed += DT;
  model.updatePendingPlayerShots(DOUBLE_BURST.interShotDelaySeconds);
  assert.equal(model.projectiles.every((shot) => shot.sourceId === model.player.id), true);
  assert.deepEqual(model.projectiles.map((shot) => shot.burstIndex), [1, 2]);
  model.enemies = [enemyAt(120, "near"), enemyAt(150, "far")];
  model.updateProjectiles(0.3);
  assert.equal(model.enemies[0].hp, 1, "duas balas distintas causam dois danos no primeiro alvo");
  assert.equal(model.enemies[0].removed, false);
  assert.equal(model.enemies[1].hp, 3, "o segundo alvo não é atravessado enquanto o primeiro vive");
  assert.equal(model.kills, 0);
  assert.equal(model.souls.length, 0);
  assert.equal(model.events.filter((event) => event.type === "projectileHit").length, 2);
});

test("expiração e recoleta atualizam dez segundos sem empilhar efeitos", () => {
  const model = campaign();
  model.activatePowerUp(DOUBLE_BURST.id);
  model.updatePowerUpClocks(3.25);
  assert.equal(model.activePowerUp.remaining, 6.75);
  model.activatePowerUp(DOUBLE_BURST.id);
  assert.deepEqual(model.activePowerUp, { id: DOUBLE_BURST.id, remaining: 10 });
  assert.equal(model.events.filter((event) => event.type === "powerUpCollected").at(-1).refreshed, true);
  model.updatePowerUpClocks(10);
  assert.equal(model.activePowerUp, null);
  assert.equal(model.events.filter((event) => event.type === "powerUpExpired").length, 1);
});

test("Rapid Fire e Double Burst expiram de forma independente", () => {
  const rapidFirst = campaign();
  rapidFirst.activatePowerUp(DOUBLE_BURST.id);
  rapidFirst.activePowerUp.remaining = 3;
  rapidFirst.player.rapidFire = true;
  rapidFirst.player.rapidFireRemaining = 1;
  rapidFirst.updatePowerUpClocks(1);
  assert.equal(rapidFirst.player.rapidFire, false);
  assert.equal(rapidFirst.player.rapidFireRemaining, 0);
  assert.deepEqual(rapidFirst.activePowerUp, { id: DOUBLE_BURST.id, remaining: 2 });

  const burstFirst = campaign();
  burstFirst.activatePowerUp(DOUBLE_BURST.id);
  burstFirst.activePowerUp.remaining = 1;
  burstFirst.player.rapidFire = true;
  burstFirst.player.rapidFireRemaining = 3;
  burstFirst.updatePowerUpClocks(1);
  assert.equal(burstFirst.activePowerUp, null);
  assert.equal(burstFirst.player.rapidFire, true);
  assert.equal(burstFirst.player.rapidFireRemaining, 2);

  assert.deepEqual(rapidFirst.events.filter(({ type }) => type === "powerUpExpired").map(({ id }) => id), ["rapid-fire"]);
  assert.deepEqual(burstFirst.events.filter(({ type }) => type === "powerUpExpired").map(({ id }) => id), ["double-burst"]);
});

test("cada campanha gera uma única coleta alcançável após quatro almas recuperadas", () => {
  for (const levelId of [BALANCE.levels.currentId, BALANCE.levels.nextId]) {
    const model = campaign(levelId);
    model.carriedSouls = DOUBLE_BURST.unlockRecoveredSouls - 1;
    model.update(DT, {});
    assert.equal(model.powerUpPickup, null, `${levelId}: janela introdutória preservada`);
    model.carriedSouls += 1;
    model.update(DT, {});
    const pickup = model.powerUpPickup;
    assert.ok(pickup, `${levelId}: pickup garantido`);
    assert.equal(model.isValidPowerUpSpawn(pickup), true);
    assert.equal(model.level.platforms.some((platform) => (
      Math.abs(platform.y - (pickup.y + pickup.h)) < 0.001
      && pickup.x + 2 >= platform.x
      && pickup.x + pickup.w - 2 <= platform.x + platform.w
    )), true, `${levelId}: apoio integral`);
    assert.equal(overlaps(pickup, model.altar), false);

    if (levelId === BALANCE.levels.currentId) {
      step(model, 0.3, { right: true });
      model.update(DT, { right: true, jumpPressed: true, jumpHeld: true });
      step(model, 0.14, { right: true, jumpHeld: true });
      model.update(DT, { right: true, jumpPressed: true, jumpHeld: true });
      step(model, 0.8, { right: true, jumpHeld: true });
    } else {
      step(model, 1.75, { right: true });
      model.update(DT, { right: true, jumpPressed: true, jumpHeld: true });
      step(model, 0.6, { right: true, jumpHeld: true });
    }
    assert.equal(model.powerUpPickup, null, `${levelId}: coletado por movimento e salto normais`);
    assert.equal(model.activePowerUp?.id, DOUBLE_BURST.id);
    assert.equal(model.events.filter((event) => event.type === "powerUpSpawned").length, 1);
  }
});

test("pickup expira em tempo ativo e nunca abre ciclo de reposição", () => {
  const model = campaign();
  model.carriedSouls = DOUBLE_BURST.unlockRecoveredSouls;
  model.update(DT, {});
  assert.ok(model.powerUpPickup);
  model.pause();
  step(model, 2, {});
  assert.ok(model.powerUpPickup.remaining > 11.9, "pausa congela a expiração");
  model.resume();
  step(model, DOUBLE_BURST.pickupLifetimeSeconds + DT, {});
  assert.equal(model.powerUpPickup, null);
  assert.equal(model.powerUpSpawnResolved, true);
  step(model, 1, {});
  assert.equal(model.events.filter((event) => event.type === "powerUpSpawned").length, 1);
});

test("cap descarta o segundo tiro uma vez, sem disparo diferido", () => {
  const model = campaign();
  model.projectiles = Array.from({ length: BALANCE.player.maxProjectiles - 1 }, (_, index) => ({
    id: `cap-${index}`,
    team: "player",
    removed: false
  }));
  model.activatePowerUp(DOUBLE_BURST.id);
  model.player.rapidFire = true;
  model.player.rapidFireRemaining = 10;
  model.playerAttack();
  assert.equal(model.player.attackCooldown, BALANCE.player.attackCooldown * 0.5);
  assert.equal(model.projectiles.length, BALANCE.player.maxProjectiles);
  model.elapsed += DT;
  model.updatePendingPlayerShots(DOUBLE_BURST.interShotDelaySeconds);
  assert.equal(model.pendingPlayerShots.length, 0);
  assert.equal(model.events.filter((event) => event.type === "burstShotDropped").length, 1);
  model.projectiles = [];
  model.updatePendingPlayerShots(1);
  assert.equal(model.projectiles.length, 0, "liberar o cap não reemite o tiro descartado");
});

test("pausa congela ambos os efeitos e rajada; ataque aceito antes da expiração pode terminar depois", () => {
  const model = campaign();
  model.activatePowerUp(DOUBLE_BURST.id);
  model.activePowerUp.remaining = 0.05;
  model.player.rapidFire = true;
  model.player.rapidFireRemaining = 4;
  model.playerAttack();
  const pendingBefore = model.pendingPlayerShots[0].remaining;
  model.pause();
  step(model, 1, {});
  assert.equal(model.activePowerUp.remaining, 0.05);
  assert.equal(model.player.rapidFireRemaining, 4);
  assert.equal(model.pendingPlayerShots[0].remaining, pendingBefore);
  model.resume();
  step(model, DOUBLE_BURST.interShotDelaySeconds + DT, {});
  assert.equal(model.activePowerUp, null);
  assert.ok(model.player.rapidFireRemaining < 4);
  assert.equal(model.player.rapidFire, true);
  assert.equal(model.projectiles.length, 2, "a rajada já aceita termina após o efeito");

  const mainSource = fs.readFileSync(new URL("../src/main.js", import.meta.url), "utf8");
  assert.match(mainSource, /if \(!pageVisible\) \{[\s\S]*?requestAnimationFrame\(loop\);[\s\S]*?return;/,
    "página oculta não avança o update fixo nem seus relógios ativos");
});

test("segundo tiro já aceito atravessa exatamente a fronteira de expiração do Double Burst", () => {
  const model = campaign();
  model.activatePowerUp(DOUBLE_BURST.id);
  model.activePowerUp.remaining = 0.01;
  model.playerAttack();
  assert.equal(model.pendingPlayerShots.length, 1);

  model.updatePowerUpClocks(0.01);
  assert.equal(model.activePowerUp, null);
  model.elapsed += DT;
  model.updatePendingPlayerShots(DOUBLE_BURST.interShotDelaySeconds);

  assert.equal(model.projectiles.length, 2);
  assert.equal(model.pendingPlayerShots.length, 0);
  assert.deepEqual(model.projectiles.map((shot) => shot.burstIndex), [1, 2]);
});

test("morte, vitória, menu, reinício e troca de cena limpam efeito e tiros pendentes", () => {
  const cases = [
    ["morte", (model) => { model.player.life = 0; model.resolveTerminalOutcome(); }],
    ["vitória", (model) => { model.altar.deposited = model.objective.soulsGoal; model.resolveTerminalOutcome(); }],
    ["menu", (model) => model.goToMenu()],
    ["reinício", (model) => model.startRun()],
    ["sobrevivência", (model) => model.startSurvival()]
  ];
  for (const [label, transition] of cases) {
    const model = campaign();
    model.activatePowerUp(DOUBLE_BURST.id);
    model.player.rapidFire = true;
    model.player.rapidFireRemaining = 7;
    model.player.shield = true;
    model.playerAttack();
    const previousPickupIds = new Set(model.powerUps.map(({ id }) => id));
    transition(model);
    assert.equal(model.activePowerUp, null, `${label}: efeito`);
    assert.equal(model.powerUpPickup, null, `${label}: pickup`);
    assert.equal(model.pendingPlayerShots.length, 0, `${label}: rajada pendente`);
    assert.equal(Boolean(model.player?.rapidFire), false, `${label}: Rapid Fire`);
    assert.equal(model.player?.rapidFireRemaining ?? 0, 0, `${label}: relógio Rapid Fire`);
    assert.equal(Boolean(model.player?.shield), false, `${label}: Shield`);
    assert.equal(model.powerUps.some(({ id }) => previousPickupIds.has(id)), false, `${label}: pickups da cena anterior`);
    assert.equal(model.effects.some((e) => e.kind === "powerUpCollect"), false, `${label}: efeito visual temporário`);
  }

  const bonus = campaign();
  bonus.activatePowerUp(DOUBLE_BURST.id);
  bonus.playerAttack();
  assert.equal(bonus.startBonusPreview(), true);
  assert.equal(bonus.activePowerUp, null);
  assert.equal(bonus.pendingPlayerShots.length, 0);
  assert.equal(bonus.effects.some((e) => e.kind === "powerUpCollect"), false);
});

test("cinco reinícios consecutivos não retêm efeitos nem tiros aceitos", () => {
  const model = campaign();
  for (let cycle = 0; cycle < 5; cycle += 1) {
    model.activatePowerUp(DOUBLE_BURST.id);
    model.player.rapidFire = true;
    model.player.rapidFireRemaining = 10;
    model.playerAttack();
    assert.equal(model.pendingPlayerShots.length, 1);

    model.startRun({ characterId: cycle % 2 ? "support" : "boypunk" });
    model.nextSpawnAt = Infinity;
    assert.equal(model.activePowerUp, null);
    assert.equal(Boolean(model.player.rapidFire), false);
    assert.equal(model.player.rapidFireRemaining ?? 0, 0);
    assert.equal(model.pendingPlayerShots.length, 0);
    assert.equal(model.projectiles.length, 0);
  }
});

test("demo e preview do atirador excluem efeito; sobrevivência e bônus o habilitam", () => {
  const demo = new GameModel({ random: () => 0 });
  demo.startRun({ demo: true });
  demo.carriedSouls = 12;
  demo.update(DT, {});
  assert.equal(demo.powerUpPickup, null);
  assert.equal(demo.activatePowerUp(DOUBLE_BURST.id), false);

  const survival = new GameModel({ random: () => 0 });
  survival.startSurvival();
  assert.equal(survival.activatePowerUp(DOUBLE_BURST.id), true);
  assert.equal(survival.powerUps.length, 4);

  const preview = new GameModel({ random: () => 0 });
  preview.startPatrolShooterPreview();
  preview.carriedSouls = 12;
  preview.update(DT, {});
  assert.equal(preview.powerUpPickup, null);
  assert.equal(preview.activatePowerUp(DOUBLE_BURST.id), false);

  const bonus = new GameModel({ random: () => 0 });
  bonus.startRun();
  assert.equal(bonus.startBonusPreview(), true);
  assert.equal(bonus.level.powerUpSpawns.length, 0);
  assert.deepEqual(bonus.supportPickupSpawns.map(({ powerUpType }) => powerUpType).sort(), [
    "double-burst", "health", "rapid-fire", "shield"
  ]);
  assert.equal(bonus.activatePowerUp(DOUBLE_BURST.id), true);
});

test("posições por nível permanecem declaradas fora de objetivos essenciais", () => {
  const expected = {
    [BALANCE.levels.currentId]: { x: 180, y: 160 },
    [BALANCE.levels.nextId]: { x: 372, y: 160 }
  };
  for (const [levelId, position] of Object.entries(expected)) {
    const level = getLevelDefinition(levelId);
    assert.equal(level.powerUpSpawns.length, 1);
    assert.deepEqual({ x: level.powerUpSpawns[0].x, y: level.powerUpSpawns[0].y }, position);
  }
  assert.equal(getLevelDefinition(BALANCE.levels.bonusId).powerUpSpawns.length, 0);
});

test("visual provisório identifica ×2 e HUD reflete somente o estado ativo real", () => {
  setLocale("pt-BR", null);
  assert.equal(t("powerup.doubleBurst.collected", { seconds: 10 }), "RAJADA DUPLA ATIVA — 10 s");
  const texts = [];
  const gradient = { addColorStop() {} };
  const ctx = {
    save() {}, restore() {}, fillRect() {}, strokeRect() {},
    fillText(text) { texts.push(text); },
    measureText(text) { return { width: String(text).length * 5 }; },
    createLinearGradient() { return gradient; },
    set fillStyle(_) {}, set strokeStyle(_) {}, set lineWidth(_) {},
    set font(_) {}, set textAlign(_) {}, set textBaseline(_) {}, set globalAlpha(_) {}
  };
  const renderer = Object.create(Renderer.prototype);
  renderer.drawPowerUps(ctx, {
    gameMode: "campaign",
    reducedMotion: true,
    powerUpPickup: { typeId: DOUBLE_BURST.id, x: 180, y: 160, w: 16, h: 16 }
  }, 1);
  assert.ok(texts.includes("×2"));

  const model = campaign();
  model.activePowerUp = { id: DOUBLE_BURST.id, remaining: 9.8 };
  model.notice = null;
  renderer.drawHud(ctx, model, 1);
  assert.ok(texts.some((text) => text === "RD9.8"));
  texts.length = 0;
  model.activePowerUp = null;
  renderer.drawHud(ctx, model, 1);
  assert.equal(texts.some((text) => String(text).startsWith("RD")), false);
  setLocale("en", null);
  assert.equal(t("powerup.doubleBurst.name"), "Double Burst");
  setLocale("pt-BR", null);
});

test("apresentação polida desenha cartridge sprite, resposta de coleta e indicador de duração", () => {
  const draws = [];
  const rects = [];
  const strokes = [];
  const texts = [];
  const gradient = { addColorStop() {} };
  const ctx = {
    save() {}, restore() {},
    fillRect(x, y, w, h) { rects.push({ x, y, w, h }); },
    strokeRect(x, y, w, h) { strokes.push({ x, y, w, h }); },
    drawImage(img, x, y) { draws.push({ img, x, y }); },
    fillText(text, x, y) { texts.push({ text, x, y }); },
    strokeText() {},
    beginPath() {}, arc() {}, stroke() {}, fill() {}, moveTo() {}, lineTo() {},
    measureText(text) { return { width: String(text).length * 5 }; },
    createLinearGradient() { return gradient; },
    createRadialGradient() { return gradient; },
    set fillStyle(_) {}, set strokeStyle(_) {}, set lineWidth(_) {},
    set font(_) {}, set textAlign(_) {}, set textBaseline(_) {}, set globalAlpha(_) {}
  };

  const dummyImage = { key: "powerup-cartridge" };
  const images = new Map([
    ["powerUp.double-burst.idle.0", dummyImage],
    ["powerUp.double-burst.idle.1", dummyImage],
    ["powerUp.double-burst.idle.2", dummyImage],
    ["powerUp.double-burst.idle.3", dummyImage]
  ]);

  const renderer = Object.create(Renderer.prototype);
  renderer.images = images;
  renderer.drawHudPanel = (context, x, y, w, h, border) => {
    rects.push({ x, y, w, h, panel: true, border });
  };
  renderer.drawHudBanner = (context, text, y, options) => {
    texts.push({ text, y, banner: true, options });
  };

  // 1. Pickup sprite frame drawing
  renderer.drawPowerUps(ctx, {
    gameMode: "campaign",
    reducedMotion: false,
    powerUpPickup: { typeId: DOUBLE_BURST.id, x: 180, y: 160, w: 16, h: 16 }
  }, 1.5);
  assert.equal(draws.length, 1);
  assert.equal(draws[0].x, 180);
  assert.equal(draws[0].img, dummyImage);

  // 2. Collection effect response
  const model = campaign();
  model.effects = [{ kind: "powerUpCollect", x: 180, y: 160, text: "×2", life: 0.5, duration: 0.75 }];
  renderer.drawEffects(ctx, model, 1.5);
  assert.ok(texts.some((item) => item.text === "×2"));

  // 3. Active HUD compacta dentro do painel superior reservado
  model.effects = [];
  model.activePowerUp = { id: DOUBLE_BURST.id, remaining: 7.5 };
  model.notice = { text: "AVISO DE TESTE" };
  rects.length = 0;
  texts.length = 0;
  renderer.drawHud(ctx, model, 1.5);
  assert.ok(rects.some((r) => r.panel && r.x === 8 && r.y === 7 && r.w === 148 && r.h === 38));
  assert.ok(texts.some((item) => item.text === "RD7.5"));
  assert.equal(rects.some((r) => r.panel && r.y > 45), false);
  assert.ok(texts.some((item) => item.banner && item.y === 51
    && item.options?.left === 152 && item.options?.right === 472)); // Notice stays in its reserved lane

  // 4. Indicator removal on expiration does not move the authoritative banner
  model.activePowerUp = null;
  rects.length = 0;
  texts.length = 0;
  renderer.drawHud(ctx, model, 1.5);
  assert.equal(texts.some((item) => item.text === "RD7.5"), false);
  assert.ok(texts.some((item) => item.banner && item.y === 51));
});
