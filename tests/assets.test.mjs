import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { CHASER_ANIMATIONS, PATROL_SHOOTER_ANIMATIONS, PLAYER_ANIMATIONS } from "../src/animation.js";
import { ASSET_MANIFEST, loadAssetManifest, loadImageAsset } from "../src/assets.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = new Map(ASSET_MANIFEST.map((entry) => [entry.key, entry]));
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

async function pngInfo(assetKey) {
  const entry = manifest.get(assetKey);
  assert.ok(entry, `manifesto não registra ${assetKey}`);
  assert.equal(entry.type, "image", `${assetKey} deve ser uma imagem`);
  const bytes = await readFile(path.join(root, decodeURIComponent(entry.url)));
  assert.deepEqual(bytes.subarray(0, pngSignature.length), pngSignature, `${entry.url} não é PNG`);
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    hash: createHash("sha256").update(bytes).digest("hex")
  };
}

test("manifesto cobre todos os frames configurados do player e perseguidor", async () => {
  for (const [state, definition] of Object.entries(PLAYER_ANIMATIONS)) {
    for (let frame = 0; frame < definition.frames; frame += 1) {
      const info = await pngInfo(`player.${state}.${frame}`);
      assert.deepEqual([info.width, info.height], [64, 96]);
    }
  }

  for (const [state, definition] of Object.entries(CHASER_ANIMATIONS)) {
    for (let frame = 0; frame < definition.frames; frame += 1) {
      const key = definition.frames === 1 ? `chaser.${state}` : `chaser.${state}.${frame}`;
      const info = await pngInfo(key);
      assert.deepEqual([info.width, info.height], [16, 32]);
    }
  }

  for (const [state, definition] of Object.entries(PATROL_SHOOTER_ANIMATIONS)) {
    for (let frame = 0; frame < definition.frames; frame += 1) {
      const key = `patrolShooter.${state}.${frame}`;
      const info = await pngInfo(key);
      assert.deepEqual([info.width, info.height], [32, 32]);
    }
  }

  for (let frame = 0; frame < 8; frame += 1) {
    const info = await pngInfo(`turret.patrol.${frame}`);
    assert.deepEqual([info.width, info.height], [32, 32]);
  }
});

test("ciclos de locomoção, ataque e derrota usam poses distintas em todos os índices", async () => {
  for (const [prefix, frames] of [
    ["player.walk", 4],
    ["player.die", 4],
    ["chaser.walk", 8],
    ["chaser.attack", 4],
    ["chaser.dead", 4],
    ["patrolShooter.patrol", 8],
    ["patrolShooter.aim", 4],
    ["patrolShooter.recovery", 4],
    ["turret.patrol", 8]
  ]) {
    const hashes = [];
    for (let frame = 0; frame < frames; frame += 1) {
      hashes.push((await pngInfo(`${prefix}.${frame}`)).hash);
    }
    assert.equal(new Set(hashes).size, frames, `${prefix} contém poses duplicadas`);
  }
});

test("frames de derrota do player e perseguidor estão nas dimensões canônicas do renderer", async () => {
  for (let frame = 0; frame < 4; frame += 1) {
    const pInfo = await pngInfo(`player.die.${frame}`);
    assert.deepEqual([pInfo.width, pInfo.height], [64, 96], `player.die.${frame} deve ser 64x96`);
    const cInfo = await pngInfo(`chaser.dead.${frame}`);
    assert.deepEqual([cInfo.width, cInfo.height], [16, 32], `chaser.dead.${frame} deve ser 16x32`);
  }
});

test("estados visuais da torre e projétil inimigo estão presentes nas dimensões esperadas", async () => {
  const bullet = await pngInfo("enemy.bullet");
  assert.deepEqual([bullet.width, bullet.height], [16, 16]);
  const ready = await pngInfo("turret.ready.0");
  assert.deepEqual([ready.width, ready.height], [32, 32]);
  for (let frame = 0; frame < 4; frame += 1) {
    const info = await pngInfo(`turret.shooting.${frame}`);
    assert.deepEqual([info.width, info.height], [32, 32]);
  }
  for (let frame = 0; frame < 5; frame += 1) {
    const info = await pngInfo(`turret.created.${frame}`);
    assert.deepEqual([info.width, info.height], [16, 32]);
  }
});

