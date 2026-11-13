import assert from "node:assert/strict";
import test from "node:test";
import { GameModel } from "../src/core.js";
import { CoopGameModel } from "../src/coop.js";
import { InputController, isPrimaryMouseAttackPointer } from "../src/input.js";

const DT = 1 / 120;

class EventHub {
  constructor() {
    this.listeners = new Map();
    this.hidden = false;
  }

  addEventListener(type, handler) {
    const handlers = this.listeners.get(type) ?? [];
    handlers.push(handler);
    this.listeners.set(type, handlers);
  }

  querySelectorAll() {
    return [];
  }

  dispatch(type, init = {}) {
    const event = {
      repeat: false,
      target: null,
      preventDefault() {},
      ...init
    };
    for (const handler of this.listeners.get(type) ?? []) handler(event);
    return event;
  }
}

function withInput(callback) {
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const windowMock = new EventHub();
  const documentMock = new EventHub();
  globalThis.window = windowMock;
  globalThis.document = documentMock;
  try {
    const input = new InputController(documentMock);
    return callback({ input, windowMock, documentMock });
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
}

function gameplayModel() {
  const model = new GameModel({ random: () => 0 });
  model.startRun();
  model.nextSpawnAt = Infinity;
  model.enemies = [];
  model.souls = [];
  model.presses = [];
  return model;
}

function step(model, snapshot, frames = 1) {
  for (let frame = 0; frame < frames; frame += 1) {
    model.update(DT, frame === 0 ? snapshot : {
      ...snapshot,
      jumpPressed: false,
      attackPressed: false,
      interactPressed: false,
      pausePressed: false
    });
  }
}

test("A e D isolados liberam o eixo e a física existente encerra o deslocamento", () => {
  for (const scenario of [
    { code: "KeyA", direction: -1, field: "left" },
    { code: "KeyD", direction: 1, field: "right" }
  ]) {
    withInput(({ input, windowMock }) => {
      const model = gameplayModel();
      const startX = model.player.x;
      windowMock.dispatch("keydown", { code: scenario.code });
      const held = input.snapshot();
      assert.equal(held.horizontal, scenario.direction);
      assert.equal(held[scenario.field], true);
      step(model, held, 4);
      assert.equal(Math.sign(model.player.vx), scenario.direction);
      assert.equal(Math.sign(model.player.x - startX), scenario.direction);

      windowMock.dispatch("keyup", { code: scenario.code });
      const released = input.snapshot();
      assert.equal(released.horizontal, 0);
      assert.equal(released.left, false);
      assert.equal(released.right, false);
      step(model, released, 60);
      assert.equal(model.player.vx, 0);
      const stoppedX = model.player.x;
      step(model, released, 10);
      assert.equal(model.player.x, stoppedX, "sem tecla antiga, posição permanece parada após o atrito");
    });
  }
});

test("última direção vence e a anterior retoma ao soltar a última", () => {
  for (const scenario of [
    { first: "KeyA", second: "KeyD", secondDirection: 1, resumedDirection: -1 },
    { first: "KeyD", second: "KeyA", secondDirection: -1, resumedDirection: 1 }
  ]) {
    withInput(({ input, windowMock }) => {
      const model = gameplayModel();
      windowMock.dispatch("keydown", { code: scenario.first });
      step(model, input.snapshot(), 30);
      const velocityBeforeSwitch = model.player.vx;
      assert.equal(Math.abs(velocityBeforeSwitch), 150, "pré-condição: troca começa na velocidade máxima");

      windowMock.dispatch("keydown", { code: scenario.second });
      const switched = input.snapshot();
      assert.equal(switched.horizontal, scenario.secondDirection);
      assert.equal(switched.left, scenario.secondDirection < 0);
      assert.equal(switched.right, scenario.secondDirection > 0);
      step(model, switched);
      assert.equal(Math.sign(model.player.vx), scenario.secondDirection);
      assert.equal(Math.abs(model.player.vx), Math.abs(velocityBeforeSwitch), "a reversão não altera a velocidade");
      assert.notEqual(model.player.vx, velocityBeforeSwitch);

      windowMock.dispatch("keyup", { code: scenario.second });
      const resumed = input.snapshot();
      assert.equal(resumed.horizontal, scenario.resumedDirection);
      step(model, resumed, 12);
      assert.equal(Math.sign(model.player.vx), scenario.resumedDirection);

      windowMock.dispatch("keyup", { code: scenario.first });
      assert.equal(input.snapshot().horizontal, 0);
    });
  }
});

test("repeat não muda prioridade e atalhos da mesma direção coexistem", () => {
  withInput(({ input, windowMock }) => {
    windowMock.dispatch("keydown", { code: "KeyA" });
    windowMock.dispatch("keydown", { code: "KeyD" });
    assert.equal(input.snapshot().horizontal, 1);
    windowMock.dispatch("keydown", { code: "KeyA", repeat: true });
    assert.equal(input.snapshot().horizontal, 1, "repeat de A não rouba a prioridade de D");
    windowMock.dispatch("keyup", { code: "KeyD" });
    assert.equal(input.snapshot().horizontal, -1);
    windowMock.dispatch("keydown", { code: "ArrowLeft" });
    windowMock.dispatch("keyup", { code: "KeyA" });
    assert.equal(input.snapshot().horizontal, -1, "ArrowLeft mantém esquerda após soltar A");
    windowMock.dispatch("keyup", { code: "ArrowLeft" });
    assert.equal(input.snapshot().horizontal, 0);
  });
});

test("mouse ataca sem compor movimento e pode operar junto do teclado", () => {
  withInput(({ input, windowMock }) => {
    const model = gameplayModel();
    windowMock.dispatch("keydown", { code: "KeyD" });
    for (const clientX of [0, 480]) {
      assert.equal(isPrimaryMouseAttackPointer({
        pointerType: "mouse", isPrimary: true, button: 0, buttons: 1, clientX
      }), true);
      input.pulse("attack");
      const snapshot = input.snapshot();
      assert.equal(snapshot.horizontal, 1);
      assert.equal(snapshot.attackPressed, true);
      step(model, snapshot);
      input.consumeEdges();
    }
    assert.ok(model.player.vx > 0);
    assert.equal(model.player.facing, 1, "a direção visual acompanha o eixo, não a posição do cursor");
    const playerShots = model.projectiles.filter((shot) => shot.team === "player");
    assert.ok(playerShots.length > 0);
    assert.ok(playerShots.every((shot) => shot.vx > 0), "o mouse dispara sem inverter o deslocamento/direção");
  });
});

test("blur e transição descartam direção antiga até nova entrada válida", () => {
  withInput(({ input, windowMock, documentMock }) => {
    const model = gameplayModel();
    input.onBlur = () => model.pause();
    windowMock.dispatch("keydown", { code: "KeyA" });
    step(model, input.snapshot(), 3);
    windowMock.dispatch("blur");
    assert.equal(model.state, "paused");
    assert.equal(input.snapshot().horizontal, 0);
    windowMock.dispatch("keydown", { code: "KeyA", repeat: true });
    assert.equal(input.snapshot().horizontal, 0, "repeat órfão após blur não reativa tecla antiga");
    model.resume();
    step(model, input.snapshot(), 60);
    assert.equal(model.player.vx, 0);

    windowMock.dispatch("keydown", { code: "KeyD" });
    assert.equal(input.snapshot().horizontal, 1);
    input.consumeTransitionInput();
    assert.equal(input.snapshot().horizontal, 0);
    windowMock.dispatch("keyup", { code: "KeyD" });
    windowMock.dispatch("keydown", { code: "KeyD" });
    assert.equal(input.snapshot().horizontal, 1);

    documentMock.hidden = true;
    documentMock.dispatch("visibilitychange");
    assert.equal(input.snapshot().horizontal, 0);
  });
});

test("retry e partidas sucessivas reutilizam um único conjunto de listeners", () => {
  withInput(({ input, windowMock }) => {
    assert.equal(windowMock.listeners.get("keydown")?.length, 1);
    assert.equal(windowMock.listeners.get("keyup")?.length, 1);
    const model = gameplayModel();
    for (let run = 0; run < 5; run += 1) {
      if (run > 0) model.startRun();
      input.consumeTransitionInput();
      windowMock.dispatch("keyup", { code: "KeyA" });
      windowMock.dispatch("keydown", { code: "KeyA" });
      assert.equal(input.snapshot().horizontal, -1);
      step(model, input.snapshot());
      windowMock.dispatch("keyup", { code: "KeyA" });
      assert.equal(input.snapshot().horizontal, 0);
    }
    assert.equal(windowMock.listeners.get("keydown")?.length, 1);
    assert.equal(windowMock.listeners.get("keyup")?.length, 1);
  });
});

test("gamepad neutro não bloqueia teclado e coop mantém direção no slot autorizado", () => {
  withInput(({ input, windowMock }) => {
    const neutralProvider = {
      snapshot: () => ({ held: new Set(), pressed: new Set(), released: new Set() }),
      consumeEdges() {},
      clearActions() {},
      consumeTransitionInput() {}
    };
    input.attachPlayerProvider(1, neutralProvider);
    input.setKeyboardSlots([1]);
    windowMock.dispatch("keydown", { code: "KeyD" });
    assert.equal(input.snapshot(1).horizontal, 1);
    assert.equal(input.snapshot(2).horizontal, 0);

    const coop = new CoopGameModel({ random: () => 0 });
    coop.startCoopPreview();
    const p1Start = coop.players[0].x;
    const p2Start = coop.players[1].x;
    coop.update(DT, { players: { 1: input.snapshot(1), 2: input.snapshot(2) } });
    assert.ok(coop.players[0].x > p1Start);
    assert.equal(coop.players[1].x, p2Start);
    assert.ok(coop.players[0].vx > 0);
    assert.equal(coop.players[1].vx, 0);
  });
});
