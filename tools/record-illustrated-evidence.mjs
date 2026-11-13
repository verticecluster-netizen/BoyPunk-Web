import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const outDir = path.join(root, "evidencias", "art", "illustrated-neon-upgrade");
await mkdir(outDir, { recursive: true });

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(check, timeout = 15000, interval = 100) {
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
  console.log("=== BoyPunk-Web: Gravação de Evidências do Slice Ilustrado 2D ===");

  // 1. Iniciar servidor HTTP dinâmico
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

  console.log("Servidor ativo em:", serverUrl);

  // 2. Iniciar Google Chrome Headless
  const profile = await mkdtemp("/tmp/boypunk-illustrated-");
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
    "--window-size=960,540",
    "about:blank"
  ], { stdio: ["ignore", "pipe", "pipe"] });

  let client;
  try {
    const activePort = await waitFor(async () => {
      const text = await readFile(path.join(profile, "DevToolsActivePort"), "utf8");
      return Number.parseInt(text.split(/\r?\n/)[0], 10);
    }, 15000);

    const targets = await waitFor(async () => {
      const response = await fetch(`http://127.0.0.1:${activePort}/json/list`);
      const list = await response.json();
      return list.find((target) => target.type === "page" && target.webSocketDebuggerUrl);
    });

    client = new CdpClient(targets.webSocketDebuggerUrl);
    await client.open();

    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("DOM.enable");
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: 960,
      height: 540,
      deviceScaleFactor: 1,
      mobile: false
    });

    // -------------------------------------------------------------
    // SESSÃO 1: ESCALA 2X ILUSTRADA (?test=1&scale=2)
    // -------------------------------------------------------------
    const url2x = `${serverUrl}?test=1&scale=2`;
    console.log(`Carregando jogo em escala 2x: ${url2x}...`);
    await client.send("Page.navigate", { url: url2x });

    await waitFor(async () => {
      return await client.evaluate("Boolean(window.__BOYPUNK_TEST__?.ready)");
    }, 15000);

    // Sai da demo inicial para o menu
    await client.evaluate("window.__BOYPUNK_TEST__.exitDemo()");
    await delay(300);

    // Inicia Distrito Neon com BoyPunk
    await client.evaluate("window.__BOYPUNK_TEST__.selectCharacter('boypunk')");
    await client.evaluate("window.__BOYPUNK_TEST__.startLevel('district-neon')");
    await waitFor(async () => {
      return await client.evaluate("Boolean(window.__BOYPUNK_TEST__?.model?.player)");
    }, 10000);
    await delay(300);

    // Congela spawns automáticos para captura estável
    await client.evaluate(`(() => {
      const model = window.__BOYPUNK_TEST__.model;
      model.enemies = [];
      model.projectiles = [];
      model.nextSpawnAt = Infinity;
    })()`);
    await delay(200);

    // Captura 1: Visão Geral do Distrito Neon Ilustrado (960x540)
    const p1 = path.join(outDir, "01-distrito-neon-illustrated-overview.png");
    await client.captureScreenshot(p1);
    console.log("Capturado 01:", p1);

    // Captura 2: Ação de Gameplay (BoyPunk pulando/correndo na plataforma)
    await client.evaluate(`(() => {
      const model = window.__BOYPUNK_TEST__.model;
      model.player.x = 180;
      model.player.y = 170; // no ar sobre o altar
      model.player.vy = -60;
      model.player.vx = 80;
      model.player.facing = 1;
      model.player.onGround = false;
      model.update(1 / 120, {});
    })()`);
    await delay(150);
    const p2 = path.join(outDir, "02-distrito-neon-gameplay-action.png");
    await client.captureScreenshot(p2);
    console.log("Capturado 02:", p2);

    // Captura 3: Close-up do BoyPunk Ilustrado (128x192 nativo, renderizado a 2x)
    await client.evaluate(`(() => {
      const model = window.__BOYPUNK_TEST__.model;
      model.player.x = 240;
      model.player.y = 208;
      model.player.vx = 0;
      model.player.vy = 0;
      model.player.onGround = true;
      model.player.facing = 1;
      model.update(1 / 120, {});
    })()`);
    await delay(150);
    // BoyPunk em (240, 208) lógica -> (480, 416) na viewport 960x540.
    const p3 = path.join(outDir, "03-boypunk-illustrated-closeup.png");
    await client.captureScreenshot(p3, {
      x: 440,
      y: 360,
      width: 140,
      height: 150,
      scale: 1
    });
    console.log("Capturado 03:", p3);

    // Captura 4: Close-up do Nilo Ilustrado (troca de personagem para 'support')
    await client.evaluate(`(() => {
      window.__BOYPUNK_TEST__.selectCharacter('support');
      const model = window.__BOYPUNK_TEST__.model;
      model.startRun({ levelId: 'district-neon', characterId: 'support', demo: false });
      model.enemies = [];
      model.projectiles = [];
      model.nextSpawnAt = Infinity;
      model.player.x = 240;
      model.player.y = 208;
      model.player.vx = 0;
      model.player.vy = 0;
      model.player.onGround = true;
      model.player.facing = 1;
      model.update(1 / 120, {});
    })()`);
    await delay(200);
    const p4 = path.join(outDir, "04-nilo-illustrated-closeup.png");
    await client.captureScreenshot(p4, {
      x: 440,
      y: 360,
      width: 140,
      height: 150,
      scale: 1
    });
    console.log("Capturado 04:", p4);

    // Captura 5: Close-up do Altar Ilustrado no Distrito Neon
    // Altar em (240, 208) lógica -> (480, 416) em tela
    await client.evaluate(`(() => {
      const model = window.__BOYPUNK_TEST__.model;
      model.player.x = 120; // afasta o player do altar
      model.player.y = 208;
      model.altar.life = 3;
      model.altar.depositSurge = 1.0; // efeito de plasma ativo
      model.update(1 / 120, {});
    })()`);
    await delay(150);
    const p5 = path.join(outDir, "05-altar-illustrated-states.png");
    await client.captureScreenshot(p5, {
      x: 430,
      y: 350,
      width: 130,
      height: 150,
      scale: 1
    });
    console.log("Capturado 05:", p5);

    // Captura 6: Close-up do Chaser Droid Ilustrado
    await client.evaluate(`(() => {
      const model = window.__BOYPUNK_TEST__.model;
      model.enemies = [{
        id: "chaser-demo",
        kind: "chaser",
        x: 230,
        y: 208,
        w: 16,
        h: 32,
        vx: 0,
        vy: 0,
        facing: -1,
        onGround: true,
        attackCooldown: 0,
        altarAttackCooldown: 0,
        removed: false
      }];
      model.player.x = 140;
      model.update(1 / 120, {});
    })()`);
    await delay(150);
    const p6 = path.join(outDir, "06-chaser-illustrated-closeup.png");
    await client.captureScreenshot(p6, {
      x: 430,
      y: 370,
      width: 110,
      height: 120,
      scale: 1
    });
    console.log("Capturado 06:", p6);

    // Captura 7: Feedback de Combate e Partículas (projéteis de pulso e poeira suave)
    await client.evaluate(`(() => {
      const model = window.__BOYPUNK_TEST__.model;
      const renderer = window.__BOYPUNK_TEST__.renderer;
      model.enemies = [];
      model.player.x = 180;
      model.player.y = 208;
      model.player.facing = 1;
      // Adiciona projétil de pulso ilustrado
      model.projectiles = [{
        id: "pulse-demo-1",
        team: "player",
        x: 260,
        y: 216,
        w: 8,
        h: 8,
        vx: 300,
        vy: 0,
        life: 1.0,
        removed: false
      }];
      // Adiciona partículas suaves de aterrissagem no renderer
      if (renderer) {
        renderer.landingParticles = [
          { x: 178, y: 236, vx: -15, vy: -6, life: 0.22, duration: 0.22 },
          { x: 182, y: 237, vx: -8, vy: -10, life: 0.18, duration: 0.18 },
          { x: 190, y: 237, vx: 8, vy: -10, life: 0.18, duration: 0.18 },
          { x: 194, y: 236, vx: 15, vy: -6, life: 0.22, duration: 0.22 }
        ];
      }
    })()`);
    await delay(100);
    const p7 = path.join(outDir, "07-combat-feedback-and-particles.png");
    await client.captureScreenshot(p7);
    console.log("Capturado 07:", p7);

    // -------------------------------------------------------------
    // SESSÃO 2: ESCALA 1X LEGACY BASELINE (?test=1&scale=1)
    // -------------------------------------------------------------
    const url1x = `${serverUrl}?test=1&scale=1`;
    console.log(`Carregando jogo em escala 1x (legacy baseline): ${url1x}...`);
    await client.send("Page.navigate", { url: url1x });

    await waitFor(async () => {
      return await client.evaluate("Boolean(window.__BOYPUNK_TEST__?.ready)");
    }, 15000);

    await client.evaluate("window.__BOYPUNK_TEST__.exitDemo()");
    await delay(300);
    await client.evaluate("window.__BOYPUNK_TEST__.selectCharacter('boypunk')");
    await client.evaluate("window.__BOYPUNK_TEST__.startLevel('district-neon')");
    await waitFor(async () => {
      return await client.evaluate("Boolean(window.__BOYPUNK_TEST__?.model?.player)");
    }, 10000);
    await delay(300);

    await client.evaluate(`(() => {
      const model = window.__BOYPUNK_TEST__.model;
      model.enemies = [];
      model.projectiles = [];
      model.nextSpawnAt = Infinity;
      model.player.x = 240;
      model.player.y = 208;
      model.player.vx = 0;
      model.player.vy = 0;
      model.player.onGround = true;
      model.player.facing = 1;
      model.update(1 / 120, {});
    })()`);
    await delay(200);

    const p8 = path.join(outDir, "08-distrito-neon-legacy-baseline-1x.png");
    await client.captureScreenshot(p8);
    console.log("Capturado 08:", p8);

    console.log("=== Todas as 8 evidências capturadas com sucesso! ===");
  } finally {
    if (client) client.close();
    chrome.kill();
    serverProcess.kill();
    await rm(profile, { recursive: true, force: true }).catch(() => {});
  }
}

main().catch((err) => {
  console.error("Erro fatal na gravação de evidências:", err);
  process.exit(1);
});
