import { loadAssets } from "./assets.js";
import { AudioManager } from "./audio.js";
import { GameModel } from "./core.js";
import { CoopGameModel } from "./coop.js";
import { confirmUiTarget, InputController, isUiInputTarget, UiPressGate } from "./input.js";
import { Renderer } from "./renderer.js";
import { BALANCE, DEFAULT_DIFFICULTY, DIFFICULTIES, normalizeDifficulty, DEFAULT_CHARACTER, CHARACTERS, loadCharacterPreference, saveCharacterPreference } from "./config.js";
import { AttractDirector, MenuInactivityTimer } from "./demo.js";
import { applyVictoryProgression, formatActiveDuration, ProgressionStore } from "./progression.js";
import { calculateBonusQualification } from "./bonus.js";
import { createSaveTransfer, importSaveTransfer } from "./save-transfer.js";
import { GAME_VERSION } from "./version.js";
import {
  initLocale,
  getLocale,
  setLocale,
  t,
  onLocaleChange,
  applyTranslations
} from "./i18n.js";
import {
  GAMEPAD_BINDING_LABELS,
  CoopGamepadRouter,
  GamepadManager,
  GamepadNavigationRepeater,
  GamepadPreferencesStore
} from "./gamepad.js";

const canvas = document.querySelector("#game");
const loadingScreen = document.querySelector("#loading");
const loadingStatus = document.querySelector("#loading-status");
const progressBar = document.querySelector("#progress-bar");
const loadError = document.querySelector("#load-error");
const touchControls = document.querySelector("#touch-controls");
const interactTouch = document.querySelector('[data-action="interact"]');
const pauseTouch = document.querySelector("#pause-touch");
const languageSelect = document.querySelector("#language-select");
const difficultySelect = document.querySelector("#difficulty-select");
const volumeInput = document.querySelector("#volume");
const volumeValue = document.querySelector("#volume-value");
const muteButton = document.querySelector("#mute");
const defeatReason = document.querySelector("#defeat-reason");
const resourceWarning = document.querySelector("#resource-warning");
const demoOverlay = document.querySelector("#demo-overlay");
const districtLevelStatus = document.querySelector("#district-level-status");
const scrapLevelStatus = document.querySelector("#scrap-level-status");
const factoryLevelButton = document.querySelector("#factory-level-button");
const gameStatus = document.querySelector("#game-status");
const menuProgressionWarning = document.querySelector("#menu-progression-warning");
const victoryProgressionWarning = document.querySelector("#victory-progression-warning");
const victoryDuration = document.querySelector("#victory-duration");
const victorySouls = document.querySelector("#victory-souls");
const victoryPlayerLife = document.querySelector("#victory-player-life");
const victoryAltarLife = document.querySelector("#victory-altar-life");
const victoryTitle = document.querySelector("#victory-title");
const nextLevelCard = document.querySelector("#next-level-card");
const continueNext = document.querySelector("#continue-next");
const defeatLevel = document.querySelector("#defeat-level");
const defeatSouls = document.querySelector("#defeat-souls");
const defeatSoulsGoal = document.querySelector("#defeat-souls-goal");
const defeatPlayerLife = document.querySelector("#defeat-player-life");
const defeatAltarLife = document.querySelector("#defeat-altar-life");
const survivalResultWave = document.querySelector("#survival-result-wave");
const survivalResultTime = document.querySelector("#survival-result-time");
const survivalResultKills = document.querySelector("#survival-result-kills");
const survivalHighScoreElement = document.querySelector("#survival-high-score");
const menuBonusTotal = document.querySelector("#menu-bonus-total");
const bonusQualificationPoints = document.querySelector("#bonus-qualification-points");
const skipBonusButton = document.querySelector("#skip-bonus");
const bonusResultTitle = document.querySelector("#bonus-result-title");
const bonusOriginLevel = document.querySelector("#bonus-origin-level");
const bonusResultSouls = document.querySelector("#bonus-result-souls");
const bonusRunScore = document.querySelector("#bonus-run-score");
const bonusSavedBest = document.querySelector("#bonus-saved-best");
const bonusNewPoints = document.querySelector("#bonus-new-points");
const bonusProgressionWarning = document.querySelector("#bonus-progression-warning");
const bonusContinueNext = document.querySelector("#bonus-continue-next");
const saveImportFile = document.querySelector("#save-import-file");
const saveTransferStatus = document.querySelector("#save-transfer-status");
const gameVersion = document.querySelector("#game-version");
const gamepadStatus = document.querySelector("#gamepad-status");
const controllerOptionsStatus = document.querySelector("#controller-options-status");
const controllerDevice = document.querySelector("#controller-device");
const controllerLive = document.querySelector("#controller-live");
const controllerDeadZone = document.querySelector("#controller-dead-zone");
const controllerDeadZoneValue = document.querySelector("#controller-dead-zone-value");
const genericControllerSettings = document.querySelector("#generic-controller-settings");
const controllerAxisHorizontal = document.querySelector("#controller-axis-horizontal");
const controllerAxisVertical = document.querySelector("#controller-axis-vertical");
const controllerInvertHorizontal = document.querySelector("#controller-invert-horizontal");
const controllerInvertVertical = document.querySelector("#controller-invert-vertical");
const controllerMappingStatus = document.querySelector("#controller-mapping-status");
const coopLayout = document.querySelector("#coop-layout");
const coopP1Device = document.querySelector("#coop-p1-device");
const coopP2Device = document.querySelector("#coop-p2-device");
const coopLobbyStatus = document.querySelector("#coop-lobby-status");
const coopStartButton = document.querySelector("#coop-start");
const coopPauseWarning = document.querySelector("#coop-pause-warning");
const coopResultTitle = document.querySelector("#coop-result-title");
const coopResultReason = document.querySelector("#coop-result-reason");
const coopResultSouls = document.querySelector("#coop-result-souls");
const coopResultAltar = document.querySelector("#coop-result-altar");
const coopResultPlayers = document.querySelector("#coop-result-players");
const query = new URLSearchParams(location.search);
const testMode = query.has("test");
const directBonusPreview = query.get("bonus-preview") === "1"
  && location.protocol === "http:"
  && ["127.0.0.1", "localhost"].includes(location.hostname);
const directPatrolShooterPreview = query.get("patrol-shooter-preview") === "1"
  && location.protocol === "http:"
  && ["127.0.0.1", "localhost"].includes(location.hostname);
const directCoopPreview = query.get("coop-preview") === "1"
  && location.protocol === "http:"
  && ["127.0.0.1", "localhost"].includes(location.hostname);
const directCoopSurvival = query.get("coop-survival") === "1"
  && location.protocol === "http:"
  && ["127.0.0.1", "localhost"].includes(location.hostname);
const directCoopMode = directCoopPreview || directCoopSurvival;
const debugEnabled = query.get("debug") === "1" || testMode || directPatrolShooterPreview;

let loadingDiagnostics;
const DIFFICULTY_STORAGE_KEY = "boypunk-web-difficulty-v1";
const SURVIVAL_HIGH_SCORE_STORAGE_KEY = "boypunk-web-survival-high-score-v1";

function errorText(error) {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error ?? "Erro desconhecido");
}

function showLoadingDiagnostic(level, source, error) {
  loadingScreen.hidden = false;
  if (!loadingDiagnostics) {
    loadingDiagnostics = document.createElement("div");
    loadingDiagnostics.id = "loading-diagnostics";
    loadingDiagnostics.className = "loading-diagnostics";
    loadingDiagnostics.setAttribute("role", "alert");
    loadingScreen.append(loadingDiagnostics);
  }
  const line = document.createElement("div");
  line.className = level === "warning" ? "diagnostic-warning" : "diagnostic-error";
  line.textContent = `${level === "warning" ? "AVISO" : "ERRO"} — ${source}\n${errorText(error)}`;
  loadingDiagnostics.append(line);
}

function showFatalLoadingError(source, error) {
  console.error(`[BoyPunk boot] ${source}:`, error);
  loadingStatus.textContent = "Falha ao carregar recursos";
  loadError.hidden = false;
  loadError.textContent = `${source}\n${errorText(error)}\nRecarregue a página para tentar novamente.`;
  showLoadingDiagnostic("error", source, error);
}

function createMemoryStorage() {
  const values = new Map();
  return {
    persistent: false,
    getItem(key) { return values.has(String(key)) ? values.get(String(key)) : null; },
    setItem(key, value) { values.set(String(key), String(value)); },
    removeItem(key) { values.delete(String(key)); }
  };
}

function initializeBootStorage() {
  try {
    const storage = globalThis.localStorage;
    if (!storage) throw new Error("localStorage não está disponível");
    const probe = "__boypunk_storage_probe__";
    storage.setItem(probe, "1");
    storage.removeItem(probe);
    return storage;
  } catch (error) {
    console.warn("[BoyPunk storage] Persistência bloqueada; usando memória:", error);
    showLoadingDiagnostic("warning", "localStorage (fallback em memória)", error);
    return createMemoryStorage();
  }
}

function loadDifficultyPreference(storage) {
  try { return normalizeDifficulty(storage?.getItem(DIFFICULTY_STORAGE_KEY)); }
  catch { return DEFAULT_DIFFICULTY; }
}

function saveDifficultyPreference(storage, difficulty) {
  const normalized = normalizeDifficulty(difficulty);
  try { storage?.setItem(DIFFICULTY_STORAGE_KEY, normalized); }
  catch { /* a preferência permanece válida somente nesta sessão */ }
  return normalized;
}

function normalizeSurvivalHighScore(value) {
  return {
    wave: Math.max(0, Math.floor(Number(value?.wave) || 0)),
    activeSeconds: Math.max(0, Number(value?.activeSeconds) || 0),
    kills: Math.max(0, Math.floor(Number(value?.kills) || 0))
  };
}

