import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const outDir = path.join(root, "evidencias", "art", "characters");
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
  console.log("=== BoyPunk-Web: Gravação de Evidências em Navegador Real (Fase 3A) ===");
  const chromePath = "/usr/bin/google-chrome";
  const userDataDir = await mkdtemp("/tmp/boypunk-chrome-char-");
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

  console.log("Jogo carregado no Menu Principal!");

  // Cenário 1: Menu com BoyPunk selecionado
  await cdp.evaluate("window.__BOYPUNK_TEST__.selectCharacter('boypunk')");
  await delay(200);
  const p1 = path.join(outDir, "01-menu-character-selection-boypunk.png");
  await cdp.captureScreenshot(p1);
  console.log("Capturado:", p1);

  // Cenário 2: Menu com Suporte selecionado
  await cdp.evaluate("window.__BOYPUNK_TEST__.selectCharacter('support')");
  await delay(200);
  const p2 = path.join(outDir, "02-menu-character-selection-support.png");
  await cdp.captureScreenshot(p2);
  console.log("Capturado:", p2);

  // Cenário 3: Suporte no Distrito Neon - Gameplay inicial (habilidade descarregada 20s)
  await cdp.evaluate("window.__BOYPUNK_TEST__.startLevel('district-neon')");
  await delay(300);
  const p3 = path.join(outDir, "03-district-support-gameplay-uncharged.png");
  await cdp.captureScreenshot(p3);
  console.log("Capturado:", p3);

  // Cenário 4: Suporte aguarda recarga (20s) - Habilidade Pronta no HUD
  await cdp.evaluate(`(() => {
    const model = window.__BOYPUNK_TEST__.model;
    model.enemies = [];
    model.nextSpawnAt = Infinity;
    // Avança 20 segundos
    for (let i = 0; i < 20 * 120; i++) {
      model.update(1 / 120, {});
    }
  })()`);
  await delay(200);
  const p4 = path.join(outDir, "04-district-support-ability-ready.png");
  await cdp.captureScreenshot(p4);
  console.log("Capturado:", p4);

  // Cenário 5: Ativação de Cura Própria (+1 VIDA) com vida danificada
  await cdp.evaluate(`(() => {
    const model = window.__BOYPUNK_TEST__.model;
    model.enemies = [];
    model.nextSpawnAt = Infinity;
    model.player.life = 2; // Dano simulado
    model.tryActivateAbility(); // Ativa cura
  })()`);
  await delay(100);
  const p5 = path.join(outDir, "05-support-self-heal-activation.png");
  await cdp.captureScreenshot(p5);
  console.log("Capturado:", p5);

  // Cenário 6: Suporte com Rajada Dupla ativa + Medidor de Habilidade sem sobreposição
  await cdp.evaluate(`(() => {
    const model = window.__BOYPUNK_TEST__.model;
    model.enemies = [];
    model.nextSpawnAt = Infinity;
    model.activatePowerUp("double-burst");
  })()`);
  await delay(150);
  const p6 = path.join(outDir, "06-support-double-burst-active.png");
  await cdp.captureScreenshot(p6);
  console.log("Capturado:", p6);

  // Cenário 7: Suporte na Fábrica de Sucata (scrap-factory)
  await cdp.evaluate(`(() => {
    const model = window.__BOYPUNK_TEST__.model;
    model.startRun({ levelId: 'scrap-factory', characterId: 'support', demo: false });
  })()`);
  await delay(300);
  const p7 = path.join(outDir, "07-factory-support-gameplay.png");
  await cdp.captureScreenshot(p7);
  console.log("Capturado:", p7);

  // Cenário 8: BoyPunk baseline no Distrito Neon (sem medidor de habilidade)
  await cdp.evaluate(`(() => {
    const model = window.__BOYPUNK_TEST__.model;
    window.__BOYPUNK_TEST__.selectCharacter('boypunk');
    model.startRun({ levelId: 'district-neon', characterId: 'boypunk', demo: false });
  })()`);
  await delay(300);
  const p8 = path.join(outDir, "08-boypunk-baseline-gameplay.png");
  await cdp.captureScreenshot(p8);
  console.log("Capturado:", p8);

  // Cenário 9: Pausa congelando temporizador de recarga
  await cdp.evaluate(`(() => {
    const model = window.__BOYPUNK_TEST__.model;
    window.__BOYPUNK_TEST__.selectCharacter('support');
    model.startRun({ levelId: 'district-neon', characterId: 'support', demo: false });
    window.__BOYPUNK_TEST__.pause();
  })()`);
  await delay(200);
  const p9 = path.join(outDir, "09-pause-freeze-ability.png");
  await cdp.captureScreenshot(p9);
  console.log("Capturado:", p9);

  // Cenário 10: Viewport Mobile (640x360) com controles touch e botão ✚
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 640,
    height: 360,
    deviceScaleFactor: 1,
    mobile: true
  });
  await cdp.evaluate(`(() => {
    const model = window.__BOYPUNK_TEST__.model;
    model.resume();
    document.querySelector('#touch-controls').classList.add('is-playing');
    document.querySelector('#touch-controls').hidden = false;
    const ab = document.querySelector('[data-action="ability"]');
    if (ab) ab.hidden = false;
  })()`);
  await delay(150);
  const p10 = path.join(outDir, "10-mobile-viewport-touch-controls.png");
  await cdp.captureScreenshot(p10);
  console.log("Capturado:", p10);

  cdp.close();
  chrome.kill();
  console.log("=== Todas as 10 evidências de navegador foram gravadas com sucesso! ===");
}

main().catch((err) => {
  console.error("Erro fatal na gravação de evidências:", err);
  process.exit(1);
});
