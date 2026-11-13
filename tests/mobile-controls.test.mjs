import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { InputController, isPrimaryMouseAttackPointer } from "../src/input.js";

class MockElement {
  constructor(dataset = {}) {
    this.dataset = dataset;
    this.listeners = new Map();
    this.capturedPointerId = null;
  }
  addEventListener(event, handler) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(handler);
  }
  dispatch(event, data = {}) {
    for (const handler of this.listeners.get(event) ?? []) {
      handler({ preventDefault() {}, ...data });
    }
  }
  setPointerCapture(pointerId) {
    this.capturedPointerId = pointerId;
  }
}

class MockRoot {
  constructor(buttons = []) {
    this.buttons = buttons;
    this.listeners = new Map();
  }
  querySelectorAll(selector) {
    if (selector === "[data-action]") return this.buttons;
    return [];
  }
  addEventListener(event, handler) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(handler);
  }
  dispatch(event, data = {}) {
    for (const handler of this.listeners.get(event) ?? []) {
      handler({ preventDefault() {}, ...data });
    }
  }
}

function withMockEnvironment(callback) {
  const oldWindow = globalThis.window;
  const oldDocument = globalThis.document;
  const windowMock = new MockRoot();
  const documentMock = new MockRoot();
  globalThis.window = windowMock;
  globalThis.document = documentMock;
  try {
    return callback({ windowMock, documentMock });
  } finally {
    if (oldWindow === undefined) delete globalThis.window;
    else globalThis.window = oldWindow;
    if (oldDocument === undefined) delete globalThis.document;
    else globalThis.document = oldDocument;
  }
}

test("controles touch permitem movimento e salto simultâneos sem cancelamento mútuo", () => {
  withMockEnvironment(({ windowMock }) => {
    const leftBtn = new MockElement({ action: "left" });
    const jumpBtn = new MockElement({ action: "jump" });
    const root = new MockRoot([leftBtn, jumpBtn]);
    const input = new InputController(root);

    // Pointer 1 touches Left
    leftBtn.dispatch("pointerdown", { pointerId: 1 });
    let state = input.snapshot();
    assert.equal(state.left, true);
    assert.equal(state.jumpPressed, false);

    // Pointer 2 touches Jump simultaneously
    jumpBtn.dispatch("pointerdown", { pointerId: 2 });
    state = input.snapshot();
    assert.equal(state.left, true, "left deve continuar ativo ao pular");
    assert.equal(state.jumpPressed, true, "salto deve disparar simultaneamente com left");

    input.consumeEdges();

    // Release Jump pointer; Left must still be held
    jumpBtn.dispatch("pointerup", { pointerId: 2 });
    state = input.snapshot();
    assert.equal(state.left, true, "left deve continuar ativo após soltar o salto");
    assert.equal(state.jumpPressed, false);

    // Release Left pointer
    leftBtn.dispatch("pointerup", { pointerId: 1 });
    state = input.snapshot();
    assert.equal(state.left, false);
  });
});

test("ponteiro de ataque aceita somente botão esquerdo realmente pressionado", () => {
  assert.equal(isPrimaryMouseAttackPointer({ pointerType: "mouse", isPrimary: true, button: 0, buttons: 1 }), true);
  assert.equal(isPrimaryMouseAttackPointer({ pointerType: "mouse", isPrimary: true, button: 2, buttons: 2 }), false);
  assert.equal(isPrimaryMouseAttackPointer({ pointerType: "mouse", isPrimary: true, button: 0, buttons: 2 }), false,
    "button=0 sem o bit esquerdo em buttons não deve virar disparo");
  assert.equal(isPrimaryMouseAttackPointer({ pointerType: "touch", isPrimary: true, button: 0, buttons: 1 }), false);
  assert.equal(isPrimaryMouseAttackPointer({ pointerType: "mouse", isPrimary: false, button: 0, buttons: 1 }), false);
});

