import { spawn } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const outDir = path.join(root, "evidencias", "screens");
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
  async captureCanvas(outputPath) {
    const dataUrl = await this.evaluate(`(() => {
      const frame = document.querySelector(".game-frame");
      const rect = frame.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    })()`);
    const res = await this.send("Page.captureScreenshot", {
      format: "png",
      clip: { x: dataUrl.x, y: dataUrl.y, width: dataUrl.width, height: dataUrl.height, scale: 1 }
    });
    const buffer = Buffer.from(res.data, "base64");
    await writeFile(outputPath, buffer);
  }
  close() {
    this.socket.close();
  }
}

const serverUrl = "http://127.0.0.1:47831/";
const profile = await mkdtemp("/tmp/boypunk-screens-after-");

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
  const activePort = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timeout waiting for chrome stderr")), 10000);
    chrome.stderr.on("data", (chunk) => {
      const match = chunk.toString().match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)/);
      if (match) {
        clearTimeout(timeout);
        resolve(Number.parseInt(match[1], 10));
      }
    });
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

  // Turn off debug overlays
  await client.evaluate(`window.__BOYPUNK_TEST__.setDebug(false);`);

  // --- S6: PAUSE (pt-BR) ---
  console.log("Capturing S6-after (Pause pt-BR)...");
  await client.evaluate(`(() => {
    document.querySelector('[data-ui="play"]').click();
  })()`);
  await delay(300);
  await client.evaluate(`(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  })()`);
  await delay(400);
  await client.captureCanvas(path.join(outDir, "S6-after.png"));
  console.log("Saved S6-after.png");

  // Return to menu
  await client.evaluate(`document.querySelector('#screen-paused [data-ui="menu"]').click();`);
  await delay(300);

  // --- S7: VICTORY (pt-BR) ---
  console.log("Capturing S7-after (Victory pt-BR)...");
  await client.evaluate(`(() => {
    window.__BOYPUNK_TEST__.victoryRun({ activeSeconds: 42.5 });
  })()`);
  await delay(500);
  await client.captureCanvas(path.join(outDir, "S7-after.png"));
  console.log("Saved S7-after.png");

  // Return to menu
  await client.evaluate(`document.querySelector('#screen-victory [data-ui="menu"]').click();`);
  await delay(300);

  // --- S8: DEFEAT (pt-BR) ---
  console.log("Capturing S8-after (Defeat pt-BR)...");
  await client.evaluate(`(() => {
    document.querySelector('[data-ui="play"]').click();
  })()`);
  await delay(300);
  await client.evaluate(`(() => {
    window.__BOYPUNK_TEST__.contactDefeat();
  })()`);
  await delay(500);
  await client.captureCanvas(path.join(outDir, "S8-after.png"));
  console.log("Saved S8-after.png");

  // Return to menu
  await client.evaluate(`document.querySelector('#screen-defeat [data-ui="menu"]').click();`);
  await delay(300);

  // --- S9: BONUS COMPLETE (pt-BR) ---
  console.log("Capturing S9-after (Bonus complete pt-BR)...");
  await client.evaluate(`(() => {
    window.__BOYPUNK_TEST__.model.startBonusArena({ preview: true });
    window.__BOYPUNK_TEST__.model.bonusCollected = 28;
    window.__BOYPUNK_TEST__.model.finishBonus("completed");
  })()`);
  await delay(600);
  await client.captureCanvas(path.join(outDir, "S9-after.png"));
  console.log("Saved S9-after.png");

  // Return to menu
  await client.evaluate(`document.querySelector('#screen-bonus-complete [data-ui="menu"]').click();`);
  await delay(300);

  // --- MISSION A EVIDENCE 1: Options showing language control ---
  console.log("Capturing i18n-options...");
  await client.evaluate(`document.querySelector('#screen-menu [data-ui="options"]').click();`);
  await delay(400);
  await client.captureCanvas(path.join(outDir, "i18n-options.png"));
  console.log("Saved i18n-options.png");

  // --- Switch to English ---
  console.log("Switching to English locale...");
  await client.evaluate(`(() => {
    const sel = document.querySelector("#language-select");
    sel.value = "en";
    sel.dispatchEvent(new Event("change"));
  })()`);
  await delay(300);

  // --- MISSION A EVIDENCE 2: Menu in English ---
  console.log("Capturing i18n-menu-en...");
  await client.evaluate(`document.querySelector('#screen-options [data-ui="back"]').click();`);
  await delay(400);
  await client.captureCanvas(path.join(outDir, "i18n-menu-en.png"));
  console.log("Saved i18n-menu-en.png");

  // --- MISSION A EVIDENCE 3: Pause in English ---
  console.log("Capturing i18n-pause-en...");
  await client.evaluate(`(() => {
    document.querySelector('#screen-menu [data-ui="play"]').click();
  })()`);
  await delay(300);
  await client.evaluate(`(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  })()`);
  await delay(400);
  await client.captureCanvas(path.join(outDir, "i18n-pause-en.png"));
  console.log("Saved i18n-pause-en.png");

  // --- MISSION A BONUS EVIDENCE: Victory in English ---
  console.log("Capturing i18n-victory-en...");
  await client.evaluate(`document.querySelector('#screen-paused [data-ui="menu"]').click();`);
  await delay(300);
  await client.evaluate(`(() => {
    window.__BOYPUNK_TEST__.victoryRun({ activeSeconds: 42.5 });
  })()`);
  await delay(500);
  await client.captureCanvas(path.join(outDir, "i18n-victory-en.png"));
  console.log("Saved i18n-victory-en.png");

  // Reset locale back to pt-BR
  await client.evaluate(`(() => {
    window.__BOYPUNK_TEST__.i18n.setLocale("pt-BR");
  })()`);
  await delay(200);

  client.close();
  console.log("All after and i18n screenshots captured successfully!");
} finally {
  chrome.kill("SIGKILL");
}