test("assets Antigravity da Fábrica estão mapeados e mantêm dimensões entregues", async () => {
  const background = await pngInfo("world.background.factory");
  const tiles = await pngInfo("world.tiles.factory");
  assert.deepEqual([background.width, background.height], [1365, 768]);
  assert.deepEqual([tiles.width, tiles.height], [128, 128]);
  assert.equal(manifest.get("world.background.factory").url, "assets/images/world/fabrica-sucata.png");
  assert.equal(manifest.get("world.tiles.factory").url, "assets/images/world/factory-platformtiles.png");
});

test("assets candidatos do Cyber Lab estão mapeados como opcionais e mantêm dimensões e canais esperados", async () => {
  const bgEntry = manifest.get("world.background.cyberlab");
  const tilesEntry = manifest.get("world.tiles.cyberlab");
  assert.ok(bgEntry, "world.background.cyberlab deve existir no manifesto");
  assert.ok(tilesEntry, "world.tiles.cyberlab deve existir no manifesto");
  assert.equal(bgEntry.required, false, "world.background.cyberlab deve ser opcional");
  assert.equal(tilesEntry.required, false, "world.tiles.cyberlab deve ser opcional");
  assert.equal(bgEntry.url, "assets/images/world/cyber-lab.png");
  assert.equal(tilesEntry.url, "assets/images/world/cyber-lab-platformtiles.png");

  const background = await pngInfo("world.background.cyberlab");
  const tiles = await pngInfo("world.tiles.cyberlab");
  assert.deepEqual([background.width, background.height], [1365, 768]);
  assert.deepEqual([tiles.width, tiles.height], [128, 128]);

  const bgBytes = await readFile(path.join(root, bgEntry.url));
  const tilesBytes = await readFile(path.join(root, tilesEntry.url));
  assert.equal(bgBytes[25], 2, "cyber-lab.png deve ser PNG RGB opaco (colorType 2)");
  assert.equal(tilesBytes[25], 6, "cyber-lab-platformtiles.png deve ser PNG RGBA com canal alpha real (colorType 6)");
});

test("assets do power-up Rajada Dupla estão mapeados, são 16x16 e possuem poses distintas", async () => {
  const hashes = [];
  for (let frame = 0; frame < 4; frame += 1) {
    const info = await pngInfo(`powerUp.double-burst.idle.${frame}`);
    assert.deepEqual([info.width, info.height], [16, 16], `powerUp.double-burst.idle.${frame} deve ser 16x16`);
    hashes.push(info.hash);
  }
  assert.equal(new Set(hashes).size, 4, "ciclo de idle do power-up contém poses distintas em todos os 4 frames");
  const defaultInfo = await pngInfo("powerUp.double-burst.idle");
  assert.deepEqual([defaultInfo.width, defaultInfo.height], [16, 16]);
});

test("preloader WebKit processa assets sequencialmente e libera progresso por item", async () => {
  const entries = [
    { type: "image", key: "first", url: "first.png", required: true },
    { type: "image", key: "second", url: "second.png", required: false },
    { type: "audio", key: "sound", url: "sound.webm", required: false }
  ];
  const progress = [];
  let active = 0;
  let maxActive = 0;
  const load = async (entry) => {
    active += 1;
    maxActive = Math.max(maxActive, active);
    await new Promise((resolve) => setTimeout(resolve, 1));
    active -= 1;
    return entry.type === "image" ? { key: entry.key } : entry.url;
  };
  const result = await loadAssetManifest(entries, (completed, total, entry) => {
    progress.push([completed, total, entry.key]);
  }, {
    imageLoader: load,
    audioLoader: load,
    yieldControl: () => Promise.resolve(),
    logger: { warn() {} }
  });

  assert.equal(maxActive, 1, "não deve materializar imagens Base64 em paralelo");
  assert.deepEqual(progress, [[1, 3, "first"], [2, 3, "second"], [3, 3, "sound"]]);
  assert.deepEqual([...result.images.keys()], ["first", "second"]);
  assert.equal(result.audioUrls.get("sound"), "sound.webm");
});

