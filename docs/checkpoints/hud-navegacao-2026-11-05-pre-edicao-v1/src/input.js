const KEY_ACTIONS = new Map([
  ["ArrowLeft", "left"], ["KeyA", "left"],
  ["ArrowRight", "right"], ["KeyD", "right"],
  ["ArrowUp", "jump"], ["KeyW", "jump"], ["Space", "jump"],
  ["KeyJ", "attack"], ["KeyX", "attack"], ["KeyF", "attack"],
  ["KeyE", "interact"],
  ["KeyQ", "ability"],
  ["Escape", "pause"]
]);

export class InputController {
  constructor(root = document) {
    this.root = root;
    this.held = new Set();
    this.pressed = new Set();
    this.pointerActions = new Map();
    this.blockedUntilRelease = new Set();
    this.playerProviders = new Map();
    this.keyboardSlots = new Set([1]);
    this.onBlur = null;

    this.onKeyDown = (event) => {
      const action = KEY_ACTIONS.get(event.code);
      if (!action) return;
      event.preventDefault();
      if (this.blockedUntilRelease.has(action)) return;
      if (!this.held.has(action)) this.pressed.add(action);
      this.held.add(action);
    };
    this.onKeyUp = (event) => {
      const action = KEY_ACTIONS.get(event.code);
      if (!action) return;
      event.preventDefault();
      this.held.delete(action);
      this.blockedUntilRelease.delete(action);
    };
    this.onWindowBlur = () => this.clear(true);
    this.onWindowPointerCancel = (event) => {
      if (event?.pointerId != null) {
        const activeAction = this.pointerActions.get(event.pointerId);
        this.pointerActions.delete(event.pointerId);
        if (activeAction && ![...this.pointerActions.values()].includes(activeAction)) {
          this.held.delete(activeAction);
          this.blockedUntilRelease.delete(activeAction);
        }
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
      if (!this.held.has(action)) this.pressed.add(action);
      this.held.add(action);
    };
    const release = (event) => {
      event.preventDefault();
      const activeAction = this.pointerActions.get(event.pointerId);
      this.pointerActions.delete(event.pointerId);
      if (activeAction && ![...this.pointerActions.values()].includes(activeAction)) {
        this.held.delete(activeAction);
        this.blockedUntilRelease.delete(activeAction);
      }
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
    const snap = {
      left: (keyboardEnabled && this.held.has("left")) || providerHeld.has("left"),
      right: (keyboardEnabled && this.held.has("right")) || providerHeld.has("right"),
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
    this.pressed.clear();
    this.pointerActions.clear();
    this.blockedUntilRelease.clear();
    for (const provider of this.playerProviders.values()) provider.clearActions?.();
    if (notify) this.onBlur?.();
  }

  consumeTransitionInput() {
    for (const action of this.held) this.blockedUntilRelease.add(action);
    this.held.clear();
    this.pressed.clear();
    for (const provider of this.playerProviders.values()) provider.consumeTransitionInput?.();
  }
}
