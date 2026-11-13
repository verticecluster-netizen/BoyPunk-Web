#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";

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

class CdpClient {
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
  async capture(outPath) {
    const data = await this.send("Page.captureScreenshot", { format: "png" });
    await writeFile(outPath, Buffer.from(data.data, "base64"));
  }
  close() {
    this.socket.close();
  }
}

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".webm", "audio/webm"],
  [".ttf", "font/ttf"]
]);

async function main() {
  const server = http.createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url || "/", "http://127.0.0.1");
      let pathname = decodeURIComponent(requestUrl.pathname);
      if (pathname === "/") pathname = "/index.html";
      const candidate = path.resolve(root, `.${pathname}`);
      const info = await stat(candidate);
      response.writeHead(200, {
        "Content-Type": mimeTypes.get(path.extname(candidate).toLowerCase()) || "application/octet-stream",
        "Content-Length": info.size,
        "Cache-Control": "no-store"
      });
      createReadStream(candidate).pipe(response);
    } catch {
      response.writeHead(404).end("Not found");
    }
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const gameUrl = `http://127.0.0.1:${port}/?test=1`;
  console.log(`Runtime Inspector server running at ${gameUrl}`);

  const profile = await mkdtemp("/tmp/boypunk-runtime-attack-");
  const chrome = spawn("/usr/bin/google-chrome", [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "--window-size=960,540",
    gameUrl
  ]);

  try {
    const activePort = await waitFor(async () => {
      const text = await readFile(path.join(profile, "DevToolsActivePort"), "utf8");
      return Number.parseInt(text.split(/\r?\n/)[0], 10);
    });

    const targets = await waitFor(async () => {
      const response = await fetch(`http://127.0.0.1:${activePort}/json/list`);
      const list = await response.json();
      return list.find((target) => target.type === "page" && target.webSocketDebuggerUrl);
    });

    const client = new CdpClient(targets.webSocketDebuggerUrl);
    await client.open();
    await Promise.all([
      client.send("Page.enable"),
      client.send("Runtime.enable")
    ]);

    await waitFor(() => client.evaluate("Boolean(window.__BOYPUNK_TEST__?.ready)"), 15000);

    // Start game
    await client.evaluate("document.querySelector('[data-ui=play]').click()");
    await delay(300);

    // Set up controlled scene: Chaser in attack state
    const setupResult = await client.evaluate(`(() => {
      const model = window.__BOYPUNK_TEST__.model;
      model.enemies.length = 0;
      model.projectiles.length = 0;
      model.nextSpawnAt = Infinity;
      model.player.x = 240;
      model.player.y = 208;
      model.spawnChaser();
      const enemy = model.enemies[0];
      enemy.x = 200;
      enemy.y = 208;
      enemy.onGround = true;
      enemy.facing = 1;
      enemy.attackFlash = 0.18;
      enemy.animState = "attack";
      enemy.animTime = 0;
      return { enemyId: enemy.id, state: enemy.animState };
    })()`);

    console.log("Scene setup:", setupResult);
    await client.evaluate("window.__BOYPUNK_TEST__.pause()");
    await delay(80);
    await client.evaluate("document.querySelector('#screen-paused').hidden = true");

    // Test each attack frame index 0, 1, 2, 3 in runtime
    const recordedFrames = [];
    for (let frameIdx = 0; frameIdx < 4; frameIdx++) {
      const animTime = frameIdx / 22;
      await client.evaluate(`(() => {
        const model = window.__BOYPUNK_TEST__.model;
        const enemy = model.enemies[0];
        enemy.attackFlash = 0.18;
        enemy.animState = "attack";
        enemy.animTime = ${animTime};
      })()`);

      await delay(60);
      const sample = await client.evaluate(`window.__BOYPUNK_TEST__.animations().filter(s => s.archetype === "chaser" && s.state === "attack").at(-1)`);
      if (sample?.frame !== frameIdx || sample?.assetKey !== `chaser.attack.${frameIdx}`) {
        throw new Error(`Frame de ataque ${frameIdx} não foi renderizado: ${JSON.stringify(sample)}`);
      }
      const outPath = path.join(evidenceDir, `runtime_attack_frame_${frameIdx}.png`);
      await client.capture(outPath);
      recordedFrames.push({ frameIdx, outPath, sample });
    }

    console.log("Recorded attack frames in runtime:", recordedFrames.map(f => f.sample));

    // Verify specifically that frame 2 rendered chaser.attack.2
    const frame2Verification = recordedFrames[2].sample;

    console.log("Frame 2 Runtime Verification:", frame2Verification);
    await client.capture(path.join(evidenceDir, "runtime_attack_frame_2_impact.png"));

    client.close();
    console.log("Runtime verification finished successfully!");
  } finally {
    chrome.kill("SIGTERM");
    server.close();
    await delay(120);
    await rm(profile, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error("Runtime Inspector error:", err);
  process.exit(1);
});
