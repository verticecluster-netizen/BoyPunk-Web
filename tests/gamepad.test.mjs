import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  DEFAULT_GAMEPAD_DEAD_ZONE,
  GAMEPAD_STORAGE_KEY,
  GamepadManager,
  GamepadNavigationRepeater,
  GamepadPreferencesStore,
  validateGamepadPreferences
} from "../src/gamepad.js";
import { InputController } from "../src/input.js";

class MemoryStorage {
  constructor(entries = {}) { this.values = new Map(Object.entries(entries)); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, value); }
}

function makePad({ index = 0, id = "Mock Standard", mapping = "standard", buttonCount = 16, axes = [0, 0] } = {}) {
  return {
    index,
    id,
    mapping,
    connected: true,
    buttons: Array.from({ length: buttonCount }, () => ({ pressed: false, value: 0 })),
    axes: [...axes]
  };
}

function setButton(pad, index, down) {
  pad.buttons[index] = { pressed: down, value: down ? 1 : 0 };
}

function harness(pads = []) {
  const navigatorRef = { getGamepads: () => pads };
  const preferences = new GamepadPreferencesStore(new MemoryStorage());
  const manager = new GamepadManager({ navigatorRef, preferences });
  return { manager, preferences, pads, navigatorRef };
}

function activate(manager, pad, button = 0) {
  manager.poll();
  setButton(pad, button, true);
  manager.poll();
  setButton(pad, button, false);
  manager.poll();
  manager.consumeEdges();
}

test("mapeamento standard preserva simultaneamente analógico, pulo, ataque e depósito", () => {
  const pad = makePad();
  const { manager } = harness([pad]);
  activate(manager, pad);
  pad.axes[0] = -0.7;
  setButton(pad, 0, true);
  setButton(pad, 2, true);
  setButton(pad, 3, true);
  manager.poll();
  const state = manager.snapshot();
  assert.deepEqual([...state.held].sort(), ["attack", "confirm", "interact", "jump", "left"].sort());
  assert.ok(state.pressed.has("jump"));
  assert.ok(state.pressed.has("attack"));
  manager.consumeEdges();
  manager.poll();
  assert.equal(manager.snapshot().pressed.size, 0, "botão mantido não repete borda");
  setButton(pad, 0, false);
  manager.poll();
  assert.ok(manager.snapshot().released.has("jump"));
});

test("D-pad, cancelar e start seguem o mapeamento standard", () => {
  const pad = makePad();
  const { manager } = harness([pad]);
  activate(manager, pad);
  setButton(pad, 12, true);
  setButton(pad, 14, true);
  setButton(pad, 1, true);
  setButton(pad, 9, true);
  manager.poll();
  const held = manager.snapshot().held;
  assert.ok(held.has("menuUp"));
  assert.ok(held.has("left"));
  assert.ok(held.has("cancel"));
  assert.ok(held.has("pause"));
});

test("zona morta ignora deriva e só registra atividade significativa", () => {
  const pad = makePad();
  const { manager, preferences } = harness([pad]);
  activate(manager, pad);
  preferences.setDeadZone(0.25);
  pad.axes[0] = 0.19;
  pad.axes[1] = -0.2;
  manager.poll();
  assert.equal(manager.snapshot().held.size, 0);
  assert.equal(manager.takeMeaningfulActivity(), false);
  pad.axes[0] = 0.4;
  manager.poll();
  assert.ok(manager.snapshot().held.has("right"));
  assert.equal(manager.takeMeaningfulActivity(), true);
});

test("controle genérico exige captura deliberada entre estados neutros", () => {
  const pad = makePad({ id: "Generic USB", mapping: "", buttonCount: 8, axes: [0, 0, 0] });
  const { manager, preferences } = harness([pad]);
  manager.poll();
  const runtimeId = manager.connectionList()[0].runtimeId;
  manager.selectConnection(runtimeId);
  manager.poll();
  assert.equal(preferences.profile(manager.activeConnection().deviceKey).buttons.jump, null, "layout não é adivinhado");

  assert.equal(manager.beginButtonCapture("jump"), true);
  manager.poll();
  setButton(pad, 5, true);
  manager.poll();
  assert.equal(preferences.profile(manager.activeConnection().deviceKey).buttons.jump, 5);
  const captures = manager.drainEvents().filter((event) => event.type === "captureComplete");
  assert.equal(captures.length, 1);
  manager.poll();
  assert.equal(manager.snapshot().pressed.size, 0, "botão ainda mantido não atravessa a captura");
  setButton(pad, 5, false);
  manager.poll();
  setButton(pad, 5, true);
  manager.poll();
  assert.ok(manager.snapshot().pressed.has("jump"));
  assert.ok(manager.snapshot().pressed.has("confirm"));
  setButton(pad, 5, false);
  manager.poll();
  preferences.setButton(manager.activeConnection().deviceKey, "left", 1);
  setButton(pad, 1, true);
  manager.poll();
  assert.ok(manager.snapshot().held.has("left"), "D-pad genérico exposto como botão também pode ser mapeado");
});

