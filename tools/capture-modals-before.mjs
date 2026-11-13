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
const profile = await mkdtemp("/tmp/boypunk-modals-before-");

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
  await client.evaluate(`window.__BOYPUNK_TEST__.setDebug(false);`);

  // Inject a stylesheet that restores the "before" look of modal panels
  await client.evaluate(`(() => {
    const style = document.createElement("style");
    style.id = "before-styles";
    style.textContent = \`
      .pause-panel {
        width: min(84%, 430px) !important;
        padding: 16px 20px !important;
        outline: none !important;
        box-shadow: 5px 5px 0 var(--ink) !important;
        background: var(--panel) !important;
      }
      .pause-panel .eyebrow {
        color: var(--cyan) !important;
      }
      .pause-panel .modal-actions {
        display: flex !important;
        flex-direction: column !important;
        width: 100% !important;
        gap: 6px !important;
      }
      .pause-panel .modal-actions button {
        min-height: 34px !important;
      }
      .victory-panel {
        width: min(84%, 430px) !important;
        padding: 16px 20px !important;
        outline: none !important;
        overflow-y: scroll !important;
        box-shadow: 6px 6px 0 var(--ink), 0 0 28px rgba(56, 239, 125, 0.18) !important;
        background: var(--panel) !important;
      }
      .victory-panel .modal-actions {
        display: flex !important;
        flex-direction: column !important;
        gap: 6px !important;
      }
      .victory-panel .modal-actions button {
        min-height: 34px !important;
      }
      .victory-panel .run-stats {
        margin: 10px 0 !important;
      }
      .victory-panel .next-level-card {
        margin: 10px 0 !important;
      }
      .bonus-result-panel {
        width: min(84%, 430px) !important;
        padding: 16px 20px !important;
        outline: none !important;
        overflow-y: scroll !important;
        box-shadow: 6px 6px 0 var(--ink), 0 0 28px rgba(55, 230, 238, 0.18) !important;
        background: var(--panel) !important;
      }
      .bonus-result-panel .modal-actions {
        display: flex !important;
        flex-direction: column !important;
        gap: 6px !important;
      }
      .bonus-result-panel .modal-actions button {
        min-height: 34px !important;
      }
      .bonus-result-panel .run-stats {
        margin: 10px 0 !important;
      }
    \`;
    document.head.appendChild(style);
  })()`);

  // --- S6: PAUSE BEFORE ---
  console.log("Capturing S6-before...");
  await client.evaluate(`(() => {
    window.__BOYPUNK_TEST__.start();
  })()`);
  await delay(200);
  await client.evaluate(`(() => {
    window.__BOYPUNK_TEST__.pause();
  })()`);
  await delay(400);
  await client.captureCanvas(path.join(outDir, "S6-before.png"));
  console.log("Saved S6-before.png");

  // Return to menu
  await client.evaluate(`document.querySelector('#screen-paused [data-ui="menu"]').click();`);
  await delay(300);

  // --- S7: VICTORY BEFORE ---
  console.log("Capturing S7-before...");
  await client.evaluate(`(() => {
    window.__BOYPUNK_TEST__.start();
  })()`);
  await delay(200);
  await client.evaluate(`(() => {
    const m = window.__BOYPUNK_TEST__.model;
    m.altar.deposited = 15;
    m.beginVictory();
    m.victoryPresentationRemaining = 0;
    // in before, restart also had primary styling
    document.querySelector("#victory-restart")?.classList.add("primary");
  })()`);
  await delay(500);
  await client.captureCanvas(path.join(outDir, "S7-before.png"));
  console.log("Saved S7-before.png");

  // Return to menu
  await client.evaluate(`document.querySelector('#screen-victory [data-ui="menu"]').click();`);
  await delay(300);

  // --- S9: BONUS COMPLETE BEFORE ---
  console.log("Capturing S9-before...");
  await client.evaluate(`(() => {
    const m = window.__BOYPUNK_TEST__.model;
    m.startBonusPreview("distrito-neon");
    m.bonusCollected = 28;
    m.finishBonus("complete");
  })()`);
  await delay(500);
  await client.captureCanvas(path.join(outDir, "S9-before.png"));
  console.log("Saved S9-before.png");

  client.close();
  console.log("Captured accurate before screenshots for S6, S7, S9!");
} finally {
  chrome.kill("SIGKILL");
}
