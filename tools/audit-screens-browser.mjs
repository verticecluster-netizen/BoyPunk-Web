import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(check, timeout = 12000, interval = 100) {
  const start = Date.now();
  let lastError;
  while (Date.now() - start < timeout) {
    try {
      const value = await check();
      if (value) return value;
    } catch (e) {
      lastError = e;
    }
    await delay(interval);
  }
  throw lastError || new Error(`Timeout após ${timeout}ms`);
}

class CdpClient {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.nextId = 1;
    this.pending = new Map();
    this.events = [];
    this.consoleErrors = [];
    this.socket.onmessage = (message) => {
      const packet = JSON.parse(message.data);
      if (packet.id) {
        const pending = this.pending.get(packet.id);
        if (!pending) return;
        this.pending.delete(packet.id);
        if (packet.error) pending.reject(new Error(packet.error.message));
        else pending.resolve(packet.result);
      } else {
        if (packet.method === "Runtime.consoleAPICalled" && packet.params.type === "error") {
          this.consoleErrors.push(packet.params.args.map((a) => a.value || a.description).join(" "));
        }
        this.events.push(packet);
      }
    };
  }
  async open() {
    if (this.socket.readyState === WebSocket.OPEN) return;
    await new Promise((resolve, reject) => {
      this.socket.onopen = resolve;
      this.socket.onerror = () => reject(new Error("Falha ao conectar ao CDP."));
    });
  }
  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || "Exceção na página.");
    return result.result.value;
  }
  async captureScreenshot(outputPath) {
    const res = await this.send("Page.captureScreenshot", { format: "png" });
    const buffer = Buffer.from(res.data, "base64");
    await writeFile(outputPath, buffer);
  }
  close() {
    this.socket.close();
  }
}

async function key(client, type, keyName, code, windowsVirtualKeyCode) {
  await client.send("Input.dispatchKeyEvent", {
    type,
    key: keyName,
    code,
    windowsVirtualKeyCode,
    nativeVirtualKeyCode: windowsVirtualKeyCode
  });
}

const root = process.cwd();
const isAfter = process.argv.includes("--after");
const auditDir = isAfter ? path.join(root, "evidencias", "audit", "after") : path.join(root, "evidencias", "audit");
await mkdir(auditDir, { recursive: true });

// Start HTTP server on port 0
const serverProcess = spawn("node", ["tools/server.mjs", "--root", ".", "--port", "0"], {
  cwd: root,
  stdio: ["ignore", "pipe", "pipe"]
});

