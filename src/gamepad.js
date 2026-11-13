export const GAMEPAD_STORAGE_KEY = "boypunk-web-gamepad-v1";
export const GAMEPAD_SCHEMA_VERSION = 1;
export const DEFAULT_GAMEPAD_DEAD_ZONE = 0.22;

export const GAMEPAD_BINDING_LABELS = Object.freeze({
  left: "Mover à esquerda",
  right: "Mover à direita",
  menuUp: "Menu para cima",
  menuDown: "Menu para baixo",
  jump: "Confirmar / pular",
  attack: "Atacar",
  interact: "Depositar",
  ability: "Habilidade de Nilo",
  cancel: "Cancelar / voltar",
  pause: "Pausar / continuar"
});

const BINDING_ACTIONS = Object.freeze(Object.keys(GAMEPAD_BINDING_LABELS));
const MAX_BUTTONS = 64;
const MAX_AXES = 16;

function browserStorage() {
  try { return globalThis.localStorage ?? null; }
  catch { return null; }
}

function emptyProfile() {
  return {
    buttons: {
      left: null, right: null, menuUp: null, menuDown: null,
      jump: null, attack: null, interact: null, ability: null, cancel: null, pause: null
    },
    horizontalAxis: null,
    verticalAxis: null,
    invertHorizontal: false,
    invertVertical: false
  };
}

function defaultPreferences() {
  return {
    version: GAMEPAD_SCHEMA_VERSION,
    deadZone: DEFAULT_GAMEPAD_DEAD_ZONE,
    selectedDeviceKey: "",
    profiles: {}
  };
}

function validIndex(value, maximum) {
  return value === null || (Number.isInteger(value) && value >= 0 && value < maximum);
}

export function validateGamepadProfile(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (!value.buttons || typeof value.buttons !== "object" || Array.isArray(value.buttons)) return null;
  const buttons = {};
  for (const action of BINDING_ACTIONS) {
    const index = value.buttons[action] ?? null;
    if (!validIndex(index, MAX_BUTTONS)) return null;
    buttons[action] = index;
  }
  if (!validIndex(value.horizontalAxis, MAX_AXES) || !validIndex(value.verticalAxis, MAX_AXES)) return null;
  if (typeof value.invertHorizontal !== "boolean" || typeof value.invertVertical !== "boolean") return null;
  return {
    buttons,
    horizontalAxis: value.horizontalAxis,
    verticalAxis: value.verticalAxis,
    invertHorizontal: value.invertHorizontal,
    invertVertical: value.invertVertical
  };
}

export function validateGamepadPreferences(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (value.version !== GAMEPAD_SCHEMA_VERSION) return null;
  if (!Number.isFinite(value.deadZone) || value.deadZone < 0.08 || value.deadZone > 0.6) return null;
  if (typeof value.selectedDeviceKey !== "string" || value.selectedDeviceKey.length > 256) return null;
  if (!value.profiles || typeof value.profiles !== "object" || Array.isArray(value.profiles)) return null;
  const profiles = {};
  for (const [deviceKey, profile] of Object.entries(value.profiles)) {
    if (!deviceKey || deviceKey.length > 256) return null;
    const validated = validateGamepadProfile(profile);
    if (!validated) return null;
    profiles[deviceKey] = validated;
  }
  return {
    version: GAMEPAD_SCHEMA_VERSION,
    deadZone: value.deadZone,
    selectedDeviceKey: value.selectedDeviceKey,
    profiles
  };
}

export function gamepadDeviceKey(gamepad) {
  const id = String(gamepad?.id ?? "Controle sem identificação").trim().slice(0, 180);
  const mapping = gamepad?.mapping === "standard" ? "standard" : "generic";
  const buttons = Number.isInteger(gamepad?.buttons?.length) ? gamepad.buttons.length : 0;
  const axes = Number.isInteger(gamepad?.axes?.length) ? gamepad.axes.length : 0;
  return `${id}|${mapping}|b${buttons}|a${axes}`;
}

