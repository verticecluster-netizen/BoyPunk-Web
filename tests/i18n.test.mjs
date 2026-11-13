import test from "node:test";
import assert from "node:assert/strict";
import { getLocale, setLocale, initLocale, t, onLocaleChange, applyTranslations, STRINGS } from "../src/i18n.js";

function createMockStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k)
  };
}

test("i18n padrão inicial é pt-BR", () => {
  const storage = createMockStorage();
  const loc = initLocale(storage);
  assert.equal(loc, "pt-BR");
  assert.equal(getLocale(), "pt-BR");
  assert.equal(t("menu.play"), "Jogar");
  assert.equal(t("pause.title"), "Pausa");
});

test("troca para en traduz chaves da interface", () => {
  const storage = createMockStorage();
  initLocale(storage);
  setLocale("en", storage);
  assert.equal(getLocale(), "en");
  assert.equal(storage.getItem("boypunk-web-locale-v1"), "en");
  assert.equal(t("menu.play"), "Play");
  assert.equal(t("menu.options"), "Options");
  assert.equal(t("pause.title"), "Paused");
  assert.equal(t("pause.resume"), "Continue");
  assert.equal(t("victory.statTime"), "Active Time");
  assert.equal(t("defeat.retry"), "Try Again");
  assert.equal(t("bonus.result.souls"), "Bonus Souls");

  // Restaura pt-BR
  setLocale("pt-BR", storage);
  assert.equal(getLocale(), "pt-BR");
  assert.equal(t("menu.play"), "Jogar");
});

test("interpolação de parâmetros substitui {chaves}", () => {
  const storage = createMockStorage();
  setLocale("pt-BR", storage);
  const msgPt = t("menu.subtitle", { playerLife: 4, altarLife: 4, soulsGoal: 15 });
  assert.match(msgPt, /4 pontos de vida/);
  assert.match(msgPt, /15 almas/);

  setLocale("en", storage);
  const msgEn = t("menu.subtitle", { playerLife: 4, altarLife: 4, soulsGoal: 15 });
  assert.match(msgEn, /4 health/);
  assert.match(msgEn, /15 souls/);
  setLocale("pt-BR", storage);
});

test("inscrição de mudança notifica ouvintes", () => {
  const storage = createMockStorage();
  initLocale(storage);
  const events = [];
  const unsubscribe = onLocaleChange((newLoc) => events.push(newLoc));
  setLocale("en", storage);
  setLocale("pt-BR", storage);
  unsubscribe();
  setLocale("en", storage);
  assert.deepEqual(events, ["en", "pt-BR"]);
  setLocale("pt-BR", storage);
});

test("applyTranslations atualiza elementos com data-i18n", () => {
  const storage = createMockStorage();
  setLocale("en", storage);
  const el = {
    getAttribute: (attr) => (attr === "data-i18n" ? "menu.play" : null),
    textContent: "Jogar"
  };
  const mockDoc = {
    querySelectorAll: (selector) => (selector === "[data-i18n]" ? [el] : [])
  };
  applyTranslations(mockDoc);
  assert.equal(el.textContent, "Play");
  setLocale("pt-BR", storage);
});
