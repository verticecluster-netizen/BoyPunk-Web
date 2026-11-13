import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";

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
      console.error("CDP Exception Details:", JSON.stringify(res.exceptionDetails, null, 2));
      throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
    }
    return res.result?.value;
  }
  async screenshot(outPath, clip = null) {
    const params = { format: "png" };
    if (clip) params.clip = clip;
    const data = await this.send("Page.captureScreenshot", params);
    await writeFile(outPath, Buffer.from(data.data, "base64"));
  }
  close() { this.socket.close(); }
}

async function run() {
  const { stat } = await import("node:fs/promises");
  const { createReadStream } = await import("node:fs");

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

  const server = http.createServer(async (req, res) => {
    try {
      const reqUrl = new URL(req.url || "/", "http://127.0.0.1");
      let pathname = decodeURIComponent(reqUrl.pathname);
      if (pathname === "/") pathname = "/index.html";
      const candidate = path.resolve(root, `.${pathname}`);
      const info = await stat(candidate);
      if (!info.isFile()) throw new Error("Not a file");
      res.writeHead(200, {
        "Content-Type": mimeTypes.get(path.extname(candidate).toLowerCase()) || "application/octet-stream",
        "Content-Length": info.size,
        "Cache-Control": "no-store"
      });
      createReadStream(candidate).pipe(res);
    } catch {
      res.writeHead(404).end("Not found");
    }
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const gameUrl = `http://127.0.0.1:${port}/?test=1`;
  console.log(`Server running at ${gameUrl}`);

  const profile = await mkdtemp("/tmp/boypunk-factory-");
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

    // 1. Start Scrap Factory directly via model and turn off debug collision overlay for pristine art captures
    console.log("Starting Scrap Factory level...");
    await client.evaluate(`(() => {
      const api = window.__BOYPUNK_TEST__;
      api.exitDemo();
      api.model.startRun({ levelId: 'scrap-factory' });
      api.setDebug(false);
    })()`);
    await delay(350);

    // Capture clean Scrap Factory overview (no enemies yet)
    await client.evaluate(`(() => {
      const model = window.__BOYPUNK_TEST__.model;
      model.enemies.length = 0;
      model.projectiles.length = 0;
      model.nextSpawnAt = Infinity;
    })()`);
    await delay(150);
    const overviewPath = path.join(evidenceDir, "scrap_factory_overview.png");
    await client.screenshot(overviewPath);
    console.log(`Saved ${overviewPath}`);

    // Capture collision alignment verification view
    await client.evaluate("window.__BOYPUNK_TEST__.setDebug(true)");
    await delay(150);
    const debugPath = path.join(evidenceDir, "scrap_factory_collision_alignment.png");
    await client.screenshot(debugPath);
    console.log(`Saved ${debugPath}`);
    await client.evaluate("window.__BOYPUNK_TEST__.setDebug(false)");

    // 2. Set up live gameplay action with enemies, player, and placed souls
    await client.evaluate(`(() => {
      const model = window.__BOYPUNK_TEST__.model;
      model.player.x = 180;
      model.player.y = 80;
      model.player.facing = 1;
      model.player.life = 4;
      model.player.onGround = true;
      model.carriedSouls = 2;
      model.spawnChaser();
      model.enemies[0].x = 320;
      model.enemies[0].y = 80;
      model.enemies[0].facing = -1;
      model.spawnShooter();
      model.enemies[1].x = 400;
      model.enemies[1].y = 144;
      model.enemies[1].facing = -1;
      model.enemies[1].phase = 'telegraph';
      model.enemies[1].phaseTime = 0.5;
      model.enemies[1].aimX = 180;
      model.enemies[1].aimY = 96;
    })()`);
    await delay(150);
    const gameplayPath = path.join(evidenceDir, "scrap_factory_gameplay.png");
    await client.screenshot(gameplayPath);
    console.log(`Saved ${gameplayPath}`);

    // 3. Capture Press States: Idle, Warning, Closing, Recovery
    // State 1: IDLE
    await client.evaluate(`(() => {
      const model = window.__BOYPUNK_TEST__.model;
      const press = model.presses[0];
      press.phase = 'idle';
      press.phaseTime = 2.0;
      press.y = press.idleY;
    })()`);
    await delay(150);
    const idlePath = path.join(evidenceDir, "press_phase_idle.png");
    await client.screenshot(idlePath);
    console.log(`Saved ${idlePath}`);

    // State 2: WARNING
    await client.evaluate(`(() => {
      const model = window.__BOYPUNK_TEST__.model;
      const press = model.presses[0];
      press.phase = 'warning';
      press.phaseTime = 0.6;
      press.y = press.idleY;
    })()`);
    await delay(150);
    const warningPath = path.join(evidenceDir, "press_phase_warning.png");
    await client.screenshot(warningPath);
    console.log(`Saved ${warningPath}`);

    // State 3: CLOSING (mid-stroke)
    await client.evaluate(`(() => {
      const model = window.__BOYPUNK_TEST__.model;
      const press = model.presses[0];
      press.phase = 'closing';
      press.phaseTime = 0.35;
      press.y = 178; // halfway down
    })()`);
    await delay(150);
    const closingPath = path.join(evidenceDir, "press_phase_closing.png");
    await client.screenshot(closingPath);
    console.log(`Saved ${closingPath}`);

    // State 4: RECOVERY
    await client.evaluate(`(() => {
      const model = window.__BOYPUNK_TEST__.model;
      const press = model.presses[0];
      press.phase = 'recovery';
      press.phaseTime = 0.7;
      press.y = 158; // ascending
    })()`);
    await delay(150);
    const recoveryPath = path.join(evidenceDir, "press_phase_recovery.png");
    await client.screenshot(recoveryPath);
    console.log(`Saved ${recoveryPath}`);

    // 4. Capture Scrap Factory Victory Screen
    await client.evaluate(`(() => {
      const api = window.__BOYPUNK_TEST__;
      api.prepareVictory({ progressionEligible: true, activeSeconds: 42.8 });
      api.depositPreparedVictory();
      api.finishVictoryPresentation();
    })()`);
    await delay(250);
    const victoryPath = path.join(evidenceDir, "scrap_factory_victory.png");
    await client.screenshot(victoryPath);
    console.log(`Saved ${victoryPath}`);

    console.log("All factory evidence captures completed successfully!");
    client.close();
  } finally {
    chrome.kill("SIGTERM");
    server.close();
  }
}

run().catch((err) => {
  console.error("Factory recording error:", err);
  process.exit(1);
});
