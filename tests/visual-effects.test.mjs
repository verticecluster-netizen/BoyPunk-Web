import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { Renderer } from "../src/renderer.js";

const [html, css] = await Promise.all([
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../styles.css", import.meta.url), "utf8")
]);

test("TASK 1: Renderer implementa efeitos ambientais dinâmicos (chuva cyberpunk, fagulhas e poças neon)", () => {
  const calls = [];
  const ctx = {
    calls,
    save: () => calls.push({ type: "save" }),
    restore: () => calls.push({ type: "restore" }),
    beginPath: () => calls.push({ type: "beginPath" }),
    moveTo: (x, y) => calls.push({ type: "moveTo", x, y }),
    lineTo: (x, y) => calls.push({ type: "lineTo", x, y }),
    stroke: () => calls.push({ type: "stroke" }),
    fill: () => calls.push({ type: "fill" }),
    fillRect: (x, y, w, h) => calls.push({ type: "fillRect", x, y, w, h }),
    set strokeStyle(val) { calls.push({ type: "strokeStyle", val }); },
    set fillStyle(val) { calls.push({ type: "fillStyle", val }); },
    set lineWidth(val) { calls.push({ type: "lineWidth", val }); }
  };

  const renderer = Object.create(Renderer.prototype);

  // 1. Cyberpunk rain in Distrito Neon
  renderer.drawCyberpunkRain(ctx, { reducedMotion: false }, 1.5);
  const rainStrokes = calls.filter((c) => c.type === "stroke");
  assert.ok(rainStrokes.length > 50, "Chuva cyberpunk gera feixes suficientes para atmosfera neon");

  // Reduced motion desativa a chuva
  calls.length = 0;
  renderer.drawCyberpunkRain(ctx, { reducedMotion: true }, 1.5);
  assert.equal(calls.length, 0, "Chuva respeita reducedMotion");

  // Camadas atmosféricas do Distrito: três planos, quatro bancos por plano.
  calls.length = 0;
  renderer.drawNeonAtmosphericLayers(ctx, { reducedMotion: false }, 2);
  const fogAtTwo = calls.filter((c) => c.type === "fillRect");
  assert.equal(fogAtTwo.length, 12);
  assert.equal(calls.filter((c) => c.type === "save").length, 1);
  assert.equal(calls.filter((c) => c.type === "restore").length, 1);

  calls.length = 0;
  renderer.drawNeonAtmosphericLayers(ctx, { reducedMotion: false }, 3);
  const fogAtThree = calls.filter((c) => c.type === "fillRect");
  assert.notEqual(fogAtThree[0].x, fogAtTwo[0].x, "névoa usa tempo de simulação");

  calls.length = 0;
  renderer.drawNeonAtmosphericLayers(ctx, { reducedMotion: true }, 99);
  const reducedFog = calls.filter((c) => c.type === "fillRect");
  calls.length = 0;
  renderer.drawNeonAtmosphericLayers(ctx, { reducedMotion: true }, 1);
  assert.deepEqual(calls.filter((c) => c.type === "fillRect"), reducedFog,
    "movimento reduzido mantém as camadas estáticas");

  // 2. Floating embers na Fábrica e Câmara de Energia
  calls.length = 0;
  renderer.drawFloatingEmbers(ctx, { reducedMotion: false }, 2.0, "factory");
  const emberRects = calls.filter((c) => c.type === "fillRect");
  assert.ok(emberRects.length >= 40, "Fagulhas flutuantes na fábrica geram partículas de calor");

  // 3. Poças neon no chão do Distrito Neon
  calls.length = 0;
  renderer.drawNeonPuddles(ctx, {});
  const puddleRects = calls.filter((c) => c.type === "fillRect");
  assert.ok(puddleRects.length >= 4, "Poças neon desenham reflexos no piso");
});