function loadSurvivalHighScore(storage) {
  try { return normalizeSurvivalHighScore(JSON.parse(storage?.getItem(SURVIVAL_HIGH_SCORE_STORAGE_KEY) ?? "null")); }
  catch { return normalizeSurvivalHighScore(null); }
}

function saveSurvivalHighScore(storage, current, result) {
  const candidate = normalizeSurvivalHighScore(result);
  const best = candidate.wave > current.wave
    || (candidate.wave === current.wave && candidate.activeSeconds > current.activeSeconds)
    ? candidate
    : current;
  try { storage?.setItem(SURVIVAL_HIGH_SCORE_STORAGE_KEY, JSON.stringify(best)); }
  catch { /* o recorde continua disponível nesta sessão */ }
  return best;
}

function formatSurvivalTime(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function createLoadingWatchdog() {
  let timer = 0;
  let currentSource = "inicialização do preloader";
  let completed = 0;
  let totalAssets = "?";
  const arm = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      showLoadingDiagnostic(
        "warning",
        currentSource,
        new Error(`Sem progresso por mais de 5 segundos (${completed}/${totalAssets})`)
      );
    }, 5000);
  };
  return {
    start() { arm(); },
    asset(entry) { currentSource = entry.url; },
    progress(done, total) {
      completed = done;
      totalAssets = total;
      arm();
    },
    stop() { clearTimeout(timer); }
  };
}

window.addEventListener("error", (event) => {
  console.error("[BoyPunk runtime error]", event.error ?? event.message);
  if (!loadingScreen.hidden) {
    const location = event.filename
      ? `${event.filename}:${event.lineno ?? 0}:${event.colno ?? 0}`
      : "erro global durante o carregamento";
    showLoadingDiagnostic("error", location, event.error ?? event.message);
  }
});
window.addEventListener("unhandledrejection", (event) => {
  console.error("[BoyPunk unhandled rejection]", event.reason);
  if (!loadingScreen.hidden) showLoadingDiagnostic("error", "Promise rejeitada durante o carregamento", event.reason);
});

let activeGameModel = null;

const screens = new Map([
  ["menu", document.querySelector("#screen-menu")],
  ["options", document.querySelector("#screen-options")],
  ["credits", document.querySelector("#screen-credits")],
  ["coopLobby", document.querySelector("#screen-coop-lobby")],
  ["coopResult", document.querySelector("#screen-coop-result")],
  ["paused", document.querySelector("#screen-paused")],
  ["victory", document.querySelector("#screen-victory")],
  ["bonusTransition", document.querySelector("#screen-bonus-transition")],
  ["bonusComplete", document.querySelector("#screen-bonus-complete")],
  ["defeat", document.querySelector("#screen-defeat")],
  ["survivalDefeat", document.querySelector("#screen-survival-defeat")]
]);

function showState(state, demoActive = false) {
  for (const [name, screen] of screens) screen.hidden = demoActive || name !== state;
  const playing = ["playing", "bonusPlaying", "survival"].includes(state) && !demoActive;
  const touchPlaying = playing && !activeGameModel?.coopPreview;
  touchControls.hidden = !touchPlaying;
  pauseTouch.hidden = !touchPlaying;
  touchControls.classList.toggle("is-playing", touchPlaying);
  pauseTouch.classList.toggle("is-playing", touchPlaying);
  if (interactTouch) interactTouch.hidden = state === "survival";
  const abilityTouch = document.querySelector('[data-action="ability"]');
  if (abilityTouch) abilityTouch.hidden = !playing || !["playing", "survival"].includes(state) || !activeGameModel?.character?.hasSelfHeal;
  gamepadStatus.classList.toggle("is-playing", playing);
  demoOverlay.hidden = !demoActive;
}

function updateAudioUi(audio) {
  const percentage = Math.round(audio.preferences.volume * 100);
  volumeInput.value = String(percentage);
  volumeValue.value = `${percentage}%`;
  muteButton.textContent = audio.preferences.muted ? t("options.muteYes") : t("options.muteNo");
}

function updateWarning(element, text) {
  element.hidden = !text;
  element.textContent = text;
}

function updateProgressionUi(progression) {
  const district = progression.levelStatus(BALANCE.levels.currentId);
  const scrap = progression.levelStatus(BALANCE.levels.nextId);
  districtLevelStatus.textContent = district.completed ? t("menu.statusCompleted") : t("menu.statusAvailable");
  scrapLevelStatus.textContent = scrap.completed ? t("menu.statusCompleted") : scrap.unlocked ? t("menu.statusAvailable") : t("menu.statusLocked");
  scrapLevelStatus.classList.toggle("is-unavailable", !scrap.available);
  factoryLevelButton.disabled = !(scrap.unlocked && scrap.available);
  continueNext.disabled = !(scrap.unlocked && scrap.available);
  factoryLevelButton.setAttribute("aria-label", scrap.unlocked
    ? (getLocale() === "en" ? "Play Scrap Factory" : "Jogar Fábrica de Sucata")
    : (getLocale() === "en" ? "Scrap Factory locked; complete Neon District" : "Fábrica de Sucata bloqueada; conclua Distrito Neon"));
  updateWarning(menuProgressionWarning, progression.snapshot().warning);
  menuBonusTotal.textContent = String(progression.snapshot().totalBonusPoints);
}

function updateVictoryUi(stats) {
  const completedDistrict = stats.levelId === BALANCE.levels.currentId;
  victoryTitle.textContent = completedDistrict ? t("victory.districtTitle") : t("victory.factoryTitle");
  victoryDuration.textContent = formatActiveDuration(stats.activeSeconds);
  victorySouls.textContent = String(stats.soulsDeposited);
  victoryPlayerLife.textContent = String(stats.playerLife);
  victoryAltarLife.textContent = String(stats.altarLife);
  for (const element of document.querySelectorAll("#screen-victory [data-souls-goal]")) {
    element.textContent = String(stats.soulsTarget);
  }
  nextLevelCard.hidden = !completedDistrict;
  continueNext.hidden = !completedDistrict;
  const victoryRestart = document.querySelector("#victory-restart");
  if (victoryRestart) {
    if (completedDistrict) {
      victoryRestart.classList.remove("primary");
    } else {
      victoryRestart.classList.add("primary");
    }
  }
}

function formatDefeatReason(rawReason) {
  if (rawReason === "Você foi derrotado") return t("defeat.player");
  if (rawReason === "Altar destruído") return t("defeat.altar");
  if (rawReason === "O Distrito caiu.") return t("defeat.districtFell");
  return rawReason || t("defeat.default");
}

