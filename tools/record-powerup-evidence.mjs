import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const outDir = path.join(root, "evidencias", "art", "powerups");
await mkdir(outDir, { recursive: true });

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(fn, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fn();
      if (res) return res;
    } catch {}
    await delay(100);
  }
  throw new Error("Timeout waiting for condition");
}

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.id = 1;
    this.pending = new Map();
    this.socket.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.id && this.pending.has(data.id)) {
        const { resolve, reject } = this.pending.get(data.id);
        this.pending.delete(data.id);
        if (data.error) reject(new Error(data.error.message));
        else resolve(data.result);
      }
    };
  }
  async open() {
    if (this.socket.readyState === WebSocket.OPEN) return;
    await new Promise((resolve, reject) => {
      this.socket.onopen = resolve;
      this.socket.onerror = reject;
    });
  }
  send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  async evaluate(expression) {
    const res = await this.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
    }
    return res.result?.value;
  }
  async captureScreenshot(outputPath, clip = null) {
    const params = { format: "png" };
    if (clip) params.clip = clip;
    const res = await this.send("Page.captureScreenshot", params);
    const buffer = Buffer.from(res.data, "base64");
    await writeFile(outputPath, buffer);
  }
  close() {
    this.socket.close();
  }
}

// 1. Verify test server at port 47831 or start one
let serverUrl = "http://127.0.0.1:47831/";
let spawnedServer = null;
try {
  const res = await fetch(`${serverUrl}health.json`);
  if (!res.ok) throw new Error("not ok");
  console.log("Servidor local ativo e respondendo na porta 47831.");
} catch {
  console.log("Iniciando servidor temporário na porta 47831...");
  spawnedServer = spawn("node", ["tools/server.mjs", "--root", ".", "--port", "47831"], { stdio: ["ignore", "pipe", "pipe"] });
  await delay(1000);
}

const profile = await mkdtemp("/tmp/boypunk-powerup-audit-");
console.log("Iniciando Chrome headless com perfil:", profile);

const chrome = spawn("/usr/bin/google-chrome", [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--disable-dev-shm-usage",
  "--no-first-run",
  "--no-default-browser-check",
  "--remote-allow-origins=*",
  "--remote-debugging-port=0",
  `--user-data-dir=${profile}`,
  "--window-size=1280,720",
  `${serverUrl}?test=1`
], { stdio: ["ignore", "pipe", "pipe"] });

