import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const outDir = path.join(root, "evidencias", "art", "character-motion-bat-polish");
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
  console.log("=== BoyPunk-Web: Gravação de Evidências de Movimento, Taco e Inimigos ===");

  // Iniciar servidor local dinâmico
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

  const profile = await mkdtemp("/tmp/boypunk-bat-polish-");
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

    // -------------------------------------------------------------------------
    // SESSÃO 1: CAMPANHA DISTRITO NEON - BOYPUNK COM TACO DE BEISEBOL
    // -------------------------------------------------------------------------
    const url2x = `${serverUrl}?test=1&scale=2`;
    console.log(`Carregando jogo: ${url2x}...`);
    await client.send("Page.navigate", { url: url2x });

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

    // Congela spawns
    await client.evaluate(`(() => {
      const model = window.__BOYPUNK_TEST__.model;
      model.enemies = [];
      model.projectiles = [];
      model.nextSpawnAt = Infinity;
      model.player.x = 240;
      model.player.y = 208;
      model.player.vx = 0;
      model.player.vy = 0;
      model.player.facing = 1;
      model.player.onGround = true;
      model.update(1 / 120, {});
    })()`);
    await delay(200);

    // Evidência 07: BoyPunk em pé com taco de beisebol descansando no ombro
    const p7 = path.join(outDir, "07-gameplay-boypunk-bat-standing-ready.png");
    await client.captureScreenshot(p7);
    console.log("Capturado 07:", p7);

    // Evidência 08: BoyPunk em locomoção (caminhada articulada com taco)
    await client.evaluate(`(() => {
      const model = window.__BOYPUNK_TEST__.model;
      model.player.vx = 100;
      model.player.animState = "walk";
      model.player.animTime = 0.12;
      model.update(1 / 120, {});
    })()`);
    await delay(150);
    const p8 = path.join(outDir, "08-gameplay-boypunk-bat-walk-stride.png");
    await client.captureScreenshot(p8);
    console.log("Capturado 08:", p8);

    // Evidência 09: BoyPunk executando ataque com taco estendido no ponto de impacto
    await client.evaluate(`(() => {
      const model = window.__BOYPUNK_TEST__.model;
      model.player.x = 240;
      model.player.y = 208;
      model.player.vx = 0;
      model.player.attackTimer = 0.10; // F2 strike point
      model.player.animState = "attack1";
      model.player.animTime = 0.09;
      model.update(1 / 120, {});
    })()`);
    await delay(150);
    const p9 = path.join(outDir, "09-gameplay-boypunk-bat-attack-strike.png");
    await client.captureScreenshot(p9);
    console.log("Capturado 09:", p9);

    // Evidência 10: BoyPunk em salto aéreo com taco
    await client.evaluate(`(() => {
      const model = window.__BOYPUNK_TEST__.model;
      model.player.x = 240;
      model.player.y = 170;
      model.player.vy = -80;
      model.player.onGround = false;
      model.player.attackTimer = 0;
      model.update(1 / 120, {});
    })()`);
    await delay(150);
    const p10 = path.join(outDir, "10-gameplay-boypunk-bat-jump-airborne.png");
    await client.captureScreenshot(p10);
    console.log("Capturado 10:", p10);

    // -------------------------------------------------------------------------
    // SESSÃO 2: NILO ANDROID (CERÂMICA E EMISSOR, SEM TACO)
    // -------------------------------------------------------------------------
    await client.evaluate(`(() => {
      window.__BOYPUNK_TEST__.selectCharacter('support');
      const model = window.__BOYPUNK_TEST__.model;
      model.startRun({ levelId: 'district-neon', characterId: 'support', demo: false });
      model.enemies = [];
      model.projectiles = [];
      model.nextSpawnAt = Infinity;
      model.player.x = 240;
      model.player.y = 208;
      model.player.vx = 80;
      model.player.facing = 1;
      model.player.onGround = true;
      model.update(1 / 120, {});
    })()`);
    await delay(200);
    const p11 = path.join(outDir, "11-gameplay-nilo-locomotion-and-aim.png");
    await client.captureScreenshot(p11);
    console.log("Capturado 11:", p11);

    // -------------------------------------------------------------------------
    // SESSÃO 3: INIMIGO CHASER DROID COM MANDÍBULA E PASSADA ARTICULADA
    // -------------------------------------------------------------------------
    await client.evaluate(`(() => {
      const model = window.__BOYPUNK_TEST__.model;
      model.player.x = 180;
      model.player.y = 208;
      model.player.vx = 0;
      model.enemies = [{
        id: "chaser-stalker-1",
        kind: "chaser",
        x: 230,
        y: 208,
        w: 16,
        h: 32,
        vx: -60,
        vy: 0,
        facing: -1,
        onGround: true,
        attackCooldown: 0,
        altarAttackCooldown: 0,
        animState: "walk",
        animTime: 0.25,
        removed: false
      }];
      model.update(1 / 120, {});
    })()`);
    await delay(150);
    const p12 = path.join(outDir, "12-gameplay-chaser-jaw-and-stride.png");
    await client.captureScreenshot(p12);
    console.log("Capturado 12:", p12);

    // -------------------------------------------------------------------------
    // SESSÃO 4: PATROL SHOOTER NA FÁBRICA DE SUCATA
    // -------------------------------------------------------------------------
    await client.evaluate(`(() => {
      const model = window.__BOYPUNK_TEST__.model;
      model.startRun({ levelId: 'scrap-factory', characterId: 'boypunk', demo: false });
      model.enemies = [{
        id: "patrol-shooter-demo",
        kind: "patrol-shooter",
        x: 230,
        y: 208,
        w: 16,
        h: 32,
        vx: 0,
        vy: 0,
        facing: -1,
        phase: "aim",
        phaseTime: 0.3,
        recoilTime: 0,
        animTime: 0.3,
        onGround: true,
        removed: false
      }];
      model.player.x = 120;
      model.player.y = 208;
      model.nextSpawnAt = Infinity;
      model.update(1 / 120, {});
    })()`);
    await delay(200);
    const p13 = path.join(outDir, "13-gameplay-patrol-shooter-aim-and-fire.png");
    await client.captureScreenshot(p13);
    console.log("Capturado 13:", p13);

    // -------------------------------------------------------------------------
    // SESSÃO 5: PRÉVIA COOPERATIVA ISOLADA (?coop-preview=1)
    // -------------------------------------------------------------------------
    const coopUrl = `${serverUrl}?coop-preview=1&scale=2`;
    console.log(`Navegando para prévia cooperativa: ${coopUrl}...`);
    await client.send("Page.navigate", { url: coopUrl });
    await delay(600);

    // Entra na partida coop a partir do lobby se necessário
    await client.evaluate(`(() => {
      const enterBtn = document.querySelector("#coop-start-btn, [data-action='coop-start']");
      if (enterBtn) enterBtn.click();
    })()`);
    await delay(300);

    const p14 = path.join(outDir, "14-gameplay-coop-preview-boypunk-and-nilo.png");
    await client.captureScreenshot(p14);
    console.log("Capturado 14:", p14);

    // -------------------------------------------------------------------------
    // SESSÃO 6: COMPOSIÇÃO PREPARADA DE ALINHAMENTO GEOMÉTRICO
    // -------------------------------------------------------------------------
    // Navega de volta ao jogo normal e captura close-up de 2.5x no ponto de impacto
    await client.send("Page.navigate", { url: `${serverUrl}?test=1&scale=2` });
    await waitFor(async () => {
      return await client.evaluate("Boolean(window.__BOYPUNK_TEST__?.ready)");
    }, 15000);
    await client.evaluate("window.__BOYPUNK_TEST__.exitDemo()");
    await delay(200);
    await client.evaluate("window.__BOYPUNK_TEST__.selectCharacter('boypunk')");
    await client.evaluate("window.__BOYPUNK_TEST__.startLevel('district-neon')");
    await delay(300);

    await client.evaluate(`(() => {
      const model = window.__BOYPUNK_TEST__.model;
      model.player.x = 240;
      model.player.y = 208;
      model.player.facing = 1;
      model.player.attackCooldown = 0;
      model.projectiles = [];
      model.playerAttack();
      // A emissão real é imediata no frame 0. Esta composição congela o
      // projétil na origem real e posiciona a arte no frame 2 apenas para
      // inspecionar coordenadas; não é evidência de timing contínuo.
      model.projectiles[0].vx = 0;
      model.player.animState = "attack1";
      model.player.animTime = 2 / 22;
      model.player.attackTimer = 0.16;
    })()`);
    await delay(150);

    // BoyPunk em (240, 208) lógica -> (480, 416) em 960x540.
    // Captura crop focando no jogador, taco, flash e projétil
    const p15 = path.join(outDir, "15-bat-contact-and-projectile-alignment.png");
    await client.captureScreenshot(p15, {
      x: 430,
      y: 360,
      width: 220,
      height: 140,
      scale: 1
    });
    console.log("Capturado 15:", p15);

    console.log("=== Todas as 9 evidências gravadas com sucesso! ===");
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
