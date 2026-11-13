import assert from "node:assert/strict";
import test from "node:test";
import {
  BALANCE,
  CHARACTERS,
  DEFAULT_CHARACTER,
  DEFAULT_DIFFICULTY,
  DIFFICULTIES,
  POWER_UPS,
  normalizeCharacter,
  resolveCharacter,
  resolveWeaponAnchor,
  CHARACTER_STORAGE_KEY,
  loadCharacterPreference,
  saveCharacterPreference
} from "../src/config.js";
import { GameModel, overlaps } from "../src/core.js";
import { InputController } from "../src/input.js";
import {
  GAMEPAD_BINDING_LABELS,
  GamepadManager,
  GamepadPreferencesStore,
  validateGamepadProfile
} from "../src/gamepad.js";

const DT = 1 / 120;

function createCampaignModel(characterId = "boypunk", difficulty = "normal") {
  const model = new GameModel({ random: () => 0 });
  model.startRun({
    levelId: BALANCE.levels.currentId,
    difficulty,
    characterId,
    demo: false
  });
  model.nextSpawnAt = Infinity;
  model.enemies = [];
  model.souls = [];
  model.presses = [];
  return model;
}

function step(model, seconds, input = {}) {
  for (let elapsed = 0; elapsed < seconds; elapsed += DT) {
    model.update(DT, input);
  }
}

test("catálogo autoritativo define boypunk e support com IDs estáveis e imutáveis", () => {
  assert.equal(DEFAULT_CHARACTER, "boypunk");
  assert.ok(Object.isFrozen(CHARACTERS));
  assert.ok(Object.isFrozen(CHARACTERS.boypunk));
  assert.ok(Object.isFrozen(CHARACTERS.support));

  // BoyPunk baseline preservado
  assert.equal(CHARACTERS.boypunk.id, "boypunk");
  assert.equal(CHARACTERS.boypunk.publicName, "BoyPunk");
  assert.equal(CHARACTERS.boypunk.attackCooldownMultiplier, 1.0);
  assert.deepEqual(CHARACTERS.boypunk.weaponAnchor, { forward: 27, y: 16 });
  assert.ok(Object.isFrozen(CHARACTERS.boypunk.weaponAnchor));
  assert.equal(CHARACTERS.boypunk.ability, null);

  // Suporte perfil
  assert.equal(CHARACTERS.support.id, "support");
  assert.equal(CHARACTERS.support.publicName, "Nilo");
  assert.equal(CHARACTERS.support.spritePrefix, "nilo");
  assert.equal(CHARACTERS.support.fallbackSpritePrefix, "player");
  assert.equal(CHARACTERS.support.provisionalVisual, false);
  assert.equal(CHARACTERS.support.attackCooldownMultiplier, 1.20);
  assert.deepEqual(CHARACTERS.support.weaponAnchor, { forward: 21, y: 12 });
  assert.ok(Object.isFrozen(CHARACTERS.support.weaponAnchor));
  assert.ok(CHARACTERS.support.ability);
  assert.equal(CHARACTERS.support.ability.id, "self-heal");
  assert.equal(CHARACTERS.support.ability.healAmount, 1);
  assert.equal(CHARACTERS.support.ability.rechargeSeconds, 20);
});

test("normalização e resolução de personagens tratam IDs desconhecidos com fallback seguro", () => {
  assert.equal(normalizeCharacter("boypunk"), "boypunk");
  assert.equal(normalizeCharacter("support"), "support");
  assert.equal(normalizeCharacter("unknown-id"), "boypunk");
  assert.equal(normalizeCharacter(null), "boypunk");
  assert.equal(normalizeCharacter(undefined), "boypunk");
  assert.equal(normalizeCharacter(123), "boypunk");

  const resolvedDefault = resolveCharacter("unknown");
  assert.equal(resolvedDefault.id, "boypunk");
  assert.equal(resolvedDefault.attackCooldown, 0.34);
  assert.equal(resolvedDefault.hasSelfHeal, false);

  const resolvedSupport = resolveCharacter("support", 3);
  assert.equal(resolvedSupport.id, "support");
  assert.equal(resolvedSupport.attackCooldown, 0.408);
  assert.equal(resolvedSupport.maxLife, 3);
  assert.equal(resolvedSupport.hasSelfHeal, true);
  assert.equal(resolvedSupport.ability.healAmount, 1);
  assert.equal(resolvedSupport.spritePrefix, "nilo");
  assert.equal(resolvedSupport.fallbackSpritePrefix, "player");
});