export class GamepadPreferencesStore {
  constructor(storage = browserStorage()) {
    this.storage = storage;
    this.memoryOnly = storage?.persistent === false;
    this.state = defaultPreferences();
    this.storageStatus = storage ? (this.memoryOnly ? "memory" : "available") : "unavailable";
    this.warning = storage && !this.memoryOnly ? "" : "As configurações de controle valerão somente nesta sessão.";
    this.load();
  }

  load() {
    if (!this.storage) return this.snapshot();
    try {
      const raw = this.storage.getItem(GAMEPAD_STORAGE_KEY);
      if (raw === null) return this.snapshot();
      const validated = validateGamepadPreferences(JSON.parse(raw));
      if (!validated) {
        this.storageStatus = "malformed";
        this.warning = "A configuração de controle salva era inválida e foi ignorada.";
        return this.snapshot();
      }
      this.state = validated;
    } catch {
      this.storageStatus = "unavailable";
      this.warning = "As configurações de controle valerão somente nesta sessão.";
    }
    return this.snapshot();
  }

  persist() {
    if (!this.storage || this.storageStatus === "unavailable") return false;
    try {
      this.storage.setItem(GAMEPAD_STORAGE_KEY, JSON.stringify(this.state));
      this.storageStatus = this.memoryOnly ? "memory" : "available";
      this.warning = this.memoryOnly ? "As configurações de controle valerão somente nesta sessão." : "";
      return !this.memoryOnly;
    } catch {
      this.storageStatus = "unavailable";
      this.warning = "As configurações de controle valerão somente nesta sessão.";
      return false;
    }
  }

  ensureProfile(deviceKey) {
    if (!this.state.profiles[deviceKey]) {
      this.state = {
        ...this.state,
        profiles: { ...this.state.profiles, [deviceKey]: emptyProfile() }
      };
    }
    return this.state.profiles[deviceKey];
  }

  selectDevice(deviceKey) {
    this.state = { ...this.state, selectedDeviceKey: String(deviceKey ?? "") };
    return this.persist();
  }

  setDeadZone(value) {
    const deadZone = Math.max(0.08, Math.min(0.6, Number(value)));
    if (!Number.isFinite(deadZone)) return false;
    this.state = { ...this.state, deadZone };
    return this.persist();
  }

  setButton(deviceKey, action, index) {
    if (!BINDING_ACTIONS.includes(action) || !validIndex(index, MAX_BUTTONS)) return false;
    const profile = this.ensureProfile(deviceKey);
    this.state = {
      ...this.state,
      profiles: {
        ...this.state.profiles,
        [deviceKey]: { ...profile, buttons: { ...profile.buttons, [action]: index } }
      }
    };
    return this.persist();
  }

  setAxis(deviceKey, orientation, index) {
    if (!validIndex(index, MAX_AXES) || !["horizontal", "vertical"].includes(orientation)) return false;
    const profile = this.ensureProfile(deviceKey);
    const key = orientation === "horizontal" ? "horizontalAxis" : "verticalAxis";
    this.state = { ...this.state, profiles: { ...this.state.profiles, [deviceKey]: { ...profile, [key]: index } } };
    return this.persist();
  }

  setAxisInverted(deviceKey, orientation, inverted) {
    if (!["horizontal", "vertical"].includes(orientation)) return false;
    const profile = this.ensureProfile(deviceKey);
    const key = orientation === "horizontal" ? "invertHorizontal" : "invertVertical";
    this.state = { ...this.state, profiles: { ...this.state.profiles, [deviceKey]: { ...profile, [key]: Boolean(inverted) } } };
    return this.persist();
  }

  resetDevice(deviceKey) {
    const profiles = { ...this.state.profiles };
    delete profiles[deviceKey];
    this.state = { ...this.state, deadZone: DEFAULT_GAMEPAD_DEAD_ZONE, profiles };
    return this.persist();
  }

  profile(deviceKey) {
    const profile = this.state.profiles[deviceKey];
    return profile ? validateGamepadProfile(profile) : emptyProfile();
  }

