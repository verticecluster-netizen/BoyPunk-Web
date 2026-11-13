import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const outDir = path.join(root, "evidencias", "art", "polimento-global");
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

async function main() {
  console.log("=== BoyPunk-Web: Captura de Linha de Base (Auditoria Visual) ===");
  const chromePath = "/usr/bin/google-chrome";
  const userDataDir = await mkdtemp("/tmp/boypunk-chrome-audit-");
  const chrome = spawn(chromePath, [
    "--headless=new",
    "--remote-debugging-port=0",
    `--user-data-dir=${userDataDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    "--disable-background-timer-throttling",
    "--window-size=960,540",
    "about:blank"
  ]);

  try {
    const activePort = await waitFor(async () => {
      const text = await readFile(path.join(userDataDir, "DevToolsActivePort"), "utf8");
      return Number.parseInt(text.split(/\r?\n/)[0], 10);
    });

    const targets = await waitFor(async () => {
      const res = await fetch(`http://127.0.0.1:${activePort}/json/list`);
      const list = await res.json();
      return list.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
    });

    const cdp = new Cdp(targets.webSocketDebuggerUrl);
    await cdp.open();

    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("DOM.enable");
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 960,
      height: 540,
      deviceScaleFactor: 1,
      mobile: false
    });

    // 1. Carregar jogo principal com ?test=1
    await cdp.send("Page.navigate", { url: "http://127.0.0.1:47831/?test=1" });
    await waitFor(async () => {
      return await cdp.evaluate("Boolean(window.__BOYPUNK_TEST__?.ready)");
    }, 15000);

    // Sai da demo para menu principal
    await cdp.evaluate("window.__BOYPUNK_TEST__.exitDemo()");
    await delay(300);

    // Seleciona BoyPunk e inicia Distrito Neon
    await cdp.evaluate("window.__BOYPUNK_TEST__.selectCharacter('boypunk')");
    await delay(200);
    await cdp.evaluate("window.__BOYPUNK_TEST__.startLevel('district-neon')");
    await delay(300);

    // Capture Canvas Native Bounds
    const canvasBounds = await cdp.evaluate(`
      const c = document.getElementById("game");
      const r = c.getBoundingClientRect();
      ({ x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height), scale: 1 });
    `);

    // Screenshot 1: Baseline Distrito Neon - BoyPunk & HUD & Altar
    await cdp.captureScreenshot(path.join(outDir, "01-baseline-distrito-neon-boypunk.png"), canvasBounds);
    console.log("Salvo: 01-baseline-distrito-neon-boypunk.png");

    // Screenshot 2: Altar Crop (0 deposited)
    const scaleFactor = canvasBounds.width / 480;
    const altarCrop = {
      x: canvasBounds.x + 190 * scaleFactor,
      y: canvasBounds.y + 175 * scaleFactor,
      width: 70 * scaleFactor,
      height: 75 * scaleFactor,
      scale: 1
    };
    await cdp.captureScreenshot(path.join(outDir, "02-baseline-altar-distrito-neon-empty.png"), altarCrop);
    console.log("Salvo: 02-baseline-altar-distrito-neon-empty.png");

    // Simula 15 almas depositadas no altar
    await cdp.evaluate(`(() => {
      const model = window.__BOYPUNK_TEST__.model;
      model.altar.deposited = 15;
    })()`);
    await delay(100);
    await cdp.captureScreenshot(path.join(outDir, "03-baseline-altar-distrito-neon-full.png"), altarCrop);
    console.log("Salvo: 03-baseline-altar-distrito-neon-full.png");

    // Screenshot 4: Baseline HUD Crop (top 48px)
    const hudCrop = {
      x: canvasBounds.x,
      y: canvasBounds.y,
      width: canvasBounds.width,
      height: 48 * scaleFactor,
      scale: 1
    };
    await cdp.captureScreenshot(path.join(outDir, "04-baseline-hud-distrito-neon.png"), hudCrop);
    console.log("Salvo: 04-baseline-hud-distrito-neon.png");

    // Screenshot 5: Nilo no Distrito Neon com HUD próprio
    await cdp.evaluate(`(() => {
      const test = window.__BOYPUNK_TEST__;
      test.model.characterId = "support";
      test.model.character = { id: "support", nameKey: "character.support.name", spritePrefix: "nilo", fallbackSpritePrefix: "player", maxLife: 4 };
      test.model.ability = { id: "nanorepair", nameKey: "ability.nanorepair.name", ready: true, rechargeRemaining: 0, rechargeDuration: 20 };
    })()`);
    await delay(100);
    await cdp.captureScreenshot(path.join(outDir, "05-baseline-distrito-neon-nilo.png"), canvasBounds);
    console.log("Salvo: 05-baseline-distrito-neon-nilo.png");

    // 2. Carregar Coop Preview
    await cdp.send("Page.navigate", { url: "http://127.0.0.1:47831/?coop-preview=1" });
    await waitFor(async () => {
      return await cdp.evaluate("Boolean(window.__BOYPUNK_COOP__ || window.app?.coopSession)");
    }, 15000);

    await cdp.evaluate(`(() => {
      if (window.app?.coopSession) window.app.coopSession.startSession();
      else if (window.__BOYPUNK_COOP__) window.__BOYPUNK_COOP__.startSession();
    })()`);
    await delay(400);

    const coopCanvasBounds = await cdp.evaluate(`
      const c = document.getElementById("game");
      const r = c.getBoundingClientRect();
      ({ x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height), scale: 1 });
    `);
    await cdp.captureScreenshot(path.join(outDir, "06-baseline-coop-preview.png"), coopCanvasBounds);
    console.log("Salvo: 06-baseline-coop-preview.png");

    cdp.close();
    console.log("Linha de base gravada com sucesso!");
  } finally {
    chrome.kill("SIGTERM");
  }
}

main().catch((err) => {
  console.error("Erro na auditoria de baseline:", err);
  process.exit(1);
});