test("falha opcional é registrada e não interrompe os assets seguintes", async () => {
  const warnings = [];
  const entries = [
    { type: "image", key: "optional", url: "optional.png", required: false },
    { type: "audio", key: "sound", url: "sound.webm", required: false }
  ];
  const result = await loadAssetManifest(entries, () => {}, {
    imageLoader: async () => { throw new Error("decode blocked"); },
    audioLoader: async (entry) => entry.url,
    yieldControl: () => Promise.resolve(),
    logger: { warn: (...args) => warnings.push(args) }
  });

  assert.equal(result.failures.length, 1);
  assert.equal(result.failures[0].key, "optional");
  assert.equal(result.audioUrls.get("sound"), "sound.webm");
  assert.equal(warnings.length, 1);
});

test("falha obrigatória encerra o preload com mensagem em vez de ficar pendente", async () => {
  let calls = 0;
  const entries = [
    { type: "image", key: "required", url: "required.png", required: true },
    { type: "image", key: "never", url: "never.png", required: false }
  ];
  await assert.rejects(loadAssetManifest(entries, () => {}, {
    imageLoader: async () => { calls += 1; throw new Error("timeout"); },
    yieldControl: () => Promise.resolve(),
    logger: { warn() {} }
  }), /required\.png/);
  assert.equal(calls, 1, "não deve prolongar o boot depois que um recurso obrigatório falha");
});

test("imagem sem evento load/error expira por timeout no WebKit", async () => {
  const PreviousImage = globalThis.Image;
  globalThis.Image = class {
    set src(value) { this.currentSrc = value; }
  };
  try {
    await assert.rejects(
      loadImageAsset({ key: "stalled", url: "stalled.png" }, 5),
      /Tempo esgotado.*stalled\.png/
    );
  } finally {
    if (PreviousImage === undefined) delete globalThis.Image;
    else globalThis.Image = PreviousImage;
  }
});

test("imagem Base64 vira bitmap e limpa img.src depois da decodificação", async () => {
  const PreviousImage = globalThis.Image;
  const previousCreateImageBitmap = globalThis.createImageBitmap;
  const assignedSources = [];
  const bitmap = { width: 32, height: 24, kind: "bitmap" };
  globalThis.Image = class {
    set src(value) {
      assignedSources.push(value);
      if (value) queueMicrotask(() => this.onload?.());
    }
  };
  globalThis.createImageBitmap = async () => bitmap;
  try {
    const loaded = await loadImageAsset({ key: "embedded", url: "data:image/png;base64,AAAA" }, 50);
    assert.equal(loaded, bitmap);
    assert.deepEqual(assignedSources, ["data:image/png;base64,AAAA", ""]);
  } finally {
    if (PreviousImage === undefined) delete globalThis.Image;
    else globalThis.Image = PreviousImage;
    if (previousCreateImageBitmap === undefined) delete globalThis.createImageBitmap;
    else globalThis.createImageBitmap = previousCreateImageBitmap;
  }
});

test("standalone libera Base64 de imagem após carregar e preserva URL de áudio", async () => {
  const previousEmbedded = globalThis.__BOYPUNK_EMBEDDED_ASSETS__;
  globalThis.__BOYPUNK_EMBEDDED_ASSETS__ = {
    "image.png": "data:image/png;base64,AAAA",
    "sound.webm": "data:audio/webm;base64,BBBB"
  };
  try {
    let imageLoads = 0;
    const loaded = await loadAssetManifest([
      { type: "image", key: "image", url: "image.png", required: true },
      { type: "image", key: "image.alias", url: "image.png", required: true },
      { type: "audio", key: "sound", url: "sound.webm", required: false }
    ], () => {}, {
      imageLoader: async () => { imageLoads += 1; return { complete: true }; },
      audioLoader: async (entry) => globalThis.__BOYPUNK_EMBEDDED_ASSETS__[entry.url],
      yieldControl: () => Promise.resolve(),
      logger: { warn() {} }
    });
    assert.equal(imageLoads, 1, "aliases do mesmo PNG devem reutilizar o objeto decodificado");
    assert.equal(loaded.images.get("image"), loaded.images.get("image.alias"));
    assert.equal("image.png" in globalThis.__BOYPUNK_EMBEDDED_ASSETS__, false);
    assert.equal(globalThis.__BOYPUNK_EMBEDDED_ASSETS__["sound.webm"], "data:audio/webm;base64,BBBB");
  } finally {
    if (previousEmbedded === undefined) delete globalThis.__BOYPUNK_EMBEDDED_ASSETS__;
    else globalThis.__BOYPUNK_EMBEDDED_ASSETS__ = previousEmbedded;
  }
});