test("âncora mundial da arma é simétrica, explícita e independente por personagem", () => {
  const player = { x: 80, y: 208, w: 22, facing: 1 };
  assert.deepEqual(resolveWeaponAnchor(player, resolveCharacter("boypunk"), 1), { x: 118, y: 224 });
  assert.deepEqual(resolveWeaponAnchor(player, resolveCharacter("boypunk"), -1), { x: 64, y: 224 });
  assert.deepEqual(resolveWeaponAnchor(player, resolveCharacter("support"), 1), { x: 112, y: 220 });
  assert.deepEqual(resolveWeaponAnchor(player, resolveCharacter("support"), -1), { x: 70, y: 220 });
});

test("preferência de personagem mantém saves antigos e valores corrompidos no BoyPunk", () => {
  const values = new Map([["save-antigo", "preservar"]]);
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value))
  };
  assert.equal(loadCharacterPreference(storage), "boypunk", "save anterior sem a nova chave usa fallback");
  assert.equal(saveCharacterPreference(storage, "support"), "support");
  assert.equal(loadCharacterPreference(storage), "support");
  assert.equal(values.get("save-antigo"), "preservar");
  values.set(CHARACTER_STORAGE_KEY, "id-corrompido");
  assert.equal(loadCharacterPreference(storage), "boypunk");
  assert.equal(saveCharacterPreference(storage, "desconhecido"), "boypunk");
  assert.equal(values.get(CHARACTER_STORAGE_KEY), "boypunk");
  assert.equal(loadCharacterPreference({ getItem() { throw new Error("blocked"); } }), "boypunk");
});

test("modificador de cooldown é aplicado exatamente uma vez", () => {
  const char = resolveCharacter("support");
  assert.equal(char.attackCooldown, 0.408);
  assert.equal(char.attackCooldownMultiplier, 1.20);
  // Multiplicar novamente não ocorre no modelo
  const model = createCampaignModel("support");
  assert.equal(model.character.attackCooldown, 0.408);
  model.playerAttack();
  assert.equal(model.player.attackCooldown, 0.408);
  // Passa para outro nível ou retry
  model.startRun({ levelId: BALANCE.levels.nextId, characterId: "support" });
  assert.equal(model.character.attackCooldown, 0.408);
  model.playerAttack();
  assert.equal(model.player.attackCooldown, 0.408);
});

test("dificuldade resolve vida uma vez e não altera física nem cadência de Nilo", () => {
  const expectedLife = { easy: 6, normal: 4, hard: 3 };
  for (const [difficulty, maxLife] of Object.entries(expectedLife)) {
    const model = createCampaignModel("support", difficulty);
    assert.equal(model.playerMaxLife, maxLife);
    assert.equal(model.character.maxLife, maxLife);
    assert.equal(model.player.life, maxLife);
    assert.equal(model.character.attackCooldown, 0.408);
    assert.equal(model.player.w, BALANCE.player.width);
    assert.equal(model.player.h, BALANCE.player.height);
  }
});

test("física, colisão e projéteis são rigorosamente idênticos entre os dois personagens", () => {
  const boy = createCampaignModel("boypunk");
  const sup = createCampaignModel("support");

  assert.equal(boy.player.w, sup.player.w);
  assert.equal(boy.player.h, sup.player.h);
  assert.equal(BALANCE.player.width, 22);
  assert.equal(BALANCE.player.height, 32);

  assert.equal(BALANCE.player.maxSpeed, 150);
  assert.equal(BALANCE.player.jumpSpeed, 310);
  assert.equal(BALANCE.player.doubleJumpSpeed, 285);
  assert.equal(BALANCE.player.shotSpeed, 330);

  // Disparo gera projétil idêntico
  boy.playerAttack();
  sup.playerAttack();

  const bShot = boy.projectiles[0];
  const sShot = sup.projectiles[0];
  assert.equal(bShot.w, sShot.w);
  assert.equal(bShot.h, sShot.h);
  assert.equal(bShot.vx, sShot.vx);
  assert.equal(bShot.damage, sShot.damage);
});

