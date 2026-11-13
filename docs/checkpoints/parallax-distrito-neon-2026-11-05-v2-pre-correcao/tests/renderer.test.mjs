import assert from "node:assert/strict";
import test from "node:test";
import { resolveCharacter } from "../src/config.js";
import { Renderer } from "../src/renderer.js";

test("renderer segura o último quadro terminal disponível e só então usa fallback seguro", () => {
  const renderer = Object.create(Renderer.prototype);
  const dead0 = { name: "dead-0" };
  const dead1 = { name: "dead-1" };
  const idle = { name: "idle" };
  renderer.images = new Map([
    ["chaser.dead.0", dead0],
    ["chaser.dead.1", dead1],
    ["chaser.idle", idle]
  ]);

  assert.deepEqual(renderer.resolveAnimationImage("chaser", "dead", 3, "chaser.idle"), {
    image: dead1,
    assetKey: "chaser.dead.1"
  });
  renderer.images.delete("chaser.dead.0");
  renderer.images.delete("chaser.dead.1");
  assert.deepEqual(renderer.resolveAnimationImage("chaser", "dead", 3, "chaser.idle"), {
    image: idle,
    assetKey: "chaser.idle"
  });
});

test("Nilo possui namespace visual próprio e fallback provisório sem duplicar gameplay", () => {
  const draws = [];
  const samples = [];
  const renderer = Object.create(Renderer.prototype);
  renderer.images = new Map([
    ["nilo.idle.0", { id: "nilo-idle" }],
    ["player.idle.0", { id: "boypunk-idle" }]
  ]);
  renderer.recordAnimationSample = (sample) => samples.push(sample);
  renderer.drawMirrored = (...args) => draws.push(args);
  renderer.landingParticles = [];
  renderer.lastPlayerGrounded = true;
  renderer.lastPlayerVy = 0;
  const ctx = {
    save() {}, restore() {}, fillRect() {}, beginPath() {}, stroke() {}, arc() {},
    set globalAlpha(_) {}, set shadowColor(_) {}, set shadowBlur(_) {},
    set fillStyle(_) {}, set strokeStyle(_) {}, set lineWidth(_) {}
  };
  const player = {
    id: "player-1", x: 40, y: 208, w: 22, h: 32, facing: 1, life: 4,
    invulnerable: 0, onGround: true, vy: 0, vx: 0, attackTimer: 0,
    hurtFlash: 0, animTime: 0, animState: "idle"
  };
  const model = {
    state: "playing", elapsed: 1, runId: 1, player, reducedMotion: true,
    characterId: "support", character: resolveCharacter("support", 4)
  };

  renderer.drawPlayer(ctx, model, 1);
  assert.equal(draws.at(-1)[1].id, "nilo-idle");
  assert.equal(samples.at(-1).assetKey, "nilo.idle.0");
  assert.equal(samples.at(-1).characterId, "support");

  renderer.images.delete("nilo.idle.0");
  renderer.drawPlayer(ctx, model, 1.1);
  assert.equal(draws.at(-1)[1].id, "boypunk-idle");
  assert.equal(samples.at(-1).assetKey, "player.idle.0", "arte ausente usa fallback provisório explícito");

  player.facing = -1;
  renderer.drawPlayer(ctx, model, 1.2);
  assert.equal(draws.at(-1)[2], 3, "facing esquerdo compensa 32 px para espelhar no pivô corporal X=16");
  assert.equal(draws.at(-1)[3], 176, "ambos os facings preservam a mesma origem vertical e linha de chão");
  assert.equal(draws.at(-1)[6], true);
});

