const KEY_ACTIONS = new Map([
  ["ArrowLeft", "left"], ["KeyA", "left"],
  ["ArrowRight", "right"], ["KeyD", "right"],
  ["ArrowUp", "jump"], ["KeyW", "jump"], ["Space", "jump"],
  ["KeyJ", "attack"], ["KeyX", "attack"], ["KeyF", "attack"],
  ["KeyE", "interact"],
  ["KeyQ", "ability"],
  ["Escape", "pause"]
]);
const HORIZONTAL_ACTIONS = new Map([["left", -1], ["right", 1]]);

export function isPrimaryMouseAttackPointer(event) {
  if (!event || event.pointerType !== "mouse" || event.isPrimary === false) return false;
  if (event.button !== 0) return false;
  return typeof event.buttons !== "number" || (event.buttons & 1) === 1;
}

export function isUiInputTarget(target) {
  if (!target || typeof target.matches !== "function") return false;
  return target.matches("input, select, textarea, [contenteditable='true']");
}

export function confirmUiTarget(target) {
  if (!target || target.disabled || target.hidden || target.closest?.("[hidden]")) return false;
  if (!target.matches?.("button, input[type='button'], input[type='submit'], input[type='checkbox'], input[type='radio']")) {
    return false;
  }
  target.click();
  return true;
}

export class UiPressGate {
  constructor() {
    this.heldCodes = new Set();
  }

  press(code, { repeat = false } = {}) {
    if (!code || repeat || this.heldCodes.has(code)) return false;
    this.heldCodes.add(code);
    return true;
  }

  release(code) {
    return this.heldCodes.delete(code);
  }

  clear() {
    this.heldCodes.clear();
  }
}