test("Suporte inicia nível e retry com habilidade descarregada (20s restantes)", () => {
  const model = createCampaignModel("support");
  assert.ok(model.ability);
  assert.equal(model.ability.id, "self-heal");
  assert.equal(model.ability.rechargeRemaining, 20);
  assert.equal(model.ability.ready, false);

  // Avança 10s
  step(model, 10);
  assert.ok(Math.abs(model.ability.rechargeRemaining - 10) < 0.05);
  assert.equal(model.ability.ready, false);

  // Reiniciar run / retry reseta recarga
  model.startRun({ levelId: BALANCE.levels.currentId, characterId: "support" });
  assert.equal(model.ability.rechargeRemaining, 20);
  assert.equal(model.ability.ready, false);
});

test("recarga completa em 20 segundos de gameplay ativo e emite evento abilityReady", () => {
  const model = createCampaignModel("support");
  let readyEmitted = false;
  model.events = [];
  step(model, 20.1);

  assert.equal(model.ability.ready, true);
  assert.equal(model.ability.rechargeRemaining, 0);
  const events = model.consumeEvents();
  assert.ok(events.some((e) => e.type === "abilityReady" && e.id === "self-heal"));
});

test("ativação de cura restaura exatamente 1 ponto de vida e respeita limite máximo", () => {
  const model = createCampaignModel("support", "normal");
  // Reduz vida para 2
  model.player.life = 2;
  step(model, 20.1); // Torna a habilidade pronta

  assert.equal(model.ability.ready, true);
  const activated = model.tryActivateAbility();
  assert.equal(activated, true);
  assert.equal(model.player.life, 3); // 2 + 1 = 3
  assert.equal(model.ability.ready, false);
  assert.equal(model.ability.rechargeRemaining, 20);
  assert.equal(model.events.filter((event) => event.type === "playerHealed").at(-1).amount, CHARACTERS.support.ability.healAmount);

  // Recarrega mais 20s
  step(model, 20.1);
  assert.equal(model.ability.ready, true);
  model.tryActivateAbility();
  assert.equal(model.player.life, 4); // 3 + 1 = 4 (máximo)

  // Recarrega e tenta curar com vida cheia: deve recusar e NÃO consumir recarga
  step(model, 20.1);
  assert.equal(model.ability.ready, true);
  const fullHealthActivated = model.tryActivateAbility();
  assert.equal(fullHealthActivated, false);
  assert.equal(model.player.life, 4);
  assert.equal(model.ability.ready, true);
  assert.equal(model.ability.rechargeRemaining, 0);
});

test("ativação durante recarga não faz nada", () => {
  const model = createCampaignModel("support");
  model.player.life = 2;
  // Apenas 5s decorridos
  step(model, 5);
  assert.equal(model.ability.ready, false);
  const activated = model.tryActivateAbility();
  assert.equal(activated, false);
  assert.equal(model.player.life, 2);
});

test("pausa congela a recarga da habilidade", () => {
  const model = createCampaignModel("support");
  step(model, 5);
  assert.ok(Math.abs(model.ability.rechargeRemaining - 15) < 0.05);

  model.pause();
  assert.equal(model.state, "paused");

  // Chamadas de update não devem avançar recarga durante pausa
  step(model, 5);
  assert.ok(Math.abs(model.ability.rechargeRemaining - 15) < 0.05);

  model.resume();
  step(model, 5);
  assert.ok(Math.abs(model.ability.rechargeRemaining - 10) < 0.05);
});