test("TASK 2: Enemy Attack Telegraphing (charging muzzle flash e chaser growl/eye flash)", () => {
  const calls = [];
  const lines = [];
  const ctx = {
    calls,
    save: () => calls.push({ type: "save" }),
    restore: () => calls.push({ type: "restore" }),
    beginPath: () => calls.push({ type: "beginPath" }),
    stroke: () => calls.push({ type: "stroke" }),
    fill: () => calls.push({ type: "fill" }),
    arc: (x, y, r, sa, ea) => calls.push({ type: "arc", x, y, r, sa, ea }),
    fillRect: (x, y, w, h) => calls.push({ type: "fillRect", x, y, w, h }),
    strokeRect: (x, y, w, h) => calls.push({ type: "strokeRect", x, y, w, h }),
    setLineDash: () => {},
    moveTo: (x, y) => { lines.push({ type: "from", x, y }); calls.push({ type: "moveTo", x, y }); },
    lineTo: (x, y) => { lines.push({ type: "to", x, y }); calls.push({ type: "lineTo", x, y }); },
    createRadialGradient: () => ({ addColorStop: () => {} }),
    set strokeStyle(val) { calls.push({ type: "strokeStyle", val }); },
    set fillStyle(val) { calls.push({ type: "fillStyle", val }); },
    set lineWidth(val) { calls.push({ type: "lineWidth", val }); }
  };

  const renderer = Object.create(Renderer.prototype);
  renderer.images = new Map();
  renderer.recordAnimationSample = () => {};
  renderer.drawMirrored = () => {};

  // Chaser growl / eye flare telegraph ao atacar
  const chaser = {
    id: "chaser-1", kind: "chaser", x: 40, y: 208, w: 16, h: 32,
    facing: 1, attackFlash: 0.18, animTime: 0.05
  };
  renderer.drawChaserTelegraph(ctx, chaser, false, true);
  assert.ok(calls.some((c) => c.type === "arc"), "Chaser emite onda sonora de growl");
  assert.ok(calls.some((c) => c.type === "fillRect"), "Chaser pisca brilho vermelho no olho");

  // Patrol shooter charging muzzle flash nos 0.4s finais de mira
  calls.length = 0;
  const patrolShooter = {
    id: "patrol-1", kind: "patrol-shooter", x: 64, y: 208, w: 16, h: 32,
    facing: 1, phase: "aim", phaseTime: 0.25, recoilTime: 0, fireFeedbackTime: 0, animTime: 0.65,
    aimX: 180, aimY: 220
  };
  const model = {
    state: "playing", elapsed: 1, runId: 1, enemies: [patrolShooter], defeatVisuals: [],
    encounter: { shooterRecovery: 1.25 }
  };
  renderer.drawEnemies(ctx, model, 1.65);
  const muzzleFlashArcs = calls.filter((c) => c.type === "arc");
  assert.ok(muzzleFlashArcs.length >= 2, "Charging muzzle flash e retículo desenhados durante telegraph");
});

