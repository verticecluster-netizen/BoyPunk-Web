import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { calculateBonusQualification } from "../src/bonus.js";
import { BALANCE } from "../src/config.js";
import { GameModel } from "../src/core.js";
import { applyVictoryProgression, ProgressionStore } from "../src/progression.js";
import { GAME_VERSION } from "../src/version.js";

class MemoryStorage {
  constructor() { this.values = new Map(); this.writes = 0; }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.writes += 1; this.values.set(key, value); }
}

function step(model, seconds) {
  for (let frame = 0; frame < Math.ceil(seconds * 120); frame += 1) model.update(1 / 120, {});
}

function commitVictory(model, { playerLife = 4, altarLife = 4 } = {}) {
  model.player.life = playerLife;
  model.altar.life = altarLife;
  model.altar.deposited = model.objective.soulsGoal;
  model.update(1 / 120, {});
  const event = model.consumeEvents().find(({ type }) => type === "victory");
  assert.ok(event);
  return event;
}

test("Distrito qualificado atravessa bônus e inicia Fábrica sem estado residual", () => {
  const storage = new MemoryStorage();
  const progression = new ProgressionStore(storage);
  const model = new GameModel();
  model.startRun({ levelId: BALANCE.levels.currentId, progressionEligible: true });
  const victory = commitVictory(model);
  applyVictoryProgression(progression, victory);
  const qualification = calculateBonusQualification(victory.stats, { eligible: victory.progressionEligible });
  assert.equal(model.queueBonusQualification(qualification, victory.stats), true);
  step(model, 1);
  assert.equal(model.state, "bonusTransition");
  step(model, 1.5);
  assert.equal(model.state, "bonusPlaying");
  model.finishBonus("timeout");
  const complete = model.consumeEvents().find(({ type }) => type === "bonusComplete");
  const saved = progression.recordBonusResult(complete.result.originLevelId, complete.result.score);
  assert.equal(saved.newlyEarned, 0);
  model.startRun({ levelId: BALANCE.levels.nextId, progressionEligible: true });
  assert.equal(model.levelId, BALANCE.levels.nextId);
  assert.deepEqual({ bonus: model.bonusResult, cannon: model.bonusCannon, projectiles: model.projectiles.length }, {
    bonus: null, cannon: null, projectiles: 0
  });
});

test("vitória não qualificada permanece no resumo e bônus pulado termina uma vez", () => {
  const weak = new GameModel();
  weak.startRun({ progressionEligible: true });
  const weakVictory = commitVictory(weak, { playerLife: 2, altarLife: 2 });
  const weakQualification = calculateBonusQualification(weakVictory.stats);
  assert.equal(weakQualification.points, 50);
  assert.equal(weak.queueBonusQualification(weakQualification, weakVictory.stats), false);
  step(weak, 1);
  assert.equal(weak.state, "victory");

  const qualified = new GameModel();
  qualified.startRun({ progressionEligible: true });
  const victory = commitVictory(qualified, { playerLife: 3, altarLife: 2 });
  assert.equal(qualified.queueBonusQualification(calculateBonusQualification(victory.stats), victory.stats), true);
  step(qualified, 1);
  assert.equal(qualified.skipBonus(), true);
  assert.equal(qualified.skipBonus(), false);
  assert.equal(qualified.consumeEvents().filter(({ type }) => type === "bonusComplete").length, 1);
});

test("vitória da Fábrica conclui bônus e volta ao menu sem terceiro nível", () => {
  const model = new GameModel();
  model.startRun({ levelId: BALANCE.levels.nextId, progressionEligible: true });
  const victory = commitVictory(model);
  assert.equal(model.queueBonusQualification(calculateBonusQualification(victory.stats), victory.stats), true);
  step(model, 2.5);
  assert.equal(model.state, "bonusPlaying");
  step(model, 20.1);
  assert.equal(model.state, "bonusComplete");
  assert.equal(model.bonusResult.originLevelId, BALANCE.levels.nextId);
  model.goToMenu();
  assert.equal(model.state, "menu");
  assert.equal(model.levelId, BALANCE.levels.currentId);
  assert.deepEqual({ enemies: model.enemies.length, souls: model.souls.length, projectiles: model.projectiles.length }, {
    enemies: 0, souls: 0, projectiles: 0
  });
});

test("pause congela bônus e retomada não duplica evento nem entidades", () => {
  const model = new GameModel();
  model.startBonusPreview();
  step(model, 3);
  const remaining = model.bonusRemaining;
  const phaseTime = model.bonusCannon.phaseTime;
  model.pause();
  step(model, 2);
  assert.equal(model.bonusRemaining, remaining);
  assert.equal(model.bonusCannon.phaseTime, phaseTime);
  model.resume();
  step(model, 20.1);
  assert.equal(model.consumeEvents().filter(({ type }) => type === "bonusComplete").length, 1);
  assert.deepEqual({ cannon: model.bonusCannon, projectiles: model.projectiles.length, effects: model.effects.length }, {
    cannon: null, projectiles: 0, effects: 0
  });
});

test("menu exibe o identificador autoritativo da versão de estúdio", async () => {
  const [html, main, build, feedback] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../src/main.js", import.meta.url), "utf8"),
    readFile(new URL("../tools/build-portable.mjs", import.meta.url), "utf8"),
    readFile(new URL("../packaging/MODELO-DE-FEEDBACK.txt", import.meta.url), "utf8")
  ]);
  assert.equal(GAME_VERSION, "0.5.2");
  assert.match(html, /id="game-version"/);
  assert.match(main, /gameVersion\.textContent = GAME_VERSION/);
  assert.ok(build.indexOf('"version.js"') < build.indexOf('"main.js"'));
  for (const field of ["Versão do jogo", "Sistema operacional", "Navegador e versão", "Passos para reproduzir", "Resultado esperado", "Resultado observado"]) {
    assert.match(feedback, new RegExp(field));
  }
});

test("handler do impacto do canhão é único e não duplica áudio", async () => {
  const main = await readFile(new URL("../src/main.js", import.meta.url), "utf8");
  assert.equal((main.match(/case "bonusCannonHit":/g) ?? []).length, 1);
  assert.match(main, /case "bonusCannonHit":[\s\S]*audio\.playBonusPenalty\(\);[\s\S]*break;/);
});