test("derrota, vitória, menu e troca de cena removem habilidade e feedback transitórios; retry recarrega do zero", () => {
  for (const [label, terminate] of [
    ["derrota do jogador", (model) => { model.player.life = 0; model.resolveTerminalOutcome(); }],
    ["derrota do altar", (model) => { model.altar.life = 0; model.resolveTerminalOutcome(); }],
    ["vitória", (model) => { model.altar.deposited = model.objective.soulsGoal; model.resolveTerminalOutcome(); }],
    ["menu", (model) => model.goToMenu()]
  ]) {
    const model = createCampaignModel("support");
    model.ability.ready = true;
    model.ability.rechargeRemaining = 0;
    model.player.life -= 1;
    model.tryActivateAbility();
    assert.equal(model.effects.some((effect) => effect.kind === "heal"), true);
    terminate(model);
    assert.equal(model.ability, null, `${label}: habilidade transitória`);
    assert.equal(model.effects.some((effect) => effect.kind === "heal"), false, `${label}: efeito de cura`);
  }

  const retry = createCampaignModel("support");
  step(retry, 8);
  retry.startRun({ characterId: "support" });
  assert.deepEqual(retry.ability, {
    id: "self-heal",
    rechargeRemaining: 20,
    rechargeDuration: 20,
    ready: false
  });
});

test("dano letal no mesmo update tem precedência estrita sobre cura simultânea", () => {
  const model = createCampaignModel("support");
  model.player.life = 1;
  step(model, 20.1);
  assert.equal(model.ability.ready, true);

  // Adiciona um projétil inimigo letal que atinge o jogador neste frame
  model.projectiles.push({
    id: "fatal-shot",
    team: "enemy",
    x: model.player.x,
    y: model.player.y,
    w: 8,
    h: 8,
    vx: 0,
    vy: 0,
    damage: 1,
    life: 1,
    originY: model.player.y,
    removed: false
  });

  // Atualiza com input de habilidade acionado no mesmo tick
  model.update(DT, { abilityPressed: true });

  // O jogador deve ter sofrido derrota e a cura NÃO deve ter ressuscitado o jogador
  assert.ok(["defeatPresentation", "defeat"].includes(model.state));
  assert.equal(model.player.life, 0);
});

test("Double Burst funciona para ambos os perfis respeitando o cooldown individual", () => {
  const boy = createCampaignModel("boypunk");
  const sup = createCampaignModel("support");

  boy.activatePowerUp("double-burst");
  sup.activatePowerUp("double-burst");

  assert.equal(boy.activePowerUp.id, "double-burst");
  assert.equal(sup.activePowerUp.id, "double-burst");

  // Ataque no frame 0
  boy.playerAttack();
  sup.playerAttack();

  // Ambos emitiram 1 tiro e agendaram o 2º para 0.12s
  assert.equal(boy.projectiles.length, 1);
  assert.equal(sup.projectiles.length, 1);
  assert.equal(boy.pendingPlayerShots.length, 1);
  assert.equal(sup.pendingPlayerShots.length, 1);

  // Cooldowns diferem
  assert.equal(boy.player.attackCooldown, 0.34);
  assert.equal(sup.player.attackCooldown, 0.408);

  // Avança 0.13s: segundo tiro dispara para ambos
  step(boy, 0.13);
  step(sup, 0.13);
  assert.equal(boy.projectiles.length, 2);
  assert.equal(sup.projectiles.length, 2);
  assert.equal(boy.pendingPlayerShots.length, 0);
  assert.equal(sup.pendingPlayerShots.length, 0);

  // Aos 0.35s acumulados (0.13 + 0.22): BoyPunk pode atacar de novo (0.35 > 0.34), mas Suporte ainda não (0.35 < 0.408)
  step(boy, 0.22);
  step(sup, 0.22);
  assert.equal(boy.player.attackCooldown, 0);
  assert.ok(sup.player.attackCooldown > 0);
});

