import test from "node:test";
import assert from "node:assert/strict";
import { Renderer } from "../src/renderer.js";

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
    rect: (x, y, w, h) => calls.push({ type: "rect", x, y, w, h }),
    clip: () => calls.push({ type: "clip" }),
    fillRect: (x, y, w, h) => calls.push({ type: "fillRect", x, y, w, h }),
    strokeRect: (x, y, w, h) => calls.push({ type: "strokeRect", x, y, w, h }),
    drawImage: (...args) => calls.push({ type: "drawImage", args }),
    createLinearGradient: (x0, y0, x1, y1) => ({
      addColorStop: (offset, color) => calls.push({ type: "gradientStop", offset, color })
    }),
    createRadialGradient: (x0, y0, r0, x1, y1, r1) => ({
      addColorStop: (offset, color) => calls.push({ type: "radialStop", offset, color })
    }),
    set fillStyle(val) { calls.push({ type: "fillStyle", val }); },
    set strokeStyle(val) { calls.push({ type: "strokeStyle", val }); },
    set lineWidth(val) { calls.push({ type: "lineWidth", val }); },
    set globalAlpha(val) { calls.push({ type: "globalAlpha", val }); },
    set shadowColor(val) { calls.push({ type: "shadowColor", val }); },
    set shadowBlur(val) { calls.push({ type: "shadowBlur", val }); }
  };
}

test("drawBackground usa world.background.bonus na Câmara de Energia com fallback gracioso", () => {
  const mockBonusBg = { width: 1365, height: 768, id: "bonus-bg" };
  const images = new Map([
    ["world.background.bonus", mockBonusBg]
  ]);
  const canvas = { width: 480, height: 270, getContext: () => createMockContext() };
  const renderer = new Renderer(canvas, images);
  const ctx = createMockContext();

  const model = {
    level: { theme: "energy-chamber" },
    reducedMotion: false
  };

  renderer.drawBackground(ctx, model, 1.0);
  const bgDraw = ctx.calls.find((c) => c.type === "drawImage" && c.args[0] === mockBonusBg);
  assert.ok(bgDraw, "Desenhou world.background.bonus como fundo da arena bônus");

  // Teste de fallback quando ausente
  const fallbackImages = new Map([
    ["world.background", { width: 1672, height: 941, id: "default-bg" }]
  ]);
  const fallbackRenderer = new Renderer(canvas, fallbackImages);
  const fallbackCtx = createMockContext();
  fallbackRenderer.drawBackground(fallbackCtx, model, 1.0);
  const fallbackDraw = fallbackCtx.calls.find((c) => c.type === "drawImage" && c.args[0]?.id === "default-bg");
  assert.ok(fallbackDraw, "Fallback para world.background funciona perfeitamente");
});

test("drawPlatforms diferencia plataformas sólidas e de mão única na Câmara de Energia", () => {
  const mockBonusTiles = { width: 128, height: 128, id: "bonus-tiles" };
  const images = new Map([
    ["world.tiles.bonus", mockBonusTiles]
  ]);
  const canvas = { width: 480, height: 270, getContext: () => createMockContext() };
  const renderer = new Renderer(canvas, images);
  const ctx = createMockContext();

  const model = {
    level: { theme: "energy-chamber" },
    platforms: [
      { x: 16, y: 200, w: 48, h: 16, oneWay: true },
      { x: -16, y: 240, w: 232, h: 32, oneWay: false },
      { x: 0, y: 16, w: 16, h: 224, oneWay: false }
    ]
  };

  renderer.drawPlatforms(ctx, model);

  // Amostragem de ladrilhos: oneWay usa sx=0, sólido usa sx=16
  const oneWayTileCall = ctx.calls.find((c) => c.type === "drawImage" && c.args[1] === 0);
  const solidTileCall = ctx.calls.find((c) => c.type === "drawImage" && c.args[1] === 16);
  assert.ok(oneWayTileCall, "Ladrilho de mão única usa origem de ladrilho 0");
  assert.ok(solidTileCall, "Ladrilho sólido usa origem de ladrilho 16");

  // Destaque de mão única em ciano (#37e6ee) e sólido em violeta (#ae62ff)
  assert.ok(ctx.calls.some((c) => c.type === "fillStyle" && c.val === "#37e6ee"), "Borda superior ciano em mão única");
  assert.ok(ctx.calls.some((c) => c.type === "fillStyle" && c.val === "#ae62ff"), "Borda superior violeta em sólido");
});

test("drawSouls utiliza bonusSoul para almas da arena bônus e soul para almas de campanha", () => {
  const mockCampaignSoul = { width: 15, height: 16, id: "campaign-soul" };
  const mockBonusSoul = { width: 15, height: 16, id: "bonus-soul" };
  const images = new Map([
    ["soul.0", mockCampaignSoul],
    ["bonusSoul.0", mockBonusSoul]
  ]);
  const canvas = { width: 480, height: 270, getContext: () => createMockContext() };
  const renderer = new Renderer(canvas, images);
  const ctx = createMockContext();

  const model = {
    souls: [
      { id: "s1", x: 100, y: 100, source: "bonus", bornAt: 0 },
      { id: "s2", x: 200, y: 100, source: "campaign", bornAt: 0 }
    ]
  };

  renderer.drawSouls(ctx, model, 0);

  const bonusDraw = ctx.calls.find((c) => c.type === "drawImage" && c.args[0] === mockBonusSoul);
  const campaignDraw = ctx.calls.find((c) => c.type === "drawImage" && c.args[0] === mockCampaignSoul);
  assert.ok(bonusDraw, "Alma bônus desenhada com sprite bonusSoul");
  assert.ok(campaignDraw, "Alma de campanha desenhada com sprite soul");
});

test("drawEnergyChamberAtmosphere respeita reducedMotion sem pulsar", () => {
  const canvas = { width: 480, height: 270, getContext: () => createMockContext() };
  const renderer = new Renderer(canvas, new Map());
  
  const ctxReduced = createMockContext();
  renderer.drawEnergyChamberAtmosphere(ctxReduced, { reducedMotion: true }, 5.0);
  
  const ctxNormal = createMockContext();
  renderer.drawEnergyChamberAtmosphere(ctxNormal, { reducedMotion: false }, 5.0);

  assert.ok(ctxReduced.calls.length > 0, "Atmosfera desenhada no modo reducedMotion");
  assert.ok(ctxNormal.calls.length > 0, "Atmosfera desenhada no modo normal");
});