  profileConfigured(deviceKey) {
    const profile = this.profile(deviceKey);
    const buttonsReady = ["jump", "attack", "interact", "cancel", "pause"]
      .every((action) => Number.isInteger(profile.buttons[action]));
    const horizontalReady = Number.isInteger(profile.horizontalAxis)
      || (Number.isInteger(profile.buttons.left) && Number.isInteger(profile.buttons.right));
    const verticalReady = Number.isInteger(profile.verticalAxis)
      || (Number.isInteger(profile.buttons.menuUp) && Number.isInteger(profile.buttons.menuDown));
    return buttonsReady && horizontalReady && verticalReady;
  }

  exportData() {
    return JSON.parse(JSON.stringify(this.state));
  }

  applyImportedPreferences(value) {
    const imported = validateGamepadPreferences(value);
    if (!imported) return { valid: false, persisted: false };
    this.state = {
      ...imported,
      profiles: { ...this.state.profiles, ...imported.profiles }
    };
    return { valid: true, persisted: this.persist() };
  }

  snapshot() {
    return {
      ...this.exportData(),
      storageStatus: this.storageStatus,
      persistent: this.storageStatus === "available",
      warning: this.warning
    };
  }
}

function buttonDown(button) {
  return Boolean(button?.pressed) || Number(button?.value ?? 0) >= 0.55;
}

function axisValue(gamepad, index, inverted = false) {
  if (!Number.isInteger(index)) return 0;
  const raw = Number(gamepad?.axes?.[index] ?? 0);
  if (!Number.isFinite(raw)) return 0;
  return Math.max(-1, Math.min(1, inverted ? -raw : raw));
}

function padNeutral(gamepad, threshold) {
  const buttonsNeutral = [...(gamepad?.buttons ?? [])].every((button) => Number(button?.value ?? 0) < 0.2 && !button?.pressed);
  const axesNeutral = [...(gamepad?.axes ?? [])].every((axis) => Math.abs(Number(axis) || 0) < threshold);
  return buttonsNeutral && axesNeutral;
}

function addButtonAction(held, gamepad, buttonIndex, action) {
  if (Number.isInteger(buttonIndex) && buttonDown(gamepad.buttons?.[buttonIndex])) held.add(action);
}

function standardActions(gamepad, deadZone) {
  const held = new Set();
  const horizontal = axisValue(gamepad, 0);
  const vertical = axisValue(gamepad, 1);
  if (horizontal < -deadZone || buttonDown(gamepad.buttons?.[14])) held.add("left");
  if (horizontal > deadZone || buttonDown(gamepad.buttons?.[15])) held.add("right");
  if (vertical < -deadZone || buttonDown(gamepad.buttons?.[12])) held.add("menuUp");
  if (vertical > deadZone || buttonDown(gamepad.buttons?.[13])) held.add("menuDown");
  addButtonAction(held, gamepad, 0, "jump");
  addButtonAction(held, gamepad, 0, "confirm");
  addButtonAction(held, gamepad, 2, "attack");
  addButtonAction(held, gamepad, 3, "interact");
  addButtonAction(held, gamepad, 4, "ability");
  addButtonAction(held, gamepad, 1, "cancel");
  addButtonAction(held, gamepad, 9, "pause");
  return held;
}

function genericActions(gamepad, profile, deadZone) {
  const held = new Set();
  const horizontal = axisValue(gamepad, profile.horizontalAxis, profile.invertHorizontal);
  const vertical = axisValue(gamepad, profile.verticalAxis, profile.invertVertical);
  if (horizontal < -deadZone) held.add("left");
  if (horizontal > deadZone) held.add("right");
  if (vertical < -deadZone) held.add("menuUp");
  if (vertical > deadZone) held.add("menuDown");
  for (const action of BINDING_ACTIONS) addButtonAction(held, gamepad, profile.buttons[action], action);
  if (held.has("jump")) held.add("confirm");
  return held;
}

export class GamepadManager {
  constructor({ navigatorRef = globalThis.navigator, preferences = new GamepadPreferencesStore() } = {}) {
    this.navigator = navigatorRef;
    this.preferences = preferences;
    this.available = typeof navigatorRef?.getGamepads === "function";
    this.connections = new Map();
    this.activeRuntimeId = null;
    this.nextRuntimeId = 1;
    this.held = new Set();
    this.pressed = new Set();
    this.released = new Set();
    this.events = [];
    this.activityPulse = false;
    this.suspendedUntilNeutral = true;
    this.capture = null;
    this.lastStatus = "";
    if (!this.available) this.events.push({ type: "unavailable" });
  }

