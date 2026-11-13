import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { ASSET_MANIFEST } from "../src/assets.js";
import { DISTRICT_PARALLAX, Renderer } from "../src/renderer.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LAYER_KEYS = [
  "world.background.district.far",
  "world.background.district.mid",
  "world.background.district.near"
];
const EXPECTED_HASHES = [
  "18492027405ed0f64d70ccc2ffc05b166c36907c8281324f11cb5dbeb7e77371",
  "dc65d227bce7a77ed214c6306c3cf8680d8b704911abbcd55ee4dbcf9edb17f7",
  "e4afd2896815e1d26b215e768b5f7824bf96d08381688a0fe77cc7d1b5bc03bc"
];

function image(id) {
  return { id, width: 1672, height: 941 };
}

function layerMap({ missing = null } = {}) {
  const entries = [
    ["world.background", image("fallback")],
    [LAYER_KEYS[0], image("far")],
    [LAYER_KEYS[1], image("mid")],
    [LAYER_KEYS[2], image("near")]
  ];
  return new Map(entries.filter(([key]) => key !== missing));
}

function context({ throwOn = null } = {}) {
  const calls = [];
  return {
    calls,
    save() { calls.push(["save"]); },
    restore() { calls.push(["restore"]); },
    fillRect() {},
    drawImage(...args) {
      if (args[0]?.id === throwOn) throw new Error("decode/draw failure");
      calls.push(["drawImage", ...args]);
    },
    createLinearGradient() { return { addColorStop() {} }; },
    set fillStyle(_) {}
  };
}

function rendererWith(images = layerMap()) {
  const ctx = context();
  const canvas = { width: 480, height: 270, getContext: () => ctx };
  const renderer = new Renderer(canvas, images, { renderScale: 1 });
  renderer.drawNeonAtmosphericLayers = () => {};
  renderer.drawCyberpunkRain = () => {};
  renderer.drawSweepingLaserGrid = () => {};
  renderer.drawAltarReactiveLighting = () => {};
  return { renderer, ctx };
}

function districtModel(overrides = {}) {
  return {
    state: "playing",
    levelId: "distrito-neon",
    level: { theme: "neon-district" },
    runId: 1,
    elapsed: 0,
    reducedMotion: false,
    player: { x: 458, y: 208, w: 22, h: 32 },
    ...overrides
  };
}

test("camadas aprovadas do Distrito estão registradas como opcionais, íntegras e 1672x941", async () => {
  const manifest = new Map(ASSET_MANIFEST.map((entry) => [entry.key, entry]));
  const registeredDistrictLayers = ASSET_MANIFEST
    .map((entry) => entry.key)
    .filter((key) => key.startsWith("world.background.district."));
  assert.deepEqual(registeredDistrictLayers, LAYER_KEYS,
    "o carregador registra somente o conjunto aprovado de três camadas");
  for (let index = 0; index < LAYER_KEYS.length; index += 1) {
    const entry = manifest.get(LAYER_KEYS[index]);
    assert.ok(entry, `manifesto deve registrar ${LAYER_KEYS[index]}`);
    assert.equal(entry.required, false);
    const bytes = await readFile(path.join(root, entry.url));
    assert.deepEqual([bytes.readUInt32BE(16), bytes.readUInt32BE(20)], [1672, 941]);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), EXPECTED_HASHES[index]);
  }
});

test("deslocamentos são limitados e a suavização exponencial independe do passo de tempo", () => {
  const fine = rendererWith().renderer;
  const coarse = rendererWith().renderer;
  const fineModel = districtModel();
  const coarseModel = districtModel();
  fine.updateDistrictParallax(fineModel);
  coarse.updateDistrictParallax(coarseModel);

  for (let step = 1; step <= 60; step += 1) {
    fineModel.elapsed = step / 60;
    fine.updateDistrictParallax(fineModel);
  }
  for (let step = 1; step <= 10; step += 1) {
    coarseModel.elapsed = step / 10;
    coarse.updateDistrictParallax(coarseModel);
  }

  assert.ok(Math.abs(fine.districtParallax.far) <= DISTRICT_PARALLAX.farAmplitude);
  assert.ok(Math.abs(fine.districtParallax.mid) <= DISTRICT_PARALLAX.midAmplitude);
  assert.ok(Math.abs(fine.districtParallax.far - coarse.districtParallax.far) < 1e-10);
  assert.ok(Math.abs(fine.districtParallax.mid - coarse.districtParallax.mid) < 1e-10);
});

test("pausa congela o efeito; retry e troca de ambiente neutralizam o estado", () => {
  const { renderer } = rendererWith();
  const model = districtModel();
  renderer.updateDistrictParallax(model);
  model.elapsed = 0.5;
  renderer.updateDistrictParallax(model);
  const beforePause = { far: renderer.districtParallax.far, mid: renderer.districtParallax.mid };

  model.state = "paused";
  renderer.updateDistrictParallax(model);
  assert.deepEqual({ far: renderer.districtParallax.far, mid: renderer.districtParallax.mid }, beforePause);

  model.state = "playing";
  model.runId = 2;
  model.elapsed = 0;
  renderer.updateDistrictParallax(model);
  assert.deepEqual([renderer.districtParallax.far, renderer.districtParallax.mid], [0, 0]);

  renderer.districtParallax.far = 2;
  renderer.districtParallax.mid = 4;
  const factoryContext = context();
  renderer.images.set("world.background.factory", image("factory"));
  renderer.drawFactoryAtmosphere = () => {};
  renderer.drawFloatingEmbers = () => {};
  renderer.drawHydraulicPistons = () => {};
  renderer.drawFactoryOverlord = () => {};
  renderer.drawBackground(factoryContext, { level: { theme: "scrap-factory" } }, 10);
  assert.deepEqual([renderer.districtParallax.far, renderer.districtParallax.mid], [0, 0]);
  assert.equal(factoryContext.calls.filter((call) => call[0] === "drawImage")[0][1].id, "factory");
});

