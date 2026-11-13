import assert from "node:assert/strict";
import test from "node:test";
import { AudioManager } from "../src/audio.js";
import { GameModel } from "../src/core.js";
import { CoopGameModel } from "../src/coop.js";

function parameter(initial = 0) {
  return {
    value: initial,
    events: [],
    setValueAtTime(value, time) { this.value = value; this.events.push(["set", value, time]); },
    linearRampToValueAtTime(value, time) { this.value = value; this.events.push(["linear", value, time]); },
    exponentialRampToValueAtTime(value, time) { this.value = value; this.events.push(["exponential", value, time]); }
  };
}

function node() {
  return {
    connections: [],
    disconnected: false,
    connect(target) { this.connections.push(target); return target; },
    disconnect() { this.disconnected = true; }
  };
}

function audioContext() {
  const context = {
    currentTime: 4,
    sampleRate: 24000,
    destination: { kind: "destination" },
    oscillators: [],
    gains: [],
    buffersCreated: 0,
    createGain() {
      const gain = Object.assign(node(), { gain: parameter(1) });
      this.gains.push(gain);
      return gain;
    },
    createOscillator() {
      const oscillator = Object.assign(node(), {
        type: "sine",
        frequency: parameter(440),
        start() {},
        stop() {},
        onended: null
      });
      this.oscillators.push(oscillator);
      return oscillator;
    },
    createBuffer(channels, length, sampleRate) {
      this.buffersCreated += 1;
      const data = new Float32Array(length);
      return { channels, length, sampleRate, getChannelData: () => data };
    },
    createBufferSource() {
      return Object.assign(node(), { buffer: null, start() {}, stop() {} });
    },
    createBiquadFilter() {
      return Object.assign(node(), { type: "lowpass", frequency: parameter(0) });
    }
  };
  return context;
}

function manager(context = audioContext()) {
  const audio = new AudioManager(new Map());
  audio.initialized = true;
  audio.context = context;
  audio.ensureEffectsBus();
  return { audio, context };
}

test("evento confirmado identifica o personagem real no solo e no coop", () => {
  for (const characterId of ["boypunk", "support"]) {
    const model = new GameModel({ random: () => 0 });
    model.startSurvival({ characterId });
    model.enemies = [];
    model.playerAttack();
    const shot = model.consumeEvents().find((event) => event.type === "playerShotEmitted");
    assert.equal(shot.characterId, characterId);
    assert.equal(shot.sourceId, model.player.id);
    assert.equal(shot.burstIndex, 1);
  }

  const coop = new CoopGameModel({ random: () => 0 });
  coop.startCoopSurvival();
  coop.events = [];
  for (const player of coop.players) coop.withPlayerContext(player, () => coop.playerAttack());
  assert.deepEqual(
    coop.consumeEvents().filter((event) => event.type === "playerShotEmitted").map(({ characterId }) => characterId),
    ["boypunk", "support"]
  );
});

test("Rajada Dupla emite um evento por projétil e não por comando", () => {
  const model = new GameModel({ random: () => 0 });
  model.startSurvival({ characterId: "boypunk" });
  model.enemies = [];
  const burst = model.powerUps.find((item) => item.powerUpType === "double-burst");
  model.activateFloatingPowerUp(burst, model.player);
  model.events = [];
  model.playerAttack();
  assert.equal(model.events.filter((event) => event.type === "attack").length, 1);
  assert.equal(model.events.filter((event) => event.type === "playerShotEmitted").length, 1);
  model.elapsed += 1 / 120;
  model.updatePendingPlayerShots(0.12);
  const shots = model.events.filter((event) => event.type === "playerShotEmitted");
  assert.deepEqual(shots.map(({ burstIndex }) => burstIndex), [1, 2]);
  assert.equal(shots.every((event) => event.doubleBurst), true);
});

test("síntese distingue BoyPunk agudo de Nilo grave e reutiliza ruído por contexto", () => {
  const { audio, context } = manager();
  const previousRandom = Math.random;
  Math.random = () => { throw new Error("gameplay RNG não pode ser usado pelo áudio"); };
  try {
    assert.equal(audio.playPlayerShot("boypunk"), true);
    assert.equal(audio.playPlayerShot("support"), true);
  } finally {
    Math.random = previousRandom;
  }
  assert.equal(context.oscillators[0].type, "triangle");
  assert.equal(context.oscillators[1].type, "sawtooth");
  assert.ok(context.oscillators[0].frequency.events[0][1] > context.oscillators[1].frequency.events[0][1]);
  assert.equal(context.buffersCreated, 1);
  assert.equal(audio.diagnostics().weaponNoiseBufferReady, true);
});

test("barramento respeita volume/mute e limita vozes simultâneas", () => {
  const { audio, context } = manager();
  audio.setVolume(0.4);
  assert.equal(audio.effectsBus.gain.value, 0.4);
  audio.maxWeaponVoices = 1;
  assert.equal(audio.playPlayerShot("boypunk", { rapidFire: true }), true);
  assert.equal(audio.playPlayerShot("support"), false);
  assert.equal(context.oscillators.length, 1);
  audio.setMuted(true);
  assert.equal(audio.effectsBus.gain.value, 0);
  assert.equal(audio.playPlayerShot("boypunk"), false);
  assert.equal(context.oscillators.length, 1);
});

test("falha ou ausência de Web Audio não interrompe gameplay nem repete aviso", () => {
  const warnings = [];
  const previousWarn = console.warn;
  console.warn = (...args) => warnings.push(args);
  try {
    const unavailable = new AudioManager(new Map());
    unavailable.initialized = true;
    assert.doesNotThrow(() => unavailable.playPlayerShot("boypunk"));

    const brokenContext = audioContext();
    brokenContext.createOscillator = () => { throw new Error("synth unavailable"); };
    const { audio } = manager(brokenContext);
    assert.equal(audio.playPlayerShot("support"), false);
    assert.equal(audio.playPlayerShot("support"), false);
    assert.equal(warnings.length, 1);
  } finally {
    console.warn = previousWarn;
  }
});
