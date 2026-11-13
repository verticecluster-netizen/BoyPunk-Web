import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const outDir = path.join(root, "evidencias", "screens");
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

const serverUrl = "http://127.0.0.1:47831/";
const screenTarget = process.argv[2] || "S2"; // "S1", "S2", etc.
const stage = process.argv[3] || "before";    // "before" or "after"

const profile = await mkdtemp("/tmp/boypunk-screen-audit-");

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

  await waitFor(() => client.evaluate("Boolean(window.__BOYPUNK_TEST__?.ready)"), 15000);

  // Turn off debug overlay lines
  await client.evaluate("window.__BOYPUNK_TEST__.setDebug(false);");

  // Setup screen
  if (screenTarget === "S2") {
    // Menu
    await client.evaluate(`(() => {
      document.querySelectorAll(".screen").forEach(s => s.hidden = true);
      const menu = document.querySelector("#screen-menu");
      if (menu) menu.hidden = false;
    })()`);
  } else if (screenTarget === "S1") {
    // Loading / Title
    await client.evaluate(`(() => {
      document.querySelectorAll(".screen").forEach(s => s.hidden = true);
      const title = document.querySelector("#loading");
      if (title) {
        title.hidden = false;
        const bar = document.querySelector("#progress-bar");
        if (bar) bar.style.width = "75%";
        const status = document.querySelector("#loading-status");
        if (status) status.textContent = "Sincronizando sistemas… 75%";
      }
    })()`);
  }

  await delay(200);

  // Get game-frame bounding box for precise capture
  const frameRect = await client.evaluate(`(() => {
    const f = document.querySelector(".game-frame");
    const r = f.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height, scale: 1 };
  })()`);

  const outPath = path.join(outDir, `${screenTarget}-${stage}.png`);
  await client.captureScreenshot(outPath, frameRect);
  console.log(`Capturado [${screenTarget} ${stage}]: ${outPath}`);

  // Also capture full window
  const fullPath = path.join(outDir, `${screenTarget}-${stage}-window.png`);
  await client.captureScreenshot(fullPath);

  client.close();
} finally {
  chrome.kill();
}
