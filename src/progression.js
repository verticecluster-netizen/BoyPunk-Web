import { BALANCE } from "./config.js";
import { BONUS_RULES } from "./bonus.js";

export const PROGRESSION_STORAGE_KEY = "boypunk-web-progression-v1";
export const PROGRESSION_SCHEMA_VERSION = 1;

export const LEVEL_CATALOG = Object.freeze({
  [BALANCE.levels.currentId]: Object.freeze({
    id: BALANCE.levels.currentId,
    title: "Distrito Neon",
    available: true
  }),
  [BALANCE.levels.nextId]: Object.freeze({
    id: BALANCE.levels.nextId,
    title: "Fábrica de Sucata",
    available: true
  })
});

function defaultState() {
  return {
    version: PROGRESSION_SCHEMA_VERSION,
    completedLevels: [],
    unlockedLevels: [BALANCE.levels.currentId],
    bonusBestScores: {}
  };
}

function uniqueStrings(value) {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string" || !entry)) return null;
  return [...new Set(value)];
}

export function validateProgression(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (value.version !== PROGRESSION_SCHEMA_VERSION) return null;
  const completedLevels = uniqueStrings(value.completedLevels);
  const unlockedLevels = uniqueStrings(value.unlockedLevels);
  if (!completedLevels || !unlockedLevels) return null;
  const rawBestScores = value.bonusBestScores ?? {};
  if (!rawBestScores || typeof rawBestScores !== "object" || Array.isArray(rawBestScores)) return null;
  const bonusBestScores = {};
  for (const [levelId, score] of Object.entries(rawBestScores)) {
    if (!LEVEL_CATALOG[levelId] || !Number.isInteger(score) || score < 0 || score > BONUS_RULES.maximumScore) return null;
    bonusBestScores[levelId] = score;
  }
  if (!unlockedLevels.includes(BALANCE.levels.currentId)) unlockedLevels.unshift(BALANCE.levels.currentId);
  return { version: PROGRESSION_SCHEMA_VERSION, completedLevels, unlockedLevels, bonusBestScores };
}

function browserStorage() {
  try { return globalThis.localStorage ?? null; }
  catch { return null; }
}

export class ProgressionStore {
  constructor(storage = browserStorage()) {
    this.storage = storage;
    this.memoryOnly = storage?.persistent === false;
    this.state = defaultState();
    this.storageStatus = storage ? (this.memoryOnly ? "memory" : "available") : "unavailable";
    this.warning = storage && !this.memoryOnly ? "" : "O progresso vale nesta sessão, mas não poderá ser mantido após fechar.";
    this.writeBlocked = !storage;
    this.load();
  }

  load() {
    if (!this.storage) return this.snapshot();
    let raw;
    try {
      raw = this.storage.getItem(PROGRESSION_STORAGE_KEY);
    } catch {
      this.markUnavailable();
      return this.snapshot();
    }
    if (raw === null) return this.snapshot();
    let parsed;
    try { parsed = JSON.parse(raw); }
    catch {
      this.storageStatus = "malformed";
      this.warning = "O progresso salvo estava inválido e foi ignorado; uma nova conclusão poderá repará-lo.";
      return this.snapshot();
    }
    if (parsed?.version !== PROGRESSION_SCHEMA_VERSION) {
      this.storageStatus = "incompatible";
      this.warning = "A progressão salva usa outra versão; esta sessão não substituirá esses dados.";
      this.writeBlocked = true;
      return this.snapshot();
    }
    const validated = validateProgression(parsed);
    if (!validated) {
      this.storageStatus = "malformed";
      this.warning = "O progresso salvo estava inválido e foi ignorado; uma nova conclusão poderá repará-lo.";
      return this.snapshot();
    }
    this.state = validated;
    this.storageStatus = this.memoryOnly ? "memory" : "available";
    this.warning = this.memoryOnly ? "O progresso vale nesta sessão, mas não poderá ser mantido após fechar." : "";
    return this.snapshot();
  }

  markUnavailable() {
    this.storageStatus = "unavailable";
    this.warning = "O progresso vale nesta sessão, mas não poderá ser mantido após fechar.";
    this.writeBlocked = true;
  }

  completeLevel(levelId) {
    const completed = new Set(this.state.completedLevels);
    const unlocked = new Set(this.state.unlockedLevels);
    if (completed.has(levelId)) {
      return { changed: false, persisted: this.storageStatus === "available", state: this.snapshot() };
    }
    completed.add(levelId);
    if (levelId === BALANCE.levels.currentId) unlocked.add(BALANCE.levels.nextId);
    this.state = {
      version: PROGRESSION_SCHEMA_VERSION,
      completedLevels: [...completed],
      unlockedLevels: [...unlocked],
      bonusBestScores: { ...this.state.bonusBestScores }
    };
    if (this.writeBlocked || !this.storage) {
      return { changed: true, persisted: false, state: this.snapshot() };
    }
    try {
      this.storage.setItem(PROGRESSION_STORAGE_KEY, JSON.stringify(this.state));
      this.storageStatus = this.memoryOnly ? "memory" : "available";
      this.warning = this.memoryOnly ? "O progresso vale nesta sessão, mas não poderá ser mantido após fechar." : "";
      return { changed: true, persisted: !this.memoryOnly, state: this.snapshot() };
    } catch {
      this.markUnavailable();
      return { changed: true, persisted: false, state: this.snapshot() };
    }
  }

