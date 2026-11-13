#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const buildPath = path.resolve(process.argv[2] ?? "BoyPunk-Studio-v0.4.0.html");
const label = process.argv[3] ?? "audit";
const outDir = path.resolve(process.argv[4] ?? "evidencias/ui/hud-menu-stabilization");
await mkdir(outDir, { recursive: true });

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(fn, timeout = 20000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    try {
      const value = await fn();
      if (value) return value;
    } catch {}
    await delay(100);
  }
  throw new Error("Timeout waiting for browser condition");
}

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.id = 1;
    this.pending = new Map();
    this.socket.onmessage = (message) => {
      const payload = JSON.parse(message.data);
      if (!payload.id || !this.pending.has(payload.id)) return;
      const { resolve, reject } = this.pending.get(payload.id);
      this.pending.delete(payload.id);
      if (payload.error) reject(new Error(payload.error.message));
      else resolve(payload.result);
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
    const result = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    }
    return result.result?.value;
  }

  async capture(outputPath) {
    const clip = await this.evaluate(`(() => {
      const rect = document.querySelector(".game-frame").getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    })()`);
    const screenshot = await this.send("Page.captureScreenshot", { format: "png", clip: { ...clip, scale: 1 } });
    await writeFile(outputPath, Buffer.from(screenshot.data, "base64"));
  }
}

const profile = await mkdtemp("/tmp/boypunk-hud-menu-audit-");
const fileUrl = `${pathToFileURL(buildPath).href}?test=1`;
const chrome = spawn("/usr/bin/google-chrome", [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--disable-dev-shm-usage",
  "--no-first-run",
  "--no-default-browser-check",
  "--allow-file-access-from-files",
  "--remote-allow-origins=*",
  "--remote-debugging-port=0",
  `--user-data-dir=${profile}`,
  "--window-size=1366,768",
  fileUrl
], { stdio: ["ignore", "ignore", "pipe"] });

const diagnostics = { label, buildPath, fileUrl, captures: [], checks: {} };

try {
  const activePort = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Chrome did not expose a DevTools endpoint")), 15000);
    let stderr = "";
    chrome.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      const match = stderr.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)/);
      if (!match) return;
      clearTimeout(timer);
      resolve(Number.parseInt(match[1], 10));
    });
    chrome.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Chrome exited before CDP was ready (code ${code}): ${stderr.trim()}`));
    });
  });

  const target = await waitFor(async () => {
    const response = await fetch(`http://127.0.0.1:${activePort}/json/list`);
    const targets = await response.json();
    return targets.find((item) => item.type === "page" && item.webSocketDebuggerUrl);
  });
  const client = new Cdp(target.webSocketDebuggerUrl);
  await client.open();
  await Promise.all([client.send("Page.enable"), client.send("Runtime.enable")]);
  await waitFor(() => client.evaluate("Boolean(window.__BOYPUNK_TEST__?.ready)"));

  const capture = async (name) => {
    const outputPath = path.join(outDir, `${label}-${name}.png`);
    await client.capture(outputPath);
    diagnostics.captures.push(outputPath);
  };

  await client.evaluate(`(() => {
    const api = window.__BOYPUNK_TEST__;
    api.selectCharacter("support");
    api.startLevel("scrap-factory");
    const model = api.model;
    model.nextSpawnAt = Infinity;
    model.enemies = [];
    model.projectiles = [];
    model.altar.deposited = 8;
    model.altar.phase = 3;
    model.bossActive = true;
    model.bossHealth = 0.72;
    model.activatePowerUp("double-burst");
    model.player.rapidFire = true;
    model.player.rapidFireRemaining = 6.4;
    model.player.shield = true;
    model.notice = { text: "ATENÇÃO: PRENSA EM MOVIMENTO", time: 10 };
  })()`);
  await delay(250);
  await capture("boss-hud-all-statuses");

  diagnostics.checks.bossModel = await client.evaluate(`(() => {
    const model = window.__BOYPUNK_TEST__.model;
    return {
      state: model.state,
      levelId: model.levelId,
      bossActive: model.bossActive,
      bossHealth: model.bossHealth,
      deposited: model.altar.deposited,
      activePowerUp: model.activePowerUp,
      rapidFire: model.player.rapidFire,
      rapidFireRemaining: model.player.rapidFireRemaining,
      shield: model.player.shield,
      ability: model.ability
    };
  })()`);

  await client.evaluate("window.__BOYPUNK_TEST__.pause()");
  await delay(200);
  await capture("pause");
  await client.evaluate(`document.querySelector('#screen-paused [data-ui="menu"]').click()`);
  await delay(150);
  await capture("menu-desktop");

  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true
  });
  await delay(200);
  await capture("menu-mobile-390x844");
  diagnostics.checks.mobile = await client.evaluate(`(() => {
    const panel = document.querySelector(".menu-panel");
    const rect = panel.getBoundingClientRect();
    return {
      viewport: { width: innerWidth, height: innerHeight },
      panel: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      scrollHeight: panel.scrollHeight,
      clientHeight: panel.clientHeight,
      bodyOverflow: getComputedStyle(document.body).overflow
    };
  })()`);
  await client.send("Emulation.clearDeviceMetricsOverride");

  diagnostics.checks.restarts = await client.evaluate(`(() => {
    const api = window.__BOYPUNK_TEST__;
    const cycles = [];
    for (let index = 0; index < 3; index += 1) {
      api.start();
      const firstRun = api.snapshot().runId;
      api.restart();
      const snapshot = api.snapshot();
      cycles.push({ firstRun, restartedRun: snapshot.runId, state: snapshot.state, life: snapshot.player.life });
    }
    return cycles;
  })()`);

  await client.evaluate(`window.__BOYPUNK_TEST__.victoryRun({ activeSeconds: 42.5 }); window.__BOYPUNK_TEST__.finishVictoryPresentation()`);
  await delay(250);
  await capture("victory");
  await client.evaluate(`document.querySelector('#screen-victory [data-ui="menu"]').click()`);
  await delay(150);
  await client.evaluate(`(() => {
    const api = window.__BOYPUNK_TEST__;
    api.start();
    api.contactDefeat();
    api.model.defeatPresentationRemaining = 0;
    api.model.update(1 / 120, {});
  })()`);
  await delay(250);
  await capture("defeat");
  await client.evaluate(`document.querySelector('#screen-defeat [data-ui="menu"]').click()`);
  await delay(150);
  await client.evaluate(`(() => {
    const model = window.__BOYPUNK_TEST__.model;
    model.startBonusArena({ preview: true });
    model.bonusCollected = 28;
    model.finishBonus("completed");
  })()`);
  await delay(250);
  await capture("bonus-result");

  diagnostics.checks.runtime = await client.evaluate(`({
    ready: window.__BOYPUNK_TEST__.ready,
    assetFailures: window.__BOYPUNK_TEST__.assetFailures,
    canvas: {
      width: document.querySelector("#game").width,
      height: document.querySelector("#game").height
    }
  })`);
  client.socket.close();
} finally {
  chrome.kill("SIGKILL");
  await writeFile(path.join(outDir, `${label}-audit.json`), `${JSON.stringify(diagnostics, null, 2)}\n`);
}

process.stdout.write(`${JSON.stringify(diagnostics, null, 2)}\n`);
