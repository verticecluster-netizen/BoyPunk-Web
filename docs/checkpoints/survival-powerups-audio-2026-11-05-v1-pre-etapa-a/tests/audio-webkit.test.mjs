import assert from "node:assert/strict";
import test from "node:test";
import { AudioManager } from "../src/audio.js";

test("AudioContext permanece adiado até o gesto que chama unlock", async () => {
  const PreviousAudioContext = globalThis.AudioContext;
  let constructions = 0;
  let resumes = 0;
  globalThis.AudioContext = class {
    constructor() {
      constructions += 1;
      this.state = "suspended";
    }
    resume() {
      resumes += 1;
      this.state = "running";
      return Promise.resolve();
    }
  };

  try {
    const audio = new AudioManager(new Map());
    assert.equal(constructions, 0, "construção do manager não deve tocar Web Audio");
    assert.equal(audio.context, null);
    await audio.unlock();
    assert.equal(constructions, 1);
    assert.equal(resumes, 1);
    assert.equal(audio.context.state, "running");
    await audio.unlock();
    assert.equal(constructions, 1, "gestos posteriores reutilizam o mesmo contexto");
  } finally {
    if (PreviousAudioContext === undefined) delete globalThis.AudioContext;
    else globalThis.AudioContext = PreviousAudioContext;
  }
});

test("falha de AudioContext no WebKit não interrompe a interação", async () => {
  const PreviousAudioContext = globalThis.AudioContext;
  const previousWarn = console.warn;
  const warnings = [];
  globalThis.AudioContext = class {
    constructor() { throw new Error("gesture denied"); }
  };
  console.warn = (...args) => warnings.push(args);

  try {
    const audio = new AudioManager(new Map());
    await assert.doesNotReject(audio.unlock());
    assert.equal(audio.initialized, true);
    assert.equal(audio.context, null);
    assert.equal(warnings.length, 1);
  } finally {
    console.warn = previousWarn;
    if (PreviousAudioContext === undefined) delete globalThis.AudioContext;
    else globalThis.AudioContext = PreviousAudioContext;
  }
});