  levelStatus(levelId) {
    const definition = LEVEL_CATALOG[levelId];
    if (!definition) return null;
    return {
      ...definition,
      completed: this.state.completedLevels.includes(levelId),
      unlocked: this.state.unlockedLevels.includes(levelId)
    };
  }

  recordBonusResult(levelId, score) {
    if (!LEVEL_CATALOG[levelId]) {
      return { changed: false, persisted: false, savedBest: 0, newlyEarned: 0, ignored: true, state: this.snapshot() };
    }
    const safeScore = Math.max(0, Math.min(BONUS_RULES.maximumScore, Math.floor(Number.isFinite(score) ? score : 0)));
    const previousBest = this.state.bonusBestScores[levelId] ?? 0;
    if (safeScore <= previousBest) {
      return { changed: false, persisted: this.storageStatus === "available", savedBest: previousBest, newlyEarned: 0, ignored: false, state: this.snapshot() };
    }
    this.state = {
      ...this.state,
      bonusBestScores: { ...this.state.bonusBestScores, [levelId]: safeScore }
    };
    const result = {
      changed: true,
      persisted: false,
      savedBest: safeScore,
      newlyEarned: safeScore - previousBest,
      ignored: false
    };
    if (!this.writeBlocked && this.storage) {
      try {
        this.storage.setItem(PROGRESSION_STORAGE_KEY, JSON.stringify(this.state));
        this.storageStatus = this.memoryOnly ? "memory" : "available";
        this.warning = this.memoryOnly ? "O progresso vale nesta sessão, mas não poderá ser mantido após fechar." : "";
        result.persisted = !this.memoryOnly;
      } catch {
        this.markUnavailable();
      }
    }
    return { ...result, state: this.snapshot() };
  }

  exportData() {
    return {
      version: this.state.version,
      completedLevels: [...this.state.completedLevels],
      unlockedLevels: [...this.state.unlockedLevels],
      bonusBestScores: { ...this.state.bonusBestScores }
    };
  }

  mergeImported(value) {
    const imported = validateProgression(value);
    if (!imported) {
      return { changed: false, persisted: false, valid: false, state: this.snapshot() };
    }
    const completedLevels = [...new Set([...this.state.completedLevels, ...imported.completedLevels])];
    const unlockedLevels = [...new Set([...this.state.unlockedLevels, ...imported.unlockedLevels])];
    const bonusBestScores = { ...this.state.bonusBestScores };
    for (const [levelId, score] of Object.entries(imported.bonusBestScores)) {
      bonusBestScores[levelId] = Math.max(bonusBestScores[levelId] ?? 0, score);
    }
    const changed = JSON.stringify({ completedLevels, unlockedLevels, bonusBestScores })
      !== JSON.stringify({
        completedLevels: this.state.completedLevels,
        unlockedLevels: this.state.unlockedLevels,
        bonusBestScores: this.state.bonusBestScores
      });
    if (!changed) return { changed: false, persisted: this.storageStatus === "available", valid: true, state: this.snapshot() };
    this.state = { version: PROGRESSION_SCHEMA_VERSION, completedLevels, unlockedLevels, bonusBestScores };
    if (this.writeBlocked || !this.storage) {
      return { changed: true, persisted: false, valid: true, state: this.snapshot() };
    }
    try {
      this.storage.setItem(PROGRESSION_STORAGE_KEY, JSON.stringify(this.state));
      this.storageStatus = this.memoryOnly ? "memory" : "available";
      this.warning = this.memoryOnly ? "O progresso vale nesta sessão, mas não poderá ser mantido após fechar." : "";
      return { changed: true, persisted: !this.memoryOnly, valid: true, state: this.snapshot() };
    } catch {
      this.markUnavailable();
      return { changed: true, persisted: false, valid: true, state: this.snapshot() };
    }
  }

  snapshot() {
    return {
      version: this.state.version,
      completedLevels: [...this.state.completedLevels],
      unlockedLevels: [...this.state.unlockedLevels],
      bonusBestScores: { ...this.state.bonusBestScores },
      totalBonusPoints: Object.values(this.state.bonusBestScores).reduce((total, score) => total + score, 0),
      storageStatus: this.storageStatus,
      persistent: this.storageStatus === "available",
      warning: this.warning
    };
  }
}

export function applyVictoryProgression(store, event) {
  if (!event || event.demoMode || !event.progressionEligible) {
    return { changed: false, persisted: false, ignored: true };
  }
  const levelId = event.stats?.levelId;
  if (!LEVEL_CATALOG[levelId]?.available) {
    return { changed: false, persisted: false, ignored: true };
  }
  return { ...store.completeLevel(levelId), ignored: false };
}

export function formatActiveDuration(seconds) {
  const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const tenths = Math.floor(safe * 10 + 0.000001);
  const minutes = Math.floor(tenths / 600);
  const remaining = tenths % 600;
  const wholeSeconds = Math.floor(remaining / 10);
  return `${String(minutes).padStart(2, "0")}:${String(wholeSeconds).padStart(2, "0")}.${remaining % 10}`;
}