test("fallback é atômico quando uma camada falta ou falha durante o desenho", () => {
  const missing = rendererWith(layerMap({ missing: LAYER_KEYS[1] }));
  missing.renderer.drawBackground(missing.ctx, districtModel(), 0);
  const missingDraws = missing.ctx.calls.filter((call) => call[0] === "drawImage");
  assert.deepEqual(missingDraws.map((call) => call[1].id), ["fallback"]);

  const { renderer } = rendererWith();
  const failingContext = context({ throwOn: "mid" });
  renderer.drawBackground(failingContext, districtModel(), 0);
  assert.equal(renderer.districtParallax.disabled, true);
  assert.equal(failingContext.calls.filter((call) => call[0] === "drawImage").at(-1)[1].id, "fallback");
});

test("movimento reduzido mantém recomposição estática e o coop usa centro médio estável", () => {
  const { renderer, ctx } = rendererWith();
  const reduced = districtModel({ reducedMotion: true });
  renderer.districtParallax.far = 2;
  renderer.districtParallax.mid = 5;
  renderer.drawBackground(ctx, reduced, 0);
  const draws = ctx.calls.filter((call) => call[0] === "drawImage");
  assert.deepEqual(draws.map((call) => call[1].id), ["far", "mid", "near"]);
  assert.deepEqual([renderer.districtParallax.far, renderer.districtParallax.mid], [0, 0]);
  assert.equal(draws[0][4], 1672, "cover central preserva toda a largura da fonte");
  assert.equal(draws[0][5], 1672 / (480 / 270), "cover central recorta a altura para 940,5");
  assert.equal(draws[0][3], (941 - 1672 / (480 / 270)) / 2,
    "cover central distribui o recorte vertical igualmente");

  const players = [
    { x: 40, w: 20, life: 4, inactive: false },
    { x: 360, w: 20, life: 0, inactive: true }
  ];
  const referenceBefore = renderer.districtParallaxReferenceX({ players });
  players[1].life = 4;
  players[1].inactive = false;
  assert.equal(renderer.districtParallaxReferenceX({ players }), referenceBefore,
    "estado de vida não troca a referência decorativa entre jogadores");
});

test("as três camadas usam overscan fixo, near imóvel e não recebem screenShake", () => {
  const { renderer, ctx } = rendererWith();
  const model = districtModel();
  renderer.drawBackground(ctx, model, 0);
  model.elapsed = 1;
  ctx.calls.length = 0;
  renderer.drawBackground(ctx, model, 1);

  const draws = ctx.calls.filter((call) => call[0] === "drawImage");
  assert.deepEqual(draws.map((call) => call[1].id), ["far", "mid", "near"]);
  assert.equal(draws[0][4], draws[1][4]);
  assert.equal(draws[1][4], draws[2][4]);
  assert.equal(draws[2][2], DISTRICT_PARALLAX.overscanSourcePixels,
    "near usa o recorte central fixo");
  assert.ok(draws[0][2] > draws[2][2]);
  assert.ok(draws[1][2] > draws[0][2]);
  assert.equal(ctx.calls.some((call) => call[0] === "translate"), false,
    "o passe decorativo não duplica a translação de screenShake do mundo");
});

test("recortes nos dois extremos permanecem dentro das fontes sem repetição", () => {
  const { renderer, ctx } = rendererWith();
  const model = districtModel({ state: "paused", elapsed: 1 });
  renderer.districtParallax.sceneKey = "distrito-neon:1";
  renderer.districtParallax.lastElapsed = 1;

  for (const direction of [-1, 1]) {
    renderer.districtParallax.far = direction * DISTRICT_PARALLAX.farAmplitude;
    renderer.districtParallax.mid = direction * DISTRICT_PARALLAX.midAmplitude;
    ctx.calls.length = 0;
    renderer.drawDistrictParallaxBackground(ctx, model);
    const draws = ctx.calls.filter((call) => call[0] === "drawImage");
    assert.deepEqual(draws.map((call) => call[1].id), ["far", "mid", "near"]);
    for (const draw of draws) {
      const sx = draw[2];
      const sy = draw[3];
      const sw = draw[4];
      const sh = draw[5];
      assert.ok(sx >= 0 && sx + sw <= draw[1].width,
        `${draw[1].id} mantém cobertura horizontal no extremo ${direction}`);
      assert.ok(sy >= 0 && sy + sh <= draw[1].height,
        `${draw[1].id} mantém cobertura vertical no extremo ${direction}`);
    }
  }
});
