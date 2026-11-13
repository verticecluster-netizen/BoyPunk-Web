import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import http from "node:http";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(check, timeout = 10000, interval = 100) {
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

// Start HTTP server on port 0
const root = process.cwd();
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
const profile = await mkdtemp("/tmp/boypunk-phase1-");
const browserUrl = `${serverUrl}?test=1&bonus-preview=1`;
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
  browserUrl
], { stdio: ["ignore", "pipe", "pipe"] });

let client;
const report = {
  testedAt: new Date().toISOString(),
  phase0: {
    serverUrl,
    directBonusPreview: true,
    cacheHeaders: "Cache-Control: no-store",
    serviceWorker: false
  },
  results: [],
  detailedLogs: []
};

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

  console.log("Jogo pronto no navegador real. Instalando gravador de física per-frame...");

  // Install per-frame physics hook in page context
  await client.evaluate(`(() => {
    const model = window.__BOYPUNK_TEST__.model;
    window.__PHASE1_RECORDER__ = {
      log: [],
      active: false,
      start(scenario) {
        this.log = [];
        this.scenario = scenario;
        this.active = true;
      },
      stop() {
        this.active = false;
        return this.log;
      }
    };

    const originalMoveBody = model.moveBody.bind(model);
    model.moveBody = function(body, dt) {
      const beforeX = body.x, beforeY = body.y, beforeVx = body.vx, beforeVy = body.vy, beforeGrounded = body.onGround;
      const res = originalMoveBody(body, dt);
      if (window.__PHASE1_RECORDER__.active && body === model.player) {
        // Check which platforms overlap or interacted
        const colliding = model.platforms.filter((p) => {
          return body.x < p.x + p.w && body.x + body.w > p.x && body.y < p.y + p.h && body.y + body.h > p.y;
        }).map(p => ({ x: p.x, y: p.y, w: p.w, h: p.h, oneWay: p.oneWay }));

        window.__PHASE1_RECORDER__.log.push({
          frame: window.__PHASE1_RECORDER__.log.length,
          x: Number(body.x.toFixed(2)),
          y: Number(body.y.toFixed(2)),
          vx: Number(body.vx.toFixed(2)),
          vy: Number(body.vy.toFixed(2)),
          onGround: body.onGround,
          hitX: res.hitX,
          hitY: res.hitY,
          colliding
        });
      }
      return res;
    };
  })()`);

  // Helper to set player position & state in real browser
  async function setupPlayer(x, y, vx = 0, vy = 0, onGround = true) {
    await client.evaluate(`(() => {
      const m = window.__BOYPUNK_TEST__.model;
      m.state = "bonusPlaying";
      m.bonusRemaining = 999;
      m.bonusResult = null;
      if (m.bonusCannon) {
        m.bonusCannon.phase = "wait";
        m.bonusCannon.phaseTime = 999;
        m.bonusCannon.chargeTime = 0;
      }
      m.player.x = ${x};
      m.player.y = ${y};
      m.player.vx = ${vx};
      m.player.vy = ${vy};
      m.player.onGround = ${onGround};
      m.player.jumpsUsed = ${onGround ? 0 : 1};
      m.player.coyote = ${onGround ? 0.09 : 0};
      m.player.jumpBuffer = 0;
    })()`);
  }

  async function stepSimulation(seconds) {
    // Let real game loop run for ~seconds
    await delay(Math.round(seconds * 1000));
  }

  // Define test cases covering:
  // a) ASCEND: from floor and each tier to next tier (single and double jump, approaching left and right, under gap and under platform)
  // b) DESCEND: walk off edge, jump through gap, fall through gap center and near edges
  // c) Holding left/right vs releasing mid-air, diagonal jumps
  // d) Collider overlay on vs off

  const scenarios = [
    // === ASCENT SCENARIOS ===
    // Floor (y=240, standing y=208) to Tier 1 (y=200, standing y=168)
    { id: "ascend_floor_to_tier1_under_p1_single", type: "ascend", fromY: 208, toY: 168, startX: 40, keys: ["Space"], dur: 0.6, expectedGroundedAtY: 168 },
    { id: "ascend_floor_to_tier1_under_p2_single", type: "ascend", fromY: 208, toY: 168, startX: 240, keys: ["Space"], dur: 0.6, expectedGroundedAtY: 168 },
    { id: "ascend_floor_to_tier1_gap1_approach_left_diag", type: "ascend", fromY: 208, toY: 168, startX: 55, keys: ["KeyD", "Space"], dur: 0.7, expectedGroundedAtY: 168 },
    { id: "ascend_floor_to_tier1_gap1_approach_right_diag", type: "ascend", fromY: 208, toY: 168, startX: 120, keys: ["KeyA", "Space"], dur: 0.7, expectedGroundedAtY: 168 },
    { id: "ascend_floor_to_tier1_gap2_approach_left_diag", type: "ascend", fromY: 208, toY: 168, startX: 355, keys: ["KeyD", "Space"], dur: 0.7, expectedGroundedAtY: 168 },
    { id: "ascend_floor_to_tier1_gap2_approach_right_diag", type: "ascend", fromY: 208, toY: 168, startX: 425, keys: ["KeyA", "Space"], dur: 0.7, expectedGroundedAtY: 168 },
    // Floor to Tier 2 via double jump
    { id: "ascend_floor_to_tier2_double", type: "ascend", fromY: 208, toY: 128, startX: 40, keys: ["Space", "double"], dur: 0.8, expectedGroundedAtY: 128 },

    // Tier 1 (y=200, standing y=168) to Tier 2 (y=160, standing y=128)
    { id: "ascend_tier1_to_tier2_under_p1_single", type: "ascend", fromY: 168, toY: 128, startX: 160, keys: ["Space"], dur: 0.6, expectedGroundedAtY: 128 },
    { id: "ascend_tier1_to_tier2_under_p2_single", type: "ascend", fromY: 168, toY: 128, startX: 320, keys: ["Space"], dur: 0.6, expectedGroundedAtY: 128 },
    { id: "ascend_tier1_to_tier2_gap1_approach_left_diag", type: "ascend", fromY: 168, toY: 128, startX: 195, keys: ["KeyA", "Space"], dur: 0.7, expectedGroundedAtY: 128 },
    { id: "ascend_tier1_to_tier2_gap1_approach_right_diag", type: "ascend", fromY: 168, toY: 128, startX: 280, keys: ["KeyD", "Space"], dur: 0.7, expectedGroundedAtY: 128 },
    // Tier 1 to Tier 3 via double jump
    { id: "ascend_tier1_to_tier3_double", type: "ascend", fromY: 168, toY: 88, startX: 40, keys: ["Space", "double"], dur: 0.8, expectedGroundedAtY: 88 },

    // Tier 2 (y=160, standing y=128) to Tier 3 (y=120, standing y=88)
    { id: "ascend_tier2_to_tier3_under_p1_single", type: "ascend", fromY: 128, toY: 88, startX: 40, keys: ["Space"], dur: 0.6, expectedGroundedAtY: 88 },
    { id: "ascend_tier2_to_tier3_under_p2_single", type: "ascend", fromY: 128, toY: 88, startX: 240, keys: ["Space"], dur: 0.6, expectedGroundedAtY: 88 },
    { id: "ascend_tier2_to_tier3_under_p3_single", type: "ascend", fromY: 128, toY: 88, startX: 430, keys: ["Space"], dur: 0.6, expectedGroundedAtY: 88 },
    { id: "ascend_tier2_to_tier3_gap1_approach_left_diag", type: "ascend", fromY: 128, toY: 88, startX: 55, keys: ["KeyD", "Space"], dur: 0.7, expectedGroundedAtY: 88 },
    { id: "ascend_tier2_to_tier3_gap1_approach_right_diag", type: "ascend", fromY: 128, toY: 88, startX: 120, keys: ["KeyA", "Space"], dur: 0.7, expectedGroundedAtY: 88 },
    { id: "ascend_tier2_to_tier3_gap2_approach_left_diag", type: "ascend", fromY: 128, toY: 88, startX: 355, keys: ["KeyD", "Space"], dur: 0.7, expectedGroundedAtY: 88 },
    { id: "ascend_tier2_to_tier3_gap2_approach_right_diag", type: "ascend", fromY: 128, toY: 88, startX: 425, keys: ["KeyA", "Space"], dur: 0.7, expectedGroundedAtY: 88 },
    // Tier 2 to Tier 4 via double jump
    { id: "ascend_tier2_to_tier4_double", type: "ascend", fromY: 128, toY: 48, startX: 160, keys: ["Space", "double"], dur: 0.8, expectedGroundedAtY: 48 },

    // Tier 3 (y=120, standing y=88) to Tier 4 (y=80, standing y=48)
    { id: "ascend_tier3_to_tier4_under_p1_single", type: "ascend", fromY: 88, toY: 48, startX: 160, keys: ["Space"], dur: 0.6, expectedGroundedAtY: 48 },
    { id: "ascend_tier3_to_tier4_under_p2_single", type: "ascend", fromY: 88, toY: 48, startX: 320, keys: ["Space"], dur: 0.6, expectedGroundedAtY: 48 },
    { id: "ascend_tier3_to_tier4_gap1_approach_left_diag", type: "ascend", fromY: 88, toY: 48, startX: 195, keys: ["KeyA", "Space"], dur: 0.7, expectedGroundedAtY: 48 },
    { id: "ascend_tier3_to_tier4_gap1_approach_right_diag", type: "ascend", fromY: 88, toY: 48, startX: 280, keys: ["KeyD", "Space"], dur: 0.7, expectedGroundedAtY: 48 },

    // === DESCEND SCENARIOS ===
    // Tier 4 (y=80, standing y=48) to Tier 3 (y=120, standing y=88)
    { id: "descend_tier4_center_gap_drop_center", type: "descend", fromY: 48, toY: 88, startX: 229, keys: [], dur: 0.6, expectedY: 88 },
    { id: "descend_tier4_center_gap_walk_off_left", type: "descend", fromY: 48, toY: 88, startX: 198, keys: ["KeyD"], dur: 0.6, expectedY: 88 },
    { id: "descend_tier4_center_gap_walk_off_right", type: "descend", fromY: 48, toY: 88, startX: 280, keys: ["KeyA"], dur: 0.6, expectedY: 88 },
    { id: "descend_tier4_center_gap_jump_through_tap", type: "descend", fromY: 48, toY: 88, startX: 198, keys: ["Space", "tapD"], dur: 0.7, expectedY: 88 },

    // Tier 3 (y=120, standing y=88) to Tier 2 (y=160, standing y=128)
    { id: "descend_tier3_gap1_drop_center", type: "descend", fromY: 88, toY: 128, startX: 77, keys: [], dur: 0.6, expectedY: 128 },
    { id: "descend_tier3_gap1_walk_off_left", type: "descend", fromY: 88, toY: 128, startX: 54, keys: ["KeyD"], dur: 0.6, expectedY: 128 },
    { id: "descend_tier3_gap1_walk_off_right", type: "descend", fromY: 88, toY: 128, startX: 122, keys: ["KeyA"], dur: 0.6, expectedY: 128 },
    { id: "descend_tier3_gap1_jump_through_tap", type: "descend", fromY: 88, toY: 128, startX: 54, keys: ["Space", "tapD"], dur: 0.7, expectedY: 128 },
    { id: "descend_tier3_gap2_drop_center", type: "descend", fromY: 88, toY: 128, startX: 381, keys: [], dur: 0.6, expectedY: 128 },
    { id: "descend_tier3_gap2_walk_off_left", type: "descend", fromY: 88, toY: 128, startX: 358, keys: ["KeyD"], dur: 0.6, expectedY: 128 },
    { id: "descend_tier3_gap2_walk_off_right", type: "descend", fromY: 88, toY: 128, startX: 426, keys: ["KeyA"], dur: 0.6, expectedY: 128 },
    { id: "descend_tier3_gap2_jump_through_tap", type: "descend", fromY: 88, toY: 128, startX: 358, keys: ["Space", "tapD"], dur: 0.7, expectedY: 128 },

    // Tier 2 (y=160, standing y=128) to Tier 1 (y=200, standing y=168)
    { id: "descend_tier2_center_gap_drop_center", type: "descend", fromY: 128, toY: 168, startX: 229, keys: [], dur: 0.6, expectedY: 168 },
    { id: "descend_tier2_center_gap_walk_off_left", type: "descend", fromY: 128, toY: 168, startX: 198, keys: ["KeyD"], dur: 0.6, expectedY: 168 },
    { id: "descend_tier2_center_gap_walk_off_right", type: "descend", fromY: 128, toY: 168, startX: 280, keys: ["KeyA"], dur: 0.6, expectedY: 168 },
    { id: "descend_tier2_center_gap_jump_through_tap", type: "descend", fromY: 128, toY: 168, startX: 198, keys: ["Space", "tapD"], dur: 0.7, expectedY: 168 },

    // Tier 1 (y=200, standing y=168) to Floor (y=240, standing y=208)
    { id: "descend_tier1_gap1_drop_center", type: "descend", fromY: 168, toY: 208, startX: 77, keys: [], dur: 0.6, expectedY: 208 },
    { id: "descend_tier1_gap1_walk_off_left", type: "descend", fromY: 168, toY: 208, startX: 54, keys: ["KeyD"], dur: 0.6, expectedY: 208 },
    { id: "descend_tier1_gap1_walk_off_right", type: "descend", fromY: 168, toY: 208, startX: 122, keys: ["KeyA"], dur: 0.6, expectedY: 208 },
    { id: "descend_tier1_gap1_jump_through_tap", type: "descend", fromY: 168, toY: 208, startX: 54, keys: ["Space", "tapD"], dur: 0.7, expectedY: 208 },
    { id: "descend_tier1_gap2_drop_center", type: "descend", fromY: 168, toY: 208, startX: 381, keys: [], dur: 0.6, expectedY: 208 },
    { id: "descend_tier1_gap2_walk_off_left", type: "descend", fromY: 168, toY: 208, startX: 358, keys: ["KeyD"], dur: 0.6, expectedY: 208 },
    { id: "descend_tier1_gap2_walk_off_right", type: "descend", fromY: 168, toY: 208, startX: 426, keys: ["KeyA"], dur: 0.6, expectedY: 208 },
    { id: "descend_tier1_gap2_jump_through_tap", type: "descend", fromY: 168, toY: 208, startX: 358, keys: ["Space", "tapD"], dur: 0.7, expectedY: 208 }
  ];

  console.log(`Executando ${scenarios.length} cenários de transição em Chrome Headless...`);

  // Run suite with collider overlay OFF and then with collider overlay ON
  for (const overlay of [false, true]) {
    await client.evaluate(`window.__BOYPUNK_TEST__.setDebug(${overlay})`);

    // Capture screenshot with collider overlay ON
    if (overlay) {
      await setupPlayer(18, 208, 0, 0, true);
      await delay(200);
      const shot = await client.send("Page.captureScreenshot", { format: "png" });
      const imgBuffer = Buffer.from(shot.data, "base64");
      await mkdir(path.join(root, "evidencias"), { recursive: true });
      await writeFile(path.join(root, "evidencias", "bonus-collider-overlay.png"), imgBuffer);
      console.log("Screenshot com collider overlay salvo em evidencias/bonus-collider-overlay.png");
    }

    for (const s of scenarios) {
      // Setup player position
      await setupPlayer(s.startX, s.fromY, 0, 0, true);

      // Start recording
      const testId = `${s.id}_overlay_${overlay ? "on" : "off"}`;
      await client.evaluate(`window.__PHASE1_RECORDER__.start(${JSON.stringify(testId)})`);

      // Dispatch inputs
      const isDouble = s.keys.includes("double");
      const isTapD = s.keys.includes("tapD");
      const isTapA = s.keys.includes("tapA");
      const normalKeys = s.keys.filter(k => k !== "double" && k !== "tapD" && k !== "tapA");

      for (const k of normalKeys) {
        const code = k;
        const keyName = k === "Space" ? " " : k === "KeyD" ? "d" : "a";
        const vKeyCode = k === "Space" ? 32 : k === "KeyD" ? 68 : 65;
        await key(client, "keyDown", keyName, code, vKeyCode);
      }

      if (isTapD) {
        await key(client, "keyDown", "d", "KeyD", 68);
        await delay(120);
        await key(client, "keyUp", "d", "KeyD", 68);
      } else if (isTapA) {
        await key(client, "keyDown", "a", "KeyA", 65);
        await delay(120);
        await key(client, "keyUp", "a", "KeyA", 65);
      }

      if (isDouble) {
        await key(client, "keyDown", " ", "Space", 32);
        await key(client, "keyUp", " ", "Space", 32);
        await delay(180);
        await key(client, "keyDown", " ", "Space", 32);
        await key(client, "keyUp", " ", "Space", 32);
        await delay(Math.round((s.dur - 0.25) * 1000));
      } else {
        await delay(Math.round(s.dur * 1000));
      }

      // Release normal keys
      for (const k of normalKeys) {
        const code = k;
        const keyName = k === "Space" ? " " : k === "KeyD" ? "d" : "a";
        const vKeyCode = k === "Space" ? 32 : k === "KeyD" ? 68 : 65;
        await key(client, "keyUp", keyName, code, vKeyCode);
      }
      await delay(100);

      // Stop recording and retrieve log
      const frames = await client.evaluate("window.__PHASE1_RECORDER__.stop()");
      const finalState = await client.evaluate(`(() => {
        const m = window.__BOYPUNK_TEST__.model;
        return {
          player: {
            x: m.player.x,
            y: m.player.y,
            vx: m.player.vx,
            vy: m.player.vy,
            onGround: Boolean(m.player.onGround)
          }
        };
      })()`);

      const finalY = finalState.player.y;
      const finalGrounded = finalState.player.onGround;

      let success = false;
      let failureReason = "";

      if (s.type === "ascend") {
        if (s.expectedGroundedAtY !== undefined) {
          success = finalGrounded && Math.abs(finalY - s.expectedGroundedAtY) <= 3;
          if (!success) {
            failureReason = `Esperava repouso em y=${s.expectedGroundedAtY}, mas parou em y=${finalY.toFixed(2)} (grounded=${finalGrounded})`;
          }
        }
      } else if (s.type === "descend") {
        success = Math.abs(finalY - s.expectedY) <= 3 && finalGrounded;
        if (!success) {
          failureReason = `Esperava descida para y=${s.expectedY}, mas parou em y=${finalY.toFixed(2)} (grounded=${finalGrounded})`;
        }
      }

      const failureFrame = !success && frames.length > 0 ? frames[frames.length - 1] : null;

      report.results.push({
        scenario: testId,
        overlay,
        type: s.type,
        start: { x: s.startX, y: s.fromY },
        expectedY: s.expectedY || s.expectedGroundedAtY,
        actual: { x: Number(finalState.player.x.toFixed(2)), y: Number(finalY.toFixed(2)), grounded: finalGrounded },
        success,
        failureReason,
        failureFrame
      });

      console.log(`[${success ? "PASS" : "FAIL"}] ${testId}: ${success ? `OK (y=${finalY.toFixed(1)})` : failureReason}`);
    }
  }

  // Generate markdown table
  let mdTable = "# Tabela de Transições da Câmara de Energia (Fases 1 e 4)\n\n";
  mdTable += "| Cenário | Overlay | Tipo | Início (x, y) | Alvo y | Final (x, y) | Grounded | Status |\n";
  mdTable += "| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |\n";
  for (const r of report.results) {
    const statusIcon = r.success ? "✅ PASS" : "❌ FAIL";
    mdTable += `| \`${r.scenario}\` | ${r.overlay ? "ON" : "OFF"} | ${r.type} | (${r.start.x}, ${r.start.y}) | ${r.expectedY} | (${r.actual.x}, ${r.actual.y}) | ${r.actual.grounded} | ${statusIcon} |\n`;
  }
  await writeFile(path.join(root, "evidencias", "bonus-transitions-table.md"), mdTable);
  console.log("Tabela markdown salva em evidencias/bonus-transitions-table.md");

  // Save JSON report
  await writeFile(path.join(root, "evidencias", "phase1-browser-reproduction.json"), JSON.stringify(report, null, 2));
  console.log("Relatório da Fase 1 salvo em evidencias/phase1-browser-reproduction.json");

} finally {
  client?.close();
  chrome.kill("SIGTERM");
  serverProcess.kill("SIGTERM");
  await delay(200);
  await rm(profile, { recursive: true, force: true });
}