test("captura de eixos genéricos seleciona índice e inversão é persistida", () => {
  const pad = makePad({ id: "Generic Axes", mapping: "", axes: [0, 0, 0] });
  const { manager, preferences } = harness([pad]);
  manager.poll();
  manager.selectConnection(manager.connectionList()[0].runtimeId);
  manager.poll();
  manager.beginAxisCapture("horizontal");
  manager.poll();
  pad.axes[2] = -0.9;
  manager.poll();
  const key = manager.activeConnection().deviceKey;
  assert.equal(preferences.profile(key).horizontalAxis, 2);
  preferences.setAxisInverted(key, "horizontal", true);
  pad.axes[2] = 0;
  manager.poll();
  pad.axes[2] = 0.8;
  manager.poll();
  assert.ok(manager.snapshot().held.has("left"), "eixo horizontal invertido move para esquerda");
});

test("captura direcional aceita eixo ou D-pad em botões sem adivinhar layout", () => {
  const pad = makePad({ id: "Generic Direction", mapping: "", buttonCount: 10, axes: [0, 0] });
  const { manager, preferences } = harness([pad]);
  manager.poll();
  manager.selectConnection(manager.connectionList()[0].runtimeId);
  manager.poll();
  const key = manager.activeConnection().deviceKey;
  for (const [action, index] of Object.entries({ jump: 0, attack: 1, interact: 2, cancel: 3, pause: 4 })) {
    preferences.setButton(key, action, index);
  }
  manager.beginDirectionCapture("right", "horizontal", 1);
  manager.poll();
  pad.axes[0] = -0.9;
  manager.poll();
  assert.equal(preferences.profile(key).horizontalAxis, 0);
  assert.equal(preferences.profile(key).invertHorizontal, true, "sentido capturado define inversão necessária");

  pad.axes[0] = 0;
  manager.poll();
  manager.beginDirectionCapture("menuDown", "vertical", 1);
  manager.poll();
  setButton(pad, 6, true);
  manager.poll();
  assert.equal(preferences.profile(key).buttons.menuDown, 6);
  setButton(pad, 6, false);
  manager.poll();
  preferences.setButton(key, "menuUp", 7);
  assert.equal(preferences.profileConfigured(key), true);
});

test("dois controles não são mesclados e propriedade fica explícita", () => {
  const first = makePad({ index: 1, id: "Pad A" });
  const second = makePad({ index: 4, id: "Pad B" });
  const { manager } = harness([first, second]);
  manager.poll();
  setButton(first, 0, true);
  manager.poll();
  const owner = manager.activeConnection();
  assert.equal(owner.id, "Pad A");
  setButton(first, 0, false);
  manager.poll();
  setButton(second, 2, true);
  manager.poll();
  assert.equal(manager.snapshot().held.has("attack"), false, "controle não atribuído não injeta ações");
  assert.equal(manager.activeConnection().runtimeId, owner.runtimeId);
});

test("desconexão limpa ações e índice reutilizado cria nova conexão", () => {
  const pad = makePad({ index: 2, id: "Original" });
  const state = harness([pad]);
  activate(state.manager, pad);
  setButton(pad, 15, true);
  state.manager.poll();
  const oldRuntime = state.manager.activeConnection().runtimeId;
  state.pads.splice(0);
  state.manager.poll();
  assert.equal(state.manager.activeConnection(), null);
  assert.equal(state.manager.snapshot().held.size, 0);
  assert.ok(state.manager.drainEvents().some((event) => event.type === "disconnected" && event.active));

  const replacement = makePad({ index: 2, id: "Replacement" });
  state.pads.push(replacement);
  state.manager.poll();
  const newRuntime = state.manager.connectionList()[0].runtimeId;
  assert.notEqual(newRuntime, oldRuntime);
  assert.equal(state.manager.activeConnection(), null, "índice reaproveitado não herda propriedade");
});

test("preferência usa identidade estável, não índice transitório", () => {
  const storage = new MemoryStorage();
  const pad = makePad({ index: 7, id: "Persistent Pad" });
  const firstStore = new GamepadPreferencesStore(storage);
  const first = new GamepadManager({ navigatorRef: { getGamepads: () => [pad] }, preferences: firstStore });
  activate(first, pad);
  const savedKey = firstStore.state.selectedDeviceKey;
  assert.ok(savedKey.includes("Persistent Pad"));
  assert.doesNotMatch(savedKey, /index/i);

  const reconnected = makePad({ index: 1, id: "Persistent Pad" });
  const secondStore = new GamepadPreferencesStore(storage);
  const second = new GamepadManager({ navigatorRef: { getGamepads: () => [reconnected] }, preferences: secondStore });
  second.poll();
  assert.equal(second.activeConnection()?.index, 1, "identidade salva pode reassumir em outro índice");
});

test("API ausente mantém snapshot neutro e mensagem útil", () => {
  const manager = new GamepadManager({ navigatorRef: {}, preferences: new GamepadPreferencesStore(null) });
  assert.equal(manager.available, false);
  assert.equal(manager.snapshot().held.size, 0);
  assert.match(manager.statusText(), /API indisponível/);
});

