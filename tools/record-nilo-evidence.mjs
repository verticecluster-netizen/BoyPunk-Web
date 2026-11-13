import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const outDir = path.join(root, "evidencias", "art", "nilo");
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
  console.log("=== BoyPunk-Web: Gravação de Evidências Runtime de Nilo ===");
  const chromePath = "/usr/bin/google-chrome";
  const userDataDir = await mkdtemp("/tmp/boypunk-chrome-nilo-");
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

  const baseUrl = "http://127.0.0.1:47831/?test=1";
  console.log(`Navegando para ${baseUrl}...`);
  await cdp.send("Page.navigate", { url: baseUrl });

  await waitFor(async () => {
    return await cdp.evaluate("Boolean(window.__BOYPUNK_TEST__?.ready)");
  }, 15000);

  // Sai da demo para abrir o Menu Principal
  await cdp.evaluate("window.__BOYPUNK_TEST__.exitDemo()");
  await delay(300);

  // Cenário 1: Menu com Nilo selecionado
  await cdp.evaluate("window.__BOYPUNK_TEST__.selectCharacter('support')");
  await delay(200);
  const p1 = path.join(outDir, "runtime-01-menu-select-nilo.png");
  await cdp.captureScreenshot(p1);
  console.log("Capturado:", p1);

  // Cenário 2: Nilo no Distrito Neon - Idle e HUD com "NILO"
  await cdp.evaluate("window.__BOYPUNK_TEST__.startLevel('district-neon')");
  await delay(300);
  const p2 = path.join(outDir, "runtime-02-district-nilo-idle.png");
  await cdp.captureScreenshot(p2);
  console.log("Capturado:", p2);

  // Cenário 3: Nilo locomovendo-se (passos reais articulados)
  await cdp.evaluate(`(() => {
    const model = window.__BOYPUNK_TEST__.model;
    model.enemies = [];
    model.nextSpawnAt = Infinity;
    model.update(1/60, { right: true });
    model.update(1/60, { right: true });
    model.update(1/60, { right: true });
  })()`);
  await delay(100);
  const p3 = path.join(outDir, "runtime-03-district-nilo-walk.png");
  await cdp.captureScreenshot(p3);
  console.log("Capturado:", p3);

  // Cenário 4: Nilo atacando com nanorepair blaster (muzzle flash alinhado)
  await cdp.evaluate(`(() => {
    const model = window.__BOYPUNK_TEST__.model;
    model.enemies = [];
    model.nextSpawnAt = Infinity;
    model.playerAttack();
  })()`);
  await delay(80);
  const p4 = path.join(outDir, "runtime-04-district-nilo-attack-discharge.png");
  await cdp.captureScreenshot(p4);
  console.log("Capturado:", p4);

  // Cenário 5: Ativação de Cura Própria (+1 VIDA e nanorepair VFX)
  await cdp.evaluate(`(() => {
    const model = window.__BOYPUNK_TEST__.model;
    model.enemies = [];
    model.nextSpawnAt = Infinity;
    model.ability.ready = true;
    model.ability.rechargeRemaining = 0;
    model.player.life = 2;
    model.tryActivateAbility();
  })()`);
  await delay(100);
  const p5 = path.join(outDir, "runtime-05-district-nilo-heal-activation.png");
  await cdp.captureScreenshot(p5);
  console.log("Capturado:", p5);

  // Cenário 6: Nilo virado para a esquerda (facing esquerdo compensado)
  await cdp.evaluate(`(() => {
    const model = window.__BOYPUNK_TEST__.model;
    model.player.facing = -1;
  })()`);
  await delay(100);
  const p6 = path.join(outDir, "runtime-06-district-nilo-facing-left.png");
  await cdp.captureScreenshot(p6);
  console.log("Capturado:", p6);

  // Cenário 7: Nilo aerotransportado no salto
  await cdp.evaluate(`(() => {
    const model = window.__BOYPUNK_TEST__.model;
    model.player.facing = 1;
    model.player.onGround = false;
    model.player.vy = -200;
  })()`);
  await delay(100);
  const p7 = path.join(outDir, "runtime-07-district-nilo-jump.png");
  await cdp.captureScreenshot(p7);
  console.log("Capturado:", p7);

  // Cenário 8: Nilo em queda livre
  await cdp.evaluate(`(() => {
    const model = window.__BOYPUNK_TEST__.model;
    model.player.vy = 200;
  })()`);
  await delay(100);
  const p8 = path.join(outDir, "runtime-08-district-nilo-fall.png");
  await cdp.captureScreenshot(p8);
  console.log("Capturado:", p8);

  // Cenário 9: Nilo ferido (hurt flash)
  await cdp.evaluate(`(() => {
    const model = window.__BOYPUNK_TEST__.model;
    model.player.onGround = true;
    model.player.vy = 0;
    model.player.hurtFlash = 0.2;
    model.player.invulnerable = 0.5;
  })()`);
  await delay(100);
  const p9 = path.join(outDir, "runtime-09-district-nilo-hurt.png");
  await cdp.captureScreenshot(p9);
  console.log("Capturado:", p9);

  // Cenário 10: Nilo derrotado (die state em repouso mecânico na linha de chão)
  await cdp.evaluate(`(() => {
    const model = window.__BOYPUNK_TEST__.model;
    model.player.hurtFlash = 0;
    model.player.invulnerable = 0;
    model.player.life = 0;
    model.player.animState = "die";
    model.player.animTime = 0.40; // último frame die.3
  })()`);
  await delay(100);
  const p10 = path.join(outDir, "runtime-10-district-nilo-defeat.png");
  await cdp.captureScreenshot(p10);
  console.log("Capturado:", p10);

  // Cenário 11: Nilo na Fábrica de Sucata (scrap-factory)
  await cdp.evaluate(`(() => {
    const model = window.__BOYPUNK_TEST__.model;
    model.startRun({ levelId: 'scrap-factory', characterId: 'support', demo: false });
  })()`);
  await delay(300);
  const p11 = path.join(outDir, "runtime-11-factory-nilo-gameplay.png");
  await cdp.captureScreenshot(p11);
  console.log("Capturado:", p11);

  cdp.close();
  chrome.kill();
  console.log("=== Todas as 11 evidências runtime de Nilo gravadas com sucesso! ===");
}

main().catch((err) => {
  console.error("Erro fatal na gravação:", err);
  process.exit(1);
});
