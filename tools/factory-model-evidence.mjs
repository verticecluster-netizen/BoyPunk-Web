import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GameModel } from "../src/core.js";
import { createSeededRandom } from "../src/demo.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const destination = path.join(root, "evidencias", "runtime-scrap-factory-20261025", "model-sequence.json");
const fixedStep = 1 / 120;
const samples = [];

function record(label, model, extra = {}) {
  samples.push({
    sequenceSeconds: Number(model.elapsed.toFixed(3)),
    label,
    input: extra.input ?? null,
    snapshot: model.snapshot()
  });
}

function step(model, seconds, input = {}) {
  const count = Math.ceil(seconds / fixedStep);
  for (let index = 0; index < count; index += 1) model.update(fixedStep, input);
}

function isolatedFactory() {
  const model = new GameModel({ random: createSeededRandom(0x53435250) });
  model.startRun({ levelId: "scrap-factory", progressionEligible: false });
  model.nextSpawnAt = Infinity;
  model.enemies = [];
  model.projectiles = [];
  model.souls = [];
  return model;
}

const route = isolatedFactory();
record("route-start-safe", route);
step(route, 1.5, { right: true });
record("press-crossed-during-initial-idle", route, { input: "right 1.5 s" });
route.update(fixedStep, { right: true, jumpPressed: true });
step(route, 0.18, { right: true });
route.update(fixedStep, { right: true, jumpPressed: true });
step(route, 0.65, { right: true });
step(route, 0.3);
record("landed-lower-right", route, { input: "right + double jump" });
route.update(fixedStep, { left: true, jumpPressed: true });
step(route, 0.18, { left: true });
route.update(fixedStep, { left: true, jumpPressed: true });
step(route, 0.65, { left: true });
step(route, 0.3);
record("landed-optional-elevated-route", route, { input: "left + double jump" });

const hazard = isolatedFactory();
step(hazard, 0.9, { right: true });
record("approached-press-by-movement", hazard, { input: "right 0.9 s" });
let previousPhase = hazard.presses[0].phase;
let paused = false;
while (hazard.state === "playing" && hazard.elapsed < 7 && hazard.player.life === 4) {
  hazard.update(fixedStep, {});
  const currentPhase = hazard.presses[0].phase;
  if (currentPhase !== previousPhase) {
    record(`press-${currentPhase}`, hazard);
    previousPhase = currentPhase;
  }
  if (!paused && currentPhase === "warning") {
    hazard.pause();
    const before = hazard.snapshot();
    step(hazard, 1);
    samples.push({ sequenceSeconds: Number(hazard.elapsed.toFixed(3)), label: "pause-freezes-warning", input: null, before, snapshot: hazard.snapshot() });
    hazard.resume();
    paused = true;
  }
}
record("press-contact-on-closing", hazard);
step(hazard, 1.5);
record("press-recovery-no-extra-damage", hazard);

const victory = isolatedFactory();
victory.souls = Array.from({ length: victory.objective.soulsGoal }, () => ({
  x: victory.player.x, y: victory.player.y, w: 15, h: 16,
  bornAt: victory.elapsed, source: "evidence", removed: false
}));
victory.update(fixedStep, {});
record("objective-collected", victory);
victory.player.x = victory.altar.x;
victory.player.y = 208;
victory.update(fixedStep, { interactPressed: true });
record("objective-deposited-victory-committed", victory, { input: "interact" });

const report = {
  evidenceType: "deterministic-model-runtime-not-browser",
  generatedAt: new Date().toISOString(),
  fixedStepSeconds: fixedStep,
  levelId: "scrap-factory",
  note: "Movimento, saltos, fases, pausa, dano, coleta e depósito passam pelo GameModel compartilhado. Spawns foram suspensos para isolar geometria e prensa.",
  samples
};

await mkdir(path.dirname(destination), { recursive: true });
await writeFile(destination, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${destination}\n${samples.length} amostras\n`);