export class InputController {
  constructor(root = document) {
    this.root = root;
    this.held = new Set();
    this.heldCodes = new Map();
    this.directionPressOrder = new Map();
    this.nextDirectionPressOrder = 1;
    this.pressed = new Set();
    this.pointerActions = new Map();
    this.blockedUntilRelease = new Set();
    this.playerProviders = new Map();
    this.keyboardSlots = new Set([1]);
    this.onBlur = null;

    this.onKeyDown = (event) => {
      const action = KEY_ACTIONS.get(event.code);
      if (!action) return;
      if (isUiInputTarget(event.target)) return;
      event.preventDefault();
      if (event.repeat && !this.heldCodes.has(event.code)) return;
      if (this.blockedUntilRelease.has(action)) return;
      if (this.heldCodes.has(event.code)) return;
      this.heldCodes.set(event.code, action);
      this.recordDirectionPress(`key:${event.code}`, action);
      if (!this.held.has(action)) this.pressed.add(action);
      this.held.add(action);
    };
    this.onKeyUp = (event) => {
      const action = KEY_ACTIONS.get(event.code);
      if (!action) return;
      const wasHeld = this.heldCodes.delete(event.code);
      this.directionPressOrder.delete(`key:${event.code}`);
      if (!isUiInputTarget(event.target) || wasHeld) event.preventDefault();
      this.releaseActionIfUnused(action);
    };
    this.onWindowBlur = () => this.clear(true);
    this.onWindowPointerCancel = (event) => {
      if (event?.pointerId != null) {
        const activeAction = this.pointerActions.get(event.pointerId);
        this.pointerActions.delete(event.pointerId);
        this.directionPressOrder.delete(`pointer:${event.pointerId}`);
        if (activeAction) this.releaseActionIfUnused(activeAction);
      } else {
        this.clear(false);
      }
    };

    window.addEventListener("keydown", this.onKeyDown, { passive: false });
    window.addEventListener("keyup", this.onKeyUp, { passive: false });
    window.addEventListener("blur", this.onWindowBlur);
    window.addEventListener("pointercancel", this.onWindowPointerCancel, { passive: true });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.clear(true);
    });

    for (const button of root.querySelectorAll("[data-action]")) this.bindTouchButton(button);
  }

  bindTouchButton(button) {
    const action = button.dataset.action;
    const press = (event) => {
      event.preventDefault();
      button.setPointerCapture?.(event.pointerId);
      this.pointerActions.set(event.pointerId, action);
      if (this.blockedUntilRelease.has(action)) return;
      this.recordDirectionPress(`pointer:${event.pointerId}`, action);
      if (!this.held.has(action)) this.pressed.add(action);
      this.held.add(action);
    };
    const release = (event) => {
      event.preventDefault();
      const activeAction = this.pointerActions.get(event.pointerId);
      this.pointerActions.delete(event.pointerId);
      this.directionPressOrder.delete(`pointer:${event.pointerId}`);
      if (activeAction) this.releaseActionIfUnused(activeAction);
    };
    button.addEventListener("pointerdown", press, { passive: false });
    button.addEventListener("pointerup", release, { passive: false });
    button.addEventListener("pointercancel", release, { passive: false });
    button.addEventListener("lostpointercapture", release, { passive: false });
    button.addEventListener("contextmenu", (event) => event.preventDefault());
  }

  pulse(action) {
    this.pressed.add(action);
  }

  recordDirectionPress(sourceId, action) {
    if (!HORIZONTAL_ACTIONS.has(action)) return false;
    this.directionPressOrder.set(sourceId, {
      action,
      order: this.nextDirectionPressOrder++
    });
    return true;
  }

  resolvedLocalHorizontal() {
    let latest = null;
    for (const entry of this.directionPressOrder.values()) {
      if (!this.held.has(entry.action) || this.blockedUntilRelease.has(entry.action)) continue;
      if (!latest || entry.order > latest.order) latest = entry;
    }
    return latest ? HORIZONTAL_ACTIONS.get(latest.action) : 0;
  }

  releaseActionIfUnused(action) {
    const usedByKeyboard = [...this.heldCodes.values()].includes(action);
    const usedByPointer = [...this.pointerActions.values()].includes(action);
    if (usedByKeyboard || usedByPointer) return false;
    this.held.delete(action);
    this.blockedUntilRelease.delete(action);
    return true;
  }

  attachPlayerProvider(playerSlot, provider) {
    if (!Number.isInteger(playerSlot) || playerSlot < 1 || !provider?.snapshot) return false;
    this.playerProviders.set(playerSlot, provider);
    return true;
  }

  detachPlayerProvider(playerSlot) {
    const provider = this.playerProviders.get(playerSlot);
    provider?.clearActions?.();
    return this.playerProviders.delete(playerSlot);
  }

  setKeyboardSlots(playerSlots = [1]) {
    this.keyboardSlots = new Set([...playerSlots].filter((slot) => Number.isInteger(slot) && slot > 0));
  }

  snapshot(playerSlot = 1) {
    const provider = this.playerProviders.get(playerSlot)?.snapshot?.();
    const providerHeld = provider?.held ?? new Set();
    const providerPressed = provider?.pressed ?? new Set();
    const keyboardEnabled = this.keyboardSlots.has(playerSlot);
    const localHorizontal = keyboardEnabled ? this.resolvedLocalHorizontal() : 0;
    const providerHorizontal = Number(providerHeld.has("right")) - Number(providerHeld.has("left"));
    const horizontal = localHorizontal || Math.sign(providerHorizontal);
    const snap = {
      left: horizontal < 0,
      right: horizontal > 0,
      jumpPressed: (keyboardEnabled && this.pressed.has("jump")) || providerPressed.has("jump"),
      jumpHeld: (keyboardEnabled && this.held.has("jump")) || providerHeld.has("jump"),
      attackPressed: (keyboardEnabled && this.pressed.has("attack")) || providerPressed.has("attack"),
      interactPressed: (keyboardEnabled && this.pressed.has("interact")) || providerPressed.has("interact"),
      pausePressed: ((keyboardEnabled || playerSlot === 1) && this.pressed.has("pause")) || providerPressed.has("pause")
    };
    Object.defineProperties(snap, {
      abilityPressed: {
        value: (keyboardEnabled && this.pressed.has("ability")) || providerPressed.has("ability"),
        enumerable: false,
        configurable: true,
        writable: true
      },
      abilityHeld: {
        value: (keyboardEnabled && this.held.has("ability")) || providerHeld.has("ability"),
        enumerable: false,
        configurable: true,
        writable: true
      },
      horizontal: {
        value: horizontal,
        enumerable: false,
        configurable: true,
        writable: false
      }
    });
    return snap;
  }

  consumeEdges(playerSlot = 1) {
    this.pressed.clear();
    this.playerProviders.get(playerSlot)?.consumeEdges?.();
  }

  clear(notify = false) {
    this.held.clear();
    this.heldCodes.clear();
    this.directionPressOrder.clear();
    this.nextDirectionPressOrder = 1;
    this.pressed.clear();
    this.pointerActions.clear();
    this.blockedUntilRelease.clear();
    for (const provider of this.playerProviders.values()) provider.clearActions?.();
    if (notify) this.onBlur?.();
  }

  consumeTransitionInput() {
    for (const action of this.held) this.blockedUntilRelease.add(action);
    this.held.clear();
    this.directionPressOrder.clear();
    this.pressed.clear();
    for (const provider of this.playerProviders.values()) provider.consumeTransitionInput?.();
  }
}