  connectionList() {
    return [...this.connections.values()].map((record) => ({
      runtimeId: record.runtimeId,
      index: record.index,
      id: record.id,
      deviceKey: record.deviceKey,
      mapping: record.mapping,
      buttons: record.gamepad.buttons?.length ?? 0,
      axes: record.gamepad.axes?.length ?? 0,
      active: record.runtimeId === this.activeRuntimeId
    }));
  }

  activeConnection() {
    return [...this.connections.values()].find((record) => record.runtimeId === this.activeRuntimeId) ?? null;
  }

  addConnection(gamepad) {
    const record = {
      runtimeId: `pad-${this.nextRuntimeId++}`,
      index: gamepad.index,
      id: String(gamepad.id || "Controle sem identificação"),
      deviceKey: gamepadDeviceKey(gamepad),
      mapping: gamepad.mapping === "standard" ? "standard" : "generic",
      gamepad,
      rawButtons: [...gamepad.buttons].map(buttonDown),
      rawAxes: [...gamepad.axes],
      awaitingNeutral: !padNeutral(gamepad, this.preferences.state.deadZone)
    };
    this.connections.set(gamepad.index, record);
    this.events.push({ type: "connected", connection: { ...record, gamepad: undefined } });
    if (!this.activeRuntimeId && record.deviceKey === this.preferences.state.selectedDeviceKey) {
      this.activate(record, { restored: true });
    }
    return record;
  }

  removeConnection(record) {
    this.connections.delete(record.index);
    const active = record.runtimeId === this.activeRuntimeId;
    this.events.push({ type: "disconnected", active, runtimeId: record.runtimeId, id: record.id });
    if (active) {
      this.activeRuntimeId = null;
      this.held.clear();
      this.pressed.clear();
      this.released.clear();
      this.capture = null;
      this.suspendedUntilNeutral = true;
    }
  }

  activate(record, { restored = false } = {}) {
    if (!record) return false;
    this.activeRuntimeId = record.runtimeId;
    this.preferences.selectDevice(record.deviceKey);
    this.held.clear();
    this.pressed.clear();
    this.released.clear();
    this.suspendedUntilNeutral = true;
    this.events.push({ type: "activated", restored, runtimeId: record.runtimeId, id: record.id });
    return true;
  }

  selectConnection(runtimeId) {
    const record = [...this.connections.values()].find((entry) => entry.runtimeId === runtimeId);
    return this.activate(record);
  }

  syncConnections(gamepads) {
    const present = new Set();
    for (const gamepad of gamepads ?? []) {
      if (!gamepad || !Number.isInteger(gamepad.index)) continue;
      present.add(gamepad.index);
      const deviceKey = gamepadDeviceKey(gamepad);
      let record = this.connections.get(gamepad.index);
      if (record && record.deviceKey !== deviceKey) {
        this.removeConnection(record);
        record = null;
      }
      if (!record) record = this.addConnection(gamepad);
      record.gamepad = gamepad;
      record.id = String(gamepad.id || "Controle sem identificação");
      record.mapping = gamepad.mapping === "standard" ? "standard" : "generic";
    }
    for (const record of [...this.connections.values()]) {
      if (!present.has(record.index)) this.removeConnection(record);
    }
  }

  rawButtonEdges(record) {
    const current = [...record.gamepad.buttons].map(buttonDown);
    const pressed = [];
    for (let index = 0; index < current.length; index += 1) {
      if (current[index] && !record.rawButtons[index]) pressed.push(index);
    }
    record.rawButtons = current;
    record.rawAxes = [...record.gamepad.axes];
    if (record.awaitingNeutral && padNeutral(record.gamepad, this.preferences.state.deadZone)) {
      record.awaitingNeutral = false;
      return [];
    }
    return record.awaitingNeutral ? [] : pressed;
  }