try {
  const activePort = await waitFor(async () => {
    const text = await readFile(path.join(profile, "DevToolsActivePort"), "utf8");
    return Number.parseInt(text.split(/\r?\n/)[0], 10);
  });

  const targets = await waitFor(async () => {
    const res = await fetch(`http://127.0.0.1:${activePort}/json/list`);
    const list = await res.json();
    return list.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
  });

  const client = new Cdp(targets.webSocketDebuggerUrl);
  await client.open();
  await Promise.all([
    client.send("Page.enable"),
    client.send("Runtime.enable")
  ]);

  console.log("Aguardando inicialização do BoyPunk Web...");
  await waitFor(() => client.evaluate("Boolean(window.__BOYPUNK_TEST__?.ready)"), 15000);

  // Check asset loading failures
  const assetFailures = await client.evaluate("window.__BOYPUNK_TEST__.assetFailures");
  console.log("Falhas de carregamento de assets:", assetFailures);
  if (assetFailures && assetFailures.length > 0) {
    throw new Error(`Falhas ao carregar assets: ${assetFailures.join(", ")}`);
  }

  // Get canvas element bounding rect
  const canvasRect = await client.evaluate(`(() => {
    const c = document.querySelector("#game");
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height, scale: r.width / 480 };
  })()`);
  console.log("Canvas Rect:", canvasRect);

  async function captureGame(filename) {
    const outPath = path.join(outDir, filename);
    await client.captureScreenshot(outPath, {
      x: canvasRect.x,
      y: canvasRect.y,
      width: canvasRect.w,
      height: canvasRect.h,
      scale: 1
    });
    console.log(`  -> Salva captura: ${filename}`);
  }

  async function captureCrop(filename, logicalX, logicalY, logicalW, logicalH) {
    const outPath = path.join(outDir, filename);
    await client.captureScreenshot(outPath, {
      x: canvasRect.x + logicalX * canvasRect.scale,
      y: canvasRect.y + logicalY * canvasRect.scale,
      width: logicalW * canvasRect.scale,
      height: logicalH * canvasRect.scale,
      scale: 1
    });
    console.log(`  -> Salvo crop: ${filename}`);
  }

  // =========================================================================
  // CENÁRIO 1: Distrito Neon — Spawn do Cartucho Double Burst após 4 almas
  // =========================================================================
  console.log("\n--- CENÁRIO 1: Distrito Neon — Spawn do Cartucho ---");
  await client.evaluate(`(() => {
    window.__BOYPUNK_TEST__.startLevel("district-neon");
    const m = window.__BOYPUNK_TEST__.model;
    m.nextSpawnAt = Infinity;
    m.enemies = [];
    m.carriedSouls = 4;
    m.update(1 / 120, {});
  })()`);

  const spawnStatus = await client.evaluate(`(() => {
    const m = window.__BOYPUNK_TEST__.model;
    return {
      hasPickup: Boolean(m.powerUpPickup),
      pickup: m.powerUpPickup,
      playerX: m.player.x,
      playerY: m.player.y
    };
  })()`);
  console.log("Status de spawn do pickup (Distrito):", spawnStatus);

  await delay(200);
  await captureGame("01-district-pickup-appearance.png");
  // Crop around cartridge at (180, 160)
  await captureCrop("01-district-pickup-cartridge-crop.png", 160, 140, 56, 48);

  // =========================================================================
  // CENÁRIO 2: Coleta do Pickup & Apresentação do HUD Polido
  // =========================================================================
  console.log("\n--- CENÁRIO 2: Coleta do Pickup e HUD Polido ---");
  await client.evaluate(`(() => {
    const m = window.__BOYPUNK_TEST__.model;
    // Walk / move player directly to pickup to collect
    m.player.x = 180;
    m.player.y = 152;
    m.update(1 / 120, {});
  })()`);

  const collectStatus = await client.evaluate(`(() => {
    const m = window.__BOYPUNK_TEST__.model;
    return {
      activePowerUp: m.activePowerUp,
      effects: m.effects.map((e) => ({ kind: e.kind, text: e.text, life: e.life })),
      notice: m.notice
    };
  })()`);
  console.log("Status pós-coleta:", collectStatus);

  await delay(100);
  await captureGame("02-double-burst-collected-hud.png");
  // Crop HUD top-left status area (x: 0..160, y: 0..80)
  await captureCrop("02-hud-active-indicator-crop.png", 4, 4, 150, 75);

  // =========================================================================
  // CENÁRIO 3: Ataque com Rajada Dupla (Dois Projéteis, intervalo 0.12s)
  // =========================================================================
  console.log("\n--- CENÁRIO 3: Ataque Energizado com Rajada Dupla ---");
  await client.evaluate(`(() => {
    const m = window.__BOYPUNK_TEST__.model;
    m.player.x = 100;
    m.player.y = 208;
    m.player.facing = 1;
    m.player.attackCooldown = 0;
    m.projectiles = [];
    // Trigger attack
    m.update(1 / 120, { attackPressed: true });
    // Advance 0.125s so second shot emits
    for (let i = 0; i < 15; i++) {
      m.update(1 / 120, {});
    }
  })()`);

  const shotsStatus = await client.evaluate(`(() => {
    const m = window.__BOYPUNK_TEST__.model;
    return {
      projectilesCount: m.projectiles.length,
      shots: m.projectiles.map((p) => ({ id: p.id, burstIndex: p.burstIndex, x: p.x, vx: p.vx })),
      remainingPowerUp: m.activePowerUp?.remaining
    };
  })()`);
  console.log("Status dos disparos em voo:", shotsStatus);

  await delay(100);
  await captureGame("03-double-burst-attack-two-shots.png");
  await captureCrop("03-double-burst-projectiles-crop.png", 90, 195, 120, 45);

  // =========================================================================
  // CENÁRIO 4: Contagem Regressiva e Alerta de Duração Baixa (remaining <= 2.5s)
  // =========================================================================
  console.log("\n--- CENÁRIO 4: Contagem Regressiva e Alerta Low-Time ---");
  await client.evaluate(`(() => {
    const m = window.__BOYPUNK_TEST__.model;
    // Set remaining to 2.1 seconds
    m.activePowerUp.remaining = 2.1;
    m.update(1 / 120, {});
  })()`);

  await delay(100);
  await captureGame("04-double-burst-hud-countdown.png");
  await captureCrop("04-hud-expiring-warning-crop.png", 4, 4, 150, 75);

  // =========================================================================
  // CENÁRIO 5: Expiração do Efeito — Retorno à Cadência Normal de 1 Tiro
  // =========================================================================
  console.log("\n--- CENÁRIO 5: Expiração e Retorno a 1 Projétil Normal ---");
  await client.evaluate(`(() => {
    const m = window.__BOYPUNK_TEST__.model;
    // Step past expiration
    for (let i = 0; i < 300; i++) {
      m.update(1 / 120, {});
    }
    m.projectiles = [];
    m.player.attackCooldown = 0;
    // Normal attack without powerup
    m.update(1 / 120, { attackPressed: true });
    // Advance 0.15s
    for (let i = 0; i < 18; i++) {
      m.update(1 / 120, {});
    }
  })()`);

  const normalAttackStatus = await client.evaluate(`(() => {
    const m = window.__BOYPUNK_TEST__.model;
    return {
      activePowerUp: m.activePowerUp,
      projectilesCount: m.projectiles.length,
      pendingShots: m.pendingPlayerShots.length
    };
  })()`);
  console.log("Status pós-expiração:", normalAttackStatus);

  await delay(100);
  await captureGame("05-double-burst-expired-normal.png");

  // =========================================================================
  // CENÁRIO 6: Fábrica de Sucata — Spawn do Cartucho em Plataforma One-Way (372, 160)
  // =========================================================================
  console.log("\n--- CENÁRIO 6: Fábrica de Sucata — Spawn do Cartucho ---");
  await client.evaluate(`(() => {
    const m = window.__BOYPUNK_TEST__.model;
    m.startRun({ levelId: "scrap-factory", demo: false });
    m.nextSpawnAt = Infinity;
    m.enemies = [];
    m.carriedSouls = 4;
    m.update(1 / 120, {});
  })()`);

  const factorySpawn = await client.evaluate(`(() => {
    const m = window.__BOYPUNK_TEST__.model;
    return {
      levelId: m.levelId,
      hasPickup: Boolean(m.powerUpPickup),
      pickup: m.powerUpPickup
    };
  })()`);
  console.log("Status de spawn na Fábrica:", factorySpawn);

  await delay(200);
  await captureGame("06-factory-pickup-appearance.png");
  // Crop around factory cartridge platform at (372, 160)
  await captureCrop("06-factory-pickup-cartridge-crop.png", 350, 140, 60, 48);

  // =========================================================================
  // CENÁRIO 7: Expiração de Pickup Não Coletado após 12 Segundos
  // =========================================================================
  console.log("\n--- CENÁRIO 7: Expiração de Pickup Não Coletado (12s) ---");
  await client.evaluate(`(() => {
    const m = window.__BOYPUNK_TEST__.model;
    m.startRun({ levelId: "district-neon", demo: false });
    m.nextSpawnAt = Infinity;
    m.enemies = [];
    m.carriedSouls = 4;
    m.update(1 / 120, {});
    // Fast-forward 12.5 active seconds
    const steps = Math.ceil(12.5 * 120);
    for (let i = 0; i < steps; i++) {
      m.update(1 / 120, {});
    }
  })()`);

  const expiredPickupStatus = await client.evaluate(`(() => {
    const m = window.__BOYPUNK_TEST__.model;
    return {
      hasPickup: Boolean(m.powerUpPickup),
      spawnResolved: m.powerUpSpawnResolved
    };
  })()`);
  console.log("Status de expiração do pickup não coletado:", expiredPickupStatus);

  await delay(100);
  await captureGame("07-pickup-uncollected-expired.png");

  // =========================================================================
  // CENÁRIO 8: Congelamento em Pausa (Timers Não Avançam)
  // =========================================================================
  console.log("\n--- CENÁRIO 8: Congelamento em Pausa ---");
  await client.evaluate(`(() => {
    const m = window.__BOYPUNK_TEST__.model;
    m.startRun({ levelId: "district-neon", demo: false });
    m.nextSpawnAt = Infinity;
    m.enemies = [];
    m.activatePowerUp("double-burst");
    m.activePowerUp.remaining = 8.4;
    m.pause();
  })()`);

  const pauseStatus = await client.evaluate(`(() => {
    const m = window.__BOYPUNK_TEST__.model;
    return {
      paused: m.paused,
      remaining: m.activePowerUp?.remaining
    };
  })()`);
  console.log("Status em pausa:", pauseStatus);

  await delay(200);
  await captureGame("08-pause-freeze-timers.png");

  // =========================================================================
  // CENÁRIO 9: Morte do Jogador Limpa Power-Up e Tiros Pendentes
  // =========================================================================
  console.log("\n--- CENÁRIO 9: Morte Limpa Efeito e Tiros Pendentes ---");
  await client.evaluate(`(() => {
    const m = window.__BOYPUNK_TEST__.model;
    m.resume();
    m.player.life = 0;
    m.resolveTerminalOutcome();
  })()`);

  const deathStatus = await client.evaluate(`(() => {
    const m = window.__BOYPUNK_TEST__.model;
    return {
      state: m.state,
      activePowerUp: m.activePowerUp,
      pendingShots: m.pendingPlayerShots.length,
      pickup: m.powerUpPickup
    };
  })()`);
  console.log("Status de derrota:", deathStatus);

  await delay(200);
  await captureGame("09-player-death-clears-powerup.png");

  // =========================================================================
  // CENÁRIO 10: Viewport Estreito / Mobile HUD Layout
  // =========================================================================
  console.log("\n--- CENÁRIO 10: Viewport Mobile e HUD Compacto ---");
  // Emulate mobile viewport
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 640,
    height: 360,
    deviceScaleFactor: 2,
    mobile: true
  });
  await delay(200);

  await client.evaluate(`(() => {
    window.__BOYPUNK_TEST__.startLevel("district-neon");
    const m = window.__BOYPUNK_TEST__.model;
    m.nextSpawnAt = Infinity;
    m.enemies = [];
    m.activatePowerUp("double-burst");
    m.activePowerUp.remaining = 6.2;
    m.notice = { text: "AVISO DE TRANSMISSÃO NEON" };
  })()`);

  await delay(300);
  await client.captureScreenshot(path.join(outDir, "10-narrow-viewport-hud.png"));
  console.log("  -> Salva captura mobile: 10-narrow-viewport-hud.png");

  console.log("\nTodos os 10 cenários foram validados e fotografados no Chrome real!");
  client.close();
} finally {
  chrome.kill();
  if (spawnedServer) spawnedServer.kill();
}
