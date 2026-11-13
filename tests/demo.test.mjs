import assert from "node:assert/strict";
import test from "node:test";
import { BALANCE } from "../src/config.js";
import { GameModel } from "../src/core.js";
import { AttractDirector, createSeededRandom, MenuInactivityTimer } from "../src/demo.js";

test("gerador da demonstração é local e reproduzível", () => {
  const first = createSeededRandom(1234);
  const second = createSeededRandom(1234);
  assert.deepEqual(Array.from({ length: 8 }, first), Array.from({ length: 8 }, second));
});

test("relógio controlável dispara em 120 s somente no menu visível e reinicia com interação", () => {
  let entries = 0;
  const timer = new MenuInactivityTimer({ onElapsed: () => { entries += 1; } });
  timer.update(119.5, { eligible: true, visible: true });
  timer.update(30, { eligible: false, visible: true });
  timer.update(30, { eligible: true, visible: false });
  assert.equal(entries, 0);
  assert.equal(timer.snapshot().elapsed, 119.5);
  timer.reset();
  timer.update(119.99, { eligible: true, visible: true });
  assert.equal(entries, 0);
  timer.update(0.01, { eligible: true, visible: true });
  assert.equal(entries, 1);
  timer.update(120, { eligible: true, visible: true });
  assert.equal(entries, 1, "uma mesma espera não dispara repetidamente");
});

function simulateDemo(seconds, options = {}) {
  const model = new GameModel();
  const director = new AttractDirector(model, options);
  director.start("test");
  const counts = new Map();
  for (let step = 0; step < seconds * 120 && director.active; step += 1) {
    director.step(1 / 120);
    for (const event of model.consumeEvents()) counts.set(event.type, (counts.get(event.type) ?? 0) + 1);
  }
  return { model, director, counts };
}

test("controle autônomo usa física real para saltar, combater, coletar, retornar e depositar", () => {
  const first = simulateDemo(22);
  assert.equal(first.model.demoMode, true);
  assert.ok((first.counts.get("jump") ?? 0) >= 2);
  assert.ok((first.counts.get("attack") ?? 0) >= 1);
  assert.ok((first.counts.get("enemyDefeated") ?? 0) >= 1);
  assert.ok((first.counts.get("soulCollected") ?? 0) >= 3);
  assert.ok((first.counts.get("soulsDeposited") ?? 0) >= 3);
  assert.ok(first.model.altar.deposited >= 6);
  assert.equal(first.model.player.life <= BALANCE.player.maxLife, true);
  assert.equal(first.model.altar.life <= BALANCE.objective.altarMaxLife, true);

  const second = simulateDemo(22);
  assert.deepEqual(second.model.snapshot(), first.model.snapshot(), "seed fixo repete a simulação");
  assert.deepEqual(Object.fromEntries(second.counts), Object.fromEntries(first.counts));
});

test("derrota, vitória, duração e estagnação entram em recuperação sem reset rápido", () => {
  for (const reason of ["defeat", "victory", "maximum-duration", "stagnation"]) {
    const model = new GameModel();
    const config = { ...BALANCE.demo, maxRunSeconds: 10, stagnationSeconds: 10, restartDelaySeconds: 0.5 };
    const director = new AttractDirector(model, { config });
    director.start("test");
    if (reason === "defeat") {
      model.damagePlayer(BALANCE.player.maxLife);
      model.update(0, {});
      for (let i = 0; i < 60; i += 1) director.step(1 / 120);
    } else if (reason === "victory") {
      model.altar.deposited = BALANCE.objective.soulsGoal;
      for (let step = 0; step < 180 && director.diagnostics().history.at(-1).type !== "recovery"; step += 1) {
        director.step(1 / 120);
      }
    } else if (reason === "maximum-duration") {
      director.runTime = config.maxRunSeconds;
      director.step(1 / 120);
    } else {
      director.stagnation = config.stagnationSeconds;
      director.step(1 / 120);
    }
    assert.equal(director.diagnostics().history.at(-1).reason, reason);
    const previousRun = model.runId;
    assert.ok(director.restartRemaining > 0);
    const remaining = director.restartRemaining;
    director.step(Math.max(0, remaining - 0.01));
    assert.equal(model.runId, previousRun, "atraso visual evita reset instantâneo");
    director.step(0.02);
    assert.equal(model.runId, previousRun + 1);
    assert.equal(model.demoMode, true);
  }
});

test("falhas persistentes retornam de forma segura e saída limpa entidades da demo", () => {
  const model = new GameModel();
  let aborted = null;
  const config = { ...BALANCE.demo, restartDelaySeconds: 0.01, maxConsecutiveFailures: 2 };
  const director = new AttractDirector(model, { config, onAbort: (detail) => { aborted = detail; } });
  director.start("test");
  director.scheduleRestart("stagnation");
  director.step(0.02);
  director.scheduleRestart("stagnation");
  assert.equal(director.active, false);
  assert.equal(aborted.reason, "persistent-failure");

  model.goToMenu();
  assert.equal(model.demoMode, false);
  assert.equal(model.state, "menu");
  assert.equal(model.enemies.length, 0);
  assert.equal(model.projectiles.length, 0);
  assert.equal(model.souls.length, 0);
  assert.equal(model.effects.length, 0);
  assert.equal(model.defeatVisuals.length, 0);
});

test("cinco ciclos demo → menu → partida do jogador → menu começam limpos", () => {
  const model = new GameModel();
  const director = new AttractDirector(model);
  for (let cycle = 0; cycle < 5; cycle += 1) {
    director.start("cycle");
    for (let step = 0; step < 120; step += 1) director.step(1 / 120);
    director.stop();
    model.goToMenu();
    model.random = Math.random;
    model.startRun({ demo: false });
    assert.equal(model.demoMode, false);
    assert.equal(model.player.life, 4);
    assert.equal(model.altar.life, 4);
    assert.equal(model.altar.deposited, 0);
    assert.equal(model.carriedSouls, 0);
    model.goToMenu();
  }
});
