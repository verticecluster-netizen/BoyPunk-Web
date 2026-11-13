// src/i18n.js
// Bilingual UI layer for BoyPunk! Web (pt-BR default and en)

export const STORAGE_LOCALE_KEY = "boypunk-web-locale-v1";

export const STRINGS = {
  "pt-BR": {
    // S1 - Loading / Title
    "loading.eyebrow": "DISTRITO NEON // INICIALIZAÇÃO",
    "loading.status": "Carregando recursos… {percent}%",
    "loading.error": "Falha ao carregar recursos",

    // S2 - Main Menu
    "menu.eyebrow": "PROTOCOLO DE RESISTÊNCIA",
    "menu.buildId": "Versão de teste",
    "menu.subtitle": "Proteja BoyPunk e o altar: BoyPunk começa com {playerLife} pontos de vida e o altar com {altarLife} de integridade. Se qualquer um chegar a zero, a partida termina. Recupere {soulsGoal} almas.",
    "menu.play": "Jogar",
    "menu.survival": "Modo Sobrevivência",
    "menu.survivalCoop": "Sobrevivência Coop Local",
    "menu.demo": "Assistir demonstração",
    "menu.options": "Opções",
    "menu.credits": "Créditos",
    "menu.district": "Distrito Neon",
    "menu.scrap": "Fábrica de Sucata",
    "menu.available": "Disponível",
    "menu.locked": "Bloqueada",
    "menu.bonusTotal": "Pontos bônus totais:",
    "menu.character.title": "Personagem:",
    "character.boypunk.name": "BoyPunk",
    "character.boypunk.desc": "Protagonista e cadência de tiro balanceada.",
    "character.boypunk.tradeoff": "Ataque padrão (0,34 s). Sem habilidade ativa de cura.",
    "character.boypunk.ability": "Nenhuma",
    "character.support.name": "Nilo",
    "character.support.desc": "Android atompunk de assistência tática e nano-reparo de emergência.",
    "character.support.tradeoff": "Ataque 20% mais lento (0,408 s). Habilidade: Cura Própria.",
    "character.support.ability": "Cura Própria (+1 vida, 20s de recarga)",
    "ability.selfHeal.name": "Cura Própria",
    "ability.selfHeal.desc": "Restaura 1 ponto de vida até a integridade máxima.",
    "ability.selfHeal.ready": "CURA [Q] PRONTA",
    "ability.selfHeal.recharging": "CURA [Q] {seconds}s",

    "menu.controls.keyboard": "Teclado: A/D ou setas movem · Espaço salta · J/X/F ataca · E deposita · Q cura · Esc pausa",
    "menu.controls.touch": "Toque: setas movem · ↑ salta · ✦ ataca · E deposita · ✚ cura · Ⅱ pausa",
    "menu.controls.gamepad": "Controle padrão: analógico/D-pad move · botão inferior pula/confirma · esquerdo ataca · superior deposita · LB cura · direito volta · Start pausa",

    "menu.statusAvailable": "Disponível",
    "menu.statusLocked": "Bloqueada",
    "menu.statusCompleted": "Concluído",

    // Options
    "options.eyebrow": "SINAL / ÁUDIO",
    "options.title": "Opções",
    "options.language": "Idioma",
    "options.difficulty": "Dificuldade",
    "options.difficulty.easy": "Fácil",
    "options.difficulty.normal": "Normal",
    "options.difficulty.hard": "Difícil",
    "options.volume": "Volume",
    "options.muteYes": "Mudo: sim",
    "options.muteNo": "Mudo: não",
    "options.controller": "Controle",
    "options.controllerChecking": "Verificando controles conectados…",
    "options.controllerDevice": "Dispositivo do jogador 1",
    "options.controllerPrompt": "Pressione um botão para ativar",
    "options.controllerLive": "Botões: {buttons} · Eixos: {axes}",
    "options.deadZone": "Zona morta",
    "options.genericNote": "Controle genérico: configure os botões e eixos sem presumir o modelo do aparelho.",
    "options.axisH": "Eixo horizontal",
    "options.invertH": "Inverter horizontal",
    "options.axisV": "Eixo vertical / menu",
    "options.invertV": "Inverter vertical",
    "options.bind.left": "Mover à esquerda",
    "options.bind.right": "Mover à direita",
    "options.bind.menuUp": "Menu para cima",
    "options.bind.menuDown": "Menu para baixo",
    "options.bind.jump": "Confirmar / pular",
    "options.bind.attack": "Atacar",
    "options.bind.interact": "Depositar",
    "options.bind.ability": "Habilidade de Nilo",
    "options.bind.cancel": "Cancelar / voltar",
    "options.bind.pause": "Pausar / continuar",
    "options.guidedMap": "Mapeamento guiado",
    "options.restoreDefaults": "Restaurar padrões do controle",
    "options.controllerDisclaimer": "O remapeamento não habilita hardware que o sistema operacional ou o navegador não exponha.",
    "options.saveTransferNote": "Mudou de endereço? Transfira somente progresso, recordes bônus e preferências de áudio/controle.",
    "options.exportSaves": "Exportar dados do jogo",
    "options.importSaves": "Importar dados do jogo",
    "options.back": "Voltar",
    "options.prefsNote": "As preferências ficam salvas neste navegador quando o armazenamento está disponível.",

    // Credits
    "credits.eyebrow": "ARQUIVO / CRÉDITOS",
    "credits.title": "BoyPunk!",
    "credits.dev": "Desenvolvedor: Renan Santos",
    "credits.disclaimer": "Arte, áudio e Pixelify Sans foram preservados do projeto-fonte. A comprovação de licença de alguns recursos ainda precisa ser consolidada antes de distribuição pública.",
    "credits.back": "Voltar",

    // S6 - Pause
    "pause.eyebrow": "SISTEMA SUSPENSO",
    "pause.title": "Pausa",
    "pause.controls": "A/D ou setas: mover · Espaço: pular · J/X/F: atacar · E: depositar · Q: cura de Nilo",
    "pause.resume": "Continuar",
    "pause.restart": "Recomeçar",
    "pause.menu": "Menu",

    // S7 - Victory
    "victory.eyebrow": "ALTAR RESTAURADO",
    "victory.districtTitle": "Distrito Neon concluído!",
    "victory.factoryTitle": "Fábrica de Sucata concluída!",
    "victory.statTime": "Tempo ativo",
    "victory.statSouls": "Almas depositadas",
    "victory.statPlayerLife": "Vida restante",
    "victory.statAltarLife": "Integridade do altar",
    "victory.badgeUnlocked": "Desbloqueada",
    "victory.badgeAvailable": "Disponível",
    "victory.scrapUnlocked": "Fábrica de Sucata desbloqueada — disponível para jogar",
    "victory.completedSuffix": "concluído!",
    "victory.enterFactory": "Entrar na Fábrica",
    "victory.playAgain": "Jogar novamente",
    "victory.menu": "Menu",

    // S8 - Defeat
    "defeat.eyebrow": "SINAL INTERROMPIDO",
    "defeat.title": "Game Over",
    "defeat.districtFell": "O Distrito caiu.",
    "defeat.factoryStopped": "A Fábrica parou.",
    "defeat.player": "Você foi derrotado",
    "defeat.altar": "Altar destruído",
    "defeat.default": "O Distrito caiu.",
    "defeat.statSouls": "Almas depositadas",
    "defeat.statLifeAltar": "Vida / altar",
    "defeat.retry": "Tentar novamente",
    "defeat.menu": "Menu",

    // Survival Mode
    "survival.eyebrow": "PROTOCOLO DE SOBREVIVÊNCIA",
    "survival.gameOver": "Game Over",
    "survival.wave": "Onda {wave}",
    "survival.waveLabel": "ONDA",
    "survival.timeLabel": "TEMPO SOBREVIVIDO",
    "survival.health": "VIDA",
    "survival.survivedTime": "Tempo sobrevivido",
    "survival.enemiesDefeated": "Inimigos derrotados",
    "survival.highScore": "Recorde",
    "survival.retry": "Tentar novamente",
    "survival.menu": "Menu",

    // Power-ups
    "powerup.doubleBurst.name": "Rajada Dupla",
    "powerup.doubleBurst.acquired": "RAJADA DUPLA OBTIDA",
    "powerup.doubleBurst.collected": "RAJADA DUPLA ATIVA — {seconds} s",

    // S9 - Bonus
    "bonus.trans.eyebrowPrefix": "QUALIFICAÇÃO",
    "bonus.trans.eyebrow": "QUALIFICAÇÃO {points}/75",
    "bonus.trans.title": "Bônus conquistado!",
    "bonus.trans.starting": "Câmara de Energia iniciando…",
    "bonus.trans.note": "20 segundos · 30 almas bônus · o resultado da campanha permanece preservado",
    "bonus.trans.skip": "Pular bônus",
    "bonus.result.eyebrow": "CÂMARA DE ENERGIA // RESULTADO",
    "bonus.result.title": "Rodada concluída",
    "bonus.result.skipped": "Bônus pulado",
    "bonus.result.cleared": "Câmara completa!",
    "bonus.result.timeUp": "Tempo encerrado",
    "bonus.result.preview": "Prévia concluída",
    "bonus.result.previewWarning": "Prévia de desenvolvimento: recordes e pontos não foram alterados.",
    "bonus.result.souls": "Almas bônus",
    "bonus.result.runScore": "Pontuação da rodada",
    "bonus.result.savedBest": "Melhor salva",
    "bonus.result.newPoints": "Novos pontos",
    "bonus.result.enterFactory": "Continuar para a Fábrica",
    "bonus.result.replayOrigin": "Repetir nível de origem",
    "bonus.result.menu": "Menu",

    // Chrome & Overlays
    "demo.title": "DEMONSTRAÇÃO",
    "demo.prompt": "Enter / Espaço, botão do controle ou toque para abrir o menu",
    "gamepad.checking": "Controle: verificando suporte…",
    "outside.note": "Versão web independente · Canvas 2D · sem runtime do Construct"
  },
  "en": {
    // S1 - Loading / Title
    "loading.eyebrow": "NEON DISTRICT // INITIALIZATION",
    "loading.status": "Loading resources… {percent}%",
    "loading.error": "Failed to load resources",

    // S2 - Main Menu
    "menu.eyebrow": "RESISTANCE PROTOCOL",
    "menu.buildId": "Test build",
    "menu.subtitle": "Protect BoyPunk and the altar: BoyPunk starts with {playerLife} health and the altar with {altarLife} integrity. If either reaches zero, the run ends. Collect {soulsGoal} souls.",
    "menu.play": "Play",
    "menu.survival": "Survival Mode",
    "menu.survivalCoop": "Local Co-op Survival",
    "menu.demo": "Watch Demo",
    "menu.options": "Options",
    "menu.credits": "Credits",
    "menu.district": "Neon District",
    "menu.scrap": "Scrap Factory",
    "menu.available": "Available",
    "menu.locked": "Locked",
    "menu.bonusTotal": "Total bonus points:",
    "menu.character.title": "Character:",
    "character.boypunk.name": "BoyPunk",
    "character.boypunk.desc": "Protagonist with balanced firing rate.",
    "character.boypunk.tradeoff": "Standard attack (0.34s). No active healing ability.",
    "character.boypunk.ability": "None",
    "character.support.name": "Nilo",
    "character.support.desc": "Atompunk android with tactical support and emergency nanorepair.",
    "character.support.tradeoff": "20% slower attack rate (0.408s). Ability: Self-Heal.",
    "character.support.ability": "Self-Heal (+1 life, 20s recharge)",
    "ability.selfHeal.name": "Self-Heal",
    "ability.selfHeal.desc": "Restores 1 life point up to maximum health.",
    "ability.selfHeal.ready": "HEAL [Q] READY",
    "ability.selfHeal.recharging": "HEAL [Q] {seconds}s",

    "menu.controls.keyboard": "Keyboard: A/D or arrows move · Space jumps · J/X/F attacks · E deposits · Q heal · Esc pauses",
    "menu.controls.touch": "Touch: arrows move · ↑ jumps · ✦ attacks · E deposits · ✚ heal · Ⅱ pauses",
    "menu.controls.gamepad": "Standard gamepad: stick/D-pad moves · bottom button jumps/confirms · left attacks · top deposits · LB heal · right backs · Start pauses",

    "menu.statusAvailable": "Available",
    "menu.statusLocked": "Locked",
    "menu.statusCompleted": "Completed",

    // Options
    "options.eyebrow": "SIGNAL / AUDIO",
    "options.title": "Options",
    "options.language": "Language",
    "options.difficulty": "Difficulty",
    "options.difficulty.easy": "Easy",
    "options.difficulty.normal": "Normal",
    "options.difficulty.hard": "Hard",
    "options.volume": "Volume",
    "options.muteYes": "Muted: yes",
    "options.muteNo": "Muted: no",
    "options.controller": "Controller",
    "options.controllerChecking": "Checking connected gamepads…",
    "options.controllerDevice": "Player 1 Device",
    "options.controllerPrompt": "Press any button to activate",
    "options.controllerLive": "Buttons: {buttons} · Axes: {axes}",
    "options.deadZone": "Dead zone",
    "options.genericNote": "Generic controller: configure buttons and axes without assuming hardware layout.",
    "options.axisH": "Horizontal axis",
    "options.invertH": "Invert horizontal",
    "options.axisV": "Vertical axis / menu",
    "options.invertV": "Invert vertical",
    "options.bind.left": "Move left",
    "options.bind.right": "Move right",
    "options.bind.menuUp": "Menu up",
    "options.bind.menuDown": "Menu down",
    "options.bind.jump": "Confirm / Jump",
    "options.bind.attack": "Attack",
    "options.bind.interact": "Deposit",
    "options.bind.ability": "Nilo ability",
    "options.bind.cancel": "Cancel / Back",
    "options.bind.pause": "Pause / Continue",
    "options.guidedMap": "Guided Mapping",
    "options.restoreDefaults": "Reset Controller Defaults",
    "options.controllerDisclaimer": "Remapping cannot enable hardware not exposed by the operating system or browser.",
    "options.saveTransferNote": "Moved addresses? Transfer progress, bonus records, and audio/control preferences.",
    "options.exportSaves": "Export save data",
    "options.importSaves": "Import save data",
    "options.back": "Back",
    "options.prefsNote": "Preferences are saved in this browser when local storage is available.",

    // Credits
    "credits.eyebrow": "ARCHIVE / CREDITS",
    "credits.title": "BoyPunk!",
    "credits.dev": "Developer: Renan Santos",
    "credits.disclaimer": "Art, audio, and Pixelify Sans were preserved from the source project. Asset licensing verification is ongoing before public release.",
    "credits.back": "Back",

    // S6 - Pause
    "pause.eyebrow": "SYSTEM SUSPENDED",
    "pause.title": "Paused",
    "pause.controls": "A/D or arrows: move · Space: jump · J/X/F: attack · E: deposit · Q: Nilo self-heal",
    "pause.resume": "Continue",
    "pause.restart": "Restart",
    "pause.menu": "Menu",

    // S7 - Victory
    "victory.eyebrow": "ALTAR RESTORED",
    "victory.districtTitle": "Neon District Cleared!",
    "victory.factoryTitle": "Scrap Factory Cleared!",
    "victory.statTime": "Active Time",
    "victory.statSouls": "Deposited Souls",
    "victory.statPlayerLife": "Player Health",
    "victory.statAltarLife": "Altar Health",
    "victory.badgeUnlocked": "Unlocked",
    "victory.badgeAvailable": "Available",
    "victory.scrapUnlocked": "Scrap Factory unlocked — ready to play",
    "victory.completedSuffix": "cleared!",
    "victory.enterFactory": "Enter Factory",
    "victory.playAgain": "Play Again",
    "victory.menu": "Menu",

    // S8 - Defeat
    "defeat.eyebrow": "SIGNAL LOST",
    "defeat.title": "Game Over",
    "defeat.districtFell": "The District fell.",
    "defeat.factoryStopped": "The Factory stopped.",
    "defeat.player": "You were defeated",
    "defeat.altar": "Altar destroyed",
    "defeat.default": "The District fell.",
    "defeat.statSouls": "Deposited Souls",
    "defeat.statLifeAltar": "Health / Altar",
    "defeat.retry": "Try Again",
    "defeat.menu": "Menu",

    // Survival Mode
    "survival.eyebrow": "SURVIVAL PROTOCOL",
    "survival.gameOver": "Game Over",
    "survival.wave": "Wave {wave}",
    "survival.waveLabel": "WAVE",
    "survival.timeLabel": "TIME SURVIVED",
    "survival.health": "HEALTH",
    "survival.survivedTime": "Time Survived",
    "survival.enemiesDefeated": "Enemies Defeated",
    "survival.highScore": "High Score",
    "survival.retry": "Try Again",
    "survival.menu": "Menu",

    // Power-ups
    "powerup.doubleBurst.name": "Double Burst",
    "powerup.doubleBurst.acquired": "DOUBLE BURST ACQUIRED",
    "powerup.doubleBurst.collected": "DOUBLE BURST ACTIVE — {seconds} s",

    // S9 - Bonus
    "bonus.trans.eyebrowPrefix": "QUALIFICATION",
    "bonus.trans.eyebrow": "QUALIFICATION {points}/75",
    "bonus.trans.title": "Bonus Achieved!",
    "bonus.trans.starting": "Energy Chamber starting…",
    "bonus.trans.note": "20 seconds · 30 bonus souls · campaign results remain preserved",
    "bonus.trans.skip": "Skip Bonus",
    "bonus.result.eyebrow": "ENERGY CHAMBER // RESULT",
    "bonus.result.title": "Round Complete",
    "bonus.result.skipped": "Bonus skipped",
    "bonus.result.cleared": "Chamber cleared!",
    "bonus.result.timeUp": "Time up",
    "bonus.result.preview": "Preview complete",
    "bonus.result.previewWarning": "Development preview: records and points were not changed.",
    "bonus.result.souls": "Bonus Souls",
    "bonus.result.runScore": "Round Score",
    "bonus.result.savedBest": "Saved Best",
    "bonus.result.newPoints": "New Points",
    "bonus.result.enterFactory": "Continue to Factory",
    "bonus.result.replayOrigin": "Replay Origin Level",
    "bonus.result.menu": "Menu",

    // Chrome & Overlays
    "demo.title": "DEMO",
    "demo.prompt": "Enter / Space, gamepad button or tap to open menu",
    "gamepad.checking": "Gamepad: checking support…",
    "outside.note": "Standalone web edition · Canvas 2D · no Construct runtime"
  }
};

