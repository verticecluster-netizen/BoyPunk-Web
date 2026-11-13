import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { confirmUiTarget, isUiInputTarget, UiPressGate } from "../src/input.js";
import { buildHudEffectIndicators, layoutHudEffectIndicators } from "../src/renderer.js";

test("confirmação gera uma única ação por pressionamento e não vaza entre telas", () => {
  const gate = new UiPressGate();
  let state = "menu";
  let transitions = 0;
  const pressEnter = (repeat = false) => {
    if (!gate.press("Enter", { repeat })) return false;
    state = state === "menu" ? "playing" : "victory";
    transitions += 1;
    return true;
  };

  assert.equal(pressEnter(), true);
  assert.equal(state, "playing");
  assert.equal(pressEnter(true), false, "repeat do teclado não confirma novamente");
  assert.equal(pressEnter(), false, "a troca de tela não limpa a tecla ainda mantida");
  assert.equal(transitions, 1);
  gate.release("Enter");
  assert.equal(pressEnter(), true, "um novo pressionamento após keyup é aceito");
  assert.equal(transitions, 2);
});

test("clique, teclado e gamepad convergem para o mesmo click lógico", () => {
  let actions = 0;
  const button = {
    disabled: false,
    hidden: false,
    closest: () => null,
    matches: (selector) => selector.includes("button"),
    click: () => { actions += 1; }
  };

  button.click(); // ponteiro
  assert.equal(confirmUiTarget(button), true); // teclado
  assert.equal(confirmUiTarget(button), true); // gamepad
  assert.equal(actions, 3);
  button.disabled = true;
  assert.equal(confirmUiTarget(button), false);
  assert.equal(actions, 3);
});

test("campos interativos preservam as próprias teclas", () => {
  assert.equal(isUiInputTarget({ matches: (selector) => selector.includes("input") }), true);
  assert.equal(isUiInputTarget({ matches: () => false }), false);
});

test("HUD organiza efeitos distintos por proprietário no coop sem depender só de cor", () => {
  const model = {
    coopPreview: true,
    powerUpsAllowed: () => true,
    players: [
      {
        slot: 1, rapidFire: true, rapidFireRemaining: 8.4, shield: true,
        activePowerUp: { id: "double-burst", remaining: 6.2 }
      },
      {
        slot: 2, rapidFire: false, shield: false,
        ability: { id: "self-heal", ready: false, rechargeRemaining: 12.5 }
      }
    ]
  };
  const indicators = buildHudEffectIndicators(model);
  assert.deepEqual(indicators.map(({ owner, id, compact }) => [owner, id, compact]), [
    ["P1", "rapid-fire", "TR8.4"],
    ["P1", "double-burst", "RD6.2"],
    ["P1", "shield", "ES×1"],
    ["P2", "self-heal", "HAB12.5"]
  ]);

  for (const owner of ["P1", "P2"]) {
    const layout = layoutHudEffectIndicators(indicators.filter((item) => item.owner === owner), { width: 120 });
    for (let index = 1; index < layout.length; index += 1) {
      const previous = layout[index - 1];
      const current = layout[index];
      assert.ok(current.y > previous.y || current.x >= previous.x + previous.width, `${owner}: indicadores não se sobrepõem`);
    }
    assert.ok(layout.every((item) => item.x + item.width <= 120), `${owner}: indicadores permanecem na região reservada`);
  }
});

test("apresentação acompanha expiração sem alterar o estado dos efeitos", () => {
  const model = {
    coopPreview: false,
    player: { rapidFire: true, rapidFireRemaining: 0, shield: true },
    activePowerUp: { id: "double-burst", remaining: 0 },
    ability: { id: "self-heal", ready: true, rechargeRemaining: 0 }
  };
  const before = JSON.stringify(model);
  const indicators = buildHudEffectIndicators(model);
  assert.deepEqual(indicators.map(({ id, compact }) => [id, compact]), [
    ["shield", "ES×1"],
    ["self-heal", "HAB✓"]
  ]);
  assert.equal(JSON.stringify(model), before, "o renderer não expira nem renova efeitos de gameplay");
});

test("integração de menu usa a mesma confirmação para teclado e gamepad", async () => {
  const main = await readFile(new URL("../src/main.js", import.meta.url), "utf8");
  assert.match(main, /navigationEvent === "confirm"\) activateFocusedUiTarget\(\)/);
  assert.match(main, /else activateFocusedUiTarget\(\);/);
  assert.match(main, /const activateFocusedUiTarget = \(\) => \{[\s\S]*confirmUiTarget\(document\.activeElement\)/);
  assert.match(main, /if \(!allowedStates\?\.includes\(model\.state\)\) return false;/);
  assert.doesNotMatch(main, /event\.code === "Enter" && model\.state/);
});
