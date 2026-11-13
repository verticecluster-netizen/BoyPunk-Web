import assert from "node:assert/strict";
import test from "node:test";
import { BALANCE } from "../src/config.js";
import { GameModel } from "../src/core.js";

const FIXED_STEP = 1 / 120;

function isolateMovement(model) {
  model.nextSpawnAt = Infinity;
  model.enemies = [];
  model.projectiles = [];
  model.souls = [];
}

function updateMovement(model, dt, input = {}) {
  isolateMovement(model);
  model.update(dt, input);
}

function runOpeningApproach({ mirrored = false } = {}) {
  const model = new GameModel({ random: () => 0.5 });
  model.startRun({ levelId: "district-neon" });
  isolateMovement(model);

  if (mirrored) {
    for (let frame = 0; frame < 400; frame += 1) {
      updateMovement(model, FIXED_STEP, { right: true });
    }
    for (let frame = 0; frame < 30; frame += 1) updateMovement(model, FIXED_STEP);
  }

  const direction = mirrored ? "left" : "right";
  const approachFrames = mirrored ? 73 : 30;
  for (let frame = 0; frame < approachFrames; frame += 1) {
    updateMovement(model, FIXED_STEP, { [direction]: true });
  }
  for (let frame = 0; frame < 60; frame += 1) {
    const input = { jumpHeld: true };
    if (!mirrored || frame >= 6) input[direction] = true;
    if (frame === 0 || frame === 50) input.jumpPressed = true;
    updateMovement(model, FIXED_STEP, input);
  }

  const release = {
    x: model.player.x,
    y: model.player.y,
    vx: model.player.vx,
    vy: model.player.vy
  };
  for (let frame = 0; frame < 180; frame += 1) {
    updateMovement(model, FIXED_STEP);
  }
  return { model, release };
}

test("entrada diagonal pela abertura do Distrito pousa no platô sem prender no canto", () => {
  for (const mirrored of [false, true]) {
    const { model, release } = runOpeningApproach({ mirrored });
    assert.ok(
      mirrored ? release.x < 304 : release.x + model.player.w > 144,
      `o passo de entrada ${mirrored ? "direito→esquerdo" : "esquerdo→direito"} deve cruzar o canto físico`
    );
    assert.equal(release.vx, mirrored ? -BALANCE.player.maxSpeed : BALANCE.player.maxSpeed);
    assert.equal(model.player.y, 144, "o jogador deve aterrissar no platô central y=176");
    assert.equal(model.player.onGround, true);
  }
});

test("correção de canto respeita a ordem temporal em timesteps aceitos pelo modelo", () => {
  const platform = { x: 144, y: 176, w: 160, h: 16, oneWay: false };
  for (const dt of [1 / 120, 1 / 60, 1 / 30, 0.05]) {
    const model = new GameModel();
    model.startRun({ levelId: "district-neon" });
    const dx = BALANCE.player.maxSpeed * dt;
    const dy = -200 * dt;
    model.player.x = platform.x - model.player.w - dx * 0.75;
    model.player.y = platform.y - model.player.h + (-dy) * 0.25;
    model.player.vx = BALANCE.player.maxSpeed;
    model.player.vy = -200;

    const result = model.moveBody(model.player, dt);

    assert.equal(result.hitX, false, `a saída vertical precede a entrada lateral em dt=${dt}`);
    assert.ok(model.player.x + model.player.w > platform.x);
    assert.ok(model.player.y + model.player.h < platform.y);
    assert.equal(model.player.vx, BALANCE.player.maxSpeed);
  }
});

test("paredes e face inferior sólidas continuam bloqueando", () => {
  const model = new GameModel();
  model.startRun({ levelId: "district-neon" });

  model.player.x = 17;
  model.player.y = 176;
  model.player.vx = -BALANCE.player.maxSpeed;
  model.player.vy = 0;
  const wall = model.moveBody(model.player, FIXED_STEP);
  assert.equal(wall.hitX, true);
  assert.ok(model.player.x >= 16);

  model.player.x = 200;
  model.player.y = 192;
  model.player.vx = 0;
  model.player.vy = -200;
  const underside = model.moveBody(model.player, FIXED_STEP);
  assert.equal(underside.hitY, true);
  assert.equal(model.player.y, 192);
  assert.equal(model.player.vy, 0);
});

test("pouso no platô é estável e a descida pela abertura permanece válida", () => {
  const model = new GameModel();
  model.startRun({ levelId: "district-neon" });
  isolateMovement(model);
  model.player.x = 220;
  model.player.y = 130;
  model.player.vx = 0;
  model.player.vy = 120;
  model.player.onGround = false;

  for (let frame = 0; frame < 60; frame += 1) updateMovement(model, FIXED_STEP);
  assert.equal(model.player.y, 144);
  assert.equal(model.player.onGround, true);
  for (let frame = 0; frame < 30; frame += 1) {
    updateMovement(model, FIXED_STEP);
    assert.equal(model.player.y, 144, "o pouso não deve oscilar nem repetir snapping");
    assert.equal(model.player.onGround, true);
  }

  for (let frame = 0; frame < 180 && model.player.y < 208; frame += 1) {
    updateMovement(model, FIXED_STEP, { right: true });
  }
  assert.equal(model.player.y, 208);
  assert.equal(model.player.onGround, true);
});
