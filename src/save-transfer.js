import { AUDIO_STORAGE_KEY, validateAudioPreferences } from "./audio.js";
import { GAMEPAD_STORAGE_KEY, validateGamepadPreferences } from "./gamepad.js";
import { PROGRESSION_STORAGE_KEY, validateProgression } from "./progression.js";

export const LEGACY_SAVE_TRANSFER_FORMAT = "boypunk-web-save-transfer-v1";
export const SAVE_TRANSFER_FORMAT = "boypunk-web-save-transfer-v2";
export const SAVE_TRANSFER_KEYS = Object.freeze([PROGRESSION_STORAGE_KEY, AUDIO_STORAGE_KEY, GAMEPAD_STORAGE_KEY]);

function ownRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

export function createSaveTransfer(progression, audio, gamepadPreferences = null, now = new Date()) {
  if (gamepadPreferences instanceof Date) {
    now = gamepadPreferences;
    gamepadPreferences = null;
  }
  const controller = gamepadPreferences?.exportData?.() ?? {
    version: 1,
    deadZone: 0.22,
    selectedDeviceKey: "",
    profiles: {}
  };
  return {
    format: SAVE_TRANSFER_FORMAT,
    exportedAt: now.toISOString(),
    storage: {
      [PROGRESSION_STORAGE_KEY]: progression.exportData(),
      [AUDIO_STORAGE_KEY]: audio.exportPreferences(),
      [GAMEPAD_STORAGE_KEY]: controller
    }
  };
}

export function validateSaveTransfer(value) {
  const transfer = ownRecord(value);
  const storage = ownRecord(transfer?.storage);
  if (!transfer || !storage) return null;
  const keys = Object.keys(storage);
  const legacy = transfer.format === LEGACY_SAVE_TRANSFER_FORMAT;
  const expectedKeys = legacy ? [PROGRESSION_STORAGE_KEY, AUDIO_STORAGE_KEY] : SAVE_TRANSFER_KEYS;
  if ((!legacy && transfer.format !== SAVE_TRANSFER_FORMAT)
    || keys.length !== expectedKeys.length || expectedKeys.some((key) => !keys.includes(key))) return null;
  const progression = validateProgression(storage[PROGRESSION_STORAGE_KEY]);
  const audio = validateAudioPreferences(storage[AUDIO_STORAGE_KEY]);
  const gamepad = legacy ? null : validateGamepadPreferences(storage[GAMEPAD_STORAGE_KEY]);
  if (!progression || !audio || (!legacy && !gamepad)) return null;
  return { progression, audio, gamepad, legacy };
}

export function parseSaveTransfer(text) {
  if (typeof text !== "string") return null;
  try { return validateSaveTransfer(JSON.parse(text)); }
  catch { return null; }
}

export function importSaveTransfer(text, progressionStore, audioManager, gamepadPreferences = null) {
  const parsed = parseSaveTransfer(text);
  if (!parsed) return { valid: false, progression: null, audio: null, gamepad: null };
  const progression = progressionStore.mergeImported(parsed.progression);
  const audio = audioManager.applyImportedPreferences(parsed.audio);
  const gamepad = parsed.gamepad && gamepadPreferences?.applyImportedPreferences
    ? gamepadPreferences.applyImportedPreferences(parsed.gamepad)
    : { valid: true, persisted: true, ignored: true };
  return { valid: true, progression, audio, gamepad, legacy: parsed.legacy };
}