test("WASD horizontal, salto e ataque coexistem sem perder teclas alternativas", () => {
  withMockEnvironment(({ windowMock }) => {
    const input = new InputController(new MockRoot());
    windowMock.dispatch("keydown", { code: "KeyD" });
    windowMock.dispatch("keydown", { code: "KeyW" });
    windowMock.dispatch("keydown", { code: "KeyJ" });
    let state = input.snapshot();
    assert.equal(state.right, true);
    assert.equal(state.jumpPressed, true);
    assert.equal(state.jumpHeld, true);
    assert.equal(state.attackPressed, true);

    windowMock.dispatch("keydown", { code: "ArrowRight" });
    windowMock.dispatch("keyup", { code: "KeyD" });
    state = input.snapshot();
    assert.equal(state.right, true, "soltar D não cancela a seta direita ainda pressionada");
    windowMock.dispatch("keyup", { code: "ArrowRight" });
    assert.equal(input.snapshot().right, false);
  });
});

test("keyup libera ação mesmo quando o foco mudou para um campo de UI", () => {
  withMockEnvironment(({ windowMock }) => {
    const input = new InputController(new MockRoot());
    windowMock.dispatch("keydown", { code: "KeyA" });
    assert.equal(input.snapshot().left, true);
    const inputTarget = { matches: () => true };
    windowMock.dispatch("keyup", { code: "KeyA", target: inputTarget });
    assert.equal(input.snapshot().left, false);
    assert.equal(input.heldCodes.size, 0);
  });
});

test("slots de teclado isolam gameplay em P1 e preservam Esc para pausa global", () => {
  withMockEnvironment(({ windowMock }) => {
    const input = new InputController(new MockRoot());
    input.setKeyboardSlots([1]);
    windowMock.dispatch("keydown", { code: "KeyA" });
    assert.equal(input.snapshot(1).left, true);
    assert.equal(input.snapshot(2).left, false);
    windowMock.dispatch("keyup", { code: "KeyA" });

    input.setKeyboardSlots([]);
    windowMock.dispatch("keydown", { code: "KeyA" });
    assert.equal(input.snapshot(1).left, false);
    assert.equal(input.snapshot(2).left, false);
    windowMock.dispatch("keyup", { code: "KeyA" });
    windowMock.dispatch("keydown", { code: "Escape" });
    assert.equal(input.snapshot(1).pausePressed, true);
    assert.equal(input.snapshot(2).pausePressed, false);
  });
});

test("controles touch permitem movimento e ataque simultâneos", () => {
  withMockEnvironment(() => {
    const rightBtn = new MockElement({ action: "right" });
    const attackBtn = new MockElement({ action: "attack" });
    const root = new MockRoot([rightBtn, attackBtn]);
    const input = new InputController(root);

    rightBtn.dispatch("pointerdown", { pointerId: 10 });
    attackBtn.dispatch("pointerdown", { pointerId: 20 });
    const state = input.snapshot();
    assert.equal(state.right, true);
    assert.equal(state.attackPressed, true);

    input.consumeEdges();
    attackBtn.dispatch("pointerup", { pointerId: 20 });
    assert.equal(input.snapshot().right, true);
    assert.equal(input.snapshot().attackPressed, false);
  });
});

test("três ponteiros mantêm movimento, salto e ataque simultâneos", () => {
  withMockEnvironment(() => {
    const rightBtn = new MockElement({ action: "right" });
    const jumpBtn = new MockElement({ action: "jump" });
    const attackBtn = new MockElement({ action: "attack" });
    const input = new InputController(new MockRoot([rightBtn, jumpBtn, attackBtn]));
    rightBtn.dispatch("pointerdown", { pointerId: 51 });
    jumpBtn.dispatch("pointerdown", { pointerId: 52 });
    attackBtn.dispatch("pointerdown", { pointerId: 53 });
    assert.deepEqual(input.snapshot(), {
      left: false, right: true, jumpPressed: true, jumpHeld: true,
      attackPressed: true, interactPressed: false, pausePressed: false
    });
    input.consumeEdges();
    jumpBtn.dispatch("pointerup", { pointerId: 52 });
    assert.equal(input.snapshot().right, true);
    assert.equal(input.snapshot().attackPressed, false);
    assert.equal(input.held.has("attack"), true);
    attackBtn.dispatch("pointerup", { pointerId: 53 });
    rightBtn.dispatch("pointerup", { pointerId: 51 });
    assert.equal(input.held.size, 0);
  });
});

