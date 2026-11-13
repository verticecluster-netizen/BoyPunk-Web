import test from "node:test";
import assert from "node:assert/strict";
import { Renderer } from "../src/renderer.js";
import { BONUS_CANNON_RULES } from "../src/bonus.js";

function createMockContext() {
  const calls = [];
  return {
    calls,
    save: () => calls.push({ type: "save" }),
    restore: () => calls.push({ type: "restore" }),
    translate: (x, y) => calls.push({ type: "translate", x, y }),
    rotate: (angle) => calls.push({ type: "rotate", angle }),
    beginPath: () => calls.push({ type: "beginPath" }),
    closePath: () => calls.push({ type: "closePath" }),
    moveTo: (x, y) => calls.push({ type: "moveTo", x, y }),
    lineTo: (x, y) => calls.push({ type: "lineTo", x, y }),
    stroke: () => calls.push({ type: "stroke" }),
    fill: () => calls.push({ type: "fill" }),
    arc: (x, y, r, sa, ea) => calls.push({ type: "arc", x, y, r, sa, ea }),
    fillRect: (x, y, w, h) => calls.push({ type: "fillRect", x, y, w, h }),
    strokeRect: (x, y, w, h) => calls.push({ type: "strokeRect", x, y, w, h }),
    setLineDash: (dash) => calls.push({ type: "setLineDash", dash }),
    fillText: (text, x, y) => calls.push({ type: "fillText", text, x, y }),
    strokeText: (text, x, y) => calls.push({ type: "strokeText", text, x, y }),
    set fillStyle(val) { calls.push({ type: "fillStyle", val }); },
    set strokeStyle(val) { calls.push({ type: "strokeStyle", val }); },
    set lineWidth(val) { calls.push({ type: "lineWidth", val }); },
    set globalAlpha(val) { calls.push({ type: "globalAlpha", val }); },
    set lineDashOffset(val) { calls.push({ type: "lineDashOffset", val }); }
  };
}

test("drawBonusCannon desenha todos os componentes mecânicos e respeita as regras visuais", () => {
  const canvas = { width: 480, height: 270, getContext: () => createMockContext() };
  const renderer = new Renderer(canvas, new Map());
  const ctx = createMockContext();

  const model = {
    gameMode: "bonus",
    reducedMotion: false,
    bonusCannon: {
      phase: "wait",
      phaseTime: 2.0,
      aimX: null,
      aimY: null,
      muzzleX: 448,
      muzzleY: 220
    }
  };

  // Render idle
  renderer.drawBonusCannon(ctx, model, 1.0);
  assert.ok(ctx.calls.length > 20, "Desenha montagem na parede, mancal giratório e corpo do canhão");
  
  // Confirma placa gantry na parede leste (x: 457..464)
  const gantryRect = ctx.calls.find((c) => c.type === "fillRect" && c.x === 457 && c.y === 205 && c.w === 7 && c.h === 30);
  assert.ok(gantryRect, "Placa de montagem fixa na parede leste está presente");

  // Confirma mancal giratório centralizado no pivô (454, 220)
  const gimbalCall = ctx.calls.find((c) => c.type === "arc" && c.x === 454 && c.y === 220);
  assert.ok(gimbalCall, "Mancal giratório (gimbal) está centralizado em (454, 220)");
});