test("patrol-shooter nunca usa a torreta fixa como fallback do arquétipo móvel", () => {
  const draws = [];
  const lines = [];
  const renderer = Object.create(Renderer.prototype);
  renderer.images = new Map([["turret.ready.0", { id: "ready" }]]);
  renderer.recordAnimationSample = () => {};
  renderer.drawMirrored = (...args) => draws.push(args);
  const ctx = {
    save() {}, restore() {}, setLineDash() {}, beginPath() {}, stroke() {},
    moveTo: (x, y) => lines.push({ type: "from", x, y }),
    lineTo: (x, y) => lines.push({ type: "to", x, y }),
    strokeRect() {},
    set strokeStyle(_) {}, set lineWidth(_) {}
  };
  const enemy = {
    id: "mobile-1", kind: "patrol-shooter", x: 64, y: 208, w: 16, h: 32,
    facing: 1, phase: "patrol", phaseTime: 0, recoilTime: 0, animTime: 0,
    aimX: 151, aimY: 224
  };
  const model = {
    state: "playing", elapsed: 1, runId: 1, enemies: [enemy], defeatVisuals: [],
    encounter: { shooterRecovery: 1.35 }
  };

  renderer.drawEnemies(ctx, model, 1);
  assert.equal(draws.length, 0, "sem walk frames, a pose ready não é deslizada durante patrulha");

  enemy.phase = "aim";
  enemy.phaseTime = 0.45;
  renderer.drawEnemies(ctx, model, 1.1);
  assert.equal(draws.length, 0, "a torreta fixa não substitui o atirador móvel nem parado");
  assert.deepEqual(lines.at(-2), { type: "from", x: 82, y: 221 });
  assert.deepEqual(lines.at(-1), { type: "to", x: 151, y: 224 });

  renderer.images.set("patrolShooter.patrol.0", { id: "mobile-safe" });
  renderer.drawEnemies(ctx, model, 1.2);
  assert.equal(draws.length, 1, "estado ausente segura uma pose do mesmo arquétipo");
  assert.equal(draws[0][1].id, "mobile-safe");
});

test("patrol-shooter avança frames articulados na patrulha e mapeia mira, tiro e recuperação", () => {
  const draws = [];
  const samples = [];
  const renderer = Object.create(Renderer.prototype);
  renderer.images = new Map([
    ["patrolShooter.patrol.0", { id: "patrol-0" }],
    ["patrolShooter.patrol.1", { id: "patrol-1" }],
    ["patrolShooter.aim.0", { id: "aim-0" }],
    ["patrolShooter.aim.1", { id: "aim-1" }],
    ["patrolShooter.fire.0", { id: "fire-0" }],
    ["patrolShooter.recovery.0", { id: "recovery-0" }],
    ["patrolShooter.recovery.3", { id: "recovery-3" }]
  ]);
  renderer.recordAnimationSample = (s) => samples.push(s);
  renderer.drawMirrored = (...args) => draws.push(args);
  const ctx = {
    save() {}, restore() {}, setLineDash() {}, beginPath() {}, stroke() {},
    moveTo() {}, lineTo() {}, strokeRect() {},
    set strokeStyle(_) {}, set lineWidth(_) {}
  };
  const enemy = {
    id: "mobile-robot-1", kind: "patrol-shooter", x: 64, y: 208, w: 16, h: 32,
    facing: -1, phase: "patrol", phaseTime: 0, recoilTime: 0, fireFeedbackTime: 0, animTime: 0,
    aimX: 30, aimY: 220
  };
  const model = {
    state: "playing", elapsed: 1, runId: 1, enemies: [enemy], defeatVisuals: [],
    encounter: { shooterRecovery: 1.25 }
  };

  // 1. Patrol frame 0 (facing left -> mirrored = false)
  renderer.drawEnemies(ctx, model, 1);
  assert.equal(draws.length, 1);
  assert.equal(draws[0][1].id, "patrol-0");
  assert.equal(draws[0][2], 56, "drawX = enemy.x + 8 - 16 = 56");
  assert.equal(draws[0][3], 208);
  assert.equal(draws[0][4], 32);
  assert.equal(draws[0][5], 32);
  assert.equal(draws[0][6], false, "facing < 0 não espelha horizontalmente");
  assert.equal(samples.at(-1).assetKey, "patrolShooter.patrol.0");

  // 2. Patrol frame 1 (at 12 fps, dt = 1/12s = ~0.084s -> frame 1)
  enemy.animTime = 0.09;
  renderer.drawEnemies(ctx, model, 1.09);
  assert.equal(draws.length, 2);
  assert.equal(draws[1][1].id, "patrol-1");
  assert.equal(samples.at(-1).assetKey, "patrolShooter.patrol.1");

  // 3. Aim state
  enemy.phase = "aim";
  enemy.phaseTime = 0.45;
  enemy.animTime = 0.25;
  renderer.drawEnemies(ctx, model, 1.34);
  assert.equal(draws.length, 3);
  assert.equal(draws[2][1].id, "aim-1");
  assert.equal(samples.at(-1).assetKey, "patrolShooter.aim.1");

  // 4. Fire state
  enemy.phase = "recovery";
  enemy.fireFeedbackTime = 0.08;
  enemy.animTime = 0.005;
  renderer.drawEnemies(ctx, model, 1.345);
  assert.equal(draws.length, 4);
  assert.equal(draws[3][1].id, "fire-0");
  assert.equal(samples.at(-1).assetKey, "patrolShooter.fire.0");

  // 5. Recovery state during recoil kick
  enemy.phase = "recovery";
  enemy.fireFeedbackTime = 0;
  enemy.recoilTime = 0.25;
  enemy.animTime = 0.03;
  renderer.drawEnemies(ctx, model, 1.375);
  assert.equal(draws.length, 5);
  assert.equal(draws[4][1].id, "recovery-0");
  assert.equal(samples.at(-1).assetKey, "patrolShooter.recovery.0");

  // 6. Recovery settled
  enemy.recoilTime = 0;
  enemy.animTime = 0.50;
  renderer.drawEnemies(ctx, model, 1.875);
  assert.equal(draws.length, 6);
  assert.equal(draws[5][1].id, "recovery-3");
  assert.equal(samples.at(-1).assetKey, "patrolShooter.recovery.3");
});