  pollCapture(record) {
    if (!this.capture) return false;
    const deadZone = this.preferences.state.deadZone;
    if (this.capture.phase === "neutral") {
      if (padNeutral(record.gamepad, deadZone)) this.capture.phase = "input";
      return true;
    }
    if (this.capture.kind === "button") {
      const index = [...record.gamepad.buttons].findIndex((button) => Number(button?.value ?? 0) >= 0.75 || button?.pressed);
      if (index < 0) return true;
      const action = this.capture.action;
      this.preferences.setButton(record.deviceKey, action, index);
      this.events.push({ type: "captureComplete", kind: "button", action, index });
    } else if (this.capture.kind === "axis") {
      const threshold = Math.max(0.65, deadZone + 0.2);
      const index = [...record.gamepad.axes].findIndex((axis) => Math.abs(Number(axis) || 0) >= threshold);
      if (index < 0) return true;
      const orientation = this.capture.orientation;
      this.preferences.setAxis(record.deviceKey, orientation, index);
      this.events.push({ type: "captureComplete", kind: "axis", orientation, index });
    } else {
      const buttonIndex = [...record.gamepad.buttons]
        .findIndex((button) => Number(button?.value ?? 0) >= 0.75 || button?.pressed);
      if (buttonIndex >= 0) {
        const { action, orientation } = this.capture;
        this.preferences.setButton(record.deviceKey, action, buttonIndex);
        this.events.push({ type: "captureComplete", kind: "directionButton", action, orientation, index: buttonIndex });
      } else {
        const threshold = Math.max(0.65, deadZone + 0.2);
        const axisIndex = [...record.gamepad.axes].findIndex((axis) => Math.abs(Number(axis) || 0) >= threshold);
        if (axisIndex < 0) return true;
        const { action, orientation, desiredSign } = this.capture;
        const raw = Number(record.gamepad.axes[axisIndex]) || 0;
        this.preferences.setAxis(record.deviceKey, orientation, axisIndex);
        this.preferences.setAxisInverted(record.deviceKey, orientation, Math.sign(raw) !== Math.sign(desiredSign));
        this.events.push({ type: "captureComplete", kind: "directionAxis", action, orientation, index: axisIndex });
      }
    }
    this.capture = null;
    this.suspendedUntilNeutral = true;
    this.held.clear();
    this.pressed.clear();
    return true;
  }

  beginButtonCapture(action) {
    const record = this.activeConnection();
    if (!record || record.mapping === "standard" || !BINDING_ACTIONS.includes(action)) return false;
    this.clearActions();
    this.capture = { kind: "button", action, phase: "neutral" };
    return true;
  }

  beginAxisCapture(orientation) {
    const record = this.activeConnection();
    if (!record || record.mapping === "standard" || !["horizontal", "vertical"].includes(orientation)) return false;
    this.clearActions();
    this.capture = { kind: "axis", orientation, phase: "neutral" };
    return true;
  }

  beginDirectionCapture(action, orientation, desiredSign) {
    const record = this.activeConnection();
    if (!record || record.mapping === "standard"
      || !["left", "right", "menuUp", "menuDown"].includes(action)
      || !["horizontal", "vertical"].includes(orientation)
      || ![-1, 1].includes(desiredSign)) return false;
    this.clearActions();
    this.capture = { kind: "direction", action, orientation, desiredSign, phase: "neutral" };
    return true;
  }

  cancelCapture() {
    this.capture = null;
    this.clearActions();
  }