test("perda de ponteiro por pointercancel em botão ou window libera ação sem travar", () => {
  withMockEnvironment(({ windowMock }) => {
    const leftBtn = new MockElement({ action: "left" });
    const rightBtn = new MockElement({ action: "right" });
    const root = new MockRoot([leftBtn, rightBtn]);
    const input = new InputController(root);

    // Pointer cancel direct on button
    leftBtn.dispatch("pointerdown", { pointerId: 3 });
    assert.equal(input.snapshot().left, true);
    leftBtn.dispatch("pointercancel", { pointerId: 3 });
    assert.equal(input.snapshot().left, false, "pointercancel no botão deve liberar ação");

    // Window-level pointercancel fallback
    rightBtn.dispatch("pointerdown", { pointerId: 4 });
    assert.equal(input.snapshot().right, true);
    windowMock.dispatch("pointercancel", { pointerId: 4 });
    assert.equal(input.snapshot().right, false, "pointercancel na janela deve liberar ação");
  });
});

test("perda de visibilidade ou blur limpa ponteiros e aciona notificação", () => {
  withMockEnvironment(({ windowMock, documentMock }) => {
    const jumpBtn = new MockElement({ action: "jump" });
    const root = new MockRoot([jumpBtn]);
    const input = new InputController(root);
    let notified = 0;
    input.onBlur = () => { notified += 1; };

    jumpBtn.dispatch("pointerdown", { pointerId: 5 });
    assert.equal(input.held.has("jump"), true);

    // Window blur
    windowMock.dispatch("blur");
    assert.equal(input.held.has("jump"), false);
    assert.equal(notified, 1);

    // Visibility change with document hidden
    jumpBtn.dispatch("pointerdown", { pointerId: 6 });
    assert.equal(input.held.has("jump"), true);
    documentMock.hidden = true;
    documentMock.dispatch("visibilitychange");
    assert.equal(input.held.has("jump"), false);
    assert.equal(notified, 2);
  });
});

test("input touch mantido durante transição só volta a ativar depois da liberação", () => {
  withMockEnvironment(() => {
    const jumpBtn = new MockElement({ action: "jump" });
    const root = new MockRoot([jumpBtn]);
    const input = new InputController(root);
    jumpBtn.dispatch("pointerdown", { pointerId: 31 });
    assert.equal(input.snapshot().jumpPressed, true);
    input.consumeTransitionInput();
    assert.equal(input.snapshot().jumpPressed, false);
    assert.equal(input.blockedUntilRelease.has("jump"), true);

    jumpBtn.dispatch("pointerdown", { pointerId: 32 });
    assert.equal(input.snapshot().jumpPressed, false, "novo toque não atravessa a transição enquanto o anterior segue preso");
    jumpBtn.dispatch("pointerup", { pointerId: 31 });
    assert.equal(input.blockedUntilRelease.has("jump"), true, "segundo ponteiro ainda representa a mesma ação");
    jumpBtn.dispatch("pointerup", { pointerId: 32 });
    assert.equal(input.blockedUntilRelease.has("jump"), false);
    jumpBtn.dispatch("pointerdown", { pointerId: 33 });
    assert.equal(input.snapshot().jumpPressed, true, "ação volta após liberação completa");
  });
});

test("blur também remove bloqueios residuais de transição", () => {
  withMockEnvironment(({ windowMock }) => {
    const attackBtn = new MockElement({ action: "attack" });
    const input = new InputController(new MockRoot([attackBtn]));
    attackBtn.dispatch("pointerdown", { pointerId: 41 });
    input.consumeTransitionInput();
    assert.equal(input.blockedUntilRelease.has("attack"), true);
    windowMock.dispatch("blur");
    assert.equal(input.blockedUntilRelease.size, 0);
    assert.equal(input.pointerActions.size, 0);
  });
});

