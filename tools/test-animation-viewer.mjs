#!/usr/bin/env node
import { execFile as execFileCallback, spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFile = promisify(execFileCallback);
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function findChromeBinary() {
  const candidates = [
    process.env.CHROME_BIN,
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser"
  ].filter(Boolean);
  for (const bin of candidates) {
    try {
      await execFile(bin, ["--version"]);
      return bin;
    } catch {}
  }
  throw new Error("Nenhum binário do Chrome/Chromium encontrado.");
}

class Cdp {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.id = 1;
    this.pending = new Map();
    this.ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.id && this.pending.has(data.id)) {
        const { resolve, reject } = this.pending.get(data.id);
        this.pending.delete(data.id);
        if (data.error) reject(new Error(data.error.message));
        else resolve(data.result);
      }
    };
  }

  static async connect(url) {
    const client = new Cdp(url);
    await new Promise((resolve, reject) => {
      client.ws.onopen = resolve;
      client.ws.onerror = reject;
    });
    return client;
  }

  send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expr) {
    const res = await this.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
    return res.result?.value;
  }
}

async function main() {
  console.log("Validando visualizador de animações no Chrome headless...");
  const chromeBin = await findChromeBinary();
  const profileDir = await mkdtemp(path.join(os.tmpdir(), "boypunk-anim-view-"));

  // Start internal server
  const serverPath = path.resolve("tools/server.mjs");
  const server = spawn(process.execPath, [serverPath, "--root", ".", "--port", "0"], { stdio: ["ignore", "pipe", "pipe"] });

  let serverPort = null;
  server.stdout.on("data", (chunk) => {
    const text = chunk.toString();
    const m = text.match(/http:\/\/127\.0\.0\.1:(\d+)\//);
    if (m) serverPort = m[1];
  });

  for (let i = 0; i < 40; i++) {
    if (serverPort) break;
    await delay(100);
  }

  if (!serverPort) {
    server.kill();
    throw new Error("Servidor HTTP não retornou porta.");
  }

  const cdpPort = 9222 + Math.floor(Math.random() * 1000);
  const chrome = spawn(chromeBin, [
    "--headless=new",
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${profileDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    "about:blank"
  ]);

  try {
    let wsUrl = null;
    for (let i = 0; i < 50; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${cdpPort}/json`);
        const targets = await res.json();
        const page = targets.find((t) => t.type === "page");
        if (page?.webSocketDebuggerUrl) {
          wsUrl = page.webSocketDebuggerUrl;
          break;
        }
      } catch {}
      await delay(100);
    }

    if (!wsUrl) throw new Error("Chrome CDP não conectou.");
    const cdp = await Cdp.connect(wsUrl);
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");

    const targetUrl = `http://127.0.0.1:${serverPort}/tools/animation-viewer.html`;
    await cdp.send("Page.navigate", { url: targetUrl });
    await delay(1000);

    const title = await cdp.eval("document.title");
    console.log("Título da página:", title);
    if (!title.includes("BoyPunk! — Visualizador")) throw new Error("Título inesperado.");

    // Select Player defeat
    await cdp.eval(`
      document.getElementById('char-select').value = 'player';
      document.getElementById('char-select').dispatchEvent(new Event('change'));
      document.getElementById('anim-select').value = 'die';
      document.getElementById('anim-select').dispatchEvent(new Event('change'));
    `);
    await delay(500);

    const pFile = await cdp.eval("document.getElementById('p-file').textContent");
    const pDim = await cdp.eval("document.getElementById('p-dim').textContent");
    console.log(`Player die carregado: arquivo=${pFile}, dimensões=${pDim}`);
    if (pDim !== "64 × 96 px") throw new Error(`Dimensões do player die inválidas: ${pDim}`);

    // Capture screenshot of player defeat in viewer
    const ss1 = await cdp.send("Page.captureScreenshot", { format: "png" });
    const fs = await import("node:fs/promises");
    await fs.writeFile("evidencias/art/animation_viewer_player_preview.png", Buffer.from(ss1.data, "base64"));
    console.log("Screenshot salvo: evidencias/art/animation_viewer_player_preview.png");

    // Select Chaser defeat
    await cdp.eval(`
      document.getElementById('char-select').value = 'chaser';
      document.getElementById('char-select').dispatchEvent(new Event('change'));
      document.getElementById('anim-select').value = 'dead';
      document.getElementById('anim-select').dispatchEvent(new Event('change'));
    `);
    await delay(500);

    const cFile = await cdp.eval("document.getElementById('p-file').textContent");
    const cDim = await cdp.eval("document.getElementById('p-dim').textContent");
    console.log(`Chaser dead carregado: arquivo=${cFile}, dimensões=${cDim}`);
    if (cDim !== "16 × 32 px") throw new Error(`Dimensões do chaser dead inválidas: ${cDim}`);

    // Capture screenshot of chaser defeat in viewer
    const ss2 = await cdp.send("Page.captureScreenshot", { format: "png" });
    await fs.writeFile("evidencias/art/animation_viewer_chaser_preview.png", Buffer.from(ss2.data, "base64"));
    console.log("Screenshot salvo: evidencias/art/animation_viewer_chaser_preview.png");

    console.log("Teste do visualizador de animações: APROVADO COM SUCESSO!");
  } finally {
    chrome.kill("SIGKILL");
    server.kill("SIGKILL");
    await rm(profileDir, { recursive: true, force: true }).catch(() => {});
  }
}

main().catch((err) => {
  console.error("Erro no teste do visualizador:", err);
  process.exit(1);
});
