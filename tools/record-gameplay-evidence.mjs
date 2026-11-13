import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = process.cwd();
const evidenceDir = path.join(root, "evidencias", "art");
await mkdir(evidenceDir, { recursive: true });

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(fn, timeout = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fn();
      if (res) return res;
    } catch {}
    await delay(100);
  }
  throw new Error("Timeout");
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
    if (res.exceptionDetails) throw new Error(res.exceptionDetails.text);
    return res.result?.value;
  }
  async screenshot(outPath) {
    const data = await this.send("Page.captureScreenshot", { format: "png" });
    await writeFile(outPath, Buffer.from(data.data, "base64"));
  }
  close() { this.socket.close(); }
}

async function run() {
  // 1. Start test server on ephemeral port
  const { createServer } = await import("node:http");
  const { stat } = await import("node:fs/promises");
  const { createReadStream } = await import("node:fs");

  const server = http.createServer(async (req, res) => {
    let p = req.url.split("?")[0];
    if (p === "/") p = "/index.html";
    const file = path.join(root, p);
    try {
      await stat(file);
      const ext = path.extname(file);
      const mime = ext === ".html" ? "text/html" : ext === ".js" ? "application/javascript" : ext === ".png" ? "image/png" : "application/octet-stream";
      res.writeHead(200, { "Content-Type": mime });
      createReadStream(file).pipe(res);
    } catch {
      res.writeHead(404).end("Not found");
    }
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const gameUrl = `http://127.0.0.1:${port}/?test=1`;
  console.log(`Server running at ${gameUrl}`);

  // 2. Launch headless Chrome
  const profile = await mkdtemp("/tmp/boypunk-record-");
  const chrome = spawn("/usr/bin/google-chrome", [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "--window-size=1280,720",
    gameUrl
  ]);

  try {
    const debugPort = await waitFor(async () => {
      const text = await readFile(path.join(profile, "DevToolsActivePort"), "utf8");
      return Number.parseInt(text.split(/\r?\n/)[0], 10);
    });

    const targets = await waitFor(async () => {
      const r = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
      const list = await r.json();
      return list.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
    });

    const client = new Cdp(targets.webSocketDebuggerUrl);
    await client.open();
    await client.send("Page.enable");
    await client.send("Runtime.enable");

    await waitFor(() => client.evaluate("Boolean(window.__BOYPUNK_TEST__?.ready)"), 10000);

    // Start game
    await client.evaluate("document.querySelector('[data-ui=play]').click()");
    await delay(300);

    // Spawn 2 chasers for recording: one moving left, one moving right
    await client.evaluate(`(() => {
      const model = window.__BOYPUNK_TEST__.model();
      model.enemies.length = 0;
      model.projectiles.length = 0;
      model.nextSpawnAt = Infinity;
      model.player.x = 230;
      model.player.y = 208;
      model.player.onGround = true;
      model.spawnChaser();
      model.spawnChaser();
      model.enemies[0].x = 80;
      model.enemies[0].y = 208;
      model.enemies[0].onGround = true;
      model.enemies[0].facing = 1;
      model.enemies[1].x = 380;
      model.enemies[1].y = 208;
      model.enemies[1].onGround = true;
      model.enemies[1].facing = -1;
    })()`);

    // Capture continuous locomotion frames
    console.log("Capturing live runtime frames...");
    const runtimeCaptures = [];
    for (let frame = 0; frame < 8; frame++) {
      await delay(85);
      const capPath = path.join(evidenceDir, `runtime_locomotion_step_${frame}.png`);
      await client.screenshot(capPath);
      runtimeCaptures.push(capPath);
    }

    // Trigger chaser attack
    await client.evaluate(`(() => {
      const model = window.__BOYPUNK_TEST__.model();
      model.player.x = 100;
      model.enemies[0].x = 96;
      model.enemies[0].facing = 1;
      model.enemies[0].attackCooldown = 0;
      model.enemies[0].attackFlash = 0.18;
    })()`);

    await delay(50);
    const attackCapPath = path.join(evidenceDir, "runtime_chaser_attack.png");
    await client.screenshot(attackCapPath);

    // Capture full gameplay arena view
    const liveCapPath = path.join(evidenceDir, "gameplay_live_runtime.png");
    await client.screenshot(liveCapPath);

    console.log("All runtime captures completed successfully.");
    client.close();
  } finally {
    chrome.kill("SIGTERM");
    server.close();
  }
}

run().catch((err) => {
  console.error("Recording error:", err);
  process.exit(1);
});