test("CSS assegura alvos touch >= 44px, touch-action none e menu centralizado", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");

  // Touch button sizes >= 44px
  assert.match(css, /\.touch-controls button\s*\{[^}]*min-width:\s*44px/);
  assert.match(css, /\.touch-controls button\s*\{[^}]*min-height:\s*44px/);
  assert.match(css, /\.touch-controls \.interact\s*\{[^}]*min-width:\s*44px/);
  assert.match(css, /\.touch-controls \.interact\s*\{[^}]*min-height:\s*44px/);
  assert.match(css, /\.pause-touch\s*\{[^}]*min-width:\s*44px/);
  assert.match(css, /\.pause-touch\s*\{[^}]*min-height:\s*44px/);

  // Gesture prevention
  assert.match(css, /\.game-frame\s*\{[^}]*touch-action:\s*auto/);
  assert.match(css, /canvas\s*\{[^}]*touch-action:\s*none/);
  assert.match(css, /\.screen\s*\{[^}]*touch-action:\s*pan-y/);
  assert.match(css, /\.panel\s*\{[^}]*touch-action:\s*pan-y/);
  assert.match(css, /#volume\s*\{[^}]*min-height:\s*44px/);

  // Menu panel centered
  assert.match(css, /\.menu-panel\s*\{[^}]*margin:\s*auto/);
  assert.match(css, /\.menu-panel\s*\{[^}]*text-align:\s*center/);
  assert.doesNotMatch(css, /\.menu-panel\s*\{[^}]*margin-right:\s*auto/);
});

test("todas as ações essenciais têm botão touch/click e instrução móvel em português", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  for (const action of [
    "play", "options", "back", "resume", "restart", "menu", "skip-bonus",
    "bonus-continue-next", "bonus-replay", "export-saves", "import-saves"
  ]) assert.match(html, new RegExp(`data-ui="${action}"`), `ação ${action} precisa de botão`);
  for (const action of ["left", "right", "jump", "attack", "interact"]) {
    assert.match(html, new RegExp(`data-action="${action}"`));
  }
  assert.match(html, /class="touch-instructions"[^>]*>Toque:/);
  assert.match(html, />Exportar dados do jogo</);
  assert.match(html, />Importar dados do jogo</);
});

test("CSS estiliza seletor de dificuldade, controles touch táteis e painel de sobrevivência compacto", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");

  // Dificuldade estilizada com chevron SVG e alvo touch de 44px
  assert.match(css, /\.difficulty-row select\s*\{[^}]*border-color:\s*var\(--cyan\)/);
  assert.match(css, /\.difficulty-row select:focus-visible\s*\{[^}]*border-color:\s*var\(--orange\)/);
  assert.match(css, /\.language-row select,\s*\.difficulty-row select\s*\{[^}]*min-height:\s*44px/);

  // Controles touch com clique mecânico sem distorção sub-pixel (sem scale)
  assert.match(css, /\.touch-controls button:active\s*\{[^}]*transform:\s*translate\(2px,\s*2px\)/);
  assert.doesNotMatch(css, /\.touch-controls button:active\s*\{[^}]*scale\(/);
  assert.doesNotMatch(css, /\.pause-touch:active\s*\{[^}]*scale\(/);

  // Painel de sobrevivência compacto para telas curtas e sem overflow
  assert.match(css, /\.survival-result-panel\s*\{[^}]*max-height:\s*95%/);
  assert.match(css, /@media \(max-height:\s*430px\)\s*\{[\s\S]*\.survival-result-panel\s*\{[^}]*padding:\s*6px 12px/);

  // Movimento reduzido desativa transições e deslocamentos nos botões touch
  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*\.touch-controls button,\s*\.pause-touch\s*\{[^}]*transition:\s*none !important/);
});

