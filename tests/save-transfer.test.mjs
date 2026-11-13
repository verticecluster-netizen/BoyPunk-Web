import assert from "node:assert/strict";
import test from "node:test";
import { AudioManager, AUDIO_STORAGE_KEY } from "../src/audio.js";
import { GAMEPAD_STORAGE_KEY, GamepadPreferencesStore } from "../src/gamepad.js";
import { ProgressionStore, PROGRESSION_STORAGE_KEY } from "../src/progression.js";
import {
  createSaveTransfer,
  importSaveTransfer,
  parseSaveTransfer,
  SAVE_TRANSFER_FORMAT,
  SAVE_TRANSFER_KEYS
} from "../src/save-transfer.js";

const gamepadData = () => ({ version: 1, deadZone: 0.22, selectedDeviceKey: "", profiles: {} });

class MemoryStorage {
  constructor(entries = {}) { this.values = new Map(Object.entries(entries)); this.writes = 0; }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.writes += 1; this.values.set(key, value); }
}

function withLocalStorage(storage, callback) {
  const previous = globalThis.localStorage;
  globalThis.localStorage = storage;
  try { return callback(); }
  finally {
    if (previous === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previous;
  }
}

test("exportação inclui somente as três chaves BoyPunk autorizadas", () => {
  withLocalStorage(new MemoryStorage({ "outro-site": "segredo" }), () => {
    const progression = new ProgressionStore(globalThis.localStorage);
    progression.completeLevel("district-neon");
    progression.recordBonusResult("district-neon", 180);
    const audio = new AudioManager(new Map());
    audio.setVolume(0.4);
    const gamepad = new GamepadPreferencesStore(globalThis.localStorage);
    gamepad.setDeadZone(0.3);
    const transfer = createSaveTransfer(progression, audio, gamepad, new Date("2026-10-26T12:00:00.000Z"));
    assert.equal(transfer.format, SAVE_TRANSFER_FORMAT);
    assert.deepEqual(Object.keys(transfer.storage).sort(), [...SAVE_TRANSFER_KEYS].sort());
    assert.equal(transfer.storage[PROGRESSION_STORAGE_KEY].bonusBestScores["district-neon"], 180);
    assert.deepEqual(transfer.storage[AUDIO_STORAGE_KEY], { volume: 0.4, muted: false });
    assert.equal(transfer.storage[GAMEPAD_STORAGE_KEY].deadZone, 0.3);
    assert.doesNotMatch(JSON.stringify(transfer), /outro-site|segredo/);
  });
});

test("importação mescla desbloqueios e máximos sem reduzir recordes existentes", () => {
  withLocalStorage(new MemoryStorage(), () => {
    const progression = new ProgressionStore(globalThis.localStorage);
    progression.completeLevel("district-neon");
    progression.recordBonusResult("district-neon", 300);
    const audio = new AudioManager(new Map());
    const transfer = JSON.stringify({
      format: SAVE_TRANSFER_FORMAT,
      exportedAt: "2026-10-26T12:00:00.000Z",
      storage: {
        [PROGRESSION_STORAGE_KEY]: {
          version: 1,
          completedLevels: ["district-neon", "scrap-factory"],
          unlockedLevels: ["district-neon", "scrap-factory"],
          bonusBestScores: { "district-neon": 120, "scrap-factory": 240 }
        },
        [AUDIO_STORAGE_KEY]: { volume: 0.25, muted: true },
        [GAMEPAD_STORAGE_KEY]: gamepadData()
      }
    });
    const result = importSaveTransfer(transfer, progression, audio);
    assert.equal(result.valid, true);
    assert.equal(result.progression.persisted, true);
    assert.deepEqual(progression.snapshot().bonusBestScores, { "district-neon": 300, "scrap-factory": 240 });
    assert.ok(progression.snapshot().completedLevels.includes("scrap-factory"));
    assert.deepEqual(audio.preferences, { volume: 0.25, muted: true });
  });
});

test("arquivo com chave extra, esquema inválido ou JSON quebrado é rejeitado antes de escrever", () => {
  const base = {
    format: SAVE_TRANSFER_FORMAT,
    storage: {
      [PROGRESSION_STORAGE_KEY]: { version: 1, completedLevels: [], unlockedLevels: ["district-neon"], bonusBestScores: {} },
      [AUDIO_STORAGE_KEY]: { volume: 0.65, muted: false },
      [GAMEPAD_STORAGE_KEY]: gamepadData()
    }
  };
  assert.equal(parseSaveTransfer("{quebrado"), null);
  assert.equal(parseSaveTransfer(JSON.stringify({ ...base, storage: { ...base.storage, "unrelated-key": "no" } })), null);
  assert.equal(parseSaveTransfer(JSON.stringify({ ...base, storage: { ...base.storage, [AUDIO_STORAGE_KEY]: { volume: 4, muted: false } } })), null);

  const storage = new MemoryStorage();
  const progression = new ProgressionStore(storage);
  let audioImports = 0;
  const audio = {
    applyImportedPreferences() { audioImports += 1; return { valid: true, persisted: true }; }
  };
  const result = importSaveTransfer(JSON.stringify({ ...base, storage: { ...base.storage, "unrelated-key": "no" } }), progression, audio);
  assert.equal(result.valid, false);
  assert.equal(storage.writes, 0);
  assert.equal(audioImports, 0);
});

test("falha de storage conserva importação útil na sessão e informa ausência de persistência", () => {
  const blocked = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
  withLocalStorage(blocked, () => {
    const progression = new ProgressionStore(blocked);
    const audio = new AudioManager(new Map());
    const transfer = JSON.stringify({
      format: SAVE_TRANSFER_FORMAT,
      storage: {
        [PROGRESSION_STORAGE_KEY]: {
          version: 1,
          completedLevels: ["district-neon"],
          unlockedLevels: ["district-neon", "scrap-factory"],
          bonusBestScores: { "district-neon": 210 }
        },
        [AUDIO_STORAGE_KEY]: { volume: 0.5, muted: true },
        [GAMEPAD_STORAGE_KEY]: gamepadData()
      }
    });
    const result = importSaveTransfer(transfer, progression, audio);
    assert.equal(result.valid, true);
    assert.equal(result.progression.persisted, false);
    assert.equal(result.audio.persisted, false);
    assert.equal(progression.snapshot().bonusBestScores["district-neon"], 210);
    assert.deepEqual(audio.preferences, { volume: 0.5, muted: true });
  });
});

test("importação aplica perfil de controle separado e mantém compatibilidade com transferência v1", () => {
  withLocalStorage(new MemoryStorage(), () => {
    const progression = new ProgressionStore(globalThis.localStorage);
    const audio = new AudioManager(new Map());
    const gamepad = new GamepadPreferencesStore(globalThis.localStorage);
    const v2 = JSON.stringify({
      format: SAVE_TRANSFER_FORMAT,
      storage: {
        [PROGRESSION_STORAGE_KEY]: { version: 1, completedLevels: [], unlockedLevels: ["district-neon"], bonusBestScores: {} },
        [AUDIO_STORAGE_KEY]: { volume: 0.65, muted: false },
        [GAMEPAD_STORAGE_KEY]: {
          version: 1,
          deadZone: 0.34,
          selectedDeviceKey: "Generic|generic|b8|a2",
          profiles: {
            "Generic|generic|b8|a2": {
              buttons: { jump: 1, attack: 2, interact: 3, cancel: 4, pause: 7 },
              horizontalAxis: 0,
              verticalAxis: 1,
              invertHorizontal: false,
              invertVertical: true
            }
          }
        }
      }
    });
    const imported = importSaveTransfer(v2, progression, audio, gamepad);
    assert.equal(imported.valid, true);
    assert.equal(gamepad.state.deadZone, 0.34);
    assert.equal(gamepad.profile("Generic|generic|b8|a2").buttons.attack, 2);

    const before = gamepad.exportData();
    const legacy = JSON.stringify({
      format: "boypunk-web-save-transfer-v1",
      storage: {
        [PROGRESSION_STORAGE_KEY]: { version: 1, completedLevels: [], unlockedLevels: ["district-neon"], bonusBestScores: {} },
        [AUDIO_STORAGE_KEY]: { volume: 0.5, muted: true }
      }
    });
    const legacyResult = importSaveTransfer(legacy, progression, audio, gamepad);
    assert.equal(legacyResult.valid, true);
    assert.equal(legacyResult.legacy, true);
    assert.deepEqual(gamepad.exportData(), before, "transferência antiga não apaga configuração de controle");
  });
});
