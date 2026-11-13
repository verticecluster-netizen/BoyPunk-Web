import assert from "node:assert/strict";
import test from "node:test";
import { BONUS_CANNON_RULES, BONUS_RULES } from "../src/bonus.js";
import { DIFFICULTIES } from "../src/config.js";
import { GameModel } from "../src/core.js";

const LEVEL_EXPECTATIONS = Object.freeze({
  "district-neon": Object.freeze({
    openingDelay: 4.5,
    intervals: Object.freeze([3.25, 2.7, 2.3, 2.05]),
    maxEnemies: 5,
    maxProjectiles: 12
  }),
  "scrap-factory": Object.freeze({
    openingDelay: 5.5,
    intervals: Object.freeze([3.45, 3, 2.65, 2.45]),
    maxEnemies: 4,
    maxProjectiles: 10
  })
});

test("tuning de campanha preserva introdução e acelera somente fases posteriores", () => {
  for (const [levelId, expected] of Object.entries(LEVEL_EXPECTATIONS)) {
    const model = new GameModel();
    model.startRun({ levelId, difficulty: "normal" });
    assert.equal(model.encounter.openingDelay, expected.openingDelay);
    assert.deepEqual(model.encounter.phases.map(({ spawnInterval }) => spawnInterval), expected.intervals);
    assert.equal(model.encounter.maxEnemies, expected.maxEnemies);
    assert.equal(model.encounter.maxProjectiles, expected.maxProjectiles);
  }
});

test("dificuldades aplicam o intervalo uma vez e mantêm saúde e ordenação", () => {
  const expectedLife = { easy: 6, normal: 4, hard: 3 };
  const intervalMultiplier = { easy: 1.25, normal: 1, hard: 0.75 };
  for (const [levelId, base] of Object.entries(LEVEL_EXPECTATIONS)) {
    const intervals = {};
    for (const difficulty of Object.keys(DIFFICULTIES)) {
      const model = new GameModel();
      model.startRun({ levelId, difficulty });
      assert.equal(model.player.life, expectedLife[difficulty]);
      assert.equal(model.altar.life, expectedLife[difficulty]);
      assert.deepEqual(
        model.encounter.phases.map(({ spawnInterval }) => spawnInterval),
        base.intervals.map((value) => value * intervalMultiplier[difficulty])
      );
      intervals[difficulty] = model.encounter.phases.map(({ spawnInterval }) => spawnInterval);
    }
    for (let phase = 0; phase < base.intervals.length; phase += 1) {
      assert.ok(intervals.easy[phase] > intervals.normal[phase]);
      assert.ok(intervals.normal[phase] > intervals.hard[phase]);
    }
  }
});

test("dano e regras bônus permanecem fora do tuning de pressão", () => {
  assert.deepEqual(
    Object.fromEntries(Object.entries(DIFFICULTIES).map(([id, rules]) => [id, {
      playerHitsToDefeat: rules.playerMaxLife,
      altarHitsToDefeat: rules.altarMaxLife
    }])),
    {
      easy: { playerHitsToDefeat: 6, altarHitsToDefeat: 6 },
      normal: { playerHitsToDefeat: 4, altarHitsToDefeat: 4 },
      hard: { playerHitsToDefeat: 3, altarHitsToDefeat: 3 }
    }
  );
  assert.equal(BONUS_RULES.durationSeconds, 20);
  assert.equal(BONUS_RULES.totalSouls, 30);
  assert.equal(BONUS_CANNON_RULES.timePenaltySeconds, 1);
  assert.equal(BONUS_CANNON_RULES.maximumActiveProjectiles, 1);
});