test("roteamento de input suporta teclado (KeyQ), touch e gamepad (botão 4 / LB)", () => {
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const mockTarget = {
    addEventListener() {},
    removeEventListener() {},
    hidden: false,
    querySelectorAll(selector) {
      if (selector === "[data-action]") {
        return [
          {
            dataset: { action: "ability" },
            addEventListener() {},
            setPointerCapture() {}
          }
        ];
      }
      return [];
    }
  };
  globalThis.window = mockTarget;
  globalThis.document = mockTarget;

  try {
    const input = new InputController(mockTarget);

    // Snapshot inicial não pressionado
    assert.equal(input.snapshot().abilityPressed, false);
    assert.equal(input.snapshot().abilityHeld, false);

    // Teclado KeyQ
    input.onKeyDown({ code: "KeyQ", preventDefault() {} });
    assert.equal(input.snapshot().abilityPressed, true);
    assert.equal(input.snapshot().abilityHeld, true);

    input.consumeEdges();
    assert.equal(input.snapshot().abilityPressed, false);
    assert.equal(input.snapshot().abilityHeld, true);

    input.onKeyUp({ code: "KeyQ", preventDefault() {} });
    assert.equal(input.snapshot().abilityHeld, false);

    input.onKeyDown({ code: "KeyQ", preventDefault() {} });
    input.consumeTransitionInput();
    assert.equal(input.snapshot().abilityPressed, false, "confirmação/transição remove a borda da habilidade");
    input.onKeyDown({ code: "KeyQ", preventDefault() {} });
    assert.equal(input.snapshot().abilityPressed, false, "tecla mantida fica bloqueada até soltar");
    input.onKeyUp({ code: "KeyQ", preventDefault() {} });
    input.onKeyDown({ code: "KeyQ", preventDefault() {} });
    assert.equal(input.snapshot().abilityPressed, true, "nova borda após soltar volta a ser aceita");

    let blurred = false;
    input.onBlur = () => { blurred = true; };
    input.onWindowBlur();
    assert.equal(blurred, true);
    assert.equal(input.snapshot().abilityHeld, false, "perda de foco limpa habilidade mantida");
  } finally {
    if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow;
    if (previousDocument === undefined) delete globalThis.document; else globalThis.document = previousDocument;
  }

  // Gamepad mapeia botão 4 para ability no standardActions
  const pad = {
    index: 0,
    id: "Standard Controller",
    mapping: "standard",
    connected: true,
    buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })),
    axes: [0, 0]
  };

  const nav = { getGamepads: () => [pad] };
  const gpManager = new GamepadManager({ navigatorRef: nav });
  gpManager.poll();
  // Pressiona botão 0 para ativar dispositivo
  pad.buttons[0] = { pressed: true, value: 1 };
  gpManager.poll();
  pad.buttons[0] = { pressed: false, value: 0 };
  gpManager.poll();
  gpManager.consumeEdges();

  // Pressiona botão 4 (LB)
  pad.buttons[4] = { pressed: true, value: 1 };
  gpManager.poll();
  const gpSnap = gpManager.snapshot();
  assert.ok(gpSnap.held.has("ability"));
  assert.ok(gpSnap.pressed.has("ability"));
});

test("validação de perfil de controle antigo sem action 'ability' preserva compatibilidade", () => {
  const oldProfile = {
    buttons: {
      left: 14, right: 15, menuUp: 12, menuDown: 13,
      jump: 0, attack: 2, interact: 3, cancel: 1, pause: 9
    },
    horizontalAxis: 0,
    verticalAxis: 1,
    invertHorizontal: false,
    invertVertical: false
  };

  const validated = validateGamepadProfile(oldProfile);
  assert.ok(validated);
  assert.equal(validated.buttons.ability, null);
  assert.equal(validated.buttons.jump, 0);
  assert.equal(validated.buttons.attack, 2);
});

test("modos survival, demo e bônus mantêm isolamento de personagem e cura", () => {
  const model = new GameModel({ random: () => 0 });

  // Survival sempre usa BoyPunk e sem habilidade
  model.startSurvival();
  assert.equal(model.gameMode, "survival");
  assert.equal(model.characterId, "boypunk");
  assert.equal(model.ability, null);

  // Demo sempre usa BoyPunk e sem habilidade
  model.startRun({ demo: true });
  assert.equal(model.demoMode, true);
  assert.equal(model.characterId, "boypunk");
  assert.equal(model.ability, null);

  // Bônus preserva personagem selecionado, mas desativa habilidade de cura
  model.startRun({ levelId: BALANCE.levels.currentId, characterId: "support" });
  assert.equal(model.characterId, "support");
  assert.ok(model.ability);

  model.startBonusPreview();
  assert.equal(model.gameMode, "bonus");
  assert.equal(model.ability, null); // Cura desabilitada na arena bônus

  // Preview de desenvolvimento também não herda Nilo da run anterior
  model.startRun({ levelId: BALANCE.levels.currentId, characterId: "support" });
  model.startPatrolShooterPreview();
  assert.equal(model.patrolShooterPreview, true);
  assert.equal(model.characterId, "boypunk");
  assert.equal(model.ability, null);
});
