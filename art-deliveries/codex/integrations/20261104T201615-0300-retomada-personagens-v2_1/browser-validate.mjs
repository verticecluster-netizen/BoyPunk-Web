import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = "/home/flow/Projetos/BoyPunk-Web";
const integrationId = "20261104T201615-0300-retomada-personagens-v2_1";
const evidenceDir = path.join(root, "art-deliveries/codex/integrations", integrationId, "evidencias");
const pairsFile = path.join(root, "art-deliveries/codex/integrations/20261104T190547-0300-personagens-v2_1/PAIRS.tsv");
const baseUrl = "http://127.0.0.1:47831/";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitFor(fn, timeout = 15000) {
  const start = Date.now();
  let lastError;
  while (Date.now() - start < timeout) {
    try {
      const value = await fn();
      if (value) return value;
    } catch (error) { lastError = error; }
    await delay(100);
  }
  throw lastError || new Error("Timeout aguardando condição.");
}

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.id = 1;
    this.pending = new Map();
    this.events = [];
    this.socket.onmessage = (message) => {
      const packet = JSON.parse(message.data);
      if (packet.id) {
        const pending = this.pending.get(packet.id);
        if (!pending) return;
        this.pending.delete(packet.id);
        if (packet.error) pending.reject(new Error(packet.error.message));
        else pending.resolve(packet.result);
      } else {
        this.events.push(packet);
      }
    };
  }
  async open() {
    if (this.socket.readyState === WebSocket.OPEN) return;
    await new Promise((resolve, reject) => {
      this.socket.onopen = resolve;
      this.socket.onerror = () => reject(new Error("Falha ao abrir CDP."));
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
    const response = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (response.exceptionDetails) {
      throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text || "Exceção no navegador.");
    }
    return response.result.value;
  }
  async screenshot(destination, clip = null) {
    const result = await this.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
      ...(clip ? { clip: { ...clip, scale: 1 } } : {})
    });
    await writeFile(destination, Buffer.from(result.data, "base64"));
  }
  close() { this.socket.close(); }
}

const states = {
  idle: { frames: 4, speed: 5 },
  walk: { frames: 4, speed: 12 },
  jump: { frames: 1, speed: 1 },
  fall: { frames: 1, speed: 1 },
  attack1: { frames: 4, speed: 22 },
  hurt: { frames: 3, speed: 12 },
  die: { frames: 4, speed: 10 }
};

const pairRows = (await readFile(pairsFile, "utf8")).trim().split("\n").slice(1).map((line) => {
  const fields = line.split("\t");
  const destination = fields[2];
  return {
    source: fields[1],
    destination,
    sha256: fields[3],
    width: destination.includes("-illustrated/") ? 128 : destination.includes("portrait") ? 32 : 64,
    height: destination.includes("-illustrated/") ? 192 : destination.includes("portrait") ? 32 : 96
  };
});

const profile = await mkdtemp("/tmp/boypunk-v21-resume-browser-");
const chrome = spawn("/usr/bin/google-chrome", [
  "--headless=new",
  "--remote-debugging-port=0",
  `--user-data-dir=${profile}`,
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-background-networking",
  "--disable-background-timer-throttling",
  "--disable-renderer-backgrounding",
  "--disk-cache-size=1",
  "--window-size=1280,720",
  "about:blank"
], { stdio: ["ignore", "pipe", "pipe"] });

let chromeStderr = "";
chrome.stderr.on("data", (chunk) => { chromeStderr += chunk.toString(); });
let cdp;