test("Nilo resolve todos os 21 frames originais diretamente no namespace nilo.* sem fallback", () => {
  const allStates = [
    { state: "idle", frames: 4 },
    { state: "walk", frames: 4 },
    { state: "jump", frames: 1 },
    { state: "fall", frames: 1 },
    { state: "attack1", frames: 4 },
    { state: "hurt", frames: 3 },
    { state: "die", frames: 4 }
  ];

  const renderer = Object.create(Renderer.prototype);
  renderer.images = new Map();
  for (const { state, frames } of allStates) {
    for (let f = 0; f < frames; f++) {
      renderer.images.set(`nilo.${state}.${f}`, { id: `nilo-${state}-${f}` });
    }
  }

  const char = resolveCharacter("support", 4);
  for (const { state, frames } of allStates) {
    for (let f = 0; f < frames; f++) {
      const { image, assetKey } = renderer.resolveAnimationImage(
        [char.spritePrefix, char.fallbackSpritePrefix],
        state,
        f,
        "player.idle.0"
      );
      assert.equal(assetKey, `nilo.${state}.${f}`);
      assert.equal(image.id, `nilo-${state}-${f}`);
    }
  }
});

test("efeito de cura renderiza nilo.heal VFX e HUD exibe NILO definitivo", () => {
  const renderer = Object.create(Renderer.prototype);
  const drawnImages = [];
  const textFills = [];
  renderer.images = new Map([
    ["nilo.heal.0", { id: "heal-vfx-0" }],
    ["nilo.heal.1", { id: "heal-vfx-1" }]
  ]);
  const ctx = {
    save() {}, restore() {}, fillRect() {}, beginPath() {}, stroke() {}, arc() {}, fill() {},
    createRadialGradient() { return { addColorStop() {} }; },
    drawImage(...args) { drawnImages.push(args); },
    fillText(...args) { textFills.push(args); },
    strokeText() {},
    strokeRect() {},
    measureText() { return { width: 10 }; },
    set globalAlpha(_) {}, set shadowColor(_) {}, set shadowBlur(_) {},
    set fillStyle(_) {}, set strokeStyle(_) {}, set lineWidth(_) {},
    set font(_) {}, set textBaseline(_) {}
  };
  renderer.drawHudPanel = () => {};

  // 1. Heal VFX rendering
  const model = {
    effects: [{ kind: "heal", x: 100, y: 150, life: 0.65, duration: 0.75, text: "+1 VIDA" }],
    reducedMotion: false
  };
  renderer.drawEffects(ctx, model, 0.1);
  assert.equal(drawnImages.length, 1);
  assert.equal(drawnImages[0][0].id, "heal-vfx-0");
  assert.equal(drawnImages[0][1], 84); // 100 - 16
  assert.equal(drawnImages[0][2], 134); // 150 - 16

  // 2. HUD text check: provisionalVisual: false displays "NILO"
  const hudModel = {
    characterId: "support",
    character: resolveCharacter("support", 4),
    player: { life: 4 },
    playerMaxLife: 4,
    altar: { life: 3, deposited: 0 },
    objective: { soulsGoal: 8, altarMaxLife: 3 },
    carriedSouls: 0,
    elapsed: 10
  };
  renderer.drawHud(ctx, hudModel, 10);
  const nameCall = textFills.find((call) => call[0] === "NILO");
  assert.ok(nameCall, "HUD deve renderizar 'NILO' sem o sufixo '(PROV.)' quando a arte definitiva está integrada");
});

