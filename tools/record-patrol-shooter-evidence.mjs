import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const outDir = path.join(root, "evidencias", "art", "patrol-shooter");
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

const profile = await mkdtemp("/tmp/boypunk-patrol-shooter-audit-");
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
  `${serverUrl}?patrol-shooter-preview=1&test=1`
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

  console.log("Aguardando carregamento de recursos e inicialização do BoyPunk...");
  await waitFor(() => client.evaluate("Boolean(window.__BOYPUNK_TEST__?.ready)"), 15000);

  // Check asset loading failures
  const assetFailures = await client.evaluate("window.__BOYPUNK_TEST__.assetFailures");
  console.log("Falhas de carregamento de assets:", assetFailures);
  if (assetFailures && assetFailures.length > 0) {
    throw new Error(`Falhas ao carregar assets: ${assetFailures.join(", ")}`);
  }

  // Check preview active
  const previewStatus = await client.evaluate(`(() => {
    const m = window.__BOYPUNK_TEST__.model;
    const enemy = m.enemies.find((e) => e.kind === 'patrol-shooter');
    return {
      patrolShooterPreview: m.patrolShooterPreview,
      enemyFound: Boolean(enemy),
      enemyId: enemy?.id,
      phase: enemy?.phase,
      x: enemy?.x,
      y: enemy?.y,
      facing: enemy?.facing,
      routeId: enemy?.routeId
    };
  })()`);
  console.log("Status do Preview no Browser:", previewStatus);

  // Get canvas rectangle and pixel scale
  const canvasRect = await client.evaluate(`(() => {
    const c = document.querySelector("#game");
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height, scale: r.width / 480 };
  })()`);
  console.log("Canvas Rect:", canvasRect);

  // Capture helper for enemy area crop: (enemy.x - 24, enemy.y - 16, 80, 64)
  async function captureEnemyCrop(filename) {
    const enemyPos = await client.evaluate(`(() => {
      const e = window.__BOYPUNK_TEST__.model.enemies.find((candidate) => candidate.kind === 'patrol-shooter');
      return e ? { x: e.x, y: e.y, facing: e.facing, phase: e.phase, animTime: e.animTime } : null;
    })()`);
    if (!enemyPos) return;

    // Crop box around enemy in 480x270 logical coords
    const logicalX = Math.max(0, enemyPos.x - 24);
    const logicalY = Math.max(0, enemyPos.y - 16);
    const logicalW = 80;
    const logicalH = 64;

    const clip = {
      x: canvasRect.x + logicalX * canvasRect.scale,
      y: canvasRect.y + logicalY * canvasRect.scale,
      width: logicalW * canvasRect.scale,
      height: logicalH * canvasRect.scale,
      scale: 1
    };

    const outPath = path.join(outDir, filename);
    await client.captureScreenshot(outPath, clip);
    return enemyPos;
  }

  // 1. Capture Patrol Locomotion Walk Frames in both directions
  console.log("\n[1/5] Capturando frames de patrulha e caminhada no browser...");
  // Let the enemy walk left
  for (let step = 0; step < 8; step++) {
    await client.evaluate(`(() => {
      const m = window.__BOYPUNK_TEST__.model;
      const e = m.enemies.find((candidate) => candidate.kind === 'patrol-shooter');
      if (e) {
        e.phase = 'patrol';
        e.facing = -1;
        e.patrolDirection = -1;
        e.animTime = ${step} * (1 / 12);
      }
    })()`);
    await delay(60);
    await captureEnemyCrop(`runtime-patrol-walk-left-${String(step).padStart(3, "0")}.png`);
  }

  // Walk right (mirrored facing > 0)
  for (let step = 0; step < 4; step++) {
    await client.evaluate(`(() => {
      const m = window.__BOYPUNK_TEST__.model;
      const e = m.enemies.find((candidate) => candidate.kind === 'patrol-shooter');
      if (e) {
        e.phase = 'patrol';
        e.facing = 1;
        e.patrolDirection = 1;
        e.animTime = ${step} * (1 / 12);
      }
    })()`);
    await delay(60);
    await captureEnemyCrop(`runtime-patrol-walk-right-${String(step).padStart(3, "0")}.png`);
  }

  // 2. Capture Aim / Warning States
  console.log("\n[2/5] Capturando estado de mira (AIM / WARNING) no browser...");
  for (let aimIdx = 0; aimIdx < 4; aimIdx++) {
    await client.evaluate(`(() => {
      const m = window.__BOYPUNK_TEST__.model;
      const e = m.enemies.find((candidate) => candidate.kind === 'patrol-shooter');
      if (e) {
        e.phase = 'aim';
        e.facing = -1;
        e.aimX = m.player.x + m.player.w / 2;
        e.aimY = m.player.y + m.player.h / 2;
        e.phaseTime = 0.90 * (1 - ${aimIdx} / 3.9);
        e.animTime = ${aimIdx} * 0.225;
      }
    })()`);
    await delay(60);
    await captureEnemyCrop(`runtime-aim-warning-${String(aimIdx).padStart(3, "0")}.png`);
  }

  // Full screenshot during warning aim line
  await client.captureScreenshot(path.join(outDir, "runtime-preview-aim-fullscreen.png"));

  // 3. Capture Fire State (Discharge at 6, 13)
  console.log("\n[3/5] Capturando estado de disparo (FIRE) no browser...");
  await client.evaluate(`(() => {
    const m = window.__BOYPUNK_TEST__.model;
    const e = m.enemies.find((candidate) => candidate.kind === 'patrol-shooter');
    if (e) {
      e.phase = 'fire';
      e.facing = -1;
      e.animTime = 0.005;
      e.recoilTime = 0.28;
    }
  })()`);
  await delay(60);
  await captureEnemyCrop("runtime-fire-discharge.png");

  // 4. Capture Recovery State (Recoil kick and cooling)
  console.log("\n[4/5] Capturando recuperação e resfriamento (RECOVERY) no browser...");
  for (let recIdx = 0; recIdx < 4; recIdx++) {
    await client.evaluate(`(() => {
      const m = window.__BOYPUNK_TEST__.model;
      const e = m.enemies.find((candidate) => candidate.kind === 'patrol-shooter');
      if (e) {
        e.phase = 'recovery';
        e.facing = -1;
        e.recoilTime = Math.max(0, 0.28 - ${recIdx} * 0.09);
        e.phaseTime = 1.25 - ${recIdx} * 0.30;
        e.animTime = ${recIdx} * 0.08;
      }
    })()`);
    await delay(60);
    await captureEnemyCrop(`runtime-recovery-${String(recIdx).padStart(3, "0")}.png`);
  }

  // 5. Test Pause & Restart in Browser
  console.log("\n[5/5] Testando pausa e reinício no browser...");
  const beforePause = await client.evaluate(`(() => {
    const m = window.__BOYPUNK_TEST__.model;
    m.pause();
    return { state: m.state, elapsed: m.elapsed };
  })()`);
  await delay(100);
  const duringPause = await client.evaluate(`(() => {
    const m = window.__BOYPUNK_TEST__.model;
    return { state: m.state, elapsed: m.elapsed };
  })()`);
  console.log("Pausa:", beforePause, "->", duringPause);
  if (beforePause.state !== "paused" || duringPause.elapsed !== beforePause.elapsed) {
    throw new Error("Pausa falhou em congelar a simulação no browser.");
  }

  // Resume
  await client.evaluate("window.__BOYPUNK_TEST__.resume()");
  await delay(100);

  // Restart
  const restarted = await client.evaluate(`(() => {
    const api = window.__BOYPUNK_TEST__;
    api.restart();
    const m = api.model;
    const e = m.enemies.find((candidate) => candidate.kind === 'patrol-shooter');
    return {
      patrolShooterPreview: m.patrolShooterPreview,
      enemyPhase: e?.phase,
      enemyX: e?.x,
      enemyY: e?.y
    };
  })()`);
  console.log("Reinício do preview:", restarted);
  if (!restarted.patrolShooterPreview || restarted.enemyPhase !== "patrol") {
    throw new Error("Reinício do preview falhou.");
  }

  // Final full screen screenshot in gameplay preview
  await delay(300);
  await client.captureScreenshot(path.join(outDir, "runtime-preview-patrol-fullscreen.png"));

  // Check animation sample logs from renderer
  const samples = await client.evaluate("window.__BOYPUNK_TEST__.animations()");
  const patrolSamples = samples.filter((s) => s.archetype === "patrol-shooter");
  console.log(`Total de amostras de animação do patrol-shooter registradas pelo renderer: ${patrolSamples.length}`);
  const uniqueKeys = [...new Set(patrolSamples.map((s) => s.assetKey))];
  console.log("Chaves de assets efetivamente renderizadas:", uniqueKeys);

  client.close();
  console.log("\nEvidências de execução em browser coletadas com sucesso!");
} finally {
  chrome.kill();
  if (spawnedServer) spawnedServer.kill();
}