try {
  const activePort = await waitFor(async () => {
    const text = await readFile(path.join(profile, "DevToolsActivePort"), "utf8");
    return Number.parseInt(text.split(/\r?\n/)[0], 10);
  });
  const target = await waitFor(async () => {
    const response = await fetch(`http://127.0.0.1:${activePort}/json/list`);
    const list = await response.json();
    return list.find((item) => item.type === "page" && item.webSocketDebuggerUrl);
  });
  cdp = new Cdp(target.webSocketDebuggerUrl);
  await cdp.open();
  await Promise.all([
    cdp.send("Page.enable"),
    cdp.send("Runtime.enable"),
    cdp.send("Log.enable"),
    cdp.send("Network.enable")
  ]);
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1280,
    height: 720,
    deviceScaleFactor: 1,
    mobile: false
  });

  async function navigate(search) {
    const url = `${baseUrl}${search}`;
    await cdp.send("Page.navigate", { url });
    await waitFor(() => cdp.evaluate(`location.href === ${JSON.stringify(url)} && Boolean(window.__BOYPUNK_TEST__?.ready)`), 20000);
    await cdp.evaluate("window.__BOYPUNK_TEST__.setDebug(false)");
    return cdp.evaluate(`(async () => ({
      href: location.href,
      version: document.querySelector("#game-version")?.textContent?.trim(),
      canvas: [document.querySelector("#game").width, document.querySelector("#game").height],
      renderScale: window.__BOYPUNK_TEST__.renderer.renderScale,
      failures: window.__BOYPUNK_TEST__.assetFailures,
      health: await fetch("/__boypunk_health", { cache: "no-store" }).then(r => r.json())
    }))()`);
  }

  const initial = await navigate(`?test=1&scale=1&resume=${integrationId}`);
  const assetValidation = await cdp.evaluate(`(async () => {
    const items = ${JSON.stringify(pairRows)};
    const hex = (buffer) => [...new Uint8Array(buffer)].map(v => v.toString(16).padStart(2, "0")).join("");
    const results = [];
    for (const item of items) {
      const response = await fetch("/" + item.destination + "?asset-validation=20261104T201615-0300-retomada-personagens-v2_1", { cache: "no-store" });
      const bytes = await response.arrayBuffer();
      const digest = hex(await crypto.subtle.digest("SHA-256", bytes));
      const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
      results.push({
        destination: item.destination,
        status: response.status,
        hash: digest,
        width: bitmap.width,
        height: bitmap.height,
        expectedHash: item.sha256,
        expectedWidth: item.width,
        expectedHeight: item.height
      });
      bitmap.close();
    }
    const loadedPaths = performance.getEntriesByType("resource").map(entry => new URL(entry.name).pathname.slice(1));
    return { results, loadedPaths };
  })()`);
  const assetProblems = assetValidation.results.filter((item) =>
    item.status !== 200 || item.hash !== item.expectedHash ||
    item.width !== item.expectedWidth || item.height !== item.expectedHeight
  );
  if (assetProblems.length) throw new Error(`Falha de conteúdo HTTP em ${assetProblems.length} assets.`);

  await cdp.evaluate("window.__BOYPUNK_TEST__.exitDemo()");
  await delay(100);
  await cdp.evaluate("window.__BOYPUNK_TEST__.selectCharacter('boypunk')");
  await cdp.screenshot(path.join(evidenceDir, "01-menu-selecao-boypunk.png"));
  await cdp.evaluate("window.__BOYPUNK_TEST__.selectCharacter('support')");
  await cdp.screenshot(path.join(evidenceDir, "02-menu-selecao-nilo.png"));

  async function canvasClip() {
    return cdp.evaluate(`(() => {
      const r = document.querySelector("#game").getBoundingClientRect();
      return { x: r.left, y: r.top, width: r.width, height: r.height };
    })()`);
  }

  const observed = [];
  async function observeCharacter(characterId, label, scale) {
    const prefix = characterId === "boypunk" ? "player" : "nilo";
    for (const [state, definition] of Object.entries(states)) {
      const result = await cdp.evaluate(`(() => {
        const api = window.__BOYPUNK_TEST__;
        const model = api.model;
        model.startRun({
          levelId: "district-neon",
          characterId: ${JSON.stringify(characterId)},
          demo: false,
          progressionEligible: false,
          bonusQualificationEligible: false
        });
        model.nextSpawnAt = Infinity;
        model.enemies = [];
        model.projectiles = [];
        model.powerUps = [];
        model.powerUpSpawnResolved = true;
        model.resetPowerUpState();
        model.notice = null;
        model.effects = [];
        const p = model.player;
        p.x = 100; p.y = 208; p.vx = 0; p.vy = 0; p.facing = 1;
        p.life = model.playerMaxLife; p.onGround = true; p.attackTimer = 0; p.hurtFlash = 0;
        const state = ${JSON.stringify(state)};
        if (state === "walk") {
          for (let i = 0; i < 24; i += 1) model.update(1 / 120, { right: true });
        } else if (state === "jump") {
          model.update(1 / 120, { jumpPressed: true, jumpHeld: true });
          for (let i = 0; i < 3; i += 1) model.update(1 / 120, { jumpHeld: true });
        } else if (state === "fall") {
          model.update(1 / 120, { jumpPressed: true, jumpHeld: true });
          let steps = 0;
          while (model.player.vy < 0 && steps < 240) {
            model.update(1 / 120, {});
            steps += 1;
          }
        } else if (state === "attack1") {
          model.update(1 / 120, { attackPressed: true });
        } else if (state === "hurt") {
          model.damagePlayer(1);
          model.player.animState = "hurt";
        } else if (state === "die") {
          model.damagePlayer(99);
          model.player.animState = "die";
        }
        api.renderer.animationSamples.length = 0;
        const frameSamples = [];
        const frames = ${definition.frames};
        const speed = ${definition.speed};
        for (let frame = 0; frame < frames; frame += 1) {
          p.animTime = (frame + 0.01) / speed;
          api.renderer.render(model, performance.now() / 1000);
          const sample = api.animations().filter(s => s.entityId === p.id).at(-1);
          frameSamples.push(sample);
        }
        const captureFrame = state === "attack1" ? 2 : state === "hurt" ? 1 : frames - 1;
        p.animTime = (captureFrame + 0.01) / speed;
        api.renderer.render(model, performance.now() / 1000);
        return {
          state,
          facing: p.facing,
          life: p.life,
          onGround: p.onGround,
          vx: p.vx,
          vy: p.vy,
          frameSamples,
          finalSample: api.animations().filter(s => s.entityId === p.id).at(-1)
        };
      })()`);
      const expectedNamespace = scale > 1 ? `${prefix}.illustrated.` : `${prefix}.`;
      const bad = result.frameSamples.filter((sample, frame) =>
        !sample || sample.state !== state || sample.frame !== frame ||
        !sample.assetKey.startsWith(expectedNamespace)
      );
      if (bad.length) throw new Error(`Seleção de frames inválida: ${label} scale ${scale} ${state}`);
      observed.push({ characterId, label, scale, ...result });
      await cdp.screenshot(
        path.join(evidenceDir, `${scale === 1 ? "classic" : "illustrated"}-${label}-${state}.png`),
        await canvasClip()
      );
    }

    const left = await cdp.evaluate(`(() => {
      const api = window.__BOYPUNK_TEST__, model = api.model;
      model.startRun({ levelId: "district-neon", characterId: ${JSON.stringify(characterId)}, demo: false,
        progressionEligible: false, bonusQualificationEligible: false });
      model.nextSpawnAt = Infinity; model.enemies = []; model.projectiles = [];
      model.powerUps = []; model.powerUpSpawnResolved = true; model.resetPowerUpState(); model.notice = null; model.effects = [];
      model.player.x = 100; model.player.y = 208; model.player.facing = -1;
      model.update(1 / 120, { attackPressed: true });
      model.player.animState = "attack1"; model.player.animTime = (2.01 / 22);
      api.renderer.animationSamples.length = 0;
      api.renderer.render(model, performance.now() / 1000);
      return api.animations().filter(s => s.entityId === model.player.id).at(-1);
    })()`);
    if (!left || left.facing !== -1 || left.state !== "attack1" || left.frame !== 2) {
      throw new Error(`Ataque à esquerda não observado: ${label} scale ${scale}`);
    }
    observed.push({ characterId, label, scale, leftAttack: left });
    await cdp.screenshot(
      path.join(evidenceDir, `${scale === 1 ? "classic" : "illustrated"}-${label}-attack1-left.png`),
      await canvasClip()
    );
  }

  await observeCharacter("boypunk", "boypunk", 1);
  await observeCharacter("support", "nilo", 1);

  const scale2 = await navigate(`?test=1&scale=2&resume=${integrationId}`);
  await cdp.evaluate("window.__BOYPUNK_TEST__.exitDemo()");
  await observeCharacter("boypunk", "boypunk", 2);
  await observeCharacter("support", "nilo", 2);

  const scenarioEvidence = [];
  for (const levelId of ["district-neon", "scrap-factory"]) {
    const info = await cdp.evaluate(`(() => {
      const api = window.__BOYPUNK_TEST__, model = api.model;
      model.startRun({ levelId: ${JSON.stringify(levelId)}, characterId: "support", demo: false,
        progressionEligible: false, bonusQualificationEligible: false });
      model.nextSpawnAt = Infinity; model.enemies = []; model.projectiles = [];
      model.powerUps = []; model.powerUpSpawnResolved = true; model.resetPowerUpState(); model.notice = null; model.effects = [];
      model.player.x = 100; model.player.y = 208; model.player.facing = 1;
      api.renderer.render(model, performance.now() / 1000);
      return { levelId: model.levelId, state: model.state, sample: api.animations().at(-1) };
    })()`);
    scenarioEvidence.push(info);
    await cdp.screenshot(path.join(evidenceDir, `cenario-${levelId}-nilo.png`), await canvasClip());
  }
  const bonusInfo = await cdp.evaluate(`(() => {
    const api = window.__BOYPUNK_TEST__, model = api.model;
    model.startRun({ levelId: "district-neon", characterId: "support", demo: false,
      progressionEligible: false, bonusQualificationEligible: false });
    const started = model.startBonusPreview("district-neon");
    api.renderer.render(model, performance.now() / 1000);
    return { started, levelId: model.levelId, state: model.state, characterId: model.characterId, sample: api.animations().at(-1) };
  })()`);
  scenarioEvidence.push(bonusInfo);
  await cdp.screenshot(path.join(evidenceDir, "cenario-camara-energia-nilo.png"), await canvasClip());

  const demoInfo = await cdp.evaluate(`(() => {
    const api = window.__BOYPUNK_TEST__;
    api.startDemo("resume-validation");
    api.stepDemo(1.2);
    api.renderer.render(api.model, performance.now() / 1000);
    return { demo: api.demo(), snapshot: api.snapshot(), samples: api.animations().slice(-20) };
  })()`);
  await cdp.screenshot(path.join(evidenceDir, "demo-boypunk.png"), await canvasClip());

  const coopPage = await navigate(`?coop-preview=1&test=1&scale=2&resume=${integrationId}`);
  const coopInfo = await cdp.evaluate(`(() => {
    const api = window.__BOYPUNK_TEST__, model = api.model;
    const started = model.startCoopPreview();
    model.nextSpawnAt = Infinity; model.enemies = []; model.projectiles = [];
    api.renderer.animationSamples.length = 0;
    api.renderer.render(model, performance.now() / 1000);
    return {
      started,
      state: model.state,
      players: model.players.map(p => ({ id: p.id, slot: p.slot, characterId: p.characterId, facing: p.facing })),
      samples: api.animations().slice()
    };
  })()`);
  await cdp.screenshot(path.join(evidenceDir, "coop-boypunk-nilo.png"), await canvasClip());

  await delay(200);
  const consoleErrors = cdp.events.filter((event) =>
    event.method === "Runtime.exceptionThrown" ||
    (event.method === "Log.entryAdded" && ["error", "warning"].includes(event.params?.entry?.level)) ||
    (event.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(event.params?.type))
  );
  const failedRequests = cdp.events.filter((event) => event.method === "Network.loadingFailed");
  const badResponses = cdp.events.filter((event) =>
    event.method === "Network.responseReceived" && event.params?.response?.status >= 400
  );

  const report = {
    integrationId,
    timestamp: new Date().toISOString(),
    initial,
    scale2,
    coopPage,
    assetHttpValidation: {
      checked: assetValidation.results.length,
      mismatches: assetProblems,
      loadedByInitialGameCount: pairRows.filter(item => assetValidation.loadedPaths.includes(item.destination)).length,
      results: assetValidation.results
    },
    observed,
    scenarioEvidence,
    demoInfo,
    coopInfo,
    consoleErrors,
    failedRequests,
    badResponses,
    portraitRuntimeNote: "Os PNGs de retrato foram servidos e decodificados, mas a UI corrente desenha os avatares do HUD em HTML/CSS; não há consumidor visual desses PNGs em src/."
  };
  await writeFile(path.join(evidenceDir, "BROWSER_VALIDATION.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    health: initial.health,
    assetsChecked: report.assetHttpValidation.checked,
    assetsLoadedByGame: report.assetHttpValidation.loadedByInitialGameCount,
    observedEntries: observed.length,
    observedFrameSamples: observed.reduce((sum, item) => sum + (item.frameSamples?.length || (item.leftAttack ? 1 : 0)), 0),
    scenarios: scenarioEvidence,
    demoState: demoInfo.snapshot?.state,
    coopPlayers: coopInfo.players,
    consoleErrors: consoleErrors.length,
    failedRequests: failedRequests.length,
    badResponses: badResponses.length
  }, null, 2));
} finally {
  try { cdp?.close(); } catch {}
  chrome.kill("SIGTERM");
  await delay(250);
  if (chrome.exitCode === null) chrome.kill("SIGKILL");
  await rm(profile, { recursive: true, force: true });
  if (chromeStderr && !chromeStderr.includes("DevTools listening")) {
    await writeFile(path.join(evidenceDir, "chrome-stderr.log"), chromeStderr);
  }
}