test("drawAltar resolve variantes por nível, LEDs de integridade, alerta crítico e pulso de depósito", () => {
  const mockNeonAltar = { width: 32, height: 48, id: "neon-altar" };
  const mockFactoryAltar = { width: 32, height: 48, id: "factory-altar" };
  const images = new Map([
    ["altar.distrito-neon.0", mockNeonAltar],
    ["altar.scrap-factory.0", mockFactoryAltar]
  ]);

  const drawnImages = [];
  const rects = [];
  const textFills = [];
  const ctx = {
    save() {}, restore() {}, beginPath() {}, stroke() {}, fill() {}, arc() {},
    fillRect(x, y, w, h) { rects.push({ x, y, w, h }); },
    strokeRect() {},
    drawImage(...args) { drawnImages.push(args); },
    fillText(...args) { textFills.push(args); },
    measureText() { return { width: 10 }; },
    set globalAlpha(_) {}, set shadowColor(_) {}, set shadowBlur(_) {},
    set fillStyle(_) {}, set strokeStyle(_) {}, set lineWidth(_) {},
    set font(_) {}, set textAlign(_) {}
  };

  const canvas = { width: 480, height: 270, getContext: () => ctx };
  const renderer = new Renderer(canvas, images);

  // 1. Distrito Neon resolution & full health (4 HP)
  const neonModel = {
    levelId: "distrito-neon",
    altar: { x: 208, y: 192, w: 32, h: 48, life: 4, deposited: 0, invulnerable: 0 },
    objective: { soulsGoal: 15, altarMaxLife: 4 },
    effects: [],
    reducedMotion: false,
    canDeposit: () => false
  };
  renderer.drawAltar(ctx, neonModel, 1.0);
  assert.equal(drawnImages[0][0], mockNeonAltar, "Distrito Neon deve resolver altar.distrito-neon.0");
  // 4 integrity LEDs drawn at base (y = 192 + 43 = 235)
  const leds = rects.filter((r) => r.y === 235 && r.w === 3 && r.h === 2);
  assert.equal(leds.length, 4, "Altar 4 HP deve renderizar 4 LEDs de integridade na base");

  // 2. Fábrica de Sucata resolution & critical health (1 HP) with warning symbol
  drawnImages.length = 0;
  rects.length = 0;
  textFills.length = 0;
  const factoryModel = {
    levelId: "scrap-factory",
    altar: { x: 40, y: 192, w: 32, h: 48, life: 1, deposited: 0, invulnerable: 0 },
    objective: { soulsGoal: 15, altarMaxLife: 4 },
    effects: [],
    reducedMotion: false,
    canDeposit: () => false
  };
  renderer.drawAltar(ctx, factoryModel, 1.0);
  assert.equal(drawnImages[0][0], mockFactoryAltar, "Fábrica de Sucata deve resolver altar.scrap-factory.0");
  assert.ok(textFills.some((call) => call[0] === "!"), "Altar crítico (1 HP) deve renderizar símbolo de alerta '!'");

  // 3. Deposit event column pulse
  rects.length = 0;
  neonModel.effects = [{ kind: "deposit", x: 224, y: 204, life: 1.0, duration: 1.15, text: "+3 NO ALTAR" }];
  renderer.drawAltar(ctx, neonModel, 1.0);
  // Column surge rectangle at (altar.x + 13 = 221, altar.y + 12 = 204, w: 6, h: 26)
  assert.ok(rects.some((r) => r.x === 221 && r.y === 204 && r.w === 6 && r.h === 26), "Depósito ativo deve desenhar coluna de surto energético");
});