test("navegação repete de forma controlada e confirmação não repete enquanto mantida", () => {
  const repeat = new GamepadNavigationRepeater({ initialDelay: 300, repeatDelay: 100 });
  const held = new Set(["menuDown", "confirm"]);
  const pressed = new Set(["menuDown", "confirm"]);
  assert.deepEqual(repeat.update({ held, pressed }, 0), ["down", "confirm"]);
  assert.deepEqual(repeat.update({ held, pressed: new Set() }, 200), []);
  assert.deepEqual(repeat.update({ held, pressed: new Set() }, 300), ["down"]);
  assert.deepEqual(repeat.update({ held, pressed: new Set() }, 400), ["down"]);
  assert.deepEqual(repeat.update({ held: new Set(), pressed: new Set() }, 450), []);
});

test("consumo de transição exige soltura antes de uma nova ação", () => {
  const pad = makePad();
  const { manager } = harness([pad]);
  activate(manager, pad);
  setButton(pad, 0, true);
  manager.poll();
  assert.ok(manager.snapshot().pressed.has("confirm"));
  manager.consumeTransitionInput();
  manager.poll();
  assert.equal(manager.snapshot().held.size, 0, "botão mantido não cruza a transição");
  setButton(pad, 0, false);
  manager.poll();
  setButton(pad, 0, true);
  manager.poll();
  assert.ok(manager.snapshot().pressed.has("confirm"), "nova pressão deliberada volta a funcionar");
});

test("perfil validado persiste separadamente e rejeita valores perigosos", () => {
  const storage = new MemoryStorage();
  const store = new GamepadPreferencesStore(storage);
  store.setDeadZone(0.31);
  store.setButton("pad-key", "attack", 4);
  assert.ok(storage.getItem(GAMEPAD_STORAGE_KEY));
  const restored = new GamepadPreferencesStore(storage);
  assert.equal(restored.state.deadZone, 0.31);
  assert.equal(restored.profile("pad-key").buttons.attack, 4);
  assert.equal(validateGamepadPreferences({ ...restored.exportData(), deadZone: 2 }), null);
  assert.equal(DEFAULT_GAMEPAD_DEAD_ZONE, 0.22);
});

test("storage indisponível mantém configuração útil na sessão", () => {
  const blocked = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
  const store = new GamepadPreferencesStore(blocked);
  assert.equal(store.storageStatus, "unavailable");
  assert.equal(store.setDeadZone(0.28), false);
  store.setButton("generic", "attack", 6);
  assert.equal(store.state.deadZone, 0.28);
  assert.equal(store.profile("generic").buttons.attack, 6);
});

test("InputController agrega somente o provedor associado ao slot solicitado", () => {
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const target = { addEventListener() {}, hidden: false, querySelectorAll() { return []; } };
  globalThis.window = target;
  globalThis.document = target;
  try {
    const input = new InputController(target);
    const provider1 = {
      snapshot: () => ({ held: new Set(["right", "jump"]), pressed: new Set(["jump"]), released: new Set() }),
      consumeEdges() {}, clearActions() {}, consumeTransitionInput() {}
    };
    const provider2 = {
      snapshot: () => ({ held: new Set(["left", "attack"]), pressed: new Set(["attack"]), released: new Set() }),
      consumeEdges() {}, clearActions() {}, consumeTransitionInput() {}
    };
    input.attachPlayerProvider(1, provider1);
    input.attachPlayerProvider(2, provider2);
    assert.deepEqual(input.snapshot(1), {
      left: false, right: true, jumpPressed: true, jumpHeld: true,
      attackPressed: false, interactPressed: false, pausePressed: false
    });
    assert.deepEqual(input.snapshot(2), {
      left: true, right: false, jumpPressed: false, jumpHeld: false,
      attackPressed: true, interactPressed: false, pausePressed: false
    });
  } finally {
    if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow;
    if (previousDocument === undefined) delete globalThis.document; else globalThis.document = previousDocument;
  }
});

test("opções expõem seleção, feedback, remapeamento, eixos e restauração em português", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const main = await readFile(new URL("../src/main.js", import.meta.url), "utf8");
  assert.match(html, /id="controller-device"/);
  assert.match(html, /id="controller-live"/);
  assert.match(html, /id="controller-dead-zone"/);
  assert.match(html, /data-controller-ui="guided-map"/);
  assert.match(html, /data-controller-ui="restore-defaults"/);
  for (const action of ["left", "right", "menuUp", "menuDown", "jump", "attack", "interact", "cancel", "pause"]) {
    assert.match(html, new RegExp(`data-gamepad-bind="${action}"`));
  }
  assert.match(html, /não habilita hardware que o sistema operacional ou o navegador não exponha/);
  assert.match(main, /handleGamepadFrame\(time\)/, "polling deve fazer parte do requestAnimationFrame");
  assert.match(main, /event\.type === "disconnected"/);
  assert.match(main, /director\.active && meaningful/);
  assert.match(main, /profileConfigured\(active\.deviceKey\)/, "genérico incompleto deve abrir configuração guiada no menu");
});
