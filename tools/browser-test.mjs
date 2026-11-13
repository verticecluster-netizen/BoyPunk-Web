import { execFile as execFileCallback, spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function formatDuration(seconds) {
  const tenths = Math.floor(Math.max(0, seconds) * 10 + 0.000001);
  const minutes = Math.floor(tenths / 600);
  const remaining = tenths % 600;
  return `${String(minutes).padStart(2, "0")}:${String(Math.floor(remaining / 10)).padStart(2, "0")}.${remaining % 10}`;
}

async function waitFor(check, timeout = 10000, interval = 100) {
  const start = Date.now();
  let lastError;
  while (Date.now() - start < timeout) {
    try {
      const value = await check();
      if (value) return value;
    } catch (error) { lastError = error; }
    await delay(interval);
  }
  throw lastError || new Error(`Tempo esgotado após ${timeout} ms.`);
}

class CdpClient {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.nextId = 1;
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
      this.socket.onerror = () => reject(new Error("Falha ao conectar ao Chrome DevTools Protocol."));
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

  close() { this.socket.close(); }
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

async function clickSelector(client, selector) {
  const point = await client.evaluate(`(() => {
    const rect = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();
    const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
    return { x, y, target: document.elementFromPoint(x, y)?.outerHTML?.slice(0, 160) };
  })()`);
  await client.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: point.x, y: point.y });
  await delay(35);
  await client.send("Input.dispatchMouseEvent", { type: "mousePressed", x: point.x, y: point.y, button: "left", clickCount: 1 });
  await delay(35);
  await client.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x, y: point.y, button: "left", clickCount: 1 });
  await delay(80);
  return point;
}