let serverUrl = "";
await new Promise((resolve, reject) => {
  serverProcess.stdout.on("data", (chunk) => {
    const text = chunk.toString();
    const match = text.match(/http:\/\/127\.0\.0\.1:(\d+)\//);
    if (match) {
      serverUrl = `http://127.0.0.1:${match[1]}/`;
      resolve();
    }
  });
  serverProcess.stderr.on("data", (chunk) => console.error("Server stderr:", chunk.toString()));
  serverProcess.on("exit", (code) => reject(new Error(`Server exited early with code ${code}`)));
});

console.log("Server iniciado em:", serverUrl);

// Launch Chrome Headless
const profile = await mkdtemp("/tmp/boypunk-audit-");
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

let client;
try {
  const activePort = await waitFor(async () => {
    const text = await readFile(path.join(profile, "DevToolsActivePort"), "utf8");
    return Number.parseInt(text.split(/\r?\n/)[0], 10);
  }, 12000);

  const targets = await waitFor(async () => {
    const response = await fetch(`http://127.0.0.1:${activePort}/json/list`);
    const list = await response.json();
    return list.find((target) => target.type === "page" && target.webSocketDebuggerUrl);
  });

  client = new CdpClient(targets.webSocketDebuggerUrl);
  await client.open();
  await Promise.all([
    client.send("Page.enable"),
    client.send("Runtime.enable")
  ]);

  await waitFor(() => client.evaluate("Boolean(window.__BOYPUNK_TEST__?.ready)"), 15000);
  console.log("BoyPunk! carregado. Executando auditoria interativa das telas S1 a S11...");

  // S11: Modo Demonstração (Attract Mode ativo no startup)
  await delay(400);
  await client.captureScreenshot(path.join(auditDir, "S11-demo.png"));
  console.log("Capturado S11: Modo Demonstração");

  // S2: Menu Principal (Saindo da demo com tecla Espaço)
  await key(client, "keyDown", " ", "Space", 32);
  await delay(100);
  await key(client, "keyUp", " ", "Space", 32);
  await waitFor(() => client.evaluate("!document.querySelector('#screen-menu').hidden"), 5000);
  await delay(200);
  await client.captureScreenshot(path.join(auditDir, "S2-menu.png"));
  console.log("Capturado S2: Menu Principal");

  // S1: Tela de Abertura / Inicialização
  await client.evaluate(`(() => {
    document.querySelector('#screen-menu').hidden = true;
    document.querySelector('#loading').hidden = false;
  })()`);
  await delay(150);
  await client.captureScreenshot(path.join(auditDir, "S1-title.png"));
  await client.evaluate(`(() => {
    document.querySelector('#loading').hidden = true;
    document.querySelector('#screen-menu').hidden = false;
  })()`);
  console.log("Capturado S1: Tela de Abertura");

  // S3: Nível 1 — Distrito Neon (Iniciando partida)
  await client.evaluate(`window.__BOYPUNK_TEST__.model.startRun({ levelId: "distrito-neon", demo: false })`);
  await delay(400);
  await client.captureScreenshot(path.join(auditDir, "S3-distrito-neon.png"));
  console.log("Capturado S3: Distrito Neon");

  // S10: HUD em jogo e Controles Touch
  await client.evaluate(`(() => {
    document.querySelector("#touch-controls").hidden = false;
    document.querySelector("#pause-touch").hidden = false;
    document.querySelector("#touch-controls").classList.add("is-playing");
    document.querySelector("#pause-touch").classList.add("is-playing");
  })()`);
  await delay(150);
  await client.captureScreenshot(path.join(auditDir, "S10-hud-touch.png"));
  console.log("Capturado S10: HUD e Controles Touch");

  // S6: Tela de Pausa
  await client.evaluate(`(() => {
    window.__BOYPUNK_TEST__.model.pause();
    document.querySelector("#screen-paused").hidden = false;
  })()`);
  await delay(200);
  await client.captureScreenshot(path.join(auditDir, "S6-pause.png"));
  console.log("Capturado S6: Pausa");

  // S4: Nível 2 — Fábrica de Sucata
  await client.evaluate(`(() => {
    document.querySelector("#screen-paused").hidden = true;
    document.querySelector("#touch-controls").hidden = true;
    document.querySelector("#pause-touch").hidden = true;
    window.__BOYPUNK_TEST__.model.startRun({ levelId: "scrap-factory", demo: false });
  })()`);
  await delay(400);
  await client.captureScreenshot(path.join(auditDir, "S4-fabrica-sucata.png"));
  console.log("Capturado S4: Fábrica de Sucata");

  // S5: Bônus — Câmara de Energia
  await client.evaluate(`(() => {
    window.__BOYPUNK_TEST__.model.startBonusPreview("distrito-neon");
  })()`);
  await delay(400);
  await client.captureScreenshot(path.join(auditDir, "S5-camara-energia.png"));
  console.log("Capturado S5: Câmara de Energia");

  // S7: Tela de Vitória
  await client.evaluate(`(() => {
    const m = window.__BOYPUNK_TEST__.model;
    m.state = "victory";
    m.completedRun = {
      levelId: "distrito-neon",
      elapsed: 84.5,
      deposited: 15,
      playerLife: 4,
      altarLife: 3,
      chaserDefeats: 8,
      shotsFired: 22
    };
    for (const [name, screen] of Object.entries({
      menu: document.querySelector("#screen-menu"),
      paused: document.querySelector("#screen-paused"),
      victory: document.querySelector("#screen-victory"),
      defeat: document.querySelector("#screen-defeat"),
      bonusComplete: document.querySelector("#screen-bonus-complete")
    })) {
      screen.hidden = name !== "victory";
    }
  })()`);
  await delay(250);
  await client.captureScreenshot(path.join(auditDir, "S7-victory.png"));
  console.log("Capturado S7: Vitória");

  // S8: Tela de Derrota / Game Over
  await client.evaluate(`(() => {
    const m = window.__BOYPUNK_TEST__.model;
    m.state = "defeat";
    m.defeatReason = "BoyPunk foi derrotado em combate.";
    for (const [name, screen] of Object.entries({
      menu: document.querySelector("#screen-menu"),
      paused: document.querySelector("#screen-paused"),
      victory: document.querySelector("#screen-victory"),
      defeat: document.querySelector("#screen-defeat"),
      bonusComplete: document.querySelector("#screen-bonus-complete")
    })) {
      screen.hidden = name !== "defeat";
    }
  })()`);
  await delay(250);
  await client.captureScreenshot(path.join(auditDir, "S8-defeat.png"));
  console.log("Capturado S8: Derrota");

  // S9: Resultado do Bônus
  await client.evaluate(`(() => {
    const m = window.__BOYPUNK_TEST__.model;
    m.state = "bonusComplete";
    m.bonusResult = {
      levelId: "energy-chamber",
      originLevelId: "distrito-neon",
      originLevelTitle: "Distrito Neon",
      collected: 30,
      score: 350,
      completedAll: true,
      reason: "complete"
    };
    for (const [name, screen] of Object.entries({
      menu: document.querySelector("#screen-menu"),
      paused: document.querySelector("#screen-paused"),
      victory: document.querySelector("#screen-victory"),
      defeat: document.querySelector("#screen-defeat"),
      bonusComplete: document.querySelector("#screen-bonus-complete")
    })) {
      screen.hidden = name !== "bonusComplete";
    }
  })()`);
  await delay(250);
  await client.captureScreenshot(path.join(auditDir, "S9-bonus-result.png"));
  console.log("Capturado S9: Resultado do Bônus");

  console.log("Auditoria visual de S1 a S11 concluída com sucesso! Screenshots salvos em evidencias/audit/");

} finally {
  client?.close();
  chrome.kill("SIGTERM");
  serverProcess.kill("SIGTERM");
  await delay(200);
  await rm(profile, { recursive: true, force: true });
}