test("assets refinados de altar por nível e almas cibernéticas mantêm dimensões canônicas e poses distintas", async () => {
  // Distrito Neon Altar (0..6, 32x48)
  const neonHashes = [];
  for (let frame = 0; frame < 7; frame += 1) {
    const info = await pngInfo(`altar.distrito-neon.${frame}`);
    assert.deepEqual([info.width, info.height], [32, 48], `altar.distrito-neon.${frame} deve ser 32x48`);
    neonHashes.push(info.hash);
  }
  assert.equal(new Set(neonHashes).size, 7, "estágios do altar de Distrito Neon devem ter poses distintas");

  // Fábrica de Sucata Altar (0..6, 32x48)
  const factoryHashes = [];
  for (let frame = 0; frame < 7; frame += 1) {
    const info = await pngInfo(`altar.scrap-factory.${frame}`);
    assert.deepEqual([info.width, info.height], [32, 48], `altar.scrap-factory.${frame} deve ser 32x48`);
    factoryHashes.push(info.hash);
  }
  assert.equal(new Set(factoryHashes).size, 7, "estágios do altar da Fábrica de Sucata devem ter poses distintas");

  // Refined Cyber Souls (0..3, 15x16)
  const soulHashes = [];
  for (let frame = 0; frame < 4; frame += 1) {
    const info = await pngInfo(`soul.cyber.${frame}`);
    assert.deepEqual([info.width, info.height], [15, 16], `soul.cyber.${frame} deve ser 15x16`);
    soulHashes.push(info.hash);
  }
  assert.equal(new Set(soulHashes).size, 4, "ciclo de animação da alma cibernética deve ter poses distintas");
});

test("assets ilustrados 2x para upgrade cinematográfico possuem dimensões exatas e PNG válido", async () => {
  // BoyPunk Illustrated (128x192)
  for (let frame = 0; frame < 4; frame += 1) {
    const info = await pngInfo(`player.illustrated.idle.${frame}`);
    assert.deepEqual([info.width, info.height], [128, 192], `player.illustrated.idle.${frame} deve ser 128x192`);
  }

  // Nilo Illustrated (128x192)
  for (let frame = 0; frame < 4; frame += 1) {
    const info = await pngInfo(`nilo.illustrated.idle.${frame}`);
    assert.deepEqual([info.width, info.height], [128, 192], `nilo.illustrated.idle.${frame} deve ser 128x192`);
  }

  // Altar Distrito Neon Illustrated (64x96)
  for (let frame = 0; frame < 7; frame += 1) {
    const info = await pngInfo(`altar.distrito-neon.illustrated.${frame}`);
    assert.deepEqual([info.width, info.height], [64, 96], `altar.distrito-neon.illustrated.${frame} deve ser 64x96`);
  }

  // Chaser Illustrated (32x64)
  for (let frame = 0; frame < 2; frame += 1) {
    const info = await pngInfo(`chaser.illustrated.idle.${frame}`);
    assert.deepEqual([info.width, info.height], [32, 64], `chaser.illustrated.idle.${frame} deve ser 32x64`);
  }

  // Illustrated projectile (16x16)
  const bulletInfo = await pngInfo("player.bullet.illustrated");
  assert.deepEqual([bulletInfo.width, bulletInfo.height], [16, 16], "player.bullet.illustrated deve ser 16x16");

  // BoyPunk Illustrated Attack (128x192)
  for (let frame = 0; frame < 4; frame += 1) {
    const info = await pngInfo(`player.illustrated.attack1.${frame}`);
    assert.deepEqual([info.width, info.height], [128, 192], `player.illustrated.attack1.${frame} deve ser 128x192`);
  }

  // Patrol Shooter Illustrated (64x64)
  for (let frame = 0; frame < 8; frame += 1) {
    const info = await pngInfo(`patrolShooter.illustrated.patrol.${frame}`);
    assert.deepEqual([info.width, info.height], [64, 64], `patrolShooter.illustrated.patrol.${frame} deve ser 64x64`);
  }
  const fireInfo = await pngInfo("patrolShooter.illustrated.fire.0");
  assert.deepEqual([fireInfo.width, fireInfo.height], [64, 64], "patrolShooter.illustrated.fire.0 deve ser 64x64");
});