  poll() {
    this.activityPulse = false;
    if (!this.available) return this.snapshot();
    let gamepads;
    try { gamepads = this.navigator.getGamepads() ?? []; }
    catch {
      this.available = false;
      this.events.push({ type: "unavailable" });
      this.clearActions();
      return this.snapshot();
    }
    this.syncConnections(gamepads);

    const rawEdges = new Map();
    for (const record of this.connections.values()) rawEdges.set(record.runtimeId, this.rawButtonEdges(record));
    if (!this.activeRuntimeId) {
      const candidate = [...this.connections.values()].find((record) => (rawEdges.get(record.runtimeId) ?? []).length > 0);
      if (candidate) {
        this.activate(candidate);
        this.activityPulse = true;
      }
      return this.snapshot();
    }

    const active = this.activeConnection();
    if (!active) return this.snapshot();
    if (this.pollCapture(active)) return this.snapshot();
    const deadZone = this.preferences.state.deadZone;
    if (this.suspendedUntilNeutral) {
      if (padNeutral(active.gamepad, deadZone)) this.suspendedUntilNeutral = false;
      this.held.clear();
      this.pressed.clear();
      this.released.clear();
      return this.snapshot();
    }

    const nextHeld = active.mapping === "standard"
      ? standardActions(active.gamepad, deadZone)
      : genericActions(active.gamepad, this.preferences.profile(active.deviceKey), deadZone);
    this.pressed = new Set([...nextHeld].filter((action) => !this.held.has(action)));
    this.released = new Set([...this.held].filter((action) => !nextHeld.has(action)));
    this.held = nextHeld;
    if (this.pressed.size || this.released.size) this.activityPulse = true;
    return this.snapshot();
  }

  snapshot() {
    return { held: new Set(this.held), pressed: new Set(this.pressed), released: new Set(this.released) };
  }

  consumeEdges() {
    this.pressed.clear();
    this.released.clear();
  }

  consumeTransitionInput() {
    this.suspendedUntilNeutral = true;
    this.held.clear();
    this.consumeEdges();
  }

  clearActions() {
    this.capture = null;
    this.consumeTransitionInput();
  }

  takeMeaningfulActivity() {
    const active = this.activityPulse;
    this.activityPulse = false;
    return active;
  }

  drainEvents() {
    const events = this.events;
    this.events = [];
    return events;
  }

  statusText() {
    if (!this.available) return "Controle: API indisponível; teclado e toque continuam ativos.";
    const active = this.activeConnection();
    if (active) {
      const suffix = active.mapping === "standard" ? "mapeamento padrão" : "perfil configurável";
      return `Controle ativo: ${active.id} — ${suffix}.`;
    }
    if (this.connections.size) return "Controle detectado. Pressione um botão para ativar o jogador 1.";
    return "Controle: nenhum dispositivo detectado.";
  }

  diagnostics() {
    const active = this.activeConnection();
    if (!active) return { buttons: [], axes: [] };
    return {
      buttons: [...active.gamepad.buttons]
        .map((button, index) => ({ index, value: Number(button?.value ?? 0) }))
        .filter((button) => button.value > 0.08),
      axes: [...active.gamepad.axes].map((value, index) => ({ index, value: Number(value) || 0 }))
    };
  }
}

export class CoopGamepadRouter {
  constructor({ navigatorRef = globalThis.navigator, preferences = new GamepadPreferencesStore() } = {}) {
    this.navigator = navigatorRef;
    this.preferences = preferences;
    this.available = typeof navigatorRef?.getGamepads === "function";
    this.layout = "keyboard-gamepad";
    this.assignmentEnabled = true;
    this.connections = new Map();
    this.assignments = new Map();
    this.slotState = new Map([[1, this.emptyState()], [2, this.emptyState()]]);
    this.nextRuntimeId = 1;
    this.events = [];
  }

  emptyState() {
    return { held: new Set(), pressed: new Set(), released: new Set(), suspendedUntilNeutral: true };
  }

  setLayout(layout) {
    const normalized = layout === "two-gamepads" ? "two-gamepads" : "keyboard-gamepad";
    if (normalized === this.layout) return normalized;
    this.layout = normalized;
    this.clearAssignments();
    this.events.push({ type: "layoutChanged", layout: normalized });
    return normalized;
  }

  requiredSlots() {
    return this.layout === "two-gamepads" ? [1, 2] : [2];
  }

  provider(slot) {
    return {
      snapshot: () => this.snapshot(slot),
      consumeEdges: () => this.consumeEdges(slot),
      consumeTransitionInput: () => this.consumeTransitionInput(slot),
      clearActions: () => this.clearActions(slot)
    };
  }

  connectionList() {
    return [...this.connections.values()].map((record) => ({
      runtimeId: record.runtimeId,
      index: record.index,
      id: record.id,
      deviceKey: record.deviceKey,
      mapping: record.mapping,
      assignedSlot: this.slotForRuntime(record.runtimeId)
    }));
  }