async function boot() {
  let bootStorage = initializeBootStorage();
  try {
    initLocale(bootStorage);
  } catch (error) {
    showLoadingDiagnostic("warning", "locale/localStorage", error);
    bootStorage = createMemoryStorage();
    initLocale(bootStorage);
  }
  let selectedDifficulty = loadDifficultyPreference(bootStorage);
  let selectedCharacter = loadCharacterPreference(bootStorage);
  let survivalHighScore = loadSurvivalHighScore(bootStorage);
  if (languageSelect) {
    languageSelect.value = getLocale();
    languageSelect.addEventListener("change", (event) => {
      try { setLocale(event.target.value, bootStorage); }
      catch (error) { showLoadingDiagnostic("warning", "locale/localStorage", error); }
    });
  }
  if (difficultySelect) difficultySelect.value = selectedDifficulty;
  applyTranslations(document);

  const selectedDifficultyConfig = () => DIFFICULTIES[selectedDifficulty];
  gameVersion.textContent = GAME_VERSION;
  for (const element of document.querySelectorAll("[data-souls-goal]")) {
    element.textContent = String(selectedDifficultyConfig().soulsGoal);
  }
  for (const element of document.querySelectorAll("[data-player-max-life]")) {
    element.textContent = String(selectedDifficultyConfig().playerMaxLife);
  }
  for (const element of document.querySelectorAll("[data-altar-max-life]")) {
    element.textContent = String(selectedDifficultyConfig().altarMaxLife);
  }
  let resources;
  const watchdog = createLoadingWatchdog();
  watchdog.start();
  try {
    resources = await loadAssets((completed, total, entry) => {
      const percentage = Math.round((completed / total) * 100);
      progressBar.style.width = `${percentage}%`;
      loadingStatus.textContent = t("loading.status", { percent: percentage });
      watchdog.progress(completed, total, entry);
    }, {
      onAssetStart: (entry) => watchdog.asset(entry),
      onAssetError: (entry, error) => {
        showLoadingDiagnostic("error", `${entry.type}: ${entry.url}`, error);
      }
    });
  } catch (error) {
    showFatalLoadingError("preloader de recursos", error);
    return;
  } finally {
    watchdog.stop();
  }

  const reducedMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  const model = directCoopMode
    ? new CoopGameModel({ debug: debugEnabled, reducedMotion })
    : new GameModel({ debug: debugEnabled, reducedMotion });
  activeGameModel = model;
  const input = new InputController(document);
  let gamepadPreferences;
  try { gamepadPreferences = new GamepadPreferencesStore(bootStorage); }
  catch (error) {
    showLoadingDiagnostic("warning", "gamepad/localStorage", error);
    gamepadPreferences = new GamepadPreferencesStore(null);
  }
  const gamepad = new GamepadManager({ preferences: gamepadPreferences });
  const coopGamepads = directCoopMode
    ? new CoopGamepadRouter({ preferences: gamepadPreferences })
    : null;
  const gamepadNavigation = new GamepadNavigationRepeater();
  const uiPressGate = new UiPressGate();
  if (coopGamepads) {
    input.setKeyboardSlots([1]);
    input.attachPlayerProvider(1, coopGamepads.provider(1));
    input.attachPlayerProvider(2, coopGamepads.provider(2));
  } else {
    input.attachPlayerProvider(1, gamepad);
  }
  let audio;
  try { audio = new AudioManager(resources.audioUrls, bootStorage); }
  catch (error) {
    showLoadingDiagnostic("warning", "áudio/localStorage", error);
    audio = new AudioManager(resources.audioUrls, createMemoryStorage());
  }
  const urlParams = new URLSearchParams(window.location.search);
  const scaleParam = urlParams.get("scale");
  let renderScale = 2;
  if (scaleParam) {
    const parsed = Number.parseFloat(scaleParam);
    if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 4) renderScale = parsed;
  } else if (typeof window !== "undefined" && window.innerWidth < 640) {
    renderScale = 1.5;
  }
  canvas.width = Math.round(480 * renderScale);
  canvas.height = Math.round(270 * renderScale);
  const renderer = new Renderer(canvas, resources.images, { debug: debugEnabled, renderScale });
  let progression;
  try { progression = new ProgressionStore(bootStorage); }
  catch (error) {
    showLoadingDiagnostic("warning", "saves/localStorage", error);
    progression = new ProgressionStore(null);
  }
  const processedEventCounts = new Map();
  let previousState = model.state;
  let previousDemoActive = false;
  let suppressNextClick = false;
  const consumedExitCodes = new Set();
  const pointerStarts = new Map();
  const fixedStep = 1 / 120;
  let lastTime = performance.now();
  let accumulator = 0;
  let pageVisible = !document.hidden;
  let director;
  const processedBonusCompletions = new Set();
  let guidedMappingQueue = [];
  let guidedMappingActive = false;
  let lastControllerUiAt = -Infinity;

  updateAudioUi(audio);
  updateProgressionUi(progression);
  loadingScreen.hidden = true;

  const updateMenuSubtitle = () => {
    const subtitle = document.querySelector("#menu-subtitle");
    if (!subtitle) return;
    const difficulty = selectedDifficultyConfig();
    subtitle.textContent = t("menu.subtitle", {
      playerLife: difficulty.playerMaxLife,
      altarLife: difficulty.altarMaxLife,
      soulsGoal: difficulty.soulsGoal
    });
  };

  const updateDifficultyUi = () => {
    const difficulty = selectedDifficultyConfig();
    for (const element of document.querySelectorAll("[data-souls-goal]")) {
      element.textContent = String(difficulty.soulsGoal);
    }
    for (const element of document.querySelectorAll("[data-player-max-life]")) {
      element.textContent = String(difficulty.playerMaxLife);
    }
    for (const element of document.querySelectorAll("[data-altar-max-life]")) {
      element.textContent = String(difficulty.altarMaxLife);
    }
    updateMenuSubtitle();
  };

  difficultySelect?.addEventListener("change", (event) => {
    selectedDifficulty = saveDifficultyPreference(bootStorage, event.target.value);
    event.target.value = selectedDifficulty;
    updateDifficultyUi();
  });
  updateDifficultyUi();

  const updateCharacterUi = () => {
    const char = CHARACTERS[selectedCharacter] ?? CHARACTERS[DEFAULT_CHARACTER];
    const nameEl = document.querySelector("#selected-character-name");
    const descEl = document.querySelector("#character-desc");
    const tradeoffEl = document.querySelector("#character-tradeoff");
    if (nameEl) nameEl.textContent = t(char.nameKey);
    if (descEl) descEl.textContent = t(char.descKey);
    if (tradeoffEl) tradeoffEl.textContent = t(char.tradeoffKey);
    for (const button of document.querySelectorAll(".character-option")) {
      const active = button.dataset.character === selectedCharacter;
      button.classList.toggle("active", active);
      button.setAttribute("aria-checked", active ? "true" : "false");
    }
  };
  updateCharacterUi();

  document.addEventListener("click", (event) => {
    const charBtn = event.target.closest(".character-option");
    if (charBtn && charBtn.dataset.character) {
      audio.unlock();
      audio.playSfx("button", 0.55);
      selectedCharacter = saveCharacterPreference(bootStorage, charBtn.dataset.character);
      updateCharacterUi();
    }
  });

  onLocaleChange((locale) => {
    if (languageSelect && languageSelect.value !== locale) {
      languageSelect.value = locale;
    }
    applyTranslations(document);
    updateMenuSubtitle();
    updateCharacterUi();
    updateAudioUi(audio);
    updateProgressionUi(progression);
    if (model.state === "defeat") {
      defeatReason.textContent = formatDefeatReason(model.defeatReason);
      defeatLevel.textContent = model.level.id === BALANCE.levels.currentId ? t("menu.district") : t("menu.scrap");
    } else if (model.state === "victory" && model.completedRun) {
      updateVictoryUi(model.completedRun);
    } else if (model.state === "survivalDefeat" && model.survivalResult) {
      updateSurvivalResultUi(model.survivalResult);
    }
  });
  if (resources.failures.length) {
    const failedUrls = resources.failures.map((failure) => failure.url);
    resourceWarning.hidden = false;
    resourceWarning.textContent = `ATENÇÃO: ${failedUrls.length} RECURSO(S) OPCIONAL(IS) INDISPONÍVEL(IS)`;
    resourceWarning.title = failedUrls.join("\n");
    console.warn("[BoyPunk optional resources]", failedUrls);
  }
  const setSaveTransferStatus = (message, failed = false) => {
    saveTransferStatus.hidden = !message;
    saveTransferStatus.textContent = message;
    saveTransferStatus.classList.toggle("is-error", failed);
  };

  const exportSaves = () => {
    const transfer = createSaveTransfer(progression, audio, gamepadPreferences);
    const blob = new Blob([`${JSON.stringify(transfer, null, 2)}\n`], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "boypunk-saves.json";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setSaveTransferStatus("Arquivo exportado: somente progresso, recordes bônus e preferências de áudio/controle.");
  };

  saveImportFile.addEventListener("change", async () => {
    const [file] = saveImportFile.files ?? [];
    saveImportFile.value = "";
    if (!file) return;
    try {
      const result = importSaveTransfer(await file.text(), progression, audio, gamepadPreferences);
      if (!result.valid) {
        setSaveTransferStatus("Arquivo inválido ou incompatível; nenhum save foi alterado.", true);
        return;
      }
      updateProgressionUi(progression);
      updateAudioUi(audio);
      const persisted = result.progression.persisted && result.audio.persisted && result.gamepad.persisted;
      setSaveTransferStatus(persisted
        ? "Importação concluída. Progresso e recordes foram mesclados; áudio e controle foram aplicados."
        : "Importado para esta sessão; o navegador não confirmou toda a persistência local.", !persisted);
    } catch {
      setSaveTransferStatus("Não foi possível ler o arquivo; nenhum save foi alterado.", true);
    }
  });

  const setControllerMappingStatus = (message, failed = false) => {
    controllerMappingStatus.hidden = !message;
    controllerMappingStatus.textContent = message;
    controllerMappingStatus.classList.toggle("is-error", failed);
  };

  const updateAxisOptions = (select, count, selected) => {
    const signature = `${count}:${selected ?? ""}`;
    if (select.dataset.signature === signature) return;
    select.replaceChildren(new Option("Não definido", ""));
    for (let index = 0; index < count; index += 1) select.add(new Option(`Eixo ${index}`, String(index)));
    select.value = selected === null ? "" : String(selected);
    select.dataset.signature = signature;
  };

  const refreshControllerUi = () => {
    const connections = gamepad.connectionList();
    const active = gamepad.activeConnection();
    const optionSignature = connections.map((connection) => `${connection.runtimeId}:${connection.id}`).join("|");
    if (controllerDevice.dataset.signature !== optionSignature) {
      controllerDevice.replaceChildren(new Option(
        connections.length ? "Pressione um botão ou selecione" : "Nenhum controle detectado",
        ""
      ));
      for (const connection of connections) {
        const suffix = connection.mapping === "standard" ? "padrão" : "genérico";
        controllerDevice.add(new Option(`${connection.id} (${suffix})`, connection.runtimeId));
      }
      controllerDevice.dataset.signature = optionSignature;
    }
    controllerDevice.value = active?.runtimeId ?? "";
    const status = gamepad.statusText();
    gamepadStatus.textContent = status;
    controllerOptionsStatus.textContent = status;
    const percentage = Math.round(gamepadPreferences.state.deadZone * 100);
    controllerDeadZone.value = String(percentage);
    controllerDeadZoneValue.value = `${percentage}%`;
    const diagnostic = gamepad.diagnostics();
    const buttons = diagnostic.buttons.length
      ? diagnostic.buttons.map((button) => `${button.index}:${button.value.toFixed(2)}`).join(", ") : "—";
    const axes = diagnostic.axes.length
      ? diagnostic.axes.map((axis) => `${axis.index}:${axis.value.toFixed(2)}`).join(", ") : "—";
    controllerLive.textContent = `Botões: ${buttons} · Eixos: ${axes}`;
    genericControllerSettings.hidden = !active || active.mapping === "standard";
    if (active?.mapping === "generic") {
      const profile = gamepadPreferences.profile(active.deviceKey);
      updateAxisOptions(controllerAxisHorizontal, active.gamepad.axes.length, profile.horizontalAxis);
      updateAxisOptions(controllerAxisVertical, active.gamepad.axes.length, profile.verticalAxis);
      controllerInvertHorizontal.checked = profile.invertHorizontal;
      controllerInvertVertical.checked = profile.invertVertical;
      for (const button of document.querySelectorAll("[data-gamepad-bind]")) {
        const action = button.dataset.gamepadBind;
        const index = profile.buttons[action];
        button.textContent = `${GAMEPAD_BINDING_LABELS[action]}: ${index === null ? "não definido" : `botão ${index}`}`;
      }
    }
    if (!controllerMappingStatus.textContent && gamepadPreferences.warning) {
      setControllerMappingStatus(gamepadPreferences.warning, true);
    }
  };

  const guidedSteps = () => [
    { kind: "button", action: "jump", label: "Confirmar / pular" },
    { kind: "button", action: "attack", label: "Atacar" },
    { kind: "button", action: "interact", label: "Depositar" },
    { kind: "button", action: "ability", label: "Habilidade de Nilo" },
    { kind: "button", action: "cancel", label: "Cancelar / voltar" },
    { kind: "button", action: "pause", label: "Pausar / continuar" },
    { kind: "direction", action: "right", orientation: "horizontal", desiredSign: 1, label: "mova para a direita" },
    { kind: "direction", action: "left", orientation: "horizontal", desiredSign: -1, label: "mova para a esquerda" },
    { kind: "direction", action: "menuDown", orientation: "vertical", desiredSign: 1, label: "mova para baixo" },
    { kind: "direction", action: "menuUp", orientation: "vertical", desiredSign: -1, label: "mova para cima" }
  ];

  const startNextGuidedStep = () => {
    let step = guidedMappingQueue.shift();
    const active = gamepad.activeConnection();
    while (step?.kind === "direction" && active) {
      const profile = gamepadPreferences.profile(active.deviceKey);
      const axis = step.orientation === "horizontal" ? profile.horizontalAxis : profile.verticalAxis;
      if (!Number.isInteger(axis)) break;
      step = guidedMappingQueue.shift();
    }
    if (!step) {
      guidedMappingActive = false;
      setControllerMappingStatus("Mapeamento concluído. Teste os comandos antes de voltar.");
      refreshControllerUi();
      return;
    }
    const started = step.kind === "button"
      ? gamepad.beginButtonCapture(step.action)
      : step.kind === "axis"
        ? gamepad.beginAxisCapture(step.orientation)
        : gamepad.beginDirectionCapture(step.action, step.orientation, step.desiredSign);
    if (!started) {
      guidedMappingQueue = [];
      guidedMappingActive = false;
      setControllerMappingStatus("Selecione um controle genérico ativo para mapear.", true);
      return;
    }
    setControllerMappingStatus(`Solte os comandos e então ${step.kind === "button" ? `pressione: ${step.label}` : step.label}.`);
  };

  controllerDevice.addEventListener("change", () => {
    gamepad.cancelCapture();
    guidedMappingQueue = [];
    guidedMappingActive = false;
    if (controllerDevice.value) gamepad.selectConnection(controllerDevice.value);
    setControllerMappingStatus(controllerDevice.value ? "Controle atribuído ao jogador 1. Solte os comandos antes de usar." : "");
    refreshControllerUi();
  });
  controllerDeadZone.addEventListener("input", () => {
    gamepadPreferences.setDeadZone(Number(controllerDeadZone.value) / 100);
    controllerDeadZoneValue.value = `${controllerDeadZone.value}%`;
  });
  controllerAxisHorizontal.addEventListener("change", () => {
    const active = gamepad.activeConnection();
    if (active) gamepadPreferences.setAxis(active.deviceKey, "horizontal", controllerAxisHorizontal.value === "" ? null : Number(controllerAxisHorizontal.value));
  });
  controllerAxisVertical.addEventListener("change", () => {
    const active = gamepad.activeConnection();
    if (active) gamepadPreferences.setAxis(active.deviceKey, "vertical", controllerAxisVertical.value === "" ? null : Number(controllerAxisVertical.value));
  });
  controllerInvertHorizontal.addEventListener("change", () => {
    const active = gamepad.activeConnection();
    if (active) gamepadPreferences.setAxisInverted(active.deviceKey, "horizontal", controllerInvertHorizontal.checked);
  });
  controllerInvertVertical.addEventListener("change", () => {
    const active = gamepad.activeConnection();
    if (active) gamepadPreferences.setAxisInverted(active.deviceKey, "vertical", controllerInvertVertical.checked);
  });
  document.addEventListener("click", (event) => {
    const binding = event.target.closest("[data-gamepad-bind]");
    if (binding) {
      guidedMappingQueue = [];
      guidedMappingActive = false;
      const action = binding.dataset.gamepadBind;
      if (gamepad.beginButtonCapture(action)) {
        setControllerMappingStatus(`Solte os comandos e pressione o botão para: ${GAMEPAD_BINDING_LABELS[action]}.`);
      } else setControllerMappingStatus("Selecione um controle genérico ativo para remapear.", true);
      return;
    }
    const controllerAction = event.target.closest("[data-controller-ui]")?.dataset.controllerUi;
    if (controllerAction === "guided-map") {
      guidedMappingQueue = guidedSteps();
      guidedMappingActive = true;
      startNextGuidedStep();
    }
    if (controllerAction === "restore-defaults") {
      gamepad.cancelCapture();
      guidedMappingQueue = [];
      guidedMappingActive = false;
      const active = gamepad.activeConnection();
      if (active) gamepadPreferences.resetDevice(active.deviceKey);
      else gamepadPreferences.setDeadZone(0.22);
      setControllerMappingStatus(active?.mapping === "standard"
        ? "Mapeamento padrão restaurado."
        : "Perfil genérico limpo. Execute o mapeamento guiado para configurá-lo.");
      refreshControllerUi();
    }
  });

  const startGame = (levelId = BALANCE.levels.currentId) => {
    const status = progression.levelStatus(levelId);
    if (!status?.available || !status.unlocked) return false;
    director?.stop();
    guidedMappingQueue = [];
    guidedMappingActive = false;
    audio.unlock();
    audio.playSfx("start", 0.8);
    input.consumeTransitionInput();
    gameStatus.textContent = "";
    model.random = Math.random;
    model.startRun({
      demo: false,
      progressionEligible: !testMode,
      levelId,
      difficulty: selectedDifficulty,
      characterId: selectedCharacter
    });
    audio.playMusic("battle");
    menuTimer.reset();
    showState(model.state, false);
    canvas.focus();
    return true;
  };

  const startSurvival = () => {
    director?.stop();
    guidedMappingQueue = [];
    guidedMappingActive = false;
    audio.unlock();
    audio.playSfx("start", 0.8);
    input.clear();
    gameStatus.textContent = "";
    model.random = Math.random;
    model.startSurvival({ characterId: selectedCharacter });
    audio.playMusic("battle");
    menuTimer.reset();
    showState(model.state, false);
    canvas.focus();
    return true;
  };

  const goToMenu = () => {
    if (directCoopMode) {
      enterCoopLobby();
      return;
    }
    director?.stop();
    guidedMappingQueue = [];
    guidedMappingActive = false;
    input.clear();
    gameStatus.textContent = "";
    model.goToMenu();
    menuTimer.reset();
    audio.playMusic("menu");
    showState(model.state, false);
  };

  const startBonusPreview = () => {
    director?.stop();
    input.consumeTransitionInput();
    gameStatus.textContent = "Prévia de desenvolvimento da Câmara de Energia. Resultados não serão salvos.";
    if (!model.startBonusPreview(BALANCE.levels.currentId)) return false;
    audio.playMusic("battle");
    menuTimer.reset();
    showState(model.state, false);
    canvas.focus();
    return true;
  };

  const startPatrolShooterPreview = () => {
    director?.stop();
    input.consumeTransitionInput();
    gameStatus.textContent = "Prévia de desenvolvimento do atirador de patrulha. Resultados não serão salvos.";
    if (!model.startPatrolShooterPreview()) return false;
    audio.playMusic("battle");
    menuTimer.reset();
    showState(model.state, false);
    canvas.focus();
    return true;
  };

  const updateCoopLobbyUi = () => {
    if (!coopGamepads) return;
    const status = coopGamepads.status();
    const p1 = status.assignments[1];
    const p2 = status.assignments[2];
    if (coopP1Device) coopP1Device.textContent = status.layout === "keyboard-gamepad"
      ? "Teclado pronto"
      : p1 ? `Controle: ${p1.id}` : "Pressione um botão no controle";
    if (coopP2Device) coopP2Device.textContent = p2
      ? `Controle: ${p2.id}`
      : "Pressione um botão no controle";
    if (coopStartButton) coopStartButton.disabled = !status.ready;
    if (coopLobbyStatus) {
      const needsProfile = [p1, p2].some((assignment) => assignment && !assignment.profileConfigured);
      coopLobbyStatus.textContent = needsProfile
        ? "Controle genérico sem perfil completo. Configure-o em Opções no jogo normal e reabra esta prévia."
        : status.ready
        ? "Dispositivos prontos. Inicie somente depois de soltar todos os comandos."
        : "Pressione deliberadamente um botão para atribuir cada controle. Movimento de eixo não atribui dispositivos.";
    }
    if (gamepadStatus) gamepadStatus.textContent = status.ready
      ? "Coop: dispositivos prontos."
      : "Coop: aguardando atribuição deliberada de controle.";
    if (coopPauseWarning && model.state === "paused" && model.coopInterruptedPlayer) {
      coopPauseWarning.hidden = false;
      coopPauseWarning.textContent = status.ready
        ? `P${model.coopInterruptedPlayer} reconectado/reatribuído. Pressione Continuar deliberadamente.`
        : `Controle de P${model.coopInterruptedPlayer} desconectado. Pressione um botão em outro controle para reatribuir.`;
    }
    const resumeButton = document.querySelector('[data-ui="resume"]');
    if (directCoopMode && resumeButton) resumeButton.disabled = Boolean(model.coopResumeBlocked);
  };

  const enterCoopLobby = () => {
    if (!coopGamepads) return false;
    director?.stop();
    input.clear();
    coopGamepads.assignmentEnabled = true;
    model.enterCoopLobby();
    const eyebrow = document.querySelector("#coop-lobby-eyebrow");
    const title = document.querySelector("#coop-lobby-title");
    const description = document.querySelector("#coop-lobby-description");
    if (directCoopSurvival) {
      if (eyebrow) eyebrow.textContent = "COOP LOCAL // SOBREVIVÊNCIA";
      if (title) title.textContent = "Sobrevivência em dupla";
      if (description) description.textContent = "P1 é BoyPunk; P2 é Nilo. Pickups e efeitos são individuais; a sessão não salva progresso nem recordes.";
    }
    model.coopResumeBlocked = false;
    model.coopInterruptedPlayer = null;
    if (coopPauseWarning) coopPauseWarning.hidden = true;
    audio.playMusic("menu");
    showState(model.state, false);
    updateCoopLobbyUi();
    return true;
  };

  const startCoopPreview = () => {
    if (!coopGamepads?.ready()) return false;
    director?.stop();
    audio.unlock();
    audio.playSfx("start", 0.8);
    coopGamepads.assignmentEnabled = false;
    coopGamepads.consumeTransitionInput();
    input.consumeTransitionInput();
    model.random = Math.random;
    model.startCoopPreview();
    audio.playMusic("battle");
    gameStatus.textContent = "Prévia cooperativa local. Nenhum progresso ou resultado será salvo.";
    showState(model.state, false);
    canvas.focus();
    return true;
  };

  const startCoopSurvival = () => {
    if (!coopGamepads?.ready()) return false;
    director?.stop();
    audio.unlock();
    audio.playSfx("start", 0.8);
    coopGamepads.assignmentEnabled = false;
    coopGamepads.consumeTransitionInput();
    input.consumeTransitionInput();
    model.random = Math.random;
    model.startCoopSurvival();
    audio.playMusic("battle");
    gameStatus.textContent = "Sobrevivência cooperativa local · P1 BoyPunk + P2 Nilo";
    showState(model.state, false);
    canvas.focus();
    return true;
  };

  const startCoopSession = () => directCoopSurvival ? startCoopSurvival() : startCoopPreview();

  const restartCurrent = () => model.coopPreview
    ? startCoopSession()
    : model.gameMode === "survival"
    ? startSurvival()
    : model.patrolShooterPreview
      ? startPatrolShooterPreview()
    : model.bonusPreview
      ? startBonusPreview()
      : startGame(originatingLevelId());

  const originatingLevelId = () => model.bonusOriginStats?.levelId ?? model.completedRun?.levelId ?? model.levelId;

  const updateBonusResultUi = (result, saved) => {
    bonusResultTitle.textContent = result.reason === "skipped"
      ? t("bonus.result.skipped")
      : result.completedAll ? t("bonus.result.cleared") : t("bonus.result.timeUp");
    bonusOriginLevel.textContent = result.originLevelId === BALANCE.levels.currentId ? t("menu.district") : t("menu.scrap");
    bonusResultSouls.textContent = String(result.collected);
    bonusRunScore.textContent = String(result.score);
    bonusSavedBest.textContent = String(saved.savedBest);
    bonusNewPoints.textContent = `+${saved.newlyEarned}`;
    const scrap = progression.levelStatus(BALANCE.levels.nextId);
    const canContinue = result.originLevelId === BALANCE.levels.currentId && scrap?.unlocked && scrap?.available;
    bonusContinueNext.hidden = !canContinue;
    bonusContinueNext.disabled = !canContinue;
    const bonusReplay = document.querySelector("#bonus-replay");
    if (bonusReplay) {
      if (canContinue) {
        bonusReplay.classList.remove("primary");
      } else {
        bonusReplay.classList.add("primary");
      }
    }
    updateWarning(bonusProgressionWarning, progression.snapshot().warning);
  };

  function updateSurvivalResultUi(result) {
    survivalResultWave.textContent = t("survival.wave", { wave: result.wave });
    survivalResultTime.textContent = formatSurvivalTime(result.activeSeconds);
    survivalResultKills.textContent = String(result.kills);
    survivalHighScoreElement.textContent = `${t("survival.wave", { wave: survivalHighScore.wave })} · ${formatSurvivalTime(survivalHighScore.activeSeconds)}`;
  }

  const startDemo = (entry = "manual") => {
    input.clear();
    director.start(entry);
    menuTimer.reset();
    audio.playMusic("battle");
    showState(model.state, true);
  };

  director = new AttractDirector(model, {
    onRunStart: () => {
      input.clear();
      demoOverlay.classList.remove("is-restarting");
      audio.playMusic("battle");
      showState(model.state, true);
    },
    onRestartPending: () => demoOverlay.classList.add("is-restarting"),
    onAbort: () => goToMenu()
  });
  const menuTimer = new MenuInactivityTimer({ onElapsed: () => startDemo("idle") });

  input.onBlur = () => {
    if (["playing", "bonusPlaying", "survival"].includes(model.state) && !director.active) model.pause();
  };

  const unlockMenuAudio = () => {
    audio.unlock();
    if (model.state === "menu" && !director.active) audio.playMusic("menu");
  };
  document.addEventListener("pointerdown", unlockMenuAudio, { once: true });
  document.addEventListener("touchstart", unlockMenuAudio, { once: true, passive: true });
  document.addEventListener("keydown", unlockMenuAudio, { once: true });

  document.addEventListener("click", (event) => {
    if (suppressNextClick) {
      suppressNextClick = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  const uiActionStates = Object.freeze({
    play: ["menu"], survival: ["menu"], "survival-coop": ["menu"], "play-factory": ["menu"], demo: ["menu"],
    options: ["menu"], credits: ["menu"], back: ["options", "credits"],
    resume: ["paused"], restart: ["paused", "victory", "defeat"],
    "coop-start": ["coopLobby"], "coop-clear": ["coopLobby"], "coop-exit": ["coopLobby"],
    "coop-retry": ["coopResult"], "coop-lobby": ["coopResult"],
    "survival-retry": ["survivalDefeat"], "continue-next": ["victory"],
    "skip-bonus": ["bonusTransition"],
    "bonus-continue-next": ["bonusComplete"], "bonus-replay": ["bonusComplete"],
    menu: ["paused", "victory", "bonusComplete", "defeat", "survivalDefeat", "coopResult"],
    mute: ["options"], "export-saves": ["options"], "import-saves": ["options"]
  });
  const transitionUiActions = new Set([
    "play", "survival", "survival-coop", "play-factory", "demo", "options", "credits", "back", "resume", "restart",
    "coop-start", "coop-retry", "coop-lobby", "coop-exit", "survival-retry", "continue-next", "skip-bonus",
    "bonus-continue-next", "bonus-replay", "menu"
  ]);
  const activateUiAction = (action) => {
    const allowedStates = uiActionStates[action];
    if (!allowedStates?.includes(model.state)) return false;
    if (transitionUiActions.has(action)) {
      input.consumeTransitionInput();
      gamepadNavigation.reset();
    }
    audio.unlock();
    audio.playSfx("button", 0.55);
    switch (action) {
      case "play": startGame(BALANCE.levels.currentId); break;
      case "survival": startSurvival(); break;
      case "survival-coop": location.assign(`${location.pathname}?coop-survival=1`); break;
      case "play-factory": startGame(BALANCE.levels.nextId); break;
      case "demo": startDemo("manual"); break;
      case "options": model.showOptions(); break;
      case "credits": model.showCredits(); break;
      case "back": goToMenu(); break;
      case "resume": model.resume(); canvas.focus(); break;
      case "restart": restartCurrent(); break;
      case "coop-start": startCoopSession(); break;
      case "coop-clear": coopGamepads?.clearAssignments(); updateCoopLobbyUi(); break;
      case "coop-exit": location.assign(location.pathname); break;
      case "coop-retry": startCoopSession(); break;
      case "coop-lobby": enterCoopLobby(); break;
      case "survival-retry": directCoopSurvival ? startCoopSurvival() : startSurvival(); break;
      case "continue-next": startGame(BALANCE.levels.nextId); break;
      case "skip-bonus": model.skipBonus(); break;
      case "bonus-continue-next": startGame(BALANCE.levels.nextId); break;
      case "bonus-replay": restartCurrent(); break;
      case "menu": goToMenu(); break;
      case "mute": audio.setMuted(!audio.preferences.muted); updateAudioUi(audio); break;
      case "export-saves": exportSaves(); break;
      case "import-saves": saveImportFile.click(); break;
      default: return false;
    }
    return true;
  };

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-ui]");
    if (button) activateUiAction(button.dataset.ui);
  });

  volumeInput.addEventListener("input", () => {
    audio.setVolume(Number(volumeInput.value) / 100);
    updateAudioUi(audio);
  });
  pauseTouch.addEventListener("click", () => input.pulse("pause"));
  coopLayout?.addEventListener("change", () => {
    if (!coopGamepads) return;
    coopGamepads.setLayout(coopLayout.value);
    input.setKeyboardSlots(coopGamepads.layout === "keyboard-gamepad" ? [1] : []);
    updateCoopLobbyUi();
  });

  const currentControllerScreen = () => screens.get(model.state) ?? null;
  const controllerFocusables = () => {
    const screen = currentControllerScreen();
    if (!screen || screen.hidden) return [];
    return [...screen.querySelectorAll("button, select, input:not([type=file])")]
      .filter((element) => !element.disabled && !element.hidden && !element.closest("[hidden]"));
  };
  const focusControllerDefault = () => {
    const preferred = {
      menu: '[data-ui="play"]',
      coopLobby: '[data-ui="coop-start"]:not([disabled]), [data-ui="coop-clear"]',
      coopResult: '[data-ui="coop-retry"]',
      paused: '[data-ui="resume"]',
      victory: '#continue-next:not([hidden]):not([disabled]), [data-ui="restart"]',
      bonusTransition: '[data-ui="skip-bonus"]',
      bonusComplete: '#bonus-continue-next:not([hidden]):not([disabled]), [data-ui="bonus-replay"]',
      defeat: '[data-ui="restart"]',
      survivalDefeat: '[data-ui="survival-retry"]'
    }[model.state];
    const screen = currentControllerScreen();
    (preferred ? screen?.querySelector(preferred) : controllerFocusables()[0])?.focus();
  };
  const moveControllerFocus = (direction) => {
    const focusables = controllerFocusables();
    if (!focusables.length) return;
    const active = document.activeElement;
    if (["left", "right"].includes(direction) && focusables.includes(active)) {
      if (active.matches('input[type="range"]')) {
        const step = Number(active.step) || 1;
        const delta = direction === "left" ? -step : step;
        active.value = String(Math.max(Number(active.min), Math.min(Number(active.max), Number(active.value) + delta)));
        active.dispatchEvent(new Event("input", { bubbles: true }));
        return;
      }
      if (active.matches("select") && active.options.length) {
        const delta = direction === "left" ? -1 : 1;
        active.selectedIndex = Math.max(0, Math.min(active.options.length - 1, active.selectedIndex + delta));
        active.dispatchEvent(new Event("change", { bubbles: true }));
        return;
      }
    }
    const current = focusables.indexOf(active);
    const delta = ["up", "left"].includes(direction) ? -1 : 1;
    const next = current < 0 ? 0 : (current + delta + focusables.length) % focusables.length;
    focusables[next].focus();
    focusables[next].scrollIntoView?.({ block: "nearest" });
  };
  const activateFocusedUiTarget = () => {
    const focusables = controllerFocusables();
    if (!focusables.includes(document.activeElement)) focusControllerDefault();
    return confirmUiTarget(document.activeElement);
  };
  const controllerBack = () => {
    if (["options", "credits"].includes(model.state)) goToMenu();
    else if (model.state === "paused") { model.resume(); input.consumeTransitionInput(); canvas.focus(); }
    else if (model.state === "bonusTransition") { input.consumeTransitionInput(); model.skipBonus(); }
    else if (["victory", "bonusComplete", "defeat", "survivalDefeat"].includes(model.state)) goToMenu();
  };

  const handleUiNavigationEvents = (navigationEvents) => {
    for (const navigationEvent of navigationEvents) {
      if (["up", "down", "left", "right"].includes(navigationEvent)) {
        moveControllerFocus(navigationEvent);
      } else if (navigationEvent === "confirm") activateFocusedUiTarget();
      else if (navigationEvent === "cancel") controllerBack();
      else if (navigationEvent === "pause" && model.state === "paused") {
        activateUiAction("resume");
      }
    }
  };

  const handleCoopGamepadFrame = (time) => {
    if (!coopGamepads) return;
    coopGamepads.poll();
    const events = coopGamepads.drainEvents();
    for (const event of events) {
      if (event.type === "disconnected" && event.assignedSlot) {
        input.clear();
        if (["playing", "paused"].includes(model.state)) {
          if (model.state === "playing") model.pause();
          model.coopInterruptedPlayer = event.assignedSlot;
          model.coopResumeBlocked = true;
          coopGamepads.assignmentEnabled = true;
          gameStatus.textContent = `Controle de P${event.assignedSlot} desconectado. Sessão pausada.`;
        }
      }
      if (event.type === "assigned") {
        gameStatus.textContent = `Controle atribuído a P${event.slot}. Solte todos os comandos.`;
        if (model.state === "paused" && model.coopInterruptedPlayer && coopGamepads.ready()) {
          model.coopResumeBlocked = false;
          coopGamepads.assignmentEnabled = false;
        }
      }
    }
    updateCoopLobbyUi();
    if (["playing", "bonusPlaying", "survival"].includes(model.state)) return;
    const snapshots = [coopGamepads.snapshot(1), coopGamepads.snapshot(2)];
    const combined = { held: new Set(), pressed: new Set(), released: new Set() };
    for (const snapshot of snapshots) {
      for (const action of snapshot.held) combined.held.add(action);
      for (const action of snapshot.pressed) combined.pressed.add(action);
      for (const action of snapshot.released) combined.released.add(action);
    }
    const navigationEvents = gamepadNavigation.update(combined, time);
    handleUiNavigationEvents(navigationEvents);
    if (navigationEvents.length) {
      coopGamepads.consumeEdges(1);
      coopGamepads.consumeEdges(2);
    }
  };

  const handleGamepadFrame = (time) => {
    if (coopGamepads) {
      handleCoopGamepadFrame(time);
      return;
    }
    const snapshot = gamepad.poll();
    const events = gamepad.drainEvents();
    for (const event of events) {
      if (event.type === "captureComplete") {
        const label = event.kind === "button"
          ? `${GAMEPAD_BINDING_LABELS[event.action]} = botão ${event.index}`
          : event.kind === "directionButton"
            ? `${GAMEPAD_BINDING_LABELS[event.action]} = botão ${event.index}`
            : `Eixo ${event.orientation === "horizontal" ? "horizontal" : "vertical"} = ${event.index}`;
        setControllerMappingStatus(`${label}. Solte o comando para continuar.`);
        if (guidedMappingActive) startNextGuidedStep();
      }
      if (event.type === "disconnected" && event.active) {
        input.clear();
        if (["playing", "bonusPlaying", "survival"].includes(model.state) && !director.active) model.pause();
        gameStatus.textContent = "Controle desconectado. O jogo foi pausado; teclado e toque continuam disponíveis.";
        setControllerMappingStatus("Controle ativo desconectado. Reconecte e pressione um botão, ou escolha outro dispositivo.", true);
      }
      if (event.type === "activated") {
        setControllerMappingStatus("Controle atribuído ao jogador 1. Solte os comandos antes de usar.");
        const active = gamepad.activeConnection();
        if (active?.mapping === "generic" && !gamepadPreferences.profileConfigured(active.deviceKey)
          && model.state === "menu" && !director.active) {
          model.showOptions();
          guidedMappingQueue = guidedSteps();
          guidedMappingActive = true;
          startNextGuidedStep();
        }
      }
    }
    const meaningful = gamepad.takeMeaningfulActivity();
    if (meaningful) {
      audio.unlock();
      if (model.state === "menu" && !director.active && pageVisible) menuTimer.reset();
    }
    if (director.active && meaningful) {
      input.consumeTransitionInput();
      gamepadNavigation.reset();
      goToMenu();
      refreshControllerUi();
      return;
    }
    if (time - lastControllerUiAt >= 100 || events.length) {
      refreshControllerUi();
      lastControllerUiAt = time;
    }
    if (["playing", "bonusPlaying", "survival"].includes(model.state)) return;
    if (gamepad.capture) return;
    const navigationEvents = gamepadNavigation.update(snapshot, time);
    if (navigationEvents.length && model.state === "menu" && pageVisible) menuTimer.reset();
    handleUiNavigationEvents(navigationEvents);
    if (navigationEvents.length) gamepad.consumeEdges();
  };

  const recordMenuInteraction = (event) => {
    if (event.type === "keydown" && event.repeat) return;
    if (model.state === "menu" && !director.active && pageVisible) menuTimer.reset();
  };
  window.addEventListener("keydown", recordMenuInteraction, true);
  window.addEventListener("pointerdown", recordMenuInteraction, true);
  window.addEventListener("wheel", recordMenuInteraction, { capture: true, passive: true });

  window.addEventListener("pointerdown", (event) => {
    if (!director.active || event.isPrimary === false) return;
    pointerStarts.set(event.pointerId, { x: event.clientX, y: event.clientY, time: performance.now() });
  }, true);
  window.addEventListener("pointerup", (event) => {
    if (!director.active || event.isPrimary === false || event.button !== 0) return;
    const start = pointerStarts.get(event.pointerId);
    pointerStarts.delete(event.pointerId);
    if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 12
      || performance.now() - start.time > 1500) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    suppressNextClick = true;
    setTimeout(() => { suppressNextClick = false; }, 0);
    audio.unlock();
    goToMenu();
  }, true);
  window.addEventListener("pointercancel", (event) => pointerStarts.delete(event.pointerId), true);

  window.addEventListener("keydown", (event) => {
    if (!director.active || !["Enter", "Space", "Escape"].includes(event.code)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    consumedExitCodes.add(event.code);
    audio.unlock();
    goToMenu();
  }, true);
  window.addEventListener("keydown", (event) => {
    if (!consumedExitCodes.has(event.code)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
  window.addEventListener("keyup", (event) => {
    if (!consumedExitCodes.delete(event.code)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    input.clear();
  }, true);

  window.addEventListener("keydown", (event) => {
    const screen = currentControllerScreen();
    if (!screen || screen.hidden || director.active || isUiInputTarget(event.target)) return;
    const direction = {
      ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right"
    }[event.code];
    if (direction) {
      event.preventDefault();
      event.stopImmediatePropagation();
      moveControllerFocus(direction);
      return;
    }
    if (!["Enter", "Space", "Escape"].includes(event.code)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!uiPressGate.press(event.code, { repeat: event.repeat })) return;
    if (event.code === "Escape") controllerBack();
    else activateFocusedUiTarget();
  }, true);
  window.addEventListener("keyup", (event) => uiPressGate.release(event.code), true);
  window.addEventListener("blur", () => uiPressGate.clear());

  document.addEventListener("visibilitychange", () => {
    pageVisible = !document.hidden;
    input.clear();
    uiPressGate.clear();
    gamepadNavigation.reset();
    accumulator = 0;
    lastTime = performance.now();
  });

  function processEvents() {
    for (const event of model.consumeEvents()) {
      if (event.runId !== model.runId) continue;
      processedEventCounts.set(event.type, (processedEventCounts.get(event.type) ?? 0) + 1);
      switch (event.type) {
        case "attack": audio.playSfx("attack", 0.55); break;
        case "jump": audio.playSfx("button", event.double ? 0.22 : 0.14); break;
        case "soulCollected": audio.playSfx("collect", 0.72); break;
        case "powerUpCollected":
          gameStatus.textContent = event.id === "double-burst"
            ? t("powerup.doubleBurst.acquired")
            : `${event.id ?? "power-up"} obtido`;
          audio.playSfx("collect", 0.72);
          break;
        case "bonusSoulCollected": audio.playSfx("collect", 0.5); break;
        case "bonusCannonWarning":
          gameStatus.textContent = "Canhão de energia mirando. A direção será travada antes do disparo.";
          audio.playSfx("button", 0.24);
          break;
        case "bonusCannonFired": audio.playSfx("attack", 0.3); break;
        case "bonusCannonHit":
          gameStatus.textContent = "Canhão atingiu BoyPunk: menos 1 segundo.";
          audio.playBonusPenalty();
          break;
        case "soulsDeposited": audio.playSfx("deposit", 0.8); break;
        case "playerDamaged":
          audio.playSfx("damage", 0.78); renderer.shake(3); break;
        case "altarDamaged": audio.playSfx("damage", 0.78); renderer.shake(2); break;
        case "altarCritical": audio.playAltarWarning(); break;
        case "pressWarning":
          gameStatus.textContent = "Atenção: prensa industrial prestes a fechar.";
          audio.playSfx("button", 0.3);
          break;
        case "pressClosing": gameStatus.textContent = "Prensa industrial fechando."; break;
        case "projectileBlocked": audio.playSfx("button", 0.24); break;
        case "enemyDefeated": audio.playSfx("collect", 0.28); break;
        case "coopPlayerDefeated":
          gameStatus.textContent = `P${event.slot} ficou inativo até a próxima tentativa.`;
          audio.playSfx("damage", 0.9);
          break;
        case "coopVictory":
        case "coopDefeat": {
          input.consumeTransitionInput();
          audio.stopMusic();
          audio.playSfx(event.type === "coopVictory" ? "deposit" : "damage", 1);
          const result = event.result;
          if (coopResultTitle) coopResultTitle.textContent = event.type === "coopVictory" ? "Distrito protegido!" : "Sessão encerrada";
          if (coopResultReason) coopResultReason.textContent = result.reason;
          if (coopResultSouls) coopResultSouls.textContent = `${result.soulsDeposited}/${result.soulsTarget}`;
          if (coopResultAltar) coopResultAltar.textContent = `${result.altarLife}/${model.objective.altarMaxLife}`;
          if (coopResultPlayers) coopResultPlayers.textContent = result.players.map((player) => player.life).join(" / ");
          break;
        }
        case "survivalWaveStarted":
          gameStatus.textContent = t("survival.wave", { wave: event.wave });
          if (event.wave > 1) audio.playSfx("start", 0.5);
          break;
        case "survivalWaveCleared":
          gameStatus.textContent = `${t("survival.wave", { wave: event.wave })} ✓`;
          audio.playSfx("deposit", 0.5);
          break;
        case "survivalEnded":
          audio.stopMusic();
          audio.playSfx("damage", 1);
          input.consumeTransitionInput();
          survivalHighScore = saveSurvivalHighScore(bootStorage, survivalHighScore, event.result);
          updateSurvivalResultUi(event.result);
          break;
        case "victory": {
          audio.stopMusic();
          audio.playSfx("deposit", 1);
          input.consumeTransitionInput();
          if (!event.demoMode && event.stats) updateVictoryUi(event.stats);
          const result = applyVictoryProgression(progression, event);
          if (!result.ignored) {
            updateProgressionUi(progression);
            updateWarning(victoryProgressionWarning, progression.snapshot().warning);
          }
          const qualification = calculateBonusQualification(event.stats, {
            eligible: !event.demoMode && event.progressionEligible && event.bonusQualificationEligible !== false
          });
          if (qualification.qualified && model.queueBonusQualification(qualification, event.stats)) {
            bonusQualificationPoints.textContent = String(qualification.points);
          }
          break;
        }
        case "bonusQualified":
          input.consumeTransitionInput();
          gameStatus.textContent = `Bônus conquistado. ${event.qualification.points} pontos de qualificação.`;
          break;
        case "bonusStarted":
          input.consumeTransitionInput();
          audio.playMusic("battle");
          gameStatus.textContent = event.preview
            ? "Prévia da Câmara de Energia iniciada. Você tem 20 segundos; nenhum resultado será salvo."
            : "Câmara de Energia iniciada. Você tem 20 segundos.";
          canvas.focus();
          break;
        case "bonusComplete": {
          input.consumeTransitionInput();
          audio.stopMusic();
          if (event.demoMode || processedBonusCompletions.has(event.runId)) break;
          processedBonusCompletions.add(event.runId);
          const saved = event.progressionEligible
            ? progression.recordBonusResult(event.result.originLevelId, event.result.score)
            : {
                savedBest: progression.snapshot().bonusBestScores[event.result.originLevelId] ?? 0,
                newlyEarned: 0,
                persisted: false,
                changed: false,
                ignored: true
              };
          updateBonusResultUi(event.result, saved);
          if (event.progressionEligible) updateProgressionUi(progression);
          if (event.preview) {
            bonusResultTitle.textContent = t("bonus.result.preview");
            bonusContinueNext.hidden = true;
            updateWarning(bonusProgressionWarning, t("bonus.result.previewWarning"));
          }
          audio.playSfx(event.result.completedAll ? "deposit" : "button", event.result.completedAll ? 0.9 : 0.45);
          break;
        }
        case "defeat": audio.stopMusic(); audio.playSfx("damage", 1); break;
      }
    }
  }

  function loop(time) {
    if (!pageVisible) {
      lastTime = time;
      accumulator = 0;
      requestAnimationFrame(loop);
      return;
    }
    handleGamepadFrame(time);
    const frameDelta = Math.min((time - lastTime) / 1000, 0.1);
    lastTime = time;
    menuTimer.update(frameDelta, { eligible: model.state === "menu" && !director.active, visible: pageVisible });
    accumulator += frameDelta;
    let firstStep = true;
    while (accumulator >= fixedStep) {
      if (director.active) {
        director.step(fixedStep);
      } else if (coopGamepads) {
        const p1 = input.snapshot(1);
        const p2 = input.snapshot(2);
        if (!firstStep) {
          for (const snapshot of [p1, p2]) {
            snapshot.jumpPressed = false;
            snapshot.attackPressed = false;
            snapshot.interactPressed = false;
            snapshot.pausePressed = false;
            snapshot.abilityPressed = false;
          }
        }
        model.update(fixedStep, { players: { 1: p1, 2: p2 } });
      } else {
        const snapshot = firstStep ? input.snapshot() : {
          ...input.snapshot(),
          jumpPressed: false,
          attackPressed: false,
          interactPressed: false,
          pausePressed: false
        };
        model.update(fixedStep, snapshot);
      }
      if (firstStep) {
        input.consumeEdges(1);
        if (coopGamepads) input.consumeEdges(2);
      }
      firstStep = false;
      accumulator -= fixedStep;
    }

    processEvents();
    if (model.state !== previousState || director.active !== previousDemoActive) {
      showState(model.state, director.active);
      if (model.state === "defeat" && !director.active) {
        defeatReason.textContent = formatDefeatReason(model.defeatReason);
        defeatLevel.textContent = model.level.id === BALANCE.levels.currentId ? t("menu.district") : t("menu.scrap");
        defeatSouls.textContent = String(model.altar.deposited);
        defeatSoulsGoal.textContent = String(model.objective.soulsGoal);
        defeatPlayerLife.textContent = String(model.player.life);
        defeatAltarLife.textContent = String(model.altar.life);
      }
      if (model.state === "survivalDefeat" && !director.active && model.survivalResult) {
        updateSurvivalResultUi(model.survivalResult);
      }
      if (model.state === "menu" && !director.active) audio.playMusic("menu");
      if (model.state === "bonusTransition" && !director.active) skipBonusButton.focus();
      if (model.state === "bonusComplete" && !director.active) {
        (bonusContinueNext.hidden ? document.querySelector('[data-ui="bonus-replay"]') : bonusContinueNext)?.focus();
      }
      if (!director.active && currentControllerScreen()) focusControllerDefault();
      previousState = model.state;
      previousDemoActive = director.active;
    }
    demoOverlay.classList.toggle("is-restarting", director.active && director.restartRemaining > 0);
    renderer.render(model, time / 1000);
    requestAnimationFrame(loop);
  }

  const testApi = {
    ready: true,
    model,
    i18n: {
      getLocale,
      setLocale,
      t
    },
    snapshot: () => model.snapshot(),
    input: () => input.snapshot(),
    start: () => startGame(BALANCE.levels.currentId),
    startSurvival,
    startPatrolShooterPreview,
    survivalHighScore: () => ({ ...survivalHighScore }),
    selectCharacter: (id) => {
      selectedCharacter = saveCharacterPreference(bootStorage, id);
      updateCharacterUi();
      return selectedCharacter;
    },
    selectedCharacter: () => selectedCharacter,
    character: () => model.character,
    startLevel: (levelId) => startGame(levelId),
    restart: restartCurrent,
    startDemo,
    exitDemo: goToMenu,
    demo: () => director.diagnostics(),
    menuInactivity: () => menuTimer.snapshot(),
    advanceMenuInactivity: (seconds) => menuTimer.update(seconds, {
      eligible: model.state === "menu" && !director.active,
      visible: pageVisible
    }),
    stepDemo: (seconds) => {
      const steps = Math.max(0, Math.ceil(seconds / fixedStep));
      for (let index = 0; index < steps && director.active; index += 1) director.step(fixedStep);
      processEvents();
      return { snapshot: model.snapshot(), demo: director.diagnostics() };
    },
    pause: () => model.pause(),
    resume: () => model.resume(),
    assetFailures: resources.failures.map((failure) => failure.url),
    objective: () => ({
      levelId: model.levelId,
      difficulty: model.difficultyId,
      soulsGoal: model.objective.soulsGoal,
      playerMaxLife: model.playerMaxLife,
      altarMaxLife: model.objective.altarMaxLife
    }),
    setAudio: (volume, muted) => {
      if (Number.isFinite(volume)) audio.setVolume(volume);
      if (typeof muted === "boolean") audio.setMuted(muted);
      updateAudioUi(audio);
      return audio.diagnostics();
    },
    audio: () => ({ ...audio.preferences, ...audio.diagnostics() }),
    gamepad: () => ({
      available: gamepad.available,
      connections: gamepad.connectionList(),
      active: gamepad.activeConnection()?.runtimeId ?? null,
      preferences: gamepadPreferences.snapshot(),
      status: gamepad.statusText()
    }),
    progression: () => ({
      ...progression.snapshot(),
      district: progression.levelStatus(BALANCE.levels.currentId),
      scrapFactory: progression.levelStatus(BALANCE.levels.nextId)
    }),
    animations: () => renderer.animationSamples?.slice() ?? [],
    setDebug: (enabled) => { renderer.debug = Boolean(enabled); },
    renderer
  };

  if (testMode) {
    const addTestEnemyShot = (target, id) => {
      model.projectiles.push({
        id,
        sourceId: "browser-test-source",
        team: "enemy",
        x: target.x - 12,
        y: target.y + Math.min(18, target.h / 2),
        w: 8,
        h: 8,
        vx: 118,
        vy: 0,
        life: 2,
        removed: false
      });
    };
    testApi.eventCounts = () => Object.fromEntries(processedEventCounts);
    testApi.chaserDefeat = () => {
      input.clear();
      if (model.state !== "playing") throw new Error("A derrota do chaser exige uma partida ativa.");
      model.nextSpawnAt = Infinity;
      model.projectiles = [];
      model.enemies = [];
      model.player.x = 80;
      model.player.y = 208;
      model.player.vx = 0;
      model.player.vy = 0;
      model.player.facing = 1;
      model.player.onGround = true;
      model.player.attackCooldown = 0;
      const enemy = {
        id: model.createEntityId("test-chaser-defeat"),
        kind: "chaser", x: model.player.x + model.player.w, y: model.player.y, w: 16, h: 32,
        vx: 0, vy: 0, facing: -1, onGround: true, attackCooldown: Infinity,
        altarAttackCooldown: Infinity, maxHp: model.encounter.chaserMaxHp,
        hp: model.encounter.chaserMaxHp, hurtFlash: 0, removed: false
      };
      model.enemies = [enemy];
      const soulsBefore = model.souls.length;
      const killsBefore = model.kills;
      for (let hit = 0; hit < enemy.maxHp; hit += 1) {
        model.damageEnemy(enemy, 1, {
          type: "teste-navegador",
          sourceId: model.player.id,
          projectileId: `browser-chaser-${model.runId}-${hit}`
        });
      }
      processEvents();
      return { enemyId: enemy.id, soulsBefore, killsBefore, snapshot: model.snapshot() };
    };
    testApi.altarDefeat = () => {
      input.clear();
      if (model.state !== "playing") throw new Error("A derrota do altar exige uma partida ativa.");
      model.nextSpawnAt = Infinity;
      model.enemies = [];
      model.projectiles = [];
      for (let hit = 0; hit < model.objective.altarMaxLife; hit += 1) {
        addTestEnemyShot(model.altar, `browser-altar-${model.runId}-${hit}`);
        let steps = 0;
        const lifeBefore = model.altar.life;
        while (model.state === "playing" && model.altar.life === lifeBefore && steps < 120) {
          model.update(1 / 120, {});
          processEvents();
          steps += 1;
        }
        while (model.state === "playing" && model.altar.invulnerable > 0 && steps < 360) {
          model.update(1 / 120, {});
          processEvents();
          steps += 1;
        }
      }
      return { playerId: model.player.id, snapshot: model.snapshot(), damage: [...model.damageDiagnostics] };
    };
    testApi.simultaneousDefeat = () => {
      input.clear();
      if (model.state !== "playing") throw new Error("O dano simultâneo exige uma partida ativa.");
      model.nextSpawnAt = Infinity;
      model.projectiles = [];
      model.player.x = model.altar.x;
      model.player.y = 208;
      model.player.vx = 0;
      model.player.vy = 0;
      model.player.life = 1;
      model.player.invulnerable = 0;
      model.player.onGround = true;
      model.altar.life = 1;
      model.altar.invulnerable = 0;
      const enemy = {
        id: model.createEntityId("test-simultaneous-enemy"),
        kind: "chaser", x: model.player.x + 4, y: model.player.y, w: 16, h: 32,
        vx: 0, vy: 0, facing: -1, onGround: true, attackCooldown: 0,
        altarAttackCooldown: 0, maxHp: model.encounter.chaserMaxHp,
        hp: model.encounter.chaserMaxHp, hurtFlash: 0, removed: false
      };
      model.enemies = [enemy];
      model.update(1 / 120, {});
      processEvents();
      return { enemyId: enemy.id, snapshot: model.snapshot(), damage: [...model.damageDiagnostics] };
    };
    testApi.contactDefeat = () => {
      input.clear();
      audio.unlock();
      if (model.state !== "playing") throw new Error("A preparação de contato exige uma partida ativa.");
      model.nextSpawnAt = Infinity;
      model.projectiles = [];
      model.enemies = [];
      const enemy = {
        id: model.createEntityId("test-contact-enemy"),
        kind: "chaser", x: model.player.x + 4, y: model.player.y, w: 16, h: 32,
        vx: 0, vy: 0, facing: -1, onGround: true, attackCooldown: 0,
        altarAttackCooldown: Infinity, maxHp: model.encounter.chaserMaxHp,
        hp: model.encounter.chaserMaxHp, hurtFlash: 0, removed: false
      };
      model.enemies = [enemy];
      audio.playMusic("battle");
      let steps = 0;
      while (model.state === "playing" && steps < 900) {
        enemy.x = model.player.x + 4;
        enemy.y = model.player.y;
        enemy.vx = 0;
        enemy.vy = 0;
        enemy.onGround = true;
        model.update(1 / 120, {});
        processEvents();
        steps += 1;
      }
      return { steps, snapshot: model.snapshot(), damage: [...model.damageDiagnostics] };
    };
    testApi.prepareVictory = ({ progressionEligible = false, bonusQualificationEligible = false, activeSeconds = 0, levelId = model.levelId } = {}) => {
      director.stop();
      input.clear();
      model.startRun({ demo: false, progressionEligible, bonusQualificationEligible, levelId });
      model.nextSpawnAt = Infinity;
      if (activeSeconds > 0) {
        const steps = Math.floor(activeSeconds / fixedStep);
        for (let index = 0; index < steps; index += 1) model.update(fixedStep, {});
      }
      model.enemies = [];
      model.projectiles = [];
      model.souls = Array.from({ length: model.objective.soulsGoal }, (_, index) => ({
        x: model.player.x + (index % 2), y: model.player.y, w: 15, h: 16,
        bornAt: model.elapsed, source: "browser-victory", removed: false
      }));
      model.update(fixedStep, {});
      model.player.x = model.altar.x;
      model.player.y = 208;
      model.player.vx = 0;
      model.player.vy = 0;
      model.player.onGround = true;
      canvas.focus();
      return { snapshot: model.snapshot(), progression: testApi.progression(), events: testApi.eventCounts() };
    };
    testApi.depositPreparedVictory = () => {
      if (model.state !== "playing" || model.carriedSouls !== model.objective.soulsGoal) {
        throw new Error("A vitória preparada exige a partida ativa com a meta carregada.");
      }
      model.update(fixedStep, { interactPressed: true });
      processEvents();
      return { snapshot: model.snapshot(), progression: testApi.progression(), events: testApi.eventCounts() };
    };
    testApi.victoryRun = (options = {}) => {
      testApi.prepareVictory(options);
      return testApi.depositPreparedVictory();
    };
    testApi.finishVictoryPresentation = () => {
      let steps = 0;
      while (model.state === "victoryPresentation" && steps < 240) {
        model.update(fixedStep, {});
        steps += 1;
      }
      processEvents();
      return { steps, snapshot: model.snapshot(), progression: testApi.progression(), events: testApi.eventCounts() };
    };
    window.__BOYPUNK_TEST__ = testApi;
  }

  if (directCoopMode) enterCoopLobby();
  else if (directPatrolShooterPreview) startPatrolShooterPreview();
  else if (directBonusPreview) startBonusPreview();
  else startDemo("startup");
  if (!director.active && currentControllerScreen()) focusControllerDefault();
  previousState = model.state;
  previousDemoActive = director.active;
  requestAnimationFrame(loop);
}

async function startBoot() {
  try {
    await boot();
  } catch (error) {
    showFatalLoadingError("sequência completa de inicialização", error);
  }
}

startBoot();