test("drawEffects apresenta feedback numérico conciso para combate, cura e objetivos", () => {
  const images = new Map();
  const strokes = [];
  const fills = [];
  const ctx = {
    save() {}, restore() {}, beginPath() {}, stroke() {}, fill() {}, arc() {},
    fillRect() {}, strokeRect() {}, drawImage() {},
    moveTo() {}, lineTo() {},
    createRadialGradient() { return { addColorStop() {} }; },
    strokeText(text, x, y) { strokes.push({ text, x, y }); },
    fillText(text, x, y) { fills.push({ text, x, y }); },
    set globalAlpha(_) {}, set shadowColor(_) {}, set shadowBlur(_) {},
    set fillStyle(_) {}, set strokeStyle(_) {}, set lineWidth(_) {},
    set font(_) {}, set textAlign(_) {}, set textBaseline(_) {}
  };
  const canvas = { width: 480, height: 270, getContext: () => ctx };
  const renderer = new Renderer(canvas, images);

  const model = {
    effects: [
      { kind: "hit", x: 120, y: 140, life: 0.3, duration: 0.42, text: "ACERTO" },
      { kind: "damage", x: 150, y: 140, life: 0.5, duration: 0.72, text: "DANO" },
      { kind: "heal", x: 180, y: 140, life: 0.5, duration: 0.75, text: "+1 VIDA" },
      { kind: "collect", x: 210, y: 140, life: 0.5, duration: 0.75, text: "+1 CARREGADA" },
      { kind: "deposit", x: 240, y: 140, life: 0.8, duration: 1.15, text: "+3 NO ALTAR" },
      { kind: "bonusTimePenalty", x: 270, y: 140, life: 0.4, duration: 0.62, text: "−1 s" }
    ],
    reducedMotion: false
  };

  renderer.drawEffects(ctx, model, 1.0);

  // Verificações de formatação concisa de combate
  assert.ok(fills.some((f) => f.text === "−1"), "ACERTO e DANO devem formatar indicador numérico conciso '−1'");
  assert.ok(fills.some((f) => f.text === "+1"), "Cura e coleta devem formatar indicador conciso '+1'");
  assert.ok(fills.some((f) => f.text === "+3"), "Depósito deve extrair montante conciso '+3'");
  assert.ok(fills.some((f) => f.text === "−1 s"), "Penalidade do canhão bônus deve preservar exatamente '−1 s'");
});

test("Renderer suporta renderScale configurável, escala o contexto e preserva coordenadas lógicas", () => {
  const scaledCalls = [];
  const ctx = {
    save() { scaledCalls.push({ type: "save" }); },
    restore() { scaledCalls.push({ type: "restore" }); },
    setTransform(a, b, c, d, e, f) { scaledCalls.push({ type: "setTransform", a, b, c, d, e, f }); },
    clearRect(x, y, w, h) { scaledCalls.push({ type: "clearRect", x, y, w, h }); },
    scale(sx, sy) { scaledCalls.push({ type: "scale", sx, sy }); },
    fillRect() {}, strokeRect() {}, beginPath() {}, stroke() {}, fill() {},
    moveTo() {}, lineTo() {}, closePath() {},
    createLinearGradient() { return { addColorStop() {} }; },
    set fillStyle(_) {}, set strokeStyle(_) {}, set lineWidth(_) {}, set globalAlpha(_) {}
  };
  const canvas = { width: 960, height: 540, getContext: () => ctx };
  const renderer = new Renderer(canvas, new Map(), { renderScale: 2 });

  assert.equal(renderer.renderScale, 2, "renderScale deve ser 2 quando configurado ou derivado de 960x540");
  assert.equal(renderer.logicalWidth, 480, "largura lógica deve ser rigorosamente 480");
  assert.equal(renderer.logicalHeight, 270, "altura lógica deve ser rigorosamente 270");
  assert.equal(ctx.imageSmoothingEnabled, true, "imageSmoothingEnabled deve ser true para renderScale > 1");

  const model = {
    state: "menu",
    level: { theme: "distrito-neon" },
    player: null
  };
  renderer.render(model, 1.0);

  const scaleCall = scaledCalls.find((c) => c.type === "scale");
  assert.ok(scaleCall, "render deve chamar ctx.scale com a escala configurada");
  assert.equal(scaleCall.sx, 2);
  assert.equal(scaleCall.sy, 2);
  assert.deepEqual(scaledCalls.find((c) => c.type === "clearRect"), {
    type: "clearRect", x: 0, y: 0, w: 960, h: 540
  }, "cada quadro limpa o backing buffer físico completo antes da escala lógica");

  renderer.setRenderScale(1.5);
  assert.equal(renderer.renderScale, 1.5);
  assert.equal(canvas.width, 720);
  assert.equal(canvas.height, 405);

  renderer.setRenderScale(1);
  scaledCalls.length = 0;
  renderer.render(model, 2);
  assert.deepEqual(scaledCalls.find((c) => c.type === "clearRect"), {
    type: "clearRect", x: 0, y: 0, w: 480, h: 270
  }, "renderScale 1 também limpa o backing buffer inteiro");
  assert.equal(scaledCalls.some((c) => c.type === "scale"), false, "escala lógica 1× não recebe transform redundante");
});

