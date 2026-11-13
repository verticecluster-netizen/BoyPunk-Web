import assert from "node:assert/strict";
import test from "node:test";
import { BALANCE } from "../src/config.js";
import { GameModel, overlaps } from "../src/core.js";
import { AttractDirector } from "../src/demo.js";
import { getLevelDefinition } from "../src/level-data.js";

const STEP = 1 / 120;

function step(model, seconds, input = {}) {
  for (let elapsed = 0; elapsed < seconds; elapsed += STEP) model.update(STEP, input);
}

test("catálogo físico preserva Distrito e configura a fábrica em 15 almas e 4/4", () => {
  const district = getLevelDefinition("district-neon");
  const factory = getLevelDefinition("scrap-factory");
  assert.equal(district.objective.soulsGoal, 15);
  assert.equal(factory.objective.soulsGoal, 15);
  assert.equal(factory.objective.altarMaxLife, 4);
  assert.equal(BALANCE.player.maxLife, 4);
  assert.equal(factory.presses.length, 1);
  assert.equal(factory.presses[0].damagesEnemies, false);
  const spawn = { ...factory.playerStart, w: BALANCE.player.width, h: BALANCE.player.height };
  const head = { x: factory.presses[0].x, y: factory.presses[0].idleY, w: factory.presses[0].w, h: factory.presses[0].headHeight };
  assert.equal(overlaps(spawn, head), false);
  assert.equal(factory.placedSouls.length, 5);
});

test("rotas da fábrica cabem no salto duplo e preservam espaços laterais seguros", () => {
  const factory = getLevelDefinition("scrap-factory");
  const routeTops = [240, 176, 112, 64];
  for (let index = 1; index < routeTops.length; index += 1) {
    assert.ok(routeTops[index - 1] - routeTops[index] <= 64);
  }
  const press = factory.presses[0];
  assert.ok(press.x - 128 >= 80, "há espera segura à esquerda");
  assert.ok(352 - (press.x + press.w) >= 80, "há espera segura à direita");
  assert.ok(press.phases.warning >= 1.2);
});

test("início, retry e troca de nível usam configuração limpa do nível atual", () => {
  const model = new GameModel({ random: () => 0 });
  model.startRun({ levelId: "scrap-factory" });
  assert.equal(model.levelId, "scrap-factory");
  assert.equal(model.player.life, 4);
  assert.equal(model.altar.life, 4);
  assert.equal(model.altar.deposited, 0);
  assert.equal(model.souls.length, 5);
  assert.equal(model.presses[0].phase, "idle");
  model.player.life = 1;
  model.altar.deposited = 9;
  step(model, 1, { right: true });
  model.startRun({ levelId: model.levelId });
  assert.equal(model.levelId, "scrap-factory");
  assert.equal(model.player.life, 4);
  assert.equal(model.altar.life, 4);
  assert.equal(model.altar.deposited, 0);
  assert.equal(model.elapsed, 0);
  assert.equal(model.presses[0].phase, "idle");
  assert.equal(model.presses[0].phaseTime, 4);
});

test("prensa segue ciclo determinístico e aviso nunca causa dano", () => {
  const model = new GameModel({ random: () => 0, debug: true });
  model.startRun({ levelId: "scrap-factory" });
  model.nextSpawnAt = Infinity;
  const press = model.presses[0];
  model.player.x = press.x + 8;
  model.player.y = 208;
  step(model, press.initialIdle + 0.02);
  assert.equal(press.phase, "warning");
  assert.equal(model.player.life, 4);
  const warningY = press.y;
  step(model, press.phases.warning - 0.08);
  assert.equal(press.phase, "warning");
  assert.equal(press.y, warningY);
  assert.equal(model.player.life, 4);
  step(model, 0.1);
  assert.equal(press.phase, "closing");
  step(model, press.phases.closing);
  assert.equal(model.player.life, 3);
  assert.equal(model.damageDiagnostics.filter(({ type }) => type === "prensa-industrial").length, 1);
  assert.equal(press.phase, "recovery");
  const life = model.player.life;
  step(model, press.phases.recovery + 0.01);
  assert.equal(model.player.life, life);
  assert.equal(press.phase, "idle");
});