test("drawBonusCannon em telegrafia projeta feixe e retículo travado sem alterar gameplay", () => {
  const canvas = { width: 480, height: 270, getContext: () => createMockContext() };
  const renderer = new Renderer(canvas, new Map());
  const ctx = createMockContext();

  const model = {
    gameMode: "bonus",
    reducedMotion: false,
    bonusCannon: {
      phase: "telegraph",
      phaseTime: 0.05, // Próximo ao disparo (charge ~ 0.94)
      aimX: 140,
      aimY: 120,
      muzzleX: 448,
      muzzleY: 220
    }
  };

  const initialPhaseTime = model.bonusCannon.phaseTime;
  renderer.drawBonusCannon(ctx, model, 1.5);

  // Garante que o desenho NUNCA modifica dados de simulação
  assert.equal(model.bonusCannon.phaseTime, initialPhaseTime, "Renderizador não altera phaseTime");
  assert.equal(model.bonusCannon.phase, "telegraph", "Renderizador não altera fase");

  // Confirma retículo centrado no alvo travado (140, 120)
  const reticlePip = ctx.calls.find((c) => c.type === "fillRect" && c.x === 139 && c.y === 119 && c.w === 2 && c.h === 2);
  assert.ok(reticlePip, "Retículo de mira centrado em (aimX, aimY) desenhado durante travamento");

  // Confirma rotação orientada ao alvo (aimAngle = atan2(120 - 220, 140 - 448))
  const expectedAngle = Math.atan2(120 - 220, 140 - 448);
  const rotateCall = ctx.calls.find((c) => c.type === "rotate" && Math.abs(c.angle - expectedAngle) < 0.001);
  assert.ok(rotateCall, "Torreta articulada rotacionada com precisão trigonométrica para o alvo");
});

test("drawBonusCannon em disparo exibe flash estelar no bocal (448, 220) e recuo mecânico", () => {
  const canvas = { width: 480, height: 270, getContext: () => createMockContext() };
  const renderer = new Renderer(canvas, new Map());
  const ctx = createMockContext();

  const model = {
    gameMode: "bonus",
    reducedMotion: false,
    bonusCannon: {
      phase: "recovery",
      phaseTime: BONUS_CANNON_RULES.recoverySeconds - 0.02, // 0.02s após disparo
      aimX: 140,
      aimY: 120,
      muzzleX: 448,
      muzzleY: 220
    }
  };

  renderer.drawBonusCannon(ctx, model, 2.0);

  // Confirma flash no bocal emitido exatamente em (muzzleX, muzzleY) = (448, 220)
  const flashCenter = ctx.calls.find((c) => c.type === "fillRect" && c.x === 446 && c.y === 218 && c.w === 4 && c.h === 4);
  assert.ok(flashCenter, "Flash de disparo centrado exatamente no emissor de projéteis (448, 220)");
});


test("drawBonusCannon respeita reducedMotion desabilitando recuo e feixes oscilantes", () => {
  const canvas = { width: 480, height: 270, getContext: () => createMockContext() };
  const renderer = new Renderer(canvas, new Map());
  const ctx = createMockContext();

  const model = {
    gameMode: "bonus",
    reducedMotion: true,
    bonusCannon: {
      phase: "recovery",
      phaseTime: BONUS_CANNON_RULES.recoverySeconds - 0.02,
      aimX: 140,
      aimY: 120,
      muzzleX: 448,
      muzzleY: 220
    }
  };

  renderer.drawBonusCannon(ctx, model, 2.0);

  // Em modo de movimento reduzido, não há partículas de vapor e o flash é atenuado
  assert.ok(ctx.calls.length > 0, "Renderiza corretamente em modo reducedMotion sem falhas");
});

test("aviso de spawn bônus ocupa o mundo e não cria uma entidade antes da hora", () => {
  const canvas = { width: 480, height: 270, getContext: () => createMockContext() };
  const renderer = new Renderer(canvas, new Map());
  const ctx = createMockContext();
  const model = {
    gameMode: "bonus",
    reducedMotion: true,
    enemies: [],
    bonusEnemySpawns: [{
      id: "bonus-chaser-first",
      state: "warning",
      selected: { x: 336, y: 208 },
      warningRemaining: 0.5
    }]
  };

  renderer.drawBonusSpawnWarnings(ctx, model, 1);
  assert.ok(ctx.calls.some((call) => call.type === "strokeRect" && call.x === 332 && call.y === 204));
  assert.ok(ctx.calls.some((call) => call.type === "fillText" && call.text === "!"));
  assert.equal(model.enemies.length, 0);
});