test("shake fica restrito ao mundo e HUD permanece em screen-space com estado Canvas balanceado", () => {
  const calls = [];
  const stack = [];
  let transform = { x: 0, y: 0, scale: 1 };
  const ctx = {
    save() { stack.push({ ...transform }); calls.push({ type: "save" }); },
    restore() { transform = stack.pop(); calls.push({ type: "restore" }); },
    setTransform(a, _b, _c, d, e, f) {
      transform = { x: e, y: f, scale: a };
      calls.push({ type: "setTransform", a, d, e, f });
    },
    clearRect(x, y, w, h) { calls.push({ type: "clearRect", x, y, w, h, transform: { ...transform } }); },
    scale(sx) { transform.scale *= sx; calls.push({ type: "scale", sx }); },
    translate(x, y) { transform.x += x; transform.y += y; calls.push({ type: "translate", x, y }); },
    set globalAlpha(value) { calls.push({ type: "alpha", value }); },
    set globalCompositeOperation(value) { calls.push({ type: "composite", value }); },
    set imageSmoothingEnabled(_) {},
    set imageSmoothingQuality(_) {}
  };
  const canvas = { width: 960, height: 540, getContext: () => ctx };
  const renderer = new Renderer(canvas, new Map(), { renderScale: 2 });
  renderer.drawBackground = () => calls.push({ type: "pass", name: "background", transform: { ...transform } });
  renderer.drawWorld = () => calls.push({ type: "pass", name: "world", transform: { ...transform } });
  renderer.drawHud = () => calls.push({ type: "pass", name: "hud", transform: { ...transform } });
  renderer.screenShake = 3;

  renderer.render({ state: "playing", player: {} }, 1);

  const clear = calls.find((call) => call.type === "clearRect");
  const background = calls.find((call) => call.type === "pass" && call.name === "background");
  const world = calls.find((call) => call.type === "pass" && call.name === "world");
  const hud = calls.find((call) => call.type === "pass" && call.name === "hud");
  assert.deepEqual(clear, { type: "clearRect", x: 0, y: 0, w: 960, h: 540, transform: { x: 0, y: 0, scale: 1 } });
  assert.deepEqual(background.transform, { x: 0, y: 0, scale: 2 });
  assert.ok(calls.some((call) => call.type === "translate"), "shake continua aplicado ao passe do mundo");
  assert.notDeepEqual(world.transform, hud.transform, "HUD não herda a translação do mundo");
  assert.deepEqual(hud.transform, { x: 0, y: 0, scale: 2 });
  assert.equal(stack.length, 0, "todo save possui restore correspondente ao fim do quadro");
  assert.deepEqual(transform, { x: 0, y: 0, scale: 1 });
});