  slotForRuntime(runtimeId) {
    for (const [slot, assignedRuntimeId] of this.assignments) {
      if (assignedRuntimeId === runtimeId) return slot;
    }
    return null;
  }

  connectionForSlot(slot) {
    const runtimeId = this.assignments.get(slot);
    return [...this.connections.values()].find((record) => record.runtimeId === runtimeId) ?? null;
  }

  addConnection(gamepad) {
    const record = {
      runtimeId: `coop-pad-${this.nextRuntimeId++}`,
      index: gamepad.index,
      id: String(gamepad.id || "Controle sem identificação"),
      deviceKey: gamepadDeviceKey(gamepad),
      mapping: gamepad.mapping === "standard" ? "standard" : "generic",
      gamepad,
      rawButtons: [...gamepad.buttons].map(buttonDown)
    };
    this.connections.set(gamepad.index, record);
    this.events.push({ type: "connected", runtimeId: record.runtimeId, id: record.id, index: record.index });
    return record;
  }

  removeConnection(record) {
    const slot = this.slotForRuntime(record.runtimeId);
    this.connections.delete(record.index);
    if (slot) {
      this.assignments.delete(slot);
      this.slotState.set(slot, this.emptyState());
    }
    this.events.push({
      type: "disconnected",
      runtimeId: record.runtimeId,
      id: record.id,
      index: record.index,
      assignedSlot: slot
    });
  }

  syncConnections(gamepads) {
    const present = new Set();
    for (const gamepad of gamepads ?? []) {
      if (!gamepad || !Number.isInteger(gamepad.index)) continue;
      present.add(gamepad.index);
      const deviceKey = gamepadDeviceKey(gamepad);
      let record = this.connections.get(gamepad.index);
      if (record && record.deviceKey !== deviceKey) {
        this.removeConnection(record);
        record = null;
      }
      if (!record) record = this.addConnection(gamepad);
      record.gamepad = gamepad;
      record.id = String(gamepad.id || "Controle sem identificação");
      record.mapping = gamepad.mapping === "standard" ? "standard" : "generic";
    }
    for (const record of [...this.connections.values()]) {
      if (!present.has(record.index)) this.removeConnection(record);
    }
  }

  rawButtonEdges(record) {
    const current = [...record.gamepad.buttons].map(buttonDown);
    const edges = [];
    for (let index = 0; index < current.length; index += 1) {
      if (current[index] && !record.rawButtons[index]) edges.push(index);
    }
    record.rawButtons = current;
    return edges;
  }

  assignByActivity(record) {
    if (!this.assignmentEnabled || this.slotForRuntime(record.runtimeId)) return false;
    const slot = this.requiredSlots().find((candidate) => !this.assignments.has(candidate));
    if (!slot) return false;
    if ([...this.assignments.values()].includes(record.runtimeId)) return false;
    this.assignments.set(slot, record.runtimeId);
    this.slotState.set(slot, this.emptyState());
    this.events.push({
      type: "assigned",
      slot,
      runtimeId: record.runtimeId,
      id: record.id,
      mapping: record.mapping,
      profileConfigured: record.mapping === "standard" || this.preferences.profileConfigured(record.deviceKey)
    });
    return true;
  }

  unassign(slot) {
    const runtimeId = this.assignments.get(slot);
    if (!runtimeId) return false;
    this.assignments.delete(slot);
    this.slotState.set(slot, this.emptyState());
    this.events.push({ type: "unassigned", slot, runtimeId });
    return true;
  }

  clearAssignments() {
    for (const slot of [...this.assignments.keys()]) this.unassign(slot);
  }