test("TASK 3: Transições de tela em CSS/HTML (.transition-glitch e .transition-fade)", () => {
  // Shell HTML
  assert.match(html, /<div[^>]+id="screen-transition"[^>]+class="screen-transition"/, "Shell de transição presente no HTML");

  // Classes CSS e keyframes
  assert.match(css, /\.screen-transition\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?inset:\s*0;/, "Overlay cobrindo a tela");
  assert.match(css, /\.transition-fade\s*\{[\s\S]*?animation:\s*screen-fade-transition\s*0\.5s/, "Fade para preto/neon-violeta");
  assert.match(css, /\.transition-glitch\s*\{[\s\S]*?animation:\s*screen-glitch-transition\s*0\.5s/, "Distorção horizontal glitch");
  assert.match(css, /@keyframes\s+screen-fade-transition\s*\{[\s\S]*?opacity:\s*1;/, "Keyframes do fade");
  assert.match(css, /@keyframes\s+screen-glitch-transition\s*\{[\s\S]*?clip-path:\s*inset/, "Keyframes do glitch horizontal com clip-path");
});

test("TASK 4: Retrato HUD e estados emocionais (.portrait-normal, .portrait-hurt, .portrait-healing)", () => {
  // Shell HTML
  assert.match(html, /<div[^>]+id="hud-portrait"[^>]+class="[^"]*hud-portrait[^"]*"/, "Shell de retrato presente no HTML");
  assert.match(html, /class="[^"]*boypunk-avatar[^"]*"/, "Avatar do BoyPunk presente");
  assert.match(html, /class="[^"]*nilo-avatar[^"]*"/, "Avatar de Nilo presente");

  // Classes CSS
  assert.match(css, /\.hud-portrait\s*\{[\s\S]*?width:\s*32px;[\s\S]*?height:\s*32px;/, "Área 32x32px do display de alta tecnologia");
  assert.match(css, /\.portrait-normal\s*\{[\s\S]*?border-color:/, "Estado normal estável");
  assert.match(css, /\.portrait-hurt\s*\{[\s\S]*?#ff3b69[\s\S]*?animation:\s*portrait-hurt-tilt/, "Estado ferido com piscar vermelho e inclinação");
  assert.match(css, /\.portrait-healing\s*\{[\s\S]*?#2ee690[\s\S]*?animation:\s*portrait-heal-pulse/, "Estado curando com pulso verde esmeralda");
  assert.match(css, /@keyframes\s+portrait-hurt-tilt\s*\{[\s\S]*?rotate\(/, "Keyframes com inclinação no dano");
  assert.match(css, /@keyframes\s+portrait-heal-pulse\s*\{[\s\S]*?scale\(/, "Keyframes com pulso na cura");

  // Reduced motion
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.hud-portrait,\s*\.portrait-hurt,\s*\.portrait-healing\s*\{[\s\S]*?animation:\s*none !important;/);
});

test("TASK 1 (In-World Power-Ups): Renderer desenha power-ups flutuantes com 3 estilos distintos e brilho no chão", () => {
  const calls = [];
  const ctx = {
    calls,
    save: () => calls.push({ type: "save" }),
    restore: () => calls.push({ type: "restore" }),
    beginPath: () => calls.push({ type: "beginPath" }),
    closePath: () => calls.push({ type: "closePath" }),
    stroke: () => calls.push({ type: "stroke" }),
    fill: () => calls.push({ type: "fill" }),
    arc: (x, y, r) => calls.push({ type: "arc", x, y, r }),
    ellipse: (x, y, rx, ry) => calls.push({ type: "ellipse", x, y, rx, ry }),
    fillRect: (x, y, w, h) => calls.push({ type: "fillRect", x, y, w, h }),
    strokeRect: (x, y, w, h) => calls.push({ type: "strokeRect", x, y, w, h }),
    moveTo: (x, y) => calls.push({ type: "moveTo", x, y }),
    lineTo: (x, y) => calls.push({ type: "lineTo", x, y }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
    set strokeStyle(val) { calls.push({ type: "strokeStyle", val }); },
    set fillStyle(val) { calls.push({ type: "fillStyle", val }); },
    set lineWidth(val) { calls.push({ type: "lineWidth", val }); },
    set globalCompositeOperation(val) { calls.push({ type: "globalCompositeOperation", val }); }
  };

  const renderer = Object.create(Renderer.prototype);

  // 1. Rapid fire (lightning bolt + amber glow)
  renderer.drawFloatingPowerUp(ctx, { type: "powerup", powerUpType: "rapid-fire", x: 100, y: 150, w: 20, h: 20 }, 1.0);
  assert.ok(calls.some((c) => c.type === "ellipse" || c.type === "fillRect"), "Brilho projetado no chão da plataforma");
  assert.ok(calls.some((c) => c.type === "strokeStyle" && c.val === "#ff7a28"), "Borda neon âmbar para rapid-fire");

  // 2. Health (emerald green cross)
  calls.length = 0;
  renderer.drawFloatingPowerUp(ctx, { type: "powerup", powerUpType: "health", x: 150, y: 150, w: 20, h: 20 }, 1.0);
  assert.ok(calls.some((c) => c.type === "fillStyle" && c.val === "#38ef7d"), "Cruz médica esmeralda brilhante");

  // 3. Shield (cyan hexagonal shield + rotating ring)
  calls.length = 0;
  renderer.drawFloatingPowerUp(ctx, { type: "powerup", powerUpType: "shield", x: 200, y: 150, w: 20, h: 20 }, 1.0);
  assert.ok(calls.some((c) => c.type === "strokeStyle" && c.val === "#37e6ee"), "Escudo hexagonal ciano");
  assert.ok(calls.some((c) => c.type === "arc"), "Anel externo rotativo com nós de energia");

  // A lista autoritativa continua visível mesmo sem o pickup legado de Rajada Dupla.
  let floatingDraws = 0;
  renderer.images = new Map();
  renderer.drawFloatingPowerUp = () => { floatingDraws += 1; };
  renderer.drawPowerUps(ctx, {
    gameMode: "campaign",
    powerUpPickup: null,
    powerUps: [
      { powerUpType: "rapid-fire" },
      { powerUpType: "health" },
      { powerUpType: "shield" }
    ]
  }, 1);
  assert.equal(floatingDraws, 3, "Rapid Fire, Health e Shield não dependem da presença da Rajada Dupla para renderizar");

  renderer.drawPowerUps(ctx, {
    gameMode: "survival",
    powerUpPickup: null,
    powerUps: [{ powerUpType: "rapid-fire" }]
  }, 1);
  assert.equal(floatingDraws, 4, "pickups compartilhados permanecem visíveis fora da campanha");
});

test("TASK 2 (Altar Evolution): drawAltarPhases desenha as 4 fases visuais distintas no Canvas", () => {
  const calls = [];
  const ctx = {
    calls,
    save: () => calls.push({ type: "save" }),
    restore: () => calls.push({ type: "restore" }),
    beginPath: () => calls.push({ type: "beginPath" }),
    stroke: () => calls.push({ type: "stroke" }),
    fill: () => calls.push({ type: "fill" }),
    arc: (x, y, r) => calls.push({ type: "arc", x, y, r }),
    ellipse: (x, y, rx, ry) => calls.push({ type: "ellipse", x, y, rx, ry }),
    fillRect: (x, y, w, h) => calls.push({ type: "fillRect", x, y, w, h }),
    strokeRect: (x, y, w, h) => calls.push({ type: "strokeRect", x, y, w, h }),
    moveTo: (x, y) => calls.push({ type: "moveTo", x, y }),
    lineTo: (x, y) => calls.push({ type: "lineTo", x, y }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
    set strokeStyle(val) { calls.push({ type: "strokeStyle", val }); },
    set fillStyle(val) { calls.push({ type: "fillStyle", val }); },
    set lineWidth(val) { calls.push({ type: "lineWidth", val }); },
    set globalCompositeOperation(val) { calls.push({ type: "globalCompositeOperation", val }); }
  };

  const renderer = Object.create(Renderer.prototype);

  // Fase 1: Violet base, steady glow
  renderer.drawAltarPhases(ctx, 1);
  assert.ok(calls.some((c) => c.type === "fillStyle" && c.val === "#ae62ff"), "Fase 1 usa base violeta");

  // Fase 2: Cyan base, pulsing energy ring
  calls.length = 0;
  renderer.drawAltarPhases(ctx, 2);
  assert.ok(calls.some((c) => c.type === "fillStyle" && c.val === "#37e6ee"), "Fase 2 usa base ciano");
  assert.ok(calls.some((c) => c.type === "ellipse" || c.type === "strokeRect"), "Fase 2 possui anel de energia pulsante");

  // Fase 3: Orange base, erratic electric arcs
  calls.length = 0;
  renderer.drawAltarPhases(ctx, 3);
  assert.ok(calls.some((c) => c.type === "fillStyle" && c.val === "#ff7a28"), "Fase 3 usa base laranja");
  assert.ok(calls.some((c) => c.type === "lineTo"), "Fase 3 desenha arcos elétricos relampejantes");

  // Fase 4: Crimson base, floating particles and intense pulsating aura
  calls.length = 0;
  renderer.drawAltarPhases(ctx, 4);
  assert.ok(calls.some((c) => c.type === "fillStyle" && c.val === "#ff3b69"), "Fase 4 usa base carmesim");
  const particleFills = calls.filter((c) => c.type === "fillRect" && c.w <= 3);
  assert.ok(particleFills.length >= 6, "Fase 4 emite partículas flutuantes ascendentes");
});

test("TASK 3 (Cinematic Effects): Efeitos de Vitória e Derrota em Canvas e CSS", () => {
  const calls = [];
  const ctx = {
    calls,
    save: () => calls.push({ type: "save" }),
    restore: () => calls.push({ type: "restore" }),
    translate: () => {},
    rotate: () => {},
    fillRect: (x, y, w, h) => calls.push({ type: "fillRect", x, y, w, h }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
    set fillStyle(val) { calls.push({ type: "fillStyle", val }); }
  };

  const renderer = Object.create(Renderer.prototype);

  // 1. Vitória: explosão de confetes cyberpunk/almas
  renderer.drawVictoryCelebration(ctx, { reducedMotion: false }, 1.0);
  assert.ok(calls.filter((c) => c.type === "fillRect").length > 50, "Explosão com dezenas de partículas comemorativas");

  // 2. Derrota: glitch/decay com vinheta escura avermelhada e faixas de estática
  calls.length = 0;
  renderer.drawDefeatDecay(ctx, { reducedMotion: false }, 1.0);
  assert.ok(calls.some((c) => c.type === "fillRect"), "Vinheta e faixas de estática na derrota");

  // 3. Classes CSS para Victory e Defeat
  assert.match(html, /id="victory-effects"[^>]*class="[^"]*victory-celebration[^"]*"/, "Shell de vitória presente no HTML");
  assert.match(html, /id="defeat-effects"[^>]*class="[^"]*defeat-decay[^"]*"/, "Shell de derrota presente no HTML");
  assert.match(css, /\.victory-celebration[^{]*\{[\s\S]*?animation:\s*victory-aurora-glow/, "Aurora comemorativa de vitória");
  assert.match(css, /\.defeat-decay[^{]*\{[\s\S]*?animation:\s*defeat-decay-pulse/, "Decaimento e glitch na derrota");
});

test("TASK 4 (Dynamic Lighting): Projéteis iluminam ambiente com gradiente radial e blend aditivo", () => {
  const compositeOps = [];
  const radialGradients = [];
  const ctx = {
    save() {}, restore() {}, beginPath() {}, stroke() {}, arc() {}, fill() {}, fillRect() {},
    createRadialGradient(x, y, r0, x1, y1, r1) {
      radialGradients.push({ x, y, r1 });
      return { addColorStop() {} };
    },
    set globalCompositeOperation(val) { compositeOps.push(val); },
    set shadowColor(_) {}, set shadowBlur(_) {}, set fillStyle(_) {}
  };

  const renderer = Object.create(Renderer.prototype);
  renderer.images = new Map();
  renderer.renderScale = 1;

  const model = {
    projectiles: [
      { id: "p1", team: "player", x: 120, y: 150, w: 8, h: 4 },
      { id: "e1", team: "enemy", x: 240, y: 160, w: 8, h: 4 }
    ]
  };

  renderer.drawProjectiles(ctx, model);
  assert.ok(compositeOps.includes("lighter"), "Usa modo de blend aditivo lighter para efeito neon");
  assert.ok(radialGradients.length >= 2, "Gera iluminação radial para projéteis de jogador e inimigo");
});

test("TASK 1 (Floating Combat Text): spawnFloatingText e drawFloatingCombatTexts animam texto flutuante com decaimento alfa e derivação", () => {
  const fills = [];
  const strokes = [];
  const alphas = [];
  const ctx = {
    save() {}, restore() {},
    beginPath() {}, stroke() {}, arc() {}, fill() {}, fillRect() {},
    moveTo() {}, lineTo() {},
    createRadialGradient() { return { addColorStop() {} }; },
    strokeText(text, x, y) { strokes.push({ text, x, y }); },
    fillText(text, x, y) { fills.push({ text, x, y }); },
    set font(_) {}, set textAlign(_) {}, set textBaseline(_) {},
    set lineWidth(_) {}, set strokeStyle(_) {},
    set fillStyle(val) { fills.push({ color: val }); },
    set globalAlpha(val) { alphas.push(val); }
  };

  const canvas = { width: 480, height: 270, getContext: () => ctx };
  const renderer = new Renderer(canvas, new Map());

  // 1. Spawning floating combat text
  renderer.spawnFloatingText("HIT", 100, 150, "hit");
  renderer.spawnFloatingText("-1", 120, 150, "damage");
  renderer.spawnFloatingText("+1 SOUL", 140, 150, "soul");
  assert.equal(renderer.floatingCombatTexts.length, 3, "Spawns 3 floating combat text particles");

  // 2. Animação e flutuação para cima (decreasing Y) com derivação horizontal
  renderer.drawFloatingCombatTexts(ctx, 0.2);
  for (const item of renderer.floatingCombatTexts) {
    assert.ok(item.y < item.startY, "Texto flutua para cima (decreasing Y)");
    assert.ok(item.life < item.duration, "Vida do texto decai");
  }

  // 3. Estilos: HIT / -1 em âmbar/vermelho; +1 SOUL em ciano
  assert.ok(fills.some((f) => f.text === "HIT"), "Desenha HIT para acerto");
  assert.ok(fills.some((f) => f.text === "-1"), "Desenha -1 para dano");
  assert.ok(fills.some((f) => f.text === "+1 SOUL"), "Desenha +1 SOUL para almas");
  assert.ok(fills.some((f) => f.color === "#37e6ee"), "Usa ciano para almas");
  assert.ok(fills.some((f) => f.color === "#ff5f51" || f.color === "#ffb14a"), "Usa âmbar/vermelho para combate");

  // 4. Decaimento completo em 0.6s
  renderer.drawFloatingCombatTexts(ctx, 0.45);
  assert.equal(renderer.floatingCombatTexts.length, 0, "Partículas expiram após 0.6s");

  // 5. Hook em drawEffects spawna textos flutuantes a partir de model.effects
  const model = {
    effects: [
      { kind: "hit", x: 80, y: 90, life: 0.4, duration: 0.4 },
      { kind: "collect", x: 100, y: 90, life: 0.5, duration: 0.5 }
    ]
  };
  renderer.drawEffects(ctx, model, 1.0);
  assert.ok(renderer.floatingCombatTexts.some((t) => t.text === "HIT"), "Hook em drawEffects spawna HIT");
  assert.ok(renderer.floatingCombatTexts.some((t) => t.text === "+1 SOUL"), "Hook em drawEffects spawna +1 SOUL");
});

test("TASK 2 (Player Death & Respawn VFX): Cyberpunk Dissolve na morte e Data Stream Rebuild no respawn", () => {
  const rects = [];
  const lines = [];
  const gradients = [];
  const arcs = [];
  let lineDashSet = false;

  const ctx = {
    save() {}, restore() {}, beginPath() {}, stroke() {}, fill() {},
    fillRect(x, y, w, h) { rects.push({ x, y, w, h }); },
    strokeRect() {},
    moveTo(x, y) { lines.push({ type: "move", x, y }); },
    lineTo(x, y) { lines.push({ type: "line", x, y }); },
    arc(x, y, r) { arcs.push({ x, y, r }); },
    ellipse(x, y, rx, ry) { arcs.push({ x, y, rx, ry }); },
    setLineDash() { lineDashSet = true; },
    createRadialGradient(x, y, r0, x1, y1, r1) {
      gradients.push({ x, y, r1 });
      return { addColorStop() {} };
    },
    set fillStyle(_) {}, set strokeStyle(_) {}, set lineWidth(_) {},
    set globalAlpha(_) {}, set lineDashOffset(_) {}
  };

  const renderer = Object.create(Renderer.prototype);
  const player = { x: 200, y: 180, w: 16, h: 28, animTime: 0.2 };

  // 1. Cyberpunk Dissolve na morte do jogador: fragmentos pixelados e faixas glitch
  renderer.drawPlayerDeathVFX(ctx, player, 0.5);
  assert.ok(rects.length >= 18, "Cyberpunk Dissolve gera dezenas de fragmentos pixelados");
  assert.ok(lines.length >= 10, "Gera faíscas ciano/violeta espalhando para fora");

  // 2. Data Stream Rebuild no respawn: feixes de luz neon verticais descendo do topo (y=0) e convergindo no spawn
  rects.length = 0;
  lines.length = 0;
  gradients.length = 0;
  arcs.length = 0;
  renderer.drawPlayerRespawnVFX(ctx, player, 1.0);

  const topBeams = lines.filter((l) => l.type === "move" && l.y === 0);
  assert.ok(topBeams.length >= 8, "Feixes de dados descem a partir do topo da tela (y=0)");
  assert.ok(lineDashSet, "Feixes utilizam padrão tracejado fluindo verticalmente");
  assert.ok(gradients.length >= 1, "Flash brilhante na convergência de respawn");
  assert.ok(arcs.length >= 1, "Anel de energia no piso no ponto de respawn");
});

test("TASK 3 (Dynamic Background Lighting): Fundo reage à vida do Altar em Canvas e classes CSS", () => {
  const gradients = [];
  const colorStops = [];
  const ctx = {
    save() {}, restore() {},
    fillRect() {},
    createRadialGradient(x0, y0, r0, x1, y1, r1) {
      gradients.push({ x0, y0, r1 });
      return {
        addColorStop(offset, color) { colorStops.push({ offset, color }); }
      };
    },
    set fillStyle(_) {}
  };

  const renderer = Object.create(Renderer.prototype);

  // 1. Altar com vida alta (Fase 1-2): overlay calmo ciano/violeta
  const highHealthModel = {
    altar: { life: 4, phase: 1 },
    objective: { altarMaxLife: 4 },
    reducedMotion: false
  };
  renderer.drawAltarReactiveLighting(ctx, highHealthModel, 1.0);
  assert.ok(gradients.length >= 1, "Gera gradiente radial de iluminação ambiental");
  assert.ok(colorStops.some((s) => s.color.includes("55, 230, 238") || s.color.includes("174, 98, 255")), "Altar com vida alta emite brilho ciano/violeta calmo");

  // 2. Altar com vida baixa (Fase 3-4): overlay urgente carmesim/laranja
  gradients.length = 0;
  colorStops.length = 0;
  const lowHealthModel = {
    altar: { life: 1, phase: 4 },
    objective: { altarMaxLife: 4 },
    reducedMotion: false
  };
  renderer.drawAltarReactiveLighting(ctx, lowHealthModel, 1.0);
  assert.ok(gradients.length >= 1, "Gera gradiente radial de iluminação urgente");
  assert.ok(colorStops.some((s) => s.color.includes("255, 45, 30") || s.color.includes("255, 122, 40")), "Altar com vida baixa emite brilho carmesim/laranja pulsante");

  // 3. Classes CSS para Altar Lighting
  assert.match(css, /\.altar-lighting-calm[^{]*\{[\s\S]*?radial-gradient/, "Classe CSS para iluminação calma de fundo");
  assert.match(css, /\.altar-lighting-urgent[^{]*\{[\s\S]*?radial-gradient[\s\S]*?animation:\s*altar-urgent-pulse/, "Classe CSS para iluminação urgente com pulsação");
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.altar-lighting-urgent/, "Regra de reduced-motion desativa animação de urgência");
});

test("TASK 4 (Elite Enemy Visual Shell): drawEliteEnemyAura desenha aura hexagonal giratória e coroa pulsante", () => {
  const calls = [];
  const lines = [];
  let rotated = false;
  let translated = false;

  const ctx = {
    save() {}, restore() {},
    translate() { translated = true; },
    rotate() { rotated = true; },
    beginPath() {}, closePath() {},
    stroke() { calls.push("stroke"); },
    fill() { calls.push("fill"); },
    moveTo(x, y) { lines.push({ type: "move", x, y }); },
    lineTo(x, y) { lines.push({ type: "line", x, y }); },
    fillRect() { calls.push("fillRect"); },
    set strokeStyle(val) { calls.push({ strokeStyle: val }); },
    set fillStyle(val) { calls.push({ fillStyle: val }); },
    set lineWidth(_) {}, set shadowColor(_) {}, set shadowBlur(_) {}
  };

  const renderer = Object.create(Renderer.prototype);

  // Inimigo comum sem flag isElite: nada é desenhado
  renderer.drawEliteEnemyAura(ctx, { isElite: false, x: 100, y: 150, w: 16, h: 32 }, 1.0);
  assert.equal(calls.length, 0, "Inimigo não-elite não gera aura");

  // Inimigo Elite (isElite: true): aura hexagonal e coroa
  renderer.drawEliteEnemyAura(ctx, { isElite: true, x: 100, y: 150, w: 16, h: 32 }, 1.5);
  assert.ok(translated && rotated, "Aura hexagonal aplica rotação em torno do centro do inimigo");
  assert.ok(calls.includes("stroke"), "Desenha traçado da aura hexagonal");
  assert.ok(calls.includes("fill"), "Desenha preenchimento da coroa de 3 pontas");
  assert.ok(calls.includes("fillRect"), "Desenha jóias no topo da coroa e nós de energia");
});

test("TASK 1 (Environmental Hazards): Sweeping Laser Grid, Toxic Sludge e Hydraulic Pistons", () => {
  const calls = [];
  const strokes = [];
  const ctx = {
    save() {}, restore() {},
    beginPath() {}, closePath() {}, clip() {},
    moveTo(x, y) { calls.push({ type: "moveTo", x, y }); },
    lineTo(x, y) { calls.push({ type: "lineTo", x, y }); },
    stroke() { strokes.push("stroke"); },
    fill() { calls.push({ type: "fill" }); },
    arc(x, y, r) { calls.push({ type: "arc", x, y, r }); },
    ellipse(x, y, rx, ry) { calls.push({ type: "ellipse", x, y, rx, ry }); },
    fillRect(x, y, w, h) { calls.push({ type: "fillRect", x, y, w, h }); },
    createRadialGradient() { return { addColorStop() {} }; },
    createLinearGradient() { return { addColorStop() {} }; },
    set strokeStyle(val) { calls.push({ type: "strokeStyle", val }); },
    set fillStyle(val) { calls.push({ type: "fillStyle", val }); },
    set lineWidth(_) {}
  };

  const renderer = Object.create(Renderer.prototype);

  // 1. Sweeping Laser Grid (Distrito Neon)
  renderer.drawSweepingLaserGrid(ctx, { reducedMotion: false }, 1.2);
  const laserLines = calls.filter((c) => c.type === "moveTo");
  assert.ok(laserLines.length >= 4, "Laser grid desenha 4 feixes horizontais");
  assert.ok(strokes.length >= 4, "Feixes de laser são traçados no Canvas");

  // Respeita reducedMotion
  calls.length = 0;
  renderer.drawSweepingLaserGrid(ctx, { reducedMotion: true }, 1.2);
  assert.ok(calls.some((c) => c.type === "fillRect"), "Em reducedMotion feixes permanecem estáticos");

  // 2. Toxic Sludge (Scrap Factory)
  calls.length = 0;
  renderer.drawToxicSludge(ctx, { reducedMotion: false }, 2.0);
  assert.ok(calls.some((c) => c.type === "ellipse" || c.type === "fillRect"), "Desenha poças de lodo tóxico");
  assert.ok(calls.some((c) => c.type === "arc" || c.type === "fillRect"), "Desenha bolhas subindo do lodo");

  // 3. Hydraulic Pistons (Scrap Factory)
  calls.length = 0;
  renderer.drawHydraulicPistons(ctx, { reducedMotion: false }, 2.5);
  assert.ok(calls.some((c) => c.type === "fillRect"), "Desenha cilindros e blocos hidráulicos dos pistões");
});

test("Factory Overlord permanece cenário e barra só aceita HP autoritativo", () => {
  const calls = [];
  const textCalls = [];
  const ctx = {
    save() {}, restore() {},
    beginPath() {}, closePath() {}, stroke() {}, fill() {},
    moveTo() {}, lineTo() {},
    arc() { calls.push("arc"); },
    fillRect(x, y, w, h) { calls.push({ type: "fillRect", x, y, w, h }); },
    strokeRect(x, y, w, h) { calls.push({ type: "strokeRect", x, y, w, h }); },
    fillText(text, x, y) { textCalls.push({ text, x, y }); },
    createRadialGradient() { return { addColorStop() {} }; },
    createLinearGradient() { return { addColorStop() {} }; },
    set strokeStyle(_) {}, set fillStyle(_) {}, set lineWidth(_) {},
    set font(_) {}, set textBaseline(_) {}
  };

  const renderer = Object.create(Renderer.prototype);

  // 1. Factory Overlord não aparece no Distrito Neon inicial
  renderer.drawFactoryOverlord(ctx, { levelId: "distrito-neon", altar: { phase: 1, deposited: 0 } }, 1.0);
  assert.equal(calls.length, 0, "Factory Overlord não aparece fora do fim da Fase 2");

  // 2. Factory Overlord aparece no fim da Fase 2 (Scrap Factory com altar fase 2+ e almas depositadas ou bossOverlord: true)
  renderer.drawFactoryOverlord(ctx, { levelId: "scrap-factory", altar: { phase: 3, deposited: 8 } }, 1.5);
  assert.ok(calls.includes("arc"), "Overlord gera fumaça volumétrica de exaustão das chaminés");
  assert.ok(calls.some((c) => c.type === "fillRect"), "Desenha chassi blindado e olho vermelho ciclópico");

  assert.equal(renderer.isBossHudVisible({ levelId: "scrap-factory", altar: { phase: 3, deposited: 8 } }), false,
    "progresso de almas não habilita uma barra de HP decorativa");
  assert.equal(renderer.isBossHudVisible({ bossActive: true, bossHealth: 85, bossMaxHealth: 100 }), true);

  // 3. Renderer da barra permanece disponível somente para um modelo futuro com HP real.
  calls.length = 0;
  renderer.drawBossHealthBar(ctx, { bossHealth: 85, bossMaxHealth: 100 }, 2.0);
  assert.ok(textCalls.some((t) => t.text.includes("FACTORY OVERLORD")), "Health Bar exibe nome do Boss");
  assert.ok(calls.some((c) => c.type === "fillRect"), "Desenha preenchimento da barra de vida do Boss");
  assert.deepEqual(calls.find((c) => c.type === "fillRect"), {
    type: "fillRect", x: 152, y: 51, w: 320, h: 22
  }, "Boss ocupa a faixa dedicada abaixo dos três painéis autoritativos superiores");
  const objectivePanel = { x: 136, y: 7, w: 220, h: 38 };
  const bossPanel = { x: 152, y: 51, w: 320, h: 22 };
  const overlapsObjective = bossPanel.x < objectivePanel.x + objectivePanel.w
    && bossPanel.x + bossPanel.w > objectivePanel.x
    && bossPanel.y < objectivePanel.y + objectivePanel.h
    && bossPanel.y + bossPanel.h > objectivePanel.y;
  assert.equal(overlapsObjective, false, "Boss não cobre carga, almas depositadas ou progresso do altar");

  // 4. Shell DOM e CSS do Boss Health Bar
  assert.match(html, /id="boss-health-bar"[^>]*class="[^"]*boss-health-bar/, "index.html contém elemento do Boss Health Bar");
  assert.match(css, /\.boss-health-bar\s*\{[\s\S]*?position:\s*absolute/, "CSS define layout do Boss Health Bar");
  assert.match(css, /\.boss-health-bar\s*\{[\s\S]*?top:\s*18\.9%;[\s\S]*?right:\s*1\.7%;/, "Shell DOM reserva a mesma segunda faixa à direita");
  assert.match(css, /\.boss-bar-fill\s*\{[\s\S]*?linear-gradient/, "CSS define preenchimento gradiente carmesim/âmbar");
});

test("TASK 3 (Bonus Phase Tension VFX): Speed Rush visual state e aceleração da pulsação", () => {
  const calls = [];
  const strokes = [];
  const gradients = [];
  const ctx = {
    save() {}, restore() {},
    beginPath() {},
    moveTo(x, y) { calls.push({ type: "moveTo", x, y }); },
    lineTo(x, y) { calls.push({ type: "lineTo", x, y }); },
    stroke() { strokes.push("stroke"); },
    fillRect(x, y, w, h) { calls.push({ type: "fillRect", x, y, w, h }); },
    createLinearGradient() { return { addColorStop() {} }; },
    createRadialGradient(x0, y0, r0, x1, y1, r1) {
      gradients.push({ x0, y0, r1 });
      return { addColorStop() {} };
    },
    set strokeStyle(_) {}, set fillStyle(_) {}, set lineWidth(_) {}
  };

  const renderer = Object.create(Renderer.prototype);

  // 1. Inativo quando timer >= 5
  renderer.drawBonusSpeedRush(ctx, { bonusTimer: 8, level: { theme: "energy-chamber" } }, 1.0);
  assert.equal(calls.length, 0, "Speed rush inativo se tempo restante >= 5s");

  // 2. Ativo quando bonusTimer < 5s
  renderer.drawBonusSpeedRush(ctx, { bonusTimer: 3.5, level: { theme: "energy-chamber" } }, 1.0);
  assert.ok(calls.some((c) => c.type === "moveTo"), "Speed rush desenha feixes de velocidade horizontais");
  assert.ok(calls.some((c) => c.type === "fillRect"), "Speed rush desenha aberração cromática e vinheta carmesim");

  // 3. drawEnergyChamberAtmosphere acelera pulso quando Speed Rush ativo
  gradients.length = 0;
  renderer.drawEnergyChamberAtmosphere(ctx, { bonusTimer: 2, level: { theme: "energy-chamber" } }, 1.0);
  assert.ok(gradients.length >= 1, "Atmosfera da câmara desenha reator");

  // 4. CSS Shells
  assert.match(html, /id="speed-rush-overlay"/, "index.html contém elemento do speed rush overlay");
  assert.match(css, /\.speed-rush-tension\s*\{[\s\S]*?drop-shadow/, "CSS define aberração cromática do Speed Rush");
  assert.match(css, /\.speed-rush-overlay\s*\{[\s\S]*?radial-gradient/, "CSS define vinheta radial do Speed Rush");
});