test("Distrito usa camadas atmosféricas no relógio da simulação e pausa as congela", () => {
  const times = [];
  const background = { width: 1672, height: 941 };
  const gradient = { addColorStop() {} };
  const ctx = {
    fillRect() {},
    drawImage() {},
    createLinearGradient() { return gradient; },
    set fillStyle(_) {}
  };
  const renderer = Object.create(Renderer.prototype);
  renderer.images = new Map([["world.background", background]]);
  renderer.renderScale = 1;
  renderer.drawNeonAtmosphericLayers = (_ctx, _model, time) => times.push(["fog", time]);
  renderer.drawCyberpunkRain = (_ctx, _model, time) => times.push(["rain", time]);
  renderer.drawSweepingLaserGrid = (_ctx, _model, time) => times.push(["laser", time]);
  renderer.drawAltarReactiveLighting = () => {};

  renderer.drawBackground(ctx, {
    state: "paused",
    player: {},
    elapsed: 12.5,
    level: { theme: "neon-district" },
    altar: null
  }, 999);

  assert.deepEqual(times, [["fog", 12.5], ["rain", 12.5], ["laser", 12.5]],
    "efeitos do Distrito não avançam com relógio de parede durante pausa");
});

test("cartões temporários e aviso usam slots fixos sem saltos de layout", () => {
  const panels = [];
  const banners = [];
  const bossBars = [];
  const renderer = Object.create(Renderer.prototype);
  renderer.drawHudPanel = (_ctx, x, y, width, height, accent) => panels.push({ x, y, width, height, accent });
  renderer.drawHudBanner = (_ctx, text, y, options) => banners.push({ text, y, options });
  renderer.drawBossHealthBar = (_ctx, model) => bossBars.push(model.bossHealth);
  const ctx = {
    save() {}, restore() {}, fillRect() {}, strokeRect() {}, fillText() {},
    createLinearGradient() { return { addColorStop() {} }; },
    set fillStyle(_) {}, set strokeStyle(_) {}, set lineWidth(_) {},
    set font(_) {}, set textBaseline(_) {}, set textAlign(_) {}
  };
  const model = {
    coopPreview: false,
    gameMode: "campaign",
    characterId: "support",
    character: resolveCharacter("support", 4),
    player: { life: 4, rapidFire: false, rapidFireRemaining: 0, shield: false },
    playerMaxLife: 4,
    altar: { life: 4, deposited: 3 },
    objective: { soulsGoal: 15, altarMaxLife: 4 },
    carriedSouls: 2,
    elapsed: 20,
    reducedMotion: true,
    activePowerUp: { id: "double-burst", remaining: 4 },
    ability: { ready: false, rechargeRemaining: 8, rechargeDuration: 20 },
    notice: { text: "AVISO CONTROLADO" },
    canDeposit: () => false
  };

  renderer.drawHud(ctx, model, 20);
  assert.ok(panels.some(({ x, y }) => x === 8 && y === 51), "Double Burst ocupa o primeiro slot fixo");
  assert.ok(panels.some(({ x, y }) => x === 8 && y === 73), "Cura ocupa o segundo slot fixo");
  assert.deepEqual(banners.at(-1), {
    text: "AVISO CONTROLADO", y: 51, options: { danger: false, left: 152, right: 472 }
  });

  panels.length = 0;
  banners.length = 0;
  model.activePowerUp = null;
  renderer.drawHud(ctx, model, 21);
  assert.ok(panels.some(({ x, y }) => x === 8 && y === 73), "Cura não salta quando Double Burst termina");
  assert.equal(panels.some(({ x, y }) => x === 8 && y === 51), false, "slot expirado fica vazio sem deslocar o restante");
  assert.equal(banners.at(-1).y, 51, "aviso permanece na mesma faixa vertical");

  panels.length = 0;
  banners.length = 0;
  model.player.rapidFire = true;
  model.player.rapidFireRemaining = 6.4;
  model.player.shield = true;
  model.bossActive = true;
  model.bossHealth = 0.72;
  renderer.drawHud(ctx, model, 22);
  assert.ok(panels.some(({ x, y }) => x === 8 && y === 95), "Tiro Rápido possui slot próprio e não se apresenta como Rajada Dupla");
  assert.ok(panels.some(({ x, y }) => x === 8 && y === 117), "Escudo possui slot próprio enquanto sua carga existe");
  assert.equal(banners.at(-1).y, 77, "aviso essencial desce para uma faixa independente quando o chefe está visível");
  assert.deepEqual(bossBars, [0.72]);
});