test("prensa congela em pausa, não fere altar nem inimigos e reinicia do idle", () => {
  const model = new GameModel({ random: () => 0 });
  model.startRun({ levelId: "scrap-factory" });
  model.nextSpawnAt = Infinity;
  const press = model.presses[0];
  step(model, 4.2);
  model.pause();
  const frozen = model.snapshot().presses[0];
  step(model, 3);
  assert.deepEqual(model.snapshot().presses[0], frozen);
  model.resume();
  model.enemies = [{ id: "press-enemy", kind: "chaser", x: press.x + 8, y: 208, w: 16, h: 32, vx: 0, vy: 0, facing: 1, onGround: true, attackCooldown: Infinity, altarAttackCooldown: Infinity, removed: false }];
  const altarLife = model.altar.life;
  step(model, 2);
  assert.equal(model.enemies.some(({ id }) => id === "press-enemy"), true);
  assert.equal(model.altar.life, altarLife);
  model.startRun({ levelId: "scrap-factory" });
  assert.equal(model.presses[0].phase, "idle");
  assert.equal(model.presses[0].cycle, 0);
  assert.equal(model.presses[0].y, model.presses[0].idleY);
});

test("contato com a prensa ocorre após aproximação por movimento real", () => {
  const model = new GameModel({ random: () => 0, debug: true });
  model.startRun({ levelId: "scrap-factory" });
  model.nextSpawnAt = Infinity;
  model.enemies = [];
  model.souls = [];
  step(model, 0.9, { right: true });
  assert.ok(model.player.x >= model.presses[0].x && model.player.x < model.presses[0].x + model.presses[0].w);
  step(model, 5);
  assert.equal(model.player.life, 3);
  assert.equal(model.damageDiagnostics.filter(({ type }) => type === "prensa-industrial").length, 1);
});

test("janela inicial permite cruzar a prensa com movimento real sem dano", () => {
  const model = new GameModel({ random: () => 0 });
  model.startRun({ levelId: "scrap-factory" });
  model.nextSpawnAt = Infinity;
  model.enemies = [];
  model.souls = [];
  step(model, 1.5, { right: true });
  assert.ok(model.player.x > model.presses[0].x + model.presses[0].w);
  assert.equal(model.player.life, 4);
  assert.equal(model.presses[0].phase, "idle");
});

test("movimento e saltos reais alcançam a rota inferior e a rota elevada opcional", () => {
  const model = new GameModel({ random: () => 0 });
  model.startRun({ levelId: "scrap-factory" });
  model.nextSpawnAt = Infinity;
  model.enemies = [];
  model.souls = [];
  step(model, 1.5, { right: true });
  model.update(STEP, { right: true, jumpPressed: true });
  step(model, 0.18, { right: true });
  model.update(STEP, { right: true, jumpPressed: true });
  step(model, 0.65, { right: true });
  step(model, 0.3, {});
  assert.equal(model.player.y, 144, "pousa na plataforma inferior direita");
  assert.equal(model.player.onGround, true);
  model.update(STEP, { left: true, jumpPressed: true });
  step(model, 0.18, { left: true });
  model.update(STEP, { left: true, jumpPressed: true });
  step(model, 0.65, { left: true });
  step(model, 0.3, {});
  assert.equal(model.player.y, 80, "pousa na plataforma central elevada");
  assert.equal(model.player.onGround, true);
});

test("coleta e depósito concluem Fábrica com estatísticas específicas congeladas", () => {
  const model = new GameModel({ random: () => 0 });
  model.startRun({ levelId: "scrap-factory" });
  model.nextSpawnAt = Infinity;
  model.enemies = [];
  model.souls = Array.from({ length: model.objective.soulsGoal }, () => ({
    x: model.player.x, y: model.player.y, w: 15, h: 16, bornAt: 0, removed: false
  }));
  model.update(STEP, {});
  model.player.x = model.altar.x;
  model.player.y = 208;
  model.update(STEP, { interactPressed: true });
  assert.equal(model.state, "victoryPresentation");
  assert.equal(model.completedRun.levelId, "scrap-factory");
  assert.equal(model.completedRun.levelTitle, "Fábrica de Sucata");
  assert.equal(model.completedRun.soulsDeposited, 15);
  assert.equal(model.completedRun.soulsTarget, 15);
  assert.equal(model.completedRun.playerMaxLife, 4);
  assert.equal(model.completedRun.altarMaxLife, 4);
});

test("modo demonstração continua isolado no Distrito mesmo após uma run da fábrica", () => {
  const model = new GameModel();
  model.startRun({ levelId: "scrap-factory" });
  const director = new AttractDirector(model);
  director.start("test");
  assert.equal(model.levelId, "district-neon");
  assert.equal(model.demoMode, true);
  assert.equal(model.presses.length, 0);
  director.stop();
});