async function touchSelector(client, selector) {
  const point = await client.evaluate(`(() => {
    const rect = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
  const touch = { x: point.x, y: point.y, radiusX: 2, radiusY: 2, force: 1, id: 1 };
  await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [touch] });
  await delay(45);
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await delay(80);
  return point;
}

async function capture(client, destination) {
  const screenshot = await client.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(destination, Buffer.from(screenshot.data, "base64"));
}

export async function runBrowserTest({ url, root, evidenceDir = path.join(root, "evidencias"), testLauncher = true, requireOffline = false }) {
  await mkdir(evidenceDir, { recursive: true });
  const profile = await mkdtemp("/tmp/boypunk-chrome-");
  const browserUrl = new URL(url);
  browserUrl.searchParams.set("test", "1");
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
    browserUrl.href
  ], { stdio: ["ignore", "pipe", "pipe"] });

  let chromeErrors = "";
  chrome.stderr.on("data", (chunk) => { chromeErrors += chunk.toString(); });
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
      client.send("Runtime.enable"),
      client.send("Log.enable"),
      client.send("Network.enable")
    ]);
    await client.send("Page.reload", { ignoreCache: true });

    await waitFor(() => client.evaluate("Boolean(window.__BOYPUNK_TEST__?.ready)"), 15000);
    const initial = await client.evaluate(`({
      title: document.title,
      version: document.querySelector('#game-version').textContent.trim(),
      loadingHidden: document.querySelector('#loading').hidden,
      menuVisible: !document.querySelector('#screen-menu').hidden,
      demoVisible: !document.querySelector('#demo-overlay').hidden,
      demoText: document.querySelector('#demo-overlay').textContent.replace(/\\s+/g, ' ').trim(),
      canvas: [document.querySelector('#game').width, document.querySelector('#game').height],
      assetFailures: window.__BOYPUNK_TEST__.assetFailures,
      objective: window.__BOYPUNK_TEST__.objective(),
      audio: window.__BOYPUNK_TEST__.audio(),
      demo: window.__BOYPUNK_TEST__.demo(),
      healthLabels: [
        Number(document.querySelector('[data-player-max-life]').textContent),
        Number(document.querySelector('[data-altar-max-life]').textContent)
      ],
      snapshot: window.__BOYPUNK_TEST__.snapshot()
    })`);
    const demoSequence = [{ timestamp: new Date().toISOString(), snapshot: initial.snapshot, demo: initial.demo }];
    await capture(client, path.join(evidenceDir, "01-demo-startup.png"));
    for (const [index, seconds] of [2, 3, 4, 5].entries()) {
      const sample = await client.evaluate(`window.__BOYPUNK_TEST__.stepDemo(${seconds})`);
      await delay(80);
      demoSequence.push({ timestamp: new Date().toISOString(), advancedSeconds: seconds, ...sample });
      await capture(client, path.join(evidenceDir, `01-demo-sequence-${index + 1}.png`));
    }
    const demoStorageBeforeExit = await client.evaluate(`Object.fromEntries(Object.keys(localStorage).map((key) => [key, localStorage.getItem(key)]))`);

    await key(client, "keyDown", " ", "Space", 32);
    await delay(120);
    const heldExit = await client.evaluate(`({ snapshot: window.__BOYPUNK_TEST__.snapshot(), input: window.__BOYPUNK_TEST__.input(), menuVisible: !document.querySelector('#screen-menu').hidden })`);
    await key(client, "keyUp", " ", "Space", 32);
    const menuAfterStartupExit = await waitFor(async () => {
      const value = await client.evaluate(`(() => {
        const panel = document.querySelector('#screen-menu .panel');
        return { snapshot: window.__BOYPUNK_TEST__.snapshot(), input: window.__BOYPUNK_TEST__.input(),
          menuVisible: !document.querySelector('#screen-menu').hidden, demoVisible: !document.querySelector('#demo-overlay').hidden,
          panelFits: panel.scrollHeight <= panel.clientHeight + 1,
          district: document.querySelector('#district-level-status').textContent.trim(),
          scrap: document.querySelector('#scrap-level-status').textContent.trim() };
      })()`);
      return value.snapshot.state === "menu" && value.menuVisible ? value : false;
    });
    await capture(client, path.join(evidenceDir, "01-menu-after-demo.png"));

    await clickSelector(client, "[data-ui=demo]");
    await waitFor(() => client.evaluate("window.__BOYPUNK_TEST__.demo().active"));
    const manualDemo = await client.evaluate("window.__BOYPUNK_TEST__.stepDemo(3)");
    await clickSelector(client, "#game");
    await waitFor(() => client.evaluate("window.__BOYPUNK_TEST__.snapshot().state === 'menu' && !window.__BOYPUNK_TEST__.demo().active"));

    await clickSelector(client, "[data-ui=demo]");
    await waitFor(() => client.evaluate("window.__BOYPUNK_TEST__.demo().active"));
    await touchSelector(client, "#game");
    const touchExit = await waitFor(async () => {
      const value = await client.evaluate(`({ snapshot: window.__BOYPUNK_TEST__.snapshot(), demo: window.__BOYPUNK_TEST__.demo(), input: window.__BOYPUNK_TEST__.input() })`);
      return value.snapshot.state === "menu" && !value.demo.active ? value : false;
    });

    await client.evaluate("window.__BOYPUNK_TEST__.advanceMenuInactivity(119.9)");
    const idleBeforeInteraction = await client.evaluate("window.__BOYPUNK_TEST__.menuInactivity()");
    await clickSelector(client, "#screen-menu .subtitle");
    const idleAfterInteraction = await client.evaluate("window.__BOYPUNK_TEST__.menuInactivity()");
    await client.evaluate("window.__BOYPUNK_TEST__.advanceMenuInactivity(119.9)");
    const idleBeforeThreshold = await client.evaluate(`({ timer: window.__BOYPUNK_TEST__.menuInactivity(), active: window.__BOYPUNK_TEST__.demo().active })`);
    await client.evaluate("window.__BOYPUNK_TEST__.advanceMenuInactivity(0.1)");
    const idleDemo = await waitFor(async () => {
      const value = await client.evaluate(`({ snapshot: window.__BOYPUNK_TEST__.snapshot(), demo: window.__BOYPUNK_TEST__.demo() })`);
      return value.demo.active ? value : false;
    });
    await key(client, "keyDown", "Escape", "Escape", 27);
    await key(client, "keyUp", "Escape", "Escape", 27);
    await waitFor(() => client.evaluate("window.__BOYPUNK_TEST__.snapshot().state === 'menu'"));
    const demoStorageAfterExit = await client.evaluate(`Object.fromEntries(Object.keys(localStorage).map((key) => [key, localStorage.getItem(key)]))`);

    const attractCycles = [];
    for (let cycle = 0; cycle < 5; cycle += 1) {
      const result = await client.evaluate(`(() => {
        const api = window.__BOYPUNK_TEST__;
        api.startDemo('cycle-${cycle + 1}');
        const demo = api.stepDemo(0.5);
        api.exitDemo();
        const menuAfterDemo = api.snapshot();
        api.start();
        const playerRun = api.snapshot();
        api.exitDemo();
        const finalMenu = api.snapshot();
        return { demo, menuAfterDemo, playerRun, finalMenu };
      })()`);
      attractCycles.push(result);
    }

    const progressionKey = "boypunk-web-progression-v1";
    const previewStorageBefore = await client.evaluate(`localStorage.getItem(${JSON.stringify("boypunk-web-progression-v1")})`);
    const victoryEventsBefore = await client.evaluate("window.__BOYPUNK_TEST__.eventCounts().victory ?? 0");
    const previewPrepared = await client.evaluate("window.__BOYPUNK_TEST__.prepareVictory({ progressionEligible: false, activeSeconds: 2.4 })");
    await key(client, "keyDown", " ", "Space", 32);
    const previewCommit = await client.evaluate("window.__BOYPUNK_TEST__.depositPreparedVictory()");
    const frozenVictory = await client.evaluate(`(() => {
      const api = window.__BOYPUNK_TEST__, model = api.model;
      const before = api.snapshot();
      const damageAccepted = model.damagePlayer(1);
      model.update(0.05, { attackPressed: true, interactPressed: true, right: true });
      return { before, after: api.snapshot(), damageAccepted };
    })()`);
    const previewFinished = await client.evaluate("window.__BOYPUNK_TEST__.finishVictoryPresentation()");
    await waitFor(() => client.evaluate("!document.querySelector('#screen-victory').hidden"));
    await client.send("Input.dispatchKeyEvent", {
      type: "keyDown", key: " ", code: "Space", windowsVirtualKeyCode: 32,
      nativeVirtualKeyCode: 32, autoRepeat: true
    });
    await delay(80);
    const heldVictoryInput = await client.evaluate(`({ snapshot: window.__BOYPUNK_TEST__.snapshot(), active: document.activeElement?.id || document.activeElement?.tagName })`);
    await key(client, "keyUp", " ", "Space", 32);
    const previewStorageAfter = await client.evaluate(`localStorage.getItem(${JSON.stringify("boypunk-web-progression-v1")})`);
    const previewUi = await client.evaluate(`({
      title: document.querySelector('#screen-victory h2').textContent.trim(),
      duration: document.querySelector('#victory-duration').textContent,
      souls: document.querySelector('#victory-souls').textContent,
      playerLife: document.querySelector('#victory-player-life').textContent,
      altarLife: document.querySelector('#victory-altar-life').textContent,
      next: document.querySelector('.next-level-card p').textContent.trim(),
      progression: window.__BOYPUNK_TEST__.progression()
    })`);
    await client.evaluate("document.querySelector('#screen-victory [data-ui=restart]').focus()");
    await key(client, "keyDown", "Enter", "Enter", 13);
    await key(client, "keyUp", "Enter", "Enter", 13);
    const previewRestart = await waitFor(async () => {
      const value = await client.evaluate("window.__BOYPUNK_TEST__.snapshot()");
      return value.state === "playing" ? value : false;
    });
    await client.evaluate("window.__BOYPUNK_TEST__.exitDemo()");

    const realVictoryCommit = await client.evaluate("window.__BOYPUNK_TEST__.victoryRun({ progressionEligible: true, activeSeconds: 3.2 })");
    await capture(client, path.join(evidenceDir, "08-victory-altar-response.png"));
    const realVictoryFinished = await client.evaluate("window.__BOYPUNK_TEST__.finishVictoryPresentation()");
    await waitFor(() => client.evaluate("!document.querySelector('#screen-victory').hidden"));
    const realVictoryUi = await client.evaluate(`({
      title: document.querySelector('#screen-victory h2').textContent.trim(),
      duration: document.querySelector('#victory-duration').textContent,
      souls: document.querySelector('#victory-souls').textContent,
      playerLife: document.querySelector('#victory-player-life').textContent,
      altarLife: document.querySelector('#victory-altar-life').textContent,
      next: document.querySelector('.next-level-card p').textContent.trim(),
      nextBadges: [...document.querySelectorAll('.next-level-card .status-badge')].map((item) => item.textContent.trim()),
      warningHidden: document.querySelector('#victory-progression-warning').hidden,
      progression: window.__BOYPUNK_TEST__.progression(),
      audio: window.__BOYPUNK_TEST__.audio(),
      panelFits: (() => { const panel = document.querySelector('#screen-victory .panel'); return panel.scrollHeight <= panel.clientHeight + 1; })(),
      buttonSizes: [...document.querySelectorAll('#screen-victory button')].map((button) => {
        const rect = button.getBoundingClientRect(); return { width: rect.width, height: rect.height };
      })
    })`);
    await capture(client, path.join(evidenceDir, "09-victory-screen.png"));

    await clickSelector(client, "#continue-next");
    const factoryEntry = await waitFor(async () => {
      const value = await client.evaluate("window.__BOYPUNK_TEST__.snapshot()");
      return value.state === "playing" && value.levelId === "scrap-factory" ? value : false;
    });
    await client.evaluate(`(() => {
      const model = window.__BOYPUNK_TEST__.model;
      model.nextSpawnAt = Infinity;
      model.enemies = [];
      model.projectiles = [];
      model.souls = [];
    })()`);
    await capture(client, path.join(evidenceDir, "10-factory-entry.png"));
    await key(client, "keyDown", "d", "KeyD", 68);
    await delay(1500);
    await key(client, "keyUp", "d", "KeyD", 68);
    const factorySafeCrossing = await client.evaluate("window.__BOYPUNK_TEST__.snapshot()");
    await key(client, "keyDown", "d", "KeyD", 68);
    await key(client, "keyDown", " ", "Space", 32);
    await key(client, "keyUp", " ", "Space", 32);
    await delay(180);
    await key(client, "keyDown", " ", "Space", 32);
    await key(client, "keyUp", " ", "Space", 32);
    await delay(650);
    await key(client, "keyUp", "d", "KeyD", 68);
    await delay(250);
    const factoryLowerRoute = await client.evaluate("window.__BOYPUNK_TEST__.snapshot()");
    await key(client, "keyDown", "a", "KeyA", 65);
    await key(client, "keyDown", " ", "Space", 32);
    await key(client, "keyUp", " ", "Space", 32);
    await delay(180);
    await key(client, "keyDown", " ", "Space", 32);
    await key(client, "keyUp", " ", "Space", 32);
    await delay(650);
    await key(client, "keyUp", "a", "KeyA", 65);
    await delay(300);
    const factoryElevatedRoute = await client.evaluate("window.__BOYPUNK_TEST__.snapshot()");

    await client.evaluate("window.__BOYPUNK_TEST__.restart()");
    await waitFor(() => client.evaluate("window.__BOYPUNK_TEST__.snapshot().levelId === 'scrap-factory'"));
    await client.evaluate(`(() => {
      const model = window.__BOYPUNK_TEST__.model;
      model.nextSpawnAt = Infinity;
      model.enemies = [];
      model.projectiles = [];
      model.souls = [];
    })()`);
    await key(client, "keyDown", "d", "KeyD", 68);
    await delay(900);
    await key(client, "keyUp", "d", "KeyD", 68);
    const factoryPressApproach = await client.evaluate("window.__BOYPUNK_TEST__.snapshot()");
    const pressContact = await waitFor(async () => {
      const value = await client.evaluate("window.__BOYPUNK_TEST__.snapshot()");
      return value.player.life < 4 ? value : false;
    }, 7000, 50);
    await capture(client, path.join(evidenceDir, "11-factory-press-contact.png"));

    const factoryVictoryCommit = await client.evaluate("window.__BOYPUNK_TEST__.victoryRun({ levelId: 'scrap-factory', progressionEligible: true, activeSeconds: 2.1 })");
    const factoryVictoryFinished = await client.evaluate("window.__BOYPUNK_TEST__.finishVictoryPresentation()");
    await waitFor(() => client.evaluate("!document.querySelector('#screen-victory').hidden"));
    const factoryVictoryUi = await client.evaluate(`({
      title: document.querySelector('#victory-title').textContent.trim(),
      nextHidden: document.querySelector('#next-level-card').hidden,
      continueHidden: document.querySelector('#continue-next').hidden,
      progression: window.__BOYPUNK_TEST__.progression()
    })`);
    await capture(client, path.join(evidenceDir, "12-factory-victory.png"));
    await touchSelector(client, "#screen-victory [data-ui=restart]");
    const factoryRetry = await waitFor(async () => {
      const value = await client.evaluate("window.__BOYPUNK_TEST__.snapshot()");
      return value.state === "playing" ? value : false;
    });
    const factoryDefeatCommit = await client.evaluate("window.__BOYPUNK_TEST__.contactDefeat()");
    await waitFor(() => client.evaluate("!document.querySelector('#screen-defeat').hidden"));
    const factoryDefeatUi = await client.evaluate(`({
      level: document.querySelector('#defeat-level').textContent.trim(),
      reason: document.querySelector('#defeat-reason').textContent.trim(),
      snapshot: window.__BOYPUNK_TEST__.snapshot()
    })`);
    await clickSelector(client, "#screen-defeat [data-ui=restart]");
    const factoryDefeatRetry = await waitFor(async () => {
      const value = await client.evaluate("window.__BOYPUNK_TEST__.snapshot()");
      return value.state === "playing" ? value : false;
    });
    await client.evaluate("window.__BOYPUNK_TEST__.exitDemo()");
    await waitFor(() => client.evaluate("window.__BOYPUNK_TEST__.snapshot().state === 'menu'"));
    await clickSelector(client, "#factory-level-button");
    const factoryMenuReentry = await waitFor(async () => {
      const value = await client.evaluate("window.__BOYPUNK_TEST__.snapshot()");
      return value.state === "playing" && value.levelId === "scrap-factory" ? value : false;
    });
    await client.evaluate("window.__BOYPUNK_TEST__.exitDemo()");
    const unlockedMenu = await client.evaluate(`({
      district: document.querySelector('#district-level-status').textContent.trim(),
      scrap: document.querySelector('#scrap-level-status').textContent.trim(),
      unavailableClass: document.querySelector('#scrap-level-status').classList.contains('is-unavailable'),
      progression: window.__BOYPUNK_TEST__.progression(),
      stored: localStorage.getItem(${JSON.stringify("boypunk-web-progression-v1")})
    })`);

    const victoryCycles = [];
    const savedBeforeVictoryCycles = unlockedMenu.stored;
    for (let cycle = 0; cycle < 3; cycle += 1) {
      const cycleResult = await client.evaluate(`(() => {
        const api = window.__BOYPUNK_TEST__;
        const committed = api.victoryRun({ levelId: 'district-neon', progressionEligible: true, activeSeconds: ${1.2} + ${cycle} });
        const finished = api.finishVictoryPresentation();
        return { committed, finished, progression: api.progression(), audio: api.audio(), ui: {
          duration: document.querySelector('#victory-duration').textContent,
          souls: document.querySelector('#victory-souls').textContent
        }};
      })()`);
      await waitFor(() => client.evaluate("!document.querySelector('#screen-victory').hidden"));
      await clickSelector(client, "#screen-victory [data-ui=restart]");
      const restarted = await waitFor(async () => {
        const value = await client.evaluate("window.__BOYPUNK_TEST__.snapshot()");
        return value.state === "playing" ? value : false;
      });
      await client.evaluate("window.__BOYPUNK_TEST__.exitDemo()");
      victoryCycles.push({ ...cycleResult, restarted });
    }
    const savedAfterVictoryCycles = await client.evaluate(`localStorage.getItem(${JSON.stringify("boypunk-web-progression-v1")})`);

    await client.send("Page.reload", { ignoreCache: true });
    await waitFor(() => client.evaluate("Boolean(window.__BOYPUNK_TEST__?.ready)"), 15000);
    await clickSelector(client, "#game");
    await waitFor(() => client.evaluate("window.__BOYPUNK_TEST__.snapshot().state === 'menu'"));
    const progressionAfterReload = await client.evaluate(`({
      progression: window.__BOYPUNK_TEST__.progression(),
      district: document.querySelector('#district-level-status').textContent.trim(),
      scrap: document.querySelector('#scrap-level-status').textContent.trim(),
      stored: localStorage.getItem(${JSON.stringify("boypunk-web-progression-v1")})
    })`);

    await delay(350);
    await clickSelector(client, "[data-ui=play]")
    await waitFor(() => client.evaluate("window.__BOYPUNK_TEST__.snapshot().state === 'playing'"), 2500);
    await waitFor(async () => {
      const state = await client.evaluate("window.__BOYPUNK_TEST__.audio()");
      return state.music === "battle" && state.procedural?.rendered && state.procedural?.activeSources === 1;
    }, 20000).catch(async (error) => {
      const diagnostics = await client.evaluate("window.__BOYPUNK_TEST__.audio()");
      throw new Error(`${error.message} Áudio: ${JSON.stringify(diagnostics)}`);
    });
    const started = await client.evaluate("window.__BOYPUNK_TEST__.snapshot()")
    const activeRunIdleIgnored = await client.evaluate(`({ triggered: window.__BOYPUNK_TEST__.advanceMenuInactivity(120), demo: window.__BOYPUNK_TEST__.demo(), snapshot: window.__BOYPUNK_TEST__.snapshot() })`)
    const audio = await client.evaluate("window.__BOYPUNK_TEST__.audio()")
    const audioMuted = await client.evaluate("window.__BOYPUNK_TEST__.setAudio(0.4, true); window.__BOYPUNK_TEST__.audio()")
    const audioRestored = await client.evaluate("window.__BOYPUNK_TEST__.setAudio(0.65, false); window.__BOYPUNK_TEST__.audio()")
    const launcher = testLauncher
      ? await execFile(path.join(root, "iniciar-jogo.sh"), ["--no-open"], { cwd: "/tmp", timeout: 8000 })
      : { stdout: "não aplicável ao artefato file://" };

    await key(client, "keyDown", "d", "KeyD", 68);
    await delay(520);
    await key(client, "keyUp", "d", "KeyD", 68);
    const afterMove = await client.evaluate("window.__BOYPUNK_TEST__.snapshot()")
    const playerRightWalkSamples = await client.evaluate(`(() => {
      const playerId = window.__BOYPUNK_TEST__.model.player.id;
      return window.__BOYPUNK_TEST__.animations().filter((sample) => sample.entityId === playerId && sample.state === "walk" && sample.facing === 1);
    })()`);

    await key(client, "keyDown", " ", "Space", 32);
    await key(client, "keyUp", " ", "Space", 32);
    await delay(90);
    await key(client, "keyDown", " ", "Space", 32);
    await key(client, "keyUp", " ", "Space", 32);
    await delay(120);
    const afterJump = await client.evaluate("window.__BOYPUNK_TEST__.snapshot()")

    await key(client, "keyDown", "x", "KeyX", 88);
    await key(client, "keyUp", "x", "KeyX", 88);
    const attackState = await waitFor(async () => {
      const state = await client.evaluate("({ timer: window.__BOYPUNK_TEST__.model.player.attackTimer, cooldown: window.__BOYPUNK_TEST__.model.player.attackCooldown, shots: window.__BOYPUNK_TEST__.model.projectiles.map(({x,y,vx,vy,removed}) => ({x,y,vx,vy,removed})), effects: window.__BOYPUNK_TEST__.model.effects.map(({kind,text}) => ({kind,text})) })");
      return state.effects.some((effect) => effect.kind === "blockedShot") ? state : false;
    }, 600).catch(() => client.evaluate("({ timer: window.__BOYPUNK_TEST__.model.player.attackTimer, cooldown: window.__BOYPUNK_TEST__.model.player.attackCooldown, shots: window.__BOYPUNK_TEST__.model.projectiles.map(({x,y,vx,vy,removed}) => ({x,y,vx,vy,removed})), effects: window.__BOYPUNK_TEST__.model.effects.map(({kind,text}) => ({kind,text})) })"));
    const afterAttack = await client.evaluate("window.__BOYPUNK_TEST__.snapshot()");
    await capture(client, path.join(evidenceDir, "02-gameplay.png"));

    await key(client, "keyDown", "Escape", "Escape", 27);
    await key(client, "keyUp", "Escape", "Escape", 27);
    await delay(60);
    const paused = await client.evaluate("window.__BOYPUNK_TEST__.snapshot()")
    await clickSelector(client, "[data-ui=resume]")
    await delay(60);
    const resumed = await client.evaluate("window.__BOYPUNK_TEST__.snapshot()")

    await key(client, "keyDown", "d", "KeyD", 68);
    await delay(80);
    const heldBeforeBlur = await client.evaluate("window.__BOYPUNK_TEST__.input().right");
    await client.evaluate("window.dispatchEvent(new Event('blur'))");
    await waitFor(() => client.evaluate("window.__BOYPUNK_TEST__.snapshot().state === 'paused'"));
    await waitFor(() => client.evaluate("!document.querySelector('#screen-paused').hidden"));
    const focusPaused = await client.evaluate("window.__BOYPUNK_TEST__.snapshot()");
    const inputAfterBlur = await client.evaluate("window.__BOYPUNK_TEST__.input()");
    const focusResumeClick = await clickSelector(client, "#screen-paused [data-ui=resume]");
    const focusResumeWorked = await waitFor(() => client.evaluate("window.__BOYPUNK_TEST__.snapshot().state === 'playing'"), 2500).catch(() => false);
    if (!focusResumeWorked) {
      const afterFocusResumeClick = await client.evaluate("({state:window.__BOYPUNK_TEST__.snapshot().state,pausedHidden:document.querySelector('#screen-paused').hidden,point:document.elementFromPoint(innerWidth/2,innerHeight/2)?.outerHTML?.slice(0,100)})");
      throw new Error(`Retomada após foco não foi ativada (clique ${JSON.stringify(focusResumeClick)}): ${JSON.stringify(afterFocusResumeClick)}`);
    }
    const focusResumed = await client.evaluate("window.__BOYPUNK_TEST__.snapshot()");
    await key(client, "keyUp", "d", "KeyD", 68);

    const chaserDefeat = await client.evaluate("window.__BOYPUNK_TEST__.chaserDefeat()");
    await waitFor(() => client.evaluate(`window.__BOYPUNK_TEST__.animations().some((sample) => sample.entityId === ${JSON.stringify(chaserDefeat.enemyId)} && sample.state === 'dead' && sample.frame >= 2)`));
    await capture(client, path.join(evidenceDir, "03-chaser-defeat-animation.png"));
    await waitFor(() => client.evaluate("window.__BOYPUNK_TEST__.snapshot().defeatVisuals === 0"));
    const chaserDefeatAfter = await client.evaluate("window.__BOYPUNK_TEST__.snapshot()");
    const chaserDefeatSamples = await client.evaluate(`window.__BOYPUNK_TEST__.animations().filter((sample) => sample.entityId === ${JSON.stringify(chaserDefeat.enemyId)} && sample.state === 'dead')`);

    const altarDefeat = await client.evaluate("window.__BOYPUNK_TEST__.altarDefeat()");
    await waitFor(() => client.evaluate("!document.querySelector('#screen-defeat').hidden"));
    const altarTerminal = await client.evaluate(`({ snapshot: window.__BOYPUNK_TEST__.snapshot(), reason: document.querySelector('#defeat-reason').textContent })`);
    const altarPlayerDeathSamples = await client.evaluate(`window.__BOYPUNK_TEST__.animations().filter((sample) => sample.entityId === ${JSON.stringify(altarDefeat.playerId)} && sample.state === 'die')`);
    await capture(client, path.join(evidenceDir, "04-altar-defeat.png"));
    await clickSelector(client, "#screen-defeat [data-ui=restart]");
    await waitFor(() => client.evaluate("window.__BOYPUNK_TEST__.snapshot().state === 'playing'"));

    const simultaneousCommit = await client.evaluate("window.__BOYPUNK_TEST__.simultaneousDefeat()");
    const simultaneousPlayerId = await client.evaluate("window.__BOYPUNK_TEST__.model.player.id");
    await waitFor(() => client.evaluate(`window.__BOYPUNK_TEST__.animations().some((sample) => sample.entityId === ${JSON.stringify(simultaneousPlayerId)} && sample.state === 'die' && sample.frame === 3)`));
    await capture(client, path.join(evidenceDir, "05-simultaneous-player-defeat-animation.png"));
    await waitFor(() => client.evaluate("!document.querySelector('#screen-defeat').hidden"));
    const simultaneousTerminal = await client.evaluate(`({ snapshot: window.__BOYPUNK_TEST__.snapshot(), reason: document.querySelector('#defeat-reason').textContent })`);
    const simultaneousDeathSamples = await client.evaluate(`window.__BOYPUNK_TEST__.animations().filter((sample) => sample.entityId === ${JSON.stringify(simultaneousPlayerId)} && sample.state === 'die')`);
    await clickSelector(client, "#screen-defeat [data-ui=restart]");
    await waitFor(() => client.evaluate("window.__BOYPUNK_TEST__.snapshot().state === 'playing'"));

    const eventCountsBeforeCycles = await client.evaluate("window.__BOYPUNK_TEST__.eventCounts()");
    const deathCycles = [];
    for (let cycle = 0; cycle < 5; cycle += 1) {
      const death = await client.evaluate("window.__BOYPUNK_TEST__.contactDefeat()");
      const playerId = await client.evaluate("window.__BOYPUNK_TEST__.model.player.id");
      await waitFor(() => client.evaluate(`window.__BOYPUNK_TEST__.animations().some((sample) => sample.entityId === ${JSON.stringify(playerId)} && sample.state === 'die' && sample.frame === 3)`));
      if (cycle === 0) await capture(client, path.join(evidenceDir, "06-player-defeat-animation.png"));
      await waitFor(() => client.evaluate("!document.querySelector('#screen-defeat').hidden"));
      const terminal = await client.evaluate(`({ snapshot: window.__BOYPUNK_TEST__.snapshot(), reason: document.querySelector('#defeat-reason').textContent })`);
      const deathSamples = await client.evaluate(`window.__BOYPUNK_TEST__.animations().filter((sample) => sample.entityId === ${JSON.stringify(playerId)} && sample.state === 'die')`);
      await capture(client, path.join(evidenceDir, `07-gameover-${cycle + 1}.png`));
      const priorRun = terminal.snapshot.runId;
      const restartClick = await clickSelector(client, "#screen-defeat [data-ui=restart]");
      const didRestart = await waitFor(async () => {
        const snapshot = await client.evaluate("window.__BOYPUNK_TEST__.snapshot()");
        return snapshot.state === "playing" && snapshot.runId === priorRun + 1 ? snapshot : false;
      }, 2500).catch(() => false);
      if (!didRestart) {
        const afterClick = await client.evaluate(`({ snapshot: window.__BOYPUNK_TEST__.snapshot(), defeatHidden: document.querySelector('#screen-defeat').hidden, menuHidden: document.querySelector('#screen-menu').hidden })`);
        throw new Error(`Botão Tentar novamente não iniciou uma nova partida (run anterior ${priorRun}; clique ${JSON.stringify(restartClick)}): ${JSON.stringify(afterClick)}`);
      }
      const restarted = await client.evaluate("window.__BOYPUNK_TEST__.snapshot()");
      deathCycles.push({ death, terminal, restarted, deathSamples });
    }
    const eventCountsAfterCycles = await client.evaluate("window.__BOYPUNK_TEST__.eventCounts()");
    const defeat = deathCycles.at(-1).terminal.snapshot;
    await client.evaluate("window.__BOYPUNK_TEST__.contactDefeat()");
    await waitFor(() => client.evaluate("!document.querySelector('#screen-defeat').hidden"));
    await clickSelector(client, "#screen-defeat [data-ui=menu]");
    await waitFor(() => client.evaluate("!document.querySelector('#screen-menu').hidden"));
    const returnedToMenu = await client.evaluate("window.__BOYPUNK_TEST__.snapshot()");
    await clickSelector(client, "[data-ui=play]");
    await waitFor(() => client.evaluate("window.__BOYPUNK_TEST__.snapshot().state === 'playing'"));
    const finalStart = await client.evaluate("window.__BOYPUNK_TEST__.snapshot()");

    await client.evaluate(`(() => {
      const model = window.__BOYPUNK_TEST__.model;
      model.nextSpawnAt = Infinity;
      model.player.x = 220;
      model.player.y = 208;
      model.player.vx = model.player.vy = 0;
      model.player.onGround = true;
    })()`);
    await key(client, "keyDown", "a", "KeyA", 65);
    await delay(260);
    await key(client, "keyUp", "a", "KeyA", 65);
    const playerLeftWalkSamples = await client.evaluate(`(() => {
      const playerId = window.__BOYPUNK_TEST__.model.player.id;
      return window.__BOYPUNK_TEST__.animations().filter((sample) => sample.entityId === playerId && sample.state === "walk" && sample.facing === -1);
    })()`);

    const animationFixture = await client.evaluate(`(() => {
      const api = window.__BOYPUNK_TEST__;
      const model = api.model;
      model.nextSpawnAt = Infinity;
      model.enemies = [];
      model.player.x = 160;
      model.player.y = 208;
      model.player.vx = model.player.vy = 0;
      model.player.onGround = true;
      model.spawnChaser();
      model.spawnChaser();
      const [left, right] = model.enemies;
      Object.assign(left, { x: 60, y: 208, vx: 0, vy: 0, onGround: true });
      Object.assign(right, { x: 420, y: 208, vx: 0, vy: 0, onGround: true });
      return { runId: model.runId, playerId: model.player.id, chaserIds: [left.id, right.id] };
    })()`);
    await waitFor(() => client.evaluate(`(() => {
      const samples = window.__BOYPUNK_TEST__.animations();
      return ${JSON.stringify(animationFixture.chaserIds)}.every((id) => samples.some((sample) => sample.entityId === id && sample.state === "walk"));
    })()`), 5000);
    await client.evaluate(`window.__BOYPUNK_TEST__.model.enemies[1].animTime += 0.23`);
    await delay(700);
    const animationFirst = await client.evaluate(`(() => {
      const ids = ${JSON.stringify(animationFixture.chaserIds)};
      const samples = window.__BOYPUNK_TEST__.animations().filter((sample) => ids.includes(sample.entityId) && sample.state === "walk");
      return ids.map((id) => samples.filter((sample) => sample.entityId === id));
    })()`);
    const animationStamp = new Date().toISOString().replaceAll(":", "-");
    const animationEvidence = path.join(evidenceDir, `locomotion-${animationStamp}-01.png`);
    await capture(client, animationEvidence);
    await capture(client, path.join(root, "evidencias", "art", "gameplay_preview.png"));
    await delay(700);
    const animationSecond = await client.evaluate(`(() => {
      const ids = ${JSON.stringify(animationFixture.chaserIds)};
      const samples = window.__BOYPUNK_TEST__.animations().filter((sample) => ids.includes(sample.entityId) && sample.state === "walk");
      return ids.map((id) => samples.filter((sample) => sample.entityId === id));
    })()`);
    const animationEvidenceLater = path.join(evidenceDir, `locomotion-${animationStamp}-02.png`);
    await capture(client, animationEvidenceLater);
    await capture(client, path.join(root, "evidencias", "art", "gameplay_action.png"));
    await client.evaluate("window.__BOYPUNK_TEST__.pause()");
    await waitFor(() => client.evaluate("window.__BOYPUNK_TEST__.snapshot().state === 'paused'"));
    const pausedAnimationBefore = await client.evaluate(`(() => {
      const ids = ${JSON.stringify(animationFixture.chaserIds)};
      return window.__BOYPUNK_TEST__.animations().filter((sample) => ids.includes(sample.entityId)).slice(-ids.length);
    })()`);
    await delay(350);
    const pausedAnimationAfter = await client.evaluate(`(() => {
      const ids = ${JSON.stringify(animationFixture.chaserIds)};
      return window.__BOYPUNK_TEST__.animations().filter((sample) => ids.includes(sample.entityId)).slice(-ids.length);
    })()`);
    const chaserAttackSamples = [];
    for (let frame = 0; frame < 4; frame += 1) {
      await client.evaluate(`(() => {
        const enemy = window.__BOYPUNK_TEST__.model.enemies.find(({ id }) => id === ${JSON.stringify(animationFixture.chaserIds[0])});
        enemy.attackFlash = 0.18;
        enemy.animState = "attack";
        enemy.animTime = ${frame} / 22;
      })()`);
      await delay(60);
      chaserAttackSamples.push(await client.evaluate(`(() => {
        const id = ${JSON.stringify(animationFixture.chaserIds[0])};
        return window.__BOYPUNK_TEST__.animations().filter((sample) => sample.entityId === id && sample.state === "attack").at(-1);
      })()`));
    }
    await client.evaluate("window.__BOYPUNK_TEST__.resume()");
    await waitFor(() => client.evaluate("window.__BOYPUNK_TEST__.snapshot().state === 'playing'"));
    await client.evaluate("window.__BOYPUNK_TEST__.model.enemies = []");
    const uniqueFrames = animationSecond.map((samples) => [...new Set(samples.map((sample) => sample.frame))]);
    const latestPaused = (samples) => Object.fromEntries(samples.map((sample) => [sample.entityId, { frame: sample.frame, animTime: sample.animTime }]));
    const pausedBeforeById = latestPaused(pausedAnimationBefore);
    const pausedAfterById = latestPaused(pausedAnimationAfter);

    const severeConsoleEvents = client.events.filter((event) => {
      if (event.method === "Runtime.exceptionThrown") return true;
      if (event.method === "Log.entryAdded") return ["error", "warning"].includes(event.params?.entry?.level);
      return false;
    });
    const requestedUrls = [...new Set(client.events
      .filter((event) => event.method === "Network.requestWillBeSent")
      .map((event) => event.params?.request?.url)
      .filter(Boolean))];
    const forbiddenRequests = requireOffline
      ? requestedUrls.filter((requestUrl) => !requestUrl.startsWith("file:") && !requestUrl.startsWith("data:") && !requestUrl.startsWith("blob:"))
      : [];

    const assertions = {
      title: initial.title === "BoyPunk!",
      studioVersionVisible: initial.version === "0.2.3",
      loadingCompleted: initial.loadingHidden,
      startupDemoSilent: initial.demoVisible && initial.snapshot.demoMode && initial.demo.active && initial.audio.initialized === false,
      demoPresentation: initial.demoText.includes("DEMONSTRAÇÃO") && initial.demoText.includes("Enter / Espaço") &&
        initial.demoText.includes("toque para abrir o menu"),
      menuProgressCompact: menuAfterStartupExit.panelFits && menuAfterStartupExit.district === "Disponível" &&
        menuAfterStartupExit.scrap === "Bloqueada",
      autonomousControllerObserved: demoSequence.some(({ snapshot }) => snapshot.altar?.deposited > 0) &&
        demoSequence.some(({ snapshot }) => snapshot.kills > 0) && demoSequence.some(({ snapshot }) => snapshot.player.y < 180),
      startupExitConsumed: heldExit.snapshot.state === "menu" && heldExit.menuVisible && !heldExit.input.jumpPressed && !heldExit.input.pausePressed &&
        menuAfterStartupExit.snapshot.state === "menu" && !menuAfterStartupExit.input.jumpPressed && !menuAfterStartupExit.demoVisible,
      manualDemoEntryAndPointerExit: manualDemo.snapshot.demoMode && manualDemo.demo.entry === "manual",
      touchExitConsumed: touchExit.snapshot.state === "menu" && !touchExit.demo.active &&
        !touchExit.input.jumpPressed && !touchExit.input.attackPressed,
      idleEntryThresholdAndInteractionReset: idleBeforeInteraction.elapsed > 119 && idleAfterInteraction.elapsed < 0.2 &&
        !idleBeforeThreshold.active && idleBeforeThreshold.timer.elapsed > 119 && idleDemo.demo.active && idleDemo.demo.entry === "idle",
      demoSaveIsolation: JSON.stringify(demoStorageBeforeExit) === JSON.stringify(demoStorageAfterExit),
      fiveAttractPlayerCycles: attractCycles.length === 5 && attractCycles.every(({ demo, menuAfterDemo, playerRun, finalMenu }) =>
        demo.snapshot.demoMode && menuAfterDemo.state === "menu" && playerRun.state === "playing" && !playerRun.demoMode &&
        playerRun.player.life === 4 && playerRun.altar.life === 4 && playerRun.altar.deposited === 0 &&
        playerRun.carriedSouls === 0 && playerRun.enemies === 0 && playerRun.projectiles === 0 && finalMenu.state === "menu"),
      victoryThroughCollectionAndDeposit: previewPrepared.snapshot.carriedSouls === initial.objective.soulsGoal &&
        previewCommit.snapshot.state === "victoryPresentation" && previewCommit.snapshot.altar.deposited === initial.objective.soulsGoal &&
        previewCommit.snapshot.completedRun?.soulsDeposited === initial.objective.soulsGoal,
      victoryCommittedExactlyOnce: previewCommit.events.victory === victoryEventsBefore + 1 &&
        frozenVictory.before.terminalCommitted && frozenVictory.after.terminalCommitted &&
        previewFinished.snapshot.state === "victory" && previewFinished.events.victory === previewCommit.events.victory,
      victoryValuesFrozenAndDamageStopped: !frozenVictory.damageAccepted &&
        JSON.stringify(frozenVictory.before.completedRun) === JSON.stringify(frozenVictory.after.completedRun) &&
        frozenVictory.before.altar.deposited === frozenVictory.after.altar.deposited &&
        frozenVictory.before.player.life === frozenVictory.after.player.life,
      heldGameplayInputDoesNotActivateVictory: heldVictoryInput.snapshot.state === "victory" && heldVictoryInput.active === "game",
      previewDoesNotUnlockProgression: previewStorageBefore === null && previewStorageAfter === null &&
        !previewUi.progression.scrapFactory.unlocked,
      victoryKeyboardRestartClean: previewRestart.state === "playing" && !previewRestart.demoMode &&
        previewRestart.player.life === 4 && previewRestart.altar.life === 4 && previewRestart.altar.deposited === 0 &&
        previewRestart.carriedSouls === 0 && !previewRestart.terminalCommitted,
      victoryScreenAccurate: realVictoryUi.title === "Distrito Neon concluído!" &&
        realVictoryUi.duration === formatDuration(realVictoryCommit.snapshot.completedRun.activeSeconds) &&
        Number(realVictoryUi.souls) === initial.objective.soulsGoal &&
        Number(realVictoryUi.playerLife) === realVictoryCommit.snapshot.completedRun.playerLife &&
        Number(realVictoryUi.altarLife) === realVictoryCommit.snapshot.completedRun.altarLife && realVictoryUi.panelFits &&
        realVictoryUi.buttonSizes.every(({ width, height }) => width >= 44 && height >= 29),
      nextLevelClearlyAvailable: realVictoryUi.next === "Fábrica de Sucata desbloqueada — disponível para jogar" &&
        realVictoryUi.nextBadges.includes("Desbloqueada") && realVictoryUi.nextBadges.includes("Disponível") &&
        realVictoryUi.progression.scrapFactory.unlocked && realVictoryUi.progression.scrapFactory.available,
      realVictoryPersistsUnlock: realVictoryCommit.progression.scrapFactory.unlocked &&
        unlockedMenu.progression.district.completed && unlockedMenu.progression.scrapFactory.unlocked &&
        unlockedMenu.district === "Concluído" && unlockedMenu.scrap === "Concluída" &&
        !unlockedMenu.unavailableClass && Boolean(unlockedMenu.stored),
      districtVictoryContinuesToFactory: factoryEntry.levelId === "scrap-factory" && factoryEntry.state === "playing" &&
        factoryEntry.player.life === 4 && factoryEntry.altar.life === 4 && factoryEntry.presses.length === 1,
      factorySafeCrossingWithRealMovement: factorySafeCrossing.player.x > factorySafeCrossing.presses[0].x + factorySafeCrossing.presses[0].w &&
        factorySafeCrossing.player.life === 4 && factorySafeCrossing.presses[0].phase === "idle",
      factoryRoutesReachedWithRealJumps: factoryLowerRoute.player.y <= 144.1 && factoryElevatedRoute.player.y <= 80.1,
      factoryPressDamageThroughContact: factoryPressApproach.player.x + 22 > factoryPressApproach.presses[0].x &&
        factoryPressApproach.player.x < factoryPressApproach.presses[0].x + factoryPressApproach.presses[0].w &&
        pressContact.player.life === 3 && pressContact.presses[0].cycle >= 1,
      factoryVictoryAndCompletion: factoryVictoryCommit.snapshot.levelId === "scrap-factory" &&
        factoryVictoryCommit.snapshot.state === "victoryPresentation" && factoryVictoryFinished.snapshot.state === "victory" &&
        factoryVictoryUi.title === "Fábrica de Sucata concluída!" && factoryVictoryUi.nextHidden && factoryVictoryUi.continueHidden &&
        factoryVictoryUi.progression.scrapFactory.completed,
      factoryRetryDefeatAndMenuReentry: factoryRetry.levelId === "scrap-factory" && factoryRetry.player.life === 4 &&
        factoryDefeatCommit.snapshot.levelId === "scrap-factory" && factoryDefeatUi.level === "Fábrica de Sucata" &&
        factoryDefeatUi.snapshot.state === "defeat" && factoryDefeatRetry.levelId === "scrap-factory" &&
        factoryDefeatRetry.player.life === 4 && factoryMenuReentry.levelId === "scrap-factory",
      repeatedVictoryCyclesClean: victoryCycles.length === 3 && victoryCycles.every(({ committed, finished, progression, audio, ui, restarted }) =>
        committed.snapshot.state === "victoryPresentation" && finished.snapshot.state === "victory" &&
        progression.scrapFactory.unlocked && progression.scrapFactory.available && progression.scrapFactory.completed &&
        ui.duration === formatDuration(committed.snapshot.completedRun.activeSeconds) && Number(ui.souls) === initial.objective.soulsGoal &&
        restarted.state === "playing" && restarted.player.life === 4 && restarted.altar.life === 4 &&
        restarted.altar.deposited === 0 && restarted.carriedSouls === 0 && !restarted.terminalCommitted &&
        audio.procedural.activeSources <= 1) && savedBeforeVictoryCycles === savedAfterVictoryCycles,
      unlockSurvivesReload: progressionAfterReload.progression.district.completed &&
        progressionAfterReload.progression.scrapFactory.unlocked && progressionAfterReload.progression.scrapFactory.available &&
        progressionAfterReload.progression.scrapFactory.completed &&
        progressionAfterReload.district === "Concluído" && progressionAfterReload.scrap === "Concluída" &&
        progressionAfterReload.stored === unlockedMenu.stored,
      canvasSize: initial.canvas[0] === 480 && initial.canvas[1] === 270,
      assetsLoaded: initial.assetFailures.length === 0,
      started: started.state === "playing" && started.player.life === 4 && started.altar.life === 4,
      noIdleEntryDuringPlayerRun: !activeRunIdleIgnored.triggered && !activeRunIdleIgnored.demo.active && activeRunIdleIgnored.snapshot.state === "playing",
      healthTargetsShown: initial.objective.playerMaxLife === 4 && initial.objective.altarMaxLife === 4 && initial.healthLabels.every((value) => value === 4),
      moved: afterMove.player.x > started.player.x + 20,
      playerWalkFramesAdvanceBothDirections: new Set(playerRightWalkSamples.map((sample) => sample.frame)).size >= 3 && new Set(playerLeftWalkSamples.map((sample) => sample.frame)).size >= 2,
      doubleJumped: afterJump.player.y < afterMove.player.y,
      keyboardAttackTriggered: attackState.timer > 0 && attackState.cooldown > 0,
      blockedShotFeedback: attackState.effects.some((effect) => effect.kind === "blockedShot"),
      paused: paused.state === "paused",
      resumed: resumed.state === "playing",
      focusLossAndRecovery: heldBeforeBlur && focusPaused.state === "paused" && !inputAfterBlur.right && !inputAfterBlur.left && focusResumed.state === "playing",
      chaserDefeatThroughCombat: chaserDefeat.snapshot.enemies === 0 && chaserDefeat.snapshot.defeatVisuals === 1 &&
        chaserDefeat.snapshot.souls === chaserDefeat.soulsBefore + 1 && chaserDefeat.snapshot.kills === chaserDefeat.killsBefore + 1 &&
        chaserDefeatAfter.enemies === 0 && chaserDefeatAfter.defeatVisuals === 0 && chaserDefeatAfter.player.life === 4,
      chaserDefeatFramesRender: new Set(chaserDefeatSamples.map((sample) => sample.frame)).size === 4 &&
        [0, 1, 2, 3].every((frame) => chaserDefeatSamples.some((sample) => sample.frame === frame && sample.assetKey === `chaser.dead.${frame}`)),
      altarDefeatWithSurvivingPlayer: altarDefeat.snapshot.state === "defeat" && altarDefeat.snapshot.player.life === 4 &&
        altarDefeat.snapshot.altar.life === 0 && altarDefeat.snapshot.defeatReason === "Altar destruído" &&
        altarTerminal.reason === "Altar destruído" && altarPlayerDeathSamples.length === 0 &&
        altarDefeat.damage.length === 4 && altarDefeat.damage.every((entry) => entry.target === "altar"),
      simultaneousTerminalDamage: simultaneousCommit.snapshot.state === "defeatPresentation" && simultaneousCommit.snapshot.player.life === 0 &&
        simultaneousCommit.snapshot.altar.life === 0 && simultaneousCommit.snapshot.defeatReason === "Você foi derrotado" &&
        simultaneousTerminal.snapshot.state === "defeat" && simultaneousTerminal.reason === "Você foi derrotado",
      simultaneousPlayerDefeatFramesRender: [0, 1, 2, 3].every((frame) =>
        simultaneousDeathSamples.some((sample) => sample.frame === frame && sample.assetKey === `player.die.${frame}`)),
      fiveDeathRestartCycles: deathCycles.length === 5 && deathCycles.every(({ death, terminal, restarted, deathSamples }) =>
        death.snapshot.state === "defeatPresentation" && death.snapshot.terminalCommitted && death.snapshot.player.life === 0 && death.damage.length === 4 &&
        terminal.snapshot.state === "defeat" && terminal.reason === "Você foi derrotado" &&
        restarted.state === "playing" && restarted.player.life === 4 && restarted.altar.life === 4 &&
        restarted.altar.deposited === 0 && restarted.carriedSouls === 0 && restarted.enemies === 0 &&
        restarted.projectiles === 0 && restarted.defeatVisuals === 0 && !restarted.terminalCommitted && restarted.souls === 3 &&
        [0, 1, 2, 3].every((frame) => deathSamples.some((sample) => sample.frame === frame && sample.assetKey === `player.die.${frame}`))),
      oneDefeatAudioEventPerCycle: (eventCountsAfterCycles.defeat ?? 0) - (eventCountsBeforeCycles.defeat ?? 0) === 5,
      menuAndFreshStart: returnedToMenu.state === "menu" && finalStart.state === "playing" && finalStart.player.life === 4 && finalStart.altar.life === 4,
      chaserLocomotionFramesAdvance: animationSecond.length === 2 && uniqueFrames.every((frames) => frames.length >= 4),
      chaserBothFacingDirections: animationSecond.length === 2 && animationSecond[0].at(-1)?.facing === 1 && animationSecond[1].at(-1)?.facing === -1,
      chaserAnimationsIndependent: animationSecond.length === 2 && animationSecond[0].at(-1)?.entityId !== animationSecond[1].at(-1)?.entityId && Math.abs(animationSecond[0].at(-1)?.animTime - animationSecond[1].at(-1)?.animTime) > 0.02,
      pauseFreezesEnemyAnimation: Object.keys(pausedBeforeById).length === 2 && Object.keys(pausedAfterById).length === 2 && Object.keys(pausedBeforeById).every((id) => pausedBeforeById[id].frame === pausedAfterById[id].frame && pausedBeforeById[id].animTime === pausedAfterById[id].animTime),
      chaserAttackFramesRender: chaserAttackSamples.length === 4 && chaserAttackSamples.every((sample, frame) => sample?.frame === frame && sample?.assetKey === `chaser.attack.${frame}`),
      defeat: defeat.state === "defeat" && defeat.player.life === 0,
      objectiveUnified: menuAfterStartupExit.snapshot.state === "menu" && (await client.evaluate("Number(document.querySelector('[data-souls-goal]').textContent)")) === 15,
      audioInitialized: audio.initialized === true && audio.music === "battle" && audio.procedural?.rendered === true && audio.procedural?.activeSources === 1,
      audioHeadroom: Number.isFinite(audio.procedural?.analysis?.peakDbfs) && audio.procedural.analysis.peakDbfs < -0.2,
      audioMuteAndVolume: audioMuted.muted === true && audioMuted.procedural.activeSources === 1 && audioRestored.muted === false && audioRestored.volume === 0.65,
      launcherReusedServer: !testLauncher || (launcher.stdout.includes("Reutilizando servidor BoyPunk! existente") && launcher.stdout.includes(url)),
      noRemoteRequests: !requireOffline || forbiddenRequests.length === 0,
      noSevereConsoleEvents: severeConsoleEvents.length === 0
    };
    const passed = Object.values(assertions).every(Boolean);
    const report = {
      passed,
      url,
      testedAt: new Date().toISOString(),
      assertions,
      initial,
      demoSequence,
      heldExit,
      menuAfterStartupExit,
      manualDemo,
      touchExit,
      idleBeforeInteraction,
      idleAfterInteraction,
      idleBeforeThreshold,
      idleDemo,
      demoStorageBeforeExit,
      demoStorageAfterExit,
      attractCycles,
      previewStorageBefore,
      previewPrepared,
      previewCommit,
      frozenVictory,
      previewFinished,
      heldVictoryInput,
      previewStorageAfter,
      previewUi,
      previewRestart,
      realVictoryCommit,
      realVictoryFinished,
      realVictoryUi,
      factoryEntry,
      factorySafeCrossing,
      factoryLowerRoute,
      factoryElevatedRoute,
      factoryPressApproach,
      pressContact,
      factoryVictoryCommit,
      factoryVictoryFinished,
      factoryVictoryUi,
      factoryRetry,
      factoryDefeatCommit,
      factoryDefeatUi,
      factoryDefeatRetry,
      factoryMenuReentry,
      unlockedMenu,
      victoryCycles,
      savedBeforeVictoryCycles,
      savedAfterVictoryCycles,
      progressionAfterReload,
      started,
      activeRunIdleIgnored,
      afterMove,
      playerRightWalkSamples,
      playerLeftWalkSamples,
      afterJump,
      afterAttack,
      attackState,
      paused,
      resumed,
      focusPaused,
      inputAfterBlur,
      focusResumed,
      chaserDefeat,
      chaserDefeatAfter,
      chaserDefeatSamples,
      altarDefeat,
      altarTerminal,
      altarPlayerDeathSamples,
      simultaneousCommit,
      simultaneousTerminal,
      simultaneousDeathSamples,
      defeat,
      deathCycles,
      eventCountsBeforeCycles,
      eventCountsAfterCycles,
      returnedToMenu,
      finalStart,
      animationFixture,
      animationSamples: { first: animationFirst, second: animationSecond, pausedBefore: pausedAnimationBefore, pausedAfter: pausedAnimationAfter },
      chaserAttackSamples,
      animationEvidence: [animationEvidence, animationEvidenceLater],
      audio,
      audioMuted,
      audioRestored,
      requestedUrls: requestedUrls.map((requestUrl) => requestUrl.startsWith("data:")
        ? `${requestUrl.slice(0, requestUrl.indexOf(",") + 1)}<${requestUrl.length} caracteres incorporados>`
        : requestUrl),
      forbiddenRequests,
      launcherOutput: launcher.stdout.trim(),
      severeConsoleEvents,
      chromeStderrTail: chromeErrors.split(/\r?\n/).filter(Boolean).slice(-12)
    };
    await writeFile(path.join(evidenceDir, "browser-test.json"), `${JSON.stringify(report, null, 2)}\n`);
    if (!passed) throw new Error(`Teste de navegador falhou: ${JSON.stringify(assertions)}`);
    return report;
  } finally {
    client?.close();
    chrome.kill("SIGTERM");
    await delay(120);
    await rm(profile, { recursive: true, force: true });
  }
}
