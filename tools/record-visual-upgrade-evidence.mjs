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
  console.log("=== BoyPunk-Web: Gravação de Evidências de Qualidade Visual ===");
  const chromePath = "/usr/bin/google-chrome";
  const userDataDir = await mkdtemp("/tmp/boypunk-chrome-polish-");
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

    // Ensure collision debug is off for clean visual capture
    await cdp.evaluate("window.__BOYPUNK_TEST__.setDebug(false)");
    await delay(100);

    const canvasBounds = await cdp.evaluate(`
      const c = document.getElementById("game");
      const r = c.getBoundingClientRect();
      ({ x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height), scale: 1 });
    `);
    const scaleFactor = canvasBounds.width / 480;

    // Shot 1: Distrito Neon com BoyPunk, Altar Neon, Almas e HUD Polido
    await cdp.captureScreenshot(path.join(outDir, "01-distrito-neon-boypunk-gameplay.png"), canvasBounds);
    console.log("Salvo: 01-distrito-neon-boypunk-gameplay.png");

    // Altar Crop setup (altar at x=208, y=192, w=32, h=48)
    const altarCrop = {
      x: canvasBounds.x + 190 * scaleFactor,
      y: canvasBounds.y + 175 * scaleFactor,
      width: 70 * scaleFactor,
      height: 75 * scaleFactor,
      scale: 1
    };

    // Shot 2: Altar Distrito Neon - Vazio (0 almas depositadas)
    await cdp.captureScreenshot(path.join(outDir, "02-distrito-neon-altar-idle-empty.png"), altarCrop);
    console.log("Salvo: 02-distrito-neon-altar-idle-empty.png");

    // Shot 3: Altar Distrito Neon - Carregado (14 almas, sem disparar vitória)
    await cdp.evaluate(`(() => {
      const model = window.__BOYPUNK_TEST__.model;
      model.altar.deposited = 14;
    })()`);
    await delay(100);
    await cdp.captureScreenshot(path.join(outDir, "03-distrito-neon-altar-full-charged.png"), altarCrop);
    console.log("Salvo: 03-distrito-neon-altar-full-charged.png");

    // Shot 4: Altar Distrito Neon - Danificado (2 HP) com indicador de cautela
    await cdp.evaluate(`(() => {
      const model = window.__BOYPUNK_TEST__.model;
      model.altar.life = 2;
    })()`);
    await delay(100);
    await cdp.captureScreenshot(path.join(outDir, "04-distrito-neon-altar-damaged-2hp.png"), altarCrop);
    console.log("Salvo: 04-distrito-neon-altar-damaged-2hp.png");

    // Shot 5: Altar Distrito Neon - Crítico (1 HP) com aviso '!' e LED vermelho piscante
    await cdp.evaluate(`(() => {
      const model = window.__BOYPUNK_TEST__.model;
      model.altar.life = 1;
    })()`);
    await delay(100);
    await cdp.captureScreenshot(path.join(outDir, "05-distrito-neon-altar-critical-1hp.png"), altarCrop);
    console.log("Salvo: 05-distrito-neon-altar-critical-1hp.png");

    // Shot 6: Altar Distrito Neon - Pulso de Depósito com Coluna Energética
    await cdp.evaluate(`(() => {
      const model = window.__BOYPUNK_TEST__.model;
      model.altar.life = 4;
      model.altar.deposited = 6;
      model.effects = [{ kind: "deposit", x: model.altar.x + 16, y: model.altar.y + 12, text: "+3 NO ALTAR", life: 1.0, duration: 1.15 }];
    })()`);
    await delay(100);
    await cdp.captureScreenshot(path.join(outDir, "06-distrito-neon-altar-deposit-surge.png"), altarCrop);
    console.log("Salvo: 06-distrito-neon-altar-deposit-surge.png");

    // Shot 7: HUD Crop Polido (Top 48px) com barra segmentada e espaçamento limpo
    const hudCrop = {
      x: canvasBounds.x,
      y: canvasBounds.y,
      width: canvasBounds.width,
      height: 48 * scaleFactor,
      scale: 1
    };
    await cdp.evaluate(`(() => {
      const model = window.__BOYPUNK_TEST__.model;
      model.carriedSouls = 3;
      model.altar.deposited = 9;
      model.effects = [];
    })()`);
    await delay(100);
    await cdp.captureScreenshot(path.join(outDir, "07-hud-distrito-neon-polished.png"), hudCrop);
    console.log("Salvo: 07-hud-distrito-neon-polished.png");

    // Shot 8: Distrito Neon com Nilo (Suporte) e Habilidade Pronta
    await cdp.evaluate(`(() => {
      const test = window.__BOYPUNK_TEST__;
      test.model.characterId = "support";
      test.model.character = { id: "support", nameKey: "character.support.name", spritePrefix: "nilo", fallbackSpritePrefix: "player", maxLife: 4 };
      test.model.ability = { id: "nanorepair", nameKey: "ability.nanorepair.name", ready: true, rechargeRemaining: 0, rechargeDuration: 20 };
      test.model.altar.deposited = 4;
      test.model.effects = [];
    })()`);
    await delay(150);
    await cdp.captureScreenshot(path.join(outDir, "08-distrito-neon-nilo-gameplay.png"), canvasBounds);
    console.log("Salvo: 08-distrito-neon-nilo-gameplay.png");

    // Shot 9: Feedback de Combate - Acerto Cinético com "-1"
    await cdp.evaluate(`(() => {
      const model = window.__BOYPUNK_TEST__.model;
      model.effects = [
        { kind: "hit", x: 260, y: 180, text: "ACERTO", life: 0.35, duration: 0.42 }
      ];
    })()`);
    await delay(100);
    const hitCrop = {
      x: canvasBounds.x + 230 * scaleFactor,
      y: canvasBounds.y + 150 * scaleFactor,
      width: 60 * scaleFactor,
      height: 50 * scaleFactor,
      scale: 1
    };
    await cdp.captureScreenshot(path.join(outDir, "09-combat-hit-feedback.png"), hitCrop);
    console.log("Salvo: 09-combat-hit-feedback.png");

    // Shot 10: Feedback de Cura - Nanoreparo com "+1"
    await cdp.evaluate(`(() => {
      const model = window.__BOYPUNK_TEST__.model;
      model.effects = [
        { kind: "heal", x: model.player.x + 11, y: model.player.y + 16, text: "+1 VIDA", life: 0.6, duration: 0.75 }
      ];
    })()`);
    await delay(100);
    const playerX = await cdp.evaluate("window.__BOYPUNK_TEST__.model.player.x");
    const healCrop = {
      x: canvasBounds.x + Math.max(0, (playerX - 20) * scaleFactor),
      y: canvasBounds.y + 180 * scaleFactor,
      width: 65 * scaleFactor,
      height: 70 * scaleFactor,
      scale: 1
    };
    await cdp.captureScreenshot(path.join(outDir, "10-combat-heal-feedback.png"), healCrop);
    console.log("Salvo: 10-combat-heal-feedback.png");

    // 2. Fábrica de Sucata (Nível 2) com Altar Industrial
    // Desbloqueia a fábrica no armazenamento e recarrega
    await cdp.evaluate(`(() => {
      localStorage.setItem('boypunk-web-progression-v1', JSON.stringify({
        version: 1,
        completedLevels: ['district-neon'],
        unlockedLevels: ['district-neon', 'scrap-factory'],
        bonusBestScores: {}
      }));
    })()`);
    await cdp.send("Page.navigate", { url: "http://127.0.0.1:47831/?test=1" });
    await waitFor(async () => {
      return await cdp.evaluate("Boolean(window.__BOYPUNK_TEST__?.ready)");
    }, 15000);
    await cdp.evaluate("window.__BOYPUNK_TEST__.exitDemo()");
    await delay(200);
    await cdp.evaluate("window.__BOYPUNK_TEST__.selectCharacter('boypunk')");
    await delay(100);
    const startedScrap = await cdp.evaluate("window.__BOYPUNK_TEST__.startLevel('scrap-factory')");
    console.log("Iniciando Fábrica de Sucata:", startedScrap);
    await delay(300);
    await cdp.evaluate("window.__BOYPUNK_TEST__.setDebug(false)");
    await delay(100);
    await cdp.captureScreenshot(path.join(outDir, "11-fabrica-sucata-gameplay.png"), canvasBounds);
    console.log("Salvo: 11-fabrica-sucata-gameplay.png");

    // Fábrica Altar Crop (at x: 40, y: 192, w: 32, h: 48)
    const factoryAltarCrop = {
      x: canvasBounds.x + 20 * scaleFactor,
      y: canvasBounds.y + 175 * scaleFactor,
      width: 70 * scaleFactor,
      height: 75 * scaleFactor,
      scale: 1
    };
    await cdp.captureScreenshot(path.join(outDir, "12-fabrica-sucata-industrial-altar.png"), factoryAltarCrop);
    console.log("Salvo: 12-fabrica-sucata-industrial-altar.png");

    // 3. Câmara de Energia (Bônus) com Canhão e Almas de Alta Energia
    await cdp.send("Page.navigate", { url: "http://127.0.0.1:47831/?bonus-preview=1&test=1" });
    await waitFor(async () => {
      return await cdp.evaluate("Boolean(window.__BOYPUNK_TEST__?.ready)");
    }, 15000);
    await delay(300);
    await cdp.evaluate("window.__BOYPUNK_TEST__.setDebug(false)");
    await delay(100);
    await cdp.captureScreenshot(path.join(outDir, "13-camara-energia-bonus-gameplay.png"), canvasBounds);
    console.log("Salvo: 13-camara-energia-bonus-gameplay.png");

    // 4. Coop Preview Isolado
    await cdp.send("Page.navigate", { url: "http://127.0.0.1:47831/?coop-preview=1&test=1" });
    await waitFor(async () => {
      return await cdp.evaluate("Boolean(window.__BOYPUNK_TEST__?.ready)");
    }, 15000);
    await delay(200);
    await cdp.evaluate(`(() => {
      window.__BOYPUNK_TEST__.model.startCoopPreview();
    })()`);
    await delay(300);
    await cdp.evaluate("window.__BOYPUNK_TEST__.setDebug(false)");
    await delay(100);
    await cdp.captureScreenshot(path.join(outDir, "14-coop-preview-gameplay.png"), canvasBounds);
    console.log("Salvo: 14-coop-preview-gameplay.png");

    cdp.close();
    console.log("=== Todas as evidências visuais foram gravadas com sucesso! ===");
  } finally {
    chrome.kill("SIGTERM");
  }
}

main().catch((err) => {
  console.error("Erro na gravação de evidências:", err);
  process.exit(1);
});