  poll() {
    if (!this.available) return this.status();
    let gamepads;
    try { gamepads = this.navigator.getGamepads() ?? []; }
    catch {
      this.available = false;
      this.clearActions();
      this.events.push({ type: "unavailable" });
      return this.status();
    }
    this.syncConnections(gamepads);
    for (const record of this.connections.values()) {
      const rawEdges = this.rawButtonEdges(record);
      if (rawEdges.length) this.assignByActivity(record);
    }

    const deadZone = this.preferences.state.deadZone;
    for (const slot of [1, 2]) {
      const state = this.slotState.get(slot) ?? this.emptyState();
      const record = this.connectionForSlot(slot);
      if (!record) {
        this.slotState.set(slot, this.emptyState());
        continue;
      }
      if (state.suspendedUntilNeutral) {
        if (padNeutral(record.gamepad, deadZone)) state.suspendedUntilNeutral = false;
        state.held.clear();
        state.pressed.clear();
        state.released.clear();
        this.slotState.set(slot, state);
        continue;
      }
      const nextHeld = record.mapping === "standard"
        ? standardActions(record.gamepad, deadZone)
        : genericActions(record.gamepad, this.preferences.profile(record.deviceKey), deadZone);
      state.pressed = new Set([...nextHeld].filter((action) => !state.held.has(action)));
      state.released = new Set([...state.held].filter((action) => !nextHeld.has(action)));
      state.held = nextHeld;
      this.slotState.set(slot, state);
    }
    return this.status();
  }

  snapshot(slot) {
    const state = this.slotState.get(slot) ?? this.emptyState();
    return {
      held: new Set(state.held),
      pressed: new Set(state.pressed),
      released: new Set(state.released)
    };
  }

  consumeEdges(slot) {
    const state = this.slotState.get(slot);
    state?.pressed.clear();
    state?.released.clear();
  }

  consumeTransitionInput(slot = null) {
    const slots = slot ? [slot] : [1, 2];
    for (const playerSlot of slots) {
      const state = this.slotState.get(playerSlot) ?? this.emptyState();
      state.suspendedUntilNeutral = true;
      state.held.clear();
      state.pressed.clear();
      state.released.clear();
      this.slotState.set(playerSlot, state);
    }
  }

  clearActions(slot = null) {
    this.consumeTransitionInput(slot);
  }

  ready() {
    return this.requiredSlots().every((slot) => {
      const record = this.connectionForSlot(slot);
      return Boolean(record && (record.mapping === "standard" || this.preferences.profileConfigured(record.deviceKey)));
    });
  }

  status() {
    return {
      available: this.available,
      layout: this.layout,
      ready: this.ready(),
      assignments: Object.fromEntries([...this.assignments].map(([slot, runtimeId]) => {
        const record = [...this.connections.values()].find((candidate) => candidate.runtimeId === runtimeId);
        return [slot, record ? {
          runtimeId,
          id: record.id,
          index: record.index,
          mapping: record.mapping,
          profileConfigured: record.mapping === "standard" || this.preferences.profileConfigured(record.deviceKey)
        } : null];
      })),
      connections: this.connectionList()
    };
  }

  drainEvents() {
    const events = this.events;
    this.events = [];
    return events;
  }
}

export class GamepadNavigationRepeater {
  constructor({ initialDelay = 380, repeatDelay = 125 } = {}) {
    this.initialDelay = initialDelay;
    this.repeatDelay = repeatDelay;
    this.direction = null;
    this.nextAt = 0;
  }

  reset() {
    this.direction = null;
    this.nextAt = 0;
  }

  update(snapshot, timeMs) {
    const held = snapshot?.held ?? new Set();
    const pressed = snapshot?.pressed ?? new Set();
    const direction = held.has("menuUp") ? "up"
      : held.has("menuDown") ? "down"
        : held.has("left") ? "left"
          : held.has("right") ? "right" : null;
    const events = [];
    const directionAction = { up: "menuUp", down: "menuDown", left: "left", right: "right" }[direction];
    if (!direction) this.reset();
    else if (direction !== this.direction || pressed.has(directionAction)) {
      this.direction = direction;
      this.nextAt = timeMs + this.initialDelay;
      events.push(direction);
    } else if (timeMs >= this.nextAt) {
      this.nextAt = timeMs + this.repeatDelay;
      events.push(direction);
    }
    if (pressed.has("confirm")) events.push("confirm");
    if (pressed.has("cancel")) events.push("cancel");
    if (pressed.has("pause")) events.push("pause");
    return events;
  }
}