test("Renderer resolve variantes ilustradas com renderScale > 1 e fallback clássico com renderScale = 1", () => {
  const images = new Map([
    ["player.idle.0", { id: "legacy-idle-0" }],
    ["player.illustrated.idle.0", { id: "illustrated-idle-0" }],
    ["altar.distrito-neon.0", { id: "legacy-altar-0" }],
    ["altar.distrito-neon.illustrated.0", { id: "illustrated-altar-0" }]
  ]);

  // renderScale = 1 -> legacy key
  const r1 = new Renderer({ width: 480, height: 270, getContext: () => ({}) }, images, { renderScale: 1 });
  const res1 = r1.resolveAnimationImage("player", "idle", 0, "player.idle.0");
  assert.equal(res1.assetKey, "player.idle.0");
  assert.equal(res1.image.id, "legacy-idle-0");

  // renderScale = 2 -> illustrated key
  const r2 = new Renderer({ width: 960, height: 540, getContext: () => ({}) }, images, { renderScale: 2 });
  const res2 = r2.resolveAnimationImage("player", "idle", 0, "player.idle.0");
  assert.equal(res2.assetKey, "player.illustrated.idle.0");
  assert.equal(res2.image.id, "illustrated-idle-0");
});

test("Chaser e patrol-shooter consomem os frames ilustrados e mantêm fallback do arquétipo", () => {
  const draws = [];
  const samples = [];
  const ctx = {
    save() {}, restore() {}, setLineDash() {}, beginPath() {}, stroke() {},
    moveTo() {}, lineTo() {}, strokeRect() {},
    set strokeStyle(_) {}, set lineWidth(_) {}
  };
  const images = new Map([
    ["chaser.walk.0", { id: "chaser-classic" }],
    ["chaser.illustrated.walk.0", { id: "chaser-illustrated" }],
    ["chaser.idle", { id: "chaser-idle" }],
    ["patrolShooter.patrol.0", { id: "patrol-classic" }],
    ["patrolShooter.illustrated.patrol.0", { id: "patrol-illustrated" }],
    ["turret.ready.0", { id: "fixed-turret" }]
  ]);
  const renderer = Object.create(Renderer.prototype);
  renderer.images = images;
  renderer.renderScale = 2;
  renderer.recordAnimationSample = (sample) => samples.push(sample);
  renderer.drawMirrored = (...args) => draws.push(args);
  const chaser = {
    id: "chaser-1", kind: "chaser", x: 30, y: 208, w: 16, h: 32,
    facing: 1, onGround: true, vx: 52, attackFlash: 0, animTime: 0
  };
  const patrol = {
    id: "patrol-1", kind: "patrol-shooter", x: 90, y: 208, w: 16, h: 32,
    facing: -1, phase: "patrol", phaseTime: 0, recoilTime: 0,
    fireFeedbackTime: 0, animTime: 0, aimX: 30, aimY: 220
  };
  const model = {
    state: "playing", elapsed: 1, runId: 1, enemies: [chaser, patrol],
    defeatVisuals: [], encounter: { shooterRecovery: 1.25 }
  };

  renderer.drawEnemies(ctx, model, 1);
  assert.deepEqual(draws.map((draw) => draw[1].id), ["chaser-illustrated", "patrol-illustrated"]);
  assert.deepEqual(draws.map((draw) => ({ x: draw[2], y: draw[3], w: draw[4], h: draw[5] })), [
    { x: 22, y: 208, w: 32, h: 64 },
    { x: 66, y: 208, w: 64, h: 64 }
  ], "arte ilustrada usa pivô central e pé local y=32 sem ser reduzida a meia altura");
  assert.deepEqual(samples.map((sample) => sample.assetKey), [
    "chaser.illustrated.walk.0",
    "patrolShooter.illustrated.patrol.0"
  ]);

  images.delete("patrolShooter.illustrated.patrol.0");
  patrol.phase = "aim";
  patrol.animTime = 0.4;
  renderer.drawEnemies(ctx, model, 1.4);
  assert.equal(draws.at(-1)[1].id, "patrol-classic", "fallback permanece no patrol-shooter, nunca na torreta fixa");
  assert.notEqual(draws.at(-1)[1].id, "fixed-turret");
});


