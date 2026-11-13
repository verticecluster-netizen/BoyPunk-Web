import assert from "node:assert/strict";
import test from "node:test";
import { BALANCE } from "../src/config.js";
import { GameModel } from "../src/core.js";
import {
  applyVictoryProgression,
  formatActiveDuration,
  ProgressionStore,
  PROGRESSION_SCHEMA_VERSION,
  PROGRESSION_STORAGE_KEY
} from "../src/progression.js";

class MemoryStorage {
  constructor(entries = {}) { this.values = new Map(Object.entries(entries)); this.writes = 0; }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.writes += 1; this.values.set(key, value); }
  removeItem(key) { this.values.delete(key); }
}

function victoryEvent(overrides = {}) {
  return {
    demoMode: false,
    progressionEligible: true,
    stats: { levelId: BALANCE.levels.currentId },
    ...overrides
  };
}

test("vitória real salva conclusão e desbloqueio em esquema versionado", () => {
  const storage = new MemoryStorage();
  const store = new ProgressionStore(storage);
  const result = applyVictoryProgression(store, victoryEvent());
  assert.equal(result.changed, true);
  assert.equal(result.persisted, true);
  assert.equal(storage.writes, 1);
  assert.deepEqual(JSON.parse(storage.getItem(PROGRESSION_STORAGE_KEY)), {
    version: PROGRESSION_SCHEMA_VERSION,
    completedLevels: ["district-neon"],
    unlockedLevels: ["district-neon", "scrap-factory"],
    bonusBestScores: {}
  });
  const reloaded = new ProgressionStore(storage);
  assert.equal(reloaded.levelStatus("district-neon").completed, true);
  assert.equal(reloaded.levelStatus("scrap-factory").unlocked, true);
  assert.equal(reloaded.levelStatus("scrap-factory").available, true);
});

test("tratamento repetido da vitória é idempotente e não duplica escrita", () => {
  const storage = new MemoryStorage();
  const store = new ProgressionStore(storage);
  applyVictoryProgression(store, victoryEvent());
  const repeated = applyVictoryProgression(store, victoryEvent());
  assert.equal(repeated.changed, false);
  assert.equal(storage.writes, 1);
});

test("conclusão da fábrica é registrada sem inventar desbloqueio de terceiro nível", () => {
  const storage = new MemoryStorage({
    [PROGRESSION_STORAGE_KEY]: JSON.stringify({
      version: PROGRESSION_SCHEMA_VERSION,
      completedLevels: ["district-neon"],
      unlockedLevels: ["district-neon", "scrap-factory"]
    })
  });
  const store = new ProgressionStore(storage);
  const result = applyVictoryProgression(store, victoryEvent({ stats: { levelId: "scrap-factory" } }));
  assert.equal(result.changed, true);
  assert.deepEqual(store.snapshot().completedLevels, ["district-neon", "scrap-factory"]);
  assert.deepEqual(store.snapshot().unlockedLevels, ["district-neon", "scrap-factory"]);
  assert.equal(storage.writes, 1);
  const repeated = applyVictoryProgression(store, victoryEvent({ stats: { levelId: "scrap-factory" } }));
  assert.equal(repeated.changed, false);
  assert.equal(storage.writes, 1);
});

test("demo, preview de teste e derrota não concedem progressão", () => {
  const storage = new MemoryStorage();
  const store = new ProgressionStore(storage);
  assert.equal(applyVictoryProgression(store, victoryEvent({ demoMode: true })).ignored, true);
  assert.equal(applyVictoryProgression(store, victoryEvent({ progressionEligible: false })).ignored, true);
  assert.equal(applyVictoryProgression(store, { progressionEligible: true, stats: null }).ignored, true);
  assert.equal(storage.writes, 0);
  assert.equal(store.levelStatus("scrap-factory").unlocked, false);

  const demo = new GameModel();
  demo.startRun({ demo: true });
  demo.souls = Array.from({ length: BALANCE.objective.soulsGoal }, () => ({
    x: demo.player.x, y: demo.player.y, w: 15, h: 16, bornAt: 0, removed: false
  }));
  demo.update(1 / 120, {});
  demo.player.x = demo.altar.x;
  demo.player.y = 208;
  demo.update(1 / 120, { interactPressed: true });
  const event = demo.consumeEvents().find(({ type }) => type === "victory");
  assert.equal(event.demoMode, true);
  assert.equal(event.progressionEligible, false);
  assert.equal(applyVictoryProgression(store, event).ignored, true);
  assert.equal(storage.writes, 0);
});

test("falha apenas na escrita conserva desbloqueio da sessão e mostra aviso", () => {
  const storage = { getItem() { return null; }, setItem() { throw new Error("quota"); } };
  const store = new ProgressionStore(storage);
  const result = applyVictoryProgression(store, victoryEvent());
  assert.equal(result.persisted, false);
  assert.equal(store.levelStatus("scrap-factory").unlocked, true);
  assert.equal(store.snapshot().storageStatus, "unavailable");
  assert.match(store.snapshot().warning, /não poderá ser mantido/);
});

test("armazenamento indisponível mantém progressão útil durante a sessão", () => {
  const storage = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
  const store = new ProgressionStore(storage);
  const result = applyVictoryProgression(store, victoryEvent());
  assert.equal(result.changed, true);
  assert.equal(result.persisted, false);
  assert.equal(store.levelStatus("scrap-factory").unlocked, true);
  assert.equal(store.snapshot().persistent, false);
  assert.match(store.snapshot().warning, /sessão/);
});

