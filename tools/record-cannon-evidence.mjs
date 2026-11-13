import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const outDir = path.join(root, "evidencias", "art", "canhao");
await mkdir(outDir, { recursive: true });

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(fn, timeout = 12000) {
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

// Check if dev server is up at 47831, else start one on port 0
let serverUrl = "http://127.0.0.1:47831/";
let spawnedServer = null;
try {
  const res = await fetch(`${serverUrl}health.json`);
  if (!res.ok) throw new Error("not ok");
} catch {
  console.log("Servidor em 47831 não respondeu, iniciando servidor temporário na porta 0...");
  spawnedServer = spawn("node", ["tools/server.mjs", "--root", ".", "--port", "0"], { stdio: ["ignore", "pipe", "pipe"] });
  serverUrl = await new Promise((resolve) => {
    spawnedServer.stdout.on("data", (chunk) => {
      const m = chunk.toString().match(/http:\/\/127\.0\.0\.1:(\d+)\//);
      if (m) resolve(`http://127.0.0.1:${m[1]}/`);
    });
  });
}
console.log("Conectando ao servidor:", serverUrl);

const prefix = process.argv.includes("--after") ? "after" : "before";
const profile = await mkdtemp("/tmp/boypunk-cannon-audit-");

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
  `${serverUrl}?bonus-preview=1&test=1`
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

  await waitFor(() => client.evaluate("Boolean(window.__BOYPUNK_TEST__?.ready)"), 15000);
  console.log("BoyPunk pronto no preview da Câmara de Energia.");

  // Freeze cannon update simulation to capture exact state snapshots
  await client.evaluate(`
    window.__BOYPUNK_TEST__.setDebug(false);
    window.__BOYPUNK_TEST__.model.updateBonusCannon = () => {};
  `);

  if (prefix === "before") {
    await client.evaluate(`
      // Temporarily restore the old prototype drawing for baseline comparison
      window.__BOYPUNK_TEST__.setDrawBonusCannonOld = (enabled) => {
        // We can hook into the renderer or redefine drawBonusCannon
      };
    `);
  }

  // Get canvas position on page for precise pixel-perfect bounding box clipping
  const canvasRect = await client.evaluate(`(() => {
    const c = document.querySelector("#game");
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height, scale: r.width / 480 };
  })()`);

  console.log("Canvas rect:", canvasRect);

  // States to capture:
  // 1. Idle (wait phase)
  // 2. Telegraph Charge (charging, aim locked at player)
  // 3. Telegraph Lock (final lock, bracket box reticle active)
  // 4. Fire Recoil & Flash (early recovery: muzzle flash at (448, 220) and recoil offset)
  // 5. Recovery & Thermal Cooling (mid recovery: steam exhaust and amber cooling)

  const states = [
    { name: "01-idle", setup: "(() => { const c = window.__BOYPUNK_TEST__.model.bonusCannon; c.phase = 'wait'; c.phaseTime = 2.0; c.aimX = null; c.aimY = null; })()" },
    { name: "02-telegraph-charge", setup: "(() => { const c = window.__BOYPUNK_TEST__.model.bonusCannon; c.phase = 'telegraph'; c.phaseTime = 0.40; c.aimX = 200; c.aimY = 160; })()" },
    { name: "03-telegraph-lock", setup: "(() => { const c = window.__BOYPUNK_TEST__.model.bonusCannon; c.phase = 'telegraph'; c.phaseTime = 0.04; c.aimX = 140; c.aimY = 120; })()" },
    { name: "04-recoil-fire", setup: "(() => { const c = window.__BOYPUNK_TEST__.model.bonusCannon; c.phase = 'recovery'; c.phaseTime = 2.37; c.aimX = 140; c.aimY = 120; })()" },
    { name: "05-cooling-recovery", setup: "(() => { const c = window.__BOYPUNK_TEST__.model.bonusCannon; c.phase = 'recovery'; c.phaseTime = 1.50; c.aimX = 140; c.aimY = 120; })()" }
  ];


  for (const st of states) {
    await client.evaluate(st.setup);
    await delay(100);

    // Full screen
    const fullPath = path.join(outDir, `${prefix}-${st.name}-full.png`);
    await client.captureScreenshot(fullPath);

    // Native size cannon crop around x: 400..480, y: 190..250 (80x60 in logical 480x270 coordinates)
    const clipX = canvasRect.x + 400 * canvasRect.scale;
    const clipY = canvasRect.y + 190 * canvasRect.scale;
    const clipW = 80 * canvasRect.scale;
    const clipH = 60 * canvasRect.scale;

    const cropPath = path.join(outDir, `${prefix}-${st.name}-crop.png`);
    await client.captureScreenshot(cropPath, { x: clipX, y: clipY, width: clipW, height: clipH, scale: 1 });
    console.log(`Capturado [${prefix}]: ${st.name}`);
  }

  // Also capture one debug alignment snapshot to prove exact physical collider alignment
  await client.evaluate(`
    (() => {
      window.__BOYPUNK_TEST__.setDebug(true);
      const c = window.__BOYPUNK_TEST__.model.bonusCannon;
      c.phase = 'wait'; c.phaseTime = 2.0; c.aimX = null; c.aimY = null;
    })()
  `);

  await delay(100);
  const clipX = canvasRect.x + 400 * canvasRect.scale;
  const clipY = canvasRect.y + 190 * canvasRect.scale;
  const clipW = 80 * canvasRect.scale;
  const clipH = 60 * canvasRect.scale;
  await client.captureScreenshot(path.join(outDir, `${prefix}-debug-alignment-crop.png`), { x: clipX, y: clipY, width: clipW, height: clipH, scale: 1 });
  await client.captureScreenshot(path.join(outDir, `${prefix}-debug-alignment-full.png`));
  console.log(`Capturado [${prefix}]: debug alignment`);

  client.close();
} finally {
  chrome.kill();
  if (spawnedServer) spawnedServer.kill();
}

console.log(`Gravação de evidências (${prefix}) concluída em: ${outDir}`);