let currentLocale = "pt-BR";
const subscribers = new Set();

function browserStorage() {
  try { return globalThis.localStorage ?? null; }
  catch { return null; }
}

export function getLocale() {
  return currentLocale;
}

export function initLocale(storage = browserStorage()) {
  try {
    const saved = storage?.getItem(STORAGE_LOCALE_KEY);
    if (saved && (saved === "en" || saved === "pt-BR")) {
      currentLocale = saved;
    } else {
      currentLocale = "pt-BR";
    }
  } catch {
    currentLocale = "pt-BR";
  }
  return currentLocale;
}

export function setLocale(locale, storage = browserStorage()) {
  if (locale !== "pt-BR" && locale !== "en") return currentLocale;
  currentLocale = locale;
  try {
    storage?.setItem(STORAGE_LOCALE_KEY, locale);
  } catch {}
  if (typeof document !== "undefined") {
    document.documentElement.lang = locale;
  }
  for (const callback of subscribers) {
    try {
      callback(currentLocale);
    } catch (err) {
      console.error("[i18n callback error]", err);
    }
  }
  return currentLocale;
}

export function onLocaleChange(callback) {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

export function t(key, params = {}) {
  const dict = STRINGS[currentLocale] ?? STRINGS["pt-BR"];
  let str = dict[key] ?? STRINGS["pt-BR"][key] ?? key;
  for (const [param, val] of Object.entries(params)) {
    str = str.replaceAll(`{${param}}`, String(val));
  }
  return str;
}

export function applyTranslations(root = document) {
  if (!root || !root.querySelectorAll) return;
  const elements = root.querySelectorAll("[data-i18n]");
  for (const el of elements) {
    const key = el.getAttribute("data-i18n");
    if (!key) continue;
    el.textContent = t(key);
  }
  const ariaElements = root.querySelectorAll("[data-i18n-aria]");
  for (const el of ariaElements) {
    const key = el.getAttribute("data-i18n-aria");
    if (!key) continue;
    el.setAttribute("aria-label", t(key));
  }
}
