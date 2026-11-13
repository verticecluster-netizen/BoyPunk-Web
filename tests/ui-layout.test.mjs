import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const [html, css] = await Promise.all([
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../styles.css", import.meta.url), "utf8")
]);

test("UI responsiva preserva canvas lógico e não usa zoom global", () => {
  assert.match(html, /<canvas[^>]+id="game"[^>]+width="480"[^>]+height="270"/);
  assert.doesNotMatch(css, /(?:^|[;{])\s*zoom\s*:/m);
  assert.match(css, /\.game-frame\s*\{[\s\S]*?aspect-ratio:\s*16\s*\/\s*9;/);
  assert.match(css, /body\s*\{[\s\S]*?overflow:\s*hidden;/);
});

test("menus principais usam largura responsiva, rolagem contida e alvos de 44px", () => {
  assert.match(css, /\.menu-panel\s*\{[\s\S]*?width:\s*min\(94%,\s*640px\);[\s\S]*?overflow-y:\s*auto;/);
  assert.match(css, /\.menu-panel \.button-stack button\s*\{[\s\S]*?min-height:\s*44px;/);
  assert.match(css, /button\s*\{[\s\S]*?min-height:\s*44px;/);
  assert.match(css, /\.panel\s*\{[\s\S]*?overflow:\s*auto;[\s\S]*?touch-action:\s*pan-y;/);
  assert.match(css, /overscroll-behavior:\s*contain;/);
});

test("pausa e resultados possuem painéis ampliados sem overflow oculto", () => {
  for (const selector of ["pause-panel", "victory-panel", "defeat-panel", "bonus-result-panel"]) {
    const block = css.match(new RegExp(`\\.${selector}\\s*\\{([\\s\\S]*?)\\n\\}`));
    assert.ok(block, `${selector} deve existir`);
    assert.match(block[1], /overflow-y:\s*auto;/, `${selector} deve permitir rolagem interna quando necessária`);
    assert.doesNotMatch(block[1], /overflow:\s*hidden;/, `${selector} não deve cortar conteúdo`);
  }
  assert.match(css, /\.pause-panel\s*\{[\s\S]*?400px/);
  assert.match(css, /\.victory-panel\s*\{[\s\S]*?580px/);
  assert.match(css, /\.defeat-panel\s*\{[\s\S]*?500px/);
  assert.match(css, /\.bonus-result-panel\s*\{[\s\S]*?560px/);
});