test("dados malformados não travam nem apagam chaves alheias", () => {
  const storage = new MemoryStorage({
    [PROGRESSION_STORAGE_KEY]: "{quebrado",
    "outro-jogo-save": "preservar"
  });
  const store = new ProgressionStore(storage);
  assert.equal(store.snapshot().storageStatus, "malformed");
  assert.equal(store.levelStatus("district-neon").completed, false);
  assert.equal(storage.getItem("outro-jogo-save"), "preservar");
  applyVictoryProgression(store, victoryEvent());
  assert.equal(storage.getItem("outro-jogo-save"), "preservar");
  assert.equal(JSON.parse(storage.getItem(PROGRESSION_STORAGE_KEY)).version, 1);
});

test("esquema futuro incompatível é preservado sem sobrescrita", () => {
  const future = JSON.stringify({ version: 99, completedLevels: ["future"] });
  const storage = new MemoryStorage({ [PROGRESSION_STORAGE_KEY]: future });
  const store = new ProgressionStore(storage);
  const result = applyVictoryProgression(store, victoryEvent());
  assert.equal(result.persisted, false);
  assert.equal(store.levelStatus("scrap-factory").unlocked, true, "desbloqueio continua útil na sessão");
  assert.equal(storage.getItem(PROGRESSION_STORAGE_KEY), future);
  assert.equal(storage.writes, 0);
});

test("esquema compatível preserva identificadores ainda desconhecidos", () => {
  const storage = new MemoryStorage({
    [PROGRESSION_STORAGE_KEY]: JSON.stringify({
      version: 1,
      completedLevels: ["future-complete"],
      unlockedLevels: ["district-neon", "future-unlock"]
    })
  });
  const store = new ProgressionStore(storage);
  applyVictoryProgression(store, victoryEvent());
  const saved = JSON.parse(storage.getItem(PROGRESSION_STORAGE_KEY));
  assert.ok(saved.completedLevels.includes("future-complete"));
  assert.ok(saved.unlockedLevels.includes("future-unlock"));
});

test("formatação do tempo ativo mantém décimos e minutos", () => {
  assert.equal(formatActiveDuration(0), "00:00.0");
  assert.equal(formatActiveDuration(65.98), "01:05.9");
});

test("melhor bônus por nível salva só melhorias e deriva o total", () => {
  const storage = new MemoryStorage();
  const store = new ProgressionStore(storage);
  const first = store.recordBonusResult("district-neon", 120);
  assert.equal(first.newlyEarned, 120);
  assert.equal(first.savedBest, 120);
  assert.equal(storage.writes, 1);
  const worse = store.recordBonusResult("district-neon", 80);
  const equal = store.recordBonusResult("district-neon", 120);
  assert.equal(worse.newlyEarned, 0);
  assert.equal(equal.newlyEarned, 0);
  assert.equal(storage.writes, 1, "resultado igual ou pior não infla nem regrava");
  const improved = store.recordBonusResult("district-neon", 350);
  const factory = store.recordBonusResult("scrap-factory", 90);
  assert.equal(improved.newlyEarned, 230);
  assert.equal(factory.newlyEarned, 90);
  assert.equal(store.snapshot().totalBonusPoints, 440);
  assert.deepEqual(store.snapshot().bonusBestScores, { "district-neon": 350, "scrap-factory": 90 });
  assert.equal(storage.writes, 3, "cada melhoria concluída persiste exatamente uma vez");
});

test("zero, pulo e pontuação acima do teto não apagam melhor anterior", () => {
  const storage = new MemoryStorage();
  const store = new ProgressionStore(storage);
  store.recordBonusResult("district-neon", 210);
  assert.equal(store.recordBonusResult("district-neon", 0).savedBest, 210);
  assert.equal(store.recordBonusResult("district-neon", -50).savedBest, 210);
  const capped = store.recordBonusResult("scrap-factory", 999);
  assert.equal(capped.savedBest, 350);
  assert.equal(store.snapshot().totalBonusPoints, 560);
});

test("save v1 anterior sem bônus migra de forma compatível e preserva preferências alheias", () => {
  const storage = new MemoryStorage({
    [PROGRESSION_STORAGE_KEY]: JSON.stringify({
      version: 1,
      completedLevels: ["district-neon"],
      unlockedLevels: ["district-neon", "scrap-factory"]
    }),
    "boypunk-audio-preferences": "preservar"
  });
  const store = new ProgressionStore(storage);
  assert.deepEqual(store.snapshot().bonusBestScores, {});
  store.recordBonusResult("district-neon", 40);
  assert.equal(storage.getItem("boypunk-audio-preferences"), "preservar");
  assert.equal(new ProgressionStore(storage).snapshot().bonusBestScores["district-neon"], 40);
});

test("falha de storage mantém melhor bônus e diferença na sessão", () => {
  const storage = { getItem() { return null; }, setItem() { throw new Error("quota"); } };
  const store = new ProgressionStore(storage);
  const result = store.recordBonusResult("district-neon", 70);
  assert.equal(result.newlyEarned, 70);
  assert.equal(result.persisted, false);
  assert.equal(store.snapshot().bonusBestScores["district-neon"], 70);
  assert.equal(store.snapshot().storageStatus, "unavailable");
});
